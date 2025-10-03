/**
 * Scenario Registry Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { ScenarioRegistry } from "../src/scenarios/ScenarioRegistry";
import type { ScenarioSpec } from "../src/scenarios/types";

describe("ScenarioRegistry", () => {
	let registry: ScenarioRegistry;

	beforeEach(() => {
		registry = new ScenarioRegistry();
	});

	describe("register", () => {
		it("should register a valid scenario", () => {
			const spec: ScenarioSpec = {
				id: "basic-structure",
				name: "Basic Structure",
				description: "Basic code structure",
				version: "1.0.0",
				nodeTypes: [{ name: "file", description: "File" }],
				edgeTypes: [{ name: "contains", description: "Contains" }],
				analyzer: { className: "BasicAnalyzer" },
			};

			expect(() => registry.register(spec)).not.toThrow();
			expect(registry.has("basic-structure")).toBe(true);
		});

		it("should reject invalid scenario spec", () => {
			const invalidSpec = {
				id: "invalid",
				name: "Invalid",
				description: "Test",
				version: "invalid-version", // Invalid
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			} as ScenarioSpec;

			expect(() => registry.register(invalidSpec)).toThrow();
		});

		it("should reject duplicate scenario ID", () => {
			const spec: ScenarioSpec = {
				id: "test-scenario",
				name: "Test",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			registry.register(spec);
			expect(() => registry.register(spec)).toThrow(/already registered/);
		});

		it("should reject scenario with undefined extends dependency", () => {
			const spec: ScenarioSpec = {
				id: "child-scenario",
				name: "Child",
				description: "Test",
				version: "1.0.0",
				extends: ["non-existent"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			expect(() => registry.register(spec)).toThrow(/extends undefined scenario/);
		});

		it("should reject scenario with undefined requires dependency", () => {
			const spec: ScenarioSpec = {
				id: "child-scenario",
				name: "Child",
				description: "Test",
				version: "1.0.0",
				requires: ["non-existent"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			expect(() => registry.register(spec)).toThrow(
				/requires undefined scenario/,
			);
		});

		it("should reject circular extends dependency", () => {
			// Register a → b → c chain first
			registry.register({
				id: "scenario-a",
				name: "Scenario A",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			registry.register({
				id: "scenario-b",
				name: "Scenario B",
				description: "Test",
				version: "1.0.0",
				extends: ["scenario-a"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			registry.register({
				id: "scenario-c",
				name: "Scenario C",
				description: "Test",
				version: "1.0.0",
				extends: ["scenario-b"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			// Now try to register scenario-d that extends c and is extended by a
			// This would create a circular dependency if we could update a
			const spec_circular: ScenarioSpec = {
				id: "scenario-d",
				name: "Scenario D",
				description: "Test",
				version: "1.0.0",
				extends: ["scenario-c", "scenario-a"], // This creates a → b → c → d → a
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			// To create circular dependency, we'd need scenario-a to extend scenario-d
			// But we can't modify scenario-a after registration
			// So let's create a direct circular: a → b, b → a
			registry.clear();

			registry.register({
				id: "scenario-x",
				name: "Scenario X",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			registry.register({
				id: "scenario-y",
				name: "Scenario Y",
				description: "Test",
				version: "1.0.0",
				extends: ["scenario-x"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			// Try to register scenario-z that extends y, and scenario-x extends z
			// But this requires scenario-x to be modified which we can't do
			// Instead, let's use the detectCircularDependencies directly
			const circularSpec: ScenarioSpec = {
				id: "scenario-z",
				name: "Scenario Z",
				description: "Test",
				version: "1.0.0",
				extends: ["scenario-y"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			// Manually create a circular reference for testing
			const tempRegistry = new ScenarioRegistry();
			tempRegistry.register({
				id: "a",
				name: "A",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			tempRegistry.register({
				id: "b",
				name: "B",
				description: "Test",
				version: "1.0.0",
				extends: ["a"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			// Manually inject circular dependency
			const circularA: ScenarioSpec = {
				id: "a",
				name: "A",
				description: "Test",
				version: "1.0.0",
				extends: ["b"], // Creates a → b → a
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			// This should be caught by circular dependency detection
			(tempRegistry as any).scenarios.set("a", circularA);

			const circularC: ScenarioSpec = {
				id: "c",
				name: "C",
				description: "Test",
				version: "1.0.0",
				extends: ["a"],
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			// Circular detection happens during registration
			expect(() => tempRegistry.register(circularC)).toThrow(/Circular dependency/);
		});

		// EdgeTypeRegistry integration tests will be added later
		it.skip("should register edge types with EdgeTypeRegistry", () => {
			// TODO: Implement after EdgeTypeRegistry integration
		});

		it.skip("should reject conflicting edge type properties", () => {
			// TODO: Implement after EdgeTypeRegistry integration
		});
	});

	describe("get, has, list", () => {
		it("should retrieve registered scenario", () => {
			const spec: ScenarioSpec = {
				id: "test-scenario",
				name: "Test",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			};

			registry.register(spec);

			expect(registry.get("test-scenario")).toEqual(spec);
			expect(registry.has("test-scenario")).toBe(true);
			expect(registry.list()).toHaveLength(1);
			expect(registry.list()[0]).toEqual(spec);
		});

		it("should return undefined for non-existent scenario", () => {
			expect(registry.get("non-existent")).toBeUndefined();
			expect(registry.has("non-existent")).toBe(false);
		});
	});

	describe("getExecutionOrder", () => {
		beforeEach(() => {
			// Register scenario hierarchy:
			// basic-structure (no deps)
			// file-dependency (extends: basic-structure)
			// symbol-dependency (extends: basic-structure)
			// react-component (extends: [basic-structure, file-dependency], requires: [symbol-dependency])

			registry.register({
				id: "basic-structure",
				name: "Basic Structure",
				description: "Basic",
				version: "1.0.0",
				nodeTypes: [{ name: "file", description: "File" }],
				edgeTypes: [{ name: "contains", description: "Contains" }],
				analyzer: { className: "BasicAnalyzer" },
			});

			registry.register({
				id: "file-dependency",
				name: "File Dependency",
				description: "File deps",
				version: "1.0.0",
				extends: ["basic-structure"],
				nodeTypes: [{ name: "library", description: "Library" }],
				edgeTypes: [{ name: "imports", description: "Imports" }],
				analyzer: { className: "FileAnalyzer" },
			});

			registry.register({
				id: "symbol-dependency",
				name: "Symbol Dependency",
				description: "Symbol deps",
				version: "1.0.0",
				extends: ["basic-structure"],
				nodeTypes: [{ name: "symbol", description: "Symbol" }],
				edgeTypes: [{ name: "calls", description: "Calls" }],
				analyzer: { className: "SymbolAnalyzer" },
			});

			registry.register({
				id: "react-component",
				name: "React Component",
				description: "React analysis",
				version: "1.0.0",
				extends: ["basic-structure", "file-dependency"],
				requires: ["symbol-dependency"],
				nodeTypes: [{ name: "jsx-component", description: "JSX" }],
				edgeTypes: [{ name: "renders", description: "Renders" }],
				analyzer: { className: "ReactAnalyzer" },
			});
		});

		it("should return single scenario with no dependencies", () => {
			const order = registry.getExecutionOrder(["basic-structure"]);
			expect(order).toEqual(["basic-structure"]);
		});

		it("should resolve extends dependencies", () => {
			const order = registry.getExecutionOrder(["file-dependency"]);
			expect(order).toEqual(["basic-structure", "file-dependency"]);
		});

		it("should resolve complex dependency graph", () => {
			const order = registry.getExecutionOrder(["react-component"]);

			// Verify basic-structure comes before all others
			expect(order.indexOf("basic-structure")).toBeLessThan(
				order.indexOf("file-dependency"),
			);
			expect(order.indexOf("basic-structure")).toBeLessThan(
				order.indexOf("symbol-dependency"),
			);
			expect(order.indexOf("basic-structure")).toBeLessThan(
				order.indexOf("react-component"),
			);

			// Verify file-dependency and symbol-dependency come before react-component
			expect(order.indexOf("file-dependency")).toBeLessThan(
				order.indexOf("react-component"),
			);
			expect(order.indexOf("symbol-dependency")).toBeLessThan(
				order.indexOf("react-component"),
			);

			// All 4 scenarios should be included
			expect(order).toHaveLength(4);
		});

		it("should handle multiple requested scenarios", () => {
			const order = registry.getExecutionOrder([
				"file-dependency",
				"symbol-dependency",
			]);

			expect(order).toContain("basic-structure");
			expect(order).toContain("file-dependency");
			expect(order).toContain("symbol-dependency");
			expect(order.indexOf("basic-structure")).toBe(0); // Should be first
		});

		it("should throw for non-existent scenario", () => {
			expect(() => registry.getExecutionOrder(["non-existent"])).toThrow(
				/not found in registry/,
			);
		});
	});

	describe("collectTypes", () => {
		beforeEach(() => {
			registry.register({
				id: "basic-structure",
				name: "Basic Structure",
				description: "Basic",
				version: "1.0.0",
				nodeTypes: [
					{ name: "file", description: "File" },
					{ name: "class", description: "Class" },
				],
				edgeTypes: [{ name: "contains", description: "Contains" }],
				semanticTags: [
					{
						name: "structural",
						category: "type",
						description: "Structural element",
					},
				],
				analyzer: { className: "BasicAnalyzer" },
			});

			registry.register({
				id: "file-dependency",
				name: "File Dependency",
				description: "File deps",
				version: "1.0.0",
				extends: ["basic-structure"],
				nodeTypes: [{ name: "library", description: "Library" }],
				edgeTypes: [
					{ name: "imports", description: "Imports" },
					{ name: "depends_on", description: "Depends on" },
				],
				semanticTags: [
					{
						name: "dependency",
						category: "type",
						description: "Dependency element",
					},
				],
				analyzer: { className: "FileAnalyzer" },
			});
		});

		it("should collect types from single scenario", () => {
			const types = registry.collectTypes("basic-structure");

			expect(types.nodeTypes.has("file")).toBe(true);
			expect(types.nodeTypes.has("class")).toBe(true);
			expect(types.edgeTypes.has("contains")).toBe(true);
			expect(types.semanticTags.has("structural")).toBe(true);
		});

		it("should collect types from extends chain", () => {
			const types = registry.collectTypes("file-dependency");

			// Types from basic-structure
			expect(types.nodeTypes.has("file")).toBe(true);
			expect(types.nodeTypes.has("class")).toBe(true);
			expect(types.edgeTypes.has("contains")).toBe(true);
			expect(types.semanticTags.has("structural")).toBe(true);

			// Types from file-dependency
			expect(types.nodeTypes.has("library")).toBe(true);
			expect(types.edgeTypes.has("imports")).toBe(true);
			expect(types.edgeTypes.has("depends_on")).toBe(true);
			expect(types.semanticTags.has("dependency")).toBe(true);
		});

		it("should throw for non-existent scenario", () => {
			expect(() => registry.collectTypes("non-existent")).toThrow(
				/not found/,
			);
		});
	});

	describe("validateTypeConsistency", () => {
		it("should pass for consistent edge types", () => {
			registry.register({
				id: "scenario-1",
				name: "Scenario 1",
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
			});

			registry.register({
				id: "scenario-2",
				name: "Scenario 2",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "shared-edge",
						description: "Edge",
						isTransitive: true, // Same
					},
				],
				analyzer: { className: "TestAnalyzer" },
			});

			const result = registry.validateTypeConsistency();
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect conflicting edge type properties", () => {
			// Manually add scenarios with conflicting edge types
			const spec1: ScenarioSpec = {
				id: "scenario-1",
				name: "Scenario 1",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "conflict-edge",
						description: "Edge",
						isTransitive: true,
					},
				],
				analyzer: { className: "TestAnalyzer" },
			};

			const spec2: ScenarioSpec = {
				id: "scenario-2",
				name: "Scenario 2",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [
					{
						name: "conflict-edge",
						description: "Edge",
						isTransitive: false, // Conflicting property
					},
				],
				analyzer: { className: "TestAnalyzer" },
			};

			// Use reflection to add without validation for testing
			(registry as any).scenarios.set(spec1.id, spec1);
			(registry as any).scenarios.set(spec2.id, spec2);

			const result = registry.validateTypeConsistency();
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("conflicting properties");
		});
	});

	describe("clear", () => {
		it("should clear all registered scenarios", () => {
			registry.register({
				id: "test-scenario",
				name: "Test",
				description: "Test",
				version: "1.0.0",
				nodeTypes: [],
				edgeTypes: [],
				analyzer: { className: "TestAnalyzer" },
			});

			expect(registry.list()).toHaveLength(1);

			registry.clear();

			expect(registry.list()).toHaveLength(0);
			expect(registry.has("test-scenario")).toBe(false);
		});
	});
});
