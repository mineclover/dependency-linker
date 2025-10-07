"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const globals_1 = require("@jest/globals");
const graph_1 = require("../src/graph");
(0, globals_1.describe)("Dependency Graph Analysis", () => {
	const testProjectRoot = (0, node_path_1.resolve)(__dirname, "..");
	(0, globals_1.describe)("PathResolver", () => {
		(0, globals_1.it)("should resolve relative paths correctly", async () => {
			const resolver = new graph_1.PathResolver({
				projectRoot: testProjectRoot,
				basePath: (0, node_path_1.resolve)(testProjectRoot, "src"),
			});
			const result = await resolver.resolvePath("./api/analysis");
			(0, globals_1.expect)(result.resolutionType).toBe("relative");
			(0, globals_1.expect)(result.originalPath).toBe("./api/analysis");
			(0, globals_1.expect)(result.resolvedPath).toContain("api/analysis");
		});
		(0, globals_1.it)("should identify external packages", async () => {
			const resolver = new graph_1.PathResolver({
				projectRoot: testProjectRoot,
				basePath: (0, node_path_1.resolve)(testProjectRoot, "src"),
			});
			const result = await resolver.resolvePath("react");
			(0, globals_1.expect)(result.resolutionType).toBe("external");
			(0, globals_1.expect)(result.resolvedPath).toBe("react");
		});
		(0, globals_1.it)("should identify builtin modules", async () => {
			const resolver = new graph_1.PathResolver({
				projectRoot: testProjectRoot,
				basePath: (0, node_path_1.resolve)(testProjectRoot, "src"),
			});
			const result = await resolver.resolvePath("fs");
			(0, globals_1.expect)(result.resolutionType).toBe("builtin");
			(0, globals_1.expect)(result.exists).toBe(true);
		});
		(0, globals_1.it)("should handle file extensions", async () => {
			const resolver = new graph_1.PathResolver({
				projectRoot: testProjectRoot,
				basePath: (0, node_path_1.resolve)(testProjectRoot, "src"),
				extensions: [".ts", ".js"],
			});
			const result = await resolver.resolvePath("./api/analysis");
			if (result.exists) {
				(0, globals_1.expect)(result.extension).toMatch(/\.(ts|js)$/);
			}
		});
	});
	(0, globals_1.describe)("High-level API", () => {
		(0, globals_1.it)(
			"should perform complete dependency analysis",
			async () => {
				const result = await (0, graph_1.analyzeDependencyGraph)(
					testProjectRoot,
					["src/index.ts"],
					{
						maxDepth: 3,
						includeExternalDependencies: false,
					},
				);
				(0, globals_1.expect)(result.buildResult).toBeDefined();
				(0, globals_1.expect)(result.analysisResult).toBeDefined();
				(0, globals_1.expect)(
					result.buildResult.graph.nodes.size,
				).toBeGreaterThan(0);
				(0, globals_1.expect)(
					result.buildResult.processedFiles,
				).toBeGreaterThan(0);
				(0, globals_1.expect)(
					typeof result.analysisResult.circularDependencies.totalCycles,
				).toBe("number");
				(0, globals_1.expect)(
					typeof result.analysisResult.dependencyDepth.maxDepth,
				).toBe("number");
			},
		);
		(0, globals_1.it)(
			"should create dependency analyzer with proper state management",
			async () => {
				const analyzer = (0, graph_1.createDependencyAnalyzer)({
					projectRoot: testProjectRoot,
					entryPoints: ["src/index.ts"],
					maxDepth: 2,
				});
				(0, globals_1.expect)(() => analyzer.analyzeGraph()).toThrow();
				(0, globals_1.expect)(() => analyzer.getStatistics()).toThrow();
				await analyzer.buildGraph();
				(0, globals_1.expect)(() => analyzer.analyzeGraph()).not.toThrow();
				(0, globals_1.expect)(() => analyzer.getStatistics()).not.toThrow();
				const stats = analyzer.getStatistics();
				(0, globals_1.expect)(stats.totalFiles).toBeGreaterThan(0);
			},
		);
		(0, globals_1.it)("should handle progress callbacks", async () => {
			let progressCalls = 0;
			let lastFile = "";
			const analyzer = (0, graph_1.createDependencyAnalyzer)({
				projectRoot: testProjectRoot,
				entryPoints: ["src/index.ts"],
				maxDepth: 2,
				onProgress: (current, total, file) => {
					progressCalls++;
					lastFile = file;
					(0, globals_1.expect)(current).toBeGreaterThan(0);
					(0, globals_1.expect)(file).toBeTruthy();
				},
			});
			await analyzer.buildGraph();
			(0, globals_1.expect)(progressCalls).toBeGreaterThan(0);
			(0, globals_1.expect)(lastFile).toBeTruthy();
		});
	});
});
//# sourceMappingURL=graph-analysis.test.js.map
