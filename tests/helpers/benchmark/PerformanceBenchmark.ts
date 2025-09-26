/**
 * Performance benchmarking utilities for test optimization
 */

export interface BenchmarkResult {
	name: string;
	duration: number;
	memoryDelta: number;
	iterations: number;
	avgPerIteration: number;
	timestamp: number;
}

export interface BenchmarkOptions {
	iterations?: number;
	warmupIterations?: number;
	timeout?: number;
	collectMemory?: boolean;
}

export class PerformanceBenchmark {
	private static results: BenchmarkResult[] = [];

	/**
	 * Benchmark a function's performance
	 */
	static async benchmark<T>(
		name: string,
		fn: () => Promise<T> | T,
		options: BenchmarkOptions = {},
	): Promise<BenchmarkResult> {
		const {
			iterations = 100,
			warmupIterations = 10,
			timeout = 30000,
			collectMemory = true,
		} = options;

		// Warmup phase
		for (let i = 0; i < warmupIterations; i++) {
			await fn();
		}

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		const startMemory = collectMemory ? process.memoryUsage().heapUsed : 0;
		const startTime = performance.now();

		// Actual benchmark iterations
		for (let i = 0; i < iterations; i++) {
			await fn();
		}

		const endTime = performance.now();
		const endMemory = collectMemory ? process.memoryUsage().heapUsed : 0;

		const duration = endTime - startTime;
		const memoryDelta = endMemory - startMemory;
		const avgPerIteration = duration / iterations;

		const result: BenchmarkResult = {
			name,
			duration,
			memoryDelta: memoryDelta / 1024 / 1024, // Convert to MB
			iterations,
			avgPerIteration,
			timestamp: Date.now(),
		};

		this.results.push(result);
		return result;
	}

	/**
	 * Compare performance between multiple functions
	 */
	static async compare<T>(
		benchmarks: Array<{ name: string; fn: () => Promise<T> | T }>,
		options?: BenchmarkOptions,
	): Promise<BenchmarkResult[]> {
		const results: BenchmarkResult[] = [];

		for (const { name, fn } of benchmarks) {
			const result = await this.benchmark(name, fn, options);
			results.push(result);
		}

		// Sort by performance (fastest first)
		return results.sort((a, b) => a.avgPerIteration - b.avgPerIteration);
	}

	/**
	 * Get all benchmark results
	 */
	static getResults(): BenchmarkResult[] {
		return [...this.results];
	}

	/**
	 * Clear benchmark results
	 */
	static clearResults(): void {
		this.results = [];
	}

	/**
	 * Generate performance report
	 */
	static generateReport(): string {
		if (this.results.length === 0) {
			return "No benchmark results available.";
		}

		let report = "=== Performance Benchmark Report ===\n\n";

		this.results.forEach((result, index) => {
			report += `${index + 1}. ${result.name}\n`;
			report += `   Duration: ${result.duration.toFixed(2)}ms\n`;
			report += `   Avg/iteration: ${result.avgPerIteration.toFixed(4)}ms\n`;
			report += `   Memory delta: ${result.memoryDelta.toFixed(2)}MB\n`;
			report += `   Iterations: ${result.iterations}\n\n`;
		});

		return report;
	}

	/**
	 * Assert performance within thresholds
	 */
	static assertPerformance(
		result: BenchmarkResult,
		maxDuration?: number,
		maxMemoryMB?: number,
		maxAvgPerIteration?: number,
	): void {
		if (maxDuration && result.duration > maxDuration) {
			throw new Error(
				`Performance assertion failed: ${result.name} took ${result.duration.toFixed(2)}ms, ` +
					`expected ≤${maxDuration}ms`,
			);
		}

		if (maxMemoryMB && result.memoryDelta > maxMemoryMB) {
			throw new Error(
				`Memory assertion failed: ${result.name} used ${result.memoryDelta.toFixed(2)}MB, ` +
					`expected ≤${maxMemoryMB}MB`,
			);
		}

		if (maxAvgPerIteration && result.avgPerIteration > maxAvgPerIteration) {
			throw new Error(
				`Performance assertion failed: ${result.name} avg ${result.avgPerIteration.toFixed(4)}ms/iter, ` +
					`expected ≤${maxAvgPerIteration}ms/iter`,
			);
		}
	}
}

export default PerformanceBenchmark;
