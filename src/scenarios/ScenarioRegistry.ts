/**
 * Scenario Registry
 *
 * Central registry for managing scenario specifications, resolving dependencies,
 * and calculating execution order.
 */

import type {
	ScenarioSpec,
	ScenarioValidationResult,
	TypeCollection,
} from "./types";
import { detectCircularDependencies, validateScenarioSpec } from "./validation";
/**
 * Scenario Registry
 *
 * Manages all scenario specifications with validation, dependency resolution,
 * and type collection.
 */
export class ScenarioRegistry {
	private scenarios = new Map<string, ScenarioSpec>();

	/**
	 * Register a scenario specification
	 *
	 * @throws Error if scenario is invalid or has circular dependencies
	 */
	register(spec: ScenarioSpec): void {
		// Validate scenario spec
		const validation = validateScenarioSpec(spec);
		if (!validation.valid) {
			throw new Error(
				`Invalid scenario spec '${spec.id}': ${validation.errors.join(", ")}`,
			);
		}

		// Log warnings if any
		if (validation.warnings.length > 0) {
			console.warn(
				`Scenario '${spec.id}' warnings: ${validation.warnings.join(", ")}`,
			);
		}

		// Check for ID conflicts
		if (this.scenarios.has(spec.id)) {
			throw new Error(`Scenario '${spec.id}' is already registered`);
		}

		// Validate dependencies exist
		if (spec.extends) {
			for (const extendId of spec.extends) {
				if (!this.scenarios.has(extendId)) {
					throw new Error(
						`Scenario '${spec.id}' extends undefined scenario '${extendId}'`,
					);
				}
			}
		}

		if (spec.requires) {
			for (const requireId of spec.requires) {
				if (!this.scenarios.has(requireId)) {
					throw new Error(
						`Scenario '${spec.id}' requires undefined scenario '${requireId}'`,
					);
				}
			}
		}

		// Check for circular dependencies
		const tempMap = new Map(this.scenarios);
		tempMap.set(spec.id, spec);
		const circularError = detectCircularDependencies(spec.id, tempMap);
		if (circularError) {
			throw new Error(circularError);
		}

		// Register scenario
		this.scenarios.set(spec.id, spec);

		// TODO: Register edge types with EdgeTypeRegistry (to be implemented)
	}

	/**
	 * Get a scenario by ID
	 */
	get(id: string): ScenarioSpec | undefined {
		return this.scenarios.get(id);
	}

	/**
	 * Check if a scenario exists
	 */
	has(id: string): boolean {
		return this.scenarios.has(id);
	}

	/**
	 * List all registered scenarios
	 */
	list(): ScenarioSpec[] {
		return Array.from(this.scenarios.values());
	}

	/**
	 * Get execution order for given scenario IDs using topological sort
	 *
	 * Returns scenarios in order they should be executed, with dependencies first.
	 *
	 * @param scenarioIds - Scenarios to execute
	 * @returns Ordered array of scenario IDs
	 * @throws Error if scenario doesn't exist or circular dependency detected
	 */
	getExecutionOrder(scenarioIds: string[]): string[] {
		// Validate all scenarios exist
		for (const id of scenarioIds) {
			if (!this.scenarios.has(id)) {
				throw new Error(`Scenario '${id}' not found in registry`);
			}
		}

		// Build dependency graph
		const allScenarios = new Set<string>();
		const dependencies = new Map<string, Set<string>>();

		// Collect all scenarios including dependencies
		const collectDependencies = (id: string) => {
			if (allScenarios.has(id)) {
				return;
			}

			allScenarios.add(id);
			const spec = this.scenarios.get(id);
			if (!spec) {
				return;
			}

			const deps = new Set<string>();

			// Add extends dependencies
			if (spec.extends) {
				for (const extendId of spec.extends) {
					deps.add(extendId);
					collectDependencies(extendId);
				}
			}

			// Add requires dependencies
			if (spec.requires) {
				for (const requireId of spec.requires) {
					deps.add(requireId);
					collectDependencies(requireId);
				}
			}

			dependencies.set(id, deps);
		};

		// Collect all dependencies
		for (const id of scenarioIds) {
			collectDependencies(id);
		}

		// Topological sort using Kahn's algorithm
		const inDegree = new Map<string, number>();
		const adjList = new Map<string, Set<string>>();

		// Initialize
		for (const id of allScenarios) {
			inDegree.set(id, 0);
			adjList.set(id, new Set());
		}

		// Build adjacency list and in-degree
		for (const [id, deps] of dependencies) {
			for (const dep of deps) {
				adjList.get(dep)?.add(id);
				const currentDegree = inDegree.get(id) || 0;
				inDegree.set(id, currentDegree + 1);
			}
		}

		// Queue for scenarios with no dependencies
		const queue: string[] = [];
		for (const [id, degree] of inDegree) {
			if (degree === 0) {
				queue.push(id);
			}
		}

		// Process queue
		const result: string[] = [];
		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) break;
			result.push(current);

			// Reduce in-degree for dependents
			const dependents = adjList.get(current);
			if (!dependents) continue;
			for (const dependent of dependents) {
				const currentDegree = inDegree.get(dependent) || 0;
				const newDegree = currentDegree - 1;
				inDegree.set(dependent, newDegree);
				if (newDegree === 0) {
					queue.push(dependent);
				}
			}
		}

		// Check if all scenarios were processed (no cycles)
		if (result.length !== allScenarios.size) {
			throw new Error(
				"Circular dependency detected in scenario execution order",
			);
		}

		return result;
	}

	/**
	 * Collect all types (node, edge, semantic tags) for a scenario including extends chain
	 *
	 * @param scenarioId - Scenario to collect types for
	 * @returns TypeCollection with all types
	 */
	collectTypes(scenarioId: string): TypeCollection {
		const spec = this.scenarios.get(scenarioId);
		if (!spec) {
			throw new Error(`Scenario '${scenarioId}' not found`);
		}

		const nodeTypes = new Set<string>();
		const edgeTypes = new Set<string>();
		const semanticTags = new Set<string>();

		// Recursive collection from extends chain
		const collectFromSpec = (id: string) => {
			const currentSpec = this.scenarios.get(id);
			if (!currentSpec) {
				return;
			}

			// Collect types from this spec
			for (const nodeType of currentSpec.nodeTypes) {
				nodeTypes.add(nodeType.name);
			}

			for (const edgeType of currentSpec.edgeTypes) {
				edgeTypes.add(edgeType.name);
			}

			if (currentSpec.semanticTags) {
				for (const tag of currentSpec.semanticTags) {
					semanticTags.add(tag.name);
				}
			}

			// Recursively collect from extends
			if (currentSpec.extends) {
				for (const extendId of currentSpec.extends) {
					collectFromSpec(extendId);
				}
			}
		};

		collectFromSpec(scenarioId);

		return {
			nodeTypes,
			edgeTypes,
			semanticTags,
		};
	}

	// Edge type registration will be implemented when integrating with EdgeTypeRegistry

	/**
	 * Validate type conflicts across scenarios
	 *
	 * Checks that edge types with the same name have consistent properties.
	 */
	validateTypeConsistency(): ScenarioValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Track edge types and their properties
		const edgeTypeMap = new Map<
			string,
			{
				scenarioId: string;
				isTransitive?: boolean;
				isInheritable?: boolean;
				isHierarchical?: boolean;
			}
		>();

		for (const spec of this.scenarios.values()) {
			for (const edgeType of spec.edgeTypes) {
				const existing = edgeTypeMap.get(edgeType.name);

				if (existing) {
					// Check for conflicts
					if (
						existing.isTransitive !== edgeType.isTransitive ||
						existing.isInheritable !== edgeType.isInheritable ||
						existing.isHierarchical !== edgeType.isHierarchical
					) {
						errors.push(
							`Edge type '${edgeType.name}' has conflicting properties between scenarios '${existing.scenarioId}' and '${spec.id}'`,
						);
					}
				} else {
					edgeTypeMap.set(edgeType.name, {
						scenarioId: spec.id,
						isTransitive: edgeType.isTransitive,
						isInheritable: edgeType.isInheritable,
						isHierarchical: edgeType.isHierarchical,
					});
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Clear all registered scenarios (useful for testing)
	 */
	clear(): void {
		this.scenarios.clear();
	}
}
