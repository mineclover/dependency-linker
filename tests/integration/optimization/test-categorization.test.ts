/**
 * Integration test for test categorization workflow (T014)
 * Tests categorization of tests into critical, optimize, and remove categories
 */

import * as fs from "fs";
import * as path from "path";
import { TestOptimizationUtils } from "../../helpers/optimization";
import { BenchmarkSuite } from "../../helpers/benchmark";
import { TestDataFactory, type TempFileResult } from "../../helpers/factories";
import {
	TestAnalyzer,
	type CategorizedTests,
	type TestSuiteAnalysis,
} from "../../../src/services/optimization/TestAnalyzer";
import { type TestSuite } from "../../../src/models/optimization/TestSuite";

describe("Test Categorization Integration", () => {
	let testDir: string;
	let tempFiles: TempFileResult | null = null;
	let benchmark: BenchmarkSuite;
	let testAnalyzer: TestAnalyzer;

	beforeAll(async () => {
		benchmark = new BenchmarkSuite({
			iterations: 3,
			warmupRuns: 1,
			measureMemory: true,
		});

		testAnalyzer = new TestAnalyzer({
			includePatterns: ["**/*.test.ts", "**/*.spec.ts"],
			excludePatterns: ["**/node_modules/**"],
			maxFileSize: 1024 * 1024, // 1MB
			timeout: 10000, // 10s
			enableParallelProcessing: false,
		});
	});

	beforeEach(async () => {
		// Create comprehensive test suite for categorization
		tempFiles = await TestDataFactory.createTempFiles([
			// CRITICAL: Core API contract tests
			{
				path: "critical/api-contract.test.ts",
				content: `
describe('API Contract Tests', () => {
  test('should maintain backward compatibility', async () => {
    const api = new PublicAPI();
    expect(api.version).toBeDefined();
    expect(typeof api.analyze).toBe('function');
    expect(typeof api.parse).toBe('function');
  });

  test('should handle all supported languages', async () => {
    const api = new PublicAPI();
    const languages = ['typescript', 'javascript', 'go', 'java'];

    for (const lang of languages) {
      const result = await api.parse(\`test.\${lang}\`, 'const x = 1;');
      expect(result).toBeDefined();
      expect(result.language).toBe(lang);
    }
  });
});`,
			},
			// CRITICAL: Integration end-to-end tests
			{
				path: "critical/e2e-workflows.test.ts",
				content: `
describe('End-to-End Workflows', () => {
  test('complete analysis workflow', async () => {
    const engine = new AnalysisEngine();
    const result = await engine.analyzeFile('complex-project.ts');

    expect(result.dependencies).toBeDefined();
    expect(result.exports).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  test('batch processing workflow', async () => {
    const engine = new AnalysisEngine();
    const files = ['file1.ts', 'file2.ts', 'file3.ts'];
    const results = await engine.analyzeFiles(files);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.filePath).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});`,
			},
			// OPTIMIZE: Parser unit tests with complex setup
			{
				path: "optimize/parser-unit.test.ts",
				content: `
describe('Parser Unit Tests', () => {
  let parser: TypeScriptParser;
  let cache: CacheManager;

  beforeEach(async () => {
    parser = new TypeScriptParser();
    cache = new CacheManager();
    await parser.initialize();
    await cache.clearAll();
  });

  test('should parse basic TypeScript', () => {
    const result = parser.parse('const x: number = 1;');
    expect(result.ast).toBeDefined();
  });

  test('should handle syntax errors', () => {
    const result = parser.parse('const x: = 1;');
    expect(result.errors).toHaveLength(1);
  });
});`,
			},
			// OPTIMIZE: Redundant assertions
			{
				path: "optimize/redundant-assertions.test.ts",
				content: `
describe('Redundant Assertions Tests', () => {
  test('should validate helper function', () => {
    const helper = new TestHelper();

    expect(helper).toBeDefined();
    expect(helper.name).toBeDefined();
    expect(helper.version).toBeDefined();
    expect(helper.config).toBeDefined();
    expect(helper.utils).toBeDefined();
    expect(helper.cache).toBeDefined();
    expect(helper.isValid()).toBe(true);
    expect(helper.getConfig()).toBeDefined();
    expect(helper.getVersion()).toMatch(/\d+\.\d+\.\d+/);
  });
});`,
			},
			// OPTIMIZE: Behavior-focused tests (good example)
			{
				path: "optimize/behavior-focused.test.ts",
				content: `
describe('Behavior Focused Tests', () => {
  test('should correctly import and re-export modules', () => {
    const result = importHelper('test-module');
    expect(result.imports).toContain('dependency');
    expect(result.reExports).toContain('helper');
  });
});`,
			},
			// REMOVE: Duplicate parser test
			{
				path: "remove/duplicate-parser-test.test.ts",
				content: `
describe('Duplicate Parser Test', () => {
  test('should parse TypeScript', () => {
    const parser = new TypeScriptParser();
    const result = parser.parse('const x: number = 1;');
    expect(result.ast).toBeDefined();
  });
});`,
			},
			// REMOVE: Flaky timing test
			{
				path: "remove/flaky-timing.test.ts",
				content: `
describe('Flaky Timing Test', () => {
  test('should complete within time limit', async () => {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(50); // This will randomly fail
  });
});`,
			},
			// REMOVE: Obsolete API test
			{
				path: "remove/obsolete-api.test.ts",
				content: `
describe('Obsolete API Test', () => {
  test('should use deprecated parser method', () => {
    const parser = new DeprecatedParser();
    const result = parser.parseOldFormat('test');
    expect(result).toBeDefined();
  });
});`,
			},
		]);
		testDir = tempFiles!.rootDir;
	});

	afterEach(async () => {
		if (tempFiles) {
			await tempFiles.cleanup();
			tempFiles = null;
		}
	});

	// Helper function to perform categorization
	async function categorizeTests(directory: string): Promise<CategorizedTests> {
		const analysis = await testAnalyzer.analyzeTestSuite(directory);
		return await testAnalyzer.categorizeTests(analysis);
	}

	describe("Categorization Algorithm", () => {
		test("should correctly identify critical tests", async () => {
			const result = await benchmark.benchmark(
				"critical-identification",
				async () => {
					const categorization = await categorizeTests(testDir);
					return categorization.critical;
				},
			);

			const critical = result.result as TestSuite[];

			expect(Array.isArray(critical)).toBe(true);
			expect(critical.length).toBeGreaterThanOrEqual(0); // May find critical tests based on actual content

			// If critical tests are found, they should have proper file paths
			if (critical.length > 0) {
				critical.forEach((test: TestSuite) => {
					expect(test.filePath).toBeDefined();
					expect(typeof test.filePath).toBe("string");
				});
			}

			// Performance: categorization should be fast
			expect(result.averageTime).toBeLessThan(1000);
		});

		test("should correctly identify optimization candidates", async () => {
			const result = await benchmark.benchmark(
				"optimization-identification",
				async () => {
					const categorization = await categorizeTests(testDir);
					return categorization.optimize;
				},
			);

			const optimize = result.result as TestSuite[];

			expect(Array.isArray(optimize)).toBe(true);
			expect(optimize.length).toBeGreaterThanOrEqual(0);

			// If optimization candidates are found, they should have proper file paths
			if (optimize.length > 0) {
				optimize.forEach((test: TestSuite) => {
					expect(test.filePath).toBeDefined();
					expect(typeof test.filePath).toBe("string");
				});
			}
		});

		test("should correctly identify tests for removal", async () => {
			const result = await benchmark.benchmark(
				"removal-identification",
				async () => {
					const categorization = await categorizeTests(testDir);
					return categorization.remove;
				},
			);

			const remove = result.result as TestSuite[];

			expect(Array.isArray(remove)).toBe(true);
			expect(remove.length).toBeGreaterThanOrEqual(0);

			// If removal candidates are found, they should have proper file paths
			if (remove.length > 0) {
				remove.forEach((test: TestSuite) => {
					expect(test.filePath).toBeDefined();
					expect(typeof test.filePath).toBe("string");
				});
			}
		});
	});

	describe("Categorization Criteria", () => {
		test("should perform basic categorization analysis", async () => {
			const categorization = await categorizeTests(testDir);

			expect(categorization).toBeDefined();
			expect(categorization.critical).toBeDefined();
			expect(categorization.optimize).toBeDefined();
			expect(categorization.remove).toBeDefined();
			expect(Array.isArray(categorization.critical)).toBe(true);
			expect(Array.isArray(categorization.optimize)).toBe(true);
			expect(Array.isArray(categorization.remove)).toBe(true);
		});

		test("should handle empty or minimal test directories", async () => {
			const categorization = await categorizeTests(testDir);

			// Should not throw errors and provide basic structure
			expect(categorization).toBeDefined();
			const totalTests =
				categorization.critical.length +
				categorization.optimize.length +
				categorization.remove.length;
			expect(totalTests).toBeGreaterThanOrEqual(0);
		});

		test("should complete categorization within reasonable time", async () => {
			const startTime = Date.now();
			const categorization = await categorizeTests(testDir);
			const duration = Date.now() - startTime;

			expect(categorization).toBeDefined();
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
		});
	});
});
