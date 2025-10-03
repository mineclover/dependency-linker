/**
 * Scenario System - Core Type Definitions
 *
 * This module defines the complete type system for the Scenario-based analysis architecture.
 * Scenarios are reusable specifications that define analysis methods, including:
 * - Node and Edge types
 * - Semantic tags
 * - Tree-sitter query patterns
 * - Inference rules
 * - Analyzer configuration
 */

/**
 * Node Type Specification
 *
 * Defines a type of node that can be created in the dependency graph.
 */
export interface NodeTypeSpec {
	/** Unique name for this node type (e.g., 'file', 'class', 'function') */
	name: string;

	/** Human-readable description of this node type */
	description: string;

	/** Default properties for nodes of this type */
	defaultProperties?: Record<string, unknown>;
}

/**
 * Edge Type Specification
 *
 * Defines a type of relationship/edge that can be created in the dependency graph.
 */
export interface EdgeTypeSpec {
	/** Unique name for this edge type (e.g., 'imports', 'calls', 'extends') */
	name: string;

	/** Human-readable description of this edge type */
	description: string;

	/** Parent edge type for hierarchical organization (e.g., 'imports_file' parent: 'depends_on') */
	parent?: string;

	/** Whether this edge type supports transitive inference (A→B, B→C ⇒ A→C) */
	isTransitive?: boolean;

	/** Whether this edge type can be inherited through containment relationships */
	isInheritable?: boolean;

	/** Whether this edge type represents hierarchical relationships */
	isHierarchical?: boolean;
}

/**
 * Semantic Tag Specification
 *
 * Defines a semantic tag that can be applied to nodes for contextual classification.
 */
export interface SemanticTagSpec {
	/** Unique name for this semantic tag (e.g., 'ui-component', 'data-model') */
	name: string;

	/** Category for grouping related tags (e.g., 'role', 'layer', 'domain') */
	category: string;

	/** Human-readable description of this semantic tag */
	description: string;

	/** Rules for automatically applying this tag */
	autoTagRules?: {
		/** Node type to match (e.g., 'jsx-component') */
		nodeType?: string;

		/** Edge type to match */
		edgeType?: string;

		/** Path pattern to match (glob or regex) */
		pathPattern?: string;

		/** Property conditions to check */
		propertyConditions?: Record<string, unknown>;
	};
}

/**
 * Query Pattern Specification
 *
 * Defines a tree-sitter query pattern for extracting information from source code.
 */
export interface QueryPatternSpec {
	/** Unique identifier for this query pattern */
	id: string;

	/** Human-readable name for this query */
	name: string;

	/** Languages this query applies to (e.g., ['typescript', 'javascript']) */
	languages: string[];

	/** Tree-sitter query string */
	query: string;

	/** How to process query results */
	processor?: {
		/** Type of processing to apply */
		type: "node" | "edge" | "tag";

		/** Configuration for the processor */
		config?: Record<string, unknown>;
	};
}

/**
 * Inference Rule Specification
 *
 * Defines rules for inferring additional relationships from existing graph data.
 */
export interface InferenceRuleSpec {
	/** Unique identifier for this inference rule */
	id: string;

	/** Human-readable name for this rule */
	name: string;

	/** Type of inference to perform */
	type: "transitive" | "hierarchical" | "inheritable" | "custom";

	/** Edge types this rule applies to */
	edgeTypes: string[];

	/** Configuration for the inference */
	config?: Record<string, unknown>;
}

/**
 * Scenario Specification
 *
 * Complete specification for an analysis scenario, defining all types and behaviors.
 */
export interface ScenarioSpec {
	// ===== Identity =====

	/** Unique identifier for this scenario (e.g., 'react-component', 'file-dependency') */
	id: string;

	/** Human-readable name for this scenario */
	name: string;

	/** Detailed description of what this scenario analyzes */
	description: string;

	/** Semantic version for this scenario (e.g., '1.0.0') */
	version: string;

	// ===== Dependencies =====

	/**
	 * Base scenarios to extend (type inheritance)
	 *
	 * Types from parent scenarios are automatically included.
	 * Execution order ensures parents run before children.
	 *
	 * @example ['basic-structure', 'file-dependency']
	 */
	extends?: string[];

	/**
	 * Required prerequisite scenarios (execution order)
	 *
	 * These scenarios must run before this one, but types are not inherited.
	 *
	 * @example ['symbol-dependency']
	 */
	requires?: string[];

	// ===== Type Specifications =====

	/** Node types this scenario can create */
	nodeTypes: NodeTypeSpec[];

	/** Edge types this scenario can create */
	edgeTypes: EdgeTypeSpec[];

	/** Semantic tags this scenario can apply */
	semanticTags?: SemanticTagSpec[];

	// ===== Analysis Configuration =====

	/** Tree-sitter query patterns for code analysis */
	queryPatterns?: QueryPatternSpec[];

	/** Analyzer implementation details */
	analyzer: {
		/** Class name of the analyzer implementation (e.g., 'ReactDependencyAnalyzer') */
		className: string;

		/** Default configuration for the analyzer */
		config?: Record<string, unknown>;
	};

	/** Inference rules for this scenario */
	inferenceRules?: InferenceRuleSpec[];
}

/**
 * Type Collection
 *
 * Aggregated types from a scenario and its dependencies.
 */
export interface TypeCollection {
	/** All node types (including from extends chain) */
	nodeTypes: Set<string>;

	/** All edge types (including from extends chain) */
	edgeTypes: Set<string>;

	/** All semantic tags (including from extends chain) */
	semanticTags: Set<string>;
}

/**
 * Scenario Validation Result
 */
export interface ScenarioValidationResult {
	/** Whether the scenario is valid */
	valid: boolean;

	/** Validation errors (if any) */
	errors: string[];

	/** Validation warnings (if any) */
	warnings: string[];
}

/**
 * Analysis Result
 *
 * Result from analyzing a file with a scenario.
 */
export interface AnalysisResult {
	/** Nodes created during analysis */
	nodes: Array<{
		type: string;
		identifier: string;
		properties?: Record<string, unknown>;
	}>;

	/** Edges created during analysis */
	edges: Array<{
		type: string;
		from: string;
		to: string;
		properties?: Record<string, unknown>;
	}>;

	/** Semantic tags applied */
	semanticTags?: Array<{
		nodeIdentifier: string;
		tag: string;
	}>;
}
