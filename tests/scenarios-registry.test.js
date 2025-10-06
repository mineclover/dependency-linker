"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ScenarioRegistry_1 = require("../src/scenarios/ScenarioRegistry");
(0, globals_1.describe)("ScenarioRegistry", () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = new ScenarioRegistry_1.ScenarioRegistry();
    });
    (0, globals_1.describe)("register", () => {
        (0, globals_1.it)("should register a valid scenario", () => {
            const spec = {
                id: "basic-structure",
                name: "Basic Structure",
                description: "Basic code structure",
                version: "1.0.0",
                nodeTypes: [{ name: "file", description: "File" }],
                edgeTypes: [{ name: "contains", description: "Contains" }],
                analyzer: { className: "BasicAnalyzer" },
            };
            (0, globals_1.expect)(() => registry.register(spec)).not.toThrow();
            (0, globals_1.expect)(registry.has("basic-structure")).toBe(true);
        });
        (0, globals_1.it)("should reject invalid scenario spec", () => {
            const invalidSpec = {
                id: "invalid",
                name: "Invalid",
                description: "Test",
                version: "invalid-version",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            (0, globals_1.expect)(() => registry.register(invalidSpec)).toThrow();
        });
        (0, globals_1.it)("should reject duplicate scenario ID", () => {
            const spec = {
                id: "test-scenario",
                name: "Test",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            registry.register(spec);
            (0, globals_1.expect)(() => registry.register(spec)).toThrow(/already registered/);
        });
        (0, globals_1.it)("should reject scenario with undefined extends dependency", () => {
            const spec = {
                id: "child-scenario",
                name: "Child",
                description: "Test",
                version: "1.0.0",
                extends: ["non-existent"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            (0, globals_1.expect)(() => registry.register(spec)).toThrow(/extends undefined scenario/);
        });
        (0, globals_1.it)("should reject scenario with undefined requires dependency", () => {
            const spec = {
                id: "child-scenario",
                name: "Child",
                description: "Test",
                version: "1.0.0",
                requires: ["non-existent"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            (0, globals_1.expect)(() => registry.register(spec)).toThrow(/requires undefined scenario/);
        });
        (0, globals_1.it)("should reject circular extends dependency", () => {
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
            const spec_circular = {
                id: "scenario-d",
                name: "Scenario D",
                description: "Test",
                version: "1.0.0",
                extends: ["scenario-c", "scenario-a"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
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
            const circularSpec = {
                id: "scenario-z",
                name: "Scenario Z",
                description: "Test",
                version: "1.0.0",
                extends: ["scenario-y"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            const tempRegistry = new ScenarioRegistry_1.ScenarioRegistry();
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
            const circularA = {
                id: "a",
                name: "A",
                description: "Test",
                version: "1.0.0",
                extends: ["b"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            tempRegistry.scenarios.set("a", circularA);
            const circularC = {
                id: "c",
                name: "C",
                description: "Test",
                version: "1.0.0",
                extends: ["a"],
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            (0, globals_1.expect)(() => tempRegistry.register(circularC)).toThrow(/Circular dependency/);
        });
    });
    (0, globals_1.describe)("get, has, list", () => {
        (0, globals_1.it)("should retrieve registered scenario", () => {
            const spec = {
                id: "test-scenario",
                name: "Test",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            registry.register(spec);
            (0, globals_1.expect)(registry.get("test-scenario")).toEqual(spec);
            (0, globals_1.expect)(registry.has("test-scenario")).toBe(true);
            (0, globals_1.expect)(registry.list()).toHaveLength(1);
            (0, globals_1.expect)(registry.list()[0]).toEqual(spec);
        });
        (0, globals_1.it)("should return undefined for non-existent scenario", () => {
            (0, globals_1.expect)(registry.get("non-existent")).toBeUndefined();
            (0, globals_1.expect)(registry.has("non-existent")).toBe(false);
        });
    });
    (0, globals_1.describe)("getExecutionOrder", () => {
        (0, globals_1.beforeEach)(() => {
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
        (0, globals_1.it)("should return single scenario with no dependencies", () => {
            const order = registry.getExecutionOrder(["basic-structure"]);
            (0, globals_1.expect)(order).toEqual(["basic-structure"]);
        });
        (0, globals_1.it)("should resolve extends dependencies", () => {
            const order = registry.getExecutionOrder(["file-dependency"]);
            (0, globals_1.expect)(order).toEqual(["basic-structure", "file-dependency"]);
        });
        (0, globals_1.it)("should resolve complex dependency graph", () => {
            const order = registry.getExecutionOrder(["react-component"]);
            (0, globals_1.expect)(order.indexOf("basic-structure")).toBeLessThan(order.indexOf("file-dependency"));
            (0, globals_1.expect)(order.indexOf("basic-structure")).toBeLessThan(order.indexOf("symbol-dependency"));
            (0, globals_1.expect)(order.indexOf("basic-structure")).toBeLessThan(order.indexOf("react-component"));
            (0, globals_1.expect)(order.indexOf("file-dependency")).toBeLessThan(order.indexOf("react-component"));
            (0, globals_1.expect)(order.indexOf("symbol-dependency")).toBeLessThan(order.indexOf("react-component"));
            (0, globals_1.expect)(order).toHaveLength(4);
        });
        (0, globals_1.it)("should handle multiple requested scenarios", () => {
            const order = registry.getExecutionOrder([
                "file-dependency",
                "symbol-dependency",
            ]);
            (0, globals_1.expect)(order).toContain("basic-structure");
            (0, globals_1.expect)(order).toContain("file-dependency");
            (0, globals_1.expect)(order).toContain("symbol-dependency");
            (0, globals_1.expect)(order.indexOf("basic-structure")).toBe(0);
        });
        (0, globals_1.it)("should throw for non-existent scenario", () => {
            (0, globals_1.expect)(() => registry.getExecutionOrder(["non-existent"])).toThrow(/not found in registry/);
        });
    });
    (0, globals_1.describe)("collectTypes", () => {
        (0, globals_1.beforeEach)(() => {
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
        (0, globals_1.it)("should collect types from single scenario", () => {
            const types = registry.collectTypes("basic-structure");
            (0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
            (0, globals_1.expect)(types.nodeTypes.has("class")).toBe(true);
            (0, globals_1.expect)(types.edgeTypes.has("contains")).toBe(true);
            (0, globals_1.expect)(types.semanticTags.has("structural")).toBe(true);
        });
        (0, globals_1.it)("should collect types from extends chain", () => {
            const types = registry.collectTypes("file-dependency");
            (0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
            (0, globals_1.expect)(types.nodeTypes.has("class")).toBe(true);
            (0, globals_1.expect)(types.edgeTypes.has("contains")).toBe(true);
            (0, globals_1.expect)(types.semanticTags.has("structural")).toBe(true);
            (0, globals_1.expect)(types.nodeTypes.has("library")).toBe(true);
            (0, globals_1.expect)(types.edgeTypes.has("imports")).toBe(true);
            (0, globals_1.expect)(types.edgeTypes.has("depends_on")).toBe(true);
            (0, globals_1.expect)(types.semanticTags.has("dependency")).toBe(true);
        });
        (0, globals_1.it)("should throw for non-existent scenario", () => {
            (0, globals_1.expect)(() => registry.collectTypes("non-existent")).toThrow(/not found/);
        });
    });
    (0, globals_1.describe)("validateTypeConsistency", () => {
        (0, globals_1.it)("should pass for consistent edge types", () => {
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
                        isTransitive: true,
                    },
                ],
                analyzer: { className: "TestAnalyzer" },
            });
            const result = registry.validateTypeConsistency();
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should detect conflicting edge type properties", () => {
            const spec1 = {
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
            const spec2 = {
                id: "scenario-2",
                name: "Scenario 2",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [
                    {
                        name: "conflict-edge",
                        description: "Edge",
                        isTransitive: false,
                    },
                ],
                analyzer: { className: "TestAnalyzer" },
            };
            registry.scenarios.set(spec1.id, spec1);
            registry.scenarios.set(spec2.id, spec2);
            const result = registry.validateTypeConsistency();
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.errors[0]).toContain("conflicting properties");
        });
    });
    (0, globals_1.describe)("clear", () => {
        (0, globals_1.it)("should clear all registered scenarios", () => {
            registry.register({
                id: "test-scenario",
                name: "Test",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            });
            (0, globals_1.expect)(registry.list()).toHaveLength(1);
            registry.clear();
            (0, globals_1.expect)(registry.list()).toHaveLength(0);
            (0, globals_1.expect)(registry.has("test-scenario")).toBe(false);
        });
    });
});
//# sourceMappingURL=scenarios-registry.test.js.map