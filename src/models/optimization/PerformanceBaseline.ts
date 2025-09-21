/**
 * PerformanceBaseline model for test optimization (T020)
 * Current state metrics for comparison and performance tracking
 *
 * Source: Data model specification, research current state analysis
 */

import type { BaselineMetadata, TestEnvironment } from "./types";

export {
	BaselineMetadata,
	TestEnvironment,
} from "./types";

export interface PerformanceBaseline {
	id?: string; // Unique identifier for the baseline
	timestamp: Date; // When baseline was established
	totalExecutionTime: number; // Total test execution time in ms
	duration?: number; // Alias for totalExecutionTime (for compatibility)
	executionTime?: number; // Another alias for totalExecutionTime (for compatibility)
	totalTests: number; // Count of all tests
	failedTests: number; // Count of failed tests
	failedSuites: number; // Count of failed test suites
	passRate: number; // Percentage of passing tests (0-100)
	coveragePercentage: number; // Code coverage percentage (0-100)
	memoryUsage: number; // Peak memory usage in MB
	workerIssues: boolean; // Whether worker exit issues detected
	parserWarnings: number; // Count of duplicate registration warnings
	environment: TestEnvironment; // Environment details
	metadata: BaselineMetadata; // Additional metadata
}

export class PerformanceBaseline implements PerformanceBaseline {
	timestamp: Date;
	totalExecutionTime: number;
	totalTests: number;
	failedTests: number;
	failedSuites: number;
	passRate: number;
	coveragePercentage: number;
	memoryUsage: number;
	workerIssues: boolean;
	parserWarnings: number;
	environment: TestEnvironment;
	metadata: BaselineMetadata;

	constructor(
		data: Partial<PerformanceBaseline> & {
			totalExecutionTime: number;
			totalTests: number;
			failedTests: number;
			failedSuites: number;
		},
	) {
		this.timestamp = data.timestamp || new Date();
		this.totalExecutionTime = data.totalExecutionTime;
		this.totalTests = data.totalTests;
		this.failedTests = data.failedTests;
		this.failedSuites = data.failedSuites;
		this.passRate =
			data.passRate ||
			(data.totalTests > 0
				? ((data.totalTests - data.failedTests) / data.totalTests) * 100
				: 0);
		this.coveragePercentage = data.coveragePercentage || 0;
		this.memoryUsage = data.memoryUsage || 0;
		this.workerIssues = data.workerIssues || false;
		this.parserWarnings = data.parserWarnings || 0;
		this.environment = data.environment || {
			nodeVersion: process.version,
			jestVersion: "unknown",
			platform: process.platform,
			arch: process.arch,
			cpuCount: require("node:os").cpus().length,
			totalMemory: require("node:os").totalmem() / 1024 / 1024,
			availableMemory: require("node:os").freemem() / 1024 / 1024,
		};
		this.metadata = data.metadata || {
			measurementDuration: 0,
			retries: 0,
			confidence: 1.0,
		};
	}
}

export interface PerformanceTarget {
	targetExecutionTime: number; // Target execution time in ms (1500ms)
	targetTests: number; // Target test count (~250)
	targetFailedTests: number; // Target failed tests (<2)
	targetPassRate: number; // Target pass rate (>99%)
	targetSuiteReliability: number; // Target suite reliability (>95%)
	targetMemoryUsage: number; // Target memory usage in MB
}

export interface PerformanceComparison {
	timeImprovement: number; // Percentage improvement in execution time
	testReduction: number; // Number of tests removed
	reliabilityChange: number; // Pass rate change (percentage points)
	coverageChange: number; // Coverage change (percentage points)
	memoryImprovement: number; // Memory usage improvement (percentage)
	meetsTargets: boolean; // Whether all targets are met
	details: ComparisonDetails;
}

export interface ComparisonDetails {
	executionTimeMet: boolean;
	testCountMet: boolean;
	passRateMet: boolean;
	coverageMet: boolean;
	memoryMet: boolean;
	reliabilityMet: boolean;
	improvements: string[]; // List of improvements achieved
	regressions: string[]; // List of regressions detected
}

export interface PerformanceMetrics {
	executionTime: number;
	testCount: number;
	passRate: number;
	coveragePercentage: number;
	memoryUsage: number;
	failureRate: number;
	timestamp: Date;
}

export class PerformanceBaselineBuilder {
	private baseline: Partial<PerformanceBaseline> = {};

	constructor() {
		this.baseline.timestamp = new Date();
		this.baseline.metadata = {
			measurementDuration: 0,
			retries: 0,
			confidence: 1.0,
		};
	}

	withExecutionTime(executionTime: number): PerformanceBaselineBuilder {
		this.baseline.totalExecutionTime = executionTime;
		return this;
	}

	withTestCounts(
		total: number,
		failed: number,
		failedSuites: number,
	): PerformanceBaselineBuilder {
		this.baseline.totalTests = total;
		this.baseline.failedTests = failed;
		this.baseline.failedSuites = failedSuites;
		this.baseline.passRate = total > 0 ? ((total - failed) / total) * 100 : 0;
		return this;
	}

	withCoverage(coveragePercentage: number): PerformanceBaselineBuilder {
		this.baseline.coveragePercentage = coveragePercentage;
		return this;
	}

	withMemoryUsage(memoryUsage: number): PerformanceBaselineBuilder {
		this.baseline.memoryUsage = memoryUsage;
		return this;
	}

	withIssues(
		workerIssues: boolean,
		parserWarnings: number,
	): PerformanceBaselineBuilder {
		this.baseline.workerIssues = workerIssues;
		this.baseline.parserWarnings = parserWarnings;
		return this;
	}

	withEnvironment(
		environment: Partial<TestEnvironment>,
	): PerformanceBaselineBuilder {
		this.baseline.environment = {
			nodeVersion: environment.nodeVersion || process.version,
			jestVersion: environment.jestVersion || "unknown",
			platform: environment.platform || process.platform,
			arch: environment.arch || process.arch,
			cpuCount: environment.cpuCount || require("node:os").cpus().length,
			totalMemory:
				environment.totalMemory || require("node:os").totalmem() / 1024 / 1024,
			availableMemory:
				environment.availableMemory ||
				require("node:os").freemem() / 1024 / 1024,
		};
		return this;
	}

	withMetadata(
		metadata: Partial<BaselineMetadata>,
	): PerformanceBaselineBuilder {
		this.baseline.metadata = {
			...this.baseline.metadata!,
			...metadata,
		};
		return this;
	}

	build(): PerformanceBaseline {
		this.validateBaseline();

		return {
			timestamp: this.baseline.timestamp!,
			totalExecutionTime: this.baseline.totalExecutionTime!,
			totalTests: this.baseline.totalTests!,
			failedTests: this.baseline.failedTests!,
			failedSuites: this.baseline.failedSuites!,
			passRate: this.baseline.passRate!,
			coveragePercentage: this.baseline.coveragePercentage || 0,
			memoryUsage: this.baseline.memoryUsage || 0,
			workerIssues: this.baseline.workerIssues || false,
			parserWarnings: this.baseline.parserWarnings || 0,
			environment: this.baseline.environment!,
			metadata: this.baseline.metadata!,
		};
	}

	private validateBaseline(): void {
		if (
			this.baseline.totalExecutionTime === undefined ||
			this.baseline.totalExecutionTime < 0
		) {
			throw new Error("Total execution time must be non-negative");
		}
		if (
			this.baseline.totalTests === undefined ||
			this.baseline.totalTests < 0
		) {
			throw new Error("Total tests must be non-negative");
		}
		if (
			this.baseline.failedTests === undefined ||
			this.baseline.failedTests < 0
		) {
			throw new Error("Failed tests must be non-negative");
		}
		if (this.baseline.failedTests > this.baseline.totalTests) {
			throw new Error("Failed tests cannot exceed total tests");
		}
	}
}

/**
 * Compare current performance against baseline
 */
export function comparePerformance(
	baseline: PerformanceBaseline,
	current: PerformanceMetrics,
): PerformanceComparison {
	const timeImprovement = calculatePercentageChange(
		baseline.totalExecutionTime,
		current.executionTime,
		true, // Improvement is reduction in time
	);

	const testReduction = baseline.totalTests - current.testCount;

	const reliabilityChange = current.passRate - baseline.passRate;

	const coverageChange =
		current.coveragePercentage - baseline.coveragePercentage;

	const memoryImprovement = calculatePercentageChange(
		baseline.memoryUsage,
		current.memoryUsage,
		true, // Improvement is reduction in memory
	);

	const targets = getDefaultTargets();
	const details = evaluateTargets(current, targets);

	return {
		timeImprovement,
		testReduction,
		reliabilityChange,
		coverageChange,
		memoryImprovement,
		meetsTargets: evaluateOverallSuccess(current, targets),
		details,
	};
}

/**
 * Evaluate if performance meets optimization targets
 */
export function evaluateOptimizationSuccess(
	baseline: PerformanceBaseline,
	current: PerformanceMetrics,
	targets?: PerformanceTarget,
): boolean {
	const actualTargets = targets || getDefaultTargets();

	return (
		current.executionTime <= actualTargets.targetExecutionTime &&
		current.testCount <= actualTargets.targetTests &&
		current.passRate >= actualTargets.targetPassRate &&
		current.coveragePercentage >= baseline.coveragePercentage - 5 && // Allow 5% coverage loss
		current.memoryUsage <= actualTargets.targetMemoryUsage
	);
}

/**
 * Generate optimization recommendations based on baseline
 */
export function generateOptimizationRecommendations(
	baseline: PerformanceBaseline,
): string[] {
	const recommendations: string[] = [];

	if (baseline.totalExecutionTime > 1500) {
		const reductionNeeded = baseline.totalExecutionTime - 1500;
		recommendations.push(
			`Reduce execution time by ${reductionNeeded.toFixed(0)}ms (${((reductionNeeded / baseline.totalExecutionTime) * 100).toFixed(1)}%)`,
		);
	}

	if (baseline.passRate < 99) {
		const improvementNeeded = 99 - baseline.passRate;
		recommendations.push(
			`Improve pass rate by ${improvementNeeded.toFixed(1)} percentage points`,
		);
	}

	if (baseline.totalTests > 250) {
		const reductionNeeded = baseline.totalTests - 250;
		recommendations.push(
			`Reduce test count by approximately ${reductionNeeded} tests (${((reductionNeeded / baseline.totalTests) * 100).toFixed(1)}%)`,
		);
	}

	if (baseline.workerIssues) {
		recommendations.push("Fix worker exit issues to improve test stability");
	}

	if (baseline.parserWarnings > 0) {
		recommendations.push(
			`Eliminate ${baseline.parserWarnings} parser registration warnings`,
		);
	}

	if (baseline.memoryUsage > 100) {
		recommendations.push(
			`Reduce memory usage from ${baseline.memoryUsage.toFixed(1)}MB to under 100MB`,
		);
	}

	return recommendations;
}

/**
 * Track performance trends over multiple baselines
 */
export function trackPerformanceTrends(
	baselines: PerformanceBaseline[],
): PerformanceTrend {
	if (baselines.length < 2) {
		throw new Error("At least 2 baselines required for trend analysis");
	}

	const sorted = [...baselines].sort(
		(a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
	);
	const oldest = sorted[0];
	const newest = sorted[sorted.length - 1];

	return {
		timespan: newest.timestamp.getTime() - oldest.timestamp.getTime(),
		executionTimeChange: calculatePercentageChange(
			oldest.totalExecutionTime,
			newest.totalExecutionTime,
			true,
		),
		passRateChange: newest.passRate - oldest.passRate,
		testCountChange: newest.totalTests - oldest.totalTests,
		coverageChange: newest.coveragePercentage - oldest.coveragePercentage,
		direction: determineTrendDirection(oldest, newest),
		dataPoints: sorted.length,
	};
}

function calculatePercentageChange(
	baseline: number,
	current: number,
	improvementIsReduction: boolean = false,
): number {
	if (baseline === 0) return current === 0 ? 0 : 100;

	const change = ((current - baseline) / baseline) * 100;
	return improvementIsReduction ? -change : change;
}

function getDefaultTargets(): PerformanceTarget {
	return {
		targetExecutionTime: 1500, // 1.5 seconds
		targetTests: 250,
		targetFailedTests: 2, // <1% failure rate
		targetPassRate: 99, // >99%
		targetSuiteReliability: 95, // >95%
		targetMemoryUsage: 100, // 100MB
	};
}

function evaluateTargets(
	current: PerformanceMetrics,
	targets: PerformanceTarget,
): ComparisonDetails {
	const executionTimeMet = current.executionTime <= targets.targetExecutionTime;
	const testCountMet = current.testCount <= targets.targetTests;
	const passRateMet = current.passRate >= targets.targetPassRate;
	const coverageMet = current.coveragePercentage >= 80; // Maintain minimum coverage
	const memoryMet = current.memoryUsage <= targets.targetMemoryUsage;
	const reliabilityMet =
		(1 - current.failureRate) * 100 >= targets.targetSuiteReliability;

	const improvements: string[] = [];
	const regressions: string[] = [];

	if (executionTimeMet) improvements.push("Execution time target achieved");
	else
		regressions.push(
			`Execution time ${current.executionTime}ms exceeds target ${targets.targetExecutionTime}ms`,
		);

	if (testCountMet) improvements.push("Test count target achieved");
	else
		regressions.push(
			`Test count ${current.testCount} exceeds target ${targets.targetTests}`,
		);

	if (passRateMet) improvements.push("Pass rate target achieved");
	else
		regressions.push(
			`Pass rate ${current.passRate.toFixed(1)}% below target ${targets.targetPassRate}%`,
		);

	if (coverageMet) improvements.push("Coverage target maintained");
	else
		regressions.push(
			`Coverage ${current.coveragePercentage.toFixed(1)}% below minimum 80%`,
		);

	if (memoryMet) improvements.push("Memory usage target achieved");
	else
		regressions.push(
			`Memory usage ${current.memoryUsage.toFixed(1)}MB exceeds target ${targets.targetMemoryUsage}MB`,
		);

	return {
		executionTimeMet,
		testCountMet,
		passRateMet,
		coverageMet,
		memoryMet,
		reliabilityMet,
		improvements,
		regressions,
	};
}

function evaluateOverallSuccess(
	current: PerformanceMetrics,
	targets: PerformanceTarget,
): boolean {
	return (
		current.executionTime <= targets.targetExecutionTime &&
		current.testCount <= targets.targetTests &&
		current.passRate >= targets.targetPassRate &&
		current.coveragePercentage >= 80 &&
		current.memoryUsage <= targets.targetMemoryUsage
	);
}

function determineTrendDirection(
	oldest: PerformanceBaseline,
	newest: PerformanceBaseline,
): "improving" | "degrading" | "stable" {
	let improvements = 0;
	let degradations = 0;

	// Check execution time (lower is better)
	if (newest.totalExecutionTime < oldest.totalExecutionTime) improvements++;
	else if (newest.totalExecutionTime > oldest.totalExecutionTime)
		degradations++;

	// Check pass rate (higher is better)
	if (newest.passRate > oldest.passRate) improvements++;
	else if (newest.passRate < oldest.passRate) degradations++;

	// Check coverage (higher is better)
	if (newest.coveragePercentage > oldest.coveragePercentage) improvements++;
	else if (newest.coveragePercentage < oldest.coveragePercentage)
		degradations++;

	if (improvements > degradations) return "improving";
	if (degradations > improvements) return "degrading";
	return "stable";
}

// Legacy class export removed - use individual functions instead

export interface PerformanceTrend {
	timespan: number; // Duration between oldest and newest baseline (ms)
	executionTimeChange: number; // Percentage change in execution time
	passRateChange: number; // Change in pass rate (percentage points)
	testCountChange: number; // Change in test count
	coverageChange: number; // Change in coverage (percentage points)
	direction: "improving" | "degrading" | "stable";
	dataPoints: number; // Number of baselines used for analysis
}

// Default performance baselines for comparison
export const DefaultBaselines = {
	// Current baseline from research
	current: {
		totalExecutionTime: 3170, // 3.17 seconds
		totalTests: 309,
		failedTests: 23,
		failedSuites: 5,
		passRate: 92.6, // 92.6%
		coveragePercentage: 85, // Estimated
		memoryUsage: 120, // Estimated 120MB
		workerIssues: true,
		parserWarnings: 15, // Estimated
	},

	// Target baseline after optimization
	target: {
		totalExecutionTime: 1500, // 1.5 seconds
		totalTests: 250,
		failedTests: 2,
		failedSuites: 1,
		passRate: 99.2, // >99%
		coveragePercentage: 85, // Maintain coverage
		memoryUsage: 80, // Reduced memory
		workerIssues: false,
		parserWarnings: 0,
	},
};
