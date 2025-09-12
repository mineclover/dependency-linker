/**
 * Task Manager Interface
 * Core interface for task management operations
 */

import type {
	Task,
	TaskBatch,
	TaskExecutionContext,
	TaskExecutionResult,
	TaskProgress,
	TaskQueryOptions,
	TaskStatistics,
	TaskStatus,
	ValidationResult,
} from "../types";

/**
 * Main Task Manager Interface
 */
export interface ITaskManager {
	/**
	 * Task CRUD Operations
	 */
	createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task>;
	updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
	deleteTask(taskId: string): Promise<boolean>;
	getTask(taskId: string): Promise<Task | null>;
	getTasks(options?: TaskQueryOptions): Promise<Task[]>;

	/**
	 * Task Status Management
	 */
	startTask(
		taskId: string,
		context?: TaskExecutionContext,
	): Promise<TaskExecutionResult>;
	pauseTask(taskId: string): Promise<boolean>;
	resumeTask(taskId: string): Promise<boolean>;
	completeTask(
		taskId: string,
		validationResults?: ValidationResult[],
	): Promise<TaskExecutionResult>;
	cancelTask(taskId: string, reason?: string): Promise<boolean>;
	blockTask(taskId: string, reason?: string): Promise<boolean>;
	unblockTask(taskId: string): Promise<boolean>;

	/**
	 * Task Dependencies
	 */
	addDependency(
		taskId: string,
		dependencyTaskId: string,
		type: "blocks" | "requires" | "optional",
	): Promise<boolean>;
	removeDependency(taskId: string, dependencyTaskId: string): Promise<boolean>;
	getDependencies(taskId: string): Promise<Task[]>;
	getBlockedBy(taskId: string): Promise<Task[]>;
	canStart(taskId: string): Promise<boolean>;

	/**
	 * Task Progress Tracking
	 */
	getProgress(taskId: string): Promise<TaskProgress>;
	updateProgress(
		taskId: string,
		percentage: number,
		message?: string,
	): Promise<boolean>;

	/**
	 * Batch Operations
	 */
	createBatch(batch: Omit<TaskBatch, "id">): Promise<TaskBatch>;
	executeBatch(
		batchId: string,
		maxConcurrency?: number,
	): Promise<TaskExecutionResult[]>;
	getBatchProgress(batchId: string): Promise<Record<string, TaskProgress>>;

	/**
	 * Task Analytics
	 */
	getStatistics(): Promise<TaskStatistics>;
	getCriticalPath(): Promise<Task[]>;
	getParallelizableTasks(): Promise<Task[]>;
	estimateCompletionTime(): Promise<number>;

	/**
	 * Task Validation
	 */
	validateTask(taskId: string): Promise<ValidationResult[]>;
	validateAllTasks(): Promise<Record<string, ValidationResult[]>>;

	/**
	 * Task Templates
	 */
	getAvailableTemplates(): Promise<string[]>;
	createTaskFromTemplate(
		templateId: string,
		overrides?: Partial<Task>,
	): Promise<Task>;

	/**
	 * Event System
	 */
	onTaskStatusChange(
		callback: (
			taskId: string,
			oldStatus: TaskStatus,
			newStatus: TaskStatus,
		) => void,
	): void;
	onTaskProgress(
		callback: (taskId: string, progress: TaskProgress) => void,
	): void;
	onTaskCompleted(
		callback: (taskId: string, result: TaskExecutionResult) => void,
	): void;
	onTaskFailed(callback: (taskId: string, error: Error) => void): void;

	/**
	 * Cleanup and Persistence
	 */
	saveState(): Promise<boolean>;
	loadState(): Promise<boolean>;
	clearState(): Promise<boolean>;
	exportTasks(format: "json" | "csv" | "markdown"): Promise<string>;
	importTasks(data: string, format: "json" | "csv"): Promise<Task[]>;
}
