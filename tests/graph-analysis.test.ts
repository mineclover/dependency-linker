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

	describe("High-level API", () => {
		it("should perform complete dependency analysis", async () => {
			const result = await analyzeDependencyGraph(
				testProjectRoot,
				["src/index.ts"],
				{
					maxDepth: 3,
					includeExternalDependencies: false,
				},
			);

			expect(result.buildResult).toBeDefined();
			expect(result.analysisResult).toBeDefined();

			expect(result.buildResult.graph.nodes.size).toBeGreaterThan(0);
			expect(result.buildResult.processedFiles).toBeGreaterThan(0);

			expect(
				typeof result.analysisResult.circularDependencies.totalCycles,
			).toBe("number");
			expect(typeof result.analysisResult.dependencyDepth.maxDepth).toBe(
				"number",
			);
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
});
