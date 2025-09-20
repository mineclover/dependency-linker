/**
 * Integration Test: Performance Validation (T016)
 * Tests performance validation against <1.5s execution time target
 */

import { PerformanceTracker } from '../../../src/services/optimization/PerformanceTracker';
import { TestSuite } from '../../../src/models/optimization/TestSuite';
import { TestCase } from '../../../src/models/optimization/TestCase';
import { PerformanceBaseline } from '../../../src/models/optimization/PerformanceBaseline';
import { PerformanceBenchmark } from '../../helpers/benchmark/PerformanceBenchmark';

describe('Performance Validation Integration', () => {
  let performanceTracker: PerformanceTracker;
  let performanceBenchmark: PerformanceBenchmark;

  beforeEach(async () => {
    performanceTracker = new PerformanceTracker();
    performanceBenchmark = new PerformanceBenchmark();
    // Mock initialize if method doesn't exist
    if (typeof performanceTracker.initialize === 'function') {
      await performanceTracker.initialize();
    }
  });

  afterEach(async () => {
    // Mock cleanup if method doesn't exist
    if (typeof performanceTracker.cleanup === 'function') {
      await performanceTracker.cleanup();
    }
    PerformanceBenchmark.clearResults();
  });

  describe('Performance Target Validation', () => {
    it('should validate 1.5s execution time target', async () => {
      // Arrange: Create test suite that should meet performance targets
      const testSuite = new TestSuite({
        id: 'performance-target-suite',
        name: 'Performance Target Test Suite',
        filePath: 'tests/integration/performance-target.test.ts',
        testCases: [
          new TestCase({
            id: 'fast-test',
            name: 'Fast test case',
            filePath: 'tests/integration/performance-target.test.ts',
            lineStart: 5,
            lineEnd: 15,
            estimatedDuration: 200,
            category: 'fast'
          }),
          new TestCase({
            id: 'medium-test',
            name: 'Medium test case',
            filePath: 'tests/integration/performance-target.test.ts',
            lineStart: 20,
            lineEnd: 35,
            estimatedDuration: 500,
            category: 'medium'
          }),
          new TestCase({
            id: 'acceptable-slow-test',
            name: 'Acceptably slow test case',
            filePath: 'tests/integration/performance-target.test.ts',
            lineStart: 40,
            lineEnd: 60,
            estimatedDuration: 700,
            category: 'medium'
          })
        ]
      });

      // Act: Measure suite performance
      const startTime = performance.now();
      await performanceTracker.trackTestSuiteExecution(testSuite, async () => {
        // Simulate test execution
        for (const testCase of testSuite.testCases) {
          await new Promise(resolve => setTimeout(resolve, Math.min(testCase.estimatedDuration / 10, 100)));
        }
      });
      const executionTime = performance.now() - startTime;

      // Assert: Verify performance targets
      expect(executionTime).toBeLessThan(1500); // 1.5s target

      const metrics = performanceTracker.getMetrics(testSuite.id);
      expect(metrics).toBeDefined();
      expect(metrics!.totalDuration).toBeLessThan(1500);
      expect(metrics!.averageDuration).toBeLessThan(500);
    });

    it('should identify performance violations', async () => {
      // Arrange: Create test suite that violates performance targets
      const slowTestSuite = new TestSuite({
        id: 'slow-suite',
        name: 'Slow Test Suite',
        filePath: 'tests/integration/slow.test.ts',
        testCases: [
          new TestCase({
            id: 'very-slow-test',
            name: 'Very slow test case',
            filePath: 'tests/integration/slow.test.ts',
            lineStart: 5,
            lineEnd: 25,
            estimatedDuration: 2000, // Exceeds target
            category: 'slow'
          })
        ]
      });

      // Act: Track performance
      let actualExecutionTime = 0;
      await performanceTracker.trackTestSuiteExecution(slowTestSuite, async () => {
        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate slow execution
        actualExecutionTime = performance.now() - start;
      });

      // Assert: Should detect performance violation
      const validation = await performanceTracker.validatePerformance(slowTestSuite.id, {
        maxTotalDuration: 1500,
        maxAverageDuration: 500
      });

      expect(validation.passed).toBe(false);
      expect(validation.violations).toBeDefined();
      expect(validation.violations.length).toBeGreaterThan(0);
      expect(validation.violations[0].type).toBe('duration_exceeded');
    });

    it('should track memory usage within limits', async () => {
      // Arrange: Test suite with memory tracking
      const memoryTestSuite = new TestSuite({
        id: 'memory-suite',
        name: 'Memory Test Suite',
        filePath: 'tests/integration/memory.test.ts',
        testCases: [
          new TestCase({
            id: 'memory-intensive',
            name: 'Memory intensive test',
            filePath: 'tests/integration/memory.test.ts',
            lineStart: 5,
            lineEnd: 20,
            estimatedDuration: 300,
            category: 'fast',
            characteristics: { memoryIntensive: true }
          })
        ]
      });

      // Act: Track memory usage
      const initialMemory = process.memoryUsage();
      await performanceTracker.trackTestSuiteExecution(memoryTestSuite, async () => {
        // Simulate memory usage
        const largeArray = new Array(10000).fill('test-data');
        await new Promise(resolve => setTimeout(resolve, 100));
        largeArray.length = 0; // Cleanup
      });

      // Assert: Verify memory tracking
      const metrics = performanceTracker.getMetrics(memoryTestSuite.id);
      expect(metrics).toBeDefined();
      expect(metrics!.memoryUsage).toBeDefined();
      expect(metrics!.memoryUsage!.peak).toBeGreaterThan(initialMemory.heapUsed);
      expect(metrics!.memoryUsage!.delta).toBeLessThan(100 * 1024 * 1024); // Should be under 100MB
    });
  });

  describe('Performance Baseline Management', () => {
    it('should establish and validate against baselines', async () => {
      // Arrange: Create baseline scenario
      const baselineTestSuite = new TestSuite({
        id: 'baseline-suite',
        name: 'Baseline Test Suite',
        filePath: 'tests/integration/baseline.test.ts',
        testCases: [
          new TestCase({
            id: 'baseline-test',
            name: 'Baseline test case',
            filePath: 'tests/integration/baseline.test.ts',
            lineStart: 5,
            lineEnd: 20,
            estimatedDuration: 400,
            category: 'medium'
          })
        ]
      });

      // Act: Establish baseline
      await performanceTracker.trackTestSuiteExecution(baselineTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const baseline = await performanceTracker.establishBaseline(baselineTestSuite.id, {
        includeMemory: true,
        includeSetupTime: true
      });

      // Assert: Baseline creation
      expect(baseline).toBeDefined();
      expect(baseline.duration).toBeGreaterThan(0);
      expect(baseline.memoryUsage).toBeGreaterThan(0);

      // Act: Validate against baseline (should pass for similar performance)
      await performanceTracker.trackTestSuiteExecution(baselineTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 55)); // Slightly different timing
      });

      const validation = await performanceTracker.validateAgainstBaseline(
        baselineTestSuite.id,
        baseline.id!,
        { tolerancePercent: 20 } // 20% tolerance
      );

      // Assert: Should pass within tolerance
      expect(validation.passed).toBe(true);
      expect(validation.performanceRatio).toBeLessThan(1.2); // Within 20% of baseline
    });

    it('should detect performance regressions', async () => {
      // Arrange: Establish good baseline
      const regressionTestSuite = new TestSuite({
        id: 'regression-suite',
        name: 'Regression Test Suite',
        filePath: 'tests/integration/regression.test.ts',
        testCases: [
          new TestCase({
            id: 'regression-test',
            name: 'Test that may regress',
            filePath: 'tests/integration/regression.test.ts',
            lineStart: 5,
            lineEnd: 20,
            estimatedDuration: 50,
            category: 'fast'
          })
        ]
      });

      // Establish baseline with good performance
      await performanceTracker.trackTestSuiteExecution(regressionTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
      });
      const baseline = await performanceTracker.establishBaseline(regressionTestSuite.id);

      // Act: Simulate performance regression
      await performanceTracker.trackTestSuiteExecution(regressionTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Much slower
      });

      const validation = await performanceTracker.validateAgainstBaseline(
        regressionTestSuite.id,
        baseline.id!,
        { tolerancePercent: 10 } // Strict tolerance
      );

      // Assert: Should detect regression
      expect(validation.passed).toBe(false);
      expect(validation.performanceRatio).toBeGreaterThan(1.1); // More than 10% slower
      expect(validation.regressionDetails).toBeDefined();
      expect(validation.regressionDetails.type).toBe('performance_regression');
    });
  });

  describe('Real-time Performance Monitoring', () => {
    it('should provide real-time performance feedback', async () => {
      // Arrange
      const monitoringTestSuite = new TestSuite({
        id: 'monitoring-suite',
        name: 'Real-time Monitoring Suite',
        filePath: 'tests/integration/monitoring.test.ts',
        testCases: [
          new TestCase({
            id: 'monitored-test',
            name: 'Monitored test case',
            filePath: 'tests/integration/monitoring.test.ts',
            lineStart: 5,
            lineEnd: 15,
            estimatedDuration: 250,
            category: 'fast'
          })
        ]
      });

      // Act: Enable real-time monitoring
      const monitoringSession = await performanceTracker.startRealTimeMonitoring(
        monitoringTestSuite.id,
        { intervalMs: 50, alertThresholds: { duration: 1000, memory: 50 * 1024 * 1024 } }
      );

      await performanceTracker.trackTestSuiteExecution(monitoringTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await performanceTracker.stopRealTimeMonitoring(monitoringSession.id);

      // Assert: Real-time data should be available
      const sessionData = await performanceTracker.getMonitoringSession(monitoringSession.id);
      expect(sessionData).toBeDefined();
      expect(sessionData.dataPoints).toBeDefined();
      expect(sessionData.dataPoints.length).toBeGreaterThan(1); // Multiple measurements
      expect(sessionData.alerts).toBeDefined(); // Alert system active
    });

    it('should trigger performance alerts', async () => {
      // Arrange: Test suite designed to trigger alerts
      const alertTestSuite = new TestSuite({
        id: 'alert-suite',
        name: 'Alert Triggering Suite',
        filePath: 'tests/integration/alert.test.ts',
        testCases: [
          new TestCase({
            id: 'alert-trigger',
            name: 'Test that triggers alerts',
            filePath: 'tests/integration/alert.test.ts',
            lineStart: 5,
            lineEnd: 15,
            estimatedDuration: 200,
            category: 'fast'
          })
        ]
      });

      // Act: Monitor with strict thresholds
      const alertSession = await performanceTracker.startRealTimeMonitoring(
        alertTestSuite.id,
        {
          intervalMs: 25,
          alertThresholds: {
            duration: 100, // Very strict - should trigger
            memory: 10 * 1024 * 1024 // 10MB - may trigger
          }
        }
      );

      await performanceTracker.trackTestSuiteExecution(alertTestSuite, async () => {
        await new Promise(resolve => setTimeout(resolve, 150)); // Should exceed duration threshold
      });

      await performanceTracker.stopRealTimeMonitoring(alertSession.id);

      // Assert: Alerts should be triggered
      const sessionData = await performanceTracker.getMonitoringSession(alertSession.id);
      expect(sessionData.alerts).toBeDefined();
      expect(sessionData.alerts.length).toBeGreaterThan(0);

      const durationAlert = sessionData.alerts.find((alert: any) => alert.type === 'duration_threshold_exceeded');
      expect(durationAlert).toBeDefined();
      expect(durationAlert.threshold).toBe(100);
    });
  });

  describe('Performance Benchmarking Integration', () => {
    it('should integrate with PerformanceBenchmark for detailed analysis', async () => {
      // Arrange
      const benchmarkSuite = new TestSuite({
        id: 'benchmark-suite',
        name: 'Benchmark Integration Suite',
        filePath: 'tests/integration/benchmark.test.ts',
        testCases: [
          new TestCase({
            id: 'benchmark-test',
            name: 'Test for benchmarking',
            filePath: 'tests/integration/benchmark.test.ts',
            lineStart: 5,
            lineEnd: 15,
            estimatedDuration: 30,
            category: 'fast'
          })
        ]
      });

      // Act: Use both systems together
      const benchmarkResult = await PerformanceBenchmark.benchmark(
        'integrated-test-execution',
        async () => {
          await performanceTracker.trackTestSuiteExecution(benchmarkSuite, async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
          });
        },
        { iterations: 10, collectMemory: true }
      );

      // Assert: Both systems should provide complementary data
      expect(benchmarkResult).toBeDefined();
      expect(benchmarkResult.avgPerIteration).toBeLessThan(100); // Should be fast per iteration

      const trackerMetrics = performanceTracker.getMetrics(benchmarkSuite.id);
      expect(trackerMetrics).toBeDefined();

      // Cross-validate results
      expect(trackerMetrics!.averageDuration).toBeLessThan(benchmarkResult.avgPerIteration * 2);
    });

    it('should assert comprehensive performance requirements', async () => {
      // Arrange: Full performance test scenario
      const comprehensiveTestSuite = new TestSuite({
        id: 'comprehensive-suite',
        name: 'Comprehensive Performance Suite',
        filePath: 'tests/integration/comprehensive.test.ts',
        testCases: [
          new TestCase({
            id: 'comprehensive-test',
            name: 'Comprehensive performance test',
            filePath: 'tests/integration/comprehensive.test.ts',
            lineStart: 5,
            lineEnd: 25,
            estimatedDuration: 250,
            category: 'medium'
          })
        ]
      });

      // Act: Run comprehensive performance test
      const result = await PerformanceBenchmark.benchmark(
        'comprehensive-performance-test',
        async () => {
          await performanceTracker.trackTestSuiteExecution(comprehensiveTestSuite, async () => {
            // Simulate realistic test execution with various operations
            await new Promise(resolve => setTimeout(resolve, 30)); // Setup
            const data = new Array(1000).fill('test'); // Memory usage
            await new Promise(resolve => setTimeout(resolve, 40)); // Execution
            data.length = 0; // Cleanup
          });
        },
        { iterations: 5, collectMemory: true }
      );

      // Assert: Comprehensive performance requirements
      PerformanceBenchmark.assertPerformance(
        result,
        1500, // Max total duration (1.5s target)
        50,   // Max 50MB memory usage
        300   // Max 300ms per iteration
      );

      // Additional validation through tracker
      const validation = await performanceTracker.validatePerformance(comprehensiveTestSuite.id, {
        maxTotalDuration: 1500,
        maxAverageDuration: 300,
        maxMemoryUsage: 50 * 1024 * 1024
      });

      expect(validation.passed).toBe(true);
    });
  });
});