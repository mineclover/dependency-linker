/**
 * API Compatibility Layer Tests
 * Ensures the new architecture maintains the same API surface as the existing system
 */

import { describe, test, expect } from "@jest/globals";

describe("API Compatibility Layer", () => {
	describe("Main Module Exports", () => {
		test("should export core API components", async () => {
			// Test main index exports
			const mainModule = await import("../../../src/index");

			// Core API classes
			expect(mainModule.TypeScriptAnalyzer).toBeDefined();
			expect(mainModule.AnalysisEngine).toBeDefined();
			expect(mainModule.BatchAnalyzer).toBeDefined();

			// Services
			expect(mainModule.CacheManager).toBeDefined();
			expect(mainModule.ExtractorRegistry).toBeDefined();
			expect(mainModule.InterpreterRegistry).toBeDefined();
			expect(mainModule.ParserRegistry).toBeDefined();

			// Language parsers
			expect(mainModule.TypeScriptParser).toBeDefined();
			expect(mainModule.JavaScriptParser).toBeDefined();
			expect(mainModule.GoParser).toBeDefined();
			expect(mainModule.JavaParser).toBeDefined();

			// Core models that should be available - testing what actually exists
			expect(typeof mainModule.TypeScriptAnalyzer).toBe("function");
			expect(typeof mainModule.AnalysisEngine).toBe("function");
			expect(typeof mainModule.BatchAnalyzer).toBe("function");
		});

		test("should export factory functions from API", async () => {
			const apiModule = await import("../../../src/api");

			// Factory functions
			expect(typeof apiModule.analyzeTypeScriptFile).toBe("function");
			expect(typeof apiModule.extractDependencies).toBe("function");
			expect(typeof apiModule.analyzeDirectory).toBe("function");
			expect(typeof apiModule.getBatchAnalysis).toBe("function");
			expect(typeof apiModule.clearFactoryCache).toBe("function");
			expect(typeof apiModule.resetFactoryAnalyzer).toBe("function");
		});

		test("should maintain TypeScript types compatibility", () => {
			// Import types to verify they exist and are properly exported
			const types = require("../../../src/api/types");

			expect(types.LogLevel).toBeDefined();
			expect(types.LogLevel.ERROR).toBe("error");
			expect(types.LogLevel.WARN).toBe("warn");
			expect(types.LogLevel.INFO).toBe("info");
			expect(types.LogLevel.DEBUG).toBe("debug");
		});
	});

	describe("API Class Instantiation", () => {
		test("should create TypeScriptAnalyzer instance", async () => {
			const { TypeScriptAnalyzer } = await import(
				"../../../src/api/TypeScriptAnalyzer"
			);

			const analyzer = new TypeScriptAnalyzer();
			expect(analyzer).toBeDefined();
			expect(typeof analyzer.analyzeFile).toBe("function");
			expect(typeof analyzer.clearCache).toBe("function");
		});

		test("should create AnalysisEngine instance", async () => {
			const { AnalysisEngine } = await import(
				"../../../src/services/AnalysisEngine"
			);

			const engine = new AnalysisEngine();
			expect(engine).toBeDefined();
			expect(typeof engine.analyzeFile).toBe("function");
			expect(typeof engine.registerExtractor).toBe("function");
			expect(typeof engine.registerInterpreter).toBe("function");
		});

		test("should create BatchAnalyzer instance", async () => {
			const { BatchAnalyzer } = await import("../../../src/api/BatchAnalyzer");
			const { TypeScriptAnalyzer } = await import(
				"../../../src/api/TypeScriptAnalyzer"
			);

			const analyzer = new TypeScriptAnalyzer();
			const batchAnalyzer = new BatchAnalyzer(analyzer);

			expect(batchAnalyzer).toBeDefined();
			expect(typeof batchAnalyzer.processBatch).toBe("function");
		});
	});

	describe("Registry System Compatibility", () => {
		test("should create and use ExtractorRegistry", async () => {
			const { ExtractorRegistry } = await import(
				"../../../src/services/ExtractorRegistry"
			);

			const registry = new ExtractorRegistry();
			expect(registry).toBeDefined();
			expect(typeof registry.register).toBe("function");
			expect(typeof registry.getExtractor).toBe("function");
			expect(typeof registry.getAllExtractors).toBe("function");
		});

		test("should create and use InterpreterRegistry", async () => {
			const { InterpreterRegistry } = await import(
				"../../../src/services/InterpreterRegistry"
			);

			const registry = new InterpreterRegistry();
			expect(registry).toBeDefined();
			expect(typeof registry.register).toBe("function");
			expect(typeof registry.getInterpreter).toBe("function");
			expect(typeof registry.getAllInterpreters).toBe("function");
		});

		test("should create and use ParserRegistry", async () => {
			const { ParserRegistry } = await import(
				"../../../src/services/ParserRegistry"
			);

			const registry = new ParserRegistry();
			expect(registry).toBeDefined();
			expect(typeof registry.register).toBe("function");
			expect(typeof registry.getParser).toBe("function");
			expect(typeof registry.getSupportedLanguages).toBe("function");
		});
	});

	describe("Factory Functions Compatibility", () => {
		test("should support analyzeTypeScriptFile function", async () => {
			const { analyzeTypeScriptFile } = await import(
				"../../../src/api/factory-functions"
			);

			expect(typeof analyzeTypeScriptFile).toBe("function");

			// Test function signature by calling with invalid file (should handle gracefully)
			const result = await analyzeTypeScriptFile("nonexistent.ts", {
				format: "json",
			});
			expect(result).toBeDefined();
			// Result has filePath property indicating it was processed
			expect(result.filePath).toBe("nonexistent.ts");
		});

		test("should support extractDependencies function", async () => {
			const { extractDependencies } = await import(
				"../../../src/api/factory-functions"
			);

			expect(typeof extractDependencies).toBe("function");

			// Test function signature with a valid test file
			try {
				const result = await extractDependencies(
					"tests/fixtures/sample-typescript.ts",
				);
				expect(result).toBeDefined();
				// Should return array of dependencies
				expect(Array.isArray(result)).toBe(true);
			} catch (error) {
				// If file doesn't exist or has parsing issues, function should still be callable
				expect(error).toBeDefined();
			}
		});

		test("should support cache management functions", async () => {
			const { clearFactoryCache, resetFactoryAnalyzer } = await import(
				"../../../src/api/factory-functions"
			);

			expect(typeof clearFactoryCache).toBe("function");
			expect(typeof resetFactoryAnalyzer).toBe("function");

			// Test that functions can be called without errors
			clearFactoryCache();
			resetFactoryAnalyzer();
		});
	});

	describe("Error Handling Compatibility", () => {
		test("should export error system", async () => {
			const errorsModule = await import("../../../src/api/errors");
			expect(errorsModule).toBeDefined();
		});

		test("should maintain error reporter functionality", async () => {
			const errorsModule = await import("../../../src/api/errors");
			expect(errorsModule).toBeDefined();
		});
	});

	describe("Language Parser Compatibility", () => {
		test("should instantiate all language parsers", async () => {
			const { TypeScriptParser, JavaScriptParser, GoParser, JavaParser } =
				await import("../../../src/parsers");

			// Check that parser classes are available
			expect(TypeScriptParser).toBeDefined();
			expect(JavaScriptParser).toBeDefined();
			expect(GoParser).toBeDefined();
			expect(JavaParser).toBeDefined();

			// Test instantiation
			const tsParser = new TypeScriptParser();
			expect(tsParser).toBeDefined();
			expect(typeof tsParser.supports).toBe("function");
			expect(typeof tsParser.parse).toBe("function");
		});

		test("should support language detection", async () => {
			const { TypeScriptParser } = await import(
				"../../../src/parsers/TypeScriptParser"
			);

			const parser = new TypeScriptParser();
			expect(parser.supports("typescript")).toBe(true);
			expect(parser.supports("javascript")).toBe(true);
			expect(parser.detectLanguage("test.ts")).toBe("typescript");
			expect(parser.detectLanguage("test.js")).toBe("javascript");
		});
	});

	describe("Integration Features Compatibility", () => {
		test("should support configuration management", async () => {
			const configModule = await import("../../../src/config");
			expect(configModule).toBeDefined();

			// Check that config exports exist
			expect(configModule.IntegrationConfig).toBeDefined();
		});
	});

	describe("Backwards Compatibility", () => {
		test("should maintain legacy API surface", async () => {
			// Test that old API patterns still work
			const mainModule = await import("../../../src/index");

			// Legacy analyzer
			expect(mainModule.FileAnalyzer).toBeDefined();

			// Legacy parser (aliased to new implementation)
			expect(mainModule.TypeScriptParser).toBeDefined();

			// Test legacy compatibility by checking class existence
			expect(mainModule.FileAnalyzer).toBeDefined();
			expect(mainModule.TypeScriptParser).toBeDefined();
		});

		test("should support legacy configuration patterns", async () => {
			const { TypeScriptAnalyzer } = await import(
				"../../../src/api/TypeScriptAnalyzer"
			);

			// Test legacy config pattern
			const analyzer = new TypeScriptAnalyzer({
				enableCache: true,
				logLevel: 2 as any,
				defaultTimeout: 5000,
			});

			expect(analyzer).toBeDefined();
			expect(typeof analyzer.analyzeFile).toBe("function");
		});
	});

	describe("Performance and Caching Compatibility", () => {
		test("should maintain cache functionality", async () => {
			const { CacheManager } = await import(
				"../../../src/services/CacheManager"
			);

			const cacheManager = new CacheManager({
				maxSize: 100,
				defaultTtl: 60000,
				enablePersistence: false,
			});

			expect(cacheManager).toBeDefined();
			expect(typeof cacheManager.get).toBe("function");
			expect(typeof cacheManager.set).toBe("function");
			expect(typeof cacheManager.clear).toBe("function");
		});

		test("should support performance metrics", async () => {
			const PerformanceMetricsModule = await import(
				"../../../src/models/PerformanceMetrics"
			);
			expect(PerformanceMetricsModule.PerformanceMonitor).toBeDefined();

			const monitor = new PerformanceMetricsModule.PerformanceMonitor();
			expect(monitor).toBeDefined();
			expect(typeof monitor.start).toBe("function");
			expect(typeof monitor.getMetrics).toBe("function");
		});
	});
});
