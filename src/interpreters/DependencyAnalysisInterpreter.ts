/**
 * DependencyAnalysisInterpreter - Built-in interpreter for dependency analysis
 * Processes extracted dependency data to provide analysis insights
 */

import type {
	DependencyExtractionResult,
	DependencyInfo,
} from "../extractors/DependencyExtractor";
import type {
	IDataInterpreter,
	InterpreterConfiguration,
	InterpreterContext,
	InterpreterDependency,
	InterpreterMetadata,
	OutputSchema,
	ValidationResult,
} from "./IDataInterpreter";

export interface DependencyAnalysisResult {
	summary: {
		totalDependencies: number;
		externalDependencies: number;
		internalDependencies: number;
		devDependencies: number;
		typeOnlyImports: number;
		circularDependencies: string[];
		unusedImports: string[];
		missingDependencies: string[];
	};
	dependencyGraph: {
		nodes: DependencyNode[];
		edges: DependencyEdge[];
	};
	insights: {
		riskFactors: RiskFactor[];
		recommendations: Recommendation[];
		metrics: {
			dependencyCoupling: number;
			modularity: number;
			stability: number;
		};
	};
}

export interface DependencyNode {
	id: string;
	name: string;
	type: "internal" | "external" | "builtin";
	importCount: number;
	exportCount: number;
	size?: number;
}

export interface DependencyEdge {
	from: string;
	to: string;
	type: "import" | "export" | "require" | "dynamic";
	weight: number;
}

export interface RiskFactor {
	type:
		| "high_coupling"
		| "circular_dependency"
		| "large_dependency"
		| "outdated_dependency";
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	affectedModules: string[];
	recommendation: string;
}

export interface Recommendation {
	type: "optimization" | "refactoring" | "security" | "maintenance";
	priority: "low" | "medium" | "high";
	title: string;
	description: string;
	implementation: string;
	estimatedEffort: "low" | "medium" | "high";
}

export class DependencyAnalysisInterpreter
	implements
		IDataInterpreter<DependencyExtractionResult, DependencyAnalysisResult>
{
	public readonly name = "DependencyAnalysisInterpreter";
	public readonly version = "1.0.0";
	public readonly description =
		"Interprets dependency extraction data to provide analysis insights";

	interpret(
		input: DependencyExtractionResult,
		_context: InterpreterContext,
	): DependencyAnalysisResult {
		// Handle both direct array and wrapped object format
		const dependencies = Array.isArray(input)
			? input
			: input?.dependencies || [];

		// Build dependency graph
		const dependencyGraph = this.buildDependencyGraph(dependencies);

		// Analyze dependency patterns
		const summary = this.analyzeDependencySummary(
			dependencies,
			dependencyGraph,
		);

		// Generate insights and recommendations
		const insights = this.generateInsights(
			dependencies,
			dependencyGraph,
			summary,
		);

		return {
			summary,
			dependencyGraph,
			insights,
		};
	}

	private buildDependencyGraph(
		dependencies: DependencyInfo[],
	): DependencyAnalysisResult["dependencyGraph"] {
		const nodes = new Map<string, DependencyNode>();
		const edges: DependencyEdge[] = [];

		// Create nodes for each dependency
		dependencies.forEach((dep) => {
			const nodeId = dep.source;

			if (!nodes.has(nodeId)) {
				nodes.set(nodeId, {
					id: nodeId,
					name: dep.source,
					type: this.classifyDependencyType(dep.source),
					importCount: 0,
					exportCount: 0,
				});
			}

			const node = nodes.get(nodeId);
			if (!node) {
				return;
			}

			// Update counts based on dependency type
			if (
				dep.type === "import" ||
				dep.type === "require" ||
				dep.type === "dynamic"
			) {
				node.importCount++;
			} else if (dep.type === "export") {
				node.exportCount++;
			}

			// Create edges for each specifier
			dep.specifiers.forEach((_specifier) => {
				edges.push({
					from: "current_file", // This would be the current file being analyzed
					to: nodeId,
					type: dep.type,
					weight: 1,
				});
			});
		});

		return {
			nodes: Array.from(nodes.values()),
			edges,
		};
	}

	private classifyDependencyType(
		source: string,
	): "internal" | "external" | "builtin" {
		// Relative paths are internal dependencies
		if (source.startsWith("./") || source.startsWith("../")) {
			return "internal";
		}

		// Node.js built-in modules
		const builtinModules = [
			"fs",
			"path",
			"crypto",
			"http",
			"https",
			"url",
			"util",
			"os",
			"events",
			"stream",
			"buffer",
			"process",
			"child_process",
		];

		if (builtinModules.includes(source)) {
			return "builtin";
		}

		// Everything else is external
		return "external";
	}

	private analyzeDependencySummary(
		dependencies: DependencyInfo[],
		graph: DependencyAnalysisResult["dependencyGraph"],
	): DependencyAnalysisResult["summary"] {
		const externalDeps = graph.nodes.filter((n) => n.type === "external");
		const internalDeps = graph.nodes.filter((n) => n.type === "internal");
		const typeOnlyImports = dependencies.filter((d) => d.isTypeOnly);

		// Simple circular dependency detection (would need more sophisticated algorithm for real implementation)
		const circularDependencies = this.detectCircularDependencies(graph);

		// Detect unused imports (simplified - would need more context in real implementation)
		const unusedImports = this.detectUnusedImports(dependencies);

		// Detect missing dependencies (simplified)
		const missingDependencies = this.detectMissingDependencies(dependencies);

		return {
			totalDependencies: dependencies.length,
			externalDependencies: externalDeps.length,
			internalDependencies: internalDeps.length,
			devDependencies: 0, // Would need package.json context to determine
			typeOnlyImports: typeOnlyImports.length,
			circularDependencies,
			unusedImports,
			missingDependencies,
		};
	}

	private detectCircularDependencies(
		_graph: DependencyAnalysisResult["dependencyGraph"],
	): string[] {
		// Simplified circular dependency detection
		// In a real implementation, this would use DFS or other graph algorithms
		const circular: string[] = [];

		// This is a placeholder - real implementation would require more sophisticated analysis
		return circular;
	}

	private detectUnusedImports(dependencies: DependencyInfo[]): string[] {
		// Simplified unused import detection
		// In a real implementation, this would analyze usage patterns
		const unused: string[] = [];

		// Look for imports with empty specifiers or specific patterns
		dependencies.forEach((dep) => {
			if (dep.specifiers.length === 0 && dep.type === "import") {
				unused.push(dep.source);
			}
		});

		return unused;
	}

	private detectMissingDependencies(_dependencies: DependencyInfo[]): string[] {
		// Simplified missing dependency detection
		// In a real implementation, this would check against package.json
		const missing: string[] = [];

		// This would require package.json context to implement properly
		return missing;
	}

	private generateInsights(
		dependencies: DependencyInfo[],
		graph: DependencyAnalysisResult["dependencyGraph"],
		summary: DependencyAnalysisResult["summary"],
	): DependencyAnalysisResult["insights"] {
		const riskFactors = this.identifyRiskFactors(dependencies, graph, summary);
		const recommendations = this.generateRecommendations(riskFactors, summary);
		const metrics = this.calculateMetrics(graph, summary);

		return {
			riskFactors,
			recommendations,
			metrics,
		};
	}

	private identifyRiskFactors(
		_dependencies: DependencyInfo[],
		graph: DependencyAnalysisResult["dependencyGraph"],
		summary: DependencyAnalysisResult["summary"],
	): RiskFactor[] {
		const risks: RiskFactor[] = [];

		// High coupling risk
		const avgImportsPerModule =
			graph.nodes.reduce((sum, node) => sum + node.importCount, 0) /
			graph.nodes.length;
		if (avgImportsPerModule > 10) {
			risks.push({
				type: "high_coupling",
				severity: "medium",
				description:
					"High average number of imports per module indicates tight coupling",
				affectedModules: graph.nodes
					.filter((n) => n.importCount > avgImportsPerModule * 1.5)
					.map((n) => n.name),
				recommendation:
					"Consider refactoring to reduce dependencies and improve modularity",
			});
		}

		// Circular dependency risk
		if (summary.circularDependencies.length > 0) {
			risks.push({
				type: "circular_dependency",
				severity: "high",
				description: "Circular dependencies detected in the module graph",
				affectedModules: summary.circularDependencies,
				recommendation:
					"Refactor to break circular dependencies by introducing interfaces or moving shared code",
			});
		}

		// Too many external dependencies
		if (summary.externalDependencies > 20) {
			risks.push({
				type: "large_dependency",
				severity: "medium",
				description:
					"Large number of external dependencies increases security and maintenance risks",
				affectedModules: graph.nodes
					.filter((n) => n.type === "external")
					.map((n) => n.name),
				recommendation:
					"Audit external dependencies and consider consolidating or removing unused ones",
			});
		}

		return risks;
	}

	private generateRecommendations(
		riskFactors: RiskFactor[],
		summary: DependencyAnalysisResult["summary"],
	): Recommendation[] {
		const recommendations: Recommendation[] = [];

		// Type-only import optimization
		if (summary.typeOnlyImports < summary.totalDependencies * 0.3) {
			recommendations.push({
				type: "optimization",
				priority: "medium",
				title: "Increase type-only imports",
				description:
					"Use 'import type' for TypeScript types to improve tree-shaking and bundle size",
				implementation:
					"Replace 'import { Type }' with 'import type { Type }' where appropriate",
				estimatedEffort: "low",
			});
		}

		// Unused import cleanup
		if (summary.unusedImports.length > 0) {
			recommendations.push({
				type: "maintenance",
				priority: "low",
				title: "Remove unused imports",
				description:
					"Clean up unused imports to improve code clarity and build performance",
				implementation: "Remove or refactor unused import statements",
				estimatedEffort: "low",
			});
		}

		// Modularization for high coupling
		const highCouplingRisk = riskFactors.find(
			(r) => r.type === "high_coupling",
		);
		if (highCouplingRisk) {
			recommendations.push({
				type: "refactoring",
				priority: "high",
				title: "Improve module separation",
				description:
					"Reduce coupling between modules to improve maintainability",
				implementation:
					"Extract common functionality into shared modules or use dependency injection",
				estimatedEffort: "high",
			});
		}

		return recommendations;
	}

	private calculateMetrics(
		graph: DependencyAnalysisResult["dependencyGraph"],
		summary: DependencyAnalysisResult["summary"],
	): DependencyAnalysisResult["insights"]["metrics"] {
		// Dependency coupling metric (simplified)
		const totalConnections = graph.edges.length;
		const totalPossibleConnections =
			graph.nodes.length * (graph.nodes.length - 1);
		const dependencyCoupling =
			totalPossibleConnections > 0
				? totalConnections / totalPossibleConnections
				: 0;

		// Modularity metric (simplified)
		const internalRatio =
			summary.totalDependencies > 0
				? summary.internalDependencies / summary.totalDependencies
				: 0;
		const modularity = Math.max(
			0,
			1 - dependencyCoupling + internalRatio * 0.5,
		);

		// Stability metric (simplified)
		const externalRatio =
			summary.totalDependencies > 0
				? summary.externalDependencies / summary.totalDependencies
				: 0;
		const stability = Math.max(
			0,
			1 - externalRatio - summary.circularDependencies.length * 0.1,
		);

		return {
			dependencyCoupling: Math.round(dependencyCoupling * 100) / 100,
			modularity: Math.round(modularity * 100) / 100,
			stability: Math.round(stability * 100) / 100,
		};
	}

	supports(inputType: string): boolean {
		return inputType === "DependencyExtractionResult";
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(_input: DependencyExtractionResult): ValidationResult {
		return {
			isValid: true,
			errors: [],
			warnings: [],
		};
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				summary: { type: "object" },
				dependencyGraph: { type: "object" },
				insights: { type: "object" },
			},
			required: ["summary", "dependencyGraph", "insights"],
			version: "1.0.0",
		};
	}

	getMetadata(): InterpreterMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedDataTypes: ["DependencyExtractionResult"],
			outputType: "DependencyAnalysisResult",
			dependencies: [],
			performance: {
				averageTimePerItem: 50,
				memoryUsage: "medium" as const,
				timeComplexity: "linear" as const,
				scalability: "good" as const,
				maxRecommendedDataSize: 1000,
			},
			quality: {
				accuracy: 0.9,
				consistency: 0.85,
				completeness: 0.8,
				reliability: 0.88,
			},
		};
	}

	configure(_options: InterpreterConfiguration): void {
		// Configuration implementation
	}

	getConfiguration(): InterpreterConfiguration {
		return {
			enabled: true,
			priority: 1,
			timeout: 30000,
			memoryLimit: 100 * 1024 * 1024,
			defaultOptions: {},
			errorHandling: "lenient",
		};
	}

	getSupportedDataTypes(): string[] {
		return ["DependencyExtractionResult"];
	}

	getDependencies(): InterpreterDependency[] {
		return [];
	}

	dispose(): void {
		// Cleanup implementation
	}
}
