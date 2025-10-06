"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validation_1 = require("../src/scenarios/validation");
(0, globals_1.describe)("Scenario Type Validation", () => {
    (0, globals_1.describe)("isValidVersion", () => {
        (0, globals_1.it)("should accept valid semantic versions", () => {
            (0, globals_1.expect)((0, validation_1.isValidVersion)("1.0.0")).toBe(true);
            (0, globals_1.expect)((0, validation_1.isValidVersion)("0.1.0")).toBe(true);
            (0, globals_1.expect)((0, validation_1.isValidVersion)("10.20.30")).toBe(true);
        });
        (0, globals_1.it)("should reject invalid versions", () => {
            (0, globals_1.expect)((0, validation_1.isValidVersion)("1.0")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidVersion)("v1.0.0")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidVersion)("1.0.0-alpha")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidVersion)("invalid")).toBe(false);
        });
    });
    (0, globals_1.describe)("isValidScenarioId", () => {
        (0, globals_1.it)("should accept valid scenario IDs", () => {
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("react-component")).toBe(true);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("file-dependency")).toBe(true);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("basic-structure")).toBe(true);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("markdown-linking")).toBe(true);
        });
        (0, globals_1.it)("should reject invalid scenario IDs", () => {
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("ReactComponent")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("react_component")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("123-component")).toBe(false);
            (0, globals_1.expect)((0, validation_1.isValidScenarioId)("react component")).toBe(false);
        });
    });
    (0, globals_1.describe)("validateNodeTypeSpec", () => {
        (0, globals_1.it)("should validate correct NodeTypeSpec", () => {
            const validSpec = {
                name: "file",
                description: "Source code file",
            };
            const result = (0, validation_1.validateNodeTypeSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should validate NodeTypeSpec with defaultProperties", () => {
            const validSpec = {
                name: "class",
                description: "Class definition",
                defaultProperties: {
                    visibility: "public",
                },
            };
            const result = (0, validation_1.validateNodeTypeSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should reject NodeTypeSpec without name", () => {
            const invalidSpec = {
                description: "Missing name",
            };
            const result = (0, validation_1.validateNodeTypeSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("should reject NodeTypeSpec without description", () => {
            const invalidSpec = {
                name: "file",
            };
            const result = (0, validation_1.validateNodeTypeSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("should reject invalid defaultProperties", () => {
            const invalidSpec = {
                name: "file",
                description: "Source code file",
                defaultProperties: "invalid",
            };
            const result = (0, validation_1.validateNodeTypeSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain("NodeTypeSpec: defaultProperties must be an object");
        });
    });
    (0, globals_1.describe)("validateEdgeTypeSpec", () => {
        (0, globals_1.it)("should validate correct EdgeTypeSpec", () => {
            const validSpec = {
                name: "imports",
                description: "Import relationship",
            };
            const result = (0, validation_1.validateEdgeTypeSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should validate EdgeTypeSpec with all properties", () => {
            const validSpec = {
                name: "imports_file",
                description: "Import file relationship",
                parent: "depends_on",
                isTransitive: true,
                isInheritable: false,
                isHierarchical: false,
            };
            const result = (0, validation_1.validateEdgeTypeSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should reject EdgeTypeSpec without name", () => {
            const invalidSpec = {
                description: "Missing name",
            };
            const result = (0, validation_1.validateEdgeTypeSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("should reject invalid boolean properties", () => {
            const invalidSpec = {
                name: "imports",
                description: "Import relationship",
                isTransitive: "true",
            };
            const result = (0, validation_1.validateEdgeTypeSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain("EdgeTypeSpec: isTransitive must be a boolean");
        });
    });
    (0, globals_1.describe)("validateScenarioSpec", () => {
        (0, globals_1.it)("should validate complete valid ScenarioSpec", () => {
            const validSpec = {
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
            const result = (0, validation_1.validateScenarioSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should validate ScenarioSpec with extends and requires", () => {
            const validSpec = {
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
            const result = (0, validation_1.validateScenarioSpec)(validSpec);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)("should reject ScenarioSpec without id", () => {
            const invalidSpec = {
                name: "Test Scenario",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            const result = (0, validation_1.validateScenarioSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes("id is required"))).toBe(true);
        });
        (0, globals_1.it)("should reject ScenarioSpec with invalid version", () => {
            const invalidSpec = {
                id: "test-scenario",
                name: "Test Scenario",
                description: "Test",
                version: "1.0",
                nodeTypes: [],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            const result = (0, validation_1.validateScenarioSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes("semantic versioning"))).toBe(true);
        });
        (0, globals_1.it)("should detect duplicate node type names", () => {
            const invalidSpec = {
                id: "test-scenario",
                name: "Test Scenario",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [
                    { name: "file", description: "File 1" },
                    { name: "file", description: "File 2" },
                ],
                edgeTypes: [],
                analyzer: { className: "TestAnalyzer" },
            };
            const result = (0, validation_1.validateScenarioSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes("duplicate node type names"))).toBe(true);
        });
        (0, globals_1.it)("should detect duplicate edge type names", () => {
            const invalidSpec = {
                id: "test-scenario",
                name: "Test Scenario",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [
                    { name: "imports", description: "Import 1" },
                    { name: "imports", description: "Import 2" },
                ],
                analyzer: { className: "TestAnalyzer" },
            };
            const result = (0, validation_1.validateScenarioSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes("duplicate edge type names"))).toBe(true);
        });
        (0, globals_1.it)("should warn about undefined parent edge types", () => {
            const specWithWarning = {
                id: "test-scenario",
                name: "Test Scenario",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [
                    {
                        name: "imports_file",
                        description: "Import file",
                        parent: "depends_on",
                    },
                ],
                analyzer: { className: "TestAnalyzer" },
            };
            const result = (0, validation_1.validateScenarioSpec)(specWithWarning);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.warnings.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.warnings.some((w) => w.includes("undefined parent"))).toBe(true);
        });
        (0, globals_1.it)("should reject ScenarioSpec without analyzer", () => {
            const invalidSpec = {
                id: "test-scenario",
                name: "Test Scenario",
                description: "Test",
                version: "1.0.0",
                nodeTypes: [],
                edgeTypes: [],
            };
            const result = (0, validation_1.validateScenarioSpec)(invalidSpec);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some((e) => e.includes("analyzer is required"))).toBe(true);
        });
    });
    (0, globals_1.describe)("detectCircularDependencies", () => {
        (0, globals_1.it)("should detect direct circular dependency", () => {
            const specs = new Map([
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
                        extends: ["scenario-a"],
                        nodeTypes: [],
                        edgeTypes: [],
                        analyzer: { className: "TestAnalyzer" },
                    },
                ],
            ]);
            const result = (0, validation_1.detectCircularDependencies)("scenario-a", specs);
            (0, globals_1.expect)(result).not.toBeNull();
            (0, globals_1.expect)(result).toContain("Circular dependency detected");
        });
        (0, globals_1.it)("should detect indirect circular dependency", () => {
            const specs = new Map([
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
                        extends: ["scenario-a"],
                        nodeTypes: [],
                        edgeTypes: [],
                        analyzer: { className: "TestAnalyzer" },
                    },
                ],
            ]);
            const result = (0, validation_1.detectCircularDependencies)("scenario-a", specs);
            (0, globals_1.expect)(result).not.toBeNull();
            (0, globals_1.expect)(result).toContain("Circular dependency detected");
        });
        (0, globals_1.it)("should not detect circular dependency in valid chain", () => {
            const specs = new Map([
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
            const result = (0, validation_1.detectCircularDependencies)("scenario-a", specs);
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)("should handle requires dependencies for circular detection", () => {
            const specs = new Map([
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
                        requires: ["scenario-a"],
                        nodeTypes: [],
                        edgeTypes: [],
                        analyzer: { className: "TestAnalyzer" },
                    },
                ],
            ]);
            const result = (0, validation_1.detectCircularDependencies)("scenario-a", specs);
            (0, globals_1.expect)(result).not.toBeNull();
            (0, globals_1.expect)(result).toContain("Circular dependency detected");
        });
    });
});
//# sourceMappingURL=scenarios-types.test.js.map