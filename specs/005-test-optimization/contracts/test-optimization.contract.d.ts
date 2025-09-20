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
    executeOptimizations(opportunities: OptimizationOpportunity[], options: OptimizationOptions): Promise<OptimizationResult>;
    /**
     * Validate optimization results
     * @param result - Result from executeOptimizations
     * @param baseline - Original performance baseline
     * @returns Promise resolving to validation report
     */
    validateOptimization(result: OptimizationResult, baseline: PerformanceBaseline): Promise<ValidationReport>;
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
    comparePerformance(baseline: PerformanceBaseline, current: PerformanceMetrics): PerformanceComparison;
}
export interface TestSuiteAnalysis {
    totalTests: number;
    totalSuites: number;
    executionTime: number;
    failureRate: number;
    testSuites: TestSuite[];
    issues: TestIssue[];
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
    timeImprovement: number;
    testReduction: number;
    reliabilityChange: number;
    coverageChange: number;
    meetsTargets: boolean;
}
export declare enum OptimizationType {
    RemoveDuplicate = "remove_duplicate",
    SimplifySetup = "simplify_setup",
    ConsolidateScenarios = "consolidate_scenarios",
    FixFlaky = "fix_flaky",
    BehaviorFocus = "behavior_focus",
    SharedUtilities = "shared_utilities"
}
export declare enum RiskLevel {
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare enum EffortLevel {
    Minimal = "minimal",
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare const CONTRACT_SCENARIOS: {
    testAnalysis: {
        validDirectory: string;
        expectedMinTests: number;
        expectedMaxExecutionTime: number;
        requiredCategories: string[];
    };
    optimization: {
        targetExecutionTime: number;
        minCoveragePreservation: number;
        maxTestReduction: number;
        requiredValidationChecks: string[];
    };
    performance: {
        baselineRequirements: {
            executionTime: boolean;
            testCount: boolean;
            passRate: boolean;
            coverage: boolean;
        };
        comparisonMetrics: string[];
        improvementThresholds: {
            minTimeImprovement: number;
            minReliabilityImprovement: number;
            maxCoverageReduction: number;
        };
    };
};
export declare function validateTestAnalyzer(analyzer: ITestAnalyzer): Promise<boolean>;
export declare function validateTestOptimizer(optimizer: ITestOptimizer): Promise<boolean>;
export declare function validatePerformanceTracker(tracker: IPerformanceTracker): Promise<boolean>;
//# sourceMappingURL=test-optimization.contract.d.ts.map