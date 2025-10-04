import path from "node:path";
import { createDependencyGraphBuilder } from "../graph/DependencyGraphBuilder";
import type { DependencyGraph, GraphBuildResult } from "../graph/types";
import { configManager } from "./ConfigManager";
import type { NamespaceDependencyResult } from "./types";
import { globalScenarioRegistry, getExecutionOrder } from "../scenarios";

/**
 * Namespace-based dependency analyzer
 * Combines namespace file discovery with dependency analysis
 */
export class NamespaceDependencyAnalyzer {
	/**
	 * Get scenario execution order for a namespace
	 *
	 * @param namespace - Namespace name
	 * @param configPath - Path to namespace configuration
	 * @returns Array of scenario IDs in execution order
	 */
	private async getScenarioExecutionOrder(
		namespace: string,
		configPath: string,
	): Promise<string[]> {
		// Load namespace configuration
		const namespaceConfig = await configManager.loadNamespacedConfig(
			configPath,
			namespace,
		);

		// Get scenarios from config or use defaults (backward compatibility)
		const scenarios = namespaceConfig.scenarios || [
			"basic-structure",
			"file-dependency",
		];

		// Calculate execution order with dependency resolution
		const executionOrder = getExecutionOrder(scenarios);

		return executionOrder;
	}

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

		// Get scenario execution order for this namespace
		const scenarioExecutionOrder = await this.getScenarioExecutionOrder(
			namespace,
			configPath,
		);

		// TODO: In future phases, execute each scenario analyzer
		// For now, log the scenarios that would be executed
		// console.log(`[${namespace}] Scenarios to execute:`, scenarioExecutionOrder);

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
				scenariosExecuted: scenarioExecutionOrder,
			};
		}

		// Convert relative paths to absolute paths for analysis
		const absoluteFiles = namespaceData.files.map((file) =>
			path.resolve(projectRoot, file),
		);

		// Build dependency graph using the new API
		// TODO: Replace with scenario-based analysis in future phases
		const builder = createDependencyGraphBuilder({
			projectRoot,
			projectName: namespaceData.metadata.projectName || "unknown-project",
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
			scenariosExecuted: scenarioExecutionOrder,
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

		// Get scenario execution order for this namespace
		const scenarioExecutionOrder = await this.getScenarioExecutionOrder(
			namespace,
			configPath,
		);

		// TODO: In future phases, execute each scenario analyzer
		// For now, continue with existing DependencyGraphBuilder

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
					scenariosExecuted: scenarioExecutionOrder,
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
		// TODO: Replace with scenario-based analysis in future phases
		const builder = createDependencyGraphBuilder({
			projectRoot,
			projectName: namespaceData.metadata.projectName || "unknown-project",
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
				scenariosExecuted: scenarioExecutionOrder,
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
							error: error instanceof Error ? error.message : String(error),
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

	/**
	 * Analyze all namespaces together to detect cross-namespace dependencies
	 */
	async analyzeAll(
		configPath: string,
		options: {
			cwd?: string;
			projectRoot?: string;
		} = {},
	): Promise<{
		results: Record<string, NamespaceDependencyResult>;
		graph: DependencyGraph;
		crossNamespaceDependencies: Array<{
			sourceNamespace: string;
			targetNamespace: string;
			source: string;
			target: string;
			type: string;
		}>;
	}> {
		const cwd = options.cwd || process.cwd();
		const projectRoot = options.projectRoot || cwd;

		// Get all namespaces from config
		const config = await configManager.loadConfig(configPath);
		const namespaceNames = Object.keys(config.namespaces || {});

		// Collect all files with their namespace and scenario execution order
		const filesByNamespace: Record<string, string[]> = {};
		const scenariosByNamespace: Record<string, string[]> = {};
		const allFiles: string[] = [];

		for (const namespace of namespaceNames) {
			const namespaceData = await configManager.getNamespaceWithFiles(
				namespace,
				configPath,
				cwd,
			);

			const absoluteFiles = namespaceData.files.map((file) =>
				path.resolve(projectRoot, file),
			);

			filesByNamespace[namespace] = absoluteFiles;
			allFiles.push(...absoluteFiles);

			// Get scenario execution order for this namespace
			const scenarioExecutionOrder = await this.getScenarioExecutionOrder(
				namespace,
				configPath,
			);
			scenariosByNamespace[namespace] = scenarioExecutionOrder;
		}

		// Build unified dependency graph with all files
		const builder = createDependencyGraphBuilder({
			projectRoot,
			entryPoints: allFiles,
		});

		const buildResult: GraphBuildResult = await builder.build();

		// Analyze results per namespace
		const results: Record<string, NamespaceDependencyResult> = {};

		for (const namespace of namespaceNames) {
			const namespaceFiles = filesByNamespace[namespace];
			const namespaceFileSet = new Set(namespaceFiles);

			// Count nodes and edges for this namespace
			let namespaceNodes = 0;
			let namespaceEdges = 0;

			for (const [nodePath, _] of buildResult.graph.nodes) {
				if (namespaceFileSet.has(nodePath)) {
					namespaceNodes++;
				}
			}

			for (const edge of buildResult.graph.edges) {
				if (namespaceFileSet.has(edge.from)) {
					namespaceEdges++;
				}
			}

			// Collect errors for this namespace
			const errors = buildResult.errors
				.filter((err) => namespaceFileSet.has(err.filePath))
				.map((err) => ({
					file: path.relative(projectRoot, err.filePath),
					error: err.error,
				}));

			const failedFiles = [...new Set(errors.map((e) => e.file))];

			results[namespace] = {
				namespace,
				totalFiles: namespaceFiles.length,
				analyzedFiles: namespaceFiles.length - failedFiles.length,
				failedFiles,
				errors,
				graphStats: {
					nodes: namespaceNodes,
					edges: namespaceEdges,
					circularDependencies:
						buildResult.analysis.circularDependencies.totalCycles,
				},
				scenariosExecuted: scenariosByNamespace[namespace],
			};
		}

		// Detect cross-namespace dependencies
		const crossDeps: Array<{
			sourceNamespace: string;
			targetNamespace: string;
			source: string;
			target: string;
			type: string;
		}> = [];

		for (const edge of buildResult.graph.edges) {
			// Find namespaces for source and target
			let sourceNamespace = "unknown";
			let targetNamespace = "unknown";

			for (const [namespace, files] of Object.entries(filesByNamespace)) {
				if (files.includes(edge.from)) {
					sourceNamespace = namespace;
				}
				if (files.includes(edge.to)) {
					targetNamespace = namespace;
				}
			}

			// Only include if namespaces are different
			if (sourceNamespace !== targetNamespace) {
				crossDeps.push({
					sourceNamespace,
					targetNamespace,
					source: path.relative(projectRoot, edge.from),
					target: path.relative(projectRoot, edge.to),
					type: edge.type,
				});
			}
		}

		return {
			results,
			graph: buildResult.graph,
			crossNamespaceDependencies: crossDeps,
		};
	}
}

export const namespaceDependencyAnalyzer = new NamespaceDependencyAnalyzer();
