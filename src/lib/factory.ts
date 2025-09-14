/**
 * Convenience Factory Functions - Phase 3.12
 * Factory functions for creating and configuring analysis components
 */

import { ComplexityExtractor } from "../extractors/ComplexityExtractor";
// Built-in extractors
import { DependencyExtractor } from "../extractors/DependencyExtractor";
import { IdentifierExtractor } from "../extractors/IdentifierExtractor";
// Built-in interpreters
import { DependencyAnalysisInterpreter } from "../interpreters/DependencyAnalysisInterpreter";
import { IdentifierAnalysisInterpreter } from "../interpreters/IdentifierAnalysisInterpreter";
import type { AnalysisConfig } from "../models/AnalysisConfig";
import type { CacheConfiguration } from "../models/CacheEntry";
import { GoParser } from "../parsers/GoParser";
import { JavaParser } from "../parsers/JavaParser";
import { JavaScriptParser } from "../parsers/JavaScriptParser";
// Built-in parsers
import { TypeScriptParser } from "../parsers/TypeScriptParser";
import type { AnalysisEngine } from "../services/AnalysisEngine";
import { AnalysisEngineFactory } from "../services/AnalysisEngineFactory";
import { CacheManager } from "../services/CacheManager";
import { ExtractorRegistry } from "../services/ExtractorRegistry";
import { InterpreterRegistry } from "../services/InterpreterRegistry";
import { ParserRegistry } from "../services/ParserRegistry";

/**
 * Create a fully configured AnalysisEngine with default settings
 */
export function createAnalysisEngine(
	config?: Partial<AnalysisConfig>,
): AnalysisEngine {
	const factory = new AnalysisEngineFactory();
	return factory.create(config as AnalysisConfig);
}

/**
 * Create a AnalysisEngine with all built-in components registered
 */
export function createDefaultAnalysisEngine(
	config?: Partial<AnalysisConfig>,
): AnalysisEngine {
	const factory = new AnalysisEngineFactory();
	const engine = factory.create(config as AnalysisConfig);

	// Register built-in extractors directly on engine
	engine.registerExtractor("dependency", new DependencyExtractor());
	engine.registerExtractor("identifier", new IdentifierExtractor());
	engine.registerExtractor("complexity", new ComplexityExtractor());

	// Register built-in interpreters directly on engine
	engine.registerInterpreter(
		"dependency-analysis",
		new DependencyAnalysisInterpreter(),
	);
	engine.registerInterpreter(
		"identifier-analysis",
		new IdentifierAnalysisInterpreter(),
	);

	return engine;
}

/**
 * Create a minimal AnalysisEngine for custom configurations
 */
export function createMinimalAnalysisEngine(
	config?: Partial<AnalysisConfig>,
): AnalysisEngine {
	const factory = new AnalysisEngineFactory();
	const minimalConfig = {
		...config,
		useCache: false,
		maxCacheSize: 0,
		maxCacheMemory: 0,
	};
	return factory.create(minimalConfig as AnalysisConfig);
}

/**
 * Register all default parsers
 */
export function registerDefaultParsers(registry: ParserRegistry): void {
	registry.register(new TypeScriptParser());
	registry.register(new JavaScriptParser());
	registry.register(new GoParser());
	registry.register(new JavaParser());
}

/**
 * Register all default extractors
 */
export function registerDefaultExtractors(registry: ExtractorRegistry): void {
	registry.register("dependency", new DependencyExtractor());
	registry.register("identifier", new IdentifierExtractor());
	registry.register("complexity", new ComplexityExtractor());
}

/**
 * Register all default interpreters
 */
export function registerDefaultInterpreters(
	registry: InterpreterRegistry,
): void {
	registry.register("dependency-analysis", new DependencyAnalysisInterpreter());
	registry.register("identifier-analysis", new IdentifierAnalysisInterpreter());
}

/**
 * Create a ParserRegistry with default parsers
 */
export function createDefaultParserRegistry(): ParserRegistry {
	const registry = new ParserRegistry();
	registerDefaultParsers(registry);
	return registry;
}

/**
 * Create an ExtractorRegistry with default extractors
 */
export function createDefaultExtractorRegistry(): ExtractorRegistry {
	const registry = new ExtractorRegistry();
	registerDefaultExtractors(registry);
	return registry;
}

/**
 * Create an InterpreterRegistry with default interpreters
 */
export function createDefaultInterpreterRegistry(): InterpreterRegistry {
	const registry = new InterpreterRegistry();
	registerDefaultInterpreters(registry);
	return registry;
}

/**
 * Create a CacheManager with default configuration
 */
export function createDefaultCacheManager(
	config?: Partial<CacheConfiguration>,
): CacheManager {
	return new CacheManager({
		maxSize: 100,
		defaultTtl: 300000, // 5 minutes
		enableCompression: false,
		enablePersistence: false,
		persistencePath: "./cache",
		cleanupInterval: 60000, // 1 minute
		...config,
	});
}
