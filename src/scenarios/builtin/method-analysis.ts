/**
 * Method Analysis Scenario
 *
 * Analyzes method definitions, complexity, parameters, return types, and method interactions.
 * Extends symbol-dependency to build upon class and function nodes.
 */

import type { ScenarioSpec } from "../types";

export const methodAnalysisSpec: ScenarioSpec = {
	// ===== Identity =====
	id: "method-analysis",
	name: "Method Analysis",
	description:
		"Analyzes method definitions, complexity metrics, call patterns, parameters, and return types",
	version: "1.0.0",

	// ===== Dependencies =====
	extends: ["symbol-dependency"], // Builds on class, function, and symbol nodes

	// ===== Type Specifications =====
	nodeTypes: [
		{
			name: "method",
			description:
				"Method definition (class method, object method, or top-level function)",
			defaultProperties: {
				isStatic: false,
				isAsync: false,
				isPrivate: false,
				visibility: "public",
				cyclomaticComplexity: 1,
				linesOfCode: 0,
			},
		},
		{
			name: "field",
			description: "Class field or property",
			defaultProperties: {
				isStatic: false,
				isReadonly: false,
			},
		},
	],

	edgeTypes: [
		// ===== File/Class Relationships (reuse existing 'defines') =====
		// Note: 'defines' edge from symbol-dependency is reused
		// - file → method (file defines method)
		// - file → class (file defines class) - already in symbol-dependency

		// ===== Class-Method Relationships =====
		{
			name: "contains-method",
			description: "Class contains method",
			parent: "defines",
			isHierarchical: true,
		},

		// ===== Method-Method Relationships =====
		{
			name: "calls-method",
			description: "Method calls another method",
			parent: "calls", // Extends the generic 'calls' from symbol-dependency
			isTransitive: true,
		},
		{
			name: "overrides-method",
			description: "Method overrides parent class method",
			parent: "extends-class",
			isInheritable: true,
		},

		// ===== Method-Type Relationships =====
		{
			name: "uses-type",
			description: "Method uses type in signature or body",
			parent: "type-references", // Extends type-references from symbol-dependency
		},

		// ===== Method-Field Relationships =====
		{
			name: "accesses-field",
			description: "Method accesses class field",
			parent: "uses",
		},

		// ===== Exception Handling =====
		{
			name: "throws",
			description: "Method throws exception",
		},
	],

	semanticTags: [
		// ===== Role Tags =====
		{
			name: "accessor",
			category: "role",
			description: "Getter or setter method",
			autoTagRules: {
				nodeType: "method",
				propertyConditions: {
					isGetter: true,
				},
			},
		},
		{
			name: "constructor",
			category: "role",
			description: "Constructor method",
			autoTagRules: {
				nodeType: "method",
				propertyConditions: {
					isConstructor: true,
				},
			},
		},
		{
			name: "entry-method",
			category: "role",
			description: "Entry point method (main, init, setup)",
		},

		// ===== Type Tags =====
		{
			name: "static-method",
			category: "type",
			description: "Static method",
			autoTagRules: {
				nodeType: "method",
				propertyConditions: {
					isStatic: true,
				},
			},
		},
		{
			name: "async-method",
			category: "type",
			description: "Asynchronous method",
			autoTagRules: {
				nodeType: "method",
				propertyConditions: {
					isAsync: true,
				},
			},
		},

		// ===== Quality Tags =====
		{
			name: "high-complexity",
			category: "quality",
			description: "Method with high cyclomatic complexity (CC > 10)",
			autoTagRules: {
				nodeType: "method",
				propertyConditions: {
					cyclomaticComplexity: 10, // Greater than threshold
				},
			},
		},
		{
			name: "pure-function",
			category: "quality",
			description: "Pure function with no side effects",
		},

		// ===== Pattern Tags =====
		{
			name: "recursive",
			category: "pattern",
			description: "Recursive method (calls itself)",
		},
	],

	// ===== Analyzer Configuration =====
	analyzer: {
		className: "MethodAnalyzer",
		config: {
			// Complexity thresholds
			complexityThreshold: {
				low: 5,
				medium: 10,
				high: 20,
			},

			// Method size metrics
			methodSizeMetrics: {
				maxLinesOfCode: 50,
				maxParameters: 5,
				maxNestingDepth: 4,
			},

			// Analysis scope
			includePrivateMethods: true,
			includeStaticMethods: true,
			includeConstructors: true,

			// Pattern detection
			detectPureFunctions: true,
			detectRecursion: true,
			detectAccessorPatterns: true,

			// Supported languages
			languages: ["typescript", "tsx", "javascript", "jsx"],
		},
	},

	// ===== Inference Rules =====
	inferenceRules: [
		{
			id: "method-override-chain",
			name: "Method Override Chain Tracking",
			type: "transitive",
			edgeTypes: ["overrides-method"],
			config: {
				maxDepth: 10,
				description:
					"Track method override chains through inheritance hierarchy",
			},
		},
		{
			id: "call-graph-transitive",
			name: "Method Call Graph Transitive Closure",
			type: "transitive",
			edgeTypes: ["calls-method"],
			config: {
				detectCycles: true,
				description:
					"Build transitive call graph (A calls B, B calls C => A depends on C)",
			},
		},
		{
			id: "data-flow-inference",
			name: "Data Flow Through Fields",
			type: "custom",
			edgeTypes: ["accesses-field"],
			config: {
				trackFieldDependencies: true,
				description:
					"Infer data flow: method A writes field X, method B reads field X => A influences B",
			},
		},
	],
};
