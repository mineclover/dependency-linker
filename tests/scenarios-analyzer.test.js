"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const BaseScenarioAnalyzer_1 = require("../src/scenarios/BaseScenarioAnalyzer");
const ScenarioRegistry_1 = require("../src/scenarios/ScenarioRegistry");
class TestAnalyzer extends BaseScenarioAnalyzer_1.BaseScenarioAnalyzer {
	constructor() {
		super(...arguments);
		this.beforeAnalyzeCalled = false;
		this.afterAnalyzeCalled = false;
		this.analyzeCalled = false;
	}
	async beforeAnalyze(context) {
		this.beforeAnalyzeCalled = true;
	}
	async afterAnalyze(context, result) {
		this.afterAnalyzeCalled = true;
		return result;
	}
	async analyze(context) {
		this.analyzeCalled = true;
		return {
			nodes: [
				{
					type: "file",
					identifier: context.filePath,
					properties: { language: context.language },
				},
			],
			edges: [],
			semanticTags: [],
		};
	}
}
class ResultModifyingAnalyzer extends BaseScenarioAnalyzer_1.BaseScenarioAnalyzer {
	async analyze(context) {
		return {
			nodes: [{ type: "file", identifier: "test.ts" }],
			edges: [],
		};
	}
	async afterAnalyze(context, result) {
		return {
			...result,
			nodes: [
				...result.nodes,
				{ type: "class", identifier: "TestClass", properties: { added: true } },
			],
		};
	}
}
(0, globals_1.describe)("BaseScenarioAnalyzer", () => {
	let registry;
	let spec;
	let analyzer;
	(0, globals_1.beforeEach)(() => {
		registry = new ScenarioRegistry_1.ScenarioRegistry();
		spec = {
			id: "test-scenario",
			name: "Test Scenario",
			description: "Test analyzer",
			version: "1.0.0",
			nodeTypes: [
				{ name: "file", description: "File" },
				{ name: "class", description: "Class" },
			],
			edgeTypes: [{ name: "contains", description: "Contains" }],
			semanticTags: [
				{
					name: "test-tag",
					category: "test",
					description: "Test tag",
				},
			],
			analyzer: {
				className: "TestAnalyzer",
				config: {
					testOption: true,
					threshold: 0.8,
				},
			},
		};
		registry.register(spec);
		analyzer = new TestAnalyzer(spec, registry);
	});
	(0, globals_1.describe)("constructor and getters", () => {
		(0, globals_1.it)("should initialize with spec and registry", () => {
			(0, globals_1.expect)(analyzer.getSpec()).toEqual(spec);
			(0, globals_1.expect)(analyzer.getId()).toBe("test-scenario");
		});
		(0, globals_1.it)("should provide access to analyzer configuration", () => {
			const config = analyzer.getConfig();
			(0, globals_1.expect)(config.testOption).toBe(true);
			(0, globals_1.expect)(config.threshold).toBe(0.8);
		});
		(0, globals_1.it)("should return empty config if not specified", () => {
			const specWithoutConfig = {
				...spec,
				analyzer: { className: "TestAnalyzer" },
			};
			const analyzerWithoutConfig = new TestAnalyzer(
				specWithoutConfig,
				registry,
			);
			const config = analyzerWithoutConfig.getConfig();
			(0, globals_1.expect)(config).toEqual({});
		});
		(0, globals_1.it)("should provide type collection from registry", () => {
			const types = analyzer.getTypeCollection();
			(0, globals_1.expect)(types.nodeTypes.has("file")).toBe(true);
			(0, globals_1.expect)(types.nodeTypes.has("class")).toBe(true);
			(0, globals_1.expect)(types.edgeTypes.has("contains")).toBe(true);
			(0, globals_1.expect)(types.semanticTags.has("test-tag")).toBe(true);
		});
	});
	(0, globals_1.describe)("execution lifecycle", () => {
		(0, globals_1.it)("should execute hooks in correct order", async () => {
			const context = {
				filePath: "test.ts",
				sourceCode: "export class Test {}",
				language: "typescript",
				sharedData: new Map(),
				previousResults: new Map(),
				typeCollection: registry.collectTypes("test-scenario"),
			};
			await analyzer.execute(context);
			(0, globals_1.expect)(analyzer.beforeAnalyzeCalled).toBe(true);
			(0, globals_1.expect)(analyzer.analyzeCalled).toBe(true);
			(0, globals_1.expect)(analyzer.afterAnalyzeCalled).toBe(true);
		});
		(0, globals_1.it)(
			"should store result in context after execution",
			async () => {
				const context = {
					filePath: "test.ts",
					sourceCode: "export class Test {}",
					language: "typescript",
					sharedData: new Map(),
					previousResults: new Map(),
					typeCollection: registry.collectTypes("test-scenario"),
				};
				const result = await analyzer.execute(context);
				(0, globals_1.expect)(
					context.previousResults.get("test-scenario"),
				).toEqual(result);
			},
		);
		(0, globals_1.it)(
			"should allow result modification in afterAnalyze",
			async () => {
				const modifyingAnalyzer = new ResultModifyingAnalyzer(spec, registry);
				const context = {
					filePath: "test.ts",
					sourceCode: "export class Test {}",
					language: "typescript",
					sharedData: new Map(),
					previousResults: new Map(),
					typeCollection: registry.collectTypes("test-scenario"),
				};
				const result = await modifyingAnalyzer.execute(context);
				(0, globals_1.expect)(result.nodes).toHaveLength(2);
				(0, globals_1.expect)(result.nodes[0].type).toBe("file");
				(0, globals_1.expect)(result.nodes[1].type).toBe("class");
				(0, globals_1.expect)(result.nodes[1].properties).toEqual({
					added: true,
				});
			},
		);
	});
	(0, globals_1.describe)("type checking helpers", () => {
		(0, globals_1.it)("should check node type availability", () => {
			(0, globals_1.expect)(analyzer.hasNodeType("file")).toBe(true);
			(0, globals_1.expect)(analyzer.hasNodeType("class")).toBe(true);
			(0, globals_1.expect)(analyzer.hasNodeType("function")).toBe(false);
		});
		(0, globals_1.it)("should check edge type availability", () => {
			(0, globals_1.expect)(analyzer.hasEdgeType("contains")).toBe(true);
			(0, globals_1.expect)(analyzer.hasEdgeType("imports")).toBe(false);
		});
		(0, globals_1.it)("should check semantic tag availability", () => {
			(0, globals_1.expect)(analyzer.hasSemanticTag("test-tag")).toBe(true);
			(0, globals_1.expect)(analyzer.hasSemanticTag("other-tag")).toBe(false);
		});
	});
	(0, globals_1.describe)("type inheritance", () => {
		(0, globals_1.it)("should have access to types from extends chain", () => {
			registry.register({
				id: "parent-scenario",
				name: "Parent",
				description: "Parent scenario",
				version: "1.0.0",
				nodeTypes: [{ name: "module", description: "Module" }],
				edgeTypes: [{ name: "imports", description: "Imports" }],
				analyzer: { className: "ParentAnalyzer" },
			});
			const childSpec = {
				id: "child-scenario",
				name: "Child",
				description: "Child scenario",
				version: "1.0.0",
				extends: ["parent-scenario"],
				nodeTypes: [{ name: "class", description: "Class" }],
				edgeTypes: [{ name: "extends", description: "Extends" }],
				analyzer: { className: "ChildAnalyzer" },
			};
			registry.register(childSpec);
			const childAnalyzer = new TestAnalyzer(childSpec, registry);
			(0, globals_1.expect)(childAnalyzer.hasNodeType("module")).toBe(true);
			(0, globals_1.expect)(childAnalyzer.hasNodeType("class")).toBe(true);
			(0, globals_1.expect)(childAnalyzer.hasEdgeType("imports")).toBe(true);
			(0, globals_1.expect)(childAnalyzer.hasEdgeType("extends")).toBe(true);
		});
	});
	(0, globals_1.describe)("result helpers", () => {
		(0, globals_1.it)("should create empty result", () => {
			const result = analyzer.createEmptyResult();
			(0, globals_1.expect)(result.nodes).toEqual([]);
			(0, globals_1.expect)(result.edges).toEqual([]);
			(0, globals_1.expect)(result.semanticTags).toEqual([]);
		});
		(0, globals_1.it)("should merge multiple results", () => {
			const result1 = {
				nodes: [{ type: "file", identifier: "file1.ts" }],
				edges: [{ type: "contains", from: "file1.ts", to: "class1" }],
				semanticTags: [{ nodeIdentifier: "file1.ts", tag: "tag1" }],
			};
			const result2 = {
				nodes: [{ type: "file", identifier: "file2.ts" }],
				edges: [{ type: "contains", from: "file2.ts", to: "class2" }],
				semanticTags: [{ nodeIdentifier: "file2.ts", tag: "tag2" }],
			};
			const merged = analyzer.mergeResults(result1, result2);
			(0, globals_1.expect)(merged.nodes).toHaveLength(2);
			(0, globals_1.expect)(merged.edges).toHaveLength(2);
			(0, globals_1.expect)(merged.semanticTags).toHaveLength(2);
		});
		(0, globals_1.it)(
			"should handle results without semantic tags in merge",
			() => {
				const result1 = {
					nodes: [{ type: "file", identifier: "file1.ts" }],
					edges: [],
				};
				const result2 = {
					nodes: [{ type: "file", identifier: "file2.ts" }],
					edges: [],
					semanticTags: [{ nodeIdentifier: "file2.ts", tag: "tag2" }],
				};
				const merged = analyzer.mergeResults(result1, result2);
				(0, globals_1.expect)(merged.semanticTags).toHaveLength(1);
			},
		);
	});
	(0, globals_1.describe)("context analysis", () => {
		(0, globals_1.it)(
			"should analyze with full context information",
			async () => {
				const context = {
					filePath: "src/test.ts",
					sourceCode: "export class Test {}",
					language: "typescript",
					parseResult: {
						tree: {},
						context: {},
						metadata: {
							language: "typescript",
							parseTime: 10,
							nodeCount: 5,
						},
					},
					sharedData: new Map(),
					previousResults: new Map(),
					typeCollection: registry.collectTypes("test-scenario"),
				};
				const result = await analyzer.execute(context);
				(0, globals_1.expect)(result.nodes[0].identifier).toBe("src/test.ts");
				(0, globals_1.expect)(result.nodes[0].properties?.language).toBe(
					"typescript",
				);
			},
		);
	});
});
//# sourceMappingURL=scenarios-analyzer.test.js.map
