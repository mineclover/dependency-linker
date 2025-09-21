/**
 * Performance Benchmark Helper
 * Provides utilities for benchmarking test execution performance
 */

export interface BenchmarkResult {
	totalTime: number;
	avgPerIteration: number;
	iterations: number;
	memoryUsage?: {
		peak: number;
		average: number;
	};
}

export interface BenchmarkOptions {
	iterations?: number;
	collectMemory?: boolean;
	warmupRuns?: number;
}

export class PerformanceBenchmark {
	private static results: Map<string, BenchmarkResult> = new Map();

	/**
	 * Run a benchmark for a given operation
	 */
	static async benchmark(
		name: string,
		operation: () => Promise<void>,
		options: BenchmarkOptions = {},
	): Promise<BenchmarkResult> {
		const { iterations = 1, collectMemory = false, warmupRuns = 0 } = options;

		// Warmup runs
		for (let i = 0; i < warmupRuns; i++) {
			await operation();
		}

		const memoryReadings: number[] = [];
		const startTime = performance.now();

		for (let i = 0; i < iterations; i++) {
			if (collectMemory) {
				const beforeMemory = process.memoryUsage().heapUsed;
				await operation();
				const afterMemory = process.memoryUsage().heapUsed;
				memoryReadings.push(afterMemory - beforeMemory);
			} else {
				await operation();
			}
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;

		const result: BenchmarkResult = {
			totalTime,
			avgPerIteration: totalTime / iterations,
			iterations,
		};

		if (collectMemory && memoryReadings.length > 0) {
			result.memoryUsage = {
				peak: Math.max(...memoryReadings),
				average:
					memoryReadings.reduce((sum, val) => sum + val, 0) /
					memoryReadings.length,
			};
		}

		PerformanceBenchmark.results.set(name, result);
		return result;
	}

	/**
	 * Assert performance requirements
	 */
	static assertPerformance(
		result: BenchmarkResult,
		maxTotalTime: number,
		maxMemoryMB?: number,
		maxAvgTime?: number,
	): void {
		if (result.totalTime > maxTotalTime) {
			throw new Error(
				`Performance assertion failed: Total time ${result.totalTime.toFixed(2)}ms exceeds ${maxTotalTime}ms`,
			);
		}

		if (maxAvgTime && result.avgPerIteration > maxAvgTime) {
			throw new Error(
				`Performance assertion failed: Average time ${result.avgPerIteration.toFixed(2)}ms exceeds ${maxAvgTime}ms`,
			);
		}

		if (maxMemoryMB && result.memoryUsage) {
			const peakMB = result.memoryUsage.peak / (1024 * 1024);
			if (peakMB > maxMemoryMB) {
				throw new Error(
					`Performance assertion failed: Peak memory ${peakMB.toFixed(2)}MB exceeds ${maxMemoryMB}MB`,
				);
			}
		}
	}

	/**
	 * Get benchmark result by name
	 */
	static getResult(name: string): BenchmarkResult | undefined {
		return PerformanceBenchmark.results.get(name);
	}

	/**
	 * Clear all benchmark results
	 */
	static clearResults(): void {
		PerformanceBenchmark.results.clear();
	}

	/**
	 * Get all benchmark results
	 */
	static getAllResults(): Map<string, BenchmarkResult> {
		return new Map(PerformanceBenchmark.results);
	}
}
