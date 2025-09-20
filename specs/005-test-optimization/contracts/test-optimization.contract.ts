/**
 * Test Optimization API Contracts
 *
 * These contracts define the interfaces and behaviors for test suite optimization.
 * All implementations must pass these contract tests before optimization begins.
 */

export interface ITestAnalyzer {
  /**
   * Analyze current test suite structure and performance
   * @param testDirectory - Root directory containing test files
   * @returns Promise resolving to analysis report
   */
  analyzeTestSuite(testDirectory: string): Promise<TestSuiteAnalysis>;

  /**
   * Categorize tests based on optimization strategy
   * @param analysis - Result from analyzeTestSuite
   * @returns Promise resolving to categorized tests
   */
  categorizeTests(analysis: TestSuiteAnalysis): Promise<CategorizedTests>;

  /**
   * Identify optimization opportunities
   * @param categorized - Result from categorizeTests
   * @returns Promise resolving to list of opportunities
   */
  identifyOptimizations(categorized: CategorizedTests): Promise<OptimizationOpportunity[]>;
}

export interface ITestOptimizer {
  /**
   * Execute optimization based on opportunities
   * @param opportunities - List of optimization opportunities
   * @param options - Configuration options for optimization
   * @returns Promise resolving to optimization results
   */
  executeOptimizations(
    opportunities: OptimizationOpportunity[],
    options: OptimizationOptions
  ): Promise<OptimizationResult>;

  /**
   * Validate optimization results
   * @param result - Result from executeOptimizations
   * @param baseline - Original performance baseline
   * @returns Promise resolving to validation report
   */
  validateOptimization(
    result: OptimizationResult,
    baseline: PerformanceBaseline
  ): Promise<ValidationReport>;

  /**
   * Rollback optimization if validation fails
   * @param result - Failed optimization result
   * @returns Promise resolving to rollback status
   */
  rollbackOptimization(result: OptimizationResult): Promise<RollbackResult>;
}

export interface IPerformanceTracker {
  /**
   * Establish performance baseline before optimization
   * @param testCommand - Command to run tests
   * @returns Promise resolving to baseline metrics
   */
  establishBaseline(testCommand: string): Promise<PerformanceBaseline>;

  /**
   * Measure performance after optimization
   * @param testCommand - Command to run optimized tests
   * @returns Promise resolving to current performance metrics
   */
  measureCurrent(testCommand: string): Promise<PerformanceMetrics>;

  /**
   * Compare performance between baseline and current
   * @param baseline - Original performance metrics
   * @param current - Current performance metrics
   * @returns Performance comparison report
   */
  comparePerformance(
    baseline: PerformanceBaseline,
    current: PerformanceMetrics
  ): PerformanceComparison;
}

// Import missing types from data models
import {
  TestSuite,
  TestCase,
  TestCategory,
  TestType,
  Priority
} from '../../../src/models/optimization/TestSuite';

// Data Types (from data-model.md)
export interface TestSuiteAnalysis {
  totalTests: number;
  totalSuites: number;
  executionTime: number;
  failureRate: number;
  testSuites: TestSuite[];
  issues: TestIssue[];
}

export interface TestIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  targetSuite?: string;
  targetCase?: string;
}

export interface DuplicateTest {
  id: string;
  originalId: string;
  similarity: number;
  testCase: TestCase;
}

export interface ValidationIssue {
  id: string;
  type: string;
  severity: 'warning' | 'error';
  description: string;
  location?: string;
}

export interface RollbackResult {
  success: boolean;
  restoredFiles: string[];
  errors: string[];
  timestamp: Date;
}

export interface CategorizedTests {
  critical: TestSuite[];
  optimize: TestSuite[];
  remove: TestSuite[];
  duplicates: DuplicateTest[];
}

export interface OptimizationOpportunity {
  id: string;
  type: OptimizationType;
  targetSuite: string;
  targetCases?: string[];
  description: string;
  estimatedTimeSaving: number;
  riskLevel: RiskLevel;
  implementationEffort: EffortLevel;
  prerequisites: string[];
}

export interface OptimizationOptions {
  maxRiskLevel: RiskLevel;
  preserveCoverage: boolean;
  targetExecutionTime: number;
  dryRun: boolean;
}

export interface OptimizationResult {
  id: string;
  timestamp: Date;
  appliedOptimizations: OptimizationOpportunity[];
  removedTests: TestCase[];
  modifiedTests: TestCase[];
  newUtilities: string[];
  backupLocation: string;
}

export interface ValidationReport {
  success: boolean;
  executionTime: number;
  testCount: number;
  passRate: number;
  coveragePercentage: number;
  issuesFound: ValidationIssue[];
  recommendations: string[];
}

export interface PerformanceBaseline {
  timestamp: Date;
  totalExecutionTime: number;
  totalTests: number;
  failedTests: number;
  failedSuites: number;
  passRate: number;
  coveragePercentage: number;
  memoryUsage: number;
  workerIssues: boolean;
}

export interface PerformanceMetrics {
  executionTime: number;
  testCount: number;
  passRate: number;
  coveragePercentage: number;
  memoryUsage: number;
}

export interface PerformanceComparison {
  timeImprovement: number;        // Percentage improvement
  testReduction: number;          // Number of tests removed
  reliabilityChange: number;      // Pass rate change
  coverageChange: number;         // Coverage change
  meetsTargets: boolean;
}

// Supporting Types
export enum OptimizationType {
  RemoveDuplicate = "remove_duplicate",
  SimplifySetup = "simplify_setup",
  ConsolidateScenarios = "consolidate_scenarios",
  FixFlaky = "fix_flaky",
  BehaviorFocus = "behavior_focus",
  SharedUtilities = "shared_utilities"
}

export enum RiskLevel {
  Low = "low",
  Medium = "medium",
  High = "high"
}

export enum EffortLevel {
  Minimal = "minimal",
  Low = "low",
  Medium = "medium",
  High = "high"
}

// Contract Test Scenarios
export const CONTRACT_SCENARIOS = {
  testAnalysis: {
    validDirectory: "tests/",
    expectedMinTests: 250,
    expectedMaxExecutionTime: 5000, // 5 seconds max
    requiredCategories: ["critical", "optimize", "remove"]
  },

  optimization: {
    targetExecutionTime: 1500, // 1.5 seconds
    minCoveragePreservation: 80, // 80% minimum
    maxTestReduction: 0.3, // 30% maximum reduction
    requiredValidationChecks: ["performance", "coverage", "reliability"]
  },

  performance: {
    baselineRequirements: {
      executionTime: true,
      testCount: true,
      passRate: true,
      coverage: true
    },
    comparisonMetrics: ["time", "reliability", "coverage"],
    improvementThresholds: {
      minTimeImprovement: 0.25, // 25% minimum
      minReliabilityImprovement: 0.02, // 2% minimum
      maxCoverageReduction: 0.05 // 5% maximum loss
    }
  }
};

// Contract Validation Functions
export function validateTestAnalyzer(analyzer: ITestAnalyzer): Promise<boolean> {
  // Contract test implementation would go here
  throw new Error("Contract validation not yet implemented");
}

export function validateTestOptimizer(optimizer: ITestOptimizer): Promise<boolean> {
  // Contract test implementation would go here
  throw new Error("Contract validation not yet implemented");
}

export function validatePerformanceTracker(tracker: IPerformanceTracker): Promise<boolean> {
  // Contract test implementation would go here
  throw new Error("Contract validation not yet implemented");
}