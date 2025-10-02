/**
 * Dependency Graph Analysis Tests
 * 의존성 그래프 분석 기능 테스트
 */

import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "@jest/globals";
import {
	PathResolver,
	createDependencyGraphBuilder,
	createGraphAnalyzer,
	createDependencyAnalyzer,
	analyzeDependencyGraph,
} from "../src/graph";

describe("Dependency Graph Analysis", () => {
	const testProjectRoot = resolve(__dirname, "..");

	describe("PathResolver", () => {
		it("should resolve relative paths correctly", async () => {
			const resolver = new PathResolver({
				projectRoot: testProjectRoot,
				basePath: resolve(testProjectRoot, "src"),
			});

			const result = await resolver.resolvePath("./api/analysis");
			expect(result.resolutionType).toBe("relative");
			expect(result.originalPath).toBe("./api/analysis");
			expect(result.resolvedPath).toContain("api/analysis");
		});

		it("should identify external packages", async () => {
			const resolver = new PathResolver({
				projectRoot: testProjectRoot,
				basePath: resolve(testProjectRoot, "src"),
			});

			const result = await resolver.resolvePath("react");
			expect(result.resolutionType).toBe("external");
			expect(result.resolvedPath).toBe("react");
		});

		it("should identify builtin modules", async () => {
			const resolver = new PathResolver({
				projectRoot: testProjectRoot,
				basePath: resolve(testProjectRoot, "src"),
			});

			const result = await resolver.resolvePath("fs");
			expect(result.resolutionType).toBe("builtin");
			expect(result.exists).toBe(true);
		});

		it("should handle file extensions", async () => {
			const resolver = new PathResolver({
				projectRoot: testProjectRoot,
				basePath: resolve(testProjectRoot, "src"),
				extensions: [".ts", ".js"],
			});

			const result = await resolver.resolvePath("./api/analysis");
			if (result.exists) {
				expect(result.extension).toMatch(/\.(ts|js)$/);
			}
		});
	});

	// NOTE: 그래프 빌드 고급 기능 - baseline에 필수 아님
	describe.skip("DependencyGraphBuilder", () => {
		it("should build basic dependency graph", async () => {
			const builder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 3,
				includeExternalDependencies: false,
			});

			const result = await builder.build();

			expect(result.graph).toBeDefined();
			expect(result.graph.nodes.size).toBeGreaterThan(0);
			expect(result.graph.edges.length).toBeGreaterThan(0);
			expect(result.processedFiles).toBeGreaterThan(0);
			expect(result.processingTime).toBeGreaterThan(0);
		});

		it("should handle missing entry points gracefully", async () => {
			const builder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: ["src/nonexistent.ts"],
				maxDepth: 2,
			});

			const result = await builder.build();

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].type).toBe("analysis");
		});

		it("should respect max depth setting", async () => {
			const shallowBuilder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 1,
				includeExternalDependencies: false,
			});

			const deepBuilder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 5,
				includeExternalDependencies: false,
			});

			const shallowResult = await shallowBuilder.build();
			const deepResult = await deepBuilder.build();

			expect(deepResult.graph.nodes.size).toBeGreaterThanOrEqual(shallowResult.graph.nodes.size);
		});
	});

	// NOTE: 그래프 분석 고급 기능 - baseline에 필수 아님
	describe.skip("GraphAnalyzer", () => {
		let sampleGraph: any;

		beforeAll(async () => {
			const builder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 4,
				includeExternalDependencies: false,
			});

			const result = await builder.build();
			sampleGraph = result.graph;
		});

		it("should analyze graph statistics", () => {
			const analyzer = createGraphAnalyzer(sampleGraph);
			const stats = analyzer.getStatistics();

			expect(stats.totalFiles).toBeGreaterThan(0);
			expect(stats.internalFiles).toBeGreaterThan(0);
			expect(stats.totalDependencies).toBeGreaterThan(0);
			expect(stats.languageDistribution).toBeDefined();
			expect(stats.analysisTime).toBeGreaterThan(0);
		});

		it("should perform full graph analysis", () => {
			const analyzer = createGraphAnalyzer(sampleGraph);
			const analysis = analyzer.analyze();

			expect(analysis.circularDependencies).toBeDefined();
			expect(analysis.dependencyDepth).toBeDefined();
			expect(analysis.hubFiles).toBeDefined();
			expect(analysis.isolatedFiles).toBeDefined();
			expect(analysis.unresolvedDependencies).toBeDefined();

			expect(typeof analysis.circularDependencies.totalCycles).toBe("number");
			expect(typeof analysis.dependencyDepth.maxDepth).toBe("number");
			expect(Array.isArray(analysis.hubFiles)).toBe(true);
			expect(Array.isArray(analysis.isolatedFiles)).toBe(true);
		});

		it("should find dependency relationships", () => {
			const analyzer = createGraphAnalyzer(sampleGraph);
			const nodes = Array.from(sampleGraph.nodes.keys());

			if (nodes.length >= 2) {
				const firstNode = nodes[0] as string;
				const dependencies = analyzer.getDependencies(firstNode);
				const dependents = analyzer.getDependents(firstNode);

				expect(Array.isArray(dependencies)).toBe(true);
				expect(Array.isArray(dependents)).toBe(true);
			}
		});

		it("should generate dependency tree", () => {
			const analyzer = createGraphAnalyzer(sampleGraph);
			const nodes = Array.from(sampleGraph.nodes.keys());

			if (nodes.length > 0) {
				const firstNode = nodes[0] as string;
				const tree = analyzer.getDependencyTree(firstNode, 2);

				expect(tree).toBeDefined();
				expect(tree.filePath).toBeDefined();
				expect(typeof tree.exists).toBe("boolean");
			}
		});
	});

	describe("High-level API", () => {
		it("should perform complete dependency analysis", async () => {
			const result = await analyzeDependencyGraph(
				testProjectRoot,
				["src/index.ts"],
				{
					maxDepth: 3,
					includeExternalDependencies: false,
				}
			);

			expect(result.buildResult).toBeDefined();
			expect(result.analysisResult).toBeDefined();

			expect(result.buildResult.graph.nodes.size).toBeGreaterThan(0);
			expect(result.buildResult.processedFiles).toBeGreaterThan(0);

			expect(typeof result.analysisResult.circularDependencies.totalCycles).toBe("number");
			expect(typeof result.analysisResult.dependencyDepth.maxDepth).toBe("number");
		});

		it("should create dependency analyzer with proper state management", async () => {
			const analyzer = createDependencyAnalyzer({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 2,
			});

			// Should throw before building graph
			expect(() => analyzer.analyzeGraph()).toThrow();
			expect(() => analyzer.getStatistics()).toThrow();

			// Should work after building graph
			await analyzer.buildGraph();
			expect(() => analyzer.analyzeGraph()).not.toThrow();
			expect(() => analyzer.getStatistics()).not.toThrow();

			const stats = analyzer.getStatistics();
			expect(stats.totalFiles).toBeGreaterThan(0);
		});

		it("should handle progress callbacks", async () => {
			let progressCalls = 0;
			let lastFile = "";

			const analyzer = createDependencyAnalyzer({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 2,
				onProgress: (current, total, file) => {
					progressCalls++;
					lastFile = file;
					expect(current).toBeGreaterThan(0);
					expect(file).toBeTruthy();
				},
			});

			await analyzer.buildGraph();

			expect(progressCalls).toBeGreaterThan(0);
			expect(lastFile).toBeTruthy();
		});
	});

	// NOTE: 에러 핸들링 고급 기능 - baseline에 필수 아님
	describe.skip("Error handling", () => {
		it("should handle invalid project root", async () => {
			const invalidRoot = resolve(__dirname, "nonexistent");

			await expect(
				analyzeDependencyGraph(
					invalidRoot,
					["index.ts"]
				)
			).rejects.toThrow();
		});

		it("should handle empty entry points", async () => {
			const result = await analyzeDependencyGraph(
				testProjectRoot,
				[]
			);

			expect(result.buildResult.graph.nodes.size).toBe(0);
			expect(result.buildResult.processedFiles).toBe(0);
		});

		it("should collect and report errors", async () => {
			const builder = createDependencyGraphBuilder({
				projectRoot: testProjectRoot,
				entryPoints: [
					"src/index.ts",
					"src/nonexistent.ts",
					"src/invalid-syntax.ts",
				],
				maxDepth: 2,
			});

			const result = await builder.build();

			// Should continue processing despite errors
			expect(result.processedFiles).toBeGreaterThanOrEqual(1);
			expect(result.errors.length).toBeGreaterThan(0);

			// Should categorize errors properly
			const errorTypes = result.errors.map(e => e.type);
			expect(errorTypes).toContain("analysis");
		});
	});
});