/**
 * Scenario System - Public API
 *
 * Central export point for the Scenario System providing:
 * - Global scenario registry with built-in scenarios
 * - Core types and interfaces
 * - Base analyzer class
 * - Utility functions
 */

import { ScenarioRegistry } from "./ScenarioRegistry";
import {
	basicStructureSpec,
	fileDependencySpec,
	symbolDependencySpec,
	markdownLinkingSpec,
	type BuiltinScenarioId,
	BUILTIN_SCENARIOS,
} from "./builtin";

// ===== Type Exports =====
export type {
	ScenarioSpec,
	NodeTypeSpec,
	EdgeTypeSpec,
	SemanticTagSpec,
	QueryPatternSpec,
	InferenceRuleSpec,
	TypeCollection,
	ScenarioValidationResult,
	AnalysisResult,
} from "./types";

export type { BuiltinScenarioId } from "./builtin";

// ===== Class Exports =====
export { ScenarioRegistry } from "./ScenarioRegistry";
export {
	BaseScenarioAnalyzer,
	type AnalysisContext,
} from "./BaseScenarioAnalyzer";

// ===== Validation Exports =====
export {
	validateScenarioSpec,
	validateNodeTypeSpec,
	validateEdgeTypeSpec,
	isValidVersion,
	isValidScenarioId,
	detectCircularDependencies,
} from "./validation";

// ===== Built-in Scenarios Exports =====
export {
	basicStructureSpec,
	fileDependencySpec,
	symbolDependencySpec,
	markdownLinkingSpec,
	BUILTIN_SCENARIOS,
} from "./builtin";

// ===== Global Registry =====

/**
 * Global Scenario Registry
 *
 * Pre-configured registry with all built-in scenarios registered.
 * Use this for most scenario operations.
 */
export const globalScenarioRegistry = new ScenarioRegistry();

/**
 * Initialize global registry with built-in scenarios
 */
function initializeBuiltinScenarios(): void {
	// Register in dependency order
	try {
		globalScenarioRegistry.register(basicStructureSpec);
		globalScenarioRegistry.register(fileDependencySpec);
		globalScenarioRegistry.register(symbolDependencySpec);
		globalScenarioRegistry.register(markdownLinkingSpec);
	} catch (error) {
		console.error("Failed to initialize built-in scenarios:", error);
		throw error;
	}
}

// Auto-initialize on module load
initializeBuiltinScenarios();

// ===== Convenience Functions =====

/**
 * Get a scenario by ID from global registry
 */
export function getScenario(id: string) {
	return globalScenarioRegistry.get(id);
}

/**
 * Check if a scenario exists in global registry
 */
export function hasScenario(id: string): boolean {
	return globalScenarioRegistry.has(id);
}

/**
 * List all registered scenarios in global registry
 */
export function listScenarios() {
	return globalScenarioRegistry.list();
}

/**
 * Get execution order for scenarios
 */
export function getExecutionOrder(scenarioIds: string[]): string[] {
	return globalScenarioRegistry.getExecutionOrder(scenarioIds);
}

/**
 * Collect types for a scenario including extends chain
 */
export function collectTypes(scenarioId: string) {
	return globalScenarioRegistry.collectTypes(scenarioId);
}

/**
 * Validate type consistency across all scenarios
 */
export function validateTypeConsistency() {
	return globalScenarioRegistry.validateTypeConsistency();
}

/**
 * Register a custom scenario in global registry
 *
 * @param spec - Scenario specification to register
 * @throws Error if scenario is invalid or conflicts with existing scenarios
 */
export function registerScenario(spec: import("./types").ScenarioSpec): void {
	globalScenarioRegistry.register(spec);
}

/**
 * Check if a scenario is a built-in scenario
 */
export function isBuiltinScenario(id: string): id is BuiltinScenarioId {
	return BUILTIN_SCENARIOS.includes(id as BuiltinScenarioId);
}

/**
 * Reset global registry (useful for testing)
 *
 * WARNING: This clears all scenarios including built-ins.
 * Call initializeBuiltinScenarios() to restore built-ins.
 */
export function resetGlobalRegistry(): void {
	globalScenarioRegistry.clear();
}

/**
 * Re-initialize built-in scenarios
 */
export function reinitializeBuiltinScenarios(): void {
	globalScenarioRegistry.clear();
	initializeBuiltinScenarios();
}
