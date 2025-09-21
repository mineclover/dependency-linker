/**
 * Task Manager Implementation
 * Main orchestration class for task management system
 */

import {
	ExecutionStrategy,
	type ITaskExecutor,
} from "../interfaces/ITaskExecutor";
import type { ITaskManager } from "../interfaces/ITaskManager";
import type { ITaskRepository } from "../interfaces/ITaskRepository";
import {
	type Task,
	type TaskBatch,
	type TaskExecutionContext,
	type TaskExecutionResult,
	type TaskPhase,
	type TaskProgress,
	type TaskQueryOptions,
	type TaskStatistics,
	TaskStatus,
	type ValidationResult,
} from "../types";
import { TaskExecutor } from "./TaskExecutor";
import { TaskRepository } from "./TaskRepository";

export class TaskManager implements ITaskManager {
	private repository: ITaskRepository;
	private executor: ITaskExecutor;

	// Event callbacks
	private statusChangeCallbacks: Array<
		(taskId: string, oldStatus: TaskStatus, newStatus: TaskStatus) => void
	> = [];
	private progressCallbacks: Array<
		(taskId: string, progress: TaskProgress) => void
	> = [];
	private completedCallbacks: Array<
		(taskId: string, result: TaskExecutionResult) => void
	> = [];
	private failedCallbacks: Array<(taskId: string, error: Error) => void> = [];

	constructor(repository?: ITaskRepository, executor?: ITaskExecutor) {
		this.repository = repository || new TaskRepository();
		this.executor = executor || new TaskExecutor();

		// Set up progress tracking
		this.executor.onProgressUpdate((taskId, progress) => {
			this.progressCallbacks.forEach((callback) => {
				try {
					callback(taskId, progress);
				} catch (_error) {
					// Ignore callback errors
				}
			});
		});
	}

	// Task CRUD Operations
	async createTask(
		taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
	): Promise<Task> {
		// Set defaults if not provided
		const task = await this.repository.create({
			...taskData,
			metrics: {
				...taskData.metrics,
				estimatedDuration: taskData.estimatedDuration,
				completionPercentage: taskData.metrics?.completionPercentage ?? 0,
			},
		});

		return task;
	}

	async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
		const currentTask = await this.repository.findById(taskId);
		if (!currentTask) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		const oldStatus = currentTask.status;
		const updatedTask = await this.repository.update(taskId, updates);

		// Trigger status change callback if status changed
		if (updates.status && updates.status !== oldStatus) {
			this.statusChangeCallbacks.forEach((callback) => {
				try {
					if (updates.status) {
						callback(taskId, oldStatus, updates.status);
					}
				} catch (_error) {
					// Ignore callback errors
				}
			});
		}

		return updatedTask;
	}

	async deleteTask(taskId: string): Promise<boolean> {
		// Check if task has dependents
		const dependents = await this.repository.getDependents(taskId);
		if (dependents.length > 0) {
			throw new Error(
				`Cannot delete task ${taskId}: it has ${dependents.length} dependent tasks`,
			);
		}

		return this.repository.delete(taskId);
	}

	async getTask(taskId: string): Promise<Task | null> {
		return this.repository.findById(taskId);
	}

	async getTasks(options?: TaskQueryOptions): Promise<Task[]> {
		return this.repository.findAll(options);
	}

	// Task Status Management
	async startTask(
		taskId: string,
		context?: TaskExecutionContext,
	): Promise<TaskExecutionResult> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		// Check if task can be started (dependencies resolved)
		const canStart = await this.canStart(taskId);
		if (!canStart) {
			throw new Error(
				`Task ${taskId} cannot be started: dependencies not satisfied`,
			);
		}

		// Update task status to in progress
		await this.updateTask(taskId, {
			status: TaskStatus.IN_PROGRESS,
			metrics: {
				...task.metrics,
				startTime: new Date(),
			},
		});

		try {
			// Execute the task
			const result = await this.executor.executeTask(task, context);

			// Update task based on result
			const finalStatus = result.success
				? TaskStatus.COMPLETED
				: TaskStatus.CANCELLED;
			await this.updateTask(taskId, {
				status: finalStatus,
				metrics: {
					...task.metrics,
					endTime: result.endTime,
					actualDuration: result.duration / (1000 * 60 * 60), // Convert to hours
					completionPercentage: result.success
						? 100
						: task.metrics.completionPercentage,
				},
			});

			// Trigger callbacks
			if (result.success) {
				this.completedCallbacks.forEach((callback) => {
					try {
						callback(taskId, result);
					} catch (_error) {
						// Ignore callback errors
					}
				});
			} else if (result.error) {
				this.failedCallbacks.forEach((callback) => {
					try {
						callback(taskId, new Error(result.error));
					} catch (_error) {
						// Ignore callback errors
					}
				});
			}

			return result;
		} catch (error) {
			// Update task status to cancelled on error
			await this.updateTask(taskId, {
				status: TaskStatus.CANCELLED,
			});

			// Trigger failed callback
			this.failedCallbacks.forEach((callback) => {
				try {
					callback(
						taskId,
						error instanceof Error ? error : new Error(String(error)),
					);
				} catch (_callbackError) {
					// Ignore callback errors
				}
			});

			throw error;
		}
	}

	async pauseTask(taskId: string): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task || task.status !== TaskStatus.IN_PROGRESS) {
			return false;
		}

		await this.updateTask(taskId, { status: TaskStatus.PENDING });
		return true;
	}

	async resumeTask(taskId: string): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task || task.status !== TaskStatus.PENDING) {
			return false;
		}

		// Check if dependencies are still satisfied
		const canStart = await this.canStart(taskId);
		if (!canStart) {
			return false;
		}

		await this.updateTask(taskId, { status: TaskStatus.IN_PROGRESS });
		return true;
	}

	async completeTask(
		taskId: string,
		validationResults?: ValidationResult[],
	): Promise<TaskExecutionResult> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		const now = new Date();
		const result: TaskExecutionResult = {
			taskId,
			status: TaskStatus.COMPLETED,
			success: true,
			startTime: task.metrics.startTime || now,
			endTime: now,
			duration: task.metrics.startTime
				? now.getTime() - task.metrics.startTime.getTime()
				: 0,
			validationResults: validationResults || [],
		};

		await this.updateTask(taskId, {
			status: TaskStatus.COMPLETED,
			metrics: {
				...task.metrics,
				endTime: now,
				actualDuration: result.duration / (1000 * 60 * 60), // Convert to hours
				completionPercentage: 100,
			},
		});

		this.completedCallbacks.forEach((callback) => {
			try {
				callback(taskId, result);
			} catch (_error) {
				// Ignore callback errors
			}
		});

		return result;
	}

	async cancelTask(taskId: string, _reason?: string): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			return false;
		}

		// Cancel execution if running
		await this.executor.cancelExecution(taskId);

		await this.updateTask(taskId, {
			status: TaskStatus.CANCELLED,
			metrics: {
				...task.metrics,
				endTime: new Date(),
			},
		});

		return true;
	}

	async blockTask(taskId: string, _reason?: string): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			return false;
		}

		await this.updateTask(taskId, { status: TaskStatus.BLOCKED });
		return true;
	}

	async unblockTask(taskId: string): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task || task.status !== TaskStatus.BLOCKED) {
			return false;
		}

		await this.updateTask(taskId, { status: TaskStatus.PENDING });
		return true;
	}

	// Task Dependencies
	async addDependency(
		taskId: string,
		dependencyTaskId: string,
		type: "blocks" | "requires" | "optional",
	): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		const dependencyTask = await this.repository.findById(dependencyTaskId);

		if (!task || !dependencyTask) {
			return false;
		}

		// Check for circular dependencies
		if (await this.wouldCreateCircularDependency(taskId, dependencyTaskId)) {
			throw new Error(`Adding dependency would create a circular dependency`);
		}

		const updatedDependencies = [
			...task.dependencies.filter((dep) => dep.taskId !== dependencyTaskId),
			{ taskId: dependencyTaskId, type },
		];

		await this.updateTask(taskId, { dependencies: updatedDependencies });
		return true;
	}

	async removeDependency(
		taskId: string,
		dependencyTaskId: string,
	): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			return false;
		}

		const updatedDependencies = task.dependencies.filter(
			(dep) => dep.taskId !== dependencyTaskId,
		);
		await this.updateTask(taskId, { dependencies: updatedDependencies });
		return true;
	}

	async getDependencies(taskId: string): Promise<Task[]> {
		return this.repository.getDependencies(taskId);
	}

	async getBlockedBy(taskId: string): Promise<Task[]> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			return [];
		}

		const blockingTasks: Task[] = [];
		for (const dep of task.dependencies.filter(
			(d) => d.type === "blocks" || d.type === "requires",
		)) {
			const depTask = await this.repository.findById(dep.taskId);
			if (depTask && depTask.status !== TaskStatus.COMPLETED) {
				blockingTasks.push(depTask);
			}
		}

		return blockingTasks;
	}

	async canStart(taskId: string): Promise<boolean> {
		const blockingTasks = await this.getBlockedBy(taskId);
		return blockingTasks.length === 0;
	}

	// Task Progress Tracking
	async getProgress(taskId: string): Promise<TaskProgress> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		const statusMessage = this.getStatusMessage(task.status);
		return {
			taskId,
			status: task.status,
			completionPercentage: task.metrics.completionPercentage,
			stepsCompleted: task.implementationTasks.filter((t) => t.completed)
				.length,
			totalSteps: task.implementationTasks.length,
			...(statusMessage && { message: statusMessage }),
		};
	}

	async updateProgress(
		taskId: string,
		percentage: number,
		message?: string,
	): Promise<boolean> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			return false;
		}

		await this.updateTask(taskId, {
			metrics: {
				...task.metrics,
				completionPercentage: Math.max(0, Math.min(100, percentage)),
			},
		});

		const progress: TaskProgress = {
			taskId,
			status: task.status,
			completionPercentage: percentage,
			stepsCompleted: task.implementationTasks.filter((t) => t.completed)
				.length,
			totalSteps: task.implementationTasks.length,
			...(message && { message }),
		};

		this.progressCallbacks.forEach((callback) => {
			try {
				callback(taskId, progress);
			} catch (_error) {
				// Ignore callback errors
			}
		});

		return true;
	}

	// Batch Operations
	async createBatch(batchData: Omit<TaskBatch, "id">): Promise<TaskBatch> {
		return this.repository.saveBatch(batchData);
	}

	async executeBatch(
		batchId: string,
		maxConcurrency?: number,
	): Promise<TaskExecutionResult[]> {
		const batch = await this.repository.getBatch(batchId);
		if (!batch) {
			throw new Error(`Batch with ID ${batchId} not found`);
		}

		const strategy = batch.parallelizable
			? ExecutionStrategy.PARALLEL
			: ExecutionStrategy.SEQUENTIAL;
		const config = {
			strategy,
			...(maxConcurrency && { maxConcurrency }),
		};

		return this.executor.executeTasks(batch.tasks, config);
	}

	async getBatchProgress(
		batchId: string,
	): Promise<Record<string, TaskProgress>> {
		const batch = await this.repository.getBatch(batchId);
		if (!batch) {
			throw new Error(`Batch with ID ${batchId} not found`);
		}

		const progress: Record<string, TaskProgress> = {};
		for (const task of batch.tasks) {
			progress[task.id] = await this.getProgress(task.id);
		}

		return progress;
	}

	// Task Analytics
	async getStatistics(): Promise<TaskStatistics> {
		return this.repository.getStatistics();
	}

	async getCriticalPath(): Promise<Task[]> {
		return this.repository.getCriticalPath();
	}

	async getParallelizableTasks(): Promise<Task[]> {
		return this.repository.getParallelizableTasks();
	}

	async estimateCompletionTime(): Promise<number> {
		const tasks = await this.repository.findAll();
		const incompleteTasks = tasks.filter(
			(task) => task.status !== TaskStatus.COMPLETED,
		);

		return incompleteTasks.reduce((total, task) => {
			const remainingTime =
				(task.metrics.estimatedDuration *
					(100 - task.metrics.completionPercentage)) /
				100;
			return total + remainingTime;
		}, 0);
	}

	// Task Validation
	async validateTask(taskId: string): Promise<ValidationResult[]> {
		const task = await this.repository.findById(taskId);
		if (!task) {
			throw new Error(`Task with ID ${taskId} not found`);
		}

		return this.executor.validateTaskExecution(task);
	}

	async validateAllTasks(): Promise<Record<string, ValidationResult[]>> {
		const tasks = await this.repository.findAll();
		const results: Record<string, ValidationResult[]> = {};

		for (const task of tasks) {
			results[task.id] = await this.executor.validateTaskExecution(task);
		}

		return results;
	}

	// Task Templates
	async getAvailableTemplates(): Promise<string[]> {
		const templates = await this.repository.getAllTemplates();
		return templates.map((template) => template.id);
	}

	async createTaskFromTemplate(
		templateId: string,
		overrides?: Partial<Task>,
	): Promise<Task> {
		const template = await this.repository.getTemplate(templateId);
		if (!template) {
			throw new Error(`Template with ID ${templateId} not found`);
		}

		const taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
			title: `${template.name} Task`,
			description: template.description,
			priority: template.defaultPriority,
			complexity: template.defaultComplexity,
			risk: template.defaultRisk,
			status: TaskStatus.PENDING,
			phase: template.defaultPhase,
			dependencies: [],
			files: [],
			estimatedDuration: template.defaultEstimatedDuration,
			isParallelizable: false,
			validationCriteria: template.defaultValidationCriteria,
			riskMitigation: template.defaultRiskMitigation,
			implementationTasks: template.defaultImplementationTasks.map((impl) => ({
				...impl,
				completed: false,
			})),
			metrics: {
				estimatedDuration: template.defaultEstimatedDuration,
				completionPercentage: 0,
			},
			...overrides,
		};

		return this.createTask(taskData);
	}

	// Event System
	onTaskStatusChange(
		callback: (
			taskId: string,
			oldStatus: TaskStatus,
			newStatus: TaskStatus,
		) => void,
	): void {
		this.statusChangeCallbacks.push(callback);
	}

	onTaskProgress(
		callback: (taskId: string, progress: TaskProgress) => void,
	): void {
		this.progressCallbacks.push(callback);
	}

	onTaskCompleted(
		callback: (taskId: string, result: TaskExecutionResult) => void,
	): void {
		this.completedCallbacks.push(callback);
	}

	onTaskFailed(callback: (taskId: string, error: Error) => void): void {
		this.failedCallbacks.push(callback);
	}

	// Cleanup and Persistence
	async saveState(): Promise<boolean> {
		if ("save" in this.repository) {
			await (this.repository as any).save();
		}
		return true;
	}

	async loadState(): Promise<boolean> {
		if ("load" in this.repository) {
			await (this.repository as any).load();
		}
		return true;
	}

	async clearState(): Promise<boolean> {
		return this.repository.clear();
	}

	async exportTasks(format: "json" | "csv" | "markdown"): Promise<string> {
		const tasks = await this.repository.findAll();

		switch (format) {
			case "json":
				return JSON.stringify(tasks, null, 2);
			case "csv":
				return this.exportToCsv(tasks);
			case "markdown":
				return this.exportToMarkdown(tasks);
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	async importTasks(data: string, format: "json" | "csv"): Promise<Task[]> {
		let tasks: any[];

		switch (format) {
			case "json":
				tasks = JSON.parse(data);
				break;
			case "csv":
				tasks = this.importFromCsv(data);
				break;
			default:
				throw new Error(`Unsupported import format: ${format}`);
		}

		const createdTasks: Task[] = [];
		for (const taskData of tasks) {
			const {
				id: _id,
				createdAt: _createdAt,
				updatedAt: _updatedAt,
				...cleanTaskData
			} = taskData;
			const task = await this.createTask(cleanTaskData);
			createdTasks.push(task);
		}

		return createdTasks;
	}

	// Private helper methods
	private getStatusMessage(status: TaskStatus): string {
		switch (status) {
			case TaskStatus.PENDING:
				return "Task is waiting to be started";
			case TaskStatus.IN_PROGRESS:
				return "Task is currently being executed";
			case TaskStatus.COMPLETED:
				return "Task has been completed successfully";
			case TaskStatus.BLOCKED:
				return "Task is blocked by dependencies or other issues";
			case TaskStatus.CANCELLED:
				return "Task has been cancelled";
			default:
				return "Unknown status";
		}
	}

	private async wouldCreateCircularDependency(
		taskId: string,
		dependencyTaskId: string,
	): Promise<boolean> {
		// Simple circular dependency check - in a real implementation, this would be more sophisticated
		const visited = new Set<string>();

		const checkCircular = async (currentTaskId: string): Promise<boolean> => {
			if (visited.has(currentTaskId)) {
				return true;
			}

			if (currentTaskId === taskId) {
				return true;
			}

			visited.add(currentTaskId);
			const dependencies = await this.repository.getDependencies(currentTaskId);

			for (const dep of dependencies) {
				if (await checkCircular(dep.id)) {
					return true;
				}
			}

			return false;
		};

		return checkCircular(dependencyTaskId);
	}

	private exportToCsv(tasks: Task[]): string {
		const headers = [
			"ID",
			"Title",
			"Status",
			"Priority",
			"Complexity",
			"Risk",
			"Phase",
			"Estimated Duration",
			"Completion %",
		];
		const rows = tasks.map((task) => [
			task.id,
			task.title,
			task.status,
			task.priority,
			task.complexity,
			task.risk,
			task.phase,
			task.metrics.estimatedDuration.toString(),
			task.metrics.completionPercentage.toString(),
		]);

		return [headers, ...rows]
			.map((row) => row.map((cell) => `"${cell}"`).join(","))
			.join("\n");
	}

	private exportToMarkdown(tasks: Task[]): string {
		let markdown = "# Task List\n\n";

		// Group tasks by phase
		const tasksByPhase = tasks.reduce(
			(acc, task) => {
				if (!acc[task.phase]) {
					acc[task.phase] = [];
				}
				acc[task.phase].push(task);
				return acc;
			},
			{} as Record<TaskPhase, Task[]>,
		);

		for (const [phase, phaseTasks] of Object.entries(tasksByPhase)) {
			markdown += `## ${phase}\n\n`;

			for (const task of phaseTasks) {
				const statusIcon = this.getStatusIcon(task.status);
				markdown += `### ${statusIcon} ${task.title}\n\n`;
				markdown += `- **Status**: ${task.status}\n`;
				markdown += `- **Priority**: ${task.priority}\n`;
				markdown += `- **Complexity**: ${task.complexity}\n`;
				markdown += `- **Risk**: ${task.risk}\n`;
				markdown += `- **Estimated Duration**: ${task.metrics.estimatedDuration} hours\n`;
				markdown += `- **Completion**: ${task.metrics.completionPercentage}%\n`;
				markdown += `- **Description**: ${task.description}\n\n`;
			}
		}

		return markdown;
	}

	private getStatusIcon(status: TaskStatus): string {
		switch (status) {
			case TaskStatus.COMPLETED:
				return "✅";
			case TaskStatus.IN_PROGRESS:
				return "🔄";
			case TaskStatus.BLOCKED:
				return "🚫";
			case TaskStatus.CANCELLED:
				return "❌";
			default:
				return "⏳";
		}
	}

	private importFromCsv(data: string): any[] {
		const lines = data.split("\n");
		const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));

		return lines
			.slice(1)
			.map((line) => {
				const values = line.split(",").map((v) => v.replace(/"/g, ""));
				const task: any = {};

				headers.forEach((header, index) => {
					const value = values[index];
					switch (header) {
						case "ID":
							task.id = value;
							break;
						case "Title":
							task.title = value;
							break;
						case "Status":
							task.status = value;
							break;
						case "Priority":
							task.priority = value;
							break;
						case "Complexity":
							task.complexity = value;
							break;
						case "Risk":
							task.risk = value;
							break;
						case "Phase":
							task.phase = value;
							break;
						case "Estimated Duration":
							task.estimatedDuration = parseFloat(value) || 0;
							break;
						case "Completion %":
							if (!task.metrics) task.metrics = {};
							task.metrics.completionPercentage = parseFloat(value) || 0;
							break;
					}
				});

				return task;
			})
			.filter((task) => task.title);
	}
}
