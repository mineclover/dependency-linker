/**
 * Test optimization utilities for performance testing and analysis
 */

export interface TestExecutionMetrics {
  duration: number;
  memoryUsage: number;
  setupTime: number;
  teardownTime: number;
  passRate: number;
}

export interface TestOptimizationConfig {
  maxDuration: number;
  maxMemoryMB: number;
  minPassRate: number;
  enableCaching: boolean;
  parallelExecution: boolean;
}

export class TestOptimizationUtils {
  private static startTime: number = 0;
  private static startMemory: number = 0;

  static startMeasurement(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  static endMeasurement(): TestExecutionMetrics {
    const duration = performance.now() - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed - this.startMemory;

    return {
      duration,
      memoryUsage: memoryUsage / 1024 / 1024, // Convert to MB
      setupTime: 0, // Will be measured by individual tests
      teardownTime: 0, // Will be measured by individual tests
      passRate: 1.0 // Will be calculated by test runner
    };
  }

  static validatePerformance(metrics: TestExecutionMetrics, config: TestOptimizationConfig): boolean {
    return (
      metrics.duration <= config.maxDuration &&
      metrics.memoryUsage <= config.maxMemoryMB &&
      metrics.passRate >= config.minPassRate
    );
  }

  static getOptimalConfig(): TestOptimizationConfig {
    return {
      maxDuration: 1500, // 1.5s target from spec
      maxMemoryMB: 100,
      minPassRate: 0.99, // >99% pass rate target
      enableCaching: true,
      parallelExecution: true
    };
  }
}

export default TestOptimizationUtils;