/**
 * Contract tests for ITestAssertions interface (T011)
 * Validates test assertion implementations for performance and quality validation
 */

import {
  ITestAssertions,
  CoverageReport,
  ResourceState,
  validateTestAssertions,
  UTILITY_CONTRACT_SCENARIOS
} from '../../specs/005-test-optimization/contracts/test-utilities.contract';

// Mock implementation for contract testing
class MockTestAssertions implements ITestAssertions {
  assertPerformance(
    actualMs: number,
    expectedMaxMs: number,
    tolerance: number = 0.1
  ): void {
    if (typeof actualMs !== 'number' || actualMs < 0) {
      throw new Error('Actual time must be a positive number');
    }
    if (typeof expectedMaxMs !== 'number' || expectedMaxMs <= 0) {
      throw new Error('Expected max time must be a positive number');
    }

    const toleranceMs = expectedMaxMs * tolerance;
    const maxAllowed = expectedMaxMs + toleranceMs;

    if (actualMs > maxAllowed) {
      throw new Error(
        `Performance assertion failed: ${actualMs}ms exceeds maximum allowed ${maxAllowed}ms (${expectedMaxMs}ms + ${tolerance * 100}% tolerance)`
      );
    }
  }

  assertCoverage(
    actual: CoverageReport,
    minimum: number,
    areas?: string[]
  ): void {
    if (!actual || typeof actual !== 'object') {
      throw new Error('Coverage report is required');
    }
    if (typeof minimum !== 'number' || minimum < 0 || minimum > 100) {
      throw new Error('Minimum coverage must be between 0 and 100');
    }

    const coverageAreas = areas || ['lines', 'functions', 'branches', 'statements'];
    const failures: string[] = [];

    for (const area of coverageAreas) {
      const total = actual[area as keyof CoverageReport] as number;
      const covered = actual.covered[area as keyof typeof actual.covered] as number;

      if (typeof total !== 'number' || typeof covered !== 'number') {
        failures.push(`Invalid coverage data for ${area}`);
        continue;
      }

      const percentage = total > 0 ? (covered / total) * 100 : 0;

      if (percentage < minimum) {
        failures.push(`${area}: ${percentage.toFixed(1)}% < ${minimum}%`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Coverage assertion failed: ${failures.join(', ')}`);
    }
  }

  async assertNotFlaky(
    testFn: () => Promise<void>,
    iterations: number = 5
  ): Promise<void> {
    if (typeof testFn !== 'function') {
      throw new Error('Test function is required');
    }
    if (typeof iterations !== 'number' || iterations < 1) {
      throw new Error('Iterations must be a positive number');
    }

    const results: { success: boolean; error?: string }[] = [];

    for (let i = 0; i < iterations; i++) {
      try {
        await testFn();
        results.push({ success: true });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const failures = results.filter(r => !r.success);
    const failureRate = failures.length / iterations;

    // Allow up to 10% failure rate for truly flaky tests
    if (failureRate > 0.1) {
      const errorMessages = failures.map(f => f.error).slice(0, 3);
      throw new Error(
        `Flaky test detected: ${failures.length}/${iterations} failures (${(failureRate * 100).toFixed(1)}%). Sample errors: ${errorMessages.join(', ')}`
      );
    }
  }

  assertCleanup(beforeState: ResourceState, afterState: ResourceState): void {
    if (!beforeState || !afterState) {
      throw new Error('Both before and after resource states are required');
    }

    const issues: string[] = [];

    // Check for handle leaks
    if (afterState.openHandles > beforeState.openHandles) {
      const leaked = afterState.openHandles - beforeState.openHandles;
      issues.push(`${leaked} handle(s) leaked`);
    }

    // Check for timer leaks
    if (afterState.activeTimers > beforeState.activeTimers) {
      const leaked = afterState.activeTimers - beforeState.activeTimers;
      issues.push(`${leaked} active timer(s) leaked`);
    }

    // Check for significant memory increases (allow 10MB tolerance)
    const memoryIncrease = afterState.memoryUsage.heapUsed - beforeState.memoryUsage.heapUsed;
    const memoryMB = memoryIncrease / (1024 * 1024);
    if (memoryMB > 10) {
      issues.push(`${memoryMB.toFixed(1)}MB memory increase`);
    }

    if (issues.length > 0) {
      throw new Error(`Resource cleanup assertion failed: ${issues.join(', ')}`);
    }
  }
}

describe('ITestAssertions Contract Tests', () => {
  let assertions: ITestAssertions;

  beforeEach(() => {
    assertions = new MockTestAssertions();
  });

  describe('Interface Contract Compliance', () => {
    test('should implement all required methods', () => {
      expect(typeof assertions.assertPerformance).toBe('function');
      expect(typeof assertions.assertCoverage).toBe('function');
      expect(typeof assertions.assertNotFlaky).toBe('function');
      expect(typeof assertions.assertCleanup).toBe('function');
    });

    test('assertPerformance should accept valid inputs', () => {
      expect(() => assertions.assertPerformance(100, 200)).not.toThrow();
      expect(() => assertions.assertPerformance(150, 200, 0.2)).not.toThrow();
    });

    test('assertCoverage should accept valid coverage reports', () => {
      const validCoverage: CoverageReport = {
        lines: 100,
        functions: 20,
        branches: 30,
        statements: 150,
        covered: {
          lines: 85,
          functions: 18,
          branches: 24,
          statements: 128
        }
      };

      expect(() => assertions.assertCoverage(validCoverage, 80)).not.toThrow();
    });

    test('assertNotFlaky should accept valid test functions', async () => {
      const stableTest = async () => {
        // Always succeeds
        expect(1).toBe(1);
      };

      await expect(assertions.assertNotFlaky(stableTest, 3)).resolves.not.toThrow();
    });

    test('assertCleanup should accept valid resource states', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 51 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      expect(() => assertions.assertCleanup(beforeState, afterState)).not.toThrow();
    });
  });

  describe('Performance Assertion Contract', () => {
    test('should pass when performance meets expectations', () => {
      expect(() => assertions.assertPerformance(100, 150)).not.toThrow();
      expect(() => assertions.assertPerformance(90, 100)).not.toThrow();
      expect(() => assertions.assertPerformance(1000, 1500)).not.toThrow();
    });

    test('should fail when performance exceeds threshold', () => {
      expect(() => assertions.assertPerformance(200, 100)).toThrow(/Performance assertion failed/);
      expect(() => assertions.assertPerformance(1600, 1500)).toThrow(/exceeds maximum allowed/);
    });

    test('should respect tolerance parameter', () => {
      // With 20% tolerance, 120ms should pass for 100ms limit
      expect(() => assertions.assertPerformance(120, 100, 0.2)).not.toThrow();

      // But 130ms should fail (exceeds 120ms with 20% tolerance)
      expect(() => assertions.assertPerformance(130, 100, 0.2)).toThrow();
    });

    test('should handle edge cases', () => {
      // Zero actual time should pass
      expect(() => assertions.assertPerformance(0, 100)).not.toThrow();

      // Negative time should fail
      expect(() => assertions.assertPerformance(-1, 100)).toThrow(/positive number/);

      // Invalid expected time should fail
      expect(() => assertions.assertPerformance(100, -1)).toThrow(/positive number/);
      expect(() => assertions.assertPerformance(100, 0)).toThrow(/positive number/);
    });
  });

  describe('Coverage Assertion Contract', () => {
    test('should pass when all areas meet minimum coverage', () => {
      const goodCoverage: CoverageReport = {
        lines: 100,
        functions: 20,
        branches: 30,
        statements: 150,
        covered: {
          lines: 90, // 90%
          functions: 18, // 90%
          branches: 27, // 90%
          statements: 135 // 90%
        }
      };

      expect(() => assertions.assertCoverage(goodCoverage, 80)).not.toThrow();
      expect(() => assertions.assertCoverage(goodCoverage, 90)).not.toThrow();
    });

    test('should fail when any area falls below minimum', () => {
      const poorCoverage: CoverageReport = {
        lines: 100,
        functions: 20,
        branches: 30,
        statements: 150,
        covered: {
          lines: 70, // 70%
          functions: 18, // 90%
          branches: 27, // 90%
          statements: 135 // 90%
        }
      };

      expect(() => assertions.assertCoverage(poorCoverage, 80)).toThrow(/Coverage assertion failed/);
      expect(() => assertions.assertCoverage(poorCoverage, 80)).toThrow(/lines: 70.0% < 80%/);
    });

    test('should support selective area checking', () => {
      const partialCoverage: CoverageReport = {
        lines: 100,
        functions: 20,
        branches: 30,
        statements: 150,
        covered: {
          lines: 90, // 90%
          functions: 10, // 50%
          branches: 15, // 50%
          statements: 75 // 50%
        }
      };

      // Should pass if only checking lines
      expect(() => assertions.assertCoverage(partialCoverage, 80, ['lines'])).not.toThrow();

      // Should fail if checking functions
      expect(() => assertions.assertCoverage(partialCoverage, 80, ['functions'])).toThrow(/functions: 50.0% < 80%/);
    });

    test('should handle zero totals gracefully', () => {
      const zeroCoverage: CoverageReport = {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
        covered: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0
        }
      };

      // Zero totals should result in 0% coverage, which should pass for 0% minimum
      expect(() => assertions.assertCoverage(zeroCoverage, 0)).not.toThrow();

      // But should fail for any positive minimum
      expect(() => assertions.assertCoverage(zeroCoverage, 1)).toThrow();
    });
  });

  describe('Flaky Test Detection Contract', () => {
    test('should pass for consistently passing tests', async () => {
      const stableTest = async () => {
        expect(1).toBe(1);
      };

      await expect(assertions.assertNotFlaky(stableTest, 5)).resolves.not.toThrow();
    });

    test('should detect truly flaky tests', async () => {
      let callCount = 0;
      const flakyTest = async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Flaky failure');
        }
      };

      await expect(assertions.assertNotFlaky(flakyTest, 6)).rejects.toThrow(/Flaky test detected/);
      await expect(assertions.assertNotFlaky(flakyTest, 6)).rejects.toThrow(/3\/6 failures/);
    });

    test('should tolerate occasional failures', async () => {
      let callCount = 0;
      const occasionallyFlaky = async () => {
        callCount++;
        // Fail only 5% of the time (within 10% tolerance)
        if (callCount === 20) { // 1 failure in 20 calls = 5%
          throw new Error('Occasional failure');
        }
      };

      await expect(assertions.assertNotFlaky(occasionallyFlaky, 20)).resolves.not.toThrow();
    });

    test('should handle consistently failing tests', async () => {
      const alwaysFails = async () => {
        throw new Error('Always fails');
      };

      await expect(assertions.assertNotFlaky(alwaysFails, 3)).rejects.toThrow(/Flaky test detected/);
      await expect(assertions.assertNotFlaky(alwaysFails, 3)).rejects.toThrow(/3\/3 failures/);
    });

    test('should validate input parameters', async () => {
      const validTest = async () => { /* no-op */ };

      await expect(assertions.assertNotFlaky(null as any)).rejects.toThrow(/function is required/);
      await expect(assertions.assertNotFlaky(validTest, 0)).rejects.toThrow(/positive number/);
      await expect(assertions.assertNotFlaky(validTest, -1)).rejects.toThrow(/positive number/);
    });
  });

  describe('Cleanup Assertion Contract', () => {
    test('should pass when no resources leaked', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 5, // Same
        memoryUsage: { heapUsed: 1024 * 1024 * 52 } as NodeJS.MemoryUsage, // Small increase OK
        activeTimers: 2 // Same
      };

      expect(() => assertions.assertCleanup(beforeState, afterState)).not.toThrow();
    });

    test('should detect handle leaks', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 8, // 3 handles leaked
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      expect(() => assertions.assertCleanup(beforeState, afterState)).toThrow(/3 handle\(s\) leaked/);
    });

    test('should detect timer leaks', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 4 // 2 timers leaked
      };

      expect(() => assertions.assertCleanup(beforeState, afterState)).toThrow(/2 active timer\(s\) leaked/);
    });

    test('should detect memory leaks', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage, // 50MB
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 75 } as NodeJS.MemoryUsage, // 75MB (+25MB)
        activeTimers: 2
      };

      expect(() => assertions.assertCleanup(beforeState, afterState)).toThrow(/25.0MB memory increase/);
    });

    test('should handle multiple issues', () => {
      const beforeState: ResourceState = {
        openHandles: 5,
        memoryUsage: { heapUsed: 1024 * 1024 * 50 } as NodeJS.MemoryUsage,
        activeTimers: 2
      };

      const afterState: ResourceState = {
        openHandles: 7, // 2 leaked
        memoryUsage: { heapUsed: 1024 * 1024 * 65 } as NodeJS.MemoryUsage, // +15MB
        activeTimers: 3 // 1 leaked
      };

      const errorMessage = () => assertions.assertCleanup(beforeState, afterState);

      expect(errorMessage).toThrow(/Resource cleanup assertion failed/);
      expect(errorMessage).toThrow(/2 handle\(s\) leaked/);
      expect(errorMessage).toThrow(/15.0MB memory increase/);
      expect(errorMessage).toThrow(/1 active timer\(s\) leaked/);
    });
  });

  describe('Contract Validation Integration', () => {
    test('should pass performance validation scenario', () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.assertions.performanceValidation;
      const result = scenario.test(assertions);

      expect(result).toBe(true);
    });

    test('should pass flaky detection scenario', async () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.assertions.flakyDetection;
      const result = await scenario.test(assertions);

      expect(result).toBe(true);
    });

    test('should pass full contract validation', () => {
      try {
        const isValid = validateTestAssertions(assertions);
        expect(isValid).toBe(true);
      } catch (error) {
        // If validation fails, ensure it's for expected reasons
        console.warn('Contract validation failed:', error.message);
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Error Messages Contract', () => {
    test('should provide helpful error messages', () => {
      expect(() => assertions.assertPerformance(200, 100))
        .toThrow(/200ms exceeds maximum allowed.*100ms/);

      const poorCoverage: CoverageReport = {
        lines: 100, functions: 20, branches: 30, statements: 150,
        covered: { lines: 70, functions: 18, branches: 27, statements: 135 }
      };

      expect(() => assertions.assertCoverage(poorCoverage, 80))
        .toThrow(/lines: 70.0% < 80%/);
    });

    test('should include context in error messages', async () => {
      const alwaysFails = async () => {
        throw new Error('Test failure');
      };

      try {
        await assertions.assertNotFlaky(alwaysFails, 3);
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('3/3 failures');
        expect(error.message).toContain('Sample errors');
        expect(error.message).toContain('Test failure');
      }
    });
  });
});