/**
 * Global Scenario Registry Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
	globalScenarioRegistry,
	getScenario,
	hasScenario,
	listScenarios,
	getExecutionOrder,
	collectTypes,
	validateTypeConsistency,
	registerScenario,
	isBuiltinScenario,
	resetGlobalRegistry,
	reinitializeBuiltinScenarios,
	BUILTIN_SCENARIOS,
	type ScenarioSpec,
} from "../src/scenarios";

describe("Global Scenario Registry", () => {
	// Save original state
	const originalScenarios = listScenarios();

	afterEach(() => {
		// Restore to original state after each test
		resetGlobalRegistry();
		reinitializeBuiltinScenarios();
	});

	describe("Initialization", () => {
		it("should auto-initialize with built-in scenarios", () => {
			expect(hasScenario("basic-structure")).toBe(true);
			expect(hasScenario("file-dependency")).toBe(true);
			expect(hasScenario("symbol-dependency")).toBe(true);
			expect(hasScenario("markdown-linking")).toBe(true);
		});

		it("should have all built-in scenarios in correct order", () => {
			const scenarios = listScenarios();

			expect(scenarios).toHaveLength(4);
			expect(scenarios.map((s) => s.id)).toEqual([
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
				"markdown-linking",
			]);
		});
	});

	describe("Convenience Functions", () => {
		it("should get scenario by ID", () => {
			const scenario = getScenario("basic-structure");

			expect(scenario).toBeDefined();
			expect(scenario?.id).toBe("basic-structure");
		});

		it("should check scenario existence", () => {
			expect(hasScenario("basic-structure")).toBe(true);
			expect(hasScenario("non-existent")).toBe(false);
		});

		it("should list all scenarios", () => {
			const scenarios = listScenarios();

			expect(scenarios).toHaveLength(4);
			expect(scenarios.every((s) => s.id && s.name && s.version)).toBe(true);
		});

		it("should get execution order", () => {
			const order = getExecutionOrder(["file-dependency"]);

			expect(order).toEqual(["basic-structure", "file-dependency"]);
		});

		it("should collect types with inheritance", () => {
			const types = collectTypes("file-dependency");

			// From basic-structure
			expect(types.nodeTypes.has("file")).toBe(true);
			// From file-dependency
			expect(types.nodeTypes.has("library")).toBe(true);
		});

		it("should validate type consistency", () => {
			const result = validateTypeConsistency();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("Custom Scenario Registration", () => {
		it("should register custom scenario", () => {
			const customSpec: ScenarioSpec = {
				id: "custom-scenario",
				name: "Custom Scenario",
				description: "Test custom scenario",
				version: "1.0.0",
				extends: ["basic-structure"],
				nodeTypes: [{ name: "custom-node", description: "Custom node" }],
				edgeTypes: [{ name: "custom-edge", description: "Custom edge" }],
				analyzer: { className: "CustomAnalyzer" },
			};

			registerScenario(customSpec);

			expect(hasScenario("custom-scenario")).toBe(true);
			expect(listScenarios()).toHaveLength(5);
		});

		it("should inherit types from parent in custom scenario", () => {
			const customSpec: ScenarioSpec = {
				id: "custom-scenario",
				name: "Custom Scenario",
				description: "Test custom scenario",
				version: "1.0.0",
				extends: ["file-dependency"],
				nodeTypes: [{ name: "custom-node", description: "Custom node" }],
				edgeTypes: [{ name: "custom-edge", description: "Custom edge" }],
				analyzer: { className: "CustomAnalyzer" },
			};

			registerScenario(customSpec);

			const types = collectTypes("custom-scenario");

			// From basic-structure (via file-dependency)
			expect(types.nodeTypes.has("file")).toBe(true);
			// From file-dependency
			expect(types.nodeTypes.has("library")).toBe(true);
			// From custom-scenario
			expect(types.nodeTypes.has("custom-node")).toBe(true);
		});

		it("should reject duplicate scenario ID", () => {
			const duplicateSpec: ScenarioSpec = {
				id: "basic-structure", // Duplicate
				name: "Duplicate",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			expect(() => registerScenario(duplicateSpec)).toThrow(/already registered/);
		});
	});

	describe("Built-in Scenario Detection", () => {
		it("should detect built-in scenarios", () => {
			expect(isBuiltinScenario("basic-structure")).toBe(true);
			expect(isBuiltinScenario("file-dependency")).toBe(true);
			expect(isBuiltinScenario("symbol-dependency")).toBe(true);
			expect(isBuiltinScenario("markdown-linking")).toBe(true);
		});

		it("should detect non-built-in scenarios", () => {
			expect(isBuiltinScenario("custom-scenario")).toBe(false);
			expect(isBuiltinScenario("non-existent")).toBe(false);
		});
	});

	describe("Registry Management", () => {
		it("should reset global registry", () => {
			resetGlobalRegistry();

			expect(listScenarios()).toHaveLength(0);
			expect(hasScenario("basic-structure")).toBe(false);
		});

		it("should reinitialize built-in scenarios", () => {
			resetGlobalRegistry();
			expect(listScenarios()).toHaveLength(0);

			reinitializeBuiltinScenarios();

			expect(listScenarios()).toHaveLength(4);
			expect(hasScenario("basic-structure")).toBe(true);
		});

		it("should maintain registry state across operations", () => {
			const customSpec: ScenarioSpec = {
				id: "custom-scenario",
				name: "Custom Scenario",
				description: "Test custom scenario",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "CustomAnalyzer" },
			};

			registerScenario(customSpec);

			// Verify custom scenario persists
			expect(hasScenario("custom-scenario")).toBe(true);

			// Verify built-ins still exist
			expect(hasScenario("basic-structure")).toBe(true);

			// Total should be 5
			expect(listScenarios()).toHaveLength(5);
		});
	});

	describe("Complex Execution Order", () => {
		it("should resolve complex multi-scenario execution order", () => {
			const order = getExecutionOrder([
				"file-dependency",
				"symbol-dependency",
				"markdown-linking",
			]);

			// basic-structure should be first
			expect(order[0]).toBe("basic-structure");

			// All scenarios should be included
			expect(order).toContain("file-dependency");
			expect(order).toContain("symbol-dependency");
			expect(order).toContain("markdown-linking");

			// Total should be 4 (3 requested + 1 dependency)
			expect(order).toHaveLength(4);
		});
	});

	describe("Type Consistency Validation", () => {
		it("should pass validation for built-in scenarios", () => {
			const result = validateTypeConsistency();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect conflicts with custom scenarios", () => {
			// Register scenario with conflicting edge type properties
			const conflictSpec1: ScenarioSpec = {
				id: "conflict-1",
				name: "Conflict 1",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "shared-edge",
						description: "Edge",
						isTransitive: true,
					},
				],
				analyzer: { className: "TestAnalyzer" },
			};

			const conflictSpec2: ScenarioSpec = {
				id: "conflict-2",
				name: "Conflict 2",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "shared-edge",
						description: "Edge",
						isTransitive: false, // Conflict
					},
				],
				analyzer: { className: "TestAnalyzer" },
			};

			// Use reflection to bypass validation during registration
			(globalScenarioRegistry as any).scenarios.set(
				conflictSpec1.id,
				conflictSpec1,
			);
			(globalScenarioRegistry as any).scenarios.set(
				conflictSpec2.id,
				conflictSpec2,
			);

			const result = validateTypeConsistency();

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});
