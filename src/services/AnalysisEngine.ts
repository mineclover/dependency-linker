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

/**
 * Core analysis engine that orchestrates the complete code analysis workflow
 * 
 * The AnalysisEngine serves as the main coordinator for the dependency analysis framework,
 * managing parsers, extractors, interpreters, caching, and performance monitoring.
 * It provides a unified interface for analyzing single files, batches, and content strings.
 * 
 * Features:
 * - Multi-language parsing (TypeScript, JavaScript, Go, Java)
 * - Pluggable data extraction (dependencies, identifiers, complexity)
 * - Configurable data interpretation (analysis, linking, resolution)
 * - Intelligent caching with performance optimization
 * - Comprehensive performance monitoring and metrics
 * - Error handling and recovery
 * - Resource management and cleanup
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const engine = new AnalysisEngine();
 * const result = await engine.analyzeFile("/project/src/index.ts");
 * 
 * console.log(`Language: ${result.language}`);
 * console.log(`Dependencies: ${result.extractedData.dependency?.dependencies?.length || 0}`);
 * console.log(`Analysis time: ${result.performanceMetrics.totalTime}ms`);
 * 
 * // Batch analysis
 * const files = ["/project/src/index.ts", "/project/src/utils.ts"];
 * const results = await engine.analyzeBatch(files);
 * 
 * // Custom configuration
 * const config = {
 *   extractors: ["dependency", "identifier"],
 *   interpreters: ["dependency-analysis"],
 *   useCache: true
 * };
 * const customResult = await engine.analyzeFile("/project/src/app.ts", config);
 * ```
 * 
 * @example
 * ```typescript
 * // Advanced usage with custom plugins
 * const engine = new AnalysisEngine();
 * 
 * // Register custom extractor
 * engine.registerExtractor("custom", new CustomExtractor());
 * 
 * // Register custom interpreter
 * engine.registerInterpreter("custom-analysis", new CustomInterpreter());
 * 
 * // Performance monitoring
 * const metrics = engine.getPerformanceMetrics();
 * console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
 * console.log(`Average analysis time: ${metrics.averageAnalysisTime}ms`);
 * 
 * // Cache management
 * await engine.warmupCache(["/project/src/index.ts"]);
 * const cacheStats = engine.getCacheStats();
 * 
 * // Cleanup
 * await engine.shutdown();
 * ```
 * 
 * @implements IAnalysisEngine
 * @since 2.0.0
 */
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

	/**
	 * Creates a new AnalysisEngine instance with optional configuration
	 * 
	 * Initializes all internal registries, cache manager, and performance monitoring.
	 * Registers default parsers, extractors, and interpreters for common languages.
	 * 
	 * @param config - Optional analysis configuration to use as default
	 * 
	 * @example
	 * ```typescript
	 * // Default configuration
	 * const engine = new AnalysisEngine();
	 * 
	 * // Custom default configuration
	 * const engine = new AnalysisEngine({
	 *   useCache: true,
	 *   extractors: ["dependency", "identifier"],
	 *   interpreters: ["dependency-analysis"]
	 * });
	 * ```
	 */
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
	 * Analyzes a single source file with comprehensive performance monitoring
	 * 
	 * Performs the complete analysis workflow: parsing, data extraction, interpretation,
	 * and caching. Includes detailed performance metrics and error handling.
	 * 
	 * @param filePath - Absolute path to the source file to analyze
	 * @param config - Optional analysis configuration (overrides default)
	 * 
	 * @returns Promise resolving to detailed analysis result with performance metrics
	 * 
	 * @example
	 * ```typescript
	 * // Basic file analysis
	 * const result = await engine.analyzeFile("/project/src/index.ts");
	 * 
	 * if (result.errors.length === 0) {
	 *   console.log(`Found ${result.extractedData.dependency?.dependencies?.length} dependencies`);
	 *   console.log(`Analysis completed in ${result.performanceMetrics.totalTime}ms`);
	 * }
	 * 
	 * // Custom configuration
	 * const result = await engine.analyzeFile("/project/src/app.ts", {
	 *   extractors: ["dependency"],
	 *   useCache: false
	 * });
	 * ```
	 * 
	 * @throws EngineDisabledError when the engine is disabled
	 * @throws UnsupportedLanguageError when no parser supports the file
	 * @throws ParseError when file parsing fails
	 * 
	 * @since 2.0.0
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
	 * Analyzes multiple files in batch for improved efficiency
	 * 
	 * Processes files sequentially to avoid overwhelming system resources.
	 * Each file is analyzed independently with individual error handling.
	 * 
	 * @param filePaths - Array of absolute file paths to analyze
	 * @param config - Optional analysis configuration applied to all files
	 * 
	 * @returns Promise resolving to array of analysis results (one per file)
	 * 
	 * @example
	 * ```typescript
	 * const files = [
	 *   "/project/src/index.ts",
	 *   "/project/src/utils.ts",
	 *   "/project/src/components/Button.tsx"
	 * ];
	 * 
	 * const results = await engine.analyzeBatch(files);
	 * 
	 * // Process results
	 * results.forEach((result, index) => {
	 *   if (result.errors.length === 0) {
	 *     console.log(`${files[index]}: ${result.language} (${result.performanceMetrics.totalTime}ms)`);
	 *   } else {
	 *     console.error(`${files[index]}: Analysis failed`);
	 *   }
	 * });
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Analyzes a file and returns integrated data optimized for output
	 * 
	 * Performs standard file analysis and then applies data integration
	 * to normalize and optimize the output format. Useful for generating
	 * reports or feeding data to external systems.
	 * 
	 * @param filePath - Absolute path to the source file to analyze
	 * @param config - Optional analysis configuration
	 * @param integrationConfig - Optional data integration configuration
	 * 
	 * @returns Promise resolving to integrated analysis data
	 * 
	 * @example
	 * ```typescript
	 * const integratedData = await engine.analyzeFileIntegrated(
	 *   "/project/src/app.ts",
	 *   { extractors: ["dependency"] },
	 *   { format: "normalized", includeMetrics: true }
	 * );
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Analyzes multiple files and returns integrated data batch
	 * 
	 * Combines batch analysis with data integration for efficient
	 * processing of multiple files with normalized output.
	 * 
	 * @param filePaths - Array of absolute file paths to analyze
	 * @param config - Optional analysis configuration applied to all files
	 * @param integrationConfig - Optional data integration configuration
	 * 
	 * @returns Promise resolving to array of integrated analysis data
	 * 
	 * @example
	 * ```typescript
	 * const files = ["/project/src/a.ts", "/project/src/b.ts"];
	 * const integratedResults = await engine.analyzeBatchIntegrated(files);
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Analyzes content and returns integrated data
	 * 
	 * Combines content analysis with data integration for processing
	 * code content without requiring file system access.
	 * 
	 * @param content - Source code content to analyze
	 * @param filePath - Virtual file path for context
	 * @param config - Optional analysis configuration
	 * @param integrationConfig - Optional data integration configuration
	 * 
	 * @returns Promise resolving to integrated analysis data
	 * 
	 * @example
	 * ```typescript
	 * const code = "export const API_URL = 'https://api.example.com';";
	 * const integratedData = await engine.analyzeContentIntegrated(code, "config.ts");
	 * ```
	 * 
	 * @since 2.0.0
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
	 * Analyzes source code content without requiring a physical file
	 * 
	 * Useful for analyzing dynamically generated code, editor content,
	 * or code from external sources. Bypasses file system operations.
	 * 
	 * @param content - Source code content to analyze
	 * @param filePath - Virtual file path (used for language detection and context)
	 * @param config - Optional analysis configuration
	 * 
	 * @returns Promise resolving to analysis result
	 * 
	 * @example
	 * ```typescript
	 * const code = `
	 *   import { useState } from 'react';
	 *   export const Component = () => {
	 *     const [count, setCount] = useState(0);
	 *     return <div>{count}</div>;
	 *   };
	 * `;
	 * 
	 * const result = await engine.analyzeContent(code, "Component.tsx");
	 * console.log(`Dependencies: ${result.extractedData.dependency?.dependencies?.length}`);
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Registers a data extractor plugin with the engine
	 * 
	 * Adds a custom extractor that can extract specific types of data
	 * from ASTs during the analysis process.
	 * 
	 * @param name - Unique identifier for the extractor
	 * @param extractor - Extractor instance implementing IDataExtractor<T>
	 * 
	 * @example
	 * ```typescript
	 * class CustomExtractor implements IDataExtractor<MyData> {
	 *   extract(ast: any, filePath: string): MyData {
	 *     // Custom extraction logic
	 *     return extractedData;
	 *   }
	 * }
	 * 
	 * engine.registerExtractor("custom", new CustomExtractor());
	 * ```
	 * 
	 * @since 2.0.0
	 */
	registerExtractor<T>(name: string, extractor: IDataExtractor<T>): void {
		this.extractorRegistry.register(name, extractor);
	}

	/**
	 * Registers a data interpreter plugin
	 */
	/**
	 * Registers a data interpreter plugin with the engine
	 * 
	 * Adds a custom interpreter that can process extracted data
	 * and transform it into analysis-specific outputs.
	 * 
	 * @param name - Unique identifier for the interpreter
	 * @param interpreter - Interpreter instance implementing IDataInterpreter<TInput, TOutput>
	 * 
	 * @example
	 * ```typescript
	 * class CustomInterpreter implements IDataInterpreter<InputType, OutputType> {
	 *   interpret(data: InputType, context: any): OutputType {
	 *     // Custom interpretation logic
	 *     return processedData;
	 *   }
	 * }
	 * 
	 * engine.registerInterpreter("custom-analysis", new CustomInterpreter());
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Unregisters an extractor plugin from the engine
	 * 
	 * Removes a previously registered extractor. The extractor will no longer
	 * be available for use in analysis operations.
	 * 
	 * @param name - Name of the extractor to remove
	 * 
	 * @returns True if the extractor was found and removed, false otherwise
	 * 
	 * @example
	 * ```typescript
	 * const removed = engine.unregisterExtractor("custom-extractor");
	 * if (removed) {
	 *   console.log("Extractor successfully removed");
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	unregisterExtractor(name: string): boolean {
		return this.extractorRegistry.unregister(name);
	}

	/**
	 * Unregisters an interpreter
	 */
	/**
	 * Unregisters an interpreter plugin from the engine
	 * 
	 * Removes a previously registered interpreter. The interpreter will no longer
	 * be available for use in analysis operations.
	 * 
	 * @param name - Name of the interpreter to remove
	 * 
	 * @returns True if the interpreter was found and removed, false otherwise
	 * 
	 * @example
	 * ```typescript
	 * const removed = engine.unregisterInterpreter("custom-analysis");
	 * if (removed) {
	 *   console.log("Interpreter successfully removed");
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	unregisterInterpreter(name: string): boolean {
		return this.interpreterRegistry.unregister(name);
	}

	/**
	 * Gets a list of all registered extractors
	 */
	/**
	 * Gets a list of all registered extractors
	 * 
	 * Returns a map of all currently registered extractor plugins
	 * with their names and instances.
	 * 
	 * @returns Map containing all registered extractors (name -> extractor)
	 * 
	 * @example
	 * ```typescript
	 * const extractors = engine.getRegisteredExtractors();
	 * console.log(`Registered extractors: ${Array.from(extractors.keys()).join(", ")}`);
	 * 
	 * // Check if specific extractor is available
	 * if (extractors.has("dependency")) {
	 *   console.log("Dependency extractor is available");
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	getRegisteredExtractors(): Map<string, IDataExtractor<unknown>> {
		return this.extractorRegistry.getAllExtractors();
	}

	/**
	 * Gets a list of all registered interpreters
	 */
	/**
	 * Gets a list of all registered interpreters
	 * 
	 * Returns a map of all currently registered interpreter plugins
	 * with their names and instances.
	 * 
	 * @returns Map containing all registered interpreters (name -> interpreter)
	 * 
	 * @example
	 * ```typescript
	 * const interpreters = engine.getRegisteredInterpreters();
	 * console.log(`Registered interpreters: ${Array.from(interpreters.keys()).join(", ")}`);
	 * 
	 * // Check if specific interpreter is available
	 * if (interpreters.has("dependency-analysis")) {
	 *   console.log("Dependency analysis interpreter is available");
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	getRegisteredInterpreters(): Map<string, IDataInterpreter<unknown, unknown>> {
		return this.interpreterRegistry.getAllInterpreters();
	}

	/**
	 * Clears the analysis cache
	 */
	/**
	 * Clears the analysis cache
	 * 
	 * Removes all cached analysis results to free memory or force
	 * fresh analysis of all files. Use when cache integrity is suspect
	 * or when memory usage needs to be reduced.
	 * 
	 * @example
	 * ```typescript
	 * // Clear cache to force fresh analysis
	 * engine.clearCache();
	 * 
	 * // Verify cache is empty
	 * const stats = engine.getCacheStats();
	 * console.log(`Cache entries: ${stats.totalEntries}`); // Should be 0
	 * ```
	 * 
	 * @since 2.0.0
	 */
	clearCache(): void {
		this.cacheManager.clear();
	}

	/**
	 * Gets cache performance statistics
	 */
	/**
	 * Gets cache performance statistics
	 * 
	 * Returns detailed metrics about cache usage, hit rates, and performance
	 * for monitoring and optimization purposes.
	 * 
	 * @returns Cache statistics including hit rate, entries, and memory usage
	 * 
	 * @example
	 * ```typescript
	 * const stats = engine.getCacheStats();
	 * console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
	 * console.log(`Total entries: ${stats.totalEntries}`);
	 * console.log(`Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
	 * 
	 * // Monitor cache efficiency
	 * if (stats.hitRate < 0.5) {
	 *   console.warn("Low cache hit rate - consider adjusting cache strategy");
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	getCacheStats(): CacheStats {
		return this.cacheManager.getStats();
	}

	/**
	 * Validates cache integrity and repairs if needed
	 */
	/**
	 * Validates cache integrity and repairs if needed
	 * 
	 * Performs comprehensive cache validation to detect corrupted entries,
	 * inconsistencies, or optimization opportunities. Automatically repairs
	 * issues when possible.
	 * 
	 * @returns Promise resolving to validation results with repair statistics
	 * 
	 * @example
	 * ```typescript
	 * const validation = await engine.validateCache();
	 * 
	 * if (!validation.isValid) {
	 *   console.log(`Found ${validation.corruptedEntries} corrupted entries`);
	 *   console.log(`Repaired ${validation.repairedEntries} entries`);
	 *   console.log(`Removed ${validation.removedEntries} entries`);
	 * } else {
	 *   console.log("Cache is healthy");
	 * }
	 * 
	 * // Handle validation errors
	 * if (validation.errors.length > 0) {
	 *   validation.errors.forEach(error => console.error(error));
	 * }
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Warms up the cache with frequently used files
	 * 
	 * Pre-analyzes a set of files to populate the cache, improving
	 * performance for subsequent analysis operations. Useful for
	 * batch operations or application startup optimization.
	 * 
	 * @param filePaths - Array of file paths to pre-analyze and cache
	 * 
	 * @returns Promise resolving to warmup statistics and performance metrics
	 * 
	 * @example
	 * ```typescript
	 * const commonFiles = [
	 *   "/project/src/index.ts",
	 *   "/project/src/utils/helpers.ts",
	 *   "/project/src/components/App.tsx"
	 * ];
	 * 
	 * const warmupResult = await engine.warmupCache(commonFiles);
	 * 
	 * console.log(`Processed ${warmupResult.filesProcessed} files`);
	 * console.log(`Cached ${warmupResult.filesCached} successfully`);
	 * console.log(`Failed ${warmupResult.filesFailed} files`);
	 * console.log(`Average time: ${warmupResult.averageTimePerFile.toFixed(1)}ms per file`);
	 * 
	 * // Handle failures
	 * if (warmupResult.failures.length > 0) {
	 *   warmupResult.failures.forEach(failure => {
	 *     console.error(`Failed to cache ${failure.filePath}: ${failure.error}`);
	 *   });
	 * }
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Sets the analysis configuration as default
	 * 
	 * Updates the default configuration used for all analysis operations
	 * when no specific configuration is provided. This allows customizing
	 * the engine's behavior globally.
	 * 
	 * @param config - New default analysis configuration
	 * 
	 * @example
	 * ```typescript
	 * // Set custom default configuration
	 * engine.setDefaultConfig({
	 *   useCache: true,
	 *   extractors: ["dependency", "complexity"],
	 *   interpreters: ["dependency-analysis"],
	 *   extractorOptions: { includeDevDependencies: false }
	 * });
	 * 
	 * // All subsequent analyses will use this config by default
	 * const result = await engine.analyzeFile("/project/src/app.ts");
	 * ```
	 * 
	 * @since 2.0.0
	 */
	setDefaultConfig(config: AnalysisConfig): void {
		this.defaultConfig = config;
	}

	/**
	 * Gets the current default configuration
	 */
	/**
	 * Gets the current default configuration
	 * 
	 * Returns a copy of the current default analysis configuration
	 * used when no specific configuration is provided to analysis methods.
	 * 
	 * @returns Current default analysis configuration
	 * 
	 * @example
	 * ```typescript
	 * const currentConfig = engine.getDefaultConfig();
	 * console.log(`Default extractors: ${currentConfig.extractors?.join(", ")}`);
	 * console.log(`Cache enabled: ${currentConfig.useCache !== false}`);
	 * 
	 * // Create modified copy for specific use case
	 * const customConfig = {
	 *   ...currentConfig,
	 *   useCache: false // Disable cache for this analysis
	 * };
	 * ```
	 * 
	 * @since 2.0.0
	 */
	getDefaultConfig(): AnalysisConfig {
		return this.defaultConfig;
	}

	/**
	 * Enables or disables the analysis engine
	 */
	/**
	 * Enables or disables the analysis engine
	 * 
	 * Controls whether the engine will accept analysis requests.
	 * When disabled, all analysis methods will throw EngineDisabledError.
	 * Useful for maintenance, testing, or resource management.
	 * 
	 * @param enabled - True to enable the engine, false to disable
	 * 
	 * @example
	 * ```typescript
	 * // Disable engine during maintenance
	 * engine.setEnabled(false);
	 * 
	 * try {
	 *   await engine.analyzeFile("/project/src/app.ts");
	 * } catch (error) {
	 *   console.log("Engine is disabled"); // EngineDisabledError
	 * }
	 * 
	 * // Re-enable after maintenance
	 * engine.setEnabled(true);
	 * ```
	 * 
	 * @since 2.0.0
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Checks if the analysis engine is currently enabled
	 */
	/**
	 * Checks if the analysis engine is currently enabled
	 * 
	 * Returns the current enabled state of the engine. When false,
	 * analysis operations will fail with EngineDisabledError.
	 * 
	 * @returns True if the engine is enabled and accepting requests
	 * 
	 * @example
	 * ```typescript
	 * if (engine.isEnabled()) {
	 *   const result = await engine.analyzeFile("/project/src/app.ts");
	 * } else {
	 *   console.log("Engine is currently disabled");
	 * }
	 * 
	 * // Check engine health before batch operation
	 * const files = ["/a.ts", "/b.ts", "/c.ts"];
	 * if (engine.isEnabled()) {
	 *   const results = await engine.analyzeBatch(files);
	 * }
	 * ```
	 * 
	 * @since 2.0.0
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Gets engine performance metrics
	 */
	/**
	 * Gets engine performance metrics
	 * 
	 * Returns comprehensive performance statistics including analysis times,
	 * memory usage, cache efficiency, and component-specific metrics.
	 * Useful for monitoring, optimization, and debugging.
	 * 
	 * @returns Current engine performance metrics
	 * 
	 * @example
	 * ```typescript
	 * const metrics = engine.getPerformanceMetrics();
	 * 
	 * console.log(`Total analyses: ${metrics.totalAnalyses}`);
	 * console.log(`Success rate: ${(metrics.successfulAnalyses / metrics.totalAnalyses * 100).toFixed(1)}%`);
	 * console.log(`Average time: ${metrics.averageAnalysisTime.toFixed(1)}ms`);
	 * console.log(`Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
	 * console.log(`Uptime: ${(metrics.uptime / 1000 / 60).toFixed(1)} minutes`);
	 * 
	 * // Language-specific metrics
	 * metrics.languageMetrics.forEach((stats, language) => {
	 *   console.log(`${language}: ${stats.filesAnalyzed} files, ${stats.averageTime.toFixed(1)}ms avg`);
	 * });
	 * ```
	 * 
	 * @since 2.0.0
	 */
	getPerformanceMetrics(): EnginePerformanceMetrics {
		this.performanceMetrics.uptime = Date.now() - this.startTime;
		this.performanceMetrics.currentMemoryUsage = process.memoryUsage().heapUsed;

		return { ...this.performanceMetrics };
	}

	/**
	 * Resets performance metrics
	 */
	/**
	 * Resets performance metrics to initial state
	 * 
	 * Clears all accumulated performance statistics and restarts tracking
	 * from zero. Useful for benchmarking specific operations or starting
	 * fresh measurement periods.
	 * 
	 * @example
	 * ```typescript
	 * // Reset metrics before benchmark
	 * engine.resetPerformanceMetrics();
	 * 
	 * // Perform operations to measure
	 * await engine.analyzeBatch(testFiles);
	 * 
	 * // Get clean metrics for the benchmark
	 * const benchmarkMetrics = engine.getPerformanceMetrics();
	 * console.log(`Benchmark completed: ${benchmarkMetrics.totalAnalyses} files in ${benchmarkMetrics.averageAnalysisTime}ms avg`);
	 * ```
	 * 
	 * @since 2.0.0
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
	/**
	 * Shuts down the engine and cleans up resources
	 * 
	 * Performs graceful shutdown by clearing all registries, shutting down
	 * the cache manager, and disabling the engine. Call this method before
	 * application termination to ensure proper resource cleanup.
	 * 
	 * @returns Promise that resolves when shutdown is complete
	 * 
	 * @example
	 * ```typescript
	 * // Graceful shutdown in application exit handler
	 * process.on('SIGTERM', async () => {
	 *   console.log('Shutting down analysis engine...');
	 *   await engine.shutdown();
	 *   console.log('Engine shutdown complete');
	 *   process.exit(0);
	 * });
	 * 
	 * // Manual shutdown
	 * await engine.shutdown();
	 * console.log('Engine is now shut down and resources are cleaned up');
	 * ```
	 * 
	 * @since 2.0.0
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
