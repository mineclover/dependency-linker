/**
 * Test Optimization Framework - Core Types
 *
 * This file contains all core type definitions for the test optimization framework.
 * These types are used across models, services, and validation logic.
 *
 * @module types
 * @version 1.0.0
 * @author Test Optimization Framework
 */

// ============================================================================
// ENUMS - Test Classification and Optimization Types
// ============================================================================

/**
 * Test classification for optimization strategy
 *
 * Categorizes tests based on their importance and optimization potential:
 * - Critical: Essential tests that must be preserved (API contracts, core business logic)
 * - Optimize: Tests that can be simplified or improved (implementation details, integration scenarios)
 * - Remove: Redundant tests that can be safely removed (duplicates, deprecated functionality)
 *
 * @enum {string}
 */
export enum TestCategory {
	/** Must keep - API contracts, core logic, security tests */
	Critical = "critical",
	/** Can simplify - implementation details, integration scenarios */
	Optimize = "optimize",
	/** Redundant - duplicates, deprecated functionality */
	Remove = "remove",
}

/**
 * Types of tests supported by the framework
 *
 * Defines the different categories of tests that can be analyzed and optimized:
 * - Unit: Fast, isolated tests for individual functions/methods
 * - Integration: Tests that verify component interactions
 * - Contract: API contract validation tests
 * - E2E: End-to-end tests that simulate user workflows
 *
 * @enum {string}
 */
export enum TestType {
	/** Fast, isolated tests for individual functions/methods */
	Unit = "unit",
	/** Tests that verify component interactions */
	Integration = "integration",
	/** API contract validation tests */
	Contract = "contract",
	/** End-to-end tests that simulate user workflows */
	E2E = "e2e",
}

/**
 * Priority levels for test execution
 *
 * Defines the importance ranking of tests for optimization decisions:
 * - Critical: Highest priority, must never be removed or significantly modified
 * - High: Important tests that should be preserved but may be optimized
 * - Medium: Standard tests that can be optimized or consolidated
 * - Low: Lower priority tests that are candidates for removal if redundant
 *
 * @enum {string}
 */
export enum Priority {
	/** Highest priority, must never be removed or significantly modified */
	Critical = "critical",
	/** Important tests that should be preserved but may be optimized */
	High = "high",
	/** Standard tests that can be optimized or consolidated */
	Medium = "medium",
	/** Lower priority tests that are candidates for removal if redundant */
	Low = "low",
}

/**
 * Complexity levels for test setup/teardown
 */
export enum ComplexityLevel {
	Low = "low",
	Medium = "medium",
	High = "high",
}

/**
 * Available optimization strategies
 */
export enum OptimizationType {
	RemoveDuplicate = "remove_duplicate",
	SimplifySetup = "simplify_setup",
	ConsolidateScenarios = "consolidate_scenarios",
	FixFlaky = "fix_flaky",
	BehaviorFocus = "behavior_focus",
	SharedUtilities = "shared_utilities",
}

/**
 * Risk levels for optimization changes
 */
export enum RiskLevel {
	Low = "low",
	Medium = "medium",
	High = "high",
}

/**
 * Effort levels for implementing optimizations
 */
export enum EffortLevel {
	Minimal = "minimal",
	Low = "low",
	Medium = "medium",
	High = "high",
}

// ============================================================================
// INTERFACES - Core Data Structures
// ============================================================================

/**
 * Test characteristics that affect optimization decisions
 *
 * Describes the resource usage patterns and requirements of tests,
 * which influences optimization strategies and execution planning.
 *
 * @interface TestCharacteristics
 */
export interface TestCharacteristics {
	/** Whether the test performs CPU-intensive operations */
	cpuIntensive?: boolean;
	/** Whether the test performs heavy I/O operations (file system, network) */
	ioHeavy?: boolean;
	/** Whether the test consumes significant memory resources */
	memoryIntensive?: boolean;
}

/**
 * Memory usage metrics
 *
 * Captures detailed memory consumption data during test execution
 * for performance analysis and optimization decisions.
 *
 * @interface MemoryUsage
 */
export interface MemoryUsage {
	/** Currently used heap memory in bytes */
	heapUsed: number;
	/** Total heap memory allocated in bytes */
	heapTotal: number;
	/** External memory usage in bytes (e.g., C++ objects, ArrayBuffers) */
	external: number;
	/** Peak memory usage during execution in bytes */
	peak?: number;
	/** Memory usage change from baseline in bytes */
	delta?: number;
}

/**
 * Test environment information
 */
export interface TestEnvironment {
	nodeVersion: string;
	jestVersion: string;
	platform: string;
	arch: string;
	cpuCount?: number;
	totalMemory?: number;
	availableMemory?: number;
}

/**
 * Baseline metadata for tracking measurement context
 */
export interface BaselineMetadata {
	measurementDuration: number;
	retries: number;
	confidence: number;
	notes?: string;
	gitCommit?: string;
	branch?: string;
}

/**
 * Performance validation options
 */
export interface ValidationOptions {
	tolerancePercent?: number;
	maxExecutionTime?: number;
	maxMemoryUsage?: number;
	maxTestCount?: number;
	maxTotalDuration?: number;
	maxAverageDuration?: number;
}

/**
 * Real-time monitoring configuration
 */
export interface MonitoringOptions {
	intervalMs?: number;
	durationThreshold?: number;
	alertThresholds?: {
		duration?: number;
		memory?: number;
	};
	thresholds?: {
		duration?: number;
		memory?: number;
	};
}

/**
 * Performance validation result
 */
export interface ValidationResult {
	passed: boolean;
	violations: string[] | ValidationViolation[];
	metrics: any;
	baseline?: any;
	performanceRatio?: number;
	regressionDetails?: RegressionDetails;
	options: ValidationOptions;
}

/**
 * Detailed validation violation information
 */
export interface ValidationViolation {
	type: string;
	message: string;
	actual?: number;
	threshold?: number;
}

/**
 * Performance regression analysis details
 */
export interface RegressionDetails {
	type: string;
	message: string;
	currentDuration?: number;
	baselineDuration?: number;
	performanceRatio?: number;
	tolerancePercent?: number;
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if a value is a TestCategory
 *
 * @param value - The value to check
 * @returns True if the value is a valid TestCategory
 *
 * @example
 * ```typescript
 * const category = 'critical';
 * if (isTestCategory(category)) {
 *   // category is now typed as TestCategory
 *   console.log(`Valid category: ${category}`);
 * }
 * ```
 */
export function isTestCategory(value: any): value is TestCategory {
	return Object.values(TestCategory).includes(value);
}

/**
 * Type guard to check if a value is a TestType
 *
 * @param value - The value to check
 * @returns True if the value is a valid TestType
 *
 * @example
 * ```typescript
 * const type = 'unit';
 * if (isTestType(type)) {
 *   // type is now typed as TestType
 *   console.log(`Valid test type: ${type}`);
 * }
 * ```
 */
export function isTestType(value: any): value is TestType {
	return Object.values(TestType).includes(value);
}

/**
 * Type guard to check if a value is an OptimizationType
 */
export function isOptimizationType(value: any): value is OptimizationType {
	return Object.values(OptimizationType).includes(value);
}

/**
 * Utility to convert optimization type to human-readable strategy name
 *
 * Transforms internal optimization type enums into user-friendly strategy names
 * that can be used in reports, logs, and user interfaces.
 *
 * @param type - The optimization type to convert
 * @returns Human-readable strategy name
 *
 * @example
 * ```typescript
 * const strategyName = getOptimizationStrategyName(OptimizationType.RemoveDuplicate);
 * console.log(strategyName); // Output: 'duplicate-removal'
 * ```
 */
export function getOptimizationStrategyName(type: OptimizationType): string {
	const strategyNames: Record<OptimizationType, string> = {
		[OptimizationType.RemoveDuplicate]: "duplicate-removal",
		[OptimizationType.SimplifySetup]: "setup-optimization",
		[OptimizationType.ConsolidateScenarios]: "scenario-consolidation",
		[OptimizationType.FixFlaky]: "flaky-test-fix",
		[OptimizationType.BehaviorFocus]: "behavior-driven-focus",
		[OptimizationType.SharedUtilities]: "shared-utilities",
	};
	return strategyNames[type] || type;
}
