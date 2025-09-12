/**
 * API Layer Types for TypeScript File Analyzer
 * Defines all API-specific types, options, and request/response structures
 */

import type { AnalysisResult } from "../models/AnalysisResult";
import type { OutputFormat } from "../models/FileAnalysisRequest";

/**
 * Configuration options for single file analysis
 */
export interface AnalysisOptions {
	/** Output format for the analysis result */
	format?: OutputFormat;

	/** Whether to include source location information */
	includeSources?: boolean;

	/** Timeout for parsing operations in milliseconds */
	parseTimeout?: number;

	/** Whether to include type-only imports in the analysis */
	includeTypeImports?: boolean;

	/** Whether to classify dependencies (external, internal, relative) */
	classifyDependencies?: boolean;
}

/**
 * Configuration options for batch file analysis
 */
export interface BatchAnalysisOptions extends AnalysisOptions {
	/** Maximum number of files to process concurrently */
	concurrency?: number;

	/** Whether to fail fast on first error or collect all errors */
	failFast?: boolean;

	/** Progress callback function */
	onProgress?: (completed: number, total: number) => void;

	/** Error callback for individual file failures */
	onFileError?: (filePath: string, error: Error) => void;

	/** Completion callback for individual files */
	onFileComplete?: (filePath: string, result: AnalysisResult) => void;

	/** Whether to continue processing on individual file errors */
	continueOnError?: boolean;
}

/**
 * Configuration options for source code analysis
 */
export interface SourceAnalysisOptions extends AnalysisOptions {
	/** Original file path context for relative imports */
	contextPath?: string;

	/** Source code language variant */
	variant?: "typescript" | "tsx" | "javascript";
}

/**
 * Configuration options for the analyzer instance
 */
export interface AnalyzerOptions {
	/** Default timeout for all parsing operations */
	defaultTimeout?: number;

	/** Whether to enable internal caching */
	enableCache?: boolean;

	/** Cache size limit (number of entries) */
	cacheSize?: number;

	/** Log level for internal operations */
	logLevel?: LogLevel;

	/** Custom logger instance */
	logger?: Logger;
}

/**
 * Request object for file analysis operations
 */
export interface FileAnalysisRequest {
	/** Path to the file to analyze */
	filePath: string;

	/** Analysis options */
	options?: AnalysisOptions;
}

/**
 * Request object for batch analysis operations
 */
export interface BatchAnalysisRequest {
	/** Array of file paths to analyze */
	filePaths: string[];

	/** Batch analysis options */
	options?: BatchAnalysisOptions;
}

/**
 * Request object for directory analysis operations
 */
export interface DirectoryAnalysisRequest {
	/** Directory path to analyze */
	directoryPath: string;

	/** File patterns to include (glob patterns) */
	include?: string[];

	/** File patterns to exclude (glob patterns) */
	exclude?: string[];

	/** Whether to recursively scan subdirectories */
	recursive?: boolean;

	/** Analysis options */
	options?: BatchAnalysisOptions;
}

/**
 * Result object for batch analysis operations
 */
export interface BatchResult {
	/** Individual analysis results */
	results: AnalysisResult[];

	/** Summary statistics */
	summary: BatchSummary;

	/** Any errors that occurred during batch processing */
	errors: BatchErrorInfo[];

	/** Total processing time in milliseconds */
	totalTime: number;
}

/**
 * Summary statistics for batch analysis
 */
export interface BatchSummary {
	/** Total number of files processed */
	totalFiles: number;

	/** Number of files successfully analyzed */
	successfulFiles: number;

	/** Number of files that failed analysis */
	failedFiles: number;

	/** Total dependencies found across all files */
	totalDependencies: number;

	/** Total imports found across all files */
	totalImports: number;

	/** Total exports found across all files */
	totalExports: number;

	/** Average processing time per file */
	averageTime: number;
}

/**
 * Error information for batch processing
 * Note: BatchError class is defined in errors.ts
 */
export interface BatchErrorInfo {
	/** File path where the error occurred */
	filePath: string;

	/** Error code */
	code: string;

	/** Error message */
	message: string;

	/** Additional error details */
	details?: any;
}

/**
 * Progress information for long-running operations
 */
export interface ProgressInfo {
	/** Number of completed operations */
	completed: number;

	/** Total number of operations */
	total: number;

	/** Current operation description */
	currentOperation?: string;

	/** Estimated time remaining in milliseconds */
	estimatedTimeRemaining?: number;
}

/**
 * Configuration options for directory scanning
 */
export interface DirectoryOptions {
	/** File extensions to include */
	extensions?: string[];

	/** Maximum directory depth to scan */
	maxDepth?: number;

	/** Whether to follow symbolic links */
	followSymlinks?: boolean;

	/** Ignore patterns (gitignore-style) */
	ignorePatterns?: string[];
}

/**
 * Analyzer instance state information
 */
export interface AnalyzerState {
	/** Whether the analyzer is initialized */
	isInitialized: boolean;

	/** Current configuration */
	config: AnalyzerOptions;

	/** Cache statistics */
	cacheStats?: CacheStats;

	/** Performance metrics */
	metrics?: PerformanceMetrics;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	/** Number of cache entries */
	entryCount: number;

	/** Cache hit rate (0-1) */
	hitRate: number;

	/** Total cache hits */
	totalHits: number;

	/** Total cache misses */
	totalMisses: number;

	/** Memory usage in bytes */
	memoryUsage: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
	/** Total files analyzed */
	totalFilesAnalyzed: number;

	/** Average analysis time per file */
	averageAnalysisTime: number;

	/** Total analysis time */
	totalAnalysisTime: number;

	/** Peak memory usage */
	peakMemoryUsage: number;
}

/**
 * Log levels for internal logging
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

/**
 * Logger interface for custom logging implementations
 */
export interface Logger {
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
}

/**
 * Events emitted by the analyzer
 */
export enum AnalyzerEvent {
	ANALYSIS_START = "analysisStart",
	ANALYSIS_COMPLETE = "analysisComplete",
	ANALYSIS_ERROR = "analysisError",
	BATCH_START = "batchStart",
	BATCH_PROGRESS = "batchProgress",
	BATCH_COMPLETE = "batchComplete",
	CACHE_HIT = "cacheHit",
	CACHE_MISS = "cacheMiss",
}

/**
 * Event data for analysis events
 */
export interface AnalysisEvent {
	/** Event type */
	type: AnalyzerEvent;

	/** File path being analyzed */
	filePath?: string;

	/** Analysis result (for completion events) */
	result?: AnalysisResult;

	/** Error information (for error events) */
	error?: Error;

	/** Progress information (for progress events) */
	progress?: ProgressInfo;

	/** Timestamp when event occurred */
	timestamp: Date;
}

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event emitter interface for analyzer events
 */
export interface EventEmitter {
	on(event: AnalyzerEvent, handler: EventHandler): void;
	off(event: AnalyzerEvent, handler: EventHandler): void;
	emit(event: AnalyzerEvent, data: any): void;
	removeAllListeners(event?: AnalyzerEvent): void;
}

/**
 * Cancellation token for long-running operations
 */
export interface CancellationToken {
	/** Whether cancellation has been requested */
	isCancellationRequested: boolean;

	/** Promise that resolves when cancellation is requested */
	cancellationPromise: Promise<void>;

	/** Register cancellation callback */
	onCancellationRequested(callback: () => void): void;

	/** Request cancellation */
	cancel(): void;

	/** Throw if cancellation has been requested */
	throwIfCancellationRequested(): void;
}
