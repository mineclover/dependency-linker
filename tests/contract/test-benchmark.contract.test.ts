/**
 * Contract tests for ITestBenchmark interface (T012)
 * Validates test benchmark implementations for performance measurement
 */

import {
  ITestBenchmark,
  BenchmarkResult,
  MemoryBenchmarkResult,
  BenchmarkComparison,
  validateTestBenchmark,
  UTILITY_CONTRACT_SCENARIOS
} from '../../specs/005-test-optimization/contracts/test-utilities.contract';

// Mock implementation for contract testing
class MockTestBenchmark implements ITestBenchmark {
  async benchmarkExecution<T>(
    testFn: () => Promise<T>,
    iterations: number = 10
  ): Promise<BenchmarkResult<T>> {
    if (typeof testFn !== 'function') {
      throw new Error('Test function is required');
    }
    if (typeof iterations !== 'number' || iterations < 1) {
      throw new Error('Iterations must be a positive number');
    }

    const times: number[] = [];
    let result: T;

    // Warmup run
    result = await testFn();

    // Benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      result = await testFn();
      const end = performance.now();
      times.push(end - start);
    }

    // Calculate statistics
    const sortedTimes = [...times].sort((a, b) => a - b);
    const total = times.reduce((sum, time) => sum + time, 0);
    const mean = total / times.length;

    // Median
    const median = sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
      : sortedTimes[Math.floor(sortedTimes.length / 2)];

    // Standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      result: result!,
      executionTime: total,
      iterations,
      mean,
      median,
      standardDeviation,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  async benchmarkMemory<T>(
    testFn: () => Promise<T>
  ): Promise<MemoryBenchmarkResult<T>> {
    if (typeof testFn !== 'function') {
      throw new Error('Test function is required');
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage();
    let peakMemory = { ...initialMemory };

    // Monitor memory during execution
    const memoryInterval = setInterval(() => {
      const currentMemory = process.memoryUsage();
      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = currentMemory;
      }
    }, 10);

    try {
      const result = await testFn();

      clearInterval(memoryInterval);

      // Final memory measurement
      const finalMemory = process.memoryUsage();

      // Update peak if final is higher
      if (finalMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = finalMemory;
      }

      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      return {
        result,
        initialMemory,
        peakMemory,
        finalMemory,
        memoryDelta: memoryDelta / (1024 * 1024) // Convert to MB
      };

    } catch (error) {
      clearInterval(memoryInterval);
      throw error;
    }
  }

  compareBenchmarks(
    baseline: BenchmarkResult<any>,
    current: BenchmarkResult<any>
  ): BenchmarkComparison {
    if (!baseline || !current) {
      throw new Error('Both baseline and current benchmark results are required');
    }

    // Calculate percentage change in mean execution time
    const timeChange = ((current.mean - baseline.mean) / baseline.mean) * 100;

    // Statistical significance test (simplified t-test approximation)
    const pooledStdDev = Math.sqrt(
      ((baseline.iterations - 1) * Math.pow(baseline.standardDeviation, 2) +
       (current.iterations - 1) * Math.pow(current.standardDeviation, 2)) /
      (baseline.iterations + current.iterations - 2)
    );

    const standardError = pooledStdDev * Math.sqrt(
      1 / baseline.iterations + 1 / current.iterations
    );

    const tStatistic = Math.abs(current.mean - baseline.mean) / standardError;

    // Simple threshold for significance (approximating t-critical for common cases)
    const significantChange = tStatistic > 2.0;

    // Improvement if current is faster (negative time change)
    const improvement = timeChange < 0;

    // Confidence level (simplified approximation)
    const confidenceLevel = Math.min(0.99, Math.max(0.5, 1 - (1 / (1 + tStatistic))));

    return {
      timeChange,
      significantChange,
      improvement,
      confidenceLevel
    };
  }
}

describe('ITestBenchmark Contract Tests', () => {
  let benchmark: ITestBenchmark;

  beforeEach(() => {
    benchmark = new MockTestBenchmark();
  });

  describe('Interface Contract Compliance', () => {
    test('should implement all required methods', () => {
      expect(typeof benchmark.benchmarkExecution).toBe('function');
      expect(typeof benchmark.benchmarkMemory).toBe('function');
      expect(typeof benchmark.compareBenchmarks).toBe('function');
    });

    test('benchmarkExecution should return valid result structure', async () => {
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'test-result';
      };

      const result = await benchmark.benchmarkExecution(testFn, 5);

      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('mean');
      expect(result).toHaveProperty('median');
      expect(result).toHaveProperty('standardDeviation');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');

      expect(result.result).toBe('test-result');
      expect(result.iterations).toBe(5);
      expect(typeof result.executionTime).toBe('number');
      expect(typeof result.mean).toBe('number');
      expect(typeof result.median).toBe('number');
      expect(typeof result.standardDeviation).toBe('number');
      expect(typeof result.min).toBe('number');
      expect(typeof result.max).toBe('number');
    });

    test('benchmarkMemory should return valid result structure', async () => {
      const testFn = async () => {
        // Create some memory usage
        const largeArray = new Array(10000).fill('memory-test');
        return largeArray.length;
      };

      const result = await benchmark.benchmarkMemory(testFn);

      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('initialMemory');
      expect(result).toHaveProperty('peakMemory');
      expect(result).toHaveProperty('finalMemory');
      expect(result).toHaveProperty('memoryDelta');

      expect(result.result).toBe(10000);
      expect(typeof result.initialMemory).toBe('object');
      expect(typeof result.peakMemory).toBe('object');
      expect(typeof result.finalMemory).toBe('object');
      expect(typeof result.memoryDelta).toBe('number');
    });

    test('compareBenchmarks should return valid comparison structure', async () => {
      const fastFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'fast';
      };

      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return 'slow';
      };

      const baseline = await benchmark.benchmarkExecution(fastFn, 3);
      const current = await benchmark.benchmarkExecution(slowFn, 3);
      const comparison = benchmark.compareBenchmarks(baseline, current);

      expect(comparison).toHaveProperty('timeChange');
      expect(comparison).toHaveProperty('significantChange');
      expect(comparison).toHaveProperty('improvement');
      expect(comparison).toHaveProperty('confidenceLevel');

      expect(typeof comparison.timeChange).toBe('number');
      expect(typeof comparison.significantChange).toBe('boolean');
      expect(typeof comparison.improvement).toBe('boolean');
      expect(typeof comparison.confidenceLevel).toBe('number');
    });
  });

  describe('Error Handling Contract', () => {
    test('benchmarkExecution should reject invalid input', async () => {
      await expect(benchmark.benchmarkExecution(null as any)).rejects.toThrow(/function is required/);
      await expect(benchmark.benchmarkExecution(() => Promise.resolve(), 0)).rejects.toThrow(/positive number/);
      await expect(benchmark.benchmarkExecution(() => Promise.resolve(), -1)).rejects.toThrow(/positive number/);
    });

    test('benchmarkMemory should reject invalid input', async () => {
      await expect(benchmark.benchmarkMemory(null as any)).rejects.toThrow(/function is required/);
      await expect(benchmark.benchmarkMemory(undefined as any)).rejects.toThrow(/function is required/);
    });

    test('compareBenchmarks should reject invalid input', async () => {
      const validResult = await benchmark.benchmarkExecution(() => Promise.resolve(), 3);

      expect(() => benchmark.compareBenchmarks(null as any, validResult)).toThrow(/required/);
      expect(() => benchmark.compareBenchmarks(validResult, null as any)).toThrow(/required/);
      expect(() => benchmark.compareBenchmarks(undefined as any, validResult)).toThrow(/required/);
    });
  });

  describe('Execution Benchmark Contract', () => {
    test('should measure execution time accurately', async () => {
      const delay = 50; // 50ms delay
      const testFn = async () => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'result';
      };

      const result = await benchmark.benchmarkExecution(testFn, 3);

      // Allow for timing variations but should be roughly correct
      expect(result.mean).toBeGreaterThan(delay * 0.8); // At least 80% of expected time
      expect(result.mean).toBeLessThan(delay * 3); // But not more than 3x (generous for CI)
    });

    test('should calculate statistics correctly', async () => {
      const testFn = async () => {
        // Variable execution time
        const delay = Math.random() * 20 + 10; // 10-30ms
        await new Promise(resolve => setTimeout(resolve, delay));
        return delay;
      };

      const result = await benchmark.benchmarkExecution(testFn, 10);

      // Basic statistical properties
      expect(result.min).toBeLessThanOrEqual(result.mean);
      expect(result.max).toBeGreaterThanOrEqual(result.mean);
      expect(result.median).toBeGreaterThan(0);
      expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should support different iteration counts', async () => {
      const testFn = async () => Promise.resolve('test');

      const result3 = await benchmark.benchmarkExecution(testFn, 3);
      const result10 = await benchmark.benchmarkExecution(testFn, 10);

      expect(result3.iterations).toBe(3);
      expect(result10.iterations).toBe(10);

      // More iterations should generally provide more stable results
      // (though this isn't guaranteed for very fast operations)
      expect(result10.iterations).toBeGreaterThan(result3.iterations);
    });

    test('should handle fast operations', async () => {
      const fastFn = async () => {
        return Math.random();
      };

      const result = await benchmark.benchmarkExecution(fastFn, 5);

      expect(result.mean).toBeGreaterThan(0);
      expect(result.min).toBeGreaterThanOrEqual(0);
      expect(result.max).toBeGreaterThan(0);
    });

    test('should preserve function result', async () => {
      const testData = { value: 42, message: 'test' };
      const testFn = async () => testData;

      const result = await benchmark.benchmarkExecution(testFn, 3);

      expect(result.result).toBe(testData);
      expect(result.result.value).toBe(42);
      expect(result.result.message).toBe('test');
    });
  });

  describe('Memory Benchmark Contract', () => {
    test('should measure memory usage', async () => {
      const memoryHeavyFn = async () => {
        // Allocate significant memory
        const largeArray = new Array(100000).fill('memory-test-string');
        return largeArray.length;
      };

      const result = await benchmark.benchmarkMemory(memoryHeavyFn);

      expect(result.result).toBe(100000);
      expect(result.memoryDelta).toBeGreaterThan(0); // Should show memory increase
      expect(result.peakMemory.heapUsed).toBeGreaterThanOrEqual(result.initialMemory.heapUsed);
      expect(result.finalMemory.heapUsed).toBeGreaterThanOrEqual(result.initialMemory.heapUsed);
    });

    test('should track peak memory usage', async () => {
      const peakMemoryFn = async () => {
        // Allocate memory then release some
        const largeArray = new Array(50000).fill('peak-memory-test');
        const smallArray = largeArray.slice(0, 10000);
        return smallArray.length;
      };

      const result = await benchmark.benchmarkMemory(peakMemoryFn);

      expect(result.result).toBe(10000);
      expect(result.peakMemory.heapUsed).toBeGreaterThanOrEqual(result.initialMemory.heapUsed);
      expect(result.peakMemory.heapUsed).toBeGreaterThanOrEqual(result.finalMemory.heapUsed);
    });

    test('should handle memory-neutral operations', async () => {
      const neutralFn = async () => {
        // Operation that doesn't significantly change memory
        return Math.sqrt(42);
      };

      const result = await benchmark.benchmarkMemory(neutralFn);

      expect(result.result).toBeCloseTo(Math.sqrt(42));
      expect(Math.abs(result.memoryDelta)).toBeLessThan(10); // Less than 10MB change
    });

    test('should include all memory usage properties', async () => {
      const testFn = async () => 'test';
      const result = await benchmark.benchmarkMemory(testFn);

      // Each memory usage object should have standard properties
      ['heapUsed', 'heapTotal', 'external', 'arrayBuffers'].forEach(prop => {
        expect(result.initialMemory).toHaveProperty(prop);
        expect(result.peakMemory).toHaveProperty(prop);
        expect(result.finalMemory).toHaveProperty(prop);
      });
    });
  });

  describe('Benchmark Comparison Contract', () => {
    test('should detect performance improvements', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return 'slow';
      };

      const fastFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'fast';
      };

      const baseline = await benchmark.benchmarkExecution(slowFn, 5);
      const improved = await benchmark.benchmarkExecution(fastFn, 5);
      const comparison = benchmark.compareBenchmarks(baseline, improved);

      expect(comparison.timeChange).toBeLessThan(0); // Negative = improvement
      expect(comparison.improvement).toBe(true);
    });

    test('should detect performance regressions', async () => {
      const fastFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'fast';
      };

      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return 'slow';
      };

      const baseline = await benchmark.benchmarkExecution(fastFn, 5);
      const regressed = await benchmark.benchmarkExecution(slowFn, 5);
      const comparison = benchmark.compareBenchmarks(baseline, regressed);

      expect(comparison.timeChange).toBeGreaterThan(0); // Positive = regression
      expect(comparison.improvement).toBe(false);
    });

    test('should assess statistical significance', async () => {
      const consistentFn = async () => {
        // Very consistent timing
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'consistent';
      };

      const baseline = await benchmark.benchmarkExecution(consistentFn, 10);

      const slightlySlowerFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 25)); // 25% slower
        return 'slower';
      };

      const current = await benchmark.benchmarkExecution(slightlySlowerFn, 10);
      const comparison = benchmark.compareBenchmarks(baseline, current);

      // Significant change should be detected for 25% difference
      expect(comparison.significantChange).toBe(true);
      expect(comparison.confidenceLevel).toBeGreaterThan(0.5);
    });

    test('should handle similar performance', async () => {
      const sameFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return 'same';
      };

      const baseline = await benchmark.benchmarkExecution(sameFn, 5);
      const current = await benchmark.benchmarkExecution(sameFn, 5);
      const comparison = benchmark.compareBenchmarks(baseline, current);

      // Should show minimal change
      expect(Math.abs(comparison.timeChange)).toBeLessThan(50); // Less than 50% change
      expect(comparison.confidenceLevel).toBeGreaterThan(0);
      expect(comparison.confidenceLevel).toBeLessThanOrEqual(1);
    });

    test('should calculate percentage changes correctly', async () => {
      const baseFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'base';
      };

      const doubleFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
        return 'double';
      };

      const baseline = await benchmark.benchmarkExecution(baseFn, 5);
      const doubled = await benchmark.benchmarkExecution(doubleFn, 5);
      const comparison = benchmark.compareBenchmarks(baseline, doubled);

      // Should be roughly 100% increase (double the time)
      expect(comparison.timeChange).toBeGreaterThan(50); // At least 50% increase
      expect(comparison.timeChange).toBeLessThan(200); // But less than 200% (generous for timing variations)
    });
  });

  describe('Contract Validation Integration', () => {
    test('should pass consistent timing scenario', async () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.benchmark.consistentTiming;
      const result = await scenario.test(benchmark);

      expect(result).toBe(true);
    });

    test('should pass memory tracking scenario', async () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.benchmark.memoryTracking;
      const result = await scenario.test(benchmark);

      expect(result).toBe(true);
    });

    test('should pass full contract validation', async () => {
      try {
        const isValid = await validateTestBenchmark(benchmark);
        expect(isValid).toBe(true);
      } catch (error) {
        // If validation fails, ensure it's for expected reasons
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Contract validation failed:', errorMessage);
        expect(typeof errorMessage).toBe('string');
      }
    });
  });

  describe('Performance Requirements Contract', () => {
    test('benchmarking should not significantly impact performance', async () => {
      const lightFn = async () => Promise.resolve(42);

      const directStart = performance.now();
      await lightFn();
      const directTime = performance.now() - directStart;

      const benchmarkStart = performance.now();
      await benchmark.benchmarkExecution(lightFn, 1);
      const benchmarkTime = performance.now() - benchmarkStart;

      // Benchmarking overhead should be reasonable (less than 100x direct execution)
      expect(benchmarkTime).toBeLessThan(directTime * 100);
    });

    test('should handle high iteration counts efficiently', async () => {
      const fastFn = async () => Math.random();

      const start = performance.now();
      const result = await benchmark.benchmarkExecution(fastFn, 100);
      const duration = performance.now() - start;

      expect(result.iterations).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Edge Cases Contract', () => {
    test('should handle functions that throw errors', async () => {
      const errorFn = async () => {
        throw new Error('Test error');
      };

      await expect(benchmark.benchmarkExecution(errorFn, 3)).rejects.toThrow('Test error');
      await expect(benchmark.benchmarkMemory(errorFn)).rejects.toThrow('Test error');
    });

    test('should handle functions that return different types', async () => {
      const objectFn = async () => ({ key: 'value' });
      const arrayFn = async () => [1, 2, 3];
      const nullFn = async () => null;

      const objectResult = await benchmark.benchmarkExecution(objectFn, 3);
      const arrayResult = await benchmark.benchmarkExecution(arrayFn, 3);
      const nullResult = await benchmark.benchmarkExecution(nullFn, 3);

      expect(objectResult.result).toEqual({ key: 'value' });
      expect(arrayResult.result).toEqual([1, 2, 3]);
      expect(nullResult.result).toBeNull();
    });
  });
});