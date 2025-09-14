/**
 * Main analysis engine interface
 * Orchestrates parsing, extraction, and interpretation operations
 */

import type { IDataExtractor } from "../extractors/IDataExtractor";
import type { IDataInterpreter } from "../interpreters/IDataInterpreter";
import type { AnalysisConfig } from "../models/AnalysisConfig";
import type { AnalysisResult } from "../models/AnalysisResult";
import type { CacheStats } from "../models/CacheEntry";

export interface IAnalysisEngine {
	/**
	 * Analyzes a single file
	 * @param filePath Path to the file to analyze
	 * @param config Optional analysis configuration
	 * @returns Promise resolving to analysis result
	 */
	analyzeFile(
		filePath: string,
		config?: AnalysisConfig,
	): Promise<AnalysisResult>;

	/**
	 * Analyzes multiple files in batch
	 * @param filePaths Array of file paths to analyze
	 * @param config Optional analysis configuration
	 * @returns Promise resolving to array of analysis results
	 */
	analyzeBatch(
		filePaths: string[],
		config?: AnalysisConfig,
	): Promise<AnalysisResult[]>;

	/**
	 * Analyzes a file from content string instead of file path
	 * @param content File content as string
	 * @param filePath Virtual file path for context
	 * @param config Optional analysis configuration
	 * @returns Promise resolving to analysis result
	 */
	analyzeContent(
		content: string,
		filePath: string,
		config?: AnalysisConfig,
	): Promise<AnalysisResult>;

	/**
	 * Registers a data extractor plugin
	 * @param name Unique name for the extractor
	 * @param extractor The extractor instance
	 */
	registerExtractor<T>(name: string, extractor: IDataExtractor<T>): void;

	/**
	 * Registers a data interpreter plugin
	 * @param name Unique name for the interpreter
	 * @param interpreter The interpreter instance
	 */
	registerInterpreter<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): void;

	/**
	 * Unregisters an extractor
	 * @param name Name of the extractor to remove
	 * @returns True if extractor was removed, false if not found
	 */
	unregisterExtractor(name: string): boolean;

	/**
	 * Unregisters an interpreter
	 * @param name Name of the interpreter to remove
	 * @returns True if interpreter was removed, false if not found
	 */
	unregisterInterpreter(name: string): boolean;

	/**
	 * Gets a list of all registered extractors
	 * @returns Map of extractor names to instances
	 */
	getRegisteredExtractors(): Map<string, IDataExtractor<any>>;

	/**
	 * Gets a list of all registered interpreters
	 * @returns Map of interpreter names to instances
	 */
	getRegisteredInterpreters(): Map<string, IDataInterpreter<any, any>>;

	/**
	 * Clears the analysis cache
	 */
	clearCache(): void;

	/**
	 * Gets cache performance statistics
	 * @returns Cache statistics
	 */
	getCacheStats(): CacheStats;

	/**
	 * Validates cache integrity and repairs if needed
	 * @returns Validation and repair results
	 */
	validateCache(): Promise<CacheValidationResult>;

	/**
	 * Warms up the cache with frequently used files
	 * @param filePaths Array of file paths to pre-analyze
	 * @returns Promise resolving to warmup results
	 */
	warmupCache(filePaths: string[]): Promise<CacheWarmupResult>;

	/**
	 * Sets the analysis configuration as default for this engine
	 * @param config Default configuration to use
	 */
	setDefaultConfig(config: AnalysisConfig): void;

	/**
	 * Gets the current default configuration
	 * @returns Current default configuration
	 */
	getDefaultConfig(): AnalysisConfig;

	/**
	 * Enables or disables the analysis engine
	 * @param enabled Whether the engine should be enabled
	 */
	setEnabled(enabled: boolean): void;

	/**
	 * Checks if the analysis engine is currently enabled
	 * @returns True if enabled, false otherwise
	 */
	isEnabled(): boolean;

	/**
	 * Gets engine performance metrics
	 * @returns Engine performance statistics
	 */
	getPerformanceMetrics(): EnginePerformanceMetrics;

	/**
	 * Resets performance metrics
	 */
	resetPerformanceMetrics(): void;

	/**
	 * Shuts down the engine and cleans up resources
	 */
	shutdown(): Promise<void>;
}

export interface CacheValidationResult {
	/** Whether cache is valid */
	isValid: boolean;

	/** Number of corrupted entries found */
	corruptedEntries: number;

	/** Number of entries repaired */
	repairedEntries: number;

	/** Number of entries removed */
	removedEntries: number;

	/** Validation error messages */
	errors: string[];

	/** Time taken for validation in milliseconds */
	validationTime: number;
}

export interface CacheWarmupResult {
	/** Number of files processed */
	filesProcessed: number;

	/** Number of files successfully cached */
	filesCached: number;

	/** Number of files that failed to cache */
	filesFailed: number;

	/** Total time taken for warmup in milliseconds */
	totalTime: number;

	/** Average time per file in milliseconds */
	averageTimePerFile: number;

	/** Files that failed with error messages */
	failures: Array<{ filePath: string; error: string }>;
}

export interface EnginePerformanceMetrics {
	/** Total number of analyses performed */
	totalAnalyses: number;

	/** Total number of successful analyses */
	successfulAnalyses: number;

	/** Total number of failed analyses */
	failedAnalyses: number;

	/** Average analysis time in milliseconds */
	averageAnalysisTime: number;

	/** Peak memory usage in bytes */
	peakMemoryUsage: number;

	/** Current memory usage in bytes */
	currentMemoryUsage: number;

	/** Cache hit rate */
	cacheHitRate: number;

	/** Total time saved through caching in milliseconds */
	timeSavedByCache: number;

	/** Number of files processed */
	filesProcessed: number;

	/** Total data processed in bytes */
	totalDataProcessed: number;

	/** Engine uptime in milliseconds */
	uptime: number;

	/** Performance by language */
	languageMetrics: Map<string, LanguagePerformanceMetrics>;

	/** Performance by extractor */
	extractorMetrics: Map<string, ExtractorPerformanceMetrics>;

	/** Performance by interpreter */
	interpreterMetrics: Map<string, InterpreterPerformanceMetrics>;
}

export interface LanguagePerformanceMetrics {
	/** Language name */
	language: string;

	/** Number of files analyzed */
	filesAnalyzed: number;

	/** Average analysis time */
	averageTime: number;

	/** Success rate */
	successRate: number;

	/** Average file size processed */
	averageFileSize: number;
}

export interface ExtractorPerformanceMetrics {
	/** Extractor name */
	name: string;

	/** Number of executions */
	executions: number;

	/** Average execution time */
	averageTime: number;

	/** Success rate */
	successRate: number;

	/** Average data size extracted */
	averageDataSize: number;
}

export interface InterpreterPerformanceMetrics {
	/** Interpreter name */
	name: string;

	/** Number of executions */
	executions: number;

	/** Average execution time */
	averageTime: number;

	/** Success rate */
	successRate: number;

	/** Average input data size */
	averageInputSize: number;

	/** Average output data size */
	averageOutputSize: number;
}

/**
 * Analysis engine events for monitoring and integration
 */
export interface IAnalysisEngineEvents {
	/** Emitted when analysis starts */
	onAnalysisStart?(filePath: string, config: AnalysisConfig): void;

	/** Emitted when analysis completes successfully */
	onAnalysisComplete?(result: AnalysisResult): void;

	/** Emitted when analysis fails */
	onAnalysisError?(filePath: string, error: Error): void;

	/** Emitted when cache hit occurs */
	onCacheHit?(filePath: string, cacheKey: string): void;

	/** Emitted when cache miss occurs */
	onCacheMiss?(filePath: string, cacheKey: string): void;

	/** Emitted when extractor executes */
	onExtractorExecute?(extractorName: string, filePath: string): void;

	/** Emitted when interpreter executes */
	onInterpreterExecute?(interpreterName: string, dataType: string): void;

	/** Emitted when performance threshold is exceeded */
	onPerformanceThreshold?(
		metric: string,
		value: number,
		threshold: number,
	): void;

	/** Emitted when memory usage is high */
	onHighMemoryUsage?(currentUsage: number, limit: number): void;
}

/**
 * Factory interface for creating analysis engines
 */
export interface IAnalysisEngineFactory {
	/**
	 * Creates a new analysis engine instance
	 * @param config Initial configuration
	 * @param events Optional event handlers
	 * @returns New analysis engine instance
	 */
	create(
		config?: AnalysisConfig,
		events?: IAnalysisEngineEvents,
	): IAnalysisEngine;

	/**
	 * Creates an analysis engine with predefined configuration preset
	 * @param preset Configuration preset name
	 * @param events Optional event handlers
	 * @returns New analysis engine instance
	 */
	createWithPreset(
		preset:
			| "fast"
			| "comprehensive"
			| "development"
			| "production"
			| "security",
		events?: IAnalysisEngineEvents,
	): IAnalysisEngine;

	/**
	 * Gets available configuration presets
	 * @returns List of available preset names
	 */
	getAvailablePresets(): string[];
}

/**
 * Analysis engine builder for fluent configuration
 */
export interface IAnalysisEngineBuilder {
	/**
	 * Sets the configuration
	 */
	withConfig(config: AnalysisConfig): IAnalysisEngineBuilder;

	/**
	 * Adds an extractor
	 */
	withExtractor<T>(
		name: string,
		extractor: IDataExtractor<T>,
	): IAnalysisEngineBuilder;

	/**
	 * Adds an interpreter
	 */
	withInterpreter<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): IAnalysisEngineBuilder;

	/**
	 * Sets event handlers
	 */
	withEvents(events: IAnalysisEngineEvents): IAnalysisEngineBuilder;

	/**
	 * Enables cache
	 */
	withCache(enabled: boolean): IAnalysisEngineBuilder;

	/**
	 * Sets cache size
	 */
	withCacheSize(maxSize: number): IAnalysisEngineBuilder;

	/**
	 * Builds the analysis engine
	 */
	build(): IAnalysisEngine;
}
