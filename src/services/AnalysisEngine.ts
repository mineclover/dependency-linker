/**
 * AnalysisEngine implementation
 * Main analysis engine that orchestrates parsing, extraction, and interpretation
 */

import { ComplexityExtractor } from "../extractors/ComplexityExtractor";
import { DependencyExtractor } from "../extractors/DependencyExtractor";
import type { IDataExtractor } from "../extractors/IDataExtractor";
import { IdentifierExtractor } from "../extractors/IdentifierExtractor";
import { DependencyAnalysisInterpreter } from "../interpreters/DependencyAnalysisInterpreter";
import type { IDataInterpreter } from "../interpreters/IDataInterpreter";
import { IdentifierAnalysisInterpreter } from "../interpreters/IdentifierAnalysisInterpreter";
import {
	type AnalysisConfig,
	createDefaultAnalysisConfig,
	mergeAnalysisConfigs,
} from "../models/AnalysisConfig";
import {
	createEngineDisabledError,
	createErrorFromParseError,
	createParseError,
	createUnknownError,
	createUnsupportedLanguageError,
	isAnalysisError,
} from "../models/AnalysisError";
import {
	type AnalysisResult,
	createAnalysisResult,
	createErrorAnalysisResult,
} from "../models/AnalysisResult";
import type { CacheStats } from "../models/CacheEntry";
import type {
	DataIntegrationConfig,
	IntegratedAnalysisData,
} from "../models/IntegratedData";
import { PerformanceMonitor } from "../models/PerformanceMetrics";
import { GoParser } from "../parsers/GoParser";
import { JavaParser } from "../parsers/JavaParser";
import { JavaScriptParser } from "../parsers/JavaScriptParser";
import { TypeScriptParser } from "../parsers/TypeScriptParser";
import { CacheManager, type ICacheManager } from "./CacheManager";
import {
	ExtractorRegistry,
	type IExtractorRegistry,
} from "./ExtractorRegistry";
import type {
	CacheValidationResult,
	CacheWarmupResult,
	EnginePerformanceMetrics,
	IAnalysisEngine,
} from "./IAnalysisEngine";
import {
	type IInterpreterRegistry,
	InterpreterRegistry,
} from "./InterpreterRegistry";
import {
	DataIntegrator,
	type IDataIntegrator,
} from "./integration/DataIntegrator";
import { ParserRegistry } from "./ParserRegistry";

export class AnalysisEngine implements IAnalysisEngine {
	private parserRegistry: ParserRegistry;
	private extractorRegistry: IExtractorRegistry;
	private interpreterRegistry: IInterpreterRegistry;
	private cacheManager: ICacheManager;
	private dataIntegrator: IDataIntegrator;
	private defaultConfig: AnalysisConfig;
	private enabled: boolean = true;
	private performanceMetrics: EnginePerformanceMetrics;
	private startTime: number;
	private performanceMonitor: PerformanceMonitor;

	constructor(config?: AnalysisConfig) {
		this.parserRegistry = new ParserRegistry();
		this.extractorRegistry = new ExtractorRegistry();
		this.interpreterRegistry = new InterpreterRegistry();
		this.cacheManager = new CacheManager();
		this.dataIntegrator = new DataIntegrator();
		this.defaultConfig = config || createDefaultAnalysisConfig();
		this.startTime = Date.now();
		this.performanceMonitor = new PerformanceMonitor();

		// Register default parsers
		this.registerDefaultParsers();
		this.registerDefaultExtractors();
		this.registerDefaultInterpreters();

		this.performanceMetrics = {
			totalAnalyses: 0,
			successfulAnalyses: 0,
			failedAnalyses: 0,
			averageAnalysisTime: 0,
			peakMemoryUsage: 0,
			currentMemoryUsage: 0,
			cacheHitRate: 0,
			timeSavedByCache: 0,
			filesProcessed: 0,
			totalDataProcessed: 0,
			uptime: 0,
			languageMetrics: new Map(),
			extractorMetrics: new Map(),
			interpreterMetrics: new Map(),
		};
	}

	/**
	 * Analyzes a single file
	 */
	async analyzeFile(
		filePath: string,
		config?: AnalysisConfig,
	): Promise<AnalysisResult> {
		const startTime = Date.now();
		const analysisConfig = config
			? mergeAnalysisConfigs(this.defaultConfig, config)
			: this.defaultConfig;

		// Start performance monitoring
		this.performanceMonitor.start();
		const initialMemory = process.memoryUsage().heapUsed;

		if (!this.enabled) {
			throw createEngineDisabledError();
		}

		try {
			// Check cache first
			const cacheKey = this.generateCacheKey(filePath, analysisConfig);
			const cacheStartTime = Date.now();

			if (analysisConfig.useCache !== false) {
				const cachedResult =
					await this.cacheManager.get<AnalysisResult>(cacheKey);
				if (cachedResult) {
					const _cacheTime = Date.now() - cacheStartTime;
					const cacheStats = this.cacheManager.getStats();
					this.performanceMonitor.recordCache(
						cacheStats.totalHits,
						cacheStats.totalMisses,
						Date.now() - startTime,
						process.memoryUsage().heapUsed - initialMemory,
					);
					this.updateCacheMetrics(true, startTime);
					return cachedResult;
				}
			}

			// Create new analysis result
			const result = createAnalysisResult(filePath, "unknown");

			// Step 1: Parse the file with enhanced monitoring
			const parseStartTime = Date.now();
			const parseMemoryStart = process.memoryUsage().heapUsed;

			const parser = this.parserRegistry.detectAndGetParser(filePath);

			if (!parser) {
				throw createUnsupportedLanguageError(filePath);
			}

			const parseResult = await parser.parse(filePath);
			result.language = parseResult.language;

			if (parseResult.errors.length > 0) {
				result.errors.push(
					...parseResult.errors.map((error) =>
						createErrorFromParseError(error, filePath),
					),
				);
			}

			if (!parseResult.ast) {
				throw createParseError(filePath, "Failed to generate AST");
			}

			const parseTime = Date.now() - parseStartTime;
			const parseMemoryUsed = process.memoryUsage().heapUsed - parseMemoryStart;

			// Record parsing performance
			const nodeCount = this.countASTNodes(parseResult.ast);
			this.performanceMonitor.recordParsing(
				parseTime,
				nodeCount,
				parseMemoryUsed,
			);

			// Step 2: Extract data with enhanced monitoring
			const extractionStartTime = Date.now();
			const extractionMemoryStart = process.memoryUsage().heapUsed;

			const extractorsToRun =
				analysisConfig.extractors ||
				Array.from(this.extractorRegistry.getAllExtractors().keys());

			if (extractorsToRun.length > 0) {
				result.extractedData = this.extractorRegistry.executeSelected(
					extractorsToRun,
					parseResult.ast,
					filePath,
					analysisConfig.extractorOptions,
				);
				result.metadata.extractorsUsed = extractorsToRun;

				// Record extractor performance for each extractor
				const extractionTime = Date.now() - extractionStartTime;
				const extractionMemoryUsed =
					process.memoryUsage().heapUsed - extractionMemoryStart;

				for (const extractorName of extractorsToRun) {
					const itemsExtracted = result.extractedData[extractorName]
						? Object.keys(result.extractedData[extractorName]).length
						: 0;

					// Get actual extractor info
					const extractorInstance = this.extractorRegistry
						.getAllExtractors()
						.get(extractorName);
					const extractorVersion =
						extractorInstance?.getMetadata?.()?.version || "1.0.0";
					const extractorConfidence = this.calculateExtractionConfidence(
						result.extractedData[extractorName],
						parseResult.ast,
					);
					const extractorSuccess = !result.errors.some((e) =>
						e.message.includes(extractorName),
					);

					this.performanceMonitor.recordExtractor(
						extractorName,
						extractorVersion,
						extractionTime / extractorsToRun.length, // Distribute time evenly
						extractionMemoryUsed / extractorsToRun.length, // Distribute memory evenly
						itemsExtracted,
						extractorConfidence,
						extractorSuccess,
					);
				}
			}

			const extractionTime = Date.now() - extractionStartTime;

			// Step 3: Interpret data with enhanced monitoring
			const interpretationStartTime = Date.now();
			const interpretationMemoryStart = process.memoryUsage().heapUsed;

			const interpretersToRun =
				analysisConfig.interpreters ||
				Array.from(this.interpreterRegistry.getAllInterpreters().keys());

			if (interpretersToRun.length > 0) {
				result.interpretedData = this.interpreterRegistry.executeSelected(
					interpretersToRun,
					result.extractedData,
					{ filePath, language: result.language, config: analysisConfig },
					analysisConfig.interpreterOptions,
				);
				result.metadata.interpretersUsed = interpretersToRun;

				// Record interpreter performance for each interpreter
				const interpretationTime = Date.now() - interpretationStartTime;
				const interpretationMemoryUsed =
					process.memoryUsage().heapUsed - interpretationMemoryStart;

				for (const interpreterName of interpretersToRun) {
					const inputSize = JSON.stringify(result.extractedData).length;
					const outputSize = result.interpretedData[interpreterName]
						? JSON.stringify(result.interpretedData[interpreterName]).length
						: 0;

					// Get actual interpreter info
					const interpreterInstance = this.interpreterRegistry
						.getAllInterpreters()
						.get(interpreterName);
					const interpreterVersion =
						interpreterInstance?.getMetadata?.()?.version || "1.0.0";
					const interpreterSuccess = !result.errors.some((e) =>
						e.message.includes(interpreterName),
					);

					this.performanceMonitor.recordInterpreter(
						interpreterName,
						interpreterVersion,
						interpretationTime / interpretersToRun.length, // Distribute time evenly
						interpretationMemoryUsed / interpretersToRun.length, // Distribute memory evenly
						inputSize,
						outputSize,
						interpreterSuccess,
					);
				}
			}

			const interpretationTime = Date.now() - interpretationStartTime;
			const totalTime = Date.now() - startTime;

			// Update performance metrics with detailed monitoring
			const detailedMetrics = this.performanceMonitor.finish();
			result.performanceMetrics = {
				...detailedMetrics,
				parseTime,
				extractionTime,
				interpretationTime,
				totalTime,
				memoryUsage: process.memoryUsage().heapUsed,
			};

			// Update metadata
			result.metadata.timestamp = new Date();
			result.metadata.version = "2.0.0";
			result.metadata.fromCache = false;
			result.metadata.config = analysisConfig;

			// Cache the result
			if (analysisConfig.useCache !== false) {
				await this.cacheManager.set(cacheKey, result);
			}

			// Update engine metrics
			this.updateAnalysisMetrics(result, totalTime);
			this.updateCacheMetrics(false, startTime);

			return result;
		} catch (error) {
			const analysisError = isAnalysisError(error)
				? error
				: createUnknownError(
						filePath,
						(error as Error)?.message || "Unknown error",
					);

			const result = createErrorAnalysisResult(filePath, analysisError);
			result.performanceMetrics.totalTime = Date.now() - startTime;

			this.performanceMetrics.failedAnalyses++;
			this.performanceMetrics.totalAnalyses++;

			return result;
		}
	}

	/**
	 * Analyzes multiple files in batch
	 */
	async analyzeBatch(
		filePaths: string[],
		config?: AnalysisConfig,
	): Promise<AnalysisResult[]> {
		const results: AnalysisResult[] = [];

		for (const filePath of filePaths) {
			try {
				const result = await this.analyzeFile(filePath, config);
				results.push(result);
			} catch (error) {
				const analysisError = createUnknownError(
					filePath,
					error instanceof Error ? error.message : String(error),
				);
				results.push(createErrorAnalysisResult(filePath, analysisError));
			}
		}

		return results;
	}

	/**
	 * Analyzes a file and returns integrated data optimized for output
	 */
	async analyzeFileIntegrated(
		filePath: string,
		config?: AnalysisConfig,
		integrationConfig?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData> {
		const result = await this.analyzeFile(filePath, config);
		return await this.dataIntegrator.integrate(result, integrationConfig);
	}

	/**
	 * Analyzes multiple files and returns integrated data batch
	 */
	async analyzeBatchIntegrated(
		filePaths: string[],
		config?: AnalysisConfig,
		integrationConfig?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData[]> {
		const results = await this.analyzeBatch(filePaths, config);
		return await this.dataIntegrator.integrateBatch(results, integrationConfig);
	}

	/**
	 * Analyzes content and returns integrated data
	 */
	async analyzeContentIntegrated(
		content: string,
		filePath: string,
		config?: AnalysisConfig,
		integrationConfig?: DataIntegrationConfig,
	): Promise<IntegratedAnalysisData> {
		const result = await this.analyzeContent(content, filePath, config);
		return await this.dataIntegrator.integrate(result, integrationConfig);
	}

	/**
	 * Analyzes a file from content string
	 */
	async analyzeContent(
		content: string,
		filePath: string,
		config?: AnalysisConfig,
	): Promise<AnalysisResult> {
		const startTime = Date.now();
		const analysisConfig = config
			? mergeAnalysisConfigs(this.defaultConfig, config)
			: this.defaultConfig;

		if (!this.enabled) {
			throw createEngineDisabledError();
		}

		try {
			const result = createAnalysisResult(filePath, "unknown");

			// Step 1: Parse content
			const parser = this.parserRegistry.detectAndGetParser(filePath, content);

			if (!parser) {
				throw createUnsupportedLanguageError(filePath);
			}

			const parseResult = await parser.parse(filePath, content);
			result.language = parseResult.language;

			if (parseResult.errors.length > 0) {
				result.errors.push(
					...parseResult.errors.map((error) =>
						createErrorFromParseError(error, filePath),
					),
				);
			}

			if (!parseResult.ast) {
				throw createParseError(filePath, "Failed to generate AST");
			}

			// Step 2: Extract and interpret (same as analyzeFile)
			const extractorsToRun =
				analysisConfig.extractors ||
				Array.from(this.extractorRegistry.getAllExtractors().keys());

			if (extractorsToRun.length > 0) {
				result.extractedData = this.extractorRegistry.executeSelected(
					extractorsToRun,
					parseResult.ast,
					filePath,
					analysisConfig.extractorOptions,
				);
			}

			const interpretersToRun =
				analysisConfig.interpreters ||
				Array.from(this.interpreterRegistry.getAllInterpreters().keys());

			if (interpretersToRun.length > 0) {
				result.interpretedData = this.interpreterRegistry.executeSelected(
					interpretersToRun,
					result.extractedData,
					{ filePath, language: result.language, config: analysisConfig },
					analysisConfig.interpreterOptions,
				);
			}

			const totalTime = Date.now() - startTime;
			result.performanceMetrics.totalTime = totalTime;
			result.metadata.timestamp = new Date();
			result.metadata.fromCache = false;

			this.updateAnalysisMetrics(result, totalTime);

			return result;
		} catch (error) {
			const analysisError = isAnalysisError(error)
				? error
				: createUnknownError(
						filePath,
						(error as Error)?.message || "Unknown error",
					);

			return createErrorAnalysisResult(filePath, analysisError);
		}
	}

	/**
	 * Registers a data extractor plugin
	 */
	registerExtractor<T>(name: string, extractor: IDataExtractor<T>): void {
		this.extractorRegistry.register(name, extractor);
	}

	/**
	 * Registers a data interpreter plugin
	 */
	registerInterpreter<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): void {
		this.interpreterRegistry.register(name, interpreter);
	}

	/**
	 * Unregisters an extractor
	 */
	unregisterExtractor(name: string): boolean {
		return this.extractorRegistry.unregister(name);
	}

	/**
	 * Unregisters an interpreter
	 */
	unregisterInterpreter(name: string): boolean {
		return this.interpreterRegistry.unregister(name);
	}

	/**
	 * Gets a list of all registered extractors
	 */
	getRegisteredExtractors(): Map<string, IDataExtractor<any>> {
		return this.extractorRegistry.getAllExtractors();
	}

	/**
	 * Gets a list of all registered interpreters
	 */
	getRegisteredInterpreters(): Map<string, IDataInterpreter<any, any>> {
		return this.interpreterRegistry.getAllInterpreters();
	}

	/**
	 * Clears the analysis cache
	 */
	clearCache(): void {
		this.cacheManager.clear();
	}

	/**
	 * Gets cache performance statistics
	 */
	getCacheStats(): CacheStats {
		return this.cacheManager.getStats();
	}

	/**
	 * Validates cache integrity and repairs if needed
	 */
	async validateCache(): Promise<CacheValidationResult> {
		const validation = await this.cacheManager.validate();
		const optimization = await this.cacheManager.optimize();

		return {
			isValid: validation.isValid,
			corruptedEntries: validation.errors.length,
			repairedEntries: 0,
			removedEntries: optimization.entriesRemoved,
			errors: validation.errors,
			validationTime: 0, // TODO: implement timing
		};
	}

	/**
	 * Warms up the cache with frequently used files
	 */
	async warmupCache(filePaths: string[]): Promise<CacheWarmupResult> {
		const startTime = Date.now();
		let filesProcessed = 0;
		let filesCached = 0;
		let filesFailed = 0;
		const failures: Array<{ filePath: string; error: string }> = [];

		for (const filePath of filePaths) {
			try {
				await this.analyzeFile(filePath);
				filesProcessed++;
				filesCached++;
			} catch (error) {
				filesProcessed++;
				filesFailed++;
				failures.push({
					filePath,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		const totalTime = Date.now() - startTime;

		return {
			filesProcessed,
			filesCached,
			filesFailed,
			totalTime,
			averageTimePerFile: filesProcessed > 0 ? totalTime / filesProcessed : 0,
			failures,
		};
	}

	/**
	 * Sets the analysis configuration as default
	 */
	setDefaultConfig(config: AnalysisConfig): void {
		this.defaultConfig = config;
	}

	/**
	 * Gets the current default configuration
	 */
	getDefaultConfig(): AnalysisConfig {
		return this.defaultConfig;
	}

	/**
	 * Enables or disables the analysis engine
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Checks if the analysis engine is currently enabled
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Gets engine performance metrics
	 */
	getPerformanceMetrics(): EnginePerformanceMetrics {
		this.performanceMetrics.uptime = Date.now() - this.startTime;
		this.performanceMetrics.currentMemoryUsage = process.memoryUsage().heapUsed;

		return { ...this.performanceMetrics };
	}

	/**
	 * Resets performance metrics
	 */
	resetPerformanceMetrics(): void {
		this.performanceMetrics = {
			totalAnalyses: 0,
			successfulAnalyses: 0,
			failedAnalyses: 0,
			averageAnalysisTime: 0,
			peakMemoryUsage: 0,
			currentMemoryUsage: 0,
			cacheHitRate: 0,
			timeSavedByCache: 0,
			filesProcessed: 0,
			totalDataProcessed: 0,
			uptime: 0,
			languageMetrics: new Map(),
			extractorMetrics: new Map(),
			interpreterMetrics: new Map(),
		};
		this.startTime = Date.now();
	}

	/**
	 * Shuts down the engine and cleans up resources
	 */
	async shutdown(): Promise<void> {
		this.extractorRegistry.clear();
		this.interpreterRegistry.clear();
		this.parserRegistry.clear();

		// Properly shutdown cache manager (including timers)
		await this.cacheManager.shutdown();
		await this.cacheManager.clear();

		this.enabled = false;
	}

	/**
	 * Register default parsers
	 */
	private registerDefaultParsers(): void {
		this.parserRegistry.register(new TypeScriptParser());
		this.parserRegistry.register(new GoParser());
		this.parserRegistry.register(new JavaParser());
		this.parserRegistry.register(new JavaScriptParser());
	}

	/**
	 * Register default extractors
	 */
	private registerDefaultExtractors(): void {
		this.extractorRegistry.register("dependency", new DependencyExtractor());
		this.extractorRegistry.register("identifier", new IdentifierExtractor());
		this.extractorRegistry.register("complexity", new ComplexityExtractor());
	}

	/**
	 * Register default interpreters
	 */
	private registerDefaultInterpreters(): void {
		this.interpreterRegistry.register(
			"dependency-analysis",
			new DependencyAnalysisInterpreter(),
		);
		this.interpreterRegistry.register(
			"identifier-analysis",
			new IdentifierAnalysisInterpreter(),
		);
	}

	private generateCacheKey(filePath: string, config: AnalysisConfig): string {
		const configHash = JSON.stringify(config);
		return `${filePath}:${Buffer.from(configHash).toString("base64")}`;
	}

	private updateAnalysisMetrics(
		result: AnalysisResult,
		totalTime: number,
	): void {
		this.performanceMetrics.totalAnalyses++;

		if (result.errors.length === 0) {
			this.performanceMetrics.successfulAnalyses++;
		}

		// Update average analysis time
		const currentAvg = this.performanceMetrics.averageAnalysisTime;
		const totalAnalyses = this.performanceMetrics.totalAnalyses;
		this.performanceMetrics.averageAnalysisTime =
			(currentAvg * (totalAnalyses - 1) + totalTime) / totalAnalyses;

		// Update memory usage
		const currentMemory = process.memoryUsage().heapUsed;
		this.performanceMetrics.peakMemoryUsage = Math.max(
			this.performanceMetrics.peakMemoryUsage,
			currentMemory,
		);

		// Update language metrics
		this.updateLanguageMetrics(result.language, totalTime);

		// Update extractor/interpreter metrics
		for (const extractorName of result.metadata?.extractorsUsed || []) {
			this.updateExtractorMetrics(extractorName, totalTime);
		}

		for (const interpreterName of result.metadata?.interpretersUsed || []) {
			this.updateInterpreterMetrics(interpreterName, totalTime);
		}
	}

	private updateCacheMetrics(cacheHit: boolean, startTime: number): void {
		const cacheStats = this.cacheManager.getStats();
		this.performanceMetrics.cacheHitRate = cacheStats.hitRate;

		if (cacheHit) {
			const timeSaved = Date.now() - startTime;
			this.performanceMetrics.timeSavedByCache += timeSaved;
		}
	}

	private updateLanguageMetrics(language: string, analysisTime: number): void {
		const existing = this.performanceMetrics.languageMetrics.get(language);

		if (existing) {
			existing.filesAnalyzed++;
			existing.averageTime =
				(existing.averageTime * (existing.filesAnalyzed - 1) + analysisTime) /
				existing.filesAnalyzed;
		} else {
			this.performanceMetrics.languageMetrics.set(language, {
				language,
				filesAnalyzed: 1,
				averageTime: analysisTime,
				successRate: 1.0,
				averageFileSize: 0,
			});
		}
	}

	private updateExtractorMetrics(
		extractorName: string,
		analysisTime: number,
	): void {
		const existing =
			this.performanceMetrics.extractorMetrics.get(extractorName);

		if (existing) {
			existing.executions++;
			existing.averageTime =
				(existing.averageTime * (existing.executions - 1) + analysisTime) /
				existing.executions;
		} else {
			this.performanceMetrics.extractorMetrics.set(extractorName, {
				name: extractorName,
				executions: 1,
				averageTime: analysisTime,
				successRate: 1.0,
				averageDataSize: 0,
			});
		}
	}

	private updateInterpreterMetrics(
		interpreterName: string,
		analysisTime: number,
	): void {
		const existing =
			this.performanceMetrics.interpreterMetrics.get(interpreterName);

		if (existing) {
			existing.executions++;
			existing.averageTime =
				(existing.averageTime * (existing.executions - 1) + analysisTime) /
				existing.executions;
		} else {
			this.performanceMetrics.interpreterMetrics.set(interpreterName, {
				name: interpreterName,
				executions: 1,
				averageTime: analysisTime,
				successRate: 1.0,
				averageInputSize: 0,
				averageOutputSize: 0,
			});
		}
	}

	/**
	 * Counts the number of nodes in an AST
	 */
	private countASTNodes(ast: any): number {
		if (!ast) return 0;

		let count = 1; // Count the current node

		// If the AST has children, recursively count them
		if (ast.children && Array.isArray(ast.children)) {
			for (const child of ast.children) {
				count += this.countASTNodes(child);
			}
		}

		// Handle other possible child properties
		if (ast.body && Array.isArray(ast.body)) {
			for (const child of ast.body) {
				count += this.countASTNodes(child);
			}
		}

		return count;
	}

	/**
	 * Calculates confidence score for extraction results
	 */
	private calculateExtractionConfidence(extractedData: any, ast: any): number {
		if (!extractedData || !ast) return 0.0;

		let confidence = 0.0;
		let factors = 0;

		// Factor 1: Data completeness (0.4 weight)
		if (extractedData.dependencies) {
			confidence += Math.min(extractedData.dependencies.length / 5, 1) * 0.4;
			factors++;
		}

		// Factor 2: AST coverage (0.3 weight)
		const astNodeCount = this.countASTNodes(ast);
		if (astNodeCount > 0) {
			const extractedItemCount = Object.values(extractedData).reduce(
				(count: number, items: any) =>
					count + (Array.isArray(items) ? items.length : 1),
				0,
			);
			const coverage = Math.min(
				(extractedItemCount as number) / astNodeCount,
				1,
			);
			confidence += coverage * 0.3;
			factors++;
		}

		// Factor 3: Data consistency (0.2 weight)
		let consistencyScore = 1.0;
		if (extractedData.imports && extractedData.dependencies) {
			const importCount = extractedData.imports.length || 0;
			const depCount = extractedData.dependencies.length || 0;
			if (importCount > 0 && depCount > 0) {
				consistencyScore = Math.min(
					Math.min(importCount, depCount) / Math.max(importCount, depCount),
					1,
				);
			}
		}
		confidence += consistencyScore * 0.2;
		factors++;

		// Factor 4: Error-free extraction (0.1 weight)
		confidence += 0.1; // No extraction errors assumed if we got here

		return factors > 0 ? Math.min(confidence, 1.0) : 0.5; // Default to 0.5 if no factors
	}
}
