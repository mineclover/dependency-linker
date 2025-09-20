/**
 * Integration Test: Optimization Execution (T015)
 * Tests the complete optimization execution workflow
 */

import { TestOptimizer } from '../../../src/services/optimization/TestOptimizer';
import { TestAnalyzer } from '../../../src/services/optimization/TestAnalyzer';
import { PerformanceTracker } from '../../../src/services/optimization/PerformanceTracker';
import { TestSuite } from '../../../src/models/optimization/TestSuite';
import { TestCase } from '../../../src/models/optimization/TestCase';
import { OptimizationOpportunity } from '../../../src/models/optimization/OptimizationOpportunity';

describe('Optimization Execution Integration', () => {
  let testOptimizer: TestOptimizer;
  let testAnalyzer: TestAnalyzer;
  let performanceTracker: PerformanceTracker;

  beforeEach(() => {
    testAnalyzer = new TestAnalyzer();
    performanceTracker = new PerformanceTracker();
    testOptimizer = new TestOptimizer(testAnalyzer, performanceTracker);
  });

  afterEach(async () => {
    // Cleanup any optimization state
    await testOptimizer.resetState();
    await performanceTracker.clearMetrics();
  });

  describe('End-to-End Optimization Workflow', () => {
    it('should execute complete optimization workflow', async () => {
      // Arrange: Create test suite with optimization opportunities
      const testSuite = new TestSuite({
        id: 'integration-suite',
        name: 'Integration Test Suite',
        filePath: 'tests/integration/sample.test.ts',
        testCases: [
          new TestCase({
            id: 'slow-test',
            name: 'Slow test case',
            filePath: 'tests/integration/sample.test.ts',
            lineStart: 10,
            lineEnd: 25,
            estimatedDuration: 2000,
            category: 'slow'
          }),
          new TestCase({
            id: 'duplicate-setup',
            name: 'Test with duplicate setup',
            filePath: 'tests/integration/sample.test.ts',
            lineStart: 30,
            lineEnd: 45,
            estimatedDuration: 500,
            category: 'duplicate'
          })
        ]
      });

      // Act: Execute optimization
      const startTime = performance.now();
      const optimizationResult = await testOptimizer.optimizeTestSuite(testSuite, {
        enableParallelization: true,
        consolidateDuplicates: true,
        optimizeSetup: true,
        targetDuration: 1500
      });
      const executionTime = performance.now() - startTime;

      // Assert: Verify optimization results
      expect(optimizationResult).toBeDefined();
      expect(optimizationResult.originalSuite).toBe(testSuite);
      expect(optimizationResult.optimizedSuite).toBeDefined();
      expect(optimizationResult.improvements).toHaveLength(2); // One for each test case
      expect(optimizationResult.performanceGain).toBeGreaterThan(0);

      // Verify execution time is reasonable
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify optimization quality
      const totalOriginalDuration = testSuite.testCases.reduce(
        (sum, tc) => sum + tc.estimatedDuration, 0
      );
      const totalOptimizedDuration = optimizationResult.optimizedSuite.testCases.reduce(
        (sum, tc) => sum + tc.estimatedDuration, 0
      );

      expect(totalOptimizedDuration).toBeLessThan(totalOriginalDuration);
      expect(totalOptimizedDuration).toBeLessThan(1500); // Target duration
    });

    it('should handle optimization with constraints', async () => {
      // Arrange: Create constrained optimization scenario
      const testSuite = new TestSuite({
        id: 'constrained-suite',
        name: 'Constrained Test Suite',
        filePath: 'tests/integration/constrained.test.ts',
        testCases: [
          new TestCase({
            id: 'sequential-test',
            name: 'Must run sequentially',
            filePath: 'tests/integration/constrained.test.ts',
            lineStart: 10,
            lineEnd: 30,
            estimatedDuration: 1000,
            category: 'sequential',
            constraints: ['no-parallel']
          })
        ]
      });

      // Act: Execute optimization with constraints
      const optimizationResult = await testOptimizer.optimizeTestSuite(testSuite, {
        enableParallelization: true, // This should be ignored for constrained tests
        respectConstraints: true
      });

      // Assert: Verify constraints are respected
      expect(optimizationResult.optimizedSuite.testCases[0].constraints).toContain('no-parallel');
      expect(optimizationResult.improvements.some(i =>
        i.type === 'parallelization' && i.testCaseId === 'sequential-test'
      )).toBe(false);
    });

    it('should generate comprehensive optimization report', async () => {
      // Arrange
      const testSuite = new TestSuite({
        id: 'report-suite',
        name: 'Report Test Suite',
        filePath: 'tests/integration/report.test.ts',
        testCases: [
          new TestCase({
            id: 'test1',
            name: 'Test 1',
            filePath: 'tests/integration/report.test.ts',
            lineStart: 5,
            lineEnd: 15,
            estimatedDuration: 800,
            category: 'medium'
          }),
          new TestCase({
            id: 'test2',
            name: 'Test 2',
            filePath: 'tests/integration/report.test.ts',
            lineStart: 20,
            lineEnd: 35,
            estimatedDuration: 1200,
            category: 'slow'
          })
        ]
      });

      // Act
      const optimizationResult = await testOptimizer.optimizeTestSuite(testSuite);
      const report = await testOptimizer.generateOptimizationReport(optimizationResult);

      // Assert: Verify report completeness
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.originalDuration).toBe(2000);
      expect(report.summary.optimizedDuration).toBeLessThan(2000);
      expect(report.summary.performanceGain).toBeGreaterThan(0);

      expect(report.improvements).toBeDefined();
      expect(report.improvements).toHaveLength(optimizationResult.improvements.length);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      expect(report.metrics).toBeDefined();
      expect(report.metrics.executionTime).toBeGreaterThan(0);
    });

    it('should handle optimization failures gracefully', async () => {
      // Arrange: Create scenario that might fail optimization
      const invalidTestSuite = new TestSuite({
        id: 'invalid-suite',
        name: 'Invalid Test Suite',
        filePath: 'non-existent-file.test.ts',
        testCases: []
      });

      // Act & Assert: Should handle gracefully without throwing
      await expect(testOptimizer.optimizeTestSuite(invalidTestSuite))
        .resolves.not.toThrow();

      const result = await testOptimizer.optimizeTestSuite(invalidTestSuite);
      expect(result).toBeDefined();
      expect(result.optimizedSuite).toBeDefined();
      expect(result.improvements).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Strategy Selection', () => {
    it('should select appropriate strategies based on test characteristics', async () => {
      // Arrange: Different types of test cases
      const testSuite = new TestSuite({
        id: 'strategy-suite',
        name: 'Strategy Selection Suite',
        filePath: 'tests/integration/strategy.test.ts',
        testCases: [
          new TestCase({
            id: 'cpu-intensive',
            name: 'CPU intensive test',
            filePath: 'tests/integration/strategy.test.ts',
            lineStart: 10,
            lineEnd: 25,
            estimatedDuration: 3000,
            category: 'slow',
            characteristics: { cpuIntensive: true }
          }),
          new TestCase({
            id: 'io-heavy',
            name: 'I/O heavy test',
            filePath: 'tests/integration/strategy.test.ts',
            lineStart: 30,
            lineEnd: 45,
            estimatedDuration: 2000,
            category: 'slow',
            characteristics: { ioHeavy: true }
          }),
          new TestCase({
            id: 'memory-intensive',
            name: 'Memory intensive test',
            filePath: 'tests/integration/strategy.test.ts',
            lineStart: 50,
            lineEnd: 65,
            estimatedDuration: 1500,
            category: 'medium',
            characteristics: { memoryIntensive: true }
          })
        ]
      });

      // Act
      const optimizationResult = await testOptimizer.optimizeTestSuite(testSuite, {
        adaptiveStrategy: true
      });

      // Assert: Verify different strategies were applied
      const strategies = optimizationResult.improvements.map(i => i.strategy);
      expect(strategies).toContain('parallel'); // For I/O heavy
      expect(strategies).toContain('sequential'); // For CPU intensive
      expect(strategies).toContain('memory-pool'); // For memory intensive

      // Verify performance improvement
      expect(optimizationResult.performanceGain).toBeGreaterThan(20); // At least 20% improvement
    });

    it('should respect optimization budget constraints', async () => {
      // Arrange
      const largeSuite = new TestSuite({
        id: 'large-suite',
        name: 'Large Test Suite',
        filePath: 'tests/integration/large.test.ts',
        testCases: Array.from({ length: 50 }, (_, i) => new TestCase({
          id: `test-${i}`,
          name: `Test ${i}`,
          filePath: 'tests/integration/large.test.ts',
          lineStart: i * 10,
          lineEnd: i * 10 + 5,
          estimatedDuration: 200 + (i * 10),
          category: i % 3 === 0 ? 'slow' : 'fast'
        }))
      });

      // Act: Optimize with time budget
      const startTime = performance.now();
      const optimizationResult = await testOptimizer.optimizeTestSuite(largeSuite, {
        optimizationBudget: 3000 // 3 seconds max
      });
      const actualTime = performance.now() - startTime;

      // Assert: Should respect time budget
      expect(actualTime).toBeLessThan(4000); // Allow some buffer
      expect(optimizationResult).toBeDefined();
      expect(optimizationResult.optimizedSuite).toBeDefined();

      // Should still provide meaningful improvements
      expect(optimizationResult.improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Optimization Scenarios', () => {
    it('should optimize typical Jest test suite structure', async () => {
      // Arrange: Simulate typical Jest test patterns
      const jestSuite = new TestSuite({
        id: 'jest-suite',
        name: 'Typical Jest Suite',
        filePath: 'tests/integration/jest-typical.test.ts',
        testCases: [
          new TestCase({
            id: 'describe-setup',
            name: 'describe block with beforeEach',
            filePath: 'tests/integration/jest-typical.test.ts',
            lineStart: 5,
            lineEnd: 20,
            estimatedDuration: 100,
            category: 'setup',
            setupCode: 'beforeEach(() => { /* expensive setup */ })'
          }),
          new TestCase({
            id: 'test1',
            name: 'first test in describe',
            filePath: 'tests/integration/jest-typical.test.ts',
            lineStart: 22,
            lineEnd: 35,
            estimatedDuration: 400,
            category: 'fast',
            dependsOn: ['describe-setup']
          }),
          new TestCase({
            id: 'test2',
            name: 'second test in describe',
            filePath: 'tests/integration/jest-typical.test.ts',
            lineStart: 37,
            lineEnd: 50,
            estimatedDuration: 600,
            category: 'medium',
            dependsOn: ['describe-setup']
          })
        ]
      });

      // Act
      const result = await testOptimizer.optimizeTestSuite(jestSuite);

      // Assert: Should optimize setup sharing
      expect(result.improvements.some(i => i.type === 'setup-optimization')).toBe(true);
      expect(result.optimizedSuite.testCases.length).toBeLessThanOrEqual(jestSuite.testCases.length);

      const totalOriginal = jestSuite.testCases.reduce((sum, tc) => sum + tc.estimatedDuration, 0);
      const totalOptimized = result.optimizedSuite.testCases.reduce((sum, tc) => sum + tc.estimatedDuration, 0);
      expect(totalOptimized).toBeLessThan(totalOriginal);
    });
  });
});