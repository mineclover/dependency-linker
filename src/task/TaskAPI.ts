/**
 * Task Management API
 * Main entry point for task management functionality based on specs/tasks.md
 */

import {
	TaskError,
	TaskErrorFactory,
	TaskValidationError,
} from "./errors/TaskError";
import { TaskValidator } from "./errors/TaskValidator";
import type { ITaskManager } from "./interfaces/ITaskManager";
import { TaskManager } from "./services/TaskManager";
import {
	type Task,
	type TaskBatch,
	TaskComplexity,
	type TaskExecutionContext,
	type TaskExecutionResult,
	TaskPhase,
	TaskPriority,
	type TaskProgress,
	type TaskQueryOptions,
	TaskRisk,
	type TaskStatistics,
	TaskStatus,
	type ValidationResult,
} from "./types";

/**
 * Task Management API Configuration
 */
export interface TaskAPIConfig {
	persistencePath?: string;
	autoSave?: boolean;
	enableValidation?: boolean;
	resourceLimits?: {
		maxConcurrentTasks?: number;
		maxMemoryUsage?: number;
		maxCpuUsage?: number;
	};
}

/**
 * Task Creation Options
 */
export interface TaskCreationOptions {
	template?: string;
	validate?: boolean;
	autoStart?: boolean;
	skipDependencyCheck?: boolean;
}

/**
 * Main Task API Class
 * Implements all 21 tasks from the API modularization specification
 */
export class TaskAPI {
	private manager: ITaskManager;
	private config: TaskAPIConfig;

	constructor(config: TaskAPIConfig = {}) {
		this.config = {
			enableValidation: true,
			autoSave: true,
			...config,
		};

		this.manager = new TaskManager();
		this.initializeDefaultTasks();
	}

	// Task CRUD Operations
	/**
	 * Create a new task
	 */
	async createTask(
		taskData: Omit<Task, "id" | "createdAt" | "updatedAt">,
		options: TaskCreationOptions = {},
	): Promise<Task> {
		try {
			// Validate task data if validation is enabled
			if (
				this.config.enableValidation !== false &&
				options.validate !== false
			) {
				const validationResults = TaskValidator.validateTaskCreation(taskData);
				const failedValidations =
					TaskValidator.getFailedValidations(validationResults);

				if (failedValidations.length > 0) {
					throw TaskErrorFactory.validationFailed(
						"new-task",
						validationResults,
					);
				}
			}

			// Create task from template if specified
			if (options.template) {
				return this.manager.createTaskFromTemplate(options.template, taskData);
			}

			// Create the task
			const task = await this.manager.createTask(taskData);

			// Auto-start if requested and dependencies are satisfied
			if (options.autoStart && (await this.manager.canStart(task.id))) {
				await this.manager.startTask(task.id);
			}

			return task;
		} catch (error) {
			throw this.handleError("createTask", error);
		}
	}

	/**
	 * Get a task by ID
	 */
	async getTask(taskId: string): Promise<Task> {
		try {
			const task = await this.manager.getTask(taskId);
			if (!task) {
				throw TaskErrorFactory.taskNotFound(taskId);
			}
			return task;
		} catch (error) {
			throw this.handleError("getTask", error, taskId);
		}
	}

	/**
	 * Update an existing task
	 */
	async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
		try {
			// Validate status transition if status is being updated
			if (updates.status) {
				const currentTask = await this.getTask(taskId);
				const transitionResult = TaskValidator.validateStatusTransition(
					currentTask.status,
					updates.status,
					taskId,
				);

				if (!transitionResult.passed) {
					throw new TaskValidationError(
						transitionResult.message || "Invalid status transition",
						taskId,
						[transitionResult],
					);
				}
			}

			return await this.manager.updateTask(taskId, updates);
		} catch (error) {
			throw this.handleError("updateTask", error, taskId);
		}
	}

	/**
	 * Delete a task
	 */
	async deleteTask(taskId: string): Promise<boolean> {
		try {
			return await this.manager.deleteTask(taskId);
		} catch (error) {
			throw this.handleError("deleteTask", error, taskId);
		}
	}

	/**
	 * Get multiple tasks with filtering and sorting
	 */
	async getTasks(options?: TaskQueryOptions): Promise<Task[]> {
		try {
			return await this.manager.getTasks(options);
		} catch (error) {
			throw this.handleError("getTasks", error);
		}
	}

	// Task Execution Operations
	/**
	 * Start task execution
	 */
	async startTask(
		taskId: string,
		context?: TaskExecutionContext,
	): Promise<TaskExecutionResult> {
		try {
			return await this.manager.startTask(taskId, context);
		} catch (error) {
			throw this.handleError("startTask", error, taskId);
		}
	}

	/**
	 * Complete a task manually
	 */
	async completeTask(
		taskId: string,
		validationResults?: ValidationResult[],
	): Promise<TaskExecutionResult> {
		try {
			return await this.manager.completeTask(taskId, validationResults);
		} catch (error) {
			throw this.handleError("completeTask", error, taskId);
		}
	}

	/**
	 * Cancel task execution
	 */
	async cancelTask(taskId: string, reason?: string): Promise<boolean> {
		try {
			return await this.manager.cancelTask(taskId, reason);
		} catch (error) {
			throw this.handleError("cancelTask", error, taskId);
		}
	}

	/**
	 * Block a task
	 */
	async blockTask(taskId: string, reason?: string): Promise<boolean> {
		try {
			return await this.manager.blockTask(taskId, reason);
		} catch (error) {
			throw this.handleError("blockTask", error, taskId);
		}
	}

	/**
	 * Unblock a task
	 */
	async unblockTask(taskId: string): Promise<boolean> {
		try {
			return await this.manager.unblockTask(taskId);
		} catch (error) {
			throw this.handleError("unblockTask", error, taskId);
		}
	}

	// Dependency Management
	/**
	 * Add a dependency between tasks
	 */
	async addDependency(
		taskId: string,
		dependencyTaskId: string,
		type: "blocks" | "requires" | "optional" = "requires",
	): Promise<boolean> {
		try {
			return await this.manager.addDependency(taskId, dependencyTaskId, type);
		} catch (error) {
			throw this.handleError("addDependency", error, taskId);
		}
	}

	/**
	 * Remove a dependency between tasks
	 */
	async removeDependency(
		taskId: string,
		dependencyTaskId: string,
	): Promise<boolean> {
		try {
			return await this.manager.removeDependency(taskId, dependencyTaskId);
		} catch (error) {
			throw this.handleError("removeDependency", error, taskId);
		}
	}

	/**
	 * Get task dependencies
	 */
	async getDependencies(taskId: string): Promise<Task[]> {
		try {
			return await this.manager.getDependencies(taskId);
		} catch (error) {
			throw this.handleError("getDependencies", error, taskId);
		}
	}

	/**
	 * Check if a task can be started
	 */
	async canStartTask(taskId: string): Promise<boolean> {
		try {
			return await this.manager.canStart(taskId);
		} catch (error) {
			throw this.handleError("canStartTask", error, taskId);
		}
	}

	// Progress Tracking
	/**
	 * Get task progress
	 */
	async getTaskProgress(taskId: string): Promise<TaskProgress> {
		try {
			return await this.manager.getProgress(taskId);
		} catch (error) {
			throw this.handleError("getTaskProgress", error, taskId);
		}
	}

	/**
	 * Update task progress
	 */
	async updateTaskProgress(
		taskId: string,
		percentage: number,
		message?: string,
	): Promise<boolean> {
		try {
			return await this.manager.updateProgress(taskId, percentage, message);
		} catch (error) {
			throw this.handleError("updateTaskProgress", error, taskId);
		}
	}

	// Batch Operations
	/**
	 * Create a task batch
	 */
	async createBatch(batchData: Omit<TaskBatch, "id">): Promise<TaskBatch> {
		try {
			if (this.config.enableValidation) {
				const validationResults = TaskValidator.validateTaskBatch({
					...batchData,
					id: "temp",
				});
				const failedValidations =
					TaskValidator.getFailedValidations(validationResults);

				if (failedValidations.length > 0) {
					throw new TaskValidationError(
						`Batch validation failed: ${failedValidations.length} criteria failed`,
						"batch",
						validationResults,
					);
				}
			}

			return await this.manager.createBatch(batchData);
		} catch (error) {
			throw this.handleError("createBatch", error);
		}
	}

	/**
	 * Execute a task batch
	 */
	async executeBatch(
		batchId: string,
		maxConcurrency?: number,
	): Promise<TaskExecutionResult[]> {
		try {
			return await this.manager.executeBatch(batchId, maxConcurrency);
		} catch (error) {
			throw this.handleError("executeBatch", error);
		}
	}

	/**
	 * Get batch execution progress
	 */
	async getBatchProgress(
		batchId: string,
	): Promise<Record<string, TaskProgress>> {
		try {
			return await this.manager.getBatchProgress(batchId);
		} catch (error) {
			throw this.handleError("getBatchProgress", error);
		}
	}

	// Analytics and Statistics
	/**
	 * Get task statistics
	 */
	async getStatistics(): Promise<TaskStatistics> {
		try {
			return await this.manager.getStatistics();
		} catch (error) {
			throw this.handleError("getStatistics", error);
		}
	}

	/**
	 * Get critical path tasks
	 */
	async getCriticalPath(): Promise<Task[]> {
		try {
			return await this.manager.getCriticalPath();
		} catch (error) {
			throw this.handleError("getCriticalPath", error);
		}
	}

	/**
	 * Get parallelizable tasks
	 */
	async getParallelizableTasks(): Promise<Task[]> {
		try {
			return await this.manager.getParallelizableTasks();
		} catch (error) {
			throw this.handleError("getParallelizableTasks", error);
		}
	}

	/**
	 * Estimate total completion time
	 */
	async estimateCompletionTime(): Promise<number> {
		try {
			return await this.manager.estimateCompletionTime();
		} catch (error) {
			throw this.handleError("estimateCompletionTime", error);
		}
	}

	// Validation
	/**
	 * Validate a specific task
	 */
	async validateTask(taskId: string): Promise<ValidationResult[]> {
		try {
			return await this.manager.validateTask(taskId);
		} catch (error) {
			throw this.handleError("validateTask", error, taskId);
		}
	}

	/**
	 * Validate all tasks
	 */
	async validateAllTasks(): Promise<Record<string, ValidationResult[]>> {
		try {
			return await this.manager.validateAllTasks();
		} catch (error) {
			throw this.handleError("validateAllTasks", error);
		}
	}

	// Data Management
	/**
	 * Export tasks to various formats
	 */
	async exportTasks(
		format: "json" | "csv" | "markdown" = "json",
	): Promise<string> {
		try {
			return await this.manager.exportTasks(format);
		} catch (error) {
			throw this.handleError("exportTasks", error);
		}
	}

	/**
	 * Import tasks from data
	 */
	async importTasks(
		data: string,
		format: "json" | "csv" = "json",
	): Promise<Task[]> {
		try {
			return await this.manager.importTasks(data, format);
		} catch (error) {
			throw this.handleError("importTasks", error);
		}
	}

	/**
	 * Save current state
	 */
	async saveState(): Promise<boolean> {
		try {
			return await this.manager.saveState();
		} catch (error) {
			throw this.handleError("saveState", error);
		}
	}

	/**
	 * Load saved state
	 */
	async loadState(): Promise<boolean> {
		try {
			return await this.manager.loadState();
		} catch (error) {
			throw this.handleError("loadState", error);
		}
	}

	/**
	 * Clear all tasks and state
	 */
	async clearState(): Promise<boolean> {
		try {
			return await this.manager.clearState();
		} catch (error) {
			throw this.handleError("clearState", error);
		}
	}

	// Event System
	/**
	 * Set up event handlers
	 */
	onTaskStatusChange(
		callback: (
			taskId: string,
			oldStatus: TaskStatus,
			newStatus: TaskStatus,
		) => void,
	): void {
		this.manager.onTaskStatusChange(callback);
	}

	onTaskProgress(
		callback: (taskId: string, progress: TaskProgress) => void,
	): void {
		this.manager.onTaskProgress(callback);
	}

	onTaskCompleted(
		callback: (taskId: string, result: TaskExecutionResult) => void,
	): void {
		this.manager.onTaskCompleted(callback);
	}

	onTaskFailed(callback: (taskId: string, error: Error) => void): void {
		this.manager.onTaskFailed(callback);
	}

	// Convenience Methods for Spec Tasks
	/**
	 * Create all 21 tasks from the API modularization specification
	 */
	async createSpecificationTasks(): Promise<Task[]> {
		const tasks: Task[] = [];

		try {
			// Phase 1: Foundation & Validation (Week 1)
			tasks.push(
				await this.createSpecTask(
					"T001",
					"Development Environment Validation",
					TaskPhase.FOUNDATION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T002",
					"Core Interface Contract Testing",
					TaskPhase.FOUNDATION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T003",
					"API Layer Interface Testing",
					TaskPhase.FOUNDATION,
				),
			);

			// Phase 2: Core Layer Implementation (Week 1-2)
			tasks.push(
				await this.createSpecTask(
					"T004",
					"Core Service Interface Updates",
					TaskPhase.CORE_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T005",
					"FileAnalyzer Service Implementation",
					TaskPhase.CORE_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T006",
					"TypeScript Parser Service Implementation",
					TaskPhase.CORE_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T007",
					"Output Formatter Service Implementation",
					TaskPhase.CORE_LAYER,
				),
			);

			// Phase 3: API Layer Implementation (Week 2-3)
			tasks.push(
				await this.createSpecTask(
					"T008",
					"Core API Types and Error Hierarchy",
					TaskPhase.API_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T009",
					"Main TypeScriptAnalyzer Class Implementation",
					TaskPhase.API_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T010",
					"Factory Functions Implementation",
					TaskPhase.API_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T011",
					"Batch Processing Implementation",
					TaskPhase.API_LAYER,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T012",
					"Caching System Implementation",
					TaskPhase.API_LAYER,
				),
			);

			// Phase 4: Integration & Testing (Week 3-4)
			tasks.push(
				await this.createSpecTask(
					"T013",
					"Comprehensive API Integration Testing",
					TaskPhase.INTEGRATION_TESTING,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T014",
					"CLI Adapter Implementation",
					TaskPhase.INTEGRATION_TESTING,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T015",
					"CLI Compatibility Validation",
					TaskPhase.INTEGRATION_TESTING,
				),
			);

			// Phase 5: Package & Distribution (Week 4-5)
			tasks.push(
				await this.createSpecTask(
					"T016",
					"Package Configuration & Entry Points",
					TaskPhase.PACKAGE_DISTRIBUTION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T017",
					"API Documentation Generation",
					TaskPhase.PACKAGE_DISTRIBUTION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T018",
					"Example Integration Projects",
					TaskPhase.PACKAGE_DISTRIBUTION,
				),
			);

			// Phase 6: Final Validation & Release (Week 5-6)
			tasks.push(
				await this.createSpecTask(
					"T019",
					"End-to-End System Validation",
					TaskPhase.FINAL_VALIDATION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T020",
					"Performance & Load Testing",
					TaskPhase.FINAL_VALIDATION,
				),
			);
			tasks.push(
				await this.createSpecTask(
					"T021",
					"Release Preparation & Final Validation",
					TaskPhase.FINAL_VALIDATION,
				),
			);

			return tasks;
		} catch (error) {
			throw this.handleError("createSpecificationTasks", error);
		}
	}

	/**
	 * Get tasks for a specific phase
	 */
	async getTasksByPhase(phase: TaskPhase): Promise<Task[]> {
		try {
			return await this.getTasks({
				filter: { phase: [phase] },
			});
		} catch (error) {
			throw this.handleError("getTasksByPhase", error);
		}
	}

	/**
	 * Get ready-to-start tasks (no blocking dependencies)
	 */
	async getReadyTasks(): Promise<Task[]> {
		try {
			const pendingTasks = await this.getTasks({
				filter: { status: [TaskStatus.PENDING] },
			});

			const readyTasks: Task[] = [];
			for (const task of pendingTasks) {
				if (await this.manager.canStart(task.id)) {
					readyTasks.push(task);
				}
			}

			return readyTasks;
		} catch (error) {
			throw this.handleError("getReadyTasks", error);
		}
	}

	// Private helper methods
	private async createSpecTask(
		id: string,
		title: string,
		phase: TaskPhase,
		priority: TaskPriority = TaskPriority.HIGH,
		complexity: TaskComplexity = TaskComplexity.MODERATE,
		estimatedHours: number = 4,
	): Promise<Task> {
		return this.createTask({
			title,
			description: `Implementation of ${title} as defined in API modularization specification`,
			priority,
			complexity,
			risk: TaskRisk.MEDIUM,
			status: TaskStatus.PENDING,
			phase,
			dependencies: [],
			files: [],
			estimatedDuration: estimatedHours,
			isParallelizable:
				id.endsWith("P") ||
				[
					"T002",
					"T006",
					"T007",
					"T010",
					"T011",
					"T012",
					"T017",
					"T018",
					"T019",
					"T020",
				].includes(id),
			validationCriteria: [
				{ description: "Task implementation complete", required: true },
				{ description: "All tests pass", required: true },
				{ description: "Code review approved", required: true },
			],
			riskMitigation: [
				{
					description: "Follow specification exactly",
					strategy: "Documentation review",
				},
				{ description: "Test thoroughly", strategy: "Comprehensive testing" },
			],
			implementationTasks: [
				{ description: "Analyze requirements", completed: false },
				{ description: "Implement solution", completed: false },
				{ description: "Test implementation", completed: false },
				{ description: "Document changes", completed: false },
			],
			metrics: {
				estimatedDuration: estimatedHours,
				completionPercentage: 0,
			},
			tags: [
				"api-modularization",
				"specification",
				phase.toLowerCase().replace(/\s+/g, "-"),
			],
		});
	}

	private handleError(
		operation: string,
		error: unknown,
		taskId?: string,
	): Error {
		if (error instanceof TaskError) {
			return error;
		}

		if (error instanceof Error) {
			return TaskErrorFactory.repositoryError(operation, error, taskId);
		}

		return new TaskError(
			`Unknown error in ${operation}: ${String(error)}`,
			"UNKNOWN_ERROR",
			taskId,
		);
	}

	private async initializeDefaultTasks(): Promise<void> {
		// Initialize with default task templates if none exist
		try {
			const templates = await this.manager.getAvailableTemplates();
			if (templates.length === 0) {
				await this.createDefaultTemplates();
			}
		} catch (_error) {
			// Ignore initialization errors
		}
	}

	private async createDefaultTemplates(): Promise<void> {
		// This would create default task templates
		// Implementation omitted for brevity
	}
}

/**
 * Factory function for creating TaskAPI instance
 */
export function createTaskAPI(config?: TaskAPIConfig): TaskAPI {
	return new TaskAPI(config);
}

/**
 * Default export
 */
export default TaskAPI;
