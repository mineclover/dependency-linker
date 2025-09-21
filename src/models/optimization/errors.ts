/**
 * Error classes for test optimization framework
 * Provides standardized error handling across all optimization services
 */

/**
 * Base error class for all optimization-related errors
 */
export abstract class OptimizationError extends Error {
	public readonly timestamp: Date;
	public readonly context: Record<string, any>;

	constructor(message: string, context: Record<string, any> = {}) {
		super(message);
		this.name = this.constructor.name;
		this.timestamp = new Date();
		this.context = context;

		// Maintain proper stack trace for V8
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Get formatted error message with context
	 */
	getFormattedMessage(): string {
		const contextStr =
			Object.keys(this.context).length > 0
				? ` Context: ${JSON.stringify(this.context)}`
				: "";
		return `${this.message}${contextStr}`;
	}

	/**
	 * Convert error to JSON for logging
	 */
	toJSON(): Record<string, any> {
		return {
			name: this.name,
			message: this.message,
			timestamp: this.timestamp.toISOString(),
			context: this.context,
			stack: this.stack,
		};
	}
}

/**
 * Thrown when test analysis fails
 */
export class TestAnalysisError extends OptimizationError {
	public readonly testSuiteId?: string;
	public readonly analysisType?: string;

	constructor(
		message: string,
		testSuiteId?: string,
		analysisType?: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, testSuiteId, analysisType });
		this.testSuiteId = testSuiteId;
		this.analysisType = analysisType;
	}
}

/**
 * Thrown when test optimization fails
 */
export class TestOptimizationError extends OptimizationError {
	public readonly optimizationType: string;
	public readonly targetSuite: string;
	public readonly targetCases?: string[];

	constructor(
		message: string,
		optimizationType: string,
		targetSuite: string,
		targetCases?: string[],
		context: Record<string, any> = {},
	) {
		super(message, { ...context, optimizationType, targetSuite, targetCases });
		this.optimizationType = optimizationType;
		this.targetSuite = targetSuite;
		this.targetCases = targetCases;
	}
}

/**
 * Thrown when performance tracking fails
 */
export class PerformanceTrackingError extends OptimizationError {
	public readonly testSuiteId: string;
	public readonly operation?: string;
	public readonly metrics?: any;

	constructor(
		message: string,
		testSuiteId: string,
		operation?: string,
		metrics?: any,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, testSuiteId, operation, metrics });
		this.testSuiteId = testSuiteId;
		this.operation = operation;
		this.metrics = metrics;
	}
}

/**
 * Thrown when validation fails
 */
export class ValidationError extends OptimizationError {
	public readonly violations: string[];
	public readonly validationType?: string;

	constructor(
		message: string,
		violations: string[],
		validationType?: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, violations, validationType });
		this.violations = violations;
		this.validationType = validationType;
	}
}

/**
 * Thrown when baseline operations fail
 */
export class BaselineError extends OptimizationError {
	public readonly baselineId?: string;
	public readonly operation?: string;

	constructor(
		message: string,
		baselineId?: string,
		operation?: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, baselineId, operation });
		this.baselineId = baselineId;
		this.operation = operation;
	}
}

/**
 * Thrown when configuration is invalid
 */
export class ConfigurationError extends OptimizationError {
	public readonly configKey?: string;
	public readonly configValue?: any;

	constructor(
		message: string,
		configKey?: string,
		configValue?: any,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, configKey, configValue });
		this.configKey = configKey;
		this.configValue = configValue;
	}
}

/**
 * Thrown when file operations fail
 */
export class FileOperationError extends OptimizationError {
	public readonly filePath: string;
	public readonly operation: string;

	constructor(
		message: string,
		filePath: string,
		operation: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, filePath, operation });
		this.filePath = filePath;
		this.operation = operation;
	}
}

/**
 * Thrown when timeout occurs
 */
export class TimeoutError extends OptimizationError {
	public readonly timeoutMs: number;
	public readonly operation?: string;

	constructor(
		message: string,
		timeoutMs: number,
		operation?: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, timeoutMs, operation });
		this.timeoutMs = timeoutMs;
		this.operation = operation;
	}
}

/**
 * Thrown when dependency resolution fails
 */
export class DependencyError extends OptimizationError {
	public readonly dependency: string;
	public readonly dependentItem: string;

	constructor(
		message: string,
		dependency: string,
		dependentItem: string,
		context: Record<string, any> = {},
	) {
		super(message, { ...context, dependency, dependentItem });
		this.dependency = dependency;
		this.dependentItem = dependentItem;
	}
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
	/**
	 * Check if an error is an optimization error
	 */
	static isOptimizationError(error: any): error is OptimizationError {
		return error instanceof OptimizationError;
	}

	/**
	 * Check if an error is recoverable
	 */
	static isRecoverableError(error: any): boolean {
		if (error instanceof ValidationError) return true;
		if (error instanceof ConfigurationError) return true;
		if (error instanceof TimeoutError) return true;
		return false;
	}

	/**
	 * Extract error context for logging
	 */
	static extractContext(error: any): Record<string, any> {
		if (error instanceof OptimizationError) {
			return error.context;
		}
		return {
			name: error?.name || "Unknown",
			message: error?.message || "Unknown error",
			stack: error?.stack,
		};
	}

	/**
	 * Create a user-friendly error message
	 */
	static createUserMessage(error: any): string {
		if (error instanceof TestAnalysisError) {
			return `Failed to analyze test suite${error.testSuiteId ? ` '${error.testSuiteId}'` : ""}: ${error.message}`;
		}

		if (error instanceof TestOptimizationError) {
			return `Failed to apply ${error.optimizationType} optimization to suite '${error.targetSuite}': ${error.message}`;
		}

		if (error instanceof PerformanceTrackingError) {
			return `Performance tracking failed for suite '${error.testSuiteId}': ${error.message}`;
		}

		if (error instanceof ValidationError) {
			return `Validation failed: ${error.message}. Violations: ${error.violations.join(", ")}`;
		}

		if (error instanceof BaselineError) {
			return `Baseline operation failed: ${error.message}`;
		}

		if (error instanceof ConfigurationError) {
			return `Configuration error: ${error.message}`;
		}

		if (error instanceof FileOperationError) {
			return `File operation '${error.operation}' failed for '${error.filePath}': ${error.message}`;
		}

		if (error instanceof TimeoutError) {
			return `Operation timed out after ${error.timeoutMs}ms: ${error.message}`;
		}

		if (error instanceof DependencyError) {
			return `Dependency '${error.dependency}' required by '${error.dependentItem}' could not be resolved: ${error.message}`;
		}

		// Fallback for unknown errors
		return error?.message || "An unknown error occurred";
	}

	/**
	 * Log error with appropriate level
	 */
	static logError(error: any, logger?: any): void {
		const context = ErrorUtils.extractContext(error);
		const userMessage = ErrorUtils.createUserMessage(error);

		if (logger) {
			if (
				error instanceof ValidationError ||
				error instanceof ConfigurationError
			) {
				logger.warn(userMessage, context);
			} else if (error instanceof TimeoutError) {
				logger.warn(userMessage, context);
			} else {
				logger.error(userMessage, context);
			}
		} else {
			// Fallback to console
			console.error(userMessage, context);
		}
	}

	/**
	 * Wrap async function with error handling
	 */
	static async withErrorHandling<T>(
		operation: () => Promise<T>,
		errorType: new (...args: any[]) => OptimizationError,
		context: Record<string, any> = {},
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof OptimizationError) {
				throw error; // Re-throw optimization errors as-is
			}

			// Wrap other errors
			throw new errorType(
				(error as Error)?.message || "Unknown error occurred",
				context,
			);
		}
	}

	/**
	 * Create error from validation violations
	 */
	static fromValidationViolations(
		violations: string[],
		validationType: string = "general",
	): ValidationError {
		const message = `Validation failed with ${violations.length} violation(s)`;
		return new ValidationError(message, violations, validationType);
	}
}

/**
 * Error handler decorator for class methods
 */
export function handleErrors(
	errorType: new (...args: any[]) => OptimizationError,
) {
	return (
		target: any,
		propertyName: string,
		descriptor: PropertyDescriptor,
	) => {
		const method = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			try {
				return await method.apply(this, args);
			} catch (error) {
				if (error instanceof OptimizationError) {
					throw error;
				}

				throw new errorType(
					(error as Error)?.message || "Unknown error occurred",
					{ method: propertyName, args },
				);
			}
		};

		return descriptor;
	};
}
