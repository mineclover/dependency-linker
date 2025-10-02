import path from "node:path";
import { createDependencyGraphBuilder } from "../graph/DependencyGraphBuilder";
import type { DependencyGraph, GraphBuildResult } from "../graph/types";
import { configManager } from "./ConfigManager";
import type { NamespaceDependencyResult } from "./types";

/**
 * Namespace-based dependency analyzer
 * Combines namespace file discovery with dependency analysis
 */
export class NamespaceDependencyAnalyzer {
	/**
	 * Analyze all files in a namespace and build dependency graph
	 */
	async analyzeNamespace(
		namespace: string,
		configPath: string,
		options: {
			cwd?: string;
			projectRoot?: string;
		} = {},
	): Promise<NamespaceDependencyResult> {
		const cwd = options.cwd || process.cwd();
		const projectRoot = options.projectRoot || cwd;

		// Get files from namespace configuration
		const namespaceData = await configManager.getNamespaceWithFiles(
			namespace,
			configPath,
			cwd,
		);

		if (namespaceData.fileCount === 0) {
			return {
				namespace,
				totalFiles: 0,
				analyzedFiles: 0,
				failedFiles: [],
				errors: [],
				graphStats: {
					nodes: 0,
					edges: 0,
					circularDependencies: 0,
				},
			};
		}

		// Convert relative paths to absolute paths for analysis
		const absoluteFiles = namespaceData.files.map((file) =>
			path.resolve(projectRoot, file),
		);

		// Build dependency graph using the new API
		const builder = createDependencyGraphBuilder({
			projectRoot,
			entryPoints: absoluteFiles,
		});

		const buildResult: GraphBuildResult = await builder.build();

		// Collect errors
		const errors = buildResult.errors.map((err) => ({
			file: path.relative(projectRoot, err.filePath),
			error: err.error,
		}));

		const failedFiles = [...new Set(errors.map((e) => e.file))];

		return {
			namespace,
			totalFiles: namespaceData.fileCount,
			analyzedFiles: namespaceData.fileCount - failedFiles.length,
			failedFiles,
			errors,
			graphStats: {
				nodes: buildResult.graph.nodes.size,
				edges: buildResult.graph.edges.length,
				circularDependencies:
					buildResult.analysis.circularDependencies.totalCycles,
			},
		};
	}

	/**
	 * Analyze namespace and return the dependency graph
	 */
	async analyzeNamespaceWithGraph(
		namespace: string,
		configPath: string,
		options: {
			cwd?: string;
			projectRoot?: string;
		} = {},
	): Promise<{
		result: NamespaceDependencyResult;
		graph: DependencyGraph;
	}> {
		const cwd = options.cwd || process.cwd();
		const projectRoot = options.projectRoot || cwd;

		// Get files from namespace configuration
		const namespaceData = await configManager.getNamespaceWithFiles(
			namespace,
			configPath,
			cwd,
		);

		if (namespaceData.fileCount === 0) {
			return {
				result: {
					namespace,
					totalFiles: 0,
					analyzedFiles: 0,
					failedFiles: [],
					errors: [],
					graphStats: {
						nodes: 0,
						edges: 0,
						circularDependencies: 0,
					},
				},
				graph: {
					projectRoot,
					nodes: new Map(),
					edges: [],
					metadata: {
						totalFiles: 0,
						analyzedFiles: 0,
						totalDependencies: 0,
						circularDependencies: [],
						unresolvedDependencies: [],
						createdAt: new Date(),
						analysisTime: 0,
					},
				},
			};
		}

		// Convert relative paths to absolute paths for analysis
		const absoluteFiles = namespaceData.files.map((file) =>
			path.resolve(projectRoot, file),
		);

		// Build dependency graph
		const builder = createDependencyGraphBuilder({
			projectRoot,
			entryPoints: absoluteFiles,
		});

		const buildResult: GraphBuildResult = await builder.build();

		// Collect errors
		const errors = buildResult.errors.map((err) => ({
			file: path.relative(projectRoot, err.filePath),
			error: err.error,
		}));

		const failedFiles = [...new Set(errors.map((e) => e.file))];

		return {
			result: {
				namespace,
				totalFiles: namespaceData.fileCount,
				analyzedFiles: namespaceData.fileCount - failedFiles.length,
				failedFiles,
				errors,
				graphStats: {
					nodes: buildResult.graph.nodes.size,
					edges: buildResult.graph.edges.length,
					circularDependencies:
						buildResult.analysis.circularDependencies.totalCycles,
				},
			},
			graph: buildResult.graph,
		};
	}

	/**
	 * Analyze multiple namespaces
	 */
	async analyzeNamespaces(
		namespaces: string[],
		configPath: string,
		options: {
			cwd?: string;
			projectRoot?: string;
		} = {},
	): Promise<Record<string, NamespaceDependencyResult>> {
		const results: Record<string, NamespaceDependencyResult> = {};

		for (const namespace of namespaces) {
			try {
				results[namespace] = await this.analyzeNamespace(
					namespace,
					configPath,
					options,
				);
			} catch (error) {
				results[namespace] = {
					namespace,
					totalFiles: 0,
					analyzedFiles: 0,
					failedFiles: [],
					errors: [
						{
							file: "",
							error:
								error instanceof Error ? error.message : String(error),
						},
					],
					graphStats: {
						nodes: 0,
						edges: 0,
						circularDependencies: 0,
					},
				};
			}
		}

		return results;
	}
}

export const namespaceDependencyAnalyzer = new NamespaceDependencyAnalyzer();
