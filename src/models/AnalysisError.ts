/**
 * Error handling for analysis operations
 * Provides structured error reporting and categorization
 */

export interface AnalysisError {
	/** Error type/category */
	type: ErrorType;

	/** Error category (backward compatibility) */
	category?: string;

	/** Human-readable error message */
	message: string;

	/** Error severity level */
	severity: ErrorSeverity;

	/** Source code location where error occurred (if applicable) */
	location?: SourceLocation;

	/** File path where error occurred */
	filePath?: string;

	/** Component that generated the error */
	source: ErrorSource;

	/** Additional error context and details */
	context: ErrorContext;

	/** Timestamp when error occurred */
	timestamp: Date;

	/** Unique error identifier */
	id: string;

	/** Stack trace for debugging */
	stack?: string;

	/** Recovery suggestions */
	suggestions?: string[];
}

export type ErrorType =
	| "FileNotFound"
	| "FileAccessDenied"
	| "InvalidFileType"
	| "ParseError"
	| "SyntaxError"
	| "TimeoutError"
	| "MemoryError"
	| "PluginError"
	| "ExtractionError"
	| "InterpretationError"
	| "CacheError"
	| "ConfigurationError"
	| "ValidationError"
	| "NetworkError"
	| "InternalError";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorSource =
	| "parser"
	| "extractor"
	| "interpreter"
	| "cache"
	| "filesystem"
	| "network"
	| "configuration"
	| "plugin"
	| "engine"
	| "validation";

export interface ErrorContext {
	/** Operation being performed when error occurred */
	operation?: string;

	/** Parameters or input that caused the error */
	input?: any;

	/** Expected vs actual values */
	expected?: any;
	actual?: any;

	/** Related error information */
	relatedErrors?: string[];

	/** Line number (backward compatibility) */
	line?: number;

	/** Performance metrics at time of error */
	performanceContext?: {
		memoryUsage: number;
		elapsedTime: number;
		resourceUtilization: number;
	};

	/** Configuration context */
	configuration?: Record<string, any>;

	/** Additional metadata */
	metadata?: Record<string, any>;

	/** Legacy details property for backward compatibility */
	details?: Record<string, any>;
}

export interface SourceLocation {
	/** Line number (1-based) */
	line: number;

	/** Column number (1-based) */
	column: number;

	/** End line number (1-based, if range) */
	endLine?: number;

	/** End column number (1-based, if range) */
	endColumn?: number;

	/** Character offset from beginning of file */
	offset?: number;

	/** Length of the error span */
	length?: number;
}

/**
 * Factory for creating structured analysis errors
 */
// Error counter for unique ID generation
let errorCounter = 0;

/**
 * Creates a file not found error
 */
export function createFileNotFoundError(
	filePath: string,
	operation: string = "read",
): AnalysisError {
	return createError({
		type: "FileNotFound",
		message: `File not found: ${filePath}`,
		severity: "error",
		filePath,
		source: "filesystem",
		context: {
			operation,
			input: filePath,
			metadata: { fileSystem: true },
		},
		suggestions: [
			"Check that the file path is correct",
			"Verify that the file exists",
			"Check file system permissions",
		],
	});
}

/**
 * Creates a file access denied error
 */
export function createFileAccessDeniedError(filePath: string): AnalysisError {
	return createError({
		type: "FileAccessDenied",
		message: `Access denied: ${filePath}`,
		severity: "error",
		filePath,
		source: "filesystem",
		context: {
			operation: "read",
			input: filePath,
			metadata: { permissions: true },
		},
		suggestions: [
			"Check file permissions",
			"Run with appropriate user privileges",
			"Verify file is not locked by another process",
		],
	});
}

/**
 * Creates an invalid file type error
 */
export function createInvalidFileTypeError(
	filePath: string,
	expected: string[],
	actual: string,
): AnalysisError {
	return createError({
		type: "InvalidFileType",
		message: `Invalid file type: expected ${expected.join(" or ")}, got ${actual}`,
		severity: "error",
		filePath,
		source: "validation",
		context: {
			operation: "validate-file-type",
			expected: expected,
			actual: actual,
			metadata: { validation: true },
		},
		suggestions: [
			`Use files with extensions: ${expected.join(", ")}`,
			"Check file format and content",
			"Verify file is not corrupted",
		],
	});
}

/**
 * Creates a parse error
 */
export function createParseError(
	filePath: string,
	message: string,
	location?: SourceLocation,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "ParseError",
		message: `Parse error: ${message}`,
		severity: "error",
		filePath,
		location,
		source: "parser",
		context: {
			operation: "parse",
			input: filePath,
			metadata: {
				parsing: true,
				originalError: originalError?.message,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"Check syntax for errors",
			"Verify file encoding is correct",
			"Check for missing dependencies or imports",
		],
	});
}

/**
 * Creates a syntax error
 */
export function createSyntaxError(
	filePath: string,
	message: string,
	location: SourceLocation,
): AnalysisError {
	return createError({
		type: "SyntaxError",
		message: `Syntax error: ${message}`,
		severity: "error",
		filePath,
		location,
		source: "parser",
		context: {
			operation: "syntax-validation",
			metadata: { syntaxError: true },
		},
		suggestions: [
			"Fix syntax errors in the source code",
			"Check for missing brackets, parentheses, or semicolons",
			"Verify proper nesting and structure",
		],
	});
}

/**
 * Creates a timeout error
 */
export function createTimeoutError(
	operation: string,
	timeoutMs: number,
	filePath?: string,
): AnalysisError {
	return createError({
		type: "TimeoutError",
		message: `Operation timed out after ${timeoutMs}ms: ${operation}`,
		severity: "error",
		filePath,
		source: "engine",
		context: {
			operation,
			expected: `< ${timeoutMs}ms`,
			actual: `> ${timeoutMs}ms`,
			metadata: { timeout: timeoutMs },
		},
		suggestions: [
			"Increase timeout limit in configuration",
			"Optimize the operation for better performance",
			"Check for infinite loops or deadlocks",
		],
	});
}

/**
 * Creates a memory error
 */
export function createMemoryError(
	operation: string,
	memoryUsed: number,
	memoryLimit: number,
): AnalysisError {
	return createError({
		type: "MemoryError",
		message: `Memory limit exceeded: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB used, limit ${(memoryLimit / 1024 / 1024).toFixed(2)}MB`,
		severity: "critical",
		source: "engine",
		context: {
			operation,
			expected: `< ${memoryLimit} bytes`,
			actual: `${memoryUsed} bytes`,
			performanceContext: {
				memoryUsage: memoryUsed,
				elapsedTime: 0,
				resourceUtilization: (memoryUsed / memoryLimit) * 100,
			},
			metadata: { memoryLimit, memoryUsed },
		},
		suggestions: [
			"Increase memory limit in configuration",
			"Process files in smaller batches",
			"Enable streaming or incremental processing",
		],
	});
}

/**
 * Creates a plugin error
 */
export function createPluginError(
	pluginName: string,
	operation: string,
	message: string,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "PluginError",
		message: `Plugin '${pluginName}' error: ${message}`,
		severity: "error",
		source: "plugin",
		context: {
			operation,
			input: pluginName,
			metadata: {
				pluginName,
				originalError: originalError?.message,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"Check plugin configuration",
			"Verify plugin compatibility with current engine version",
			"Update or reinstall the plugin",
		],
	});
}

/**
 * Creates an extraction error
 */
export function createExtractionError(
	extractorName: string,
	filePath: string,
	message: string,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "ExtractionError",
		message: `Extraction failed in '${extractorName}': ${message}`,
		severity: "error",
		filePath,
		source: "extractor",
		context: {
			operation: "extract",
			input: { extractor: extractorName, file: filePath },
			metadata: {
				extractorName,
				originalError: originalError?.message,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"Check if the extractor supports this file type",
			"Verify the file content is valid",
			"Try using a different extractor",
		],
	});
}

/**
 * Creates an interpretation error
 */
export function createInterpretationError(
	interpreterName: string,
	dataType: string,
	message: string,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "InterpretationError",
		message: `Interpretation failed in '${interpreterName}': ${message}`,
		severity: "error",
		source: "interpreter",
		context: {
			operation: "interpret",
			input: { interpreter: interpreterName, dataType },
			metadata: {
				interpreterName,
				dataType,
				originalError: originalError?.message,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"Check if the interpreter supports this data type",
			"Verify the input data format is correct",
			"Check interpreter configuration",
		],
	});
}

/**
 * Creates a cache error
 */
export function createCacheError(
	operation: string,
	message: string,
	key?: string,
): AnalysisError {
	return createError({
		type: "CacheError",
		message: `Cache operation failed: ${message}`,
		severity: "warning",
		source: "cache",
		context: {
			operation: `cache-${operation}`,
			input: key,
			metadata: { cacheKey: key },
		},
		suggestions: [
			"Clear cache and retry",
			"Check cache configuration",
			"Verify disk space is available",
		],
	});
}

/**
 * Creates a configuration error
 */
export function createConfigurationError(
	configKey: string,
	message: string,
	expected?: any,
	actual?: any,
): AnalysisError {
	return createError({
		type: "ConfigurationError",
		message: `Configuration error for '${configKey}': ${message}`,
		severity: "error",
		source: "configuration",
		context: {
			operation: "validate-configuration",
			input: configKey,
			expected,
			actual,
			metadata: { configKey },
		},
		suggestions: [
			"Check configuration file syntax",
			"Verify all required settings are provided",
			"Review configuration documentation",
		],
	});
}

/**
 * Creates a validation error
 */
export function createValidationError(
	field: string,
	value: any,
	constraint: string,
): AnalysisError {
	return createError({
		type: "ValidationError",
		message: `Validation failed for '${field}': ${constraint}`,
		severity: "error",
		source: "validation",
		context: {
			operation: "validate",
			input: { field, value },
			actual: value,
			metadata: { field, constraint },
		},
		suggestions: [
			"Check input value meets requirements",
			"Review validation constraints",
			"Provide a valid value",
		],
	});
}

/**
 * Creates a generic internal error
 */
export function createInternalError(
	operation: string,
	message: string,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "InternalError",
		message: `Internal error in ${operation}: ${message}`,
		severity: "critical",
		source: "engine",
		context: {
			operation,
			metadata: {
				originalError: originalError?.message,
				internal: true,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"This is an internal error - please report it",
			"Try restarting the analysis",
			"Check for software updates",
		],
	});
}

/**
 * Creates an unknown error (for catch-all error handling)
 */
export function createUnknownError(
	filePath: string,
	message: string,
	originalError?: Error,
): AnalysisError {
	return createError({
		type: "InternalError",
		message: `Unknown error: ${message}`,
		severity: "error",
		filePath,
		source: "engine",
		context: {
			operation: "unknown",
			metadata: {
				originalError: originalError?.message,
				unknown: true,
			},
		},
		stack: originalError?.stack,
		suggestions: [
			"Check the input and try again",
			"Report this issue if it persists",
		],
	});
}

/**
 * Creates an engine disabled error
 */
export function createEngineDisabledError(): AnalysisError {
	return createError({
		type: "ConfigurationError",
		message: "Analysis engine is disabled",
		severity: "error",
		source: "engine",
		context: {
			operation: "engine-check",
			metadata: { disabled: true },
		},
		suggestions: ["Enable the analysis engine", "Check engine configuration"],
	});
}

/**
 * Creates an unsupported language error
 */
export function createUnsupportedLanguageError(
	filePath: string,
): AnalysisError {
	return createError({
		type: "InvalidFileType",
		message: `Unsupported language for file: ${filePath}`,
		severity: "error",
		filePath,
		source: "parser",
		context: {
			operation: "language-detection",
			input: filePath,
			metadata: { unsupportedLanguage: true },
		},
		suggestions: [
			"Check if the file type is supported",
			"Add a parser for this language",
			"Verify file extension is correct",
		],
	});
}

/**
 * Creates an error from a parse error object
 */
export function createErrorFromParseError(
	parseError: any,
	filePath: string,
): AnalysisError {
	return createParseError(
		filePath,
		parseError.message || "Parse error occurred",
		parseError.location,
		parseError.originalError,
	);
}

/**
 * Creates an error with full customization
 */
function createError(options: {
	type: ErrorType;
	message: string;
	severity: ErrorSeverity;
	source: ErrorSource;
	context: Omit<ErrorContext, "metadata"> & { metadata: Record<string, any> };
	filePath?: string;
	location?: SourceLocation;
	stack?: string;
	suggestions?: string[];
}): AnalysisError {
	return {
		id: `error-${Date.now()}-${++errorCounter}`,
		type: options.type,
		message: options.message,
		severity: options.severity,
		filePath: options.filePath,
		location: options.location,
		source: options.source,
		context: options.context as ErrorContext,
		timestamp: new Date(),
		stack: options.stack,
		suggestions: options.suggestions || [],
	};
}

// Legacy class export removed - use individual functions instead

/**
 * Type guard to check if an object is an AnalysisError
 */
export function isAnalysisError(obj: any): obj is AnalysisError {
	return (
		obj &&
		typeof obj === "object" &&
		typeof obj.type === "string" &&
		typeof obj.message === "string" &&
		typeof obj.severity === "string" &&
		typeof obj.source === "string" &&
		typeof obj.context === "object" &&
		obj.timestamp instanceof Date &&
		typeof obj.id === "string"
	);
}

/**
 * Error aggregation and analysis utilities
 */
/**
 * Groups errors by type
 */
export function groupErrorsByType(
	errors: AnalysisError[],
): Map<ErrorType, AnalysisError[]> {
	const groups = new Map<ErrorType, AnalysisError[]>();

	for (const error of errors) {
		const existing = groups.get(error.type) || [];
		existing.push(error);
		groups.set(error.type, existing);
	}

	return groups;
}

/**
 * Groups errors by severity
 */
export function groupErrorsBySeverity(
	errors: AnalysisError[],
): Map<ErrorSeverity, AnalysisError[]> {
	const groups = new Map<ErrorSeverity, AnalysisError[]>();

	for (const error of errors) {
		const existing = groups.get(error.severity) || [];
		existing.push(error);
		groups.set(error.severity, existing);
	}

	return groups;
}

/**
 * Gets the highest severity level present
 */
export function getMaxErrorSeverity(errors: AnalysisError[]): ErrorSeverity {
	const severityOrder: ErrorSeverity[] = [
		"critical",
		"error",
		"warning",
		"info",
	];

	for (const severity of severityOrder) {
		if (errors.some((error) => error.severity === severity)) {
			return severity;
		}
	}

	return "info";
}

/**
 * Filters errors by criteria
 */
export function filterErrors(
	errors: AnalysisError[],
	criteria: {
		type?: ErrorType[];
		severity?: ErrorSeverity[];
		source?: ErrorSource[];
		filePath?: string;
	},
): AnalysisError[] {
	return errors.filter((error) => {
		if (criteria.type && !criteria.type.includes(error.type)) {
			return false;
		}
		if (criteria.severity && !criteria.severity.includes(error.severity)) {
			return false;
		}
		if (criteria.source && !criteria.source.includes(error.source)) {
			return false;
		}
		if (criteria.filePath && error.filePath !== criteria.filePath) {
			return false;
		}
		return true;
	});
}

/**
 * Formats errors for display
 */
export function formatErrors(
	errors: AnalysisError[],
	format: "summary" | "detailed" | "json" = "summary",
): string {
	if (errors.length === 0) {
		return "No errors";
	}

	switch (format) {
		case "summary":
			return errors
				.map(
					(error) =>
						`[${error.severity.toUpperCase()}] ${error.type}: ${error.message}` +
						(error.filePath
							? ` (${error.filePath}` +
								(error.location
									? `:${error.location.line}:${error.location.column}`
									: "") +
								")"
							: ""),
				)
				.join("\n");

		case "detailed":
			return errors
				.map((error) => {
					let result = `[${error.severity.toUpperCase()}] ${error.type}: ${error.message}\n`;
					if (error.filePath) {
						result += `  File: ${error.filePath}\n`;
					}
					if (error.location) {
						result += `  Location: line ${error.location.line}, column ${error.location.column}\n`;
					}
					if (error.suggestions && error.suggestions.length > 0) {
						result += `  Suggestions:\n${error.suggestions.map((s) => `    - ${s}`).join("\n")}\n`;
					}
					return result;
				})
				.join("\n");

		case "json":
			return JSON.stringify(errors, null, 2);

		default:
			return formatErrors(errors, "summary");
	}
}

/**
 * Checks if errors contain any blocking issues
 */
export function hasBlockingErrors(errors: AnalysisError[]): boolean {
	return errors.some(
		(error) => error.severity === "critical" || error.severity === "error",
	);
}

/**
 * Extracts unique suggestions from all errors
 */
export function extractErrorSuggestions(errors: AnalysisError[]): string[] {
	const suggestions = new Set<string>();

	for (const error of errors) {
		if (error.suggestions) {
			for (const suggestion of error.suggestions) {
				suggestions.add(suggestion);
			}
		}
	}

	return Array.from(suggestions);
}

// Legacy class export removed - use individual functions instead
