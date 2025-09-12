/**
 * Task Error Classes
 * Comprehensive error handling for task management system
 */

import type { TaskStatus, ValidationResult } from "../types";

/**
 * Base Task Error
 */
export class TaskError extends Error {
	public readonly code: string;
	public readonly taskId?: string | undefined;
	public readonly context?: Record<string, any> | undefined;
	public readonly timestamp: Date;

	constructor(
		message: string,
		code: string,
		taskId?: string,
		context?: Record<string, any>,
	) {
		super(message);
		this.name = "TaskError";
		this.code = code;
		this.taskId = taskId || undefined;
		this.context = context || undefined;
		this.timestamp = new Date();
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			taskId: this.taskId,
			context: this.context,
			timestamp: this.timestamp,
			stack: this.stack,
		};
	}
}

/**
 * Task Not Found Error
 */
export class TaskNotFoundError extends TaskError {
	constructor(taskId: string, context?: Record<string, any>) {
		super(
			`Task with ID '${taskId}' not found`,
			"TASK_NOT_FOUND",
			taskId,
			context,
		);
		this.name = "TaskNotFoundError";
	}
}

/**
 * Task Dependency Error
 */
export class TaskDependencyError extends TaskError {
	public readonly dependencyTaskId?: string | undefined;
	public readonly dependencyType?: string | undefined;

	constructor(
		message: string,
		taskId: string,
		dependencyTaskId?: string,
		dependencyType?: string,
		context?: Record<string, any>,
	) {
		super(message, "TASK_DEPENDENCY_ERROR", taskId, context);
		this.name = "TaskDependencyError";
		this.dependencyTaskId = dependencyTaskId || undefined;
		this.dependencyType = dependencyType || undefined;
	}
}

/**
 * Circular Dependency Error
 */
export class CircularDependencyError extends TaskDependencyError {
	public readonly dependencyChain: string[];

	constructor(
		taskId: string,
		dependencyTaskId: string,
		dependencyChain: string[],
		context?: Record<string, any>,
	) {
		const chainStr = dependencyChain.join(" -> ");
		super(
			`Circular dependency detected: ${chainStr}`,
			taskId,
			dependencyTaskId,
			"circular",
			{ ...context, dependencyChain },
		);
		this.name = "CircularDependencyError";
		this.dependencyChain = dependencyChain;
	}
}

/**
 * Task Status Error
 */
export class TaskStatusError extends TaskError {
	public readonly currentStatus: TaskStatus;
	public readonly expectedStatus?: TaskStatus[] | undefined;

	constructor(
		message: string,
		taskId: string,
		currentStatus: TaskStatus,
		expectedStatus?: TaskStatus[],
		context?: Record<string, any>,
	) {
		super(message, "TASK_STATUS_ERROR", taskId, context);
		this.name = "TaskStatusError";
		this.currentStatus = currentStatus;
		this.expectedStatus = expectedStatus || undefined;
	}
}

/**
 * Task Execution Error
 */
export class TaskExecutionError extends TaskError {
	public readonly executionPhase: string;
	public readonly originalError?: Error | undefined;

	constructor(
		message: string,
		taskId: string,
		executionPhase: string,
		originalError?: Error,
		context?: Record<string, any>,
	) {
		super(message, "TASK_EXECUTION_ERROR", taskId, {
			...context,
			executionPhase,
			originalError: originalError?.message,
		});
		this.name = "TaskExecutionError";
		this.executionPhase = executionPhase;
		this.originalError = originalError || undefined;
	}
}

/**
 * Task Validation Error
 */
export class TaskValidationError extends TaskError {
	public readonly validationResults: ValidationResult[];
	public readonly failedCriteria: ValidationResult[];

	constructor(
		message: string,
		taskId: string,
		validationResults: ValidationResult[],
		context?: Record<string, any>,
	) {
		const failedCriteria = validationResults.filter((result) => !result.passed);
		super(message, "TASK_VALIDATION_ERROR", taskId, {
			...context,
			validationResults,
			failedCriteriaCount: failedCriteria.length,
		});
		this.name = "TaskValidationError";
		this.validationResults = validationResults;
		this.failedCriteria = failedCriteria;
	}
}

/**
 * Task Resource Error
 */
export class TaskResourceError extends TaskError {
	public readonly resourceType: string;
	public readonly resourceLimit: number;
	public readonly currentUsage: number;

	constructor(
		message: string,
		resourceType: string,
		resourceLimit: number,
		currentUsage: number,
		taskId?: string,
		context?: Record<string, any>,
	) {
		super(message, "TASK_RESOURCE_ERROR", taskId, {
			...context,
			resourceType,
			resourceLimit,
			currentUsage,
		});
		this.name = "TaskResourceError";
		this.resourceType = resourceType;
		this.resourceLimit = resourceLimit;
		this.currentUsage = currentUsage;
	}
}

/**
 * Task Timeout Error
 */
export class TaskTimeoutError extends TaskError {
	public readonly timeout: number;
	public readonly actualDuration: number;

	constructor(
		message: string,
		taskId: string,
		timeout: number,
		actualDuration: number,
		context?: Record<string, any>,
	) {
		super(message, "TASK_TIMEOUT_ERROR", taskId, {
			...context,
			timeout,
			actualDuration,
		});
		this.name = "TaskTimeoutError";
		this.timeout = timeout;
		this.actualDuration = actualDuration;
	}
}

/**
 * Task Configuration Error
 */
export class TaskConfigurationError extends TaskError {
	public readonly configurationField: string;
	public readonly configurationValue: any;

	constructor(
		message: string,
		configurationField: string,
		configurationValue: any,
		taskId?: string,
		context?: Record<string, any>,
	) {
		super(message, "TASK_CONFIGURATION_ERROR", taskId, {
			...context,
			configurationField,
			configurationValue,
		});
		this.name = "TaskConfigurationError";
		this.configurationField = configurationField;
		this.configurationValue = configurationValue;
	}
}

/**
 * Task Batch Error
 */
export class TaskBatchError extends TaskError {
	public readonly batchId: string;
	public readonly failedTaskIds: string[];
	public readonly errors: TaskError[];

	constructor(
		message: string,
		batchId: string,
		failedTaskIds: string[],
		errors: TaskError[],
		context?: Record<string, any>,
	) {
		super(message, "TASK_BATCH_ERROR", undefined, {
			...context,
			batchId,
			failedTaskIds,
			errorCount: errors.length,
		});
		this.name = "TaskBatchError";
		this.batchId = batchId;
		this.failedTaskIds = failedTaskIds;
		this.errors = errors;
	}
}

/**
 * Task Repository Error
 */
export class TaskRepositoryError extends TaskError {
	public readonly operation: string;
	public readonly originalError?: Error | undefined;

	constructor(
		message: string,
		operation: string,
		originalError?: Error,
		taskId?: string,
		context?: Record<string, any>,
	) {
		super(message, "TASK_REPOSITORY_ERROR", taskId, {
			...context,
			operation,
			originalError: originalError?.message,
		});
		this.name = "TaskRepositoryError";
		this.operation = operation;
		this.originalError = originalError || undefined;
	}
}

/**
 * Task Template Error
 */
export class TaskTemplateError extends TaskError {
	public readonly templateId: string;
	public readonly templateOperation: string;

	constructor(
		message: string,
		templateId: string,
		templateOperation: string,
		context?: Record<string, any>,
	) {
		super(message, "TASK_TEMPLATE_ERROR", undefined, {
			...context,
			templateId,
			templateOperation,
		});
		this.name = "TaskTemplateError";
		this.templateId = templateId;
		this.templateOperation = templateOperation;
	}
}

/**
 * Error Factory for creating task errors
 */
export class TaskErrorFactory {
	static taskNotFound(
		taskId: string,
		context?: Record<string, any>,
	): TaskNotFoundError {
		return new TaskNotFoundError(taskId, context);
	}

	static circularDependency(
		taskId: string,
		dependencyTaskId: string,
		dependencyChain: string[],
		context?: Record<string, any>,
	): CircularDependencyError {
		return new CircularDependencyError(
			taskId,
			dependencyTaskId,
			dependencyChain,
			context,
		);
	}

	static invalidStatus(
		taskId: string,
		currentStatus: TaskStatus,
		expectedStatus: TaskStatus[],
		operation: string,
		context?: Record<string, any>,
	): TaskStatusError {
		const expectedStatusStr = expectedStatus.join(", ");
		return new TaskStatusError(
			`Cannot ${operation} task ${taskId}: expected status [${expectedStatusStr}], but got ${currentStatus}`,
			taskId,
			currentStatus,
			expectedStatus,
			context,
		);
	}

	static executionFailed(
		taskId: string,
		executionPhase: string,
		originalError: Error,
		context?: Record<string, any>,
	): TaskExecutionError {
		return new TaskExecutionError(
			`Task execution failed in ${executionPhase}: ${originalError.message}`,
			taskId,
			executionPhase,
			originalError,
			context,
		);
	}

	static validationFailed(
		taskId: string,
		validationResults: ValidationResult[],
		context?: Record<string, any>,
	): TaskValidationError {
		const failedCount = validationResults.filter(
			(result) => !result.passed,
		).length;
		return new TaskValidationError(
			`Task validation failed: ${failedCount} of ${validationResults.length} criteria failed`,
			taskId,
			validationResults,
			context,
		);
	}

	static resourceLimitExceeded(
		resourceType: string,
		resourceLimit: number,
		currentUsage: number,
		taskId?: string,
		context?: Record<string, any>,
	): TaskResourceError {
		return new TaskResourceError(
			`${resourceType} limit exceeded: ${currentUsage} > ${resourceLimit}`,
			resourceType,
			resourceLimit,
			currentUsage,
			taskId,
			context,
		);
	}

	static timeout(
		taskId: string,
		timeout: number,
		actualDuration: number,
		context?: Record<string, any>,
	): TaskTimeoutError {
		return new TaskTimeoutError(
			`Task execution timed out after ${actualDuration}ms (limit: ${timeout}ms)`,
			taskId,
			timeout,
			actualDuration,
			context,
		);
	}

	static invalidConfiguration(
		field: string,
		value: any,
		reason: string,
		taskId?: string,
		context?: Record<string, any>,
	): TaskConfigurationError {
		return new TaskConfigurationError(
			`Invalid configuration for ${field}: ${reason}`,
			field,
			value,
			taskId,
			context,
		);
	}

	static batchFailed(
		batchId: string,
		failedTaskIds: string[],
		errors: TaskError[],
		context?: Record<string, any>,
	): TaskBatchError {
		return new TaskBatchError(
			`Batch execution failed: ${failedTaskIds.length} tasks failed`,
			batchId,
			failedTaskIds,
			errors,
			context,
		);
	}

	static repositoryError(
		operation: string,
		originalError: Error,
		taskId?: string,
		context?: Record<string, any>,
	): TaskRepositoryError {
		return new TaskRepositoryError(
			`Repository operation '${operation}' failed: ${originalError.message}`,
			operation,
			originalError,
			taskId,
			context,
		);
	}

	static templateError(
		templateId: string,
		operation: string,
		reason: string,
		context?: Record<string, any>,
	): TaskTemplateError {
		return new TaskTemplateError(
			`Template operation '${operation}' failed for template '${templateId}': ${reason}`,
			templateId,
			operation,
			context,
		);
	}
}

/**
 * Error Handler utility
 */
export class TaskErrorHandler {
	private static errorCallbacks: Array<(error: TaskError) => void> = [];

	static addErrorCallback(callback: (error: TaskError) => void): void {
		TaskErrorHandler.errorCallbacks.push(callback);
	}

	static removeErrorCallback(callback: (error: TaskError) => void): void {
		const index = TaskErrorHandler.errorCallbacks.indexOf(callback);
		if (index !== -1) {
			TaskErrorHandler.errorCallbacks.splice(index, 1);
		}
	}

	static handleError(error: TaskError | Error): void {
		const taskError =
			error instanceof TaskError
				? error
				: new TaskError(error.message, "UNKNOWN_ERROR", undefined, {
						originalError: error.name,
					});

		TaskErrorHandler.errorCallbacks.forEach((callback) => {
			try {
				callback(taskError);
			} catch (callbackError) {
				console.error("Error in task error callback:", callbackError);
			}
		});
	}

	static isRetryableError(error: TaskError): boolean {
		const retryableCodes = [
			"TASK_RESOURCE_ERROR",
			"TASK_TIMEOUT_ERROR",
			"TASK_REPOSITORY_ERROR",
		];

		return retryableCodes.includes(error.code);
	}

	static getRetryDelay(_error: TaskError, attemptNumber: number): number {
		// Exponential backoff with jitter
		const baseDelay = 1000; // 1 second
		const maxDelay = 30000; // 30 seconds

		const delay = Math.min(baseDelay * 2 ** attemptNumber, maxDelay);
		const jitter = delay * 0.1 * Math.random();

		return delay + jitter;
	}

	static formatError(error: TaskError): string {
		const parts = [`[${error.code}]`, error.message];

		if (error.taskId) {
			parts.push(`(Task: ${error.taskId})`);
		}

		if (error.context) {
			const contextStr = Object.entries(error.context)
				.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
				.join(", ");
			parts.push(`{${contextStr}}`);
		}

		return parts.join(" ");
	}

	static createErrorReport(errors: TaskError[]): string {
		const errorsByType = errors.reduce(
			(acc, error) => {
				const type = error.name;
				if (!acc[type]) {
					acc[type] = [];
				}
				acc[type].push(error);
				return acc;
			},
			{} as Record<string, TaskError[]>,
		);

		let report = `Task Error Report (${errors.length} errors)\n`;
		report += `Generated: ${new Date().toISOString()}\n\n`;

		for (const [errorType, typeErrors] of Object.entries(errorsByType)) {
			report += `## ${errorType} (${typeErrors.length})\n\n`;

			typeErrors.forEach((error, index) => {
				report += `${index + 1}. ${TaskErrorHandler.formatError(error)}\n`;
				if (error.stack) {
					report += `   Stack: ${error.stack.split("\n")[1]?.trim()}\n`;
				}
				report += "\n";
			});
		}

		return report;
	}
}
