/**
 * Built-in Scenarios Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { ScenarioRegistry } from "../src/scenarios/ScenarioRegistry";
import {
	basicStructureSpec,
	fileDependencySpec,
	symbolDependencySpec,
	markdownLinkingSpec,
	methodAnalysisSpec,
	BUILTIN_SCENARIOS,
} from "../src/scenarios/builtin";

describe("Built-in Scenarios", () => {
	let registry: ScenarioRegistry;

	beforeEach(() => {
		registry = new ScenarioRegistry();
	});

	describe("Scenario Specifications", () => {
		it("should have valid basic-structure spec", () => {
			expect(() => registry.register(basicStructureSpec)).not.toThrow();
			expect(registry.has("basic-structure")).toBe(true);
		});

		it("should have valid file-dependency spec", () => {
			registry.register(basicStructureSpec); // Register parent first
			expect(() => registry.register(fileDependencySpec)).not.toThrow();
			expect(registry.has("file-dependency")).toBe(true);
		});

		it("should have valid symbol-dependency spec", () => {
			registry.register(basicStructureSpec); // Register parent first
			expect(() => registry.register(symbolDependencySpec)).not.toThrow();
			expect(registry.has("symbol-dependency")).toBe(true);
		});

		it("should have valid markdown-linking spec", () => {
			registry.register(basicStructureSpec); // Register parent first
			expect(() => registry.register(markdownLinkingSpec)).not.toThrow();
			expect(registry.has("markdown-linking")).toBe(true);
		});

		it("should have valid method-analysis spec", () => {
			registry.register(basicStructureSpec); // Register parent first
			registry.register(symbolDependencySpec); // Register parent first
			expect(() => registry.register(methodAnalysisSpec)).not.toThrow();
			expect(registry.has("method-analysis")).toBe(true);
		});
	});

	describe("Scenario Dependencies", () => {
		it("should register all scenarios in correct order", () => {
			// basic-structure has no dependencies
			registry.register(basicStructureSpec);

			// file-dependency extends basic-structure
			registry.register(fileDependencySpec);

			// symbol-dependency extends basic-structure
			registry.register(symbolDependencySpec);

			// markdown-linking extends basic-structure
			registry.register(markdownLinkingSpec);

			// method-analysis extends symbol-dependency
			registry.register(methodAnalysisSpec);

			expect(registry.list()).toHaveLength(5);
		});

		it("should resolve execution order for file-dependency", () => {
			registry.register(basicStructureSpec);
			registry.register(fileDependencySpec);

			const order = registry.getExecutionOrder(["file-dependency"]);

			expect(order).toEqual(["basic-structure", "file-dependency"]);
		});

		it("should resolve execution order for multiple scenarios", () => {
			registry.register(basicStructureSpec);
			registry.register(fileDependencySpec);
			registry.register(symbolDependencySpec);

			const order = registry.getExecutionOrder([
				"file-dependency",
				"symbol-dependency",
			]);

			expect(order).toContain("basic-structure");
			expect(order).toContain("file-dependency");
			expect(order).toContain("symbol-dependency");
			expect(order.indexOf("basic-structure")).toBe(0); // basic-structure first
		});
	});

	describe("Type Collections", () => {
		it("should collect types from basic-structure", () => {
			registry.register(basicStructureSpec);

			const types = registry.collectTypes("basic-structure");

			expect(types.nodeTypes.has("file")).toBe(true);
			expect(types.nodeTypes.has("directory")).toBe(true);
			expect(types.edgeTypes.has("contains")).toBe(true);
			expect(types.semanticTags.has("source")).toBe(true);
		});

		it("should inherit types from basic-structure in file-dependency", () => {
			registry.register(basicStructureSpec);
			registry.register(fileDependencySpec);

			const types = registry.collectTypes("file-dependency");

			// From basic-structure
			expect(types.nodeTypes.has("file")).toBe(true);
			expect(types.edgeTypes.has("contains")).toBe(true);

			// From file-dependency
			expect(types.nodeTypes.has("library")).toBe(true);
			expect(types.nodeTypes.has("module")).toBe(true);
			expect(types.edgeTypes.has("imports_file")).toBe(true);
			expect(types.edgeTypes.has("imports_library")).toBe(true);
		});

		it("should inherit types from basic-structure in symbol-dependency", () => {
			registry.register(basicStructureSpec);
			registry.register(symbolDependencySpec);

			const types = registry.collectTypes("symbol-dependency");

			// From basic-structure
			expect(types.nodeTypes.has("file")).toBe(true);

			// From symbol-dependency
			expect(types.nodeTypes.has("class")).toBe(true);
			expect(types.nodeTypes.has("function")).toBe(true);
			expect(types.edgeTypes.has("calls")).toBe(true);
			expect(types.edgeTypes.has("instantiates")).toBe(true);
		});

		it("should inherit types from basic-structure in markdown-linking", () => {
			registry.register(basicStructureSpec);
			registry.register(markdownLinkingSpec);

			const types = registry.collectTypes("markdown-linking");

			// From basic-structure
			expect(types.nodeTypes.has("file")).toBe(true);

			// From markdown-linking
			expect(types.nodeTypes.has("markdown-document")).toBe(true);
			expect(types.nodeTypes.has("heading-symbol")).toBe(true);
			expect(types.edgeTypes.has("md-links-to")).toBe(true);
			expect(types.edgeTypes.has("md-embeds-image")).toBe(true);
		});
	});

	describe("Edge Type Hierarchy", () => {
		it("should define parent relationships for file-dependency edges", () => {
			registry.register(basicStructureSpec);
			registry.register(fileDependencySpec);

			const spec = registry.get("file-dependency")!;

			const importsFile = spec.edgeTypes.find(
				(e) => e.name === "imports_file",
			);
			const importsLibrary = spec.edgeTypes.find(
				(e) => e.name === "imports_library",
			);

			expect(importsFile?.parent).toBe("depends_on");
			expect(importsLibrary?.parent).toBe("depends_on");
		});

		it("should define transitive relationships", () => {
			registry.register(basicStructureSpec);
			registry.register(fileDependencySpec);

			const spec = registry.get("file-dependency")!;

			const dependsOn = spec.edgeTypes.find((e) => e.name === "depends_on");

			expect(dependsOn?.isTransitive).toBe(true);
		});

		it("should define hierarchical relationships", () => {
			registry.register(basicStructureSpec);
			registry.register(symbolDependencySpec);

			const basicSpec = registry.get("basic-structure")!;
			const symbolSpec = registry.get("symbol-dependency")!;

			const contains = basicSpec.edgeTypes.find((e) => e.name === "contains");
			const extendsClass = symbolSpec.edgeTypes.find(
				(e) => e.name === "extends-class",
			);

			expect(contains?.isHierarchical).toBe(true);
			expect(extendsClass?.isHierarchical).toBe(true);
		});
	});

	describe("Built-in Constants", () => {
		it("should export BUILTIN_SCENARIOS array", () => {
			expect(BUILTIN_SCENARIOS).toEqual([
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
				"markdown-linking",
				"method-analysis",
			]);
		});

		it("should have consistent IDs in specs and constants", () => {
			expect(basicStructureSpec.id).toBe(BUILTIN_SCENARIOS[0]);
			expect(fileDependencySpec.id).toBe(BUILTIN_SCENARIOS[1]);
			expect(symbolDependencySpec.id).toBe(BUILTIN_SCENARIOS[2]);
			expect(markdownLinkingSpec.id).toBe(BUILTIN_SCENARIOS[3]);
			expect(methodAnalysisSpec.id).toBe(BUILTIN_SCENARIOS[4]);
		});
	});
});
