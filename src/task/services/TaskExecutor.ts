/**
 * Task Executor Implementation
 * Handles execution of tasks with different strategies and resource management
 */

import {
	ExecutionStrategy,
	type ITaskExecutor,
	type ResourceLimits,
	type ResourceUsage,
	type TaskExecutionConfig,
} from "../interfaces/ITaskExecutor";
import {
	type Task,
	type TaskExecutionContext,
	type TaskExecutionResult,
	type TaskProgress,
	TaskStatus,
	type ValidationResult,
} from "../types";

export class TaskExecutor implements ITaskExecutor {
	private activeExecutions: Map<string, Promise<TaskExecutionResult>> =
		new Map();
	private progressCallbacks: Array<
		(taskId: string, progress: TaskProgress) => void
	> = [];
	private resourceLimits: ResourceLimits = {
		maxConcurrentTasks: 5,
		maxMemoryUsage: 1024, // 1GB
		maxCpuUsage: 80, // 80%
		maxExecutionTime: 60, // 60 minutes
		maxRetries: 3,
	};

	async executeTask(
		task: Task,
		context?: TaskExecutionContext,
	): Promise<TaskExecutionResult> {
		const executionId = task.id;
		const startTime = new Date();

		try {
			// Check if task is already running
			if (this.activeExecutions.has(executionId)) {
				throw new Error(`Task ${task.id} is already executing`);
			}

			// Validate execution environment
			if (context && !(await this.validateExecutionEnvironment(context))) {
				throw new Error(`Invalid execution environment for task ${task.id}`);
			}

			// Check resource limits
			const resourceUsage = await this.getResourceUsage();
			if (
				resourceUsage.activeExecutions >= this.resourceLimits.maxConcurrentTasks
			) {
				throw new Error(
					`Maximum concurrent tasks limit reached (${this.resourceLimits.maxConcurrentTasks})`,
				);
			}

			// Create execution promise
			const defaultContext: TaskExecutionContext = {
				taskId: task.id,
				environment: "default",
				workingDirectory: process.cwd(),
			};
			const executionPromise = this.performTaskExecution(
				task,
				context || defaultContext,
			);
			this.activeExecutions.set(executionId, executionPromise);

			// Execute the task
			const result = await executionPromise;

			return result;
		} catch (error) {
			const endTime = new Date();
			const duration = endTime.getTime() - startTime.getTime();

			return {
				taskId: task.id,
				status: TaskStatus.CANCELLED,
				success: false,
				startTime,
				endTime,
				duration,
				error: error instanceof Error ? error.message : String(error),
				validationResults: [],
			};
		} finally {
			this.activeExecutions.delete(executionId);
		}
	}

	async executeTasks(
		tasks: Task[],
		config?: TaskExecutionConfig,
	): Promise<TaskExecutionResult[]> {
		const strategy = config?.strategy || ExecutionStrategy.SEQUENTIAL;

		switch (strategy) {
			case ExecutionStrategy.SEQUENTIAL:
				return this.executeSequential(tasks, config);
			case ExecutionStrategy.PARALLEL:
				return this.executeParallel(tasks, config);
			case ExecutionStrategy.ADAPTIVE:
				return this.executeAdaptive(tasks, config);
			default:
				throw new Error(`Unknown execution strategy: ${strategy}`);
		}
	}

	async executeBatch(
		tasks: Task[],
		batchSize = 5,
		config?: TaskExecutionConfig,
	): Promise<TaskExecutionResult[]> {
		const results: TaskExecutionResult[] = [];

		for (let i = 0; i < tasks.length; i += batchSize) {
			const batch = tasks.slice(i, i + batchSize);
			const batchResults = await this.executeParallel(batch, config);
			results.push(...batchResults);

			// Check for failures if failFast is enabled
			if (config?.failFast && batchResults.some((result) => !result.success)) {
				break;
			}
		}

		return results;
	}

	async getExecutionProgress(taskId: string): Promise<TaskProgress> {
		// This would typically track actual progress
		// For now, return a basic progress object
		return {
			taskId,
			status: this.activeExecutions.has(taskId)
				? TaskStatus.IN_PROGRESS
				: TaskStatus.PENDING,
			completionPercentage: this.activeExecutions.has(taskId) ? 50 : 0,
			stepsCompleted: 0,
			totalSteps: 1,
			message: this.activeExecutions.has(taskId)
				? "Executing task..."
				: "Task not started",
		};
	}

	onProgressUpdate(
		callback: (taskId: string, progress: TaskProgress) => void,
	): void {
		this.progressCallbacks.push(callback);
	}

	async cancelExecution(taskId: string): Promise<boolean> {
		const execution = this.activeExecutions.get(taskId);
		if (!execution) {
			return false;
		}

		// In a real implementation, you would cancel the actual execution
		// For now, we just remove it from active executions
		this.activeExecutions.delete(taskId);
		return true;
	}

	async cancelAllExecutions(): Promise<boolean> {
		const activeTaskIds = Array.from(this.activeExecutions.keys());

		for (const taskId of activeTaskIds) {
			await this.cancelExecution(taskId);
		}

		return this.activeExecutions.size === 0;
	}

	async getActiveExecutions(): Promise<string[]> {
		return Array.from(this.activeExecutions.keys());
	}

	async getResourceUsage(): Promise<ResourceUsage> {
		// In a real implementation, this would get actual system resource usage
		return {
			activeExecutions: this.activeExecutions.size,
			maxConcurrency: this.resourceLimits.maxConcurrentTasks,
			memoryUsage: 0, // Would get actual memory usage
			cpuUsage: 0, // Would get actual CPU usage
			diskUsage: 0,
			networkUsage: 0,
		};
	}

	setResourceLimits(limits: ResourceLimits): void {
		this.resourceLimits = { ...this.resourceLimits, ...limits };
	}

	async validateTaskExecution(task: Task): Promise<ValidationResult[]> {
		const results: ValidationResult[] = [];

		// Validate task has required fields
		for (const criterion of task.validationCriteria) {
			const result: ValidationResult = {
				criterion,
				passed: true,
				message: "Validation passed",
			};

			// Basic validation logic
			if (
				criterion.description.includes("file") &&
				(!task.files || task.files.length === 0)
			) {
				result.passed = false;
				result.message = "Task has no associated files";
			}

			results.push(result);
		}

		return results;
	}

	async validateExecutionEnvironment(
		context: TaskExecutionContext,
	): Promise<boolean> {
		// Basic validation
		if (!context.workingDirectory) {
			return false;
		}

		if (context.timeout && context.timeout <= 0) {
			return false;
		}

		if (context.maxRetries && context.maxRetries < 0) {
			return false;
		}

		return true;
	}

	// Private execution methods
	private async executeSequential(
		tasks: Task[],
		config?: TaskExecutionConfig,
	): Promise<TaskExecutionResult[]> {
		const results: TaskExecutionResult[] = [];

		for (const task of tasks) {
			try {
				if (config?.validateBeforeExecution) {
					const validationResults = await this.validateTaskExecution(task);
					if (validationResults.some((result) => !result.passed)) {
						results.push({
							taskId: task.id,
							status: TaskStatus.CANCELLED,
							success: false,
							startTime: new Date(),
							endTime: new Date(),
							duration: 0,
							error: "Task failed pre-execution validation",
							validationResults,
						});

						if (config.failFast) {
							break;
						}
						continue;
					}
				}

				const result = await this.executeTask(task);
				results.push(result);

				if (config?.failFast && !result.success) {
					break;
				}
			} catch (error) {
				const errorResult: TaskExecutionResult = {
					taskId: task.id,
					status: TaskStatus.CANCELLED,
					success: false,
					startTime: new Date(),
					endTime: new Date(),
					duration: 0,
					error: error instanceof Error ? error.message : String(error),
					validationResults: [],
				};

				results.push(errorResult);

				if (config?.failFast) {
					break;
				}
			}
		}

		return results;
	}

	private async executeParallel(
		tasks: Task[],
		config?: TaskExecutionConfig,
	): Promise<TaskExecutionResult[]> {
		const maxConcurrency = Math.min(
			config?.maxConcurrency || this.resourceLimits.maxConcurrentTasks,
			this.resourceLimits.maxConcurrentTasks,
		);

		const results: TaskExecutionResult[] = [];
		const executing: Promise<TaskExecutionResult>[] = [];

		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];

			if (executing.length >= maxConcurrency) {
				const completedResult = await Promise.race(executing);
				results.push(completedResult);

				const completedIndex = executing.indexOf(
					Promise.resolve(completedResult),
				);
				if (completedIndex !== -1) {
					executing.splice(completedIndex, 1);
				}

				if (config?.failFast && !completedResult.success) {
					// Cancel remaining executions
					await Promise.allSettled(executing);
					break;
				}
			}

			executing.push(this.executeTask(task));
		}

		// Wait for remaining executions
		const remainingResults = await Promise.allSettled(executing);
		remainingResults.forEach((result) => {
			if (result.status === "fulfilled") {
				results.push(result.value);
			}
		});

		return results;
	}

	private async executeAdaptive(
		tasks: Task[],
		config?: TaskExecutionConfig,
	): Promise<TaskExecutionResult[]> {
		// Adaptive strategy: use parallel for parallelizable tasks, sequential for others
		const parallelizableTasks = tasks.filter((task) => task.isParallelizable);
		const sequentialTasks = tasks.filter((task) => !task.isParallelizable);

		const results: TaskExecutionResult[] = [];

		// Execute parallelizable tasks first
		if (parallelizableTasks.length > 0) {
			const parallelResults = await this.executeParallel(
				parallelizableTasks,
				config,
			);
			results.push(...parallelResults);

			if (
				config?.failFast &&
				parallelResults.some((result) => !result.success)
			) {
				return results;
			}
		}

		// Then execute sequential tasks
		if (sequentialTasks.length > 0) {
			const sequentialResults = await this.executeSequential(
				sequentialTasks,
				config,
			);
			results.push(...sequentialResults);
		}

		return results;
	}

	private async performTaskExecution(
		task: Task,
		_context: TaskExecutionContext,
	): Promise<TaskExecutionResult> {
		const startTime = new Date();

		try {
			// Update progress to in-progress
			await this.updateProgress(task.id, 0, "Starting task execution...");

			// Simulate task execution
			// In a real implementation, this would perform the actual task work
			const duration = task.metrics.estimatedDuration * 1000; // Convert to milliseconds

			// Simulate progress updates
			for (let progress = 0; progress <= 100; progress += 20) {
				await this.updateProgress(
					task.id,
					progress,
					`Executing task... ${progress}%`,
				);
				await this.delay(duration / 5);
			}

			const endTime = new Date();
			const actualDuration = endTime.getTime() - startTime.getTime();

			// Validate after execution if configured
			const validationResults = await this.validateTaskExecution(task);

			const success = validationResults.every((result) => result.passed);

			return {
				taskId: task.id,
				status: success ? TaskStatus.COMPLETED : TaskStatus.CANCELLED,
				success,
				startTime,
				endTime,
				duration: actualDuration,
				validationResults,
				metrics: {
					executionTime: actualDuration,
					memoryUsed: Math.random() * 100, // Simulated
					cpuUsed: Math.random() * 50, // Simulated
				},
			};
		} catch (error) {
			const endTime = new Date();
			const duration = endTime.getTime() - startTime.getTime();

			return {
				taskId: task.id,
				status: TaskStatus.CANCELLED,
				success: false,
				startTime,
				endTime,
				duration,
				error: error instanceof Error ? error.message : String(error),
				validationResults: [],
			};
		}
	}

	private async updateProgress(
		taskId: string,
		percentage: number,
		message?: string,
	): Promise<void> {
		const progress: TaskProgress = {
			taskId,
			status: TaskStatus.IN_PROGRESS,
			completionPercentage: percentage,
			stepsCompleted: Math.floor(percentage / 20),
			totalSteps: 5,
			...(message && { message }),
		};

		this.progressCallbacks.forEach((callback) => {
			try {
				callback(taskId, progress);
			} catch (_error) {
				// Ignore callback errors
			}
		});
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
