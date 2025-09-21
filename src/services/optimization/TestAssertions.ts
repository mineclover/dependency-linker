/**
 * Test Assertions (T026)
 * Provides specialized assertions for test optimization validation
 */

import type { OptimizationOpportunity } from "../../models/optimization/OptimizationOpportunity";
import type { PerformanceBaseline } from "../../models/optimization/PerformanceBaseline";
import type { TestCase } from "../../models/optimization/TestCase";
import type { TestSuite } from "../../models/optimization/TestSuite";

export interface AssertionOptions {
	tolerance?: number;
	message?: string;
	strict?: boolean;
	skipOnFailure?: boolean;
}

export interface PerformanceAssertionOptions extends AssertionOptions {
	maxDuration?: number;
	maxMemoryMB?: number;
	minPassRate?: number;
	maxFailureRate?: number;
	compareToBaseline?: boolean;
	baselineId?: string;
}

export interface OptimizationAssertionOptions extends AssertionOptions {
	minTimeReduction?: number;
	minResourceReduction?: number;
	maxAcceptableRisk?: "low" | "medium" | "high";
	requireValidation?: boolean;
}

export class AssertionError extends Error {
	constructor(
		message: string,
		public readonly expected: any,
		public readonly actual: any,
		public readonly assertionType: string,
	) {
		super(message);
		this.name = "AssertionError";
	}
}

export class TestAssertions {
	private static instance: TestAssertions;

	/**
	 * Get singleton instance
	 */
	static getInstance(): TestAssertions {
		if (!TestAssertions.instance) {
			TestAssertions.instance = new TestAssertions();
		}
		return TestAssertions.instance;
	}

	// ===== PERFORMANCE ASSERTIONS =====

	/**
	 * Assert that execution time is within acceptable limits
	 */
	assertExecutionTime(
		actualDuration: number,
		maxDuration: number,
		options: AssertionOptions = {},
	): void {
		const tolerance = options.tolerance || 0;
		const adjustedMax = maxDuration * (1 + tolerance);

		if (actualDuration > adjustedMax) {
			throw new AssertionError(
				options.message ||
					`Execution time ${actualDuration}ms exceeds maximum ${maxDuration}ms (tolerance: ${tolerance * 100}%)`,
				adjustedMax,
				actualDuration,
				"execution_time",
			);
		}
	}

	/**
	 * Assert that memory usage is within acceptable limits
	 */
	assertMemoryUsage(
		actualMemoryMB: number,
		maxMemoryMB: number,
		options: AssertionOptions = {},
	): void {
		const tolerance = options.tolerance || 0;
		const adjustedMax = maxMemoryMB * (1 + tolerance);

		if (actualMemoryMB > adjustedMax) {
			throw new AssertionError(
				options.message ||
					`Memory usage ${actualMemoryMB.toFixed(2)}MB exceeds maximum ${maxMemoryMB}MB (tolerance: ${tolerance * 100}%)`,
				adjustedMax,
				actualMemoryMB,
				"memory_usage",
			);
		}
	}

	/**
	 * Assert test pass rate meets requirements
	 */
	assertPassRate(
		passedTests: number,
		totalTests: number,
		minPassRate: number,
		options: AssertionOptions = {},
	): void {
		if (totalTests === 0) {
			throw new AssertionError(
				"Cannot calculate pass rate: no tests executed",
				"tests > 0",
				0,
				"pass_rate",
			);
		}

		const actualPassRate = passedTests / totalTests;
		const tolerance = options.tolerance || 0;
		const adjustedMin = minPassRate - tolerance;

		if (actualPassRate < adjustedMin) {
			throw new AssertionError(
				options.message ||
					`Pass rate ${(actualPassRate * 100).toFixed(1)}% is below minimum ${(minPassRate * 100).toFixed(1)}% (tolerance: ${tolerance * 100}%)`,
				adjustedMin,
				actualPassRate,
				"pass_rate",
			);
		}
	}

	/**
	 * Assert comprehensive performance requirements
	 */
	assertPerformanceRequirements(
		metrics: {
			duration: number;
			memoryMB: number;
			passedTests: number;
			totalTests: number;
			cpuUsage?: number;
		},
		requirements: PerformanceAssertionOptions,
	): void {
		const errors: AssertionError[] = [];

		try {
			if (requirements.maxDuration) {
				this.assertExecutionTime(
					metrics.duration,
					requirements.maxDuration,
					requirements,
				);
			}
		} catch (error) {
			if (error instanceof AssertionError) errors.push(error);
		}

		try {
			if (requirements.maxMemoryMB) {
				this.assertMemoryUsage(
					metrics.memoryMB,
					requirements.maxMemoryMB,
					requirements,
				);
			}
		} catch (error) {
			if (error instanceof AssertionError) errors.push(error);
		}

		try {
			if (requirements.minPassRate) {
				this.assertPassRate(
					metrics.passedTests,
					metrics.totalTests,
					requirements.minPassRate,
					requirements,
				);
			}
		} catch (error) {
			if (error instanceof AssertionError) errors.push(error);
		}

		if (errors.length > 0) {
			const errorMessages = errors.map((e) => e.message).join("; ");
			throw new AssertionError(
				`Performance requirements not met: ${errorMessages}`,
				requirements,
				metrics,
				"performance_requirements",
			);
		}
	}

	// ===== TEST SUITE ASSERTIONS =====

	/**
	 * Assert test suite structure and properties
	 */
	assertTestSuite(testSuite: TestSuite, options: AssertionOptions = {}): void {
		if (!testSuite.id) {
			throw new AssertionError(
				"Test suite must have an ID",
				"non-empty string",
				testSuite.id,
				"test_suite_structure",
			);
		}

		if (!testSuite.name) {
			throw new AssertionError(
				"Test suite must have a name",
				"non-empty string",
				testSuite.name,
				"test_suite_structure",
			);
		}

		if (!testSuite.testCases || testSuite.testCases.length === 0) {
			throw new AssertionError(
				"Test suite must contain test cases",
				"array with length > 0",
				testSuite.testCases?.length || 0,
				"test_suite_structure",
			);
		}

		// Validate each test case
		testSuite.testCases.forEach((testCase, index) => {
			try {
				this.assertTestCase(testCase, options);
			} catch (error) {
				if (error instanceof AssertionError) {
					throw new AssertionError(
						`Test case ${index} invalid: ${error.message}`,
						error.expected,
						error.actual,
						"test_suite_structure",
					);
				}
				throw error;
			}
		});
	}

	/**
	 * Assert test case structure and properties
	 */
	assertTestCase(testCase: TestCase, options: AssertionOptions = {}): void {
		if (!testCase.id) {
			throw new AssertionError(
				"Test case must have an ID",
				"non-empty string",
				testCase.id,
				"test_case_structure",
			);
		}

		if (!testCase.name) {
			throw new AssertionError(
				"Test case must have a name",
				"non-empty string",
				testCase.name,
				"test_case_structure",
			);
		}

		if (testCase.executionTime < 0) {
			throw new AssertionError(
				"Test case execution time must be non-negative",
				">= 0",
				testCase.executionTime,
				"test_case_structure",
			);
		}

		// Remove lineStart/lineEnd validation as those properties don't exist in TestCase
	}

	/**
	 * Assert test suite meets performance targets
	 */
	assertTestSuitePerformance(
		testSuite: TestSuite,
		actualMetrics: { duration: number; memoryMB: number; passRate: number },
		targets: { maxDuration: number; maxMemoryMB: number; minPassRate: number },
		options: AssertionOptions = {},
	): void {
		this.assertExecutionTime(actualMetrics.duration, targets.maxDuration, {
			...options,
			message: `Test suite '${testSuite.name}' exceeded duration target`,
		});

		this.assertMemoryUsage(actualMetrics.memoryMB, targets.maxMemoryMB, {
			...options,
			message: `Test suite '${testSuite.name}' exceeded memory target`,
		});

		if (actualMetrics.passRate < targets.minPassRate) {
			throw new AssertionError(
				`Test suite '${testSuite.name}' pass rate ${(actualMetrics.passRate * 100).toFixed(1)}% below target ${(targets.minPassRate * 100).toFixed(1)}%`,
				targets.minPassRate,
				actualMetrics.passRate,
				"test_suite_performance",
			);
		}
	}

	// ===== OPTIMIZATION ASSERTIONS =====

	/**
	 * Assert optimization opportunity is valid
	 */
	assertOptimizationOpportunity(
		opportunity: OptimizationOpportunity,
		options: OptimizationAssertionOptions = {},
	): void {
		if (!opportunity.id) {
			throw new AssertionError(
				"Optimization opportunity must have an ID",
				"non-empty string",
				opportunity.id,
				"optimization_structure",
			);
		}

		if (!opportunity.type) {
			throw new AssertionError(
				"Optimization opportunity must have a type",
				"non-empty string",
				opportunity.type,
				"optimization_structure",
			);
		}

		if (
			options.minTimeReduction &&
			opportunity.estimatedTimeSaving < options.minTimeReduction
		) {
			throw new AssertionError(
				`Time saving ${opportunity.estimatedTimeSaving}ms below minimum ${options.minTimeReduction}ms`,
				options.minTimeReduction,
				opportunity.estimatedTimeSaving,
				"optimization_impact",
			);
		}

		// Resource reduction is not part of the OptimizationOpportunity interface
		// This section is removed as it doesn't match the actual model

		if (options.requireValidation && !opportunity.validationRequired) {
			throw new AssertionError(
				"Optimization opportunity must require validation",
				"validationRequired = true",
				opportunity.validationRequired,
				"optimization_validation",
			);
		}
	}

	/**
	 * Assert optimization results meet expectations
	 */
	assertOptimizationResults(
		originalMetrics: { duration: number; memoryMB: number },
		optimizedMetrics: { duration: number; memoryMB: number },
		expectations: {
			minTimeReduction?: number;
			minResourceReduction?: number;
			maxPerformanceDegradation?: number;
		},
		options: AssertionOptions = {},
	): void {
		const timeReduction = originalMetrics.duration - optimizedMetrics.duration;
		const resourceReduction =
			(originalMetrics.memoryMB - optimizedMetrics.memoryMB) /
			originalMetrics.memoryMB;

		if (
			expectations.minTimeReduction &&
			timeReduction < expectations.minTimeReduction
		) {
			throw new AssertionError(
				`Time reduction ${timeReduction}ms below expected ${expectations.minTimeReduction}ms`,
				expectations.minTimeReduction,
				timeReduction,
				"optimization_results",
			);
		}

		if (
			expectations.minResourceReduction &&
			resourceReduction < expectations.minResourceReduction
		) {
			throw new AssertionError(
				`Resource reduction ${(resourceReduction * 100).toFixed(1)}% below expected ${(expectations.minResourceReduction * 100).toFixed(1)}%`,
				expectations.minResourceReduction,
				resourceReduction,
				"optimization_results",
			);
		}

		// Check for performance degradation
		if (timeReduction < 0) {
			const degradation = Math.abs(timeReduction) / originalMetrics.duration;
			const maxDegradation = expectations.maxPerformanceDegradation || 0.05; // 5% default

			if (degradation > maxDegradation) {
				throw new AssertionError(
					`Performance degraded by ${(degradation * 100).toFixed(1)}%, exceeds maximum ${(maxDegradation * 100).toFixed(1)}%`,
					maxDegradation,
					degradation,
					"performance_degradation",
				);
			}
		}
	}

	// ===== BASELINE COMPARISON ASSERTIONS =====

	/**
	 * Assert performance against baseline
	 */
	assertAgainstBaseline(
		currentMetrics: { duration: number; memoryMB: number; testCount: number },
		baseline: PerformanceBaseline,
		options: { tolerancePercent?: number; allowRegression?: boolean } = {},
	): void {
		const tolerance = (options.tolerancePercent || 10) / 100; // Default 10% tolerance

		// Find comparable baseline measurement
		const baselineMeasurement = this.findBestBaselineMeasurement(
			baseline,
			currentMetrics.testCount,
		);

		if (!baselineMeasurement) {
			throw new AssertionError(
				"No comparable baseline measurement found",
				"baseline measurement",
				null,
				"baseline_comparison",
			);
		}

		// Check duration
		const durationRatio =
			currentMetrics.duration / baselineMeasurement.duration;
		const maxDurationRatio = 1 + tolerance;

		if (durationRatio > maxDurationRatio && !options.allowRegression) {
			throw new AssertionError(
				`Performance regression detected: ${(durationRatio * 100).toFixed(1)}% of baseline (max: ${(maxDurationRatio * 100).toFixed(1)}%)`,
				maxDurationRatio,
				durationRatio,
				"performance_regression",
			);
		}

		// Check memory
		const memoryRatio =
			currentMetrics.memoryMB / baselineMeasurement.memoryUsage;
		const maxMemoryRatio = 1 + tolerance;

		if (memoryRatio > maxMemoryRatio && !options.allowRegression) {
			throw new AssertionError(
				`Memory regression detected: ${(memoryRatio * 100).toFixed(1)}% of baseline (max: ${(maxMemoryRatio * 100).toFixed(1)}%)`,
				maxMemoryRatio,
				memoryRatio,
				"memory_regression",
			);
		}
	}

	// ===== UTILITY ASSERTIONS =====

	/**
	 * Assert that a value is within a range
	 */
	assertInRange(
		value: number,
		min: number,
		max: number,
		options: AssertionOptions = {},
	): void {
		if (value < min || value > max) {
			throw new AssertionError(
				options.message || `Value ${value} is not in range [${min}, ${max}]`,
				`[${min}, ${max}]`,
				value,
				"range",
			);
		}
	}

	/**
	 * Assert that a percentage is valid
	 */
	assertValidPercentage(
		percentage: number,
		options: AssertionOptions = {},
	): void {
		this.assertInRange(percentage, 0, 1, {
			...options,
			message:
				options.message || `Percentage ${percentage} must be between 0 and 1`,
		});
	}

	/**
	 * Assert that an array is not empty
	 */
	assertNotEmpty<T>(array: T[], options: AssertionOptions = {}): void {
		if (!array || array.length === 0) {
			throw new AssertionError(
				options.message || "Array must not be empty",
				"non-empty array",
				array,
				"not_empty",
			);
		}
	}

	/**
	 * Assert improvement over previous state
	 */
	assertImprovement(
		previousValue: number,
		currentValue: number,
		metric: "duration" | "memory" | "errors",
		options: { minImprovementPercent?: number } = {},
	): void {
		const minImprovement = options.minImprovementPercent || 5; // 5% default

		let improvement: number;
		let expectedDirection: string;

		if (metric === "duration" || metric === "memory" || metric === "errors") {
			// Lower is better
			improvement = (previousValue - currentValue) / previousValue;
			expectedDirection = "decrease";
		} else {
			throw new AssertionError(
				`Unknown metric type: ${metric}`,
				"duration | memory | errors",
				metric,
				"improvement_calculation",
			);
		}

		const minImprovementDecimal = minImprovement / 100;

		if (improvement < minImprovementDecimal) {
			throw new AssertionError(
				`${metric} did not improve sufficiently: ${(improvement * 100).toFixed(1)}% ${expectedDirection} (minimum: ${minImprovement}%)`,
				minImprovementDecimal,
				improvement,
				"insufficient_improvement",
			);
		}
	}

	// ===== PRIVATE HELPERS =====

	private findBestBaselineMeasurement(
		baseline: PerformanceBaseline,
		targetTestCount: number,
	): any {
		// Return the baseline directly since it contains the necessary test count data
		if (!baseline.totalTests) {
			return null;
		}

		return baseline;
	}

	/**
	 * Create assertion group for batch validation
	 */
	createAssertionGroup(): AssertionGroup {
		return new AssertionGroup(this);
	}
}

/**
 * Assertion group for batch validation
 */
export class AssertionGroup {
	private assertions: Array<() => void> = [];
	private errors: AssertionError[] = [];

	constructor(private testAssertions: TestAssertions) {}

	/**
	 * Add assertion to group
	 */
	add(assertion: () => void): AssertionGroup {
		this.assertions.push(assertion);
		return this;
	}

	/**
	 * Execute all assertions and collect errors
	 */
	execute(options: { failFast?: boolean } = {}): AssertionError[] {
		this.errors = [];

		for (const assertion of this.assertions) {
			try {
				assertion();
			} catch (error) {
				if (error instanceof AssertionError) {
					this.errors.push(error);
					if (options.failFast) {
						throw error;
					}
				} else {
					throw error;
				}
			}
		}

		return this.errors;
	}

	/**
	 * Execute and throw combined error if any assertions failed
	 */
	assert(): void {
		const errors = this.execute();

		if (errors.length > 0) {
			const combinedMessage = errors.map((e) => e.message).join("; ");
			throw new AssertionError(
				`Multiple assertions failed: ${combinedMessage}`,
				"all assertions to pass",
				`${errors.length} failed`,
				"assertion_group",
			);
		}
	}

	/**
	 * Get accumulated errors
	 */
	getErrors(): AssertionError[] {
		return [...this.errors];
	}

	/**
	 * Check if any assertions failed
	 */
	hasErrors(): boolean {
		return this.errors.length > 0;
	}
}

export default TestAssertions;
