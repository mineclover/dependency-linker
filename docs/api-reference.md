# Test Optimization Framework - API Reference

## Table of Contents

- [Core Types](#core-types)
- [Models](#models)
- [Services](#services)
- [Utilities](#utilities)
- [Error Handling](#error-handling)

## Core Types

### Enums

#### TestCategory

Classification for optimization strategy.

```typescript
enum TestCategory {
  Critical = "critical",  // Must keep - API contracts, core logic
  Optimize = "optimize",  // Can simplify - implementation details
  Remove = "remove"       // Redundant - duplicates, deprecated
}
```

#### TestType

Types of tests supported by the framework.

```typescript
enum TestType {
  Unit = "unit",
  Integration = "integration",
  Contract = "contract",
  E2E = "e2e"
}
```

#### Priority

Priority levels for test execution.

```typescript
enum Priority {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low"
}
```

#### OptimizationType

Available optimization strategies.

```typescript
enum OptimizationType {
  RemoveDuplicate = "remove_duplicate",
  SimplifySetup = "simplify_setup",
  ConsolidateScenarios = "consolidate_scenarios",
  FixFlaky = "fix_flaky",
  BehaviorFocus = "behavior_focus",
  SharedUtilities = "shared_utilities"
}
```

#### RiskLevel

Risk levels for optimization changes.

```typescript
enum RiskLevel {
  Low = "low",
  Medium = "medium",
  High = "high"
}
```

### Interfaces

#### TestCharacteristics

Test characteristics that affect optimization decisions.

```typescript
interface TestCharacteristics {
  cpuIntensive?: boolean;
  ioHeavy?: boolean;
  memoryIntensive?: boolean;
}
```

#### MemoryUsage

Memory usage metrics.

```typescript
interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  peak?: number;
  delta?: number;
}
```

#### ValidationOptions

Performance validation options.

```typescript
interface ValidationOptions {
  tolerancePercent?: number;
  maxExecutionTime?: number;
  maxMemoryUsage?: number;
  maxTestCount?: number;
  maxTotalDuration?: number;
  maxAverageDuration?: number;
}
```

#### ValidationResult

Performance validation result.

```typescript
interface ValidationResult {
  passed: boolean;
  violations: string[] | ValidationViolation[];
  metrics: any;
  baseline?: any;
  performanceRatio?: number;
  regressionDetails?: RegressionDetails;
  options: ValidationOptions;
}
```

## Models

### TestCase

Represents an individual test case.

```typescript
interface TestCase {
  id: string;                    // Unique identifier within suite
  name: string;                  // Test description/name
  type: TestType;                // Unit, integration, contract, e2e
  executionTime: number;         // Individual execution time in ms
  isFlaky: boolean;             // Identified as intermittently failing
  duplicateOf?: string;         // Reference to original if duplicate
  coverageAreas: string[];      // Code areas this test covers
  lastFailure?: Date;           // Most recent failure timestamp
  priority: Priority;           // Importance level
  filePath?: string;            // File path for the test
  estimatedDuration: number;    // Estimated duration (alias for executionTime)
  lineStart?: number;           // Line number where test starts
  lineEnd?: number;             // Line number where test ends
  category?: string;            // Test category for optimization
  constraints?: string[];       // Optimization constraints
  characteristics?: TestCharacteristics; // Test characteristics
  setupCode?: string;           // Setup code for the test
  dependsOn?: string[];         // Dependencies on other tests
}
```

#### Constructor

```typescript
new TestCase(data: Partial<TestCase> & { id: string; name: string })
```

**Parameters:**
- `data` - Partial test case data with required id and name

**Example:**
```typescript
const testCase = new TestCase({
  id: 'test-001',
  name: 'should validate user input',
  type: TestType.Unit,
  executionTime: 50,
  priority: Priority.High,
  characteristics: { cpuIntensive: true }
});
```

### TestSuite

Represents a collection of related test cases.

```typescript
interface TestSuite {
  id: string;                    // Unique identifier for the suite
  name: string;                  // Human-readable suite name
  filePath: string;              // Absolute path to test file
  category: TestCategory;        // Classification tier
  testCases: TestCase[];         // Individual tests in the suite
  executionTime: number;         // Current execution time in ms
  lastModified: Date;            // Last modification timestamp
  dependencies: string[];        // External dependencies required
  setupComplexity: ComplexityLevel;  // Setup/teardown complexity rating
}
```

#### Constructor

```typescript
new TestSuite(data: Partial<TestSuite> & { id: string; name: string })
```

### TestSuiteBuilder

Builder pattern for creating test suites.

```typescript
class TestSuiteBuilder {
  constructor(id: string, name: string)
  withFilePath(filePath: string): TestSuiteBuilder
  withCategory(category: TestCategory): TestSuiteBuilder
  withSetupComplexity(complexity: ComplexityLevel): TestSuiteBuilder
  addTestCase(testCase: TestCase): TestSuiteBuilder
  addDependency(dependency: string): TestSuiteBuilder
  withLastModified(date: Date): TestSuiteBuilder
  build(): TestSuite
}
```

**Example:**
```typescript
const testSuite = new TestSuiteBuilder('suite-001', 'User Authentication Tests')
  .withFilePath('/tests/auth.test.ts')
  .withCategory(TestCategory.Critical)
  .withSetupComplexity(ComplexityLevel.Medium)
  .addTestCase(testCase1)
  .addTestCase(testCase2)
  .build();
```

### OptimizationOpportunity

Represents an identified optimization opportunity.

```typescript
interface OptimizationOpportunity {
  id: string;
  type: OptimizationType;
  targetSuite: string;
  targetCases?: string[];
  description: string;
  impact: {
    timeReduction: number;
    complexityReduction: number;
    maintainabilityImprovement: number;
  };
  risk: RiskLevel;
  effort: EffortLevel;
  status: OptimizationStatus;
  strategy?: string;
  constraints?: string[];
  implementation?: {
    approach: string;
    steps: string[];
    codeChanges?: string[];
    rollbackPlan?: string;
  };
  validation?: {
    criteria: string[];
    testPlan: string;
    successMetrics: string[];
  };
}
```

### PerformanceBaseline

Stores performance baseline data for comparison.

```typescript
interface PerformanceBaseline {
  id?: string;
  timestamp: Date;
  totalExecutionTime: number;
  duration?: number;             // Alias for totalExecutionTime
  executionTime?: number;        // Another alias for totalExecutionTime
  totalTests: number;
  failedTests: number;
  failedSuites: number;
  passRate: number;
  coveragePercentage: number;
  memoryUsage: number;
  workerIssues: boolean;
  parserWarnings: number;
  environment: TestEnvironment;
  metadata: BaselineMetadata;
}
```

## Services

### TestAnalyzer

Analyzes test files and identifies optimization opportunities.

#### Constructor

```typescript
new TestAnalyzer(options?: TestAnalyzerOptions)
```

#### Methods

##### analyzeTestFiles

```typescript
async analyzeTestFiles(globPattern: string): Promise<TestSuiteAnalysis>
```

Analyzes test files matching the given glob pattern.

**Parameters:**
- `globPattern` - Glob pattern to match test files (e.g., 'tests/**/*.test.ts')

**Returns:** Promise resolving to TestSuiteAnalysis

**Example:**
```typescript
const analyzer = new TestAnalyzer();
const analysis = await analyzer.analyzeTestFiles('tests/**/*.test.ts');
console.log(`Found ${analysis.totalTests} tests`);
```

##### findOptimizationOpportunities

```typescript
findOptimizationOpportunities(testSuites: TestSuite[]): OptimizationOpportunity[]
```

Identifies optimization opportunities in the given test suites.

**Parameters:**
- `testSuites` - Array of test suites to analyze

**Returns:** Array of optimization opportunities

##### calculateDuplicateSimilarity

```typescript
calculateDuplicateSimilarity(test1: TestCase, test2: TestCase): number
```

Calculates similarity between two test cases for duplicate detection.

**Parameters:**
- `test1` - First test case
- `test2` - Second test case

**Returns:** Similarity score between 0 and 1

##### identifyFlakyTests

```typescript
identifyFlakyTests(testSuites: TestSuite[]): TestCase[]
```

Identifies potentially flaky tests based on historical data.

**Parameters:**
- `testSuites` - Array of test suites to analyze

**Returns:** Array of potentially flaky test cases

### TestOptimizer

Executes optimizations based on identified opportunities.

#### Constructor

```typescript
new TestOptimizer(options?: TestOptimizerOptions)
```

#### Methods

##### optimizeTestSuite

```typescript
async optimizeTestSuite(
  testSuite: TestSuite,
  options?: OptimizationOptions
): Promise<OptimizationResult>
```

Optimizes a test suite based on identified opportunities.

**Parameters:**
- `testSuite` - Test suite to optimize
- `options` - Optimization options

**Returns:** Promise resolving to optimization result

**Example:**
```typescript
const optimizer = new TestOptimizer();
const result = await optimizer.optimizeTestSuite(testSuite, {
  maxOptimizations: 10,
  preserveCriticalTests: true,
  targetDuration: 1500
});
```

##### applyOptimization

```typescript
applyOptimization(
  opportunity: OptimizationOpportunity,
  testSuite: TestSuite
): TestSuite
```

Applies a specific optimization to a test suite.

**Parameters:**
- `opportunity` - Optimization opportunity to apply
- `testSuite` - Test suite to modify

**Returns:** Optimized test suite

##### validateOptimization

```typescript
validateOptimization(original: TestSuite, optimized: TestSuite): boolean
```

Validates that an optimization maintains test coverage and correctness.

**Parameters:**
- `original` - Original test suite
- `optimized` - Optimized test suite

**Returns:** True if optimization is valid

### PerformanceTracker

Monitors test performance and validates against baselines.

#### Constructor

```typescript
new PerformanceTracker(options?: PerformanceTrackingOptions)
```

#### Methods

##### initialize

```typescript
async initialize(): Promise<void>
```

Initializes the performance tracker.

##### cleanup

```typescript
async cleanup(): Promise<void>
```

Cleans up resources used by the performance tracker.

##### trackTestSuiteExecution

```typescript
async trackTestSuiteExecution<T>(
  testSuite: any,
  executionFn: () => Promise<T>
): Promise<T>
```

Tracks the execution of a test suite.

**Parameters:**
- `testSuite` - Test suite being executed
- `executionFn` - Function that executes the tests

**Returns:** Promise resolving to the execution result

**Example:**
```typescript
const tracker = new PerformanceTracker();
await tracker.trackTestSuiteExecution(testSuite, async () => {
  // Run your tests here
  return await runJestTests();
});
```

##### getMetrics

```typescript
getMetrics(testSuiteId: string): TestSuiteMetrics | undefined
```

Gets performance metrics for a test suite.

**Parameters:**
- `testSuiteId` - ID of the test suite

**Returns:** Performance metrics or undefined if not found

##### validatePerformance

```typescript
async validatePerformance(
  testSuiteId: string,
  options: ValidationOptions
): Promise<ValidationResult>
```

Validates performance against specified criteria.

**Parameters:**
- `testSuiteId` - ID of the test suite
- `options` - Validation options

**Returns:** Promise resolving to validation result

##### establishBaseline

```typescript
async establishBaseline(
  testSuiteId: string,
  options?: any
): Promise<PerformanceBaseline>
```

Establishes a performance baseline for a test suite.

**Parameters:**
- `testSuiteId` - ID of the test suite
- `options` - Baseline options

**Returns:** Promise resolving to established baseline

##### validateAgainstBaseline

```typescript
async validateAgainstBaseline(
  testSuiteId: string,
  baselineId: string,
  options: ValidationOptions
): Promise<ValidationResult>
```

Validates current performance against an established baseline.

**Parameters:**
- `testSuiteId` - ID of the test suite
- `baselineId` - ID of the baseline
- `options` - Validation options

**Returns:** Promise resolving to validation result

##### startRealTimeMonitoring

```typescript
async startRealTimeMonitoring(
  testSuiteId: string,
  options: MonitoringOptions
): Promise<MonitoringSession>
```

Starts real-time performance monitoring.

**Parameters:**
- `testSuiteId` - ID of the test suite
- `options` - Monitoring options

**Returns:** Promise resolving to monitoring session

##### stopRealTimeMonitoring

```typescript
async stopRealTimeMonitoring(sessionId: string): Promise<void>
```

Stops real-time monitoring.

**Parameters:**
- `sessionId` - ID of the monitoring session

##### getMonitoringSession

```typescript
async getMonitoringSession(sessionId: string): Promise<MonitoringSession>
```

Gets data from a monitoring session.

**Parameters:**
- `sessionId` - ID of the monitoring session

**Returns:** Promise resolving to monitoring session data

## Utilities

### Type Guards

#### isTestCategory

```typescript
function isTestCategory(value: any): value is TestCategory
```

Type guard to check if a value is a TestCategory.

#### isTestType

```typescript
function isTestType(value: any): value is TestType
```

Type guard to check if a value is a TestType.

#### isOptimizationType

```typescript
function isOptimizationType(value: any): value is OptimizationType
```

Type guard to check if a value is an OptimizationType.

### Utility Functions

#### getOptimizationStrategyName

```typescript
function getOptimizationStrategyName(type: OptimizationType): string
```

Converts optimization type to human-readable strategy name.

**Parameters:**
- `type` - Optimization type

**Returns:** Human-readable strategy name

### TestSuiteUtils

Static utility methods for test suite operations.

#### calculateTotalExecutionTime

```typescript
static calculateTotalExecutionTime(testSuites: TestSuite[]): number
```

Calculates total execution time for multiple test suites.

#### categorizeTestSuites

```typescript
static categorizeTestSuites(testSuites: TestSuite[]): {
  critical: TestSuite[];
  optimize: TestSuite[];
  remove: TestSuite[];
}
```

Categorizes test suites by optimization category.

#### findDuplicateTests

```typescript
static findDuplicateTests(testSuites: TestSuite[]): TestCase[]
```

Finds duplicate test cases across test suites.

#### findFlakyTests

```typescript
static findFlakyTests(testSuites: TestSuite[]): TestCase[]
```

Finds flaky test cases across test suites.

#### validateTestSuite

```typescript
static validateTestSuite(suite: TestSuite): string[]
```

Validates a test suite and returns any validation errors.

## Error Handling

### Common Exceptions

#### ValidationError

Thrown when validation fails.

```typescript
class ValidationError extends Error {
  constructor(message: string, public violations: string[])
}
```

#### OptimizationError

Thrown when optimization fails.

```typescript
class OptimizationError extends Error {
  constructor(
    message: string,
    public optimizationType: OptimizationType,
    public targetSuite: string
  )
}
```

#### PerformanceError

Thrown when performance tracking fails.

```typescript
class PerformanceError extends Error {
  constructor(
    message: string,
    public testSuiteId: string,
    public metrics?: any
  )
}
```

### Error Handling Best Practices

1. **Always handle async operations with try-catch**
```typescript
try {
  const result = await optimizer.optimizeTestSuite(testSuite);
} catch (error) {
  if (error instanceof OptimizationError) {
    console.error(`Optimization failed for ${error.targetSuite}: ${error.message}`);
  }
}
```

2. **Validate inputs before processing**
```typescript
const errors = TestSuiteUtils.validateTestSuite(testSuite);
if (errors.length > 0) {
  throw new ValidationError('Test suite validation failed', errors);
}
```

3. **Use proper error logging**
```typescript
const logger = require('./logger');

try {
  await performanceTracker.trackTestSuiteExecution(testSuite, executionFn);
} catch (error) {
  logger.error('Performance tracking failed', {
    testSuiteId: testSuite.id,
    error: error.message
  });
  throw error;
}
```

## Configuration Options

### TestAnalyzerOptions

```typescript
interface TestAnalyzerOptions {
  duplicateThreshold?: number;      // Similarity threshold for duplicates (0-1)
  flakyDetectionSensitivity?: number; // Sensitivity for flaky test detection
  complexityThreshold?: number;     // Threshold for complexity analysis
  ignorePatterns?: string[];        // Patterns to ignore during analysis
}
```

### OptimizationOptions

```typescript
interface OptimizationOptions {
  maxOptimizations?: number;        // Maximum number of optimizations to apply
  preserveCriticalTests?: boolean;  // Whether to preserve critical tests
  aggressiveOptimization?: boolean; // Enable aggressive optimization
  targetDuration?: number;          // Target execution duration (ms)
  maxRiskLevel?: RiskLevel;        // Maximum acceptable risk level
  dryRun?: boolean;                // Run in dry-run mode (no changes)
}
```

### PerformanceTrackingOptions

```typescript
interface PerformanceTrackingOptions {
  maxRetries?: number;             // Maximum number of retries
  retryDelay?: number;             // Delay between retries (ms)
  timeout?: number;                // Execution timeout (ms)
  warmupRuns?: number;             // Number of warmup runs
  measurementRuns?: number;        // Number of measurement runs
  enableMemoryProfiling?: boolean; // Enable memory profiling
  enableCpuProfiling?: boolean;    // Enable CPU profiling
  outputDirectory?: string;        // Output directory for performance data
}
```