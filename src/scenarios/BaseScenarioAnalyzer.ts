/**
 * Base Scenario Analyzer
 *
 * Abstract base class for all scenario analyzers, providing:
 * - Standard analyzer interface
 * - Context management for cross-scenario data sharing
 * - Execution hooks for pre/post-processing
 * - Access to scenario configuration and registry
 */

import type { ParseResult } from "../parsers/base";
import type { ScenarioRegistry } from "./ScenarioRegistry";
import type { AnalysisResult, ScenarioSpec, TypeCollection } from "./types";

/**
 * Analysis Context
 *
 * Shared context passed between scenario analyzers for data coordination.
 */
export interface AnalysisContext {
	/** File being analyzed */
	filePath: string;

	/** Source code content */
	sourceCode: string;

	/** Detected language */
	language: string;

	/** Project root directory */
	projectRoot?: string;

	/** Project name for RDF addressing */
	projectName?: string;

	/** Parse result (AST and metadata) */
	parseResult?: ParseResult;

	/** Shared data between scenarios (key-value store) */
	sharedData: Map<string, unknown>;

	/** Results from previous scenario analyzers */
	previousResults: Map<string, AnalysisResult>;

	/** Type collection from current scenario and its dependencies */
	typeCollection: TypeCollection;
}

/**
 * Base Scenario Analyzer
 *
 * All scenario analyzers must extend this class and implement the analyze() method.
 */
export abstract class BaseScenarioAnalyzer {
	protected spec: ScenarioSpec;
	protected registry: ScenarioRegistry;

	constructor(spec: ScenarioSpec, registry: ScenarioRegistry) {
		this.spec = spec;
		this.registry = registry;
	}

	/**
	 * Get scenario specification
	 */
	getSpec(): ScenarioSpec {
		return this.spec;
	}

	/**
	 * Get scenario ID
	 */
	getId(): string {
		return this.spec.id;
	}

	/**
	 * Get analyzer configuration
	 */
	getConfig<T = Record<string, unknown>>(): T {
		return (this.spec.analyzer.config || {}) as T;
	}

	/**
	 * Get type collection for this scenario
	 */
	getTypeCollection(): TypeCollection {
		return this.registry.collectTypes(this.spec.id);
	}

	/**
	 * Execute analysis with hooks
	 *
	 * Orchestrates the analysis lifecycle:
	 * 1. beforeAnalyze hook
	 * 2. analyze implementation
	 * 3. afterAnalyze hook
	 */
	async execute(context: AnalysisContext): Promise<AnalysisResult> {
		// Pre-analysis hook
		await this.beforeAnalyze(context);

		// Main analysis
		const result = await this.analyze(context);

		// Post-analysis hook
		const finalResult = await this.afterAnalyze(context, result);

		// Store result in context for downstream scenarios
		context.previousResults.set(this.spec.id, finalResult);

		return finalResult;
	}

	/**
	 * Hook: Before analysis
	 *
	 * Override to perform setup or validation before analysis.
	 * Default implementation does nothing.
	 */
	protected async beforeAnalyze(context: AnalysisContext): Promise<void> {
		// Default: no-op
	}

	/**
	 * Hook: After analysis
	 *
	 * Override to perform cleanup or result transformation after analysis.
	 * Default implementation returns result unchanged.
	 */
	protected async afterAnalyze(
		context: AnalysisContext,
		result: AnalysisResult,
	): Promise<AnalysisResult> {
		// Default: return result unchanged
		return result;
	}

	/**
	 * Main analysis method
	 *
	 * Must be implemented by concrete scenario analyzers.
	 */
	protected abstract analyze(context: AnalysisContext): Promise<AnalysisResult>;

	/**
	 * Helper: Get data from shared context
	 */
	protected getSharedData<T>(key: string): T | undefined {
		return undefined; // Will be implemented in execute context
	}

	/**
	 * Helper: Set data in shared context
	 */
	protected setSharedData<T>(key: string, value: T): void {
		// Will be implemented in execute context
	}

	/**
	 * Helper: Get result from previous scenario
	 */
	protected getPreviousResult(scenarioId: string): AnalysisResult | undefined {
		return undefined; // Will be implemented in execute context
	}

	/**
	 * Helper: Check if node type is available
	 */
	public hasNodeType(typeName: string): boolean {
		const types = this.getTypeCollection();
		return types.nodeTypes.has(typeName);
	}

	/**
	 * Helper: Check if edge type is available
	 */
	public hasEdgeType(typeName: string): boolean {
		const types = this.getTypeCollection();
		return types.edgeTypes.has(typeName);
	}

	/**
	 * Helper: Check if semantic tag is available
	 */
	public hasSemanticTag(tagName: string): boolean {
		const types = this.getTypeCollection();
		return types.semanticTags.has(tagName);
	}

	/**
	 * Helper: Create empty result
	 */
	public createEmptyResult(): AnalysisResult {
		return {
			nodes: [],
			edges: [],
			semanticTags: [],
		};
	}

	/**
	 * Helper: Merge multiple results
	 */
	public mergeResults(...results: AnalysisResult[]): AnalysisResult {
		return {
			nodes: results.flatMap((r) => r.nodes),
			edges: results.flatMap((r) => r.edges),
			semanticTags: results.flatMap((r) => r.semanticTags || []),
		};
	}
}
