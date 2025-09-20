/**
 * Performance benchmarking utilities for test optimization
 */

export interface BenchmarkResult<T = any> {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: number;
  timestamp: number;
  result: T;
}

export interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
  timeout: number;
  measureMemory: boolean;
}

export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];
  private config: BenchmarkConfig;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      iterations: 10,
      warmupRuns: 3,
      timeout: 30000,
      measureMemory: true,
      ...config
    };
  }

  async benchmark<T>(name: string, fn: () => Promise<T> | T): Promise<BenchmarkResult<T>> {
    // Warmup runs
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await fn();
    }

    const times: number[] = [];
    let totalMemory = 0;
    let lastResult: T;

    // Actual benchmark runs
    for (let i = 0; i < this.config.iterations; i++) {
      const startMemory = this.config.measureMemory ? process.memoryUsage().heapUsed : 0;
      const startTime = performance.now();

      lastResult = await fn();

      const endTime = performance.now();
      const endMemory = this.config.measureMemory ? process.memoryUsage().heapUsed : 0;

      times.push(endTime - startTime);
      totalMemory += (endMemory - startMemory);
    }

    const result: BenchmarkResult<T> = {
      name,
      iterations: this.config.iterations,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      memoryUsage: totalMemory / times.length / 1024 / 1024, // MB
      timestamp: Date.now(),
      result: lastResult!
    };

    this.results.push(result);
    return result;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const report = this.results.map(result =>
      `${result.name}: ${result.averageTime.toFixed(2)}ms avg (${result.minTime.toFixed(2)}-${result.maxTime.toFixed(2)}ms), ${result.memoryUsage.toFixed(2)}MB`
    ).join('\n');

    return `Benchmark Results:\n${report}`;
  }

  clear(): void {
    this.results = [];
  }
}

export function createBaseline(): BenchmarkSuite {
  return new BenchmarkSuite({
    iterations: 5,
    warmupRuns: 2,
    measureMemory: true
  });
}

export default BenchmarkSuite;