/**
 * Contract tests for IPerformanceTracker interface (T008)
 * Validates that all performance tracker implementations conform to expected behavior
 */

import {
	IPerformanceTracker,
	PerformanceBaseline,
	PerformanceMetrics,
	PerformanceComparison,
	CONTRACT_SCENARIOS,
} from "../../specs/005-test-optimization/contracts/test-optimization.contract";

// Mock implementation for contract testing
class MockPerformanceTracker implements IPerformanceTracker {
	async establishBaseline(testCommand: string): Promise<PerformanceBaseline> {
		if (!testCommand) {
			throw new Error("Test command is required");
		}

		// Simulate baseline establishment with current performance issues
		return {
			timestamp: new Date(),
			totalExecutionTime: 3170,
			totalTests: 309,
			failedTests: 23,
			failedSuites: 3,
			passRate: 0.925, // 92.5% pass rate (23 failures / 309 tests)
			coveragePercentage: 85,
			memoryUsage: 128, // MB
			workerIssues: true,
		};
	}

	async measureCurrent(testCommand: string): Promise<PerformanceMetrics> {
		if (!testCommand) {
			throw new Error("Test command is required");
		}

		// Simulate improved performance after optimization
		return {
			executionTime: 1420, // Improved from 3170ms
			testCount: 250, // Reduced from 309
			passRate: 0.996, // Improved to >99%
			coveragePercentage: 83, // Slight reduction but within acceptable range
			memoryUsage: 95, // Reduced memory usage
		};
	}

	comparePerformance(
		baseline: PerformanceBaseline,
		current: PerformanceMetrics,
	): PerformanceComparison {
		if (!baseline || !current) {
			throw new Error("Both baseline and current metrics are required");
		}

		const timeImprovement =
			((baseline.totalExecutionTime - current.executionTime) /
				baseline.totalExecutionTime) *
			100;
		const testReduction = baseline.totalTests - current.testCount;
		const reliabilityChange = current.passRate - baseline.passRate;
		const coverageChange =
			current.coveragePercentage - baseline.coveragePercentage;

		const meetsTargets =
			current.executionTime <=
				CONTRACT_SCENARIOS.optimization.targetExecutionTime &&
			current.passRate >= 0.99 &&
			Math.abs(coverageChange) <=
				CONTRACT_SCENARIOS.performance.improvementThresholds
					.maxCoverageReduction *
					100;

		return {
			timeImprovement,
			testReduction,
			reliabilityChange,
			coverageChange,
			meetsTargets,
		};
	}
}

describe("IPerformanceTracker Contract Tests", () => {
	let tracker: IPerformanceTracker;
	let testCommand: string;

	beforeEach(() => {
		tracker = new MockPerformanceTracker();
		testCommand = "npm test";
	});

	describe("Interface Contract Compliance", () => {
		test("should implement all required methods", () => {
			expect(typeof tracker.establishBaseline).toBe("function");
			expect(typeof tracker.measureCurrent).toBe("function");
			expect(typeof tracker.comparePerformance).toBe("function");
		});

		test("establishBaseline should return valid baseline structure", async () => {
			const baseline = await tracker.establishBaseline(testCommand);

			expect(baseline).toHaveProperty("timestamp");
			expect(baseline).toHaveProperty("totalExecutionTime");
			expect(baseline).toHaveProperty("totalTests");
			expect(baseline).toHaveProperty("failedTests");
			expect(baseline).toHaveProperty("failedSuites");
			expect(baseline).toHaveProperty("passRate");
			expect(baseline).toHaveProperty("coveragePercentage");
			expect(baseline).toHaveProperty("memoryUsage");
			expect(baseline).toHaveProperty("workerIssues");

			expect(baseline.timestamp).toBeInstanceOf(Date);
			expect(typeof baseline.totalExecutionTime).toBe("number");
			expect(typeof baseline.totalTests).toBe("number");
			expect(typeof baseline.failedTests).toBe("number");
			expect(typeof baseline.failedSuites).toBe("number");
			expect(typeof baseline.passRate).toBe("number");
			expect(typeof baseline.coveragePercentage).toBe("number");
			expect(typeof baseline.memoryUsage).toBe("number");
			expect(typeof baseline.workerIssues).toBe("boolean");
		});

		test("measureCurrent should return valid metrics structure", async () => {
			const metrics = await tracker.measureCurrent(testCommand);

			expect(metrics).toHaveProperty("executionTime");
			expect(metrics).toHaveProperty("testCount");
			expect(metrics).toHaveProperty("passRate");
			expect(metrics).toHaveProperty("coveragePercentage");
			expect(metrics).toHaveProperty("memoryUsage");

			expect(typeof metrics.executionTime).toBe("number");
			expect(typeof metrics.testCount).toBe("number");
			expect(typeof metrics.passRate).toBe("number");
			expect(typeof metrics.coveragePercentage).toBe("number");
			expect(typeof metrics.memoryUsage).toBe("number");
		});

		test("comparePerformance should return valid comparison structure", async () => {
			const baseline = await tracker.establishBaseline(testCommand);
			const current = await tracker.measureCurrent(testCommand);
			const comparison = tracker.comparePerformance(baseline, current);

			expect(comparison).toHaveProperty("timeImprovement");
			expect(comparison).toHaveProperty("testReduction");
			expect(comparison).toHaveProperty("reliabilityChange");
			expect(comparison).toHaveProperty("coverageChange");
			expect(comparison).toHaveProperty("meetsTargets");

			expect(typeof comparison.timeImprovement).toBe("number");
			expect(typeof comparison.testReduction).toBe("number");
			expect(typeof comparison.reliabilityChange).toBe("number");
			expect(typeof comparison.coverageChange).toBe("number");
			expect(typeof comparison.meetsTargets).toBe("boolean");
		});
	});

	describe("Error Handling Contract", () => {
		test("establishBaseline should reject invalid commands", async () => {
			await expect(tracker.establishBaseline("")).rejects.toThrow();
			await expect(tracker.establishBaseline(null as any)).rejects.toThrow();
			await expect(
				tracker.establishBaseline(undefined as any),
			).rejects.toThrow();
		});

		test("measureCurrent should reject invalid commands", async () => {
			await expect(tracker.measureCurrent("")).rejects.toThrow();
			await expect(tracker.measureCurrent(null as any)).rejects.toThrow();
			await expect(tracker.measureCurrent(undefined as any)).rejects.toThrow();
		});

		test("comparePerformance should reject invalid input", () => {
			const baseline = {
				timestamp: new Date(),
				totalExecutionTime: 3170,
				totalTests: 309,
				failedTests: 23,
				failedSuites: 3,
				passRate: 0.925,
				coveragePercentage: 85,
				memoryUsage: 128,
				workerIssues: true,
			};

			expect(() =>
				tracker.comparePerformance(null as any, {} as any),
			).toThrow();
			expect(() => tracker.comparePerformance(baseline, null as any)).toThrow();
			expect(() =>
				tracker.comparePerformance(undefined as any, {} as any),
			).toThrow();
		});
	});

	describe("Baseline Requirements Contract", () => {
		test("baseline should capture all required metrics", async () => {
			const baseline = await tracker.establishBaseline(testCommand);

			// Verify all baseline requirements from contract
			const requirements = CONTRACT_SCENARIOS.performance.baselineRequirements;

			if (requirements.executionTime) {
				expect(baseline.totalExecutionTime).toBeGreaterThan(0);
			}
			if (requirements.testCount) {
				expect(baseline.totalTests).toBeGreaterThan(0);
			}
			if (requirements.passRate) {
				expect(baseline.passRate).toBeGreaterThan(0);
				expect(baseline.passRate).toBeLessThanOrEqual(1);
			}
			if (requirements.coverage) {
				expect(baseline.coveragePercentage).toBeGreaterThanOrEqual(0);
				expect(baseline.coveragePercentage).toBeLessThanOrEqual(100);
			}
		});

		test("baseline should be consistent across calls", async () => {
			const baseline1 = await tracker.establishBaseline(testCommand);
			const baseline2 = await tracker.establishBaseline(testCommand);

			// Allow for small timing variations but core metrics should be stable
			expect(
				Math.abs(baseline1.totalTests - baseline2.totalTests),
			).toBeLessThanOrEqual(1);
			expect(Math.abs(baseline1.passRate - baseline2.passRate)).toBeLessThan(
				0.01,
			);
		});

		test("baseline should reflect current performance issues", async () => {
			const baseline = await tracker.establishBaseline(testCommand);

			// Should capture the known performance issues
			expect(baseline.totalExecutionTime).toBeGreaterThan(3000); // >3s execution
			expect(baseline.passRate).toBeLessThan(0.99); // <99% pass rate
			expect(baseline.workerIssues).toBe(true); // Worker exit issues present
		});
	});

	describe("Performance Measurement Contract", () => {
		test("current metrics should be measurable independently", async () => {
			const metrics = await tracker.measureCurrent(testCommand);

			expect(metrics.executionTime).toBeGreaterThan(0);
			expect(metrics.testCount).toBeGreaterThan(0);
			expect(metrics.passRate).toBeGreaterThan(0);
			expect(metrics.passRate).toBeLessThanOrEqual(1);
		});

		test("metrics should validate against optimization targets", async () => {
			const metrics = await tracker.measureCurrent(testCommand);

			// For optimized tests, should meet performance targets
			if (metrics.passRate > 0.99) {
				expect(metrics.executionTime).toBeLessThanOrEqual(
					CONTRACT_SCENARIOS.optimization.targetExecutionTime,
				);
			}
		});
	});

	describe("Performance Comparison Contract", () => {
		test("comparison should calculate improvements correctly", async () => {
			const baseline = await tracker.establishBaseline(testCommand);
			const current = await tracker.measureCurrent(testCommand);
			const comparison = tracker.comparePerformance(baseline, current);

			// Verify calculation accuracy
			const expectedTimeImprovement =
				((baseline.totalExecutionTime - current.executionTime) /
					baseline.totalExecutionTime) *
				100;
			const expectedTestReduction = baseline.totalTests - current.testCount;

			expect(
				Math.abs(comparison.timeImprovement - expectedTimeImprovement),
			).toBeLessThan(0.01);
			expect(comparison.testReduction).toBe(expectedTestReduction);
		});

		test("comparison should validate against improvement thresholds", async () => {
			const baseline = await tracker.establishBaseline(testCommand);
			const current = await tracker.measureCurrent(testCommand);
			const comparison = tracker.comparePerformance(baseline, current);

			const thresholds = CONTRACT_SCENARIOS.performance.improvementThresholds;

			if (comparison.meetsTargets) {
				// Should meet minimum improvement requirements
				expect(comparison.timeImprovement).toBeGreaterThanOrEqual(
					thresholds.minTimeImprovement * 100,
				);
				expect(comparison.reliabilityChange).toBeGreaterThanOrEqual(
					thresholds.minReliabilityImprovement,
				);
				expect(Math.abs(comparison.coverageChange)).toBeLessThanOrEqual(
					thresholds.maxCoverageReduction * 100,
				);
			}
		});

		test("should handle edge cases in comparison", async () => {
			const baseline = await tracker.establishBaseline(testCommand);

			// Test with same metrics (no change)
			const noChangeMetrics: PerformanceMetrics = {
				executionTime: baseline.totalExecutionTime,
				testCount: baseline.totalTests,
				passRate: baseline.passRate,
				coveragePercentage: baseline.coveragePercentage,
				memoryUsage: baseline.memoryUsage,
			};

			const noChangeComparison = tracker.comparePerformance(
				baseline,
				noChangeMetrics,
			);
			expect(noChangeComparison.timeImprovement).toBe(0);
			expect(noChangeComparison.testReduction).toBe(0);
			expect(noChangeComparison.reliabilityChange).toBe(0);
			expect(noChangeComparison.coverageChange).toBe(0);
		});
	});

	describe("Integration Workflow Contract", () => {
		test("complete performance tracking workflow", async () => {
			// Establish baseline -> Measure current -> Compare
			const baseline = await tracker.establishBaseline(testCommand);
			expect(baseline).toBeDefined();

			const current = await tracker.measureCurrent(testCommand);
			expect(current).toBeDefined();

			const comparison = tracker.comparePerformance(baseline, current);
			expect(comparison).toBeDefined();

			// Workflow should maintain data consistency
			expect(comparison.testReduction).toBe(
				baseline.totalTests - current.testCount,
			);
		});

		test("should support optimization validation workflow", async () => {
			const baseline = await tracker.establishBaseline(testCommand);
			const optimized = await tracker.measureCurrent(testCommand);
			const comparison = tracker.comparePerformance(baseline, optimized);

			// For successful optimization
			if (comparison.meetsTargets) {
				expect(optimized.executionTime).toBeLessThan(
					baseline.totalExecutionTime,
				);
				expect(optimized.passRate).toBeGreaterThanOrEqual(baseline.passRate);
			}
		});

		test("comparison metrics should be used for validation decisions", async () => {
			const baseline = await tracker.establishBaseline(testCommand);
			const current = await tracker.measureCurrent(testCommand);
			const comparison = tracker.comparePerformance(baseline, current);

			// Comparison should provide actionable data for optimization decisions
			expect(typeof comparison.timeImprovement).toBe("number");
			expect(typeof comparison.meetsTargets).toBe("boolean");

			if (!comparison.meetsTargets) {
				// Should indicate what needs improvement
				expect(
					current.executionTime >
						CONTRACT_SCENARIOS.optimization.targetExecutionTime ||
						current.passRate < 0.99 ||
						Math.abs(comparison.coverageChange) > 5,
				).toBe(true);
			}
		});
	});
});
