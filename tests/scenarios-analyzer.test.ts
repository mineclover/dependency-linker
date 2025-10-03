/**
 * Base Scenario Analyzer Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
	BaseScenarioAnalyzer,
	type AnalysisContext,
} from "../src/scenarios/BaseScenarioAnalyzer";
import { ScenarioRegistry } from "../src/scenarios/ScenarioRegistry";
import type { ScenarioSpec, AnalysisResult } from "../src/scenarios/types";

/**
 * Test analyzer implementation
 */
class TestAnalyzer extends BaseScenarioAnalyzer {
	public beforeAnalyzeCalled = false;
	public afterAnalyzeCalled = false;
	public analyzeCalled = false;

	protected override async beforeAnalyze(
		context: AnalysisContext,
	): Promise<void> {
		this.beforeAnalyzeCalled = true;
	}

	protected override async afterAnalyze(
		context: AnalysisContext,
		result: AnalysisResult,
	): Promise<AnalysisResult> {
		this.afterAnalyzeCalled = true;
		return result;
	}

	protected override async analyze(
		context: AnalysisContext,
	): Promise<AnalysisResult> {
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

/**
 * Test analyzer that modifies result in afterAnalyze
 */
class ResultModifyingAnalyzer extends BaseScenarioAnalyzer {
	protected override async analyze(
		context: AnalysisContext,
	): Promise<AnalysisResult> {
		return {
			nodes: [{ type: "file", identifier: "test.ts" }],
			edges: [],
		};
	}

	protected override async afterAnalyze(
		context: AnalysisContext,
		result: AnalysisResult,
	): Promise<AnalysisResult> {
		return {
			...result,
			nodes: [
				...result.nodes,
				{ type: "class", identifier: "TestClass", properties: { added: true } },
			],
		};
	}
}

describe("BaseScenarioAnalyzer", () => {
	let registry: ScenarioRegistry;
	let spec: ScenarioSpec;
	let analyzer: TestAnalyzer;

	beforeEach(() => {
		registry = new ScenarioRegistry();

		// Register base scenario
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

	describe("constructor and getters", () => {
		it("should initialize with spec and registry", () => {
			expect(analyzer.getSpec()).toEqual(spec);
			expect(analyzer.getId()).toBe("test-scenario");
		});

		it("should provide access to analyzer configuration", () => {
			const config = analyzer.getConfig<{
				testOption: boolean;
				threshold: number;
			}>();

			expect(config.testOption).toBe(true);
			expect(config.threshold).toBe(0.8);
		});

		it("should return empty config if not specified", () => {
			const specWithoutConfig: ScenarioSpec = {
				...spec,
				analyzer: { className: "TestAnalyzer" },
			};

			const analyzerWithoutConfig = new TestAnalyzer(
				specWithoutConfig,
				registry,
			);
			const config = analyzerWithoutConfig.getConfig();

			expect(config).toEqual({});
		});

		it("should provide type collection from registry", () => {
			const types = analyzer.getTypeCollection();

			expect(types.nodeTypes.has("file")).toBe(true);
			expect(types.nodeTypes.has("class")).toBe(true);
			expect(types.edgeTypes.has("contains")).toBe(true);
			expect(types.semanticTags.has("test-tag")).toBe(true);
		});
	});

	describe("execution lifecycle", () => {
		it("should execute hooks in correct order", async () => {
			const context: AnalysisContext = {
				filePath: "test.ts",
				sourceCode: "export class Test {}",
				language: "typescript",
				sharedData: new Map(),
				previousResults: new Map(),
				typeCollection: registry.collectTypes("test-scenario"),
			};

			await analyzer.execute(context);

			expect(analyzer.beforeAnalyzeCalled).toBe(true);
			expect(analyzer.analyzeCalled).toBe(true);
			expect(analyzer.afterAnalyzeCalled).toBe(true);
		});

		it("should store result in context after execution", async () => {
			const context: AnalysisContext = {
				filePath: "test.ts",
				sourceCode: "export class Test {}",
				language: "typescript",
				sharedData: new Map(),
				previousResults: new Map(),
				typeCollection: registry.collectTypes("test-scenario"),
			};

			const result = await analyzer.execute(context);

			expect(context.previousResults.get("test-scenario")).toEqual(result);
		});

		it("should allow result modification in afterAnalyze", async () => {
			const modifyingAnalyzer = new ResultModifyingAnalyzer(spec, registry);

			const context: AnalysisContext = {
				filePath: "test.ts",
				sourceCode: "export class Test {}",
				language: "typescript",
				sharedData: new Map(),
				previousResults: new Map(),
				typeCollection: registry.collectTypes("test-scenario"),
			};

			const result = await modifyingAnalyzer.execute(context);

			expect(result.nodes).toHaveLength(2);
			expect(result.nodes[0].type).toBe("file");
			expect(result.nodes[1].type).toBe("class");
			expect(result.nodes[1].properties).toEqual({ added: true });
		});
	});

	describe("type checking helpers", () => {
		it("should check node type availability", () => {
			expect(analyzer.hasNodeType("file")).toBe(true);
			expect(analyzer.hasNodeType("class")).toBe(true);
			expect(analyzer.hasNodeType("function")).toBe(false);
		});

		it("should check edge type availability", () => {
			expect(analyzer.hasEdgeType("contains")).toBe(true);
			expect(analyzer.hasEdgeType("imports")).toBe(false);
		});

		it("should check semantic tag availability", () => {
			expect(analyzer.hasSemanticTag("test-tag")).toBe(true);
			expect(analyzer.hasSemanticTag("other-tag")).toBe(false);
		});
	});

	describe("type inheritance", () => {
		it("should have access to types from extends chain", () => {
			// Register parent scenario
			registry.register({
				id: "parent-scenario",
				name: "Parent",
				description: "Parent scenario",
				version: "1.0.0",
				nodeTypes: [{ name: "module", description: "Module" }],
				edgeTypes: [{ name: "imports", description: "Imports" }],
				analyzer: { className: "ParentAnalyzer" },
			});

			// Register child scenario extending parent
			const childSpec: ScenarioSpec = {
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

			// Should have access to both parent and child types
			expect(childAnalyzer.hasNodeType("module")).toBe(true); // from parent
			expect(childAnalyzer.hasNodeType("class")).toBe(true); // from child
			expect(childAnalyzer.hasEdgeType("imports")).toBe(true); // from parent
			expect(childAnalyzer.hasEdgeType("extends")).toBe(true); // from child
		});
	});

	describe("result helpers", () => {
		it("should create empty result", () => {
			const result = analyzer.createEmptyResult();

			expect(result.nodes).toEqual([]);
			expect(result.edges).toEqual([]);
			expect(result.semanticTags).toEqual([]);
		});

		it("should merge multiple results", () => {
			const result1: AnalysisResult = {
				nodes: [{ type: "file", identifier: "file1.ts" }],
				edges: [{ type: "contains", from: "file1.ts", to: "class1" }],
				semanticTags: [{ nodeIdentifier: "file1.ts", tag: "tag1" }],
			};

			const result2: AnalysisResult = {
				nodes: [{ type: "file", identifier: "file2.ts" }],
				edges: [{ type: "contains", from: "file2.ts", to: "class2" }],
				semanticTags: [{ nodeIdentifier: "file2.ts", tag: "tag2" }],
			};

			const merged = analyzer.mergeResults(result1, result2);

			expect(merged.nodes).toHaveLength(2);
			expect(merged.edges).toHaveLength(2);
			expect(merged.semanticTags).toHaveLength(2);
		});

		it("should handle results without semantic tags in merge", () => {
			const result1: AnalysisResult = {
				nodes: [{ type: "file", identifier: "file1.ts" }],
				edges: [],
			};

			const result2: AnalysisResult = {
				nodes: [{ type: "file", identifier: "file2.ts" }],
				edges: [],
				semanticTags: [{ nodeIdentifier: "file2.ts", tag: "tag2" }],
			};

			const merged = analyzer.mergeResults(result1, result2);

			expect(merged.semanticTags).toHaveLength(1);
		});
	});

	describe("context analysis", () => {
		it("should analyze with full context information", async () => {
			const context: AnalysisContext = {
				filePath: "src/test.ts",
				sourceCode: "export class Test {}",
				language: "typescript",
				parseResult: {
					tree: {} as any,
					context: {} as any,
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

			expect(result.nodes[0].identifier).toBe("src/test.ts");
			expect(result.nodes[0].properties?.language).toBe("typescript");
		});
	});
});
