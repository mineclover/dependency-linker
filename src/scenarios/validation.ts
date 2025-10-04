/**
 * Scenario Validation Utilities
 *
 * Provides validation functions for scenario specifications.
 */

import type {
	ScenarioSpec,
	NodeTypeSpec,
	EdgeTypeSpec,
	ScenarioValidationResult,
} from "./types";

/**
 * Validate semantic version format (major.minor.patch)
 */
export function isValidVersion(version: string): boolean {
	const versionRegex = /^\d+\.\d+\.\d+$/;
	return versionRegex.test(version);
}

/**
 * Validate scenario ID format (lowercase, hyphens allowed)
 */
export function isValidScenarioId(id: string): boolean {
	const idRegex = /^[a-z][a-z0-9-]*$/;
	return idRegex.test(id);
}

/**
 * Validate NodeTypeSpec
 */
export function validateNodeTypeSpec(spec: NodeTypeSpec): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!spec.name || typeof spec.name !== "string") {
		errors.push("NodeTypeSpec: name is required and must be a string");
	}

	if (!spec.description || typeof spec.description !== "string") {
		errors.push("NodeTypeSpec: description is required and must be a string");
	}

	if (spec.defaultProperties !== undefined) {
		if (
			typeof spec.defaultProperties !== "object" ||
			spec.defaultProperties === null ||
			Array.isArray(spec.defaultProperties)
		) {
			errors.push("NodeTypeSpec: defaultProperties must be an object");
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate EdgeTypeSpec
 */
export function validateEdgeTypeSpec(spec: EdgeTypeSpec): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!spec.name || typeof spec.name !== "string") {
		errors.push("EdgeTypeSpec: name is required and must be a string");
	}

	if (!spec.description || typeof spec.description !== "string") {
		errors.push("EdgeTypeSpec: description is required and must be a string");
	}

	if (spec.parent !== undefined && typeof spec.parent !== "string") {
		errors.push("EdgeTypeSpec: parent must be a string");
	}

	if (
		spec.isTransitive !== undefined &&
		typeof spec.isTransitive !== "boolean"
	) {
		errors.push("EdgeTypeSpec: isTransitive must be a boolean");
	}

	if (
		spec.isInheritable !== undefined &&
		typeof spec.isInheritable !== "boolean"
	) {
		errors.push("EdgeTypeSpec: isInheritable must be a boolean");
	}

	if (
		spec.isHierarchical !== undefined &&
		typeof spec.isHierarchical !== "boolean"
	) {
		errors.push("EdgeTypeSpec: isHierarchical must be a boolean");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate ScenarioSpec
 */
export function validateScenarioSpec(
	spec: ScenarioSpec,
): ScenarioValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// ===== Identity Validation =====

	if (!spec.id || typeof spec.id !== "string") {
		errors.push("ScenarioSpec: id is required and must be a string");
	} else if (!isValidScenarioId(spec.id)) {
		errors.push(
			"ScenarioSpec: id must be lowercase with hyphens (e.g., 'react-component')",
		);
	}

	if (!spec.name || typeof spec.name !== "string") {
		errors.push("ScenarioSpec: name is required and must be a string");
	}

	if (!spec.description || typeof spec.description !== "string") {
		errors.push("ScenarioSpec: description is required and must be a string");
	}

	if (!spec.version || typeof spec.version !== "string") {
		errors.push("ScenarioSpec: version is required and must be a string");
	} else if (!isValidVersion(spec.version)) {
		errors.push(
			"ScenarioSpec: version must follow semantic versioning (e.g., '1.0.0')",
		);
	}

	// ===== Dependencies Validation =====

	if (spec.extends !== undefined) {
		if (!Array.isArray(spec.extends)) {
			errors.push("ScenarioSpec: extends must be an array");
		} else {
			for (const extendId of spec.extends) {
				if (typeof extendId !== "string") {
					errors.push("ScenarioSpec: extends array must contain only strings");
					break;
				}
			}
		}
	}

	if (spec.requires !== undefined) {
		if (!Array.isArray(spec.requires)) {
			errors.push("ScenarioSpec: requires must be an array");
		} else {
			for (const requireId of spec.requires) {
				if (typeof requireId !== "string") {
					errors.push("ScenarioSpec: requires array must contain only strings");
					break;
				}
			}
		}
	}

	// ===== Type Specifications Validation =====

	if (!Array.isArray(spec.nodeTypes)) {
		errors.push("ScenarioSpec: nodeTypes is required and must be an array");
	} else {
		for (const nodeType of spec.nodeTypes) {
			const nodeValidation = validateNodeTypeSpec(nodeType);
			if (!nodeValidation.valid) {
				errors.push(...nodeValidation.errors);
			}
		}

		// Check for duplicate node type names
		const nodeTypeNames = spec.nodeTypes.map((n) => n.name);
		const duplicateNodeTypes = nodeTypeNames.filter(
			(name, index) => nodeTypeNames.indexOf(name) !== index,
		);
		if (duplicateNodeTypes.length > 0) {
			errors.push(
				`ScenarioSpec: duplicate node type names: ${duplicateNodeTypes.join(", ")}`,
			);
		}
	}

	if (!Array.isArray(spec.edgeTypes)) {
		errors.push("ScenarioSpec: edgeTypes is required and must be an array");
	} else {
		for (const edgeType of spec.edgeTypes) {
			const edgeValidation = validateEdgeTypeSpec(edgeType);
			if (!edgeValidation.valid) {
				errors.push(...edgeValidation.errors);
			}
		}

		// Check for duplicate edge type names
		const edgeTypeNames = spec.edgeTypes.map((e) => e.name);
		const duplicateEdgeTypes = edgeTypeNames.filter(
			(name, index) => edgeTypeNames.indexOf(name) !== index,
		);
		if (duplicateEdgeTypes.length > 0) {
			errors.push(
				`ScenarioSpec: duplicate edge type names: ${duplicateEdgeTypes.join(", ")}`,
			);
		}

		// Validate parent references
		for (const edgeType of spec.edgeTypes) {
			if (edgeType.parent && !edgeTypeNames.includes(edgeType.parent)) {
				warnings.push(
					`ScenarioSpec: edge type '${edgeType.name}' references undefined parent '${edgeType.parent}'`,
				);
			}
		}
	}

	// ===== Analyzer Validation =====

	if (!spec.analyzer || typeof spec.analyzer !== "object") {
		errors.push("ScenarioSpec: analyzer is required and must be an object");
	} else {
		if (
			!spec.analyzer.className ||
			typeof spec.analyzer.className !== "string"
		) {
			errors.push(
				"ScenarioSpec: analyzer.className is required and must be a string",
			);
		}

		if (
			spec.analyzer.config !== undefined &&
			(typeof spec.analyzer.config !== "object" ||
				spec.analyzer.config === null ||
				Array.isArray(spec.analyzer.config))
		) {
			errors.push("ScenarioSpec: analyzer.config must be an object");
		}
	}

	// ===== Warnings =====

	if (spec.nodeTypes.length === 0) {
		warnings.push(
			"ScenarioSpec: no node types defined (scenario won't create nodes)",
		);
	}

	if (spec.edgeTypes.length === 0) {
		warnings.push(
			"ScenarioSpec: no edge types defined (scenario won't create edges)",
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Check for circular dependencies in scenario extends chain
 */
export function detectCircularDependencies(
	scenarioId: string,
	specs: Map<string, ScenarioSpec>,
	visited: Set<string> = new Set(),
	chain: string[] = [],
): string | null {
	if (visited.has(scenarioId)) {
		// Found circular dependency
		const cycleStart = chain.indexOf(scenarioId);
		const cycle = [...chain.slice(cycleStart), scenarioId];
		return `Circular dependency detected: ${cycle.join(" → ")}`;
	}

	const spec = specs.get(scenarioId);
	if (!spec) {
		return null; // Scenario doesn't exist (will be caught by other validation)
	}

	visited.add(scenarioId);
	chain.push(scenarioId);

	// Check extends dependencies
	if (spec.extends) {
		for (const extendId of spec.extends) {
			const circularError = detectCircularDependencies(
				extendId,
				specs,
				new Set(visited),
				[...chain],
			);
			if (circularError) {
				return circularError;
			}
		}
	}

	// Check requires dependencies
	if (spec.requires) {
		for (const requireId of spec.requires) {
			const circularError = detectCircularDependencies(
				requireId,
				specs,
				new Set(visited),
				[...chain],
			);
			if (circularError) {
				return circularError;
			}
		}
	}

	return null;
}
