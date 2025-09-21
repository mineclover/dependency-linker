/**
 * Main TypeScript Analyzer API Class
 * Primary entry point for all analysis operations with dependency injection support
 * UPDATED (T046): Now uses the new AnalysisEngine internally while maintaining backward compatibility
 */

import {
	getDependencies,
	getError,
	getExports,
	getImports,
	isSuccessful,
} from "../lib/AnalysisResultHelper";
import {
	type AnalysisConfig,
	createDefaultAnalysisConfig,
} from "../models/AnalysisConfig";
import type { AnalysisResult } from "../models/AnalysisResult";
import type { ExportInfo } from "../models/ExportInfo";
import type { ImportInfo } from "../models/ImportInfo";
import { AnalysisEngine } from "../services/AnalysisEngine";
import { createLogger } from "../utils/logger";

import { ConfigurationError, ErrorUtils, ParseError } from "./errors";

import { DebugHelper, DiagnosticTool, errorReporter } from "./errors/index";
import {
	type AnalysisOptions,
	AnalyzerEvent,
	type AnalyzerOptions,
	type AnalyzerState,
	type BatchAnalysisOptions,
	type BatchAnalysisRequest,
	type BatchErrorInfo,
	type BatchResult,
	type BatchSummary,
	type CacheStats,
	type EventEmitter,
	type EventHandler,
	type Logger,
	LogLevel,
	type PerformanceMetrics,
	type ProgressInfo,
	type SourceAnalysisOptions,
} from "./types";

// Simple ValidationResult interface
interface ValidationResult {
	canAnalyze: boolean;
	errors: string[];
}

/**
 * Main TypeScript Analyzer class that orchestrates all analysis operations
 * Provides a high-level API with dependency injection and comprehensive error handling
 * UPDATED (T046): Now uses AnalysisEngine internally for improved architecture
 */
export class TypeScriptAnalyzer {
	private logger: Logger;
	private config: AnalyzerOptions;
	private eventEmitter: SimpleEventEmitter;
	private cache: Map<string, any>;
	private isInitialized: boolean;
	private metrics: PerformanceMetrics;

	// New engine for improved functionality
	private analysisEngine: AnalysisEngine;
	private useNewEngine: boolean = true;

	/**
	 * Create a new TypeScript Analyzer instance
	 * @param options Configuration options
	 * @param dependencies Optional dependency injection
	 */
	constructor(
		options: AnalyzerOptions = {},
		dependencies?: {
			logger?: Logger;
		},
	) {
		this.config = {
			defaultTimeout: 30000,
			enableCache: true,
			cacheSize: 1000,
			logLevel: LogLevel.INFO,
			...options,
		};

		// Initialize logger
		this.logger =
			dependencies?.logger ||
			this.config.logger ||
			createLogger("TypeScriptAnalyzer");

		// Initialize internal state
		this.eventEmitter = new SimpleEventEmitter();
		this.cache = new Map();
		this.isInitialized = true;

		this.metrics = {
			totalFilesAnalyzed: 0,
			averageAnalysisTime: 0,
			totalAnalysisTime: 0,
			peakMemoryUsage: 0,
		};

		// Initialize new AnalysisEngine (T046)
		const engineConfig = createDefaultAnalysisConfig();
		engineConfig.timeout = this.config.defaultTimeout;
		engineConfig.useCache = this.config.enableCache;

		this.analysisEngine = new AnalysisEngine(engineConfig);

		// Allow fallback to legacy implementation if needed
		this.useNewEngine = (options as any).useNewEngine !== false;

		this.logger.info("TypeScript Analyzer initialized", {
			enableCache: this.config.enableCache,
			cacheSize: this.config.cacheSize,
			defaultTimeout: this.config.defaultTimeout,
			useNewEngine: this.useNewEngine,
		});
	}

	/**
	 * Analyze a single TypeScript file
	 * @param filePath Path to the TypeScript file
	 * @param options Analysis options
	 * @returns Promise resolving to analysis result
	 */
	async analyzeFile(
		filePath: string,
		options?: AnalysisOptions,
	): Promise<AnalysisResult> {
		this.addDeprecationWarning("analyzeFile"); // T047
		this.throwIfNotInitialized();

		const startTime = Date.now();

		try {
			this.emitEvent(AnalyzerEvent.ANALYSIS_START, { filePath });

			let result: AnalysisResult;

			if (this.useNewEngine) {
				// Use new AnalysisEngine (T046)
				const engineConfig = this.convertOptionsToConfig(options);
				const newResult = await this.analysisEngine.analyzeFile(
					filePath,
					engineConfig,
				);

				// Convert new result to legacy format for backward compatibility
				result = newResult;
			} else {
				// Fallback to legacy implementation
				const cacheKey = this.getCacheKey(filePath, options);

				// Check cache first
				if (this.config.enableCache && this.cache.has(cacheKey)) {
					const cached = this.cache.get(cacheKey);
					if (cached && !this.isCacheEntryExpired(cached)) {
						this.emitEvent(AnalyzerEvent.CACHE_HIT, { filePath, cacheKey });
						this.logger.debug(`Cache hit for file: ${filePath}`);
						return cached.result;
					} else {
						this.cache.delete(cacheKey);
					}
				}

				this.emitEvent(AnalyzerEvent.CACHE_MISS, { filePath, cacheKey });

				// Fallback to AnalysisEngine for legacy implementation too
				const engineConfig = this.convertOptionsToConfig(options);
				const newResult = await this.analysisEngine.analyzeFile(
					filePath,
					engineConfig,
				);

				// Convert new result to legacy format for backward compatibility
				result = newResult;

				// Cache successful result
				if (this.config.enableCache && isSuccessful(result)) {
					this.cacheResult(cacheKey, result);
				}
			}

			// Update metrics
			const analysisTime = Date.now() - startTime;
			this.updateMetrics(analysisTime);

			this.emitEvent(AnalyzerEvent.ANALYSIS_COMPLETE, { filePath, result });
			this.logger.debug(
				`File analysis completed: ${filePath} (${analysisTime}ms)`,
			);

			return result;
		} catch (error) {
			const analysisError = ErrorUtils.fromUnknown(error, "analyzeFile");
			this.emitEvent(AnalyzerEvent.ANALYSIS_ERROR, {
				filePath,
				error: analysisError,
			});
			this.logger.error(`File analysis failed: ${filePath}`, error);
			throw analysisError;
		}
	}

	/**
	 * Analyze multiple TypeScript files
	 * @param filePaths Array of file paths
	 * @param options Batch analysis options
	 * @returns Promise resolving to batch results
	 */
	async analyzeFiles(
		filePaths: string[],
		options?: BatchAnalysisOptions,
	): Promise<BatchResult> {
		this.addDeprecationWarning("analyzeFiles"); // T047
		this.throwIfNotInitialized();

		const request: BatchAnalysisRequest = {
			filePaths,
			options: options || {},
		};

		return this.analyzeBatch(request);
	}

	/**
	 * Analyze TypeScript source code directly
	 * @param source TypeScript source code
	 * @param options Source analysis options
	 * @returns Promise resolving to analysis result
	 */
	async analyzeSource(
		source: string,
		options?: SourceAnalysisOptions,
	): Promise<AnalysisResult> {
		this.addDeprecationWarning("analyzeSource"); // T047
		this.throwIfNotInitialized();

		const startTime = Date.now();
		const contextPath = options?.contextPath || "<source>";

		try {
			this.emitEvent(AnalyzerEvent.ANALYSIS_START, { filePath: contextPath });

			// Use AnalysisEngine for source analysis
			const engineConfig = this.convertOptionsToConfig({
				includeSources: options?.includeSources,
				includeTypeImports: options?.includeTypeImports,
				parseTimeout: options?.parseTimeout,
			});

			const newResult = await this.analysisEngine.analyzeContent(
				source,
				contextPath,
				engineConfig,
			);

			// Convert new result to legacy format for backward compatibility
			const result = newResult;

			const analysisTime = Date.now() - startTime;
			this.updateMetrics(analysisTime);
			this.emitEvent(AnalyzerEvent.ANALYSIS_COMPLETE, {
				filePath: contextPath,
				result,
			});

			return result;
		} catch (error) {
			const analysisError = ErrorUtils.fromUnknown(error, "analyzeSource");
			this.emitEvent(AnalyzerEvent.ANALYSIS_ERROR, {
				filePath: contextPath,
				error: analysisError,
			});
			throw analysisError;
		}
	}

	/**
	 * Extract only dependency information from a file
	 * @param filePath Path to the TypeScript file
	 * @returns Promise resolving to array of dependency names
	 */
	async extractDependencies(filePath: string): Promise<string[]> {
		const result = await this.analyzeFile(filePath, {
			includeTypeImports: false,
		});

		if (!isSuccessful(result)) {
			throw new ParseError(
				filePath,
				`Failed to extract dependencies: ${getError(result)?.message || "Unknown error"}`,
			);
		}

		return getDependencies(result)
			.map((dep) => dep.source)
			.filter((source, index, arr) => arr.indexOf(source) === index)
			.sort();
	}

	/**
	 * Get import information from a file
	 * @param filePath Path to the TypeScript file
	 * @returns Promise resolving to import information
	 */
	async getImports(filePath: string): Promise<ImportInfo[]> {
		const result = await this.analyzeFile(filePath);

		if (!isSuccessful(result)) {
			throw new ParseError(
				filePath,
				`Failed to get imports: ${getError(result)?.message || "Unknown error"}`,
			);
		}

		return getImports(result);
	}

	/**
	 * Get export information from a file
	 * @param filePath Path to the TypeScript file
	 * @returns Promise resolving to export information
	 */
	async getExports(filePath: string): Promise<ExportInfo[]> {
		const result = await this.analyzeFile(filePath);

		if (!isSuccessful(result)) {
			throw new ParseError(
				filePath,
				`Failed to get exports: ${getError(result)?.message || "Unknown error"}`,
			);
		}

		return getExports(result);
	}

	/**
	 * Validate if a file can be analyzed
	 * @param filePath Path to the file
	 * @returns Promise resolving to validation result
	 */
	async validateFile(filePath: string): Promise<ValidationResult> {
		this.throwIfNotInitialized();

		try {
			const fs = require("node:fs");
			const path = require("node:path");
			const errors: string[] = [];

			// Check if file exists
			if (!fs.existsSync(filePath)) {
				errors.push(`File not found: ${filePath}`);
			}

			// Check file extension
			const ext = path.extname(filePath);
			const supportedExtensions = [".ts", ".tsx", ".d.ts"];
			if (!supportedExtensions.includes(ext)) {
				errors.push(
					`Unsupported file extension: ${ext}. Supported: ${supportedExtensions.join(", ")}`,
				);
			}

			// Check if file is readable
			try {
				fs.accessSync(filePath, fs.constants.R_OK);
			} catch {
				errors.push(`File not readable: ${filePath}`);
			}

			return {
				canAnalyze: errors.length === 0,
				errors,
			};
		} catch (error) {
			throw ErrorUtils.fromUnknown(error, "validateFile");
		}
	}

	/**
	 * Get supported file extensions
	 * @returns Array of supported extensions
	 */
	getSupportedExtensions(): string[] {
		return [".ts", ".tsx", ".d.ts"];
	}

	/**
	 * Clear the analysis cache
	 */
	clearCache(): void {
		this.cache.clear();
		this.logger.info("Analysis cache cleared");
	}

	/**
	 * Get analyzer state information
	 * @returns Current analyzer state
	 */
	getState(): AnalyzerState {
		return {
			isInitialized: this.isInitialized,
			config: { ...this.config },
			cacheStats: this.getCacheStats(),
			metrics: { ...this.metrics },
		};
	}

	/**
	 * Format analysis result
	 * @param result Analysis result to format
	 * @param format Output format
	 * @returns Formatted string
	 */
	formatResult(result: AnalysisResult, format: string): string {
		// Simple formatting for now - could be enhanced later
		if (format === "json") {
			return JSON.stringify(result, null, 2);
		}
		return `Analysis of ${result.filePath}: ${isSuccessful(result) ? "SUCCESS" : "FAILED"}`;
	}

	/**
	 * Add event listener
	 * @param event Event to listen for
	 * @param handler Event handler function
	 */
	on(event: AnalyzerEvent, handler: EventHandler): void {
		this.eventEmitter.on(event, handler);
	}

	/**
	 * Remove event listener
	 * @param event Event to stop listening for
	 * @param handler Event handler to remove
	 */
	off(event: AnalyzerEvent, handler: EventHandler): void {
		this.eventEmitter.off(event, handler);
	}

	/**
	 * Process batch analysis request
	 * @param request Batch analysis request
	 * @returns Promise resolving to batch results
	 */
	private async analyzeBatch(
		request: BatchAnalysisRequest,
	): Promise<BatchResult> {
		const { filePaths, options = {} } = request;
		const startTime = Date.now();

		this.emitEvent(AnalyzerEvent.BATCH_START, {
			filePaths,
			totalFiles: filePaths.length,
		});

		const results: AnalysisResult[] = [];
		const errors: BatchErrorInfo[] = [];
		const concurrency = options.concurrency || 5;
		const failFast = options.failFast || false;

		try {
			// Process files in batches
			for (let i = 0; i < filePaths.length; i += concurrency) {
				const batch = filePaths.slice(i, i + concurrency);
				const batchPromises = batch.map(async (filePath) => {
					try {
						const result = await this.analyzeFile(filePath, options);
						results.push(result);

						// Report progress
						const completed = results.length;
						const progress: ProgressInfo = {
							completed,
							total: filePaths.length,
							currentOperation: filePath,
						};

						this.emitEvent(AnalyzerEvent.BATCH_PROGRESS, { progress });

						if (options.onProgress) {
							options.onProgress(completed, filePaths.length);
						}

						return result;
					} catch (error) {
						const errorInfo: BatchErrorInfo = {
							filePath,
							code: ErrorUtils.getErrorCode(error),
							message: ErrorUtils.getUserMessage(error),
							details: error,
						};

						errors.push(errorInfo);

						if (options.onFileError) {
							options.onFileError(
								filePath,
								error instanceof Error ? error : new Error(String(error)),
							);
						}

						if (failFast) {
							throw error;
						}

						return null;
					}
				});

				await Promise.all(batchPromises);
			}

			const totalTime = Date.now() - startTime;
			const summary = this.createBatchSummary(results, errors, totalTime);

			const batchResult: BatchResult = {
				results: results as any, // Legacy compatibility
				summary,
				errors,
				totalTime,
			};

			this.emitEvent(AnalyzerEvent.BATCH_COMPLETE, { batchResult });

			return batchResult;
		} catch (_error) {
			const batchError = ErrorUtils.createBatchError(
				errors.map((e) => ({
					filePath: e.filePath,
					error: new Error(e.message),
				})),
				results,
			);

			throw batchError;
		}
	}

	/**
	 * Generate cache key for analysis request
	 */
	private getCacheKey(filePath: string, options?: AnalysisOptions): string {
		const optionsKey = JSON.stringify(options || {});
		return `${filePath}:${optionsKey}`;
	}

	/**
	 * Cache analysis result
	 */
	private cacheResult(key: string, result: AnalysisResult): void {
		if (this.cache.size >= (this.config.cacheSize || 1000)) {
			// Remove oldest entry
			const firstKey = this.cache.keys().next().value;
			if (firstKey) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(key, {
			result,
			timestamp: Date.now(),
		});
	}

	/**
	 * Check if cache entry is expired
	 */
	private isCacheEntryExpired(entry: CacheEntry): boolean {
		const maxAge = 5 * 60 * 1000; // 5 minutes
		return Date.now() - entry.timestamp > maxAge;
	}

	/**
	 * Update performance metrics
	 */
	private updateMetrics(analysisTime: number): void {
		this.metrics.totalFilesAnalyzed++;
		this.metrics.totalAnalysisTime += analysisTime;
		this.metrics.averageAnalysisTime =
			this.metrics.totalAnalysisTime / this.metrics.totalFilesAnalyzed;
	}

	/**
	 * Get cache statistics
	 */
	private getCacheStats(): CacheStats {
		const entryCount = this.cache.size;
		// Simple hit rate calculation would require tracking hits/misses over time
		return {
			entryCount,
			hitRate: 0, // Placeholder - would need proper tracking
			totalHits: 0, // Placeholder
			totalMisses: 0, // Placeholder
			memoryUsage: entryCount * 1000, // Rough estimate
		};
	}

	/**
	 * Create batch summary from results
	 */
	private createBatchSummary(
		results: AnalysisResult[],
		errors: BatchErrorInfo[],
		totalTime: number,
	): BatchSummary {
		const successfulFiles = results.filter((r) => isSuccessful(r)).length;
		const totalDependencies = results.reduce(
			(sum, r) => sum + getDependencies(r).length,
			0,
		);
		const totalImports = results.reduce(
			(sum, r) => sum + getImports(r).length,
			0,
		);
		const totalExports = results.reduce(
			(sum, r) => sum + getExports(r).length,
			0,
		);

		return {
			totalFiles: results.length + errors.length,
			successfulFiles,
			failedFiles: errors.length,
			totalDependencies,
			totalImports,
			totalExports,
			averageTime: results.length > 0 ? totalTime / results.length : 0,
		};
	}

	/**
	 * Emit analyzer event
	 */
	private emitEvent(event: AnalyzerEvent, data: any): void {
		const eventData = {
			type: event,
			timestamp: new Date(),
			...data,
		};

		this.eventEmitter.emit(event, eventData);
	}

	/**
	 * Enhanced error reporting and debugging methods
	 */

	/**
	 * Enable or disable debug mode
	 */
	public setDebugMode(enabled: boolean): void {
		DebugHelper.setDebugMode(enabled);
		this.logger.info(`Debug mode ${enabled ? "enabled" : "disabled"}`);
	}

	/**
	 * Get comprehensive diagnostic report
	 */
	public async getDiagnosticReport(): Promise<any> {
		const diagnosticTool = new DiagnosticTool();
		return await diagnosticTool.runComprehensiveDiagnostics();
	}

	/**
	 * Run quick system health check
	 */
	public async getSystemHealth(): Promise<{
		status: "healthy" | "warning" | "error";
		score: number;
		criticalIssues: string[];
		summary: string;
		issues?: any[];
		recommendations?: string[];
	}> {
		const diagnosticTool = new DiagnosticTool();
		return await diagnosticTool.runQuickHealthCheck();
	}

	/**
	 * Analyze specific file with detailed diagnostics
	 */
	public async diagnoseFileAnalysis(filePath: string): Promise<any> {
		const diagnosticTool = new DiagnosticTool();
		return await diagnosticTool.diagnoseFileAnalysis(filePath);
	}

	/**
	 * Benchmark analyzer performance
	 */
	public async benchmarkPerformance(options?: {
		iterations?: number;
		fileTypes?: ("small" | "medium" | "large")[];
		includeMemoryProfile?: boolean;
	}): Promise<any[]> {
		const diagnosticTool = new DiagnosticTool();
		return await diagnosticTool.benchmarkPerformance(options);
	}

	/**
	 * Export comprehensive error and diagnostic data
	 */
	public async exportDiagnostics(
		format: "json" | "text" = "json",
	): Promise<string> {
		const diagnosticTool = new DiagnosticTool();
		return await diagnosticTool.exportDiagnostics(format);
	}

	/**
	 * Get current error statistics
	 */
	public getErrorStatistics(): {
		totalErrors: number;
		criticalErrors: number;
		recentErrors: number;
		topCategories: Array<{ category: string; count: number }>;
	} {
		return errorReporter.getStatistics();
	}

	/**
	 * Generate comprehensive debug report for current session
	 */
	public generateDebugReport(): string {
		return DebugHelper.createDebugReport();
	}

	/**
	 * Clear all diagnostic data
	 */
	public clearDiagnosticData(): void {
		errorReporter.clear();
		DebugHelper.clearTraces();
		this.logger.info("Diagnostic data cleared");
	}

	/**
	 * Get current log level
	 */
	public getCurrentLogLevel(): LogLevel {
		return this.config.logLevel || LogLevel.INFO;
	}

	/**
	 * Convert legacy options to new AnalysisConfig (T046)
	 */
	private convertOptionsToConfig(options?: AnalysisOptions): AnalysisConfig {
		const config = createDefaultAnalysisConfig();

		if (options?.parseTimeout !== undefined) {
			config.timeout = options.parseTimeout;
		}

		if (options?.includeSources !== undefined) {
			config.extractorOptions = {
				...config.extractorOptions,
				dependency: {
					...(config.extractorOptions?.dependency || {}),
					options: { includeSources: options.includeSources },
				},
			};
		}

		if (options?.includeTypeImports !== undefined) {
			config.extractorOptions = {
				...config.extractorOptions,
				dependency: {
					...(config.extractorOptions?.dependency || {}),
					options: { includeTypeImports: options.includeTypeImports },
				},
			};
		}

		// Set default extractors for TypeScript analysis
		config.extractors = ["dependency", "identifier"];

		return config;
	}

	/**
	 * Add deprecation warning for old API usage (T047)
	 */
	private addDeprecationWarning(methodName: string): void {
		const warning = `⚠️  DEPRECATION: ${methodName}() - This API is deprecated. Consider migrating to the new AnalysisEngine API for improved performance and features.`;

		// Log warning (but only once per method)
		if (!(this as any)[`_warned_${methodName}`]) {
			this.logger.warn(warning);
			console.warn(warning);
			(this as any)[`_warned_${methodName}`] = true;
		}
	}

	/**
	 * Throw if analyzer is not initialized
	 */
	private throwIfNotInitialized(): void {
		if (!this.isInitialized) {
			throw new ConfigurationError(
				"analyzer",
				"not initialized",
				"initialized analyzer",
			);
		}
	}
}

/**
 * Cache entry structure
 */
interface CacheEntry {
	result: AnalysisResult;
	timestamp: number;
}

/**
 * Simple event emitter implementation
 */
class SimpleEventEmitter implements EventEmitter {
	private listeners: Map<AnalyzerEvent, Set<EventHandler>> = new Map();

	on(event: AnalyzerEvent, handler: EventHandler): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(handler);
	}

	off(event: AnalyzerEvent, handler: EventHandler): void {
		const handlers = this.listeners.get(event);
		if (handlers) {
			handlers.delete(handler);
			if (handlers.size === 0) {
				this.listeners.delete(event);
			}
		}
	}

	emit(event: AnalyzerEvent, data: any): void {
		const handlers = this.listeners.get(event);
		if (handlers) {
			handlers.forEach((handler) => {
				try {
					handler(data);
				} catch (error) {
					console.error(`Error in event handler for ${event}:`, error);
				}
			});
		}
	}

	removeAllListeners(event?: AnalyzerEvent): void {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
	}
}
