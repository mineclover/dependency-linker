import path from "node:path";
import { GraphDatabase } from "../database/GraphDatabase";
import type { DependencyGraph } from "../graph/types";

/**
 * GraphDB integration for namespace dependency analysis
 * Simplified implementation using the existing GraphDatabase API
 */
export class NamespaceGraphDB {
	private db: GraphDatabase;

	constructor(dbPath: string) {
		this.db = new GraphDatabase(dbPath);
	}

	/**
	 * Initialize the database
	 */
	async initialize(): Promise<void> {
		await this.db.initialize();
	}

	/**
	 * Store namespace dependency analysis in GraphDB
	 */
	async storeNamespaceDependencies(
		namespace: string,
		graph: DependencyGraph,
		baseDir: string,
	): Promise<void> {
		// Store nodes with namespace metadata
		for (const [nodePath, node] of graph.nodes) {
			const relativePath = path.relative(baseDir, nodePath);

			await this.db.upsertNode({
				identifier: relativePath,
				name: path.basename(relativePath),
				type: node.type,
				sourceFile: relativePath,
				language: node.language || "typescript",
				metadata: {
					namespace,
					exists: node.exists,
					filePath: node.filePath,
				},
			});
		}

		// Store edges
		for (const edge of graph.edges) {
			const sourceRelative = path.relative(baseDir, edge.from);
			const targetRelative = path.relative(baseDir, edge.to);

			// Find node IDs
			const sourceNodes = await this.db.findNodes({
				sourceFiles: [sourceRelative],
			});

			const targetNodes = await this.db.findNodes({
				sourceFiles: [targetRelative],
			});

			if (sourceNodes.length > 0 && targetNodes.length > 0) {
				const sourceId = sourceNodes[0].id;
				const targetId = targetNodes[0].id;

				if (sourceId !== undefined && targetId !== undefined) {
					await this.db.upsertRelationship({
						fromNodeId: sourceId,
						toNodeId: targetId,
						type: edge.type,
						metadata: {
							namespace,
							importStatement: edge.importStatement,
							lineNumber: edge.lineNumber,
						},
						sourceFile: sourceRelative,
					});
				}
			}
		}
	}

	/**
	 * Get namespace dependency statistics
	 */
	async getNamespaceStats(namespace: string): Promise<{
		nodes: number;
		edges: number;
		files: string[];
	}> {
		const stats = await this.db.getStatistics();

		// This is a simplified version - in a real implementation,
		// we would query specifically for namespace nodes
		return {
			nodes: stats.totalNodes,
			edges: stats.totalRelationships,
			files: [],
		};
	}

	/**
	 * Get all files in a namespace
	 */
	async getNamespaceFiles(_namespace: string): Promise<string[]> {
		// Simplified implementation
		const nodes = await this.db.findNodes({});
		return nodes
			.map((n) => n.sourceFile)
			.filter((f): f is string => f !== undefined);
	}

	/**
	 * Get dependencies for files in a namespace
	 */
	async getNamespaceDependencies(_namespace: string): Promise<
		Array<{
			source: string;
			target: string;
			type: string;
		}>
	> {
		// Simplified implementation
		const nodes = await this.db.findNodes({});
		const dependencies: Array<{
			source: string;
			target: string;
			type: string;
		}> = [];

		for (const node of nodes) {
			if (node.id === undefined) continue;

			const deps = await this.db.findNodeDependencies(node.id);

			for (const dep of deps) {
				dependencies.push({
					source: node.sourceFile || "",
					target: dep.sourceFile || "",
					type: dep.type,
				});
			}
		}

		return dependencies;
	}

	/**
	 * Find circular dependencies in namespace
	 */
	async findNamespaceCircularDependencies(
		namespace: string,
	): Promise<string[][]> {
		// Get circular dependencies from the database
		const cycles = await this.db.findCircularDependencies();

		// Convert GraphNode[][] to string[][] using sourceFile paths
		const stringCycles = cycles.map((cycle) =>
			cycle.map((node) => node.sourceFile || "").filter((f) => f !== ""),
		);

		// Remove duplicates
		const uniqueCycles = new Set(
			stringCycles.map((c) => JSON.stringify(c.sort())),
		);
		return Array.from(uniqueCycles).map((c) => JSON.parse(c));
	}

	/**
	 * Get cross-namespace dependencies
	 */
	async getCrossNamespaceDependencies(): Promise<
		Array<{
			sourceNamespace: string;
			targetNamespace: string;
			source: string;
			target: string;
			type: string;
		}>
	> {
		// Simplified implementation
		return [];
	}

	/**
	 * Close the database connection
	 */
	async close(): Promise<void> {
		await this.db.close();
	}
}
