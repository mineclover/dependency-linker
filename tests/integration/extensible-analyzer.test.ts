/**
 * Extensible Analyzer Integration Test
 * Tests the basic extensibility and plugin architecture of the analysis engine
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import { AnalysisEngine } from "../../src/services/analysis-engine";
import type { IDataExtractor } from "../../src/extractors/IDataExtractor";
import type { IDataInterpreter } from "../../src/interpreters/IDataInterpreter";
import type { AnalysisConfig } from "../../src/models/AnalysisConfig";
import {
	TestIsolationManager,
	setupTestIsolation,
} from "../helpers/test-isolation";

// Simple test extractor for basic extensibility testing
class TestExtractor implements IDataExtractor<any> {
	extract(ast: any, filePath: string): any {
		return {
			nodeCount: this.countNodes(ast),
			filePath,
			extractorName: "test-extractor"
		};
	}

	supports(dataType: string): boolean {
		return true;
	}

	getName(): string {
		return "test-extractor";
	}

	getVersion(): string {
		return "1.0.0";
	}

	validate(input: any): any {
		return { isValid: true, errors: [], warnings: [] };
	}

	getOutputSchema(): any {
		return { type: "object", properties: {}, required: [], version: "1.0.0" };
	}

	getMetadata(): any {
		return {
			name: "test-extractor",
			version: "1.0.0",
			description: "Test extractor for basic functionality",
			supportedDataTypes: ["ast"],
			outputType: "test-data",
			dependencies: [],
			performance: { averageTimePerItem: 1, memoryUsage: "low", timeComplexity: "linear", scalability: "excellent", maxRecommendedDataSize: 1000000 },
			quality: { accuracy: 1, consistency: 1, completeness: 1, reliability: 1 }
		};
	}

	configure(options: any): void {}

	getConfiguration(): any {
		return {};
	}

	getSupportedDataTypes(): string[] {
		return ["ast"];
	}

	getDependencies(): any[] {
		return [];
	}

	dispose(): void {}

	private countNodes(ast: any): number {
		if (!ast || typeof ast !== 'object') return 1;
		let count = 1;
		for (const key in ast) {
			if (ast[key] && typeof ast[key] === 'object') {
				count += this.countNodes(ast[key]);
			}
		}
		return count;
	}
}

// Simple test interpreter for basic extensibility testing
class TestInterpreter implements IDataInterpreter<any, any> {
	interpret(data: any, context: any): any {
		return {
			complexity: data?.nodeCount > 100 ? "high" : "low",
			recommendation: data?.nodeCount > 100 ? "Consider refactoring" : "Code looks good",
			interpreterName: "test-interpreter"
		};
	}

	supports(dataType: string): boolean {
		return true;
	}

	getName(): string {
		return "test-interpreter";
	}

	getVersion(): string {
		return "1.0.0";
	}

	validate(input: any): any {
		return { isValid: true, errors: [], warnings: [] };
	}

	validateOutput(output: any): any {
		return { isValid: true, errors: [], warnings: [] };
	}

	getOutputSchema(): any {
		return { type: "object", properties: {}, required: [], version: "1.0.0" };
	}

	getMetadata(): any {
		return {
			name: "test-interpreter",
			version: "1.0.0",
			description: "Test interpreter for basic functionality",
			supportedDataTypes: ["test-data"],
			outputType: "analysis-result",
			dependencies: [],
			performance: { averageTimePerItem: 1, memoryUsage: "low", timeComplexity: "linear", scalability: "excellent", maxRecommendedDataSize: 1000000 },
			quality: { accuracy: 1, consistency: 1, completeness: 1, reliability: 1 }
		};
	}

	configure(options: any): void {}

	getConfiguration(): any {
		return {};
	}

	getSupportedDataTypes(): string[] {
		return ["test-data"];
	}

	getDependencies(): any[] {
		return [];
	}

	dispose(): void {}
}

describe("Extensible Analyzer Integration", () => {
	let engine: AnalysisEngine;
	let isolationManager: TestIsolationManager;

	beforeEach(async () => {
		isolationManager = new TestIsolationManager();
		engine = TestIsolationManager.createEngine();
	});

	afterEach(async () => {
		await TestIsolationManager.cleanup();
	});

	describe("Basic Plugin Registration", () => {
		test("should register custom extractor successfully", async () => {
			const testExtractor = new TestExtractor();

			engine.registerExtractor("test-extractor", testExtractor);

			const extractors = engine.getRegisteredExtractors();
			expect(extractors.has("test-extractor")).toBe(true);
		});

		test("should register custom interpreter successfully", async () => {
			const testInterpreter = new TestInterpreter();

			engine.registerInterpreter("test-interpreter", testInterpreter);

			const interpreters = engine.getRegisteredInterpreters();
			expect(interpreters.has("test-interpreter")).toBe(true);
		});

		test("should allow registration of multiple custom plugins", async () => {
			engine.registerExtractor("test-extractor-1", new TestExtractor());
			engine.registerExtractor("test-extractor-2", new TestExtractor());
			engine.registerInterpreter("test-interpreter-1", new TestInterpreter());

			const extractors = engine.getRegisteredExtractors();
			const interpreters = engine.getRegisteredInterpreters();

			expect(extractors.has("test-extractor-1")).toBe(true);
			expect(extractors.has("test-extractor-2")).toBe(true);
			expect(interpreters.has("test-interpreter-1")).toBe(true);
		});
	});

	describe("Basic Plugin Execution", () => {
		test("should execute custom extractor during analysis", async () => {
			try {
				engine.registerExtractor("test-extractor", new TestExtractor());

				// Debug: Check what parser would be used for TypeScript
				const parserRegistry = (engine as any).parserRegistry;
				const detectedParser = parserRegistry.detectAndGetParser("tests/fixtures/sample-typescript.ts");
				console.log("Detected parser for TS file:", detectedParser?.constructor?.name || "none");

				// Debug: Check all parsers
				const allParsers = parserRegistry.getAllParsers();
				console.log("All registered parsers:", Array.from(allParsers.keys()));

				const result = await engine.analyzeFile(
					"tests/fixtures/sample-typescript.ts",
					{
						extractors: ["test-extractor"],
						interpreters: [],
					},
				);

				console.log("Result:", JSON.stringify(result, null, 2));

				expect(result.extractedData["test-extractor"]).toBeDefined();
				expect(result.extractedData["test-extractor"].extractorName).toBe("test-extractor");
				expect(result.extractedData["test-extractor"].nodeCount).toBeGreaterThan(0);
			} catch (error) {
				console.error("Test error:", error);
				throw error;
			}
		});

		test("should execute custom interpreter during analysis", async () => {
			engine.registerExtractor("test-extractor", new TestExtractor());
			engine.registerInterpreter("test-interpreter", new TestInterpreter());

			const result = await engine.analyzeFile(
				"tests/fixtures/sample-typescript.ts",
				{
					extractors: ["test-extractor"],
					interpreters: ["test-interpreter"],
				},
			);

			expect(result.interpretedData["test-interpreter"]).toBeDefined();
			expect(result.interpretedData["test-interpreter"].interpreterName).toBe("test-interpreter");
			expect(result.interpretedData["test-interpreter"].complexity).toBeDefined();
		});

		test("should execute both built-in and custom plugins together", async () => {
			engine.registerExtractor("test-extractor", new TestExtractor());

			const result = await engine.analyzeFile(
				"tests/fixtures/sample-typescript.ts",
				{
					extractors: ["dependency", "test-extractor"],
					interpreters: ["dependency-analysis"],
				},
			);

			// Built-in extractor should work
			expect(result.extractedData.dependency).toBeDefined();
			// Custom extractor should work
			expect(result.extractedData["test-extractor"]).toBeDefined();
			// Built-in interpreter should work
			expect(result.interpretedData["dependency-analysis"]).toBeDefined();
		});
	});

	describe("Plugin Lifecycle Management", () => {
		test("should unregister plugins successfully", async () => {
			engine.registerExtractor("test-extractor", new TestExtractor());
			expect(engine.getRegisteredExtractors().has("test-extractor")).toBe(true);

			const unregistered = engine.unregisterExtractor("test-extractor");
			expect(unregistered).toBe(true);
			expect(engine.getRegisteredExtractors().has("test-extractor")).toBe(false);
		});

		test("should handle unregistering non-existent plugins", async () => {
			const unregistered = engine.unregisterExtractor("non-existent");
			expect(unregistered).toBe(false);
		});
	});

	describe("Plugin Discovery and Metadata", () => {
		test("should provide plugin metadata", async () => {
			engine.registerExtractor("test-extractor", new TestExtractor());
			engine.registerInterpreter("test-interpreter", new TestInterpreter());

			const extractors = engine.getRegisteredExtractors();
			const interpreters = engine.getRegisteredInterpreters();

			expect(extractors.size).toBeGreaterThan(0);
			expect(interpreters.size).toBeGreaterThan(0);
			expect(extractors.has("test-extractor")).toBe(true);
			expect(interpreters.has("test-interpreter")).toBe(true);
		});
	});
});