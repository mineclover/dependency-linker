/**
 * AnalysisEngineFactory implementation
 * Factory and builder for creating configured analysis engines
 */

import type { IDataExtractor } from "../extractors/IDataExtractor";
import type { IDataInterpreter } from "../interpreters/IDataInterpreter";
import {
	type AnalysisConfig,
	type AnalysisDepth,
	createComprehensiveAnalysisConfig,
	createDefaultAnalysisConfig,
	createDevelopmentAnalysisConfig,
	createFastAnalysisConfig,
	createProductionAnalysisConfig,
	createSecurityAnalysisConfig,
	mergeAnalysisConfigs,
} from "../models/AnalysisConfig";
import { AnalysisEngine } from "./AnalysisEngine";
import type {
	IAnalysisEngineBuilder,
	IAnalysisEngineEvents,
	IAnalysisEngineFactory,
} from "./IAnalysisEngine";

export class AnalysisEngineFactory implements IAnalysisEngineFactory {
	private static readonly PRESETS: Record<string, () => AnalysisConfig> = {
		fast: () => createFastAnalysisConfig(),
		comprehensive: () => createComprehensiveAnalysisConfig(),
		development: () => createDevelopmentAnalysisConfig(),
		production: () => createProductionAnalysisConfig(),
		security: () => createSecurityAnalysisConfig(),
	};

	/**
	 * Creates a new analysis engine instance
	 */
	create(
		config?: AnalysisConfig,
		events?: IAnalysisEngineEvents,
	): AnalysisEngine {
		const engine = new AnalysisEngine(config);

		// TODO: Implement event system integration
		if (events) {
			this.attachEvents(engine, events);
		}

		return engine;
	}

	/**
	 * Creates an analysis engine with predefined configuration preset
	 */
	createWithPreset(
		preset:
			| "fast"
			| "comprehensive"
			| "development"
			| "production"
			| "security",
		events?: IAnalysisEngineEvents,
	): AnalysisEngine {
		const presetConfig = AnalysisEngineFactory.PRESETS[preset];

		if (!presetConfig) {
			throw new Error(`Unknown preset: ${preset}`);
		}

		return this.create(presetConfig(), events);
	}

	/**
	 * Gets available configuration presets
	 */
	getAvailablePresets(): string[] {
		return Object.keys(AnalysisEngineFactory.PRESETS);
	}

	/**
	 * Creates a builder for fluent configuration
	 */
	createBuilder(): IAnalysisEngineBuilder {
		return new AnalysisEngineBuilder();
	}

	/**
	 * Creates multiple engines with different configurations
	 */
	createMultiple(
		configs: Array<{ config: AnalysisConfig; events?: IAnalysisEngineEvents }>,
	): AnalysisEngine[] {
		return configs.map(({ config, events }) => this.create(config, events));
	}

	/**
	 * Creates an engine optimized for a specific language
	 */
	createForLanguage(
		language: string,
		config?: Partial<AnalysisConfig>,
	): AnalysisEngine {
		const baseConfig = this.createLanguageOptimizedConfig(language);
		const mergedConfig = config
			? mergeAnalysisConfigs(baseConfig, config)
			: baseConfig;

		return this.create(mergedConfig);
	}

	/**
	 * Validates engine configuration
	 */
	validateConfiguration(config: AnalysisConfig): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (config.maxCacheSize && config.maxCacheSize < 0) {
			errors.push("maxCacheSize must be positive");
		}

		if (config.depth && (config.depth < 1 || config.depth > 5)) {
			errors.push("depth must be between 1 and 5");
		}

		// Validate extractor and interpreter names exist
		if (config.extractors) {
			// TODO: Add validation against available extractors
		}

		if (config.interpreters) {
			// TODO: Add validation against available interpreters
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private attachEvents(
		_engine: AnalysisEngine,
		_events: IAnalysisEngineEvents,
	): void {
		// TODO: Implement event system
		// This would involve extending AnalysisEngine with event emitter capabilities
		console.log("Event system integration not yet implemented");
	}

	private createLanguageOptimizedConfig(language: string): AnalysisConfig {
		const config = createDefaultAnalysisConfig();

		switch (language.toLowerCase()) {
			case "typescript":
			case "javascript":
				config.extractors = ["dependency", "identifier", "complexity"];
				config.interpreters = ["dependency-analyzer", "code-quality"];
				break;

			case "go":
				config.extractors = ["dependency", "identifier"];
				config.interpreters = ["dependency-analyzer"];
				break;

			case "java":
				config.extractors = ["dependency", "identifier", "complexity"];
				config.interpreters = ["dependency-analyzer", "security-analyzer"];
				break;

			default:
				// Use comprehensive config for unknown languages
				return createComprehensiveAnalysisConfig();
		}

		return config;
	}
}

export class AnalysisEngineBuilder implements IAnalysisEngineBuilder {
	private config: AnalysisConfig = createDefaultAnalysisConfig();
	private extractors: Map<string, IDataExtractor<any>> = new Map();
	private interpreters: Map<string, IDataInterpreter<any, any>> = new Map();
	private events?: IAnalysisEngineEvents;
	private cacheEnabled: boolean = false;
	private cacheSize: number = 100;

	/**
	 * Sets the configuration
	 */
	withConfig(config: AnalysisConfig): IAnalysisEngineBuilder {
		this.config = config;
		return this;
	}

	/**
	 * Adds an extractor
	 */
	withExtractor<T>(
		name: string,
		extractor: IDataExtractor<T>,
	): IAnalysisEngineBuilder {
		this.extractors.set(name, extractor);
		return this;
	}

	/**
	 * Adds an interpreter
	 */
	withInterpreter<TInput, TOutput>(
		name: string,
		interpreter: IDataInterpreter<TInput, TOutput>,
	): IAnalysisEngineBuilder {
		this.interpreters.set(name, interpreter);
		return this;
	}

	/**
	 * Sets event handlers
	 */
	withEvents(events: IAnalysisEngineEvents): IAnalysisEngineBuilder {
		this.events = events;
		return this;
	}

	/**
	 * Enables cache
	 */
	withCache(enabled: boolean): IAnalysisEngineBuilder {
		this.cacheEnabled = enabled;
		this.config.useCache = enabled;
		return this;
	}

	/**
	 * Sets cache size
	 */
	withCacheSize(maxSize: number): IAnalysisEngineBuilder {
		this.cacheSize = maxSize;
		this.config.maxCacheSize = maxSize;
		return this;
	}

	/**
	 * Sets language focus
	 */
	withLanguage(language: string): IAnalysisEngineBuilder {
		this.config.language = language;
		return this;
	}

	/**
	 * Sets analysis depth
	 */
	withDepth(depth: number): IAnalysisEngineBuilder {
		if (depth < 1 || depth > 5) {
			throw new Error("Depth must be between 1 and 5");
		}
		this.config.depth = depth as AnalysisDepth;
		return this;
	}

	/**
	 * Enables debug information
	 */
	withDebugInfo(enabled: boolean = true): IAnalysisEngineBuilder {
		this.config.includeDebugInfo = enabled;
		return this;
	}

	/**
	 * Uses a preset configuration as base
	 */
	withPreset(
		preset:
			| "fast"
			| "comprehensive"
			| "development"
			| "production"
			| "security",
	): IAnalysisEngineBuilder {
		const factory = new AnalysisEngineFactory();
		const presetConfig = factory.createWithPreset(preset).getDefaultConfig();
		this.config = mergeAnalysisConfigs(presetConfig, this.config);
		return this;
	}

	/**
	 * Builds the analysis engine
	 */
	build(): AnalysisEngine {
		const engine = new AnalysisEngine(this.config);

		// Register extractors
		for (const [name, extractor] of this.extractors) {
			engine.registerExtractor(name, extractor);
		}

		// Register interpreters
		for (const [name, interpreter] of this.interpreters) {
			engine.registerInterpreter(name, interpreter);
		}

		// TODO: Attach events
		if (this.events) {
			// Implement event attachment
		}

		return engine;
	}
}
