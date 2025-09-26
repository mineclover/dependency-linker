/**
 * Test data factories for optimization testing
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TestSuiteData {
	id: string;
	name: string;
	tests: TestCaseData[];
	executionTime: number;
	setupTime: number;
	teardownTime: number;
}

export interface TestCaseData {
	id: string;
	name: string;
	type: "unit" | "integration" | "contract";
	category: "critical" | "optimize" | "remove";
	executionTime: number;
	memoryUsage: number;
	dependencies: string[];
	flaky: boolean;
}

export interface OptimizationOpportunityData {
	id: string;
	type: "consolidate" | "optimize" | "remove" | "cache";
	description: string;
	estimatedSaving: number;
	impact: "high" | "medium" | "low";
	effort: "high" | "medium" | "low";
}

export interface PerformanceBaselineData {
	testSuiteId: string;
	timestamp: number;
	executionTime: number;
	memoryUsage: number;
	passRate: number;
	testCount: number;
}

export interface TempFileSpec {
	path: string;
	content: string;
}

export interface TempFileResult {
	rootDir: string;
	cleanup: () => Promise<void>;
}

export class TestDataFactory {
	static async createTempFiles(files: TempFileSpec[]): Promise<TempFileResult> {
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "test-optimization-"),
		);

		// Create all specified files
		for (const file of files) {
			const fullPath = path.join(tempDir, file.path);
			const dir = path.dirname(fullPath);

			// Ensure directory exists
			fs.mkdirSync(dir, { recursive: true });

			// Write file content
			fs.writeFileSync(fullPath, file.content, "utf8");
		}

		return {
			rootDir: tempDir,
			cleanup: async () => {
				try {
					fs.rmSync(tempDir, { recursive: true, force: true });
				} catch (error) {
					// Ignore cleanup errors in tests
					console.warn(`Failed to clean up temp directory ${tempDir}:`, error);
				}
			},
		};
	}

	static createTestSuite(
		overrides: Partial<TestSuiteData> = {},
	): TestSuiteData {
		return {
			id: `suite-${Date.now()}`,
			name: "Test Suite",
			tests: [],
			executionTime: 1000,
			setupTime: 100,
			teardownTime: 50,
			...overrides,
		};
	}

	static createTestCase(overrides: Partial<TestCaseData> = {}): TestCaseData {
		return {
			id: `test-${Date.now()}`,
			name: "Test Case",
			type: "unit",
			category: "optimize",
			executionTime: 50,
			memoryUsage: 5,
			dependencies: [],
			flaky: false,
			...overrides,
		};
	}

	static createOptimizationOpportunity(
		overrides: Partial<OptimizationOpportunityData> = {},
	): OptimizationOpportunityData {
		return {
			id: `opp-${Date.now()}`,
			type: "optimize",
			description: "Optimization opportunity",
			estimatedSaving: 100,
			impact: "medium",
			effort: "medium",
			...overrides,
		};
	}

	static createPerformanceBaseline(
		overrides: Partial<PerformanceBaselineData> = {},
	): PerformanceBaselineData {
		return {
			testSuiteId: `suite-${Date.now()}`,
			timestamp: Date.now(),
			executionTime: 3170,
			memoryUsage: 100,
			passRate: 0.925,
			testCount: 309,
			...overrides,
		};
	}

	static createComplexTestSuite(): TestSuiteData {
		const suite = this.createTestSuite({
			name: "Complex Test Suite",
		});

		suite.tests = [
			this.createTestCase({
				type: "unit",
				category: "critical",
				executionTime: 25,
				name: "Critical Unit Test",
			}),
			this.createTestCase({
				type: "integration",
				category: "optimize",
				executionTime: 150,
				name: "Integration Test",
			}),
			this.createTestCase({
				type: "contract",
				category: "critical",
				executionTime: 75,
				name: "Contract Test",
			}),
			this.createTestCase({
				type: "unit",
				category: "remove",
				executionTime: 200,
				flaky: true,
				name: "Flaky Test",
			}),
		];

		suite.executionTime = suite.tests.reduce(
			(sum, test) => sum + test.executionTime,
			0,
		);
		return suite;
	}

	static createOptimizationScenario(): {
		suites: TestSuiteData[];
		opportunities: OptimizationOpportunityData[];
		baseline: PerformanceBaselineData;
	} {
		const suites = [
			this.createComplexTestSuite(),
			this.createTestSuite({ name: "Parser Tests", executionTime: 500 }),
			this.createTestSuite({ name: "API Tests", executionTime: 800 }),
		];

		const opportunities = [
			this.createOptimizationOpportunity({
				type: "consolidate",
				description: "Merge duplicate parser tests",
				estimatedSaving: 200,
				impact: "high",
				effort: "low",
			}),
			this.createOptimizationOpportunity({
				type: "cache",
				description: "Cache AST parsing results",
				estimatedSaving: 300,
				impact: "high",
				effort: "medium",
			}),
			this.createOptimizationOpportunity({
				type: "remove",
				description: "Remove flaky tests",
				estimatedSaving: 150,
				impact: "medium",
				effort: "low",
			}),
		];

		const baseline = this.createPerformanceBaseline();

		return { suites, opportunities, baseline };
	}
}

export default TestDataFactory;
