/**
 * Main TypeScript Analyzer API Class
 * Primary entry point for all analysis operations with dependency injection support
 */

import { OutputFormatter } from "../core/formatters/OutputFormatter";
import type { IFileAnalyzer } from "../core/interfaces/IFileAnalyzer";
import type { IOutputFormatter } from "../core/interfaces/IOutputFormatter";
import type { ITypeScriptParser } from "../core/interfaces/ITypeScriptParser";
import { FileAnalyzer } from "../core/services/FileAnalyzer";
import { TypeScriptParser } from "../core/services/TypeScriptParser";
import type { ValidationResult } from "../core/types/ParseTypes";
import type { AnalysisResult } from "../models/AnalysisResult";
import type { FileAnalysisRequest } from "../models/FileAnalysisRequest";
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

/**
 * Main TypeScript Analyzer class that orchestrates all analysis operations
 * Provides a high-level API with dependency injection and comprehensive error handling
 */
export class TypeScriptAnalyzer {
	private fileAnalyzer: IFileAnalyzer;
	private parser: ITypeScriptParser;
	private formatter: IOutputFormatter;
	private logger: Logger;
	private config: AnalyzerOptions;
	private eventEmitter: SimpleEventEmitter;
	private cache: Map<string, CacheEntry>;
	private metrics: PerformanceMetrics;
	private isInitialized: boolean;

	/**
	 * Create a new TypeScript Analyzer instance
	 * @param options Configuration options
	 * @param dependencies Optional dependency injection
	 */
	constructor(
		options: AnalyzerOptions = {},
		dependencies?: {
			fileAnalyzer?: IFileAnalyzer;
			parser?: ITypeScriptParser;
			formatter?: IOutputFormatter;
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

		// Initialize dependencies with injection or defaults
		this.parser = dependencies?.parser || new TypeScriptParser();
		this.fileAnalyzer =
			dependencies?.fileAnalyzer || new FileAnalyzer(this.parser);
		this.formatter = dependencies?.formatter || new OutputFormatter();
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

		this.logger.info("TypeScript Analyzer initialized", {
			enableCache: this.config.enableCache,
			cacheSize: this.config.cacheSize,
			defaultTimeout: this.config.defaultTimeout,
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
		this.throwIfNotInitialized();

		const startTime = Date.now();
		const cacheKey = this.getCacheKey(filePath, options);

		try {
			// Check cache first
			if (this.config.enableCache && this.cache.has(cacheKey)) {
				const cached = this.cache.get(cacheKey)!;
				if (!this.isCacheEntryExpired(cached)) {
					this.emitEvent(AnalyzerEvent.CACHE_HIT, { filePath, cacheKey });
					this.logger.debug(`Cache hit for file: ${filePath}`);
					return cached.result;
				} else {
					this.cache.delete(cacheKey);
				}
			}

			this.emitEvent(AnalyzerEvent.CACHE_MISS, { filePath, cacheKey });
			this.emitEvent(AnalyzerEvent.ANALYSIS_START, { filePath });

			// Create request from options
			const request: FileAnalysisRequest = this.createFileAnalysisRequest(
				filePath,
				options,
			);

			// Perform analysis
			const result = await this.fileAnalyzer.analyzeFile(request);

			// Update metrics
			const analysisTime = Date.now() - startTime;
			this.updateMetrics(analysisTime);

			// Cache successful result
			if (this.config.enableCache && result.success) {
				this.cacheResult(cacheKey, result);
			}

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
		this.throwIfNotInitialized();

		const startTime = Date.now();
		const contextPath = options?.contextPath || "<source>";

		try {
			this.emitEvent(AnalyzerEvent.ANALYSIS_START, { filePath: contextPath });

			// Use parser directly for source analysis
			const parseOptions: {
				timeout?: number;
				includeSourceLocations?: boolean;
				includeTypeImports?: boolean;
			} = {
				includeSourceLocations: options?.includeSources ?? false,
				includeTypeImports: options?.includeTypeImports !== false,
			};

			const timeout = options?.parseTimeout ?? this.config.defaultTimeout;
			if (timeout !== undefined) {
				parseOptions.timeout = timeout;
			}

			const parseResult = await this.parser.parseSource(source, parseOptions);

			// Create result similar to file analysis
			const analysisTime = Date.now() - startTime;
			let result: AnalysisResult = {
				filePath: contextPath,
				success:
					!parseResult.hasParseErrors || parseResult.dependencies.length > 0,
				dependencies: parseResult.dependencies,
				imports: parseResult.imports,
				exports: parseResult.exports,
				parseTime: analysisTime,
			};

			if (parseResult.hasParseErrors) {
				result = {
					...result,
					error: {
						code: "PARSE_ERROR",
						message:
							"Source contains syntax errors but partial analysis was possible",
						details: { hasParseErrors: true },
					},
				};
			}

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

		if (!result.success) {
			throw new ParseError(
				filePath,
				`Failed to extract dependencies: ${result.error?.message || "Unknown error"}`,
			);
		}

		return result.dependencies
			.map((dep) => dep.source)
			.filter((source, index, arr) => arr.indexOf(source) === index)
			.sort();
	}

	/**
	 * Get import information from a file
	 * @param filePath Path to the TypeScript file
	 * @returns Promise resolving to import information
	 */
	async getImports(filePath: string): Promise<AnalysisResult["imports"]> {
		const result = await this.analyzeFile(filePath);

		if (!result.success) {
			throw new ParseError(
				filePath,
				`Failed to get imports: ${result.error?.message || "Unknown error"}`,
			);
		}

		return result.imports;
	}

	/**
	 * Get export information from a file
	 * @param filePath Path to the TypeScript file
	 * @returns Promise resolving to export information
	 */
	async getExports(filePath: string): Promise<AnalysisResult["exports"]> {
		const result = await this.analyzeFile(filePath);

		if (!result.success) {
			throw new ParseError(
				filePath,
				`Failed to get exports: ${result.error?.message || "Unknown error"}`,
			);
		}

		return result.exports;
	}

	/**
	 * Validate if a file can be analyzed
	 * @param filePath Path to the file
	 * @returns Promise resolving to validation result
	 */
	async validateFile(filePath: string): Promise<ValidationResult> {
		this.throwIfNotInitialized();

		try {
			return await this.fileAnalyzer.validateFile(filePath);
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
		return this.formatter.format(result, format as any);
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
				results,
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
	 * Create file analysis request from options
	 */
	private createFileAnalysisRequest(
		filePath: string,
		options?: AnalysisOptions,
	): FileAnalysisRequest {
		return {
			filePath,
			options: {
				format: options?.format ?? "json",
				includeSources: options?.includeSources ?? false,
				parseTimeout:
					options?.parseTimeout ?? this.config.defaultTimeout ?? 30000,
			},
		};
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
		const successfulFiles = results.filter((r) => r.success).length;
		const totalDependencies = results.reduce(
			(sum, r) => sum + r.dependencies.length,
			0,
		);
		const totalImports = results.reduce((sum, r) => sum + r.imports.length, 0);
		const totalExports = results.reduce((sum, r) => sum + r.exports.length, 0);

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
