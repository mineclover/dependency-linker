/**
 * Configuration options for analysis operations
 * Controls behavior of parsers, extractors, and interpreters
 */

export interface AnalysisConfig {
	/** Target language for analysis (auto-detected if not specified) */
	language?: string;

	/** Specific extractors to run (runs all registered if not specified) */
	extractors?: string[];

	/** Specific interpreters to run (runs all registered if not specified) */
	interpreters?: string[];

	/** Whether to use cached AST and results */
	useCache?: boolean;

	/** Maximum number of cache entries */
	maxCacheSize?: number;

	/** Maximum memory usage for cache in bytes */
	maxCacheMemory?: number;

	/** Cache TTL in milliseconds */
	cacheTtl?: number;

	/** Analysis depth level (1-5, where 5 is most comprehensive) */
	depth?: AnalysisDepth;

	/** Whether to include detailed debugging information */
	includeDebugInfo?: boolean;

	/** Timeout for analysis operations in milliseconds */
	timeout?: number;

	/** Maximum file size to analyze in bytes */
	maxFileSize?: number;

	/** Configuration options for specific extractors */
	extractorOptions?: Record<string, ExtractorConfig>;

	/** Configuration options for specific interpreters */
	interpreterOptions?: Record<string, InterpreterConfig>;

	/** Performance optimization settings */
	performance?: PerformanceConfig;

	/** Output format and filtering options */
	output?: OutputConfig;

	/** Plugin discovery and loading options */
	plugins?: PluginConfig;
}

export type AnalysisDepth = 1 | 2 | 3 | 4 | 5;

export interface ExtractorConfig {
	/** Whether this extractor is enabled */
	enabled?: boolean;

	/** Priority for execution order (higher = earlier) */
	priority?: number;

	/** Extractor-specific options */
	options?: Record<string, any>;

	/** Languages this extractor should handle */
	languages?: string[];

	/** Whether to fail fast on errors or continue */
	failFast?: boolean;
}

export interface InterpreterConfig {
	/** Whether this interpreter is enabled */
	enabled?: boolean;

	/** Priority for execution order (higher = earlier) */
	priority?: number;

	/** Data types this interpreter should handle */
	dataTypes?: string[];

	/** Interpreter-specific options */
	options?: Record<string, any>;

	/** Minimum confidence threshold for input data */
	minConfidence?: number;

	/** Whether to fail fast on errors or continue */
	failFast?: boolean;
}

export interface PerformanceConfig {
	/** Enable parallel processing where possible */
	enableParallelProcessing?: boolean;

	/** Maximum number of concurrent operations */
	maxConcurrency?: number;

	/** Memory usage monitoring */
	monitorMemory?: boolean;

	/** Memory limit in bytes before triggering cleanup */
	memoryLimit?: number;

	/** Enable performance profiling */
	enableProfiling?: boolean;

	/** AST reuse optimization */
	enableAstReuse?: boolean;

	/** Incremental analysis for file changes */
	enableIncrementalAnalysis?: boolean;
}

export interface OutputConfig {
	/** Output format */
	format?: "json" | "xml" | "yaml" | "csv" | "custom";

	/** Include performance metrics in output */
	includeMetrics?: boolean;

	/** Include error details in output */
	includeErrors?: boolean;

	/** Include raw extracted data */
	includeRawData?: boolean;

	/** Include interpreted results */
	includeInterpretedData?: boolean;

	/** Fields to exclude from output */
	excludeFields?: string[];

	/** Fields to include in output (if specified, only these are included) */
	includeFields?: string[];

	/** Formatting options */
	formatting?: {
		indent?: number;
		pretty?: boolean;
		compressed?: boolean;
	};
}

export interface PluginConfig {
	/** Directories to search for plugins */
	searchPaths?: string[];

	/** Auto-load plugins from search paths */
	autoLoad?: boolean;

	/** Plugin loading order */
	loadOrder?: string[];

	/** Plugin-specific configurations */
	configurations?: Record<string, any>;

	/** Whether to allow native plugins */
	allowNative?: boolean;

	/** Plugin security settings */
	security?: {
		allowedExtractors?: string[];
		allowedInterpreters?: string[];
		sandboxed?: boolean;
	};
}

/**
 * Predefined configuration presets for common use cases
 */
export class AnalysisConfigPresets {
	/**
	 * Fast analysis with minimal extractors
	 */
	static fast(): AnalysisConfig {
		return {
			depth: 1,
			useCache: true,
			extractors: ["dependencies"],
			interpreters: ["dependency-analysis"],
			performance: {
				enableParallelProcessing: true,
				maxConcurrency: 4,
				enableAstReuse: true,
			},
			output: {
				format: "json",
				includeMetrics: false,
				includeErrors: true,
				includeRawData: false,
				includeInterpretedData: true,
			},
		};
	}

	/**
	 * Comprehensive analysis with all available extractors
	 */
	static comprehensive(): AnalysisConfig {
		return {
			depth: 5,
			useCache: true,
			timeout: 60000, // 60 seconds
			includeDebugInfo: true,
			performance: {
				enableParallelProcessing: true,
				maxConcurrency: 8,
				monitorMemory: true,
				enableProfiling: true,
				enableAstReuse: true,
			},
			output: {
				format: "json",
				includeMetrics: true,
				includeErrors: true,
				includeRawData: true,
				includeInterpretedData: true,
				formatting: {
					pretty: true,
					indent: 2,
				},
			},
		};
	}

	/**
	 * Development-focused analysis
	 */
	static development(): AnalysisConfig {
		return {
			depth: 3,
			useCache: true,
			extractors: ["dependencies", "identifiers", "complexity"],
			interpreters: ["dependency-analysis", "code-quality"],
			includeDebugInfo: true,
			performance: {
				enableParallelProcessing: true,
				maxConcurrency: 6,
				monitorMemory: true,
			},
			output: {
				format: "json",
				includeMetrics: true,
				includeErrors: true,
				includeInterpretedData: true,
				formatting: { pretty: true },
			},
		};
	}

	/**
	 * Production deployment analysis
	 */
	static production(): AnalysisConfig {
		return {
			depth: 2,
			useCache: true,
			timeout: 30000, // 30 seconds
			extractors: ["dependencies"],
			interpreters: ["dependency-analysis"],
			performance: {
				enableParallelProcessing: true,
				maxConcurrency: 4,
				memoryLimit: 512 * 1024 * 1024, // 512MB
				enableAstReuse: true,
			},
			output: {
				format: "json",
				includeMetrics: false,
				includeErrors: true,
				includeRawData: false,
				includeInterpretedData: true,
				formatting: { compressed: true },
			},
		};
	}

	/**
	 * Security-focused analysis
	 */
	static security(): AnalysisConfig {
		return {
			depth: 4,
			useCache: true,
			extractors: ["dependencies", "identifiers"],
			interpreters: ["security-analysis", "vulnerability-scan"],
			includeDebugInfo: true,
			performance: {
				enableParallelProcessing: false, // Security analysis may need sequential processing
				maxConcurrency: 1,
			},
			output: {
				format: "json",
				includeMetrics: true,
				includeErrors: true,
				includeInterpretedData: true,
			},
			plugins: {
				security: {
					allowedExtractors: ["dependencies", "identifiers"],
					allowedInterpreters: ["security-analysis", "vulnerability-scan"],
					sandboxed: true,
				},
			},
		};
	}
}

/**
 * Configuration validation and utilities
 */
export class AnalysisConfigUtils {
	/**
	 * Validates an analysis configuration
	 */
	static validate(config: AnalysisConfig): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		// Validate depth
		if (config.depth !== undefined) {
			if (
				!Number.isInteger(config.depth) ||
				config.depth < 1 ||
				config.depth > 5
			) {
				errors.push("depth must be an integer between 1 and 5");
			}
		}

		// Validate timeout
		if (config.timeout !== undefined) {
			if (!Number.isInteger(config.timeout) || config.timeout <= 0) {
				errors.push("timeout must be a positive integer");
			}
		}

		// Validate file size limit
		if (config.maxFileSize !== undefined) {
			if (!Number.isInteger(config.maxFileSize) || config.maxFileSize <= 0) {
				errors.push("maxFileSize must be a positive integer");
			}
		}

		// Validate cache settings
		if (config.maxCacheSize !== undefined) {
			if (!Number.isInteger(config.maxCacheSize) || config.maxCacheSize <= 0) {
				errors.push("maxCacheSize must be a positive integer");
			}
		}

		if (config.maxCacheMemory !== undefined) {
			if (
				!Number.isInteger(config.maxCacheMemory) ||
				config.maxCacheMemory <= 0
			) {
				errors.push("maxCacheMemory must be a positive integer");
			}
		}

		// Validate performance settings
		if (config.performance?.maxConcurrency !== undefined) {
			if (
				!Number.isInteger(config.performance.maxConcurrency) ||
				config.performance.maxConcurrency <= 0
			) {
				errors.push("performance.maxConcurrency must be a positive integer");
			}
		}

		if (config.performance?.memoryLimit !== undefined) {
			if (
				!Number.isInteger(config.performance.memoryLimit) ||
				config.performance.memoryLimit <= 0
			) {
				errors.push("performance.memoryLimit must be a positive integer");
			}
		}

		// Validate output format
		if (config.output?.format !== undefined) {
			const validFormats = ["json", "xml", "yaml", "csv", "custom"];
			if (!validFormats.includes(config.output.format)) {
				errors.push(`output.format must be one of: ${validFormats.join(", ")}`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Merges multiple configurations with priority
	 */
	static merge(
		base: AnalysisConfig,
		...overrides: Partial<AnalysisConfig>[]
	): AnalysisConfig {
		let result = { ...base };

		for (const override of overrides) {
			result = {
				...result,
				...override,
				extractorOptions: {
					...result.extractorOptions,
					...override.extractorOptions,
				},
				interpreterOptions: {
					...result.interpreterOptions,
					...override.interpreterOptions,
				},
				performance: {
					...result.performance,
					...override.performance,
				},
				output: {
					...result.output,
					...override.output,
				},
				plugins: {
					...result.plugins,
					...override.plugins,
				},
			};
		}

		return result;
	}

	/**
	 * Creates a default configuration
	 */
	static default(): AnalysisConfig {
		return {
			depth: 3,
			useCache: true,
			maxCacheSize: 1000,
			maxCacheMemory: 100 * 1024 * 1024, // 100MB
			cacheTtl: 3600000, // 1 hour
			timeout: 30000, // 30 seconds
			maxFileSize: 10 * 1024 * 1024, // 10MB
			performance: {
				enableParallelProcessing: true,
				maxConcurrency: 4,
				monitorMemory: true,
				memoryLimit: 512 * 1024 * 1024, // 512MB
				enableAstReuse: true,
				enableIncrementalAnalysis: true,
			},
			output: {
				format: "json",
				includeMetrics: true,
				includeErrors: true,
				includeInterpretedData: true,
				formatting: {
					pretty: true,
					indent: 2,
				},
			},
			plugins: {
				autoLoad: true,
				allowNative: false,
				security: {
					sandboxed: true,
				},
			},
		};
	}

	/**
	 * Optimizes configuration for specific use case
	 */
	static optimize(
		config: AnalysisConfig,
		useCase: "speed" | "memory" | "accuracy",
	): AnalysisConfig {
		const optimized = { ...config };

		switch (useCase) {
			case "speed":
				optimized.depth = Math.min(optimized.depth || 3, 2) as AnalysisDepth;
				optimized.useCache = true;
				optimized.performance = {
					...optimized.performance,
					enableParallelProcessing: true,
					maxConcurrency: 8,
					enableAstReuse: true,
				};
				optimized.output = {
					...optimized.output,
					includeRawData: false,
					formatting: { compressed: true },
				};
				break;

			case "memory":
				optimized.maxCacheSize = Math.min(optimized.maxCacheSize || 1000, 100);
				optimized.maxCacheMemory = Math.min(
					optimized.maxCacheMemory || 100 * 1024 * 1024,
					50 * 1024 * 1024,
				);
				optimized.performance = {
					...optimized.performance,
					maxConcurrency: 2,
					memoryLimit: 256 * 1024 * 1024, // 256MB
					monitorMemory: true,
				};
				break;

			case "accuracy":
				optimized.depth = 5;
				optimized.includeDebugInfo = true;
				optimized.timeout = 120000; // 2 minutes
				optimized.performance = {
					...optimized.performance,
					enableProfiling: true,
				};
				optimized.output = {
					...optimized.output,
					includeMetrics: true,
					includeRawData: true,
					includeInterpretedData: true,
				};
				break;
		}

		return optimized;
	}
}
