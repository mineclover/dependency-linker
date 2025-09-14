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

	/**
	 * Get actionable solutions for resolving this error
	 */
	getSolutions(): string[] {
		return [
			"Check the error details for specific information about what went wrong",
			"Review the file path and ensure it exists and is accessible",
			"Verify your TypeScript configuration is correct",
		];
	}

	/**
	 * Get preventive measures to avoid this error in the future
	 */
	getPreventiveMeasures(): string[] {
		return [
			"Validate input parameters before calling API methods",
			"Use proper error handling with try-catch blocks",
			"Monitor system resources during batch operations",
		];
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

	override getSolutions(): string[] {
		const filePath = this.details.filePath;
		return [
			`Verify that the file "${filePath}" exists at the specified location`,
			"Check if the file path is correct and uses the proper path separators for your OS",
			"Ensure the file hasn't been moved, renamed, or deleted",
			"Use an absolute path instead of a relative path if applicable",
			"Check if you have read permissions for the file and its directory",
			"Verify the current working directory is what you expect",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Use fs.existsSync() or fs.access() to check file existence before analysis",
			"Validate file paths using path.resolve() or path.isAbsolute()",
			"Implement proper file discovery with glob patterns or directory scanning",
			"Set up file watchers to detect when files are moved or deleted",
			"Use TypeScript project configuration (tsconfig.json) to define file inclusion patterns",
		];
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

	override getSolutions(): string[] {
		const { filePath, operation } = this.details;
		const isWindows = process.platform === "win32";
		return [
			`Grant read permissions to the file "${filePath}"`,
			isWindows
				? "Run the command prompt as Administrator and try again"
				: "Use 'chmod +r' command to add read permissions to the file",
			"Check if the file is locked by another process",
			"Ensure the parent directory has appropriate permissions",
			isWindows
				? "Check Windows file security settings and ensure your user has access"
				: "Use 'sudo' if you need elevated permissions (be careful with this)",
			"Verify the file isn't in a system-protected directory",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Check file permissions before attempting analysis operations",
			"Run your application with appropriate user privileges",
			"Avoid analyzing files in system-protected directories",
			"Use proper file access checks (fs.access()) before operations",
			"Set up proper file ownership and permissions in your deployment environment",
			"Consider using a dedicated directory with known permissions for temporary files",
		];
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

	override getSolutions(): string[] {
		const { filePath, supportedTypes } = this.details;
		const ext = filePath.split(".").pop() || "";
		return [
			`Rename the file to use a supported TypeScript extension (.ts, .tsx, .d.ts)`,
			supportedTypes.length > 0
				? `Supported file types are: ${supportedTypes.join(", ")}`
				: "This analyzer only supports TypeScript files (.ts, .tsx, .d.ts)",
			`Change the file extension from ".${ext}" to ".ts" or ".tsx"`,
			"If this is a JavaScript file, consider converting it to TypeScript",
			"Use a different analyzer or tool for non-TypeScript files",
			"Check if the file extension is correct and not missing",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Validate file extensions before attempting analysis",
			"Use file filtering to only process supported file types",
			"Set up proper file discovery patterns that exclude unsupported files",
			"Configure your build tools to use consistent file extensions",
			"Document the supported file types for your team",
			"Use TypeScript's 'include' and 'exclude' patterns in tsconfig.json",
		];
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

	override getSolutions(): string[] {
		const { filePath, timeout } = this.details;
		const timeoutSeconds = Math.round(timeout / 1000);
		return [
			`Increase the timeout value to more than ${timeout}ms for large files`,
			"Break down large files into smaller, more manageable modules",
			"Optimize the TypeScript code to reduce parsing complexity",
			"Use a more powerful machine with better CPU performance",
			"Consider processing the file in smaller chunks if possible",
			`Current timeout: ${timeoutSeconds}s - try doubling it to ${timeoutSeconds * 2}s`,
			"Check if the file has extremely deep nesting or complex type definitions",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Set appropriate timeout values based on your typical file sizes",
			"Implement file size checks before attempting to parse large files",
			"Use code splitting and modularization to keep files smaller",
			"Monitor parsing performance and adjust timeouts accordingly",
			"Set up performance budgets for file complexity",
			"Use streaming or incremental parsing for very large files",
			"Consider using TypeScript compiler options to optimize parsing",
		];
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

	override getSolutions(): string[] {
		const { filePath, parseDetails } = this.details;
		return [
			"Fix the syntax errors in the TypeScript file",
			"Use a TypeScript-aware editor (VS Code, IntelliJ) to identify syntax issues",
			"Run 'npx tsc --noEmit' to check for TypeScript compilation errors",
			"Check for missing brackets, parentheses, or semicolons",
			"Verify that all imports and exports are properly formatted",
			"Use 'prettier' or similar formatter to fix formatting issues",
			"Check if the file uses unsupported TypeScript features for your target version",
			parseDetails.includes("Unexpected token")
				? "Look for unexpected characters or malformed syntax near the error location"
				: "Review the specific parse error details for guidance",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Set up TypeScript compilation in your build process to catch syntax errors early",
			"Use ESLint with TypeScript rules to catch common syntax issues",
			"Enable TypeScript strict mode to catch more potential issues",
			"Set up pre-commit hooks to validate TypeScript syntax",
			"Use proper IDE configuration with TypeScript support",
			"Implement automated testing that includes TypeScript compilation",
			"Set up continuous integration to validate all TypeScript files",
		];
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

	override getSolutions(): string[] {
		const { parameter, value, expectedType } = this.details;
		const solutions = [
			expectedType
				? `Set "${parameter}" to a ${expectedType} value`
				: `Provide a valid value for "${parameter}"`,
			"Check the API documentation for correct configuration options",
			"Validate your configuration object before passing it to the analyzer",
		];

		// Specific solutions based on common configuration issues
		if (typeof value === "string" && expectedType === "number") {
			solutions.push(
				`Convert the string "${value}" to a number, e.g., ${parameter}: ${parseInt(value) || 0}`,
			);
		}

		if (parameter.toLowerCase().includes("timeout")) {
			solutions.push(
				"Timeout values should be positive numbers in milliseconds (e.g., 30000 for 30 seconds)",
			);
		}

		if (parameter.toLowerCase().includes("cache")) {
			solutions.push(
				"Cache size should be a positive integer",
				"Enable cache with 'enableCache: true'",
			);
		}

		if (parameter.toLowerCase().includes("concurrency")) {
			solutions.push(
				"Concurrency should be a positive integer between 1 and your CPU core count",
			);
		}

		return solutions;
	}

	override getPreventiveMeasures(): string[] {
		const { parameter } = this.details;
		return [
			"Use TypeScript interfaces or types to validate configuration objects at compile time",
			"Implement runtime validation for configuration parameters",
			"Provide default values for optional configuration parameters",
			"Document all configuration options with their expected types and ranges",
			"Use configuration validation libraries like Joi or Yup",
			"Set up unit tests for configuration validation",
			`Review the documentation for "${parameter}" to understand its valid values`,
		];
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

	override getSolutions(): string[] {
		const failedCount = this.failedFiles.length;
		const totalFiles = this.details.totalFiles || failedCount;
		const successRate =
			totalFiles > 0
				? (((totalFiles - failedCount) / totalFiles) * 100).toFixed(1)
				: 0;

		const solutions = [
			"Review the failed files individually to identify specific issues",
			"Use 'continueOnError: true' option to process successful files even when some fail",
			"Check system resources (memory, CPU) if processing many files",
		];

		if (failedCount === 1) {
			solutions.push(
				`Focus on fixing the single failed file: ${this.failedFiles[0]}`,
			);
		} else if (failedCount > 1) {
			solutions.push(
				`Start by fixing the first failed file: ${this.failedFiles[0]}`,
				"Process files in smaller batches to isolate problematic files",
				"Implement retry logic for transient failures",
			);
		}

		if (successRate !== "0") {
			solutions.push(
				`Success rate: ${successRate}% - review patterns in failed vs successful files`,
			);
		}

		solutions.push(
			"Reduce batch size or concurrency if system resources are limited",
			"Enable detailed logging to understand failure patterns",
			"Consider preprocessing files to validate they're ready for analysis",
		);

		return solutions;
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Validate all files before starting batch processing",
			"Implement proper error handling with detailed logging",
			"Use file size and complexity checks before processing",
			"Set appropriate resource limits for batch operations",
			"Monitor system resources during batch processing",
			"Implement circuit breaker patterns for failing operations",
			"Use staged processing: validate → analyze → report",
			"Set up file filtering to exclude known problematic files",
		];
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

	override getSolutions(): string[] {
		const { operation, reason } = this.details;
		return [
			"If this was unintentional, restart the operation",
			"Check if the operation was cancelled due to timeout or resource constraints",
			"Review the cancellation reason if provided",
			reason
				? `Cancellation reason: ${reason}`
				: "No specific cancellation reason provided",
			"Consider breaking large operations into smaller, resumable chunks",
			"Implement proper cancellation handling to save partial progress",
		];
	}

	override getPreventiveMeasures(): string[] {
		return [
			"Implement graceful cancellation that saves partial progress",
			"Provide clear feedback about operation progress to reduce premature cancellation",
			"Set appropriate timeouts to prevent hanging operations",
			"Allow operations to be paused and resumed instead of only cancelled",
			"Use progress indicators to show users that work is being done",
			"Implement auto-save functionality for long-running operations",
		];
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

	override getSolutions(): string[] {
		const { resource, currentUsage, limit } = this.details;
		const solutions = [
			`Close other applications to free up ${resource} resources`,
			"Reduce the batch size or concurrency for the current operation",
			"Increase system resources (RAM, CPU) if possible",
		];

		if (resource === "memory") {
			solutions.push(
				"Enable garbage collection more frequently",
				"Use memory-efficient processing options",
				"Process files in smaller chunks",
				currentUsage && limit
					? `Current usage: ${currentUsage}MB, Limit: ${limit}MB - consider increasing the limit`
					: "Check current memory usage and set appropriate limits",
			);
		}

		if (resource === "CPU") {
			solutions.push(
				"Reduce concurrency to lower CPU usage",
				"Use CPU-efficient algorithms if available",
				"Process during off-peak hours when CPU is less busy",
			);
		}

		return solutions;
	}

	override getPreventiveMeasures(): string[] {
		const { resource } = this.details;
		return [
			`Monitor ${resource} usage during operations`,
			"Set up resource monitoring and alerting",
			"Implement adaptive resource management that adjusts to available resources",
			"Use resource quotas and limits to prevent system overload",
			"Plan processing schedules around available system resources",
			"Implement efficient resource cleanup and garbage collection",
			`Configure ${resource} limits based on your system specifications`,
		];
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
