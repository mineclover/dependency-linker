/**
 * Analysis Result Model
 * Represents the complete result of a code analysis operation
 * Consolidates parsed AST, extracted data, interpreted results, and metadata
 */

import type { AnalysisError } from "./AnalysisError";
import type { DependencyInfo } from "./DependencyInfo";
import type { ExportInfo } from "./ExportInfo";
import type { ImportInfo } from "./ImportInfo";
import type { PerformanceMetrics } from "./PerformanceMetrics";

// Comprehensive analysis result interface
export interface AnalysisResult {
	/** Absolute path to the analyzed file */
	filePath: string;

	/** Detected or specified programming language */
	language: string;

	/** Raw data extracted from the AST by registered extractors */
	extractedData: Record<string, any>;

	/** Processed analysis results from registered interpreters */
	interpretedData: Record<string, any>;

	/** Performance metrics for this analysis operation */
	performanceMetrics: PerformanceMetrics;

	/** Any errors encountered during analysis */
	errors: AnalysisError[];

	/** Analysis metadata and context */
	metadata: AnalysisMetadata;

	/** Cache metadata (optional) */
	cacheMetadata?: {
		cached: boolean;
		key: string;
		timestamp: Date;
		ttl: number;
	};
}

export interface AnalysisMetadata {
	/** Timestamp when analysis was performed */
	timestamp: Date;

	/** Version of the analysis engine used */
	version: string;

	/** Analysis configuration used */
	config: any;

	/** Whether this result came from cache (optional for compatibility) */
	fromCache?: boolean;

	/** List of extractors that were executed (optional for compatibility) */
	extractorsUsed?: string[];

	/** List of interpreters that were executed (optional for compatibility) */
	interpretersUsed?: string[];

	/** File size in bytes (optional for compatibility) */
	fileSize?: number;

	/** File last modified timestamp (optional for compatibility) */
	lastModified?: Date;
}

export interface AnalysisConfiguration {
	/** Target language (if not auto-detected) */
	language?: string;

	/** Specific extractors to run (if not all) */
	extractors?: string[];

	/** Specific interpreters to run (if not all) */
	interpreters?: string[];

	/** Whether to use cached results */
	useCache?: boolean;

	/** Maximum cache size */
	maxCacheSize?: number;

	/** Additional options for extractors */
	extractorOptions?: Record<string, any>;

	/** Additional options for interpreters */
	interpreterOptions?: Record<string, any>;

	/** Analysis depth level (1-5, where 5 is most comprehensive) */
	depth?: number;

	/** Whether to include detailed debugging information */
	includeDebugInfo?: boolean;
}

/**
 * Creates a new AnalysisResult with default values
 */
export function createAnalysisResult(filePath: string, language: string): AnalysisResult {
	return {
		filePath,
		language,
		extractedData: {},
		interpretedData: {},
		performanceMetrics: {
			parseTime: 0,
			extractionTime: 0,
			interpretationTime: 0,
			totalTime: 0,
			memoryUsage: 0,
		},
		errors: [],
		metadata: {
			timestamp: new Date(),
			version: "2.0.0",
			config: {},
			extractorsUsed: [],
			interpretersUsed: [],
			fromCache: false,
			fileSize: 0,
			lastModified: new Date(),
		},
	};
}

/**
 * Creates an AnalysisResult representing a failed analysis
 */
export function createErrorAnalysisResult(filePath: string, error: AnalysisError): AnalysisResult {
	const result = createAnalysisResult(filePath, "unknown");
	result.errors.push(error);
	return result;
}

// Legacy class export for backward compatibility - will be deprecated
/** @deprecated Use individual functions instead of AnalysisResultFactory class */
export class AnalysisResultFactory {
	static create = createAnalysisResult;
	static createError = createErrorAnalysisResult;
}

/**
 * Checks if an analysis was successful (no errors)
 */
export function isSuccessful(result: AnalysisResult): boolean {
	return result.errors.length === 0;
}

/**
 * Gets all errors of a specific type
 */
export function getErrorsByType(
	result: AnalysisResult,
	errorType: string,
): AnalysisError[] {
	return result.errors.filter((error) => error.type === errorType);
}

/**
 * Formats the result for display
 */
export function formatAnalysisResult(
	result: AnalysisResult,
	format: "json" | "summary" | "detailed" = "summary",
): string {
	switch (format) {
		case "json":
			return JSON.stringify(result, null, 2);
		case "summary":
			return `Analysis of ${result.filePath}:
Language: ${result.language}
Time: ${result.performanceMetrics.totalTime}ms
Errors: ${result.errors.length}
From Cache: ${result.metadata.fromCache}`;
		case "detailed":
			return `=== Analysis Result ===
File: ${result.filePath}
Language: ${result.language}
Total Time: ${result.performanceMetrics.totalTime}ms
Extractors: ${result.metadata.extractorsUsed?.join(", ") || "none"}
Interpreters: ${result.metadata.interpretersUsed?.join(", ") || "none"}
Errors: ${result.errors.length}`;
		default:
			return formatAnalysisResult(result, "summary");
	}
}

/**
 * Validates that an AnalysisResult has the required structure
 */
export function validateAnalysisResult(result: any): result is AnalysisResult {
	if (!result || typeof result !== "object") {
		return false;
	}

	const requiredFields = [
		"filePath",
		"language",
		"extractedData",
		"interpretedData",
		"performanceMetrics",
		"errors",
		"metadata",
	];

	for (const field of requiredFields) {
		if (!(field in result)) {
			return false;
		}
	}

	return (
		typeof result.filePath === "string" &&
		typeof result.language === "string" &&
		typeof result.extractedData === "object" &&
		typeof result.interpretedData === "object" &&
		Array.isArray(result.errors)
	);
}

// Legacy class export for backward compatibility - will be deprecated
/** @deprecated Use individual functions instead of AnalysisResultUtils class */
export class AnalysisResultUtils {
	static isSuccessful = isSuccessful;
	static getErrorsByType = getErrorsByType;
	static format = formatAnalysisResult;
	static validate = validateAnalysisResult;
}

/**
 * Convenience exports for backwards compatibility with tests
 */

// Re-export AnalysisError type from its module
export type { AnalysisError } from "./AnalysisError";

// Create an exception class for error handling
export class AnalysisException extends Error {
	constructor(message: string, public analysisError: AnalysisError) {
		super(message);
		this.name = 'AnalysisException';
	}
}

// Convenience functions expected by tests
export function createSuccessResult(filePath: string, language: string): AnalysisResult {
	return createAnalysisResult(filePath, language);
}

export function createErrorResult(filePath: string, error: AnalysisError): AnalysisResult {
	return createErrorAnalysisResult(filePath, error);
}

export function createFileNotFoundError(filePath: string, message?: string): AnalysisResult {
	const error: AnalysisError = {
		type: "FileNotFound",
		message: message || `File not found: ${filePath}`,
		severity: "error",
		source: "parser",
		context: {
			operation: "file_access",
			details: { filePath }
		},
		timestamp: new Date(),
		id: `fnf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	};
	return createErrorResult(filePath, error);
}

export function createInvalidFileTypeError(filePath: string, message?: string): AnalysisResult {
	const error: AnalysisError = {
		type: "InvalidFileType",
		message: message || `Invalid file type: ${filePath}`,
		severity: "error",
		source: "parser",
		context: {
			operation: "file_validation",
			details: { filePath }
		},
		timestamp: new Date(),
		id: `ift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	};
	return createErrorResult(filePath, error);
}

export function createPermissionDeniedError(filePath: string, message?: string): AnalysisResult {
	const error: AnalysisError = {
		type: "FileAccessDenied",
		message: message || `Permission denied: ${filePath}`,
		severity: "error",
		source: "parser",
		context: {
			operation: "file_access",
			details: { filePath }
		},
		timestamp: new Date(),
		id: `pad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	};
	return createErrorResult(filePath, error);
}

export function createParseError(filePath: string, message?: string): AnalysisResult {
	const error: AnalysisError = {
		type: "ParseError",
		message: message || `Parse error in: ${filePath}`,
		severity: "error",
		source: "parser",
		context: {
			operation: "parsing",
			details: { filePath }
		},
		timestamp: new Date(),
		id: `pe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	};
	return createErrorResult(filePath, error);
}

export function createTimeoutError(filePath: string, message?: string): AnalysisResult {
	const error: AnalysisError = {
		type: "TimeoutError",
		message: message || `Timeout while processing: ${filePath}`,
		severity: "error",
		source: "parser",
		context: {
			operation: "parsing",
			details: { filePath }
		},
		timestamp: new Date(),
		id: `to-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	};
	return createErrorResult(filePath, error);
}

export function isValidAnalysisResult(result: any): result is AnalysisResult {
	return validateAnalysisResult(result);
}
