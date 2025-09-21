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
// Re-export error utilities
export { ErrorUtils } from "./errors";
export * from "./OptimizationOpportunity";
export {
	OptimizationOpportunityBuilder,
	OptimizationOpportunityManager,
	OptimizationTemplates,
} from "./OptimizationOpportunity";
export type {
	PerformanceComparison,
	PerformanceMetrics,
	PerformanceTarget,
} from "./PerformanceBaseline";
export * from "./PerformanceBaseline";
export {
	PerformanceAnalyzer,
	PerformanceBaselineBuilder,
} from "./PerformanceBaseline";
export * from "./TestCase";
export {
	TestCaseAnalyzer,
	TestCaseUtils,
} from "./TestCase";
// Model classes and interfaces
export * from "./TestSuite";
// Builder classes for convenient object creation
// Utility classes
export {
	TestCaseBuilder,
	TestSuiteBuilder,
	TestSuiteUtils,
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
