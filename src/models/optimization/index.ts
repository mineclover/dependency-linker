/**
 * Test Optimization Framework - Public API
 * Centralized exports for all optimization-related modules
 */

// Constants and configuration
export * from "./constants";
export {
	calculateImprovementPercentage,
	calculatePriorityScore,
	getEnvironmentConfig,
	meetsPerformanceTargets,
} from "./constants";
// Error handling
export * from "./errors";
// Legacy class export removed - use individual error functions instead
export * from "./OptimizationOpportunity";
export {
	OptimizationOpportunityBuilder,
	OptimizationTemplates,
	prioritizeOpportunities,
	groupByRiskLevel,
	groupByType,
	calculateTotalSavings,
	findParallelExecutableOpportunities,
	validateDependencies,
	createExecutionPlan,
} from "./OptimizationOpportunity";
export type {
	PerformanceComparison,
	PerformanceMetrics,
	PerformanceTarget,
} from "./PerformanceBaseline";
export * from "./PerformanceBaseline";
export { PerformanceBaselineBuilder } from "./PerformanceBaseline";
export * from "./TestCase";
export {
	analyzeTestCase,
	findSimilarTests,
	identifyConsolidationCandidates,
	groupTestCasesByType,
	groupTestCasesByPriority,
	findSlowestTestCases,
	calculateTestCasesTotalTime,
	calculateTestCasesFailureRate,
	findTestCasesByCoverageArea,
	validateTestCases,
} from "./TestCase";
// Model classes and interfaces
export * from "./TestSuite";
// Builder classes for convenient object creation
// Utility classes
export {
	TestCaseBuilder,
	TestSuiteBuilder,
} from "./TestSuite";
// Re-export commonly used types for convenience
export type {
	MemoryUsage,
	MonitoringOptions,
	TestCharacteristics,
	ValidationOptions,
	ValidationResult,
} from "./types";
// Core types and enums
export * from "./types";
// Re-export enums for direct usage
// Re-export utility functions
export {
	ComplexityLevel,
	EffortLevel,
	getOptimizationStrategyName,
	isOptimizationType,
	isTestCategory,
	isTestType,
	OptimizationType,
	Priority,
	RiskLevel,
	TestCategory,
	TestType,
} from "./types";
