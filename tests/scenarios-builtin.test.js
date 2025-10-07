"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ScenarioRegistry_1 = require("../src/scenarios/ScenarioRegistry");
const builtin_1 = require("../src/scenarios/builtin");
(0, globals_1.describe)("Built-in Scenarios", () => {
	let registry;
	(0, globals_1.beforeEach)(() => {
		registry = new ScenarioRegistry_1.ScenarioRegistry();
	});
	(0, globals_1.describe)("Scenario Specifications", () => {
		(0, globals_1.it)("should have valid basic-structure spec", () => {
			(0, globals_1.expect)(() =>
				registry.register(builtin_1.basicStructureSpec),
			).not.toThrow();
			(0, globals_1.expect)(registry.has("basic-structure")).toBe(true);
		});
		(0, globals_1.it)("should have valid file-dependency spec", () => {
			registry.register(builtin_1.basicStructureSpec);
			(0, globals_1.expect)(() =>
				registry.register(builtin_1.fileDependencySpec),
			).not.toThrow();
			(0, globals_1.expect)(registry.has("file-dependency")).toBe(true);
		});
		(0, globals_1.it)("should have valid symbol-dependency spec", () => {
			registry.register(builtin_1.basicStructureSpec);
			(0, globals_1.expect)(() =>
				registry.register(builtin_1.symbolDependencySpec),
			).not.toThrow();
			(0, globals_1.expect)(registry.has("symbol-dependency")).toBe(true);
		});
		(0, globals_1.it)("should have valid markdown-linking spec", () => {
			registry.register(builtin_1.basicStructureSpec);
			(0, globals_1.expect)(() =>
				registry.register(builtin_1.markdownLinkingSpec),
			).not.toThrow();
			(0, globals_1.expect)(registry.has("markdown-linking")).toBe(true);
		});
		(0, globals_1.it)("should have valid method-analysis spec", () => {
			registry.register(builtin_1.basicStructureSpec);
			registry.register(builtin_1.symbolDependencySpec);
			(0, globals_1.expect)(() =>
				registry.register(builtin_1.methodAnalysisSpec),
			).not.toThrow();
			(0, globals_1.expect)(registry.has("method-analysis")).toBe(true);
		});
	});
	(0, globals_1.describe)("Scenario Dependencies", () => {
		(0, globals_1.it)("should register all scenarios in correct order", () => {
			registry.register(builtin_1.basicStructureSpec);
			registry.register(builtin_1.fileDependencySpec);
			registry.register(builtin_1.symbolDependencySpec);
			registry.register(builtin_1.markdownLinkingSpec);
			registry.register(builtin_1.methodAnalysisSpec);
			(0, globals_1.expect)(registry.list()).toHaveLength(5);
		});
		(0, globals_1.it)(
			"should resolve execution order for file-dependency",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.fileDependencySpec);
				const order = registry.getExecutionOrder(["file-dependency"]);
				(0, globals_1.expect)(order).toEqual([
					"basic-structure",
					"file-dependency",
				]);
			},
		);
		(0, globals_1.it)(
			"should resolve execution order for multiple scenarios",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.fileDependencySpec);
				registry.register(builtin_1.symbolDependencySpec);
				const order = registry.getExecutionOrder([
					"file-dependency",
					"symbol-dependency",
				]);
				(0, globals_1.expect)(order).toContain("basic-structure");
				(0, globals_1.expect)(order).toContain("file-dependency");
				(0, globals_1.expect)(order).toContain("symbol-dependency");
				(0, globals_1.expect)(order.indexOf("basic-structure")).toBe(0);
			},
		);
	});
	(0, globals_1.describe)("Type Collections", () => {
		(0, globals_1.it)("should collect types from basic-structure", () => {
			registry.register(builtin_1.basicStructureSpec);
			const types = registry.collectTypes("basic-structure");
			(0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
			(0, globals_1.expect)(types.nodeTypes.has("directory")).toBe(true);
			(0, globals_1.expect)(types.edgeTypes.has("contains")).toBe(true);
			(0, globals_1.expect)(types.semanticTags.has("source")).toBe(true);
		});
		(0, globals_1.it)(
			"should inherit types from basic-structure in file-dependency",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.fileDependencySpec);
				const types = registry.collectTypes("file-dependency");
				(0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("contains")).toBe(true);
				(0, globals_1.expect)(types.nodeTypes.has("library")).toBe(true);
				(0, globals_1.expect)(types.nodeTypes.has("module")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("imports_file")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("imports_library")).toBe(
					true,
				);
			},
		);
		(0, globals_1.it)(
			"should inherit types from basic-structure in symbol-dependency",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.symbolDependencySpec);
				const types = registry.collectTypes("symbol-dependency");
				(0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
				(0, globals_1.expect)(types.nodeTypes.has("class")).toBe(true);
				(0, globals_1.expect)(types.nodeTypes.has("function")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("calls")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("instantiates")).toBe(true);
			},
		);
		(0, globals_1.it)(
			"should inherit types from basic-structure in markdown-linking",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.markdownLinkingSpec);
				const types = registry.collectTypes("markdown-linking");
				(0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
				(0, globals_1.expect)(types.nodeTypes.has("markdown-document")).toBe(
					true,
				);
				(0, globals_1.expect)(types.nodeTypes.has("heading-symbol")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("md-links-to")).toBe(true);
				(0, globals_1.expect)(types.edgeTypes.has("md-embeds-image")).toBe(
					true,
				);
			},
		);
	});
	(0, globals_1.describe)("Edge Type Hierarchy", () => {
		(0, globals_1.it)(
			"should define parent relationships for file-dependency edges",
			() => {
				registry.register(builtin_1.basicStructureSpec);
				registry.register(builtin_1.fileDependencySpec);
				const spec = registry.get("file-dependency");
				const importsFile = spec.edgeTypes.find(
					(e) => e.name === "imports_file",
				);
				const importsLibrary = spec.edgeTypes.find(
					(e) => e.name === "imports_library",
				);
				(0, globals_1.expect)(importsFile?.parent).toBe("depends_on");
				(0, globals_1.expect)(importsLibrary?.parent).toBe("depends_on");
			},
		);
		(0, globals_1.it)("should define transitive relationships", () => {
			registry.register(builtin_1.basicStructureSpec);
			registry.register(builtin_1.fileDependencySpec);
			const spec = registry.get("file-dependency");
			const dependsOn = spec.edgeTypes.find((e) => e.name === "depends_on");
			(0, globals_1.expect)(dependsOn?.isTransitive).toBe(true);
		});
		(0, globals_1.it)("should define hierarchical relationships", () => {
			registry.register(builtin_1.basicStructureSpec);
			registry.register(builtin_1.symbolDependencySpec);
			const basicSpec = registry.get("basic-structure");
			const symbolSpec = registry.get("symbol-dependency");
			const contains = basicSpec.edgeTypes.find((e) => e.name === "contains");
			const extendsClass = symbolSpec.edgeTypes.find(
				(e) => e.name === "extends-class",
			);
			(0, globals_1.expect)(contains?.isHierarchical).toBe(true);
			(0, globals_1.expect)(extendsClass?.isHierarchical).toBe(true);
		});
	});
	(0, globals_1.describe)("Built-in Constants", () => {
		(0, globals_1.it)("should export BUILTIN_SCENARIOS array", () => {
			(0, globals_1.expect)(builtin_1.BUILTIN_SCENARIOS).toEqual([
				"basic-structure",
				"file-dependency",
				"symbol-dependency",
				"markdown-linking",
				"method-analysis",
			]);
		});
		(0, globals_1.it)(
			"should have consistent IDs in specs and constants",
			() => {
				(0, globals_1.expect)(builtin_1.basicStructureSpec.id).toBe(
					builtin_1.BUILTIN_SCENARIOS[0],
				);
				(0, globals_1.expect)(builtin_1.fileDependencySpec.id).toBe(
					builtin_1.BUILTIN_SCENARIOS[1],
				);
				(0, globals_1.expect)(builtin_1.symbolDependencySpec.id).toBe(
					builtin_1.BUILTIN_SCENARIOS[2],
				);
				(0, globals_1.expect)(builtin_1.markdownLinkingSpec.id).toBe(
					builtin_1.BUILTIN_SCENARIOS[3],
				);
				(0, globals_1.expect)(builtin_1.methodAnalysisSpec.id).toBe(
					builtin_1.BUILTIN_SCENARIOS[4],
				);
			},
		);
	});
});
//# sourceMappingURL=scenarios-builtin.test.js.map
