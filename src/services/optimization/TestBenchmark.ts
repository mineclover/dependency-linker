/**
 * Test Benchmark (T027)
 * Provides benchmarking capabilities for test performance measurement and comparison
 */

import { PerformanceBaseline } from "../../models/optimization/PerformanceBaseline";
import type { TestCase } from "../../models/optimization/TestCase";
import type { TestSuite } from "../../models/optimization/TestSuite";

export interface BenchmarkConfiguration {
	iterations: number;
	warmupIterations: number;
	timeout: number;
	collectMemory: boolean;
	collectCPU: boolean;
	collectGC: boolean;
	includeSetupTeardown: boolean;
	enableComparison: boolean;
}

export interface BenchmarkResult {
	id: string;
	name: string;
	configuration: BenchmarkConfiguration;
	measurements: BenchmarkMeasurement[];
	statistics: BenchmarkStatistics;
	environment: EnvironmentInfo;
	timestamp: Date;
	metadata: Record<string, any>;
}

export interface BenchmarkMeasurement {
	iteration: number;
	duration: number;
	setupTime?: number;
	executionTime: number;
	teardownTime?: number;
	memoryUsage: MemoryMeasurement;
	cpuUsage?: CPUMeasurement;
	gcStats?: GCMeasurement;
	timestamp: Date;
	success: boolean;
	error?: string;
}

export interface MemoryMeasurement {
	heapUsed: number;
	heapTotal: number;
	rss: number;
	external: number;
	arrayBuffers: number;
	peak: number;
	delta: number;
}

export interface CPUMeasurement {
	user: number;
	system: number;
	total: number;
	percentage: number;
}

export interface GCMeasurement {
	collections: number;
	duration: number;
	freed: number;
	type: string;
}

export interface BenchmarkStatistics {
	duration: StatisticalSummary;
	memoryUsage: StatisticalSummary;
	cpuUsage?: StatisticalSummary;
	throughput: number; // operations per second
	successRate: number;
	confidence: ConfidenceInterval;
}

export interface StatisticalSummary {
	min: number;
	max: number;
	mean: number;
	median: number;
	stdDev: number;
	variance: number;
	percentiles: Record<number, number>; // 50th, 90th, 95th, 99th
}

export interface ConfidenceInterval {
	level: number; // e.g., 0.95 for 95%
	lower: number;
	upper: number;
	marginOfError: number;
}

export interface EnvironmentInfo {
	nodeVersion: string;
	platform: string;
	arch: string;
	cpus: number;
	totalMemory: number;
	freeMemory: number;
	loadAverage: number[];
	timestamp: Date;
}

export interface BenchmarkComparison {
	baseline: BenchmarkResult;
	current: BenchmarkResult;
	comparison: ComparisonResult;
	analysis: ComparisonAnalysis;
}

export interface ComparisonResult {
	durationChange: number; // percentage change
	memoryChange: number;
	throughputChange: number;
	significantDifference: boolean;
	pValue?: number;
	effectSize?: number;
}

export interface ComparisonAnalysis {
	verdict: "improvement" | "regression" | "neutral";
	confidence: "high" | "medium" | "low";
	recommendations: string[];
	warnings: string[];
}

export class TestBenchmark {
	private static instance: TestBenchmark;
	private results: Map<string, BenchmarkResult> = new Map();
	private baselines: Map<string, BenchmarkResult> = new Map();

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): TestBenchmark {
		if (!TestBenchmark.instance) {
			TestBenchmark.instance = new TestBenchmark();
		}
		return TestBenchmark.instance;
	}

	/**
	 * Benchmark a test suite execution
	 */
	async benchmarkTestSuite(
		testSuite: TestSuite,
		testRunner: () => Promise<any>,
		config: Partial<BenchmarkConfiguration> = {},
	): Promise<BenchmarkResult> {
		const configuration = this.createConfiguration(config);
		const benchmarkId = `suite-${testSuite.id}-${Date.now()}`;

		console.log(
			`🏃 Starting benchmark: ${testSuite.name} (${configuration.iterations} iterations)`,
		);

		const measurements: BenchmarkMeasurement[] = [];
		const environment = await this.captureEnvironmentInfo();

		// Warmup phase
		if (configuration.warmupIterations > 0) {
			console.log(
				`🔥 Warmup phase: ${configuration.warmupIterations} iterations`,
			);
			for (let i = 0; i < configuration.warmupIterations; i++) {
				try {
					await this.runSingleIteration(testRunner, i, configuration, false);
				} catch (error) {
					console.warn(`Warmup iteration ${i} failed:`, error);
				}
			}

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			// Wait a bit before actual measurements
			await this.sleep(1000);
		}

		// Actual benchmark iterations
		console.log(`📊 Benchmark phase: ${configuration.iterations} iterations`);
		for (let i = 0; i < configuration.iterations; i++) {
			try {
				const measurement = await this.runSingleIteration(
					testRunner,
					i,
					configuration,
					true,
				);
				measurements.push(measurement);

				if (
					i > 0 &&
					i % Math.max(1, Math.floor(configuration.iterations / 10)) === 0
				) {
					const progress = ((i / configuration.iterations) * 100).toFixed(0);
					console.log(
						`📈 Progress: ${progress}% (${i}/${configuration.iterations})`,
					);
				}
			} catch (error) {
				console.error(`Benchmark iteration ${i} failed:`, error);
				measurements.push({
					iteration: i,
					duration: 0,
					executionTime: 0,
					memoryUsage: this.getEmptyMemoryMeasurement(),
					timestamp: new Date(),
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Calculate statistics
		const statistics = this.calculateStatistics(measurements);

		const result: BenchmarkResult = {
			id: benchmarkId,
			name: `${testSuite.name} Benchmark`,
			configuration,
			measurements,
			statistics,
			environment,
			timestamp: new Date(),
			metadata: {
				testSuiteId: testSuite.id,
				testCaseCount: testSuite.testCases.length,
				executionTime: testSuite.executionTime,
			},
		};

		this.results.set(benchmarkId, result);
		console.log(`✅ Benchmark completed: ${benchmarkId}`);
		this.printBenchmarkSummary(result);

		return result;
	}

	/**
	 * Benchmark a single test case
	 */
	async benchmarkTestCase(
		testCase: TestCase,
		testRunner: () => Promise<any>,
		config: Partial<BenchmarkConfiguration> = {},
	): Promise<BenchmarkResult> {
		const configuration = this.createConfiguration(config);
		const benchmarkId = `test-${testCase.id}-${Date.now()}`;

		const measurements: BenchmarkMeasurement[] = [];
		const environment = await this.captureEnvironmentInfo();

		// Warmup
		for (let i = 0; i < configuration.warmupIterations; i++) {
			try {
				await this.runSingleIteration(testRunner, i, configuration, false);
			} catch (error) {
				// Ignore warmup failures
			}
		}

		// Benchmark iterations
		for (let i = 0; i < configuration.iterations; i++) {
			try {
				const measurement = await this.runSingleIteration(
					testRunner,
					i,
					configuration,
					true,
				);
				measurements.push(measurement);
			} catch (error) {
				measurements.push({
					iteration: i,
					duration: 0,
					executionTime: 0,
					memoryUsage: this.getEmptyMemoryMeasurement(),
					timestamp: new Date(),
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		const statistics = this.calculateStatistics(measurements);

		const result: BenchmarkResult = {
			id: benchmarkId,
			name: `${testCase.name} Benchmark`,
			configuration,
			measurements,
			statistics,
			environment,
			timestamp: new Date(),
			metadata: {
				testCaseId: testCase.id,
				type: testCase.type,
				executionTime: testCase.executionTime,
			},
		};

		this.results.set(benchmarkId, result);
		return result;
	}

	/**
	 * Compare current benchmark with baseline
	 */
	async compareBenchmarks(
		currentId: string,
		baselineId: string,
	): Promise<BenchmarkComparison> {
		const current = this.results.get(currentId);
		const baseline =
			this.results.get(baselineId) || this.baselines.get(baselineId);

		if (!current || !baseline) {
			throw new Error(
				`Benchmark not found: current=${!!current}, baseline=${!!baseline}`,
			);
		}

		const comparison = this.calculateComparison(baseline, current);
		const analysis = this.analyzeComparison(comparison, baseline, current);

		return {
			baseline,
			current,
			comparison,
			analysis,
		};
	}

	/**
	 * Set baseline benchmark for future comparisons
	 */
	setBaseline(benchmarkId: string, baselineName: string): void {
		const benchmark = this.results.get(benchmarkId);
		if (!benchmark) {
			throw new Error(`Benchmark not found: ${benchmarkId}`);
		}

		this.baselines.set(baselineName, benchmark);
		console.log(`📌 Baseline set: ${baselineName} = ${benchmarkId}`);
	}

	/**
	 * Generate comprehensive benchmark report
	 */
	generateReport(benchmarkId: string): string {
		const result = this.results.get(benchmarkId);
		if (!result) {
			throw new Error(`Benchmark not found: ${benchmarkId}`);
		}

		let report = "\n=== Benchmark Report ===\n\n";

		// Basic information
		report += `🏷️  Name: ${result.name}\n`;
		report += `🆔 ID: ${result.id}\n`;
		report += `📅 Date: ${result.timestamp.toISOString()}\n`;
		report += `🔢 Iterations: ${result.configuration.iterations}\n`;
		report += `✅ Success Rate: ${(result.statistics.successRate * 100).toFixed(1)}%\n\n`;

		// Performance statistics
		report += `⏱️  Duration Statistics:\n`;
		report += `   Mean: ${result.statistics.duration.mean.toFixed(2)}ms\n`;
		report += `   Median: ${result.statistics.duration.median.toFixed(2)}ms\n`;
		report += `   Min: ${result.statistics.duration.min.toFixed(2)}ms\n`;
		report += `   Max: ${result.statistics.duration.max.toFixed(2)}ms\n`;
		report += `   StdDev: ${result.statistics.duration.stdDev.toFixed(2)}ms\n`;
		report += `   95th percentile: ${result.statistics.duration.percentiles[95].toFixed(2)}ms\n\n`;

		// Memory statistics
		report += `💾 Memory Statistics:\n`;
		report += `   Mean: ${(result.statistics.memoryUsage.mean / 1024 / 1024).toFixed(2)}MB\n`;
		report += `   Median: ${(result.statistics.memoryUsage.median / 1024 / 1024).toFixed(2)}MB\n`;
		report += `   Peak: ${(result.statistics.memoryUsage.max / 1024 / 1024).toFixed(2)}MB\n`;
		report += `   StdDev: ${(result.statistics.memoryUsage.stdDev / 1024 / 1024).toFixed(2)}MB\n\n`;

		// Performance metrics
		report += `🚀 Performance Metrics:\n`;
		report += `   Throughput: ${result.statistics.throughput.toFixed(2)} ops/sec\n`;
		report += `   Confidence: ${result.statistics.confidence.level * 100}% CI [${result.statistics.confidence.lower.toFixed(2)}, ${result.statistics.confidence.upper.toFixed(2)}]\n\n`;

		// Environment information
		report += `🖥️  Environment:\n`;
		report += `   Node.js: ${result.environment.nodeVersion}\n`;
		report += `   Platform: ${result.environment.platform} ${result.environment.arch}\n`;
		report += `   CPUs: ${result.environment.cpus}\n`;
		report += `   Memory: ${(result.environment.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB total, ${(result.environment.freeMemory / 1024 / 1024 / 1024).toFixed(1)}GB free\n\n`;

		return report;
	}

	// Private implementation methods

	private createConfiguration(
		config: Partial<BenchmarkConfiguration>,
	): BenchmarkConfiguration {
		return {
			iterations: config.iterations || 10,
			warmupIterations: config.warmupIterations || 3,
			timeout: config.timeout || 30000,
			collectMemory: config.collectMemory !== false,
			collectCPU: config.collectCPU || false,
			collectGC: config.collectGC || false,
			includeSetupTeardown: config.includeSetupTeardown || false,
			enableComparison: config.enableComparison !== false,
		};
	}

	private async runSingleIteration(
		testRunner: () => Promise<any>,
		iteration: number,
		config: BenchmarkConfiguration,
		record: boolean,
	): Promise<BenchmarkMeasurement> {
		const startMemory = process.memoryUsage();
		const startTime = performance.now();
		const startCPU = config.collectCPU ? process.cpuUsage() : undefined;

		let success = true;
		let error: string | undefined;

		try {
			await Promise.race([
				testRunner(),
				new Promise((_, reject) =>
					setTimeout(
						() => reject(new Error("Benchmark timeout")),
						config.timeout,
					),
				),
			]);
		} catch (err) {
			success = false;
			error = err instanceof Error ? err.message : String(err);
		}

		const endTime = performance.now();
		const endMemory = process.memoryUsage();
		const endCPU = config.collectCPU ? process.cpuUsage(startCPU) : undefined;

		const duration = endTime - startTime;
		const memoryUsage = this.calculateMemoryMeasurement(startMemory, endMemory);
		const cpuUsage = endCPU
			? this.calculateCPUMeasurement(endCPU, duration)
			: undefined;

		return {
			iteration,
			duration,
			executionTime: duration, // For simplicity, considering total duration as execution time
			memoryUsage,
			cpuUsage,
			timestamp: new Date(),
			success,
			error,
		};
	}

	private calculateMemoryMeasurement(
		startMemory: NodeJS.MemoryUsage,
		endMemory: NodeJS.MemoryUsage,
	): MemoryMeasurement {
		return {
			heapUsed: endMemory.heapUsed,
			heapTotal: endMemory.heapTotal,
			rss: endMemory.rss,
			external: endMemory.external,
			arrayBuffers: endMemory.arrayBuffers,
			peak: Math.max(endMemory.heapUsed, startMemory.heapUsed),
			delta: endMemory.heapUsed - startMemory.heapUsed,
		};
	}

	private calculateCPUMeasurement(
		cpuUsage: NodeJS.CpuUsage,
		duration: number,
	): CPUMeasurement {
		const totalCPU = cpuUsage.user + cpuUsage.system;
		return {
			user: cpuUsage.user,
			system: cpuUsage.system,
			total: totalCPU,
			percentage: (totalCPU / (duration * 1000)) * 100, // Convert to percentage
		};
	}

	private getEmptyMemoryMeasurement(): MemoryMeasurement {
		const mem = process.memoryUsage();
		return {
			heapUsed: mem.heapUsed,
			heapTotal: mem.heapTotal,
			rss: mem.rss,
			external: mem.external,
			arrayBuffers: mem.arrayBuffers,
			peak: mem.heapUsed,
			delta: 0,
		};
	}

	private async captureEnvironmentInfo(): Promise<EnvironmentInfo> {
		const os = require("os");
		return {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			cpus: os.cpus().length,
			totalMemory: os.totalmem(),
			freeMemory: os.freemem(),
			loadAverage: os.loadavg(),
			timestamp: new Date(),
		};
	}

	private calculateStatistics(
		measurements: BenchmarkMeasurement[],
	): BenchmarkStatistics {
		const successfulMeasurements = measurements.filter((m) => m.success);
		const durations = successfulMeasurements.map((m) => m.duration);
		const memoryUsages = successfulMeasurements.map(
			(m) => m.memoryUsage.heapUsed,
		);

		const durationStats = this.calculateStatisticalSummary(durations);
		const memoryStats = this.calculateStatisticalSummary(memoryUsages);

		const successRate = successfulMeasurements.length / measurements.length;
		const throughput = measurements.length > 0 ? 1000 / durationStats.mean : 0; // operations per second

		// Calculate confidence interval (95% by default)
		const confidence = this.calculateConfidenceInterval(durations, 0.95);

		return {
			duration: durationStats,
			memoryUsage: memoryStats,
			throughput,
			successRate,
			confidence,
		};
	}

	private calculateStatisticalSummary(values: number[]): StatisticalSummary {
		if (values.length === 0) {
			return {
				min: 0,
				max: 0,
				mean: 0,
				median: 0,
				stdDev: 0,
				variance: 0,
				percentiles: { 50: 0, 90: 0, 95: 0, 99: 0 },
			};
		}

		const sorted = [...values].sort((a, b) => a - b);
		const min = sorted[0];
		const max = sorted[sorted.length - 1];
		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

		const median =
			sorted.length % 2 === 0
				? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
				: sorted[Math.floor(sorted.length / 2)];

		const variance =
			values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
		const stdDev = Math.sqrt(variance);

		const percentiles = {
			50: this.calculatePercentile(sorted, 50),
			90: this.calculatePercentile(sorted, 90),
			95: this.calculatePercentile(sorted, 95),
			99: this.calculatePercentile(sorted, 99),
		};

		return { min, max, mean, median, stdDev, variance, percentiles };
	}

	private calculatePercentile(
		sortedValues: number[],
		percentile: number,
	): number {
		const index = (percentile / 100) * (sortedValues.length - 1);
		const lower = Math.floor(index);
		const upper = Math.ceil(index);
		const weight = index % 1;

		if (upper >= sortedValues.length)
			return sortedValues[sortedValues.length - 1];
		if (lower < 0) return sortedValues[0];

		return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
	}

	private calculateConfidenceInterval(
		values: number[],
		level: number,
	): ConfidenceInterval {
		if (values.length < 2) {
			return { level, lower: 0, upper: 0, marginOfError: 0 };
		}

		const stats = this.calculateStatisticalSummary(values);
		const standardError = stats.stdDev / Math.sqrt(values.length);

		// Using t-distribution approximation (simplified)
		const tValue = 1.96; // Approximation for 95% confidence
		const marginOfError = tValue * standardError;

		return {
			level,
			lower: stats.mean - marginOfError,
			upper: stats.mean + marginOfError,
			marginOfError,
		};
	}

	private calculateComparison(
		baseline: BenchmarkResult,
		current: BenchmarkResult,
	): ComparisonResult {
		const durationChange =
			(current.statistics.duration.mean - baseline.statistics.duration.mean) /
			baseline.statistics.duration.mean;
		const memoryChange =
			(current.statistics.memoryUsage.mean -
				baseline.statistics.memoryUsage.mean) /
			baseline.statistics.memoryUsage.mean;
		const throughputChange =
			(current.statistics.throughput - baseline.statistics.throughput) /
			baseline.statistics.throughput;

		// Simple statistical significance test (simplified)
		const combinedStdErr = Math.sqrt(
			baseline.statistics.duration.stdDev ** 2 +
				current.statistics.duration.stdDev ** 2,
		);
		const tStatistic =
			Math.abs(
				current.statistics.duration.mean - baseline.statistics.duration.mean,
			) / combinedStdErr;
		const significantDifference = tStatistic > 1.96; // 95% confidence

		return {
			durationChange,
			memoryChange,
			throughputChange,
			significantDifference,
			pValue: significantDifference ? 0.05 : 0.5, // Simplified
			effectSize: Math.abs(durationChange),
		};
	}

	private analyzeComparison(
		comparison: ComparisonResult,
		baseline: BenchmarkResult,
		current: BenchmarkResult,
	): ComparisonAnalysis {
		const threshold = 0.05; // 5% threshold
		let verdict: ComparisonAnalysis["verdict"] = "neutral";
		let confidence: ComparisonAnalysis["confidence"] = "medium";

		// Determine verdict
		if (comparison.significantDifference) {
			if (comparison.durationChange < -threshold) {
				verdict = "improvement";
			} else if (comparison.durationChange > threshold) {
				verdict = "regression";
			}
			confidence = "high";
		} else {
			confidence = "low";
		}

		const recommendations: string[] = [];
		const warnings: string[] = [];

		// Generate recommendations
		if (verdict === "regression") {
			recommendations.push("Investigate performance regression causes");
			recommendations.push("Consider reverting recent changes");
			warnings.push(
				`Performance degraded by ${(comparison.durationChange * 100).toFixed(1)}%`,
			);
		} else if (verdict === "improvement") {
			recommendations.push(
				"Document optimization techniques for future reference",
			);
			recommendations.push(
				"Consider applying similar optimizations to other areas",
			);
		} else {
			recommendations.push("Continue monitoring performance trends");
		}

		if (comparison.memoryChange > 0.1) {
			warnings.push(
				`Memory usage increased by ${(comparison.memoryChange * 100).toFixed(1)}%`,
			);
		}

		return {
			verdict,
			confidence,
			recommendations,
			warnings,
		};
	}

	private printBenchmarkSummary(result: BenchmarkResult): void {
		console.log(`\n📊 Benchmark Summary: ${result.name}`);
		console.log(
			`   Duration: ${result.statistics.duration.mean.toFixed(2)}ms ±${result.statistics.duration.stdDev.toFixed(2)}ms`,
		);
		console.log(
			`   Memory: ${(result.statistics.memoryUsage.mean / 1024 / 1024).toFixed(2)}MB`,
		);
		console.log(
			`   Throughput: ${result.statistics.throughput.toFixed(2)} ops/sec`,
		);
		console.log(
			`   Success Rate: ${(result.statistics.successRate * 100).toFixed(1)}%\n`,
		);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Clear all benchmark results
	 */
	clearResults(): void {
		this.results.clear();
		this.baselines.clear();
	}

	/**
	 * Get all benchmark results
	 */
	getAllResults(): BenchmarkResult[] {
		return Array.from(this.results.values());
	}

	/**
	 * Get benchmark result by ID
	 */
	getResult(benchmarkId: string): BenchmarkResult | undefined {
		return this.results.get(benchmarkId);
	}
}
