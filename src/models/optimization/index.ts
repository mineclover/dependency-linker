/**
 * Test Optimization Framework - Public API
 * Centralized exports for all optimization-related modules
 */

// Core types and enums
export * from './types';

// Model classes and interfaces
export * from './TestSuite';
export * from './TestCase';
export * from './OptimizationOpportunity';
export * from './PerformanceBaseline';

// Error handling
export * from './errors';

// Constants and configuration
export * from './constants';

// Re-export commonly used types for convenience
export type {
  TestCase,
  TestSuite,
  OptimizationOpportunity,
  PerformanceBaseline,
  TestCharacteristics,
  MemoryUsage,
  ValidationOptions,
  ValidationResult,
  MonitoringOptions
} from './types';

export type {
  TestSuiteMetrics,
  PerformanceMetrics,
  PerformanceComparison,
  PerformanceTarget
} from './PerformanceBaseline';

// Re-export enums for direct usage
export {
  TestCategory,
  TestType,
  Priority,
  ComplexityLevel,
  OptimizationType,
  RiskLevel,
  EffortLevel
} from './types';

// Re-export utility functions
export {
  isTestCategory,
  isTestType,
  isOptimizationType,
  getOptimizationStrategyName
} from './types';

export {
  calculatePriorityScore,
  meetsPerformanceTargets,
  calculateImprovementPercentage,
  getEnvironmentConfig
} from './constants';

// Re-export error utilities
export {
  ErrorUtils
} from './errors';

// Builder classes for convenient object creation
export {
  TestSuiteBuilder,
  TestCaseBuilder
} from './TestSuite';

export {
  OptimizationOpportunityBuilder,
  OptimizationOpportunityManager,
  OptimizationTemplates
} from './OptimizationOpportunity';

export {
  PerformanceBaselineBuilder,
  PerformanceAnalyzer
} from './PerformanceBaseline';

// Utility classes
export {
  TestSuiteUtils
} from './TestSuite';

export {
  TestCaseAnalyzer,
  TestCaseUtils
} from './TestCase';