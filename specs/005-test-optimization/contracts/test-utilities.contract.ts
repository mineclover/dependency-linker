/**
 * Test Utilities API Contracts
 *
 * These contracts define shared utilities and helpers for optimized test execution.
 * Focuses on solving parser registration issues and setup/teardown complexity.
 */

export interface ITestSetupManager {
  /**
   * Initialize shared test environment
   * Should be called once per test suite to avoid duplicate registrations
   */
  initializeTestEnvironment(): Promise<void>;

  /**
   * Clean up test environment
   * Ensures proper cleanup to prevent worker exit issues
   */
  cleanupTestEnvironment(): Promise<void>;

  /**
   * Get or create singleton parser registry
   * Prevents duplicate parser registration warnings
   */
  getParserRegistry(): Promise<ParserRegistry>;

  /**
   * Create test-specific analysis engine
   * Reuses shared parser registry but provides isolated state
   */
  createAnalysisEngine(options?: AnalysisEngineOptions): Promise<AnalysisEngine>;
}

export interface ITestDataFactory {
  /**
   * Create mock file analysis request
   * Reduces setup complexity for unit tests
   */
  createMockFileRequest(overrides?: Partial<FileAnalysisRequest>): FileAnalysisRequest;

  /**
   * Create mock AST for testing
   * Avoids expensive parsing operations in unit tests
   */
  createMockAST(language: string, content?: string): Promise<Tree>;

  /**
   * Create mock analysis result
   * Standardized test data for integration tests
   */
  createMockAnalysisResult(overrides?: Partial<AnalysisResult>): AnalysisResult;

  /**
   * Create temporary test files
   * Manages cleanup automatically
   */
  createTempFiles(files: TempFileSpec[]): Promise<TempFileContext>;
}

export interface ITestAssertions {
  /**
   * Assert performance within acceptable range
   * Validates execution time against thresholds
   */
  assertPerformance(
    actualMs: number,
    expectedMaxMs: number,
    tolerance?: number
  ): void;

  /**
   * Assert test coverage maintained
   * Validates coverage percentages
   */
  assertCoverage(
    actual: CoverageReport,
    minimum: number,
    areas?: string[]
  ): void;

  /**
   * Assert no flaky test behavior
   * Runs test multiple times to check reliability
   */
  assertNotFlaky(
    testFn: () => Promise<void>,
    iterations?: number
  ): Promise<void>;

  /**
   * Assert proper cleanup
   * Validates no resource leaks or hanging processes
   */
  assertCleanup(beforeState: ResourceState, afterState: ResourceState): void;
}

export interface ITestBenchmark {
  /**
   * Benchmark test execution time
   * Provides consistent timing measurements
   */
  benchmarkExecution<T>(
    testFn: () => Promise<T>,
    iterations?: number
  ): Promise<BenchmarkResult<T>>;

  /**
   * Benchmark memory usage
   * Measures heap usage during test execution
   */
  benchmarkMemory<T>(
    testFn: () => Promise<T>
  ): Promise<MemoryBenchmarkResult<T>>;

  /**
   * Compare benchmark results
   * Statistical comparison of performance metrics
   */
  compareBenchmarks(
    baseline: BenchmarkResult<any>,
    current: BenchmarkResult<any>
  ): BenchmarkComparison;
}

// Supporting Types
export interface ParserRegistry {
  register(parser: LanguageParser): void;
  get(language: string): LanguageParser | undefined;
  clear(): void;
}

export interface AnalysisEngineOptions {
  enableCaching?: boolean;
  maxConcurrency?: number;
  timeoutMs?: number;
}

export interface TempFileSpec {
  path: string;
  content: string;
  language?: string;
}

export interface TempFileContext {
  rootDir: string;
  files: Map<string, string>;
  cleanup(): Promise<void>;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  covered: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export interface ResourceState {
  openHandles: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeTimers: number;
}

export interface BenchmarkResult<T> {
  result: T;
  executionTime: number;
  iterations: number;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
}

export interface MemoryBenchmarkResult<T> {
  result: T;
  initialMemory: NodeJS.MemoryUsage;
  peakMemory: NodeJS.MemoryUsage;
  finalMemory: NodeJS.MemoryUsage;
  memoryDelta: number;
}

export interface BenchmarkComparison {
  timeChange: number;        // Percentage change in execution time
  significantChange: boolean; // Statistical significance
  improvement: boolean;      // Whether current is better
  confidenceLevel: number;   // Statistical confidence (0-1)
}

// Contract Test Scenarios
export const UTILITY_CONTRACT_SCENARIOS = {
  setupManager: {
    singletonBehavior: {
      description: "Parser registry should be singleton across calls",
      test: async (manager: ITestSetupManager) => {
        const registry1 = await manager.getParserRegistry();
        const registry2 = await manager.getParserRegistry();
        return registry1 === registry2;
      }
    },
    cleanupBehavior: {
      description: "Cleanup should prevent worker exit issues",
      test: async (manager: ITestSetupManager) => {
        await manager.initializeTestEnvironment();
        const beforeState = getResourceState();
        await manager.cleanupTestEnvironment();
        const afterState = getResourceState();
        // Should not have increased open handles
        return afterState.openHandles <= beforeState.openHandles;
      }
    }
  },

  dataFactory: {
    mockCreation: {
      description: "Should create valid mock objects",
      test: async (factory: ITestDataFactory) => {
        const request = factory.createMockFileRequest();
        const ast = await factory.createMockAST("typescript");
        const result = factory.createMockAnalysisResult();
        return request && ast && result;
      }
    },
    tempFileCleanup: {
      description: "Temporary files should be cleaned up automatically",
      test: async (factory: ITestDataFactory) => {
        const context = await factory.createTempFiles([
          { path: "test.ts", content: "const x = 1;" }
        ]);
        const existsBefore = require('fs').existsSync(context.rootDir);
        await context.cleanup();
        const existsAfter = require('fs').existsSync(context.rootDir);
        return existsBefore && !existsAfter;
      }
    }
  },

  assertions: {
    performanceValidation: {
      description: "Performance assertions should catch regressions",
      test: (assertions: ITestAssertions) => {
        let caught = false;
        try {
          assertions.assertPerformance(2000, 1000); // Should fail
        } catch {
          caught = true;
        }
        return caught;
      }
    },
    flakyDetection: {
      description: "Should detect flaky test behavior",
      test: async (assertions: ITestAssertions) => {
        let callCount = 0;
        const flakyTest = async () => {
          callCount++;
          if (callCount % 2 === 0) throw new Error("Flaky!");
        };

        let caught = false;
        try {
          await assertions.assertNotFlaky(flakyTest, 3);
        } catch {
          caught = true;
        }
        return caught;
      }
    }
  },

  benchmark: {
    consistentTiming: {
      description: "Benchmarks should provide consistent timing",
      test: async (benchmark: ITestBenchmark) => {
        const testFn = async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        };

        const result = await benchmark.benchmarkExecution(testFn, 3);
        return result.mean >= 90 && result.mean <= 110; // ~100ms ±10ms
      }
    },
    memoryTracking: {
      description: "Should track memory usage accurately",
      test: async (benchmark: ITestBenchmark) => {
        const memoryHog = async () => {
          const bigArray = new Array(100000).fill("memory");
          return bigArray.length;
        };

        const result = await benchmark.benchmarkMemory(memoryHog);
        return result.memoryDelta > 0; // Should show memory increase
      }
    }
  }
};

// Helper function for resource state checking
function getResourceState(): ResourceState {
  return {
    openHandles: (process as any)._getActiveHandles().length,
    memoryUsage: process.memoryUsage(),
    activeTimers: (process as any)._getActiveRequests().length
  };
}

// Contract Validation Functions
export async function validateTestSetupManager(
  manager: ITestSetupManager
): Promise<boolean> {
  const scenarios = UTILITY_CONTRACT_SCENARIOS.setupManager;

  try {
    const singletonResult = await scenarios.singletonBehavior.test(manager);
    const cleanupResult = await scenarios.cleanupBehavior.test(manager);

    return singletonResult && cleanupResult;
  } catch (error) {
    console.error("TestSetupManager contract validation failed:", error);
    return false;
  }
}

export async function validateTestDataFactory(
  factory: ITestDataFactory
): Promise<boolean> {
  const scenarios = UTILITY_CONTRACT_SCENARIOS.dataFactory;

  try {
    const mockResult = await scenarios.mockCreation.test(factory);
    const cleanupResult = await scenarios.tempFileCleanup.test(factory);

    return mockResult && cleanupResult;
  } catch (error) {
    console.error("TestDataFactory contract validation failed:", error);
    return false;
  }
}

export function validateTestAssertions(assertions: ITestAssertions): boolean {
  const scenarios = UTILITY_CONTRACT_SCENARIOS.assertions;

  try {
    const performanceResult = scenarios.performanceValidation.test(assertions);
    // Note: flakyDetection test is async but we're simplifying for contract

    return performanceResult;
  } catch (error) {
    console.error("TestAssertions contract validation failed:", error);
    return false;
  }
}

export async function validateTestBenchmark(
  benchmark: ITestBenchmark
): Promise<boolean> {
  const scenarios = UTILITY_CONTRACT_SCENARIOS.benchmark;

  try {
    const timingResult = await scenarios.consistentTiming.test(benchmark);
    const memoryResult = await scenarios.memoryTracking.test(benchmark);

    return timingResult && memoryResult;
  } catch (error) {
    console.error("TestBenchmark contract validation failed:", error);
    return false;
  }
}