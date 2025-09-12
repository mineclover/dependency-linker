/**
 * API Layer Error Classes for TypeScript File Analyzer
 * Defines comprehensive error hierarchy with proper error codes and metadata
 */

/**
 * Base error class for all analysis-related errors
 * Provides structured error information with codes and metadata
 */
export abstract class AnalysisError extends Error {
	/** Error code for programmatic handling */
	public readonly code: string;

	/** Additional error metadata */
	public readonly details: Record<string, any>;

	/** Original error that caused this error (if any) */
	public readonly cause: Error | undefined;

	/** Timestamp when error occurred */
	public readonly timestamp: Date;

	constructor(
		message: string,
		code: string,
		details: Record<string, any> = {},
		cause?: Error,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.details = details;
		this.cause = cause;
		this.timestamp = new Date();

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Convert error to JSON representation
	 */
	toJSON(): Record<string, any> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			details: this.details,
			timestamp: this.timestamp.toISOString(),
			stack: this.stack,
			cause: this.cause
				? {
						name: this.cause.name,
						message: this.cause.message,
						stack: this.cause.stack,
					}
				: undefined,
		};
	}

	/**
	 * Get user-friendly error description
	 */
	getUserMessage(): string {
		return this.message;
	}
}

/**
 * Error thrown when a requested file cannot be found
 */
export class FileNotFoundError extends AnalysisError {
	constructor(filePath: string, cause?: Error) {
		super(`File not found: ${filePath}`, "FILE_NOT_FOUND", { filePath }, cause);
	}

	override getUserMessage(): string {
		const filePath = this.details.filePath;
		return `The file "${filePath}" could not be found. Please check the file path and try again.`;
	}
}

/**
 * Error thrown when file access is denied due to permissions
 */
export class FileAccessError extends AnalysisError {
	constructor(filePath: string, operation: string, cause?: Error) {
		super(
			`Access denied for ${operation} operation on: ${filePath}`,
			"FILE_ACCESS_DENIED",
			{ filePath, operation },
			cause,
		);
	}

	override getUserMessage(): string {
		const { filePath, operation } = this.details;
		return `Permission denied when trying to ${operation} "${filePath}". Please check file permissions.`;
	}
}

/**
 * Error thrown when file type is not supported for analysis
 */
export class InvalidFileTypeError extends AnalysisError {
	constructor(filePath: string, supportedTypes: string[] = []) {
		super(`Invalid file type for analysis: ${filePath}`, "INVALID_FILE_TYPE", {
			filePath,
			supportedTypes,
		});
	}

	override getUserMessage(): string {
		const { filePath, supportedTypes } = this.details;
		const supportedTypesText =
			supportedTypes.length > 0
				? ` Supported types: ${supportedTypes.join(", ")}`
				: "";
		return `The file "${filePath}" is not a supported TypeScript file type.${supportedTypesText}`;
	}
}

/**
 * Error thrown when parsing operation exceeds timeout
 */
export class ParseTimeoutError extends AnalysisError {
	constructor(filePath: string, timeout: number, cause?: Error) {
		super(
			`Parse operation timed out after ${timeout}ms for: ${filePath}`,
			"PARSE_TIMEOUT",
			{ filePath, timeout },
			cause,
		);
	}

	override getUserMessage(): string {
		const { filePath, timeout } = this.details;
		return `Parsing "${filePath}" took longer than ${timeout}ms and was cancelled. The file may be too large or complex.`;
	}
}

/**
 * Error thrown when TypeScript parsing fails due to syntax errors
 */
export class ParseError extends AnalysisError {
	constructor(filePath: string, parseDetails: string, cause?: Error) {
		super(
			`Failed to parse TypeScript file: ${filePath}`,
			"PARSE_ERROR",
			{ filePath, parseDetails },
			cause,
		);
	}

	override getUserMessage(): string {
		const { filePath, parseDetails } = this.details;
		return `Failed to parse "${filePath}". ${parseDetails}`;
	}
}

/**
 * Error thrown when analysis configuration is invalid
 */
export class ConfigurationError extends AnalysisError {
	constructor(
		parameter: string,
		value: any,
		expectedType?: string,
		cause?: Error,
	) {
		super(
			`Invalid configuration: ${parameter}`,
			"CONFIGURATION_ERROR",
			{ parameter, value, expectedType },
			cause,
		);
	}

	override getUserMessage(): string {
		const { parameter, value, expectedType } = this.details;
		const typeText = expectedType ? ` Expected type: ${expectedType}.` : "";
		return `Invalid configuration for "${parameter}": ${value}.${typeText}`;
	}
}

/**
 * Error thrown during batch processing operations
 */
export class BatchError extends AnalysisError {
	public readonly failedFiles: string[];
	public readonly partialResults: any[];

	constructor(
		message: string,
		failedFiles: string[] = [],
		partialResults: any[] = [],
		details: Record<string, any> = {},
		cause?: Error,
	) {
		super(
			message,
			"BATCH_ERROR",
			{ ...details, failedFileCount: failedFiles.length },
			cause,
		);
		this.failedFiles = failedFiles;
		this.partialResults = partialResults;
	}

	override getUserMessage(): string {
		const failedCount = this.failedFiles.length;
		if (failedCount === 0) {
			return this.message;
		}

		if (failedCount === 1) {
			return `Batch processing failed for 1 file: ${this.failedFiles[0]}`;
		}

		return `Batch processing failed for ${failedCount} files. First failed file: ${this.failedFiles[0]}`;
	}

	/**
	 * Get list of failed files
	 */
	getFailedFiles(): string[] {
		return [...this.failedFiles];
	}

	/**
	 * Get partial results from successful analyses
	 */
	getPartialResults(): any[] {
		return [...this.partialResults];
	}
}

/**
 * Error thrown when an operation is cancelled
 */
export class OperationCancelledError extends AnalysisError {
	constructor(operation: string, details: Record<string, any> = {}) {
		super(`Operation cancelled: ${operation}`, "OPERATION_CANCELLED", {
			operation,
			...details,
		});
	}

	override getUserMessage(): string {
		const { operation } = this.details;
		return `The ${operation} operation was cancelled by the user.`;
	}
}

/**
 * Error thrown when system resources are insufficient
 */
export class ResourceError extends AnalysisError {
	constructor(
		resource: string,
		details: Record<string, any> = {},
		cause?: Error,
	) {
		super(
			`Insufficient ${resource} resources`,
			"RESOURCE_ERROR",
			{ resource, ...details },
			cause,
		);
	}

	override getUserMessage(): string {
		const { resource } = this.details;
		return `Insufficient ${resource} resources to complete the operation. Try reducing the workload or closing other applications.`;
	}
}

/**
 * Error thrown when internal state is inconsistent
 */
export class InternalError extends AnalysisError {
	constructor(
		context: string,
		details: Record<string, any> = {},
		cause?: Error,
	) {
		super(
			`Internal error in ${context}`,
			"INTERNAL_ERROR",
			{ context, ...details },
			cause,
		);
	}

	override getUserMessage(): string {
		return "An internal error occurred. This is likely a bug in the analyzer. Please report this issue.";
	}
}

/**
 * Error thrown when required dependencies are missing
 */
export class DependencyError extends AnalysisError {
	constructor(
		dependency: string,
		details: Record<string, any> = {},
		cause?: Error,
	) {
		super(
			`Missing required dependency: ${dependency}`,
			"DEPENDENCY_ERROR",
			{ dependency, ...details },
			cause,
		);
	}

	override getUserMessage(): string {
		const { dependency } = this.details;
		return `Required dependency "${dependency}" is missing or not properly installed.`;
	}
}

/**
 * Error thrown when operation is not supported
 */
export class UnsupportedOperationError extends AnalysisError {
	constructor(
		operation: string,
		reason?: string,
		details: Record<string, any> = {},
	) {
		super(
			`Unsupported operation: ${operation}${reason ? ` (${reason})` : ""}`,
			"UNSUPPORTED_OPERATION",
			{ operation, reason, ...details },
		);
	}

	override getUserMessage(): string {
		const { operation, reason } = this.details;
		const reasonText = reason ? ` ${reason}` : "";
		return `The operation "${operation}" is not supported.${reasonText}`;
	}
}

/**
 * Error thrown when format is not supported for output
 */
export class UnsupportedFormatError extends AnalysisError {
	constructor(format: string, supportedFormats: string[] = []) {
		super(`Unsupported format: ${format}`, "UNSUPPORTED_FORMAT", {
			format,
			supportedFormats,
		});
	}

	override getUserMessage(): string {
		const { format, supportedFormats } = this.details;
		const supportedText =
			supportedFormats.length > 0
				? ` Supported formats: ${supportedFormats.join(", ")}`
				: "";
		return `The format "${format}" is not supported.${supportedText}`;
	}
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
	/**
	 * Check if error is of specific type
	 */
	static isErrorOfType<T extends AnalysisError>(
		error: any,
		errorClass: new (...args: any[]) => T,
	): error is T {
		return error instanceof errorClass;
	}

	/**
	 * Extract error code from any error
	 */
	static getErrorCode(error: any): string {
		if (error instanceof AnalysisError) {
			return error.code;
		}

		if (error && typeof error.code === "string") {
			return error.code;
		}

		return "UNKNOWN_ERROR";
	}

	/**
	 * Get user-friendly message from any error
	 */
	static getUserMessage(error: any): string {
		if (error instanceof AnalysisError) {
			return error.getUserMessage();
		}

		if (error instanceof Error) {
			return error.message;
		}

		return String(error);
	}

	/**
	 * Create error from unknown value
	 */
	static fromUnknown(value: unknown, context: string): AnalysisError {
		if (value instanceof AnalysisError) {
			return value;
		}

		if (value instanceof Error) {
			return new InternalError(
				context,
				{ originalError: value.message },
				value,
			);
		}

		return new InternalError(context, { originalValue: value });
	}

	/**
	 * Convert error to structured format for logging
	 */
	static toLogFormat(error: any): Record<string, any> {
		if (error instanceof AnalysisError) {
			return error.toJSON();
		}

		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
				stack: error.stack,
			};
		}

		return { value: error };
	}

	/**
	 * Aggregate multiple errors into a batch error
	 */
	static createBatchError(
		errors: Array<{ filePath: string; error: Error }>,
		partialResults: any[] = [],
	): BatchError {
		const failedFiles = errors.map((e) => e.filePath);
		const errorDetails = errors.map((e) => ({
			filePath: e.filePath,
			error: ErrorUtils.getErrorCode(e.error),
			message: ErrorUtils.getUserMessage(e.error),
		}));

		return new BatchError(
			`Batch processing failed for ${failedFiles.length} file(s)`,
			failedFiles,
			partialResults,
			{ errorDetails },
		);
	}
}
