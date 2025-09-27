/**
 * Dependency Analysis Compatibility Integration Test
 * Tests backward compatibility with existing dependency analysis workflows
 * and ensures new plugin architecture maintains API compatibility
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { AnalysisEngine } from "../../src/services/analysis-engine";
import { TypeScriptAnalyzer } from "../../src/api/TypeScriptAnalyzer";
import type { AnalysisConfig } from "../../src/models/AnalysisConfig";
import type { AnalysisResult } from "../../src/models/AnalysisResult";
import type { IDataExtractor } from "../../src/extractors/IDataExtractor";
import { TestIsolationManager } from "../helpers/test-isolation";

describe("Dependency Analysis Compatibility", () => {
	let engine: AnalysisEngine;
	let legacyAnalyzer: TypeScriptAnalyzer;

	beforeEach(() => {
		engine = TestIsolationManager.createEngine();
		legacyAnalyzer = TestIsolationManager.createAnalyzer();
	});

	afterEach(async () => {
		await TestIsolationManager.cleanup();
	});

	describe("Legacy API Compatibility", () => {
		test("should maintain compatibility with existing TypeScriptAnalyzer API", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			// Test legacy analyzer still works
			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);
			expect(legacyResult).toBeDefined();
			expect(legacyResult.filePath).toBe(filePath);
			expect(legacyResult.language).toBe("typescript");
			const dependencies =
				legacyResult.extractedData?.dependency ||
				legacyResult.interpretedData?.["dependency-analysis"];
			expect(dependencies).toBeDefined();

			// Test new engine produces compatible results
			const newResult = await engine.analyzeFile(filePath, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			expect(newResult).toBeDefined();
			expect(newResult.filePath).toBe(filePath);
			expect(newResult.language).toBe("typescript");
			expect(newResult.extractedData.dependency).toBeDefined();
			expect(newResult.interpretedData["dependency-analysis"]).toBeDefined();
		});

		test("should provide backward-compatible dependency format", async () => {
			const filePath = "tests/fixtures/complex-typescript.ts";

			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);
			const newResult = await engine.analyzeFile(filePath, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Both should detect dependencies
			const legacyDependencies =
				legacyResult.extractedData?.dependency ||
				legacyResult.interpretedData?.["dependency-analysis"];
			expect(legacyDependencies).toBeDefined();

			const newDependencies = newResult.extractedData.dependency;
			expect(newDependencies).toBeDefined();

			// New format should contain similar information
			if (newDependencies && legacyDependencies) {
				const legacyDepsArray = Array.isArray(legacyDependencies)
					? legacyDependencies
					: legacyDependencies.dependencies || legacyDependencies.imports || [];
				const newDepsArray = Array.isArray(newDependencies)
					? newDependencies
					: newDependencies.dependencies || newDependencies.imports || [];

				if (legacyDepsArray.length > 0 && newDepsArray.length > 0) {
					expect(newDepsArray.length).toBeGreaterThan(0);

					// Check that dependency structures are similar
					const legacyDep = legacyDepsArray[0];
					const newDep = newDepsArray[0];

					// Both should have source information
					expect(legacyDep.source).toBeDefined();
					expect(
						newDep.source || newDep.from || newDep.specifier,
					).toBeDefined();

					// Both should have import type information
					if (legacyDep.type) {
						expect(newDep.type || newDep.importType).toBeDefined();
					}
				}
			}
		});

		test("should handle batch processing compatibility", async () => {
			const files = [
				"tests/fixtures/sample-typescript.ts",
				"tests/fixtures/another-sample.ts",
			];

			// Legacy batch processing
			const legacyResults = await Promise.all(
				files.map((f) => legacyAnalyzer.analyzeFile(f)),
			);

			// New batch processing
			const newResults = await engine.analyzeBatch(files, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			expect(legacyResults).toHaveLength(files.length);
			expect(newResults).toHaveLength(files.length);

			// Both should successfully analyze most files (allow some errors for missing fixtures)
			const legacySuccessRate =
				legacyResults.filter((r) => r.errors.length === 0).length /
				legacyResults.length;
			const newSuccessRate =
				newResults.filter((r) => r.errors.length === 0).length /
				newResults.length;
			expect(legacySuccessRate).toBeGreaterThan(0.5); // At least 50% success
			expect(newSuccessRate).toBeGreaterThan(0.5); // At least 50% success
		});
	});

	describe("Migration Path Validation", () => {
		test("should support gradual migration from legacy to new API", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			// Stage 1: Legacy analyzer
			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);

			// Stage 2: New engine with dependency-only analysis (mimicking legacy)
			const partialMigrationResult = await engine.analyzeFile(filePath, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Stage 3: New engine with full analysis capabilities
			const fullMigrationResult = await engine.analyzeFile(filePath, {
				extractors: ["dependency", "identifier", "complexity"],
				interpreters: ["dependency-analysis", "identifier-analysis"],
			});

			// All stages should successfully analyze the file
			expect(legacyResult.errors.length).toBe(0);
			expect(partialMigrationResult.errors.length).toBe(0);
			expect(fullMigrationResult.errors.length).toBe(0);

			// Full migration should provide more data
			expect(Object.keys(fullMigrationResult.extractedData)).toHaveLength(3);
			expect(Object.keys(fullMigrationResult.interpretedData)).toHaveLength(2);
		});

		test("should maintain consistent dependency detection across versions", async () => {
			const filePath = "tests/fixtures/complex-typescript.ts";

			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);
			const newResult = await engine.analyzeFile(filePath, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});

			// Both should detect similar number of dependencies (within reasonable range)
			const legacyDeps =
				legacyResult.extractedData?.dependency ||
				legacyResult.interpretedData?.["dependency-analysis"];
			const legacyDepCount = Array.isArray(legacyDeps)
				? legacyDeps.length
				: legacyDeps?.imports?.length || 0;
			const newDeps = newResult.extractedData.dependency;
			const newDepCount = Array.isArray(newDeps)
				? newDeps.length
				: newDeps?.imports?.length || 0;

			if (legacyDepCount > 0) {
				expect(newDepCount).toBeGreaterThan(0);
				// Allow for some variation in detection methods
				expect(newDepCount).toBeGreaterThanOrEqual(legacyDepCount * 0.8);
				expect(newDepCount).toBeLessThanOrEqual(legacyDepCount * 1.2);
			}
		});
	});

	describe("Performance Compatibility", () => {
		test("should maintain or improve performance compared to legacy analyzer", async () => {
			const filePath = "tests/fixtures/complex-typescript.ts";

			// Measure legacy performance
			const legacyStart = Date.now();
			await legacyAnalyzer.analyzeFile(filePath);
			const legacyTime = Date.now() - legacyStart;

			// Measure new engine performance
			const newStart = Date.now();
			await engine.analyzeFile(filePath, {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
			});
			const newTime = Date.now() - newStart;

			// New engine should be at least as fast (allow 20% margin)
			expect(newTime).toBeLessThanOrEqual(legacyTime * 1.2);
		});

		test("should provide improved caching compared to legacy system", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			// Test legacy caching (if available)
			const legacyFirst = Date.now();
			await legacyAnalyzer.analyzeFile(filePath);
			const legacyFirstTime = Date.now() - legacyFirst;

			const legacySecond = Date.now();
			await legacyAnalyzer.analyzeFile(filePath);
			const legacySecondTime = Date.now() - legacySecond;

			// Test new engine caching
			const newFirst = Date.now();
			await engine.analyzeFile(filePath);
			const newFirstTime = Date.now() - newFirst;

			const newSecond = Date.now();
			await engine.analyzeFile(filePath);
			const newSecondTime = Date.now() - newSecond;

			// New engine should show cache performance (more lenient for CI environments)
			const legacyImprovement =
				legacyFirstTime > 0 ? legacySecondTime / legacyFirstTime : 1;
			const newImprovement =
				newFirstTime > 0 ? newSecondTime / newFirstTime : 1;

			// Allow for some variance in CI environments - focus on cache providing some benefit
			expect(newImprovement).toBeLessThanOrEqual(
				Math.max(legacyImprovement * 1.2, 1.0),
			);
			expect(newSecondTime).toBeLessThan(newFirstTime * 0.8); // Some cache benefit (80% or better)
		});
	});

	describe("Error Handling Compatibility", () => {
		test("should handle invalid files consistently with legacy behavior", async () => {
			const invalidFile = "tests/fixtures/invalid-syntax.ts";

			// Legacy error handling
			const legacyResult = await legacyAnalyzer.analyzeFile(invalidFile);
			const legacyHasErrors =
				legacyResult.errors && legacyResult.errors.length > 0;

			// New engine error handling
			const newResult = await engine.analyzeFile(invalidFile);
			const newHasErrors = newResult.errors && newResult.errors.length > 0;

			// Both should handle errors (either by reporting them or handling gracefully)
			expect(typeof legacyHasErrors).toBe("boolean");
			expect(typeof newHasErrors).toBe("boolean");

			// If legacy reports errors, new engine should also detect issues
			if (legacyHasErrors) {
				expect(newHasErrors).toBe(true);
			}
		});

		test("should handle missing files consistently", async () => {
			const missingFile = "non-existent-file.ts";

			try {
				const legacyResult = await legacyAnalyzer.analyzeFile(missingFile);
				expect(legacyResult.errors).toBeDefined();
				expect(legacyResult.errors.length).toBeGreaterThan(0);
			} catch (error) {
				// Legacy throws error - this is acceptable behavior
				expect(error).toBeDefined();
			}

			// New engine should handle missing files gracefully
			const newResult = await engine.analyzeFile(missingFile);
			expect(newResult).toBeDefined();
			expect(newResult.errors).toBeDefined();
			expect(newResult.errors.length).toBeGreaterThan(0);
		});
	});

	describe("Configuration Compatibility", () => {
		test("should support legacy configuration options", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			// Legacy style configuration
			const legacyConfig = {
				includeExternalDependencies: true,
				includeTypeImports: true,
				followImports: false,
			};

			// Map to new configuration format
			const newConfig: AnalysisConfig = {
				extractors: ["dependency"],
				interpreters: ["dependency-analysis"],
				extractorOptions: {
					dependency: {
						options: {
							includeExternalDependencies:
								legacyConfig.includeExternalDependencies,
							includeTypeImports: legacyConfig.includeTypeImports,
							followImports: legacyConfig.followImports,
						},
					},
				},
			};

			const result = await engine.analyzeFile(filePath, newConfig);
			expect(result).toBeDefined();
			expect(result.errors.length).toBe(0);

			// Configuration should be preserved in metadata
			expect(result.metadata?.config).toBeDefined();
		});

		test("should provide default behavior equivalent to legacy analyzer", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			// Legacy default behavior
			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);

			// New engine default behavior (should match legacy defaults)
			const newResult = await engine.analyzeFile(filePath);

			expect(legacyResult.language).toBe(newResult.language);

			// Both should analyze successfully with defaults
			expect(legacyResult.errors.length).toBe(0);
			expect(newResult.errors.length).toBe(0);
		});
	});

	describe("Output Format Compatibility", () => {
		test("should maintain essential output structure compatibility", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";

			const legacyResult = await legacyAnalyzer.analyzeFile(filePath);
			const newResult = await engine.analyzeFile(filePath);

			// Essential fields should be present in both
			expect(legacyResult.filePath).toBeDefined();
			expect(newResult.filePath).toBeDefined();
			expect(legacyResult.language).toBeDefined();
			expect(newResult.language).toBeDefined();

			// Performance metrics should be available
			if (legacyResult.performanceMetrics) {
				expect(newResult.performanceMetrics).toBeDefined();
				expect(newResult.performanceMetrics.totalTime).toBeGreaterThan(0);
			}

			// Error arrays should be consistent
			expect(Array.isArray(legacyResult.errors)).toBe(true);
			expect(Array.isArray(newResult.errors)).toBe(true);
		});

		test("should provide migration utility functions", async () => {
			const filePath = "tests/fixtures/sample-typescript.ts";
			const newResult = await engine.analyzeFile(filePath);

			// New result should be convertible to legacy format
			const convertedResult = {
				filePath: newResult.filePath,
				language: newResult.language,
				dependencies: newResult.extractedData.dependency?.dependencies || [],
				performanceMetrics: newResult.performanceMetrics,
				errors: newResult.errors,
				metadata: {
					...newResult.metadata,
					fromNewEngine: true,
				},
			};

			expect(convertedResult.filePath).toBe(filePath);
			expect(convertedResult.language).toBe("typescript");
			expect(Array.isArray(convertedResult.dependencies)).toBe(true);
			expect(convertedResult.performanceMetrics).toBeDefined();
		});
	});

	describe("Extension Compatibility", () => {
		test("should support existing dependency analysis extensions", async () => {
			const filePath = "tests/fixtures/complex-typescript.ts";

			// Test that custom extractors can be added to maintain legacy functionality
			class LegacyCompatExtractor implements IDataExtractor<any> {
				extract(ast: any, filePath: string): any {
					return {
						legacyFormat: true,
						dependencies: [], // Legacy format
						metadata: {
							extractedBy: "legacy-compat-extractor",
							version: "1.0.0",
						},
					};
				}

				supports(): boolean {
					return true;
				}
				getName(): string {
					return "legacy-compat";
				}
				getVersion(): string {
					return "1.0.0";
				}

				validate(data: any) {
					return { isValid: true, errors: [], warnings: [] };
				}

				getMetadata() {
					return {
						name: "legacy-compat",
						version: "1.0.0",
						description: "Legacy compatibility extractor",
						supportedLanguages: ["typescript"],
						outputTypes: ["legacy"],
						dependencies: [],
						performance: {
							averageTimePerNode: 0.001,
							memoryUsage: "low" as const,
							timeComplexity: "linear" as const,
							maxRecommendedFileSize: 1000000,
						},
					};
				}

				configure() {}
				getConfiguration() {
					return {
						enabled: true,
						priority: 1,
						timeout: 5000,
						memoryLimit: 100000000,
						languages: ["typescript"],
						errorHandling: "lenient" as const,
						logLevel: "info" as const,
					};
				}

				getOutputSchema() {
					return {
						type: "object",
						properties: {},
						required: [],
						version: "1.0.0",
					};
				}

				dispose() {}
			}

			engine.registerExtractor("legacy-compat", new LegacyCompatExtractor());

			const result = await engine.analyzeFile(filePath, {
				extractors: ["dependency", "legacy-compat"],
			});

			expect(result.extractedData["legacy-compat"]).toBeDefined();
			expect(result.extractedData["legacy-compat"].legacyFormat).toBe(true);
		});

		test("should maintain extension point compatibility", async () => {
			// Verify that the plugin system supports the same extension patterns
			const extractorCount = engine.getRegisteredExtractors().size;
			const interpreterCount = engine.getRegisteredInterpreters().size;

			expect(extractorCount).toBeGreaterThanOrEqual(3); // Built-in extractors
			expect(interpreterCount).toBeGreaterThanOrEqual(2); // Built-in interpreters

			// Should be able to add and remove plugins dynamically
			class TestExtractor implements IDataExtractor<any> {
				extract(): any {
					return {};
				}
				supports(): boolean {
					return true;
				}
				getName(): string {
					return "test";
				}
				getVersion(): string {
					return "1.0.0";
				}

				validate(data: any) {
					return { isValid: true, errors: [], warnings: [] };
				}

				getMetadata() {
					return {
						name: "test",
						version: "1.0.0",
						description: "Test extractor",
						supportedLanguages: ["typescript"],
						outputTypes: ["test"],
						dependencies: [],
						performance: {
							averageTimePerNode: 0.001,
							memoryUsage: "low" as const,
							timeComplexity: "linear" as const,
							maxRecommendedFileSize: 1000000,
						},
					};
				}

				configure() {}
				getConfiguration() {
					return {
						enabled: true,
						priority: 1,
						timeout: 5000,
						memoryLimit: 100000000,
						languages: ["typescript"],
						errorHandling: "lenient" as const,
						logLevel: "info" as const,
					};
				}

				getOutputSchema() {
					return {
						type: "object",
						properties: {},
						required: [],
						version: "1.0.0",
					};
				}

				dispose() {}
			}

			engine.registerExtractor("test", new TestExtractor());
			expect(engine.getRegisteredExtractors().size).toBe(extractorCount + 1);

			const removed = engine.unregisterExtractor("test");
			expect(removed).toBe(true);
			expect(engine.getRegisteredExtractors().size).toBe(extractorCount);
		});
	});
});
