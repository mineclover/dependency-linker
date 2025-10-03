/**
 * Scenario System - Type Definitions Tests
 */

import { describe, it, expect } from "@jest/globals";
import type {
	ScenarioSpec,
	NodeTypeSpec,
	EdgeTypeSpec,
} from "../src/scenarios/types";
import {
	isValidVersion,
	isValidScenarioId,
	validateNodeTypeSpec,
	validateEdgeTypeSpec,
	validateScenarioSpec,
	detectCircularDependencies,
} from "../src/scenarios/validation";

describe("Scenario Type Validation", () => {
	describe("isValidVersion", () => {
		it("should accept valid semantic versions", () => {
			expect(isValidVersion("1.0.0")).toBe(true);
			expect(isValidVersion("0.1.0")).toBe(true);
			expect(isValidVersion("10.20.30")).toBe(true);
		});

		it("should reject invalid versions", () => {
			expect(isValidVersion("1.0")).toBe(false);
			expect(isValidVersion("v1.0.0")).toBe(false);
			expect(isValidVersion("1.0.0-alpha")).toBe(false);
			expect(isValidVersion("invalid")).toBe(false);
		});
	});

	describe("isValidScenarioId", () => {
		it("should accept valid scenario IDs", () => {
			expect(isValidScenarioId("react-component")).toBe(true);
			expect(isValidScenarioId("file-dependency")).toBe(true);
			expect(isValidScenarioId("basic-structure")).toBe(true);
			expect(isValidScenarioId("markdown-linking")).toBe(true);
		});

		it("should reject invalid scenario IDs", () => {
			expect(isValidScenarioId("ReactComponent")).toBe(false); // uppercase
			expect(isValidScenarioId("react_component")).toBe(false); // underscore
			expect(isValidScenarioId("123-component")).toBe(false); // starts with number
			expect(isValidScenarioId("react component")).toBe(false); // space
		});
	});

	describe("validateNodeTypeSpec", () => {
		it("should validate correct NodeTypeSpec", () => {
			const validSpec: NodeTypeSpec = {
				name: "file",
				description: "Source code file",
			};

			const result = validateNodeTypeSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate NodeTypeSpec with defaultProperties", () => {
			const validSpec: NodeTypeSpec = {
				name: "class",
				description: "Class definition",
				defaultProperties: {
					visibility: "public",
				},
			};

			const result = validateNodeTypeSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject NodeTypeSpec without name", () => {
			const invalidSpec = {
				description: "Missing name",
			} as unknown as NodeTypeSpec;

			const result = validateNodeTypeSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should reject NodeTypeSpec without description", () => {
			const invalidSpec = {
				name: "file",
			} as unknown as NodeTypeSpec;

			const result = validateNodeTypeSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should reject invalid defaultProperties", () => {
			const invalidSpec = {
				name: "file",
				description: "Source code file",
				defaultProperties: "invalid" as any,
			};

			const result = validateNodeTypeSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"NodeTypeSpec: defaultProperties must be an object",
			);
		});
	});

	describe("validateEdgeTypeSpec", () => {
		it("should validate correct EdgeTypeSpec", () => {
			const validSpec: EdgeTypeSpec = {
				name: "imports",
				description: "Import relationship",
			};

			const result = validateEdgeTypeSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate EdgeTypeSpec with all properties", () => {
			const validSpec: EdgeTypeSpec = {
				name: "imports_file",
				description: "Import file relationship",
				parent: "depends_on",
				isTransitive: true,
				isInheritable: false,
				isHierarchical: false,
			};

			const result = validateEdgeTypeSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject EdgeTypeSpec without name", () => {
			const invalidSpec = {
				description: "Missing name",
			} as unknown as EdgeTypeSpec;

			const result = validateEdgeTypeSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should reject invalid boolean properties", () => {
			const invalidSpec = {
				name: "imports",
				description: "Import relationship",
				isTransitive: "true" as any,
			};

			const result = validateEdgeTypeSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain(
				"EdgeTypeSpec: isTransitive must be a boolean",
			);
		});
	});

	describe("validateScenarioSpec", () => {
		it("should validate complete valid ScenarioSpec", () => {
			const validSpec: ScenarioSpec = {
				id: "basic-structure",
				name: "Basic Code Structure",
				description: "Extracts basic code structure elements",
				version: "1.0.0",
				nodeTypes: [
					{ name: "file", description: "Source code file" },
					{ name: "class", description: "Class definition" },
				],
				edgeTypes: [
					{ name: "contains", description: "Containment relationship" },
				],
				analyzer: {
					className: "BasicStructureAnalyzer",
				},
			};

			const result = validateScenarioSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate ScenarioSpec with extends and requires", () => {
			const validSpec: ScenarioSpec = {
				id: "react-component",
				name: "React Component Analysis",
				description: "Analyzes React components",
				version: "1.0.0",
				extends: ["basic-structure", "file-dependency"],
				requires: ["symbol-dependency"],
				nodeTypes: [{ name: "jsx-component", description: "JSX component" }],
				edgeTypes: [{ name: "renders", description: "Renders relationship" }],
				analyzer: {
					className: "ReactDependencyAnalyzer",
					config: {
						detectPropsDrilling: true,
					},
				},
			};

			const result = validateScenarioSpec(validSpec);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject ScenarioSpec without id", () => {
			const invalidSpec = {
				name: "Test Scenario",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			} as unknown as ScenarioSpec;

			const result = validateScenarioSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes("id is required"))).toBe(
				true,
			);
		});

		it("should reject ScenarioSpec with invalid version", () => {
			const invalidSpec: ScenarioSpec = {
				id: "test-scenario",
				name: "Test Scenario",
				description: "Test",
				version: "1.0", // Invalid version
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			const result = validateScenarioSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes("semantic versioning")),
			).toBe(true);
		});

		it("should detect duplicate node type names", () => {
			const invalidSpec: ScenarioSpec = {
				id: "test-scenario",
				name: "Test Scenario",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [
					{ name: "file", description: "File 1" },
					{ name: "file", description: "File 2" }, // Duplicate
				],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			const result = validateScenarioSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes("duplicate node type names")),
			).toBe(true);
		});

		it("should detect duplicate edge type names", () => {
			const invalidSpec: ScenarioSpec = {
				id: "test-scenario",
				name: "Test Scenario",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{ name: "imports", description: "Import 1" },
					{ name: "imports", description: "Import 2" }, // Duplicate
				],
				analyzer: { className: "TestAnalyzer" },
			};

			const result = validateScenarioSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes("duplicate edge type names")),
			).toBe(true);
		});

		it("should warn about undefined parent edge types", () => {
			const specWithWarning: ScenarioSpec = {
				id: "test-scenario",
				name: "Test Scenario",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "imports_file",
						description: "Import file",
						parent: "depends_on", // Parent not defined in this scenario
					},
				],
				analyzer: { className: "TestAnalyzer" },
			};

			const result = validateScenarioSpec(specWithWarning);
			expect(result.valid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(
				result.warnings.some((w) => w.includes("undefined parent")),
			).toBe(true);
		});

		it("should reject ScenarioSpec without analyzer", () => {
			const invalidSpec = {
				id: "test-scenario",
				name: "Test Scenario",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
			} as unknown as ScenarioSpec;

			const result = validateScenarioSpec(invalidSpec);
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.includes("analyzer is required")),
			).toBe(true);
		});
	});

	describe("detectCircularDependencies", () => {
		it("should detect direct circular dependency", () => {
			const specs = new Map<string, ScenarioSpec>([
				[
					"scenario-a",
					{
						id: "scenario-a",
						name: "Scenario A",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-b"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-b",
					{
						id: "scenario-b",
						name: "Scenario B",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-a"], // Circular
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
			]);

			const result = detectCircularDependencies("scenario-a", specs);
			expect(result).not.toBeNull();
			expect(result).toContain("Circular dependency detected");
		});

		it("should detect indirect circular dependency", () => {
			const specs = new Map<string, ScenarioSpec>([
				[
					"scenario-a",
					{
						id: "scenario-a",
						name: "Scenario A",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-b"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-b",
					{
						id: "scenario-b",
						name: "Scenario B",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-c"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-c",
					{
						id: "scenario-c",
						name: "Scenario C",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-a"], // Circular
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
			]);

			const result = detectCircularDependencies("scenario-a", specs);
			expect(result).not.toBeNull();
			expect(result).toContain("Circular dependency detected");
		});

		it("should not detect circular dependency in valid chain", () => {
			const specs = new Map<string, ScenarioSpec>([
				[
					"scenario-a",
					{
						id: "scenario-a",
						name: "Scenario A",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-b"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-b",
					{
						id: "scenario-b",
						name: "Scenario B",
						description: "Test",
						version: "1.0.0",
						extends: ["scenario-c"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-c",
					{
						id: "scenario-c",
						name: "Scenario C",
						description: "Test",
						version: "1.0.0",
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
			]);

			const result = detectCircularDependencies("scenario-a", specs);
			expect(result).toBeNull();
		});

		it("should handle requires dependencies for circular detection", () => {
			const specs = new Map<string, ScenarioSpec>([
				[
					"scenario-a",
					{
						id: "scenario-a",
						name: "Scenario A",
						description: "Test",
						version: "1.0.0",
						requires: ["scenario-b"],
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
				[
					"scenario-b",
					{
						id: "scenario-b",
						name: "Scenario B",
						description: "Test",
						version: "1.0.0",
						requires: ["scenario-a"], // Circular
						nodeTypes: [],
						edgeTypes: [],
						analyzer: { className: "TestAnalyzer" },
					},
				],
			]);

			const result = detectCircularDependencies("scenario-a", specs);
			expect(result).not.toBeNull();
			expect(result).toContain("Circular dependency detected");
		});
	});
});
