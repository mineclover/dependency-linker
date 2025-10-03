/**
 * Symbol Dependency Scenario
 *
 * Analyzes symbol-level dependencies (function calls, class instantiation, type references)
 * for TypeScript and JavaScript. Extends basic-structure for file context.
 */

import type { ScenarioSpec } from "../types";

export const symbolDependencySpec: ScenarioSpec = {
	// ===== Identity =====
	id: "symbol-dependency",
	name: "Symbol Dependency Analysis",
	description:
		"Analyzes symbol-level dependencies including function calls, class instantiation, and type references",
	version: "1.0.0",

	// ===== Dependencies =====
	extends: ["basic-structure"],

	// ===== Type Specifications =====
	nodeTypes: [
		{
			name: "class",
			description: "Class definition",
		},
		{
			name: "function",
			description: "Function definition",
		},
		{
			name: "interface",
			description: "TypeScript interface",
		},
		{
			name: "type-alias",
			description: "TypeScript type alias",
		},
		{
			name: "symbol",
			description: "Generic code symbol",
		},
	],

	edgeTypes: [
		{
			name: "calls",
			description: "Function/method call relationship",
			parent: "uses",
		},
		{
			name: "instantiates",
			description: "Class instantiation (new operator)",
			parent: "uses",
		},
		{
			name: "type-references",
			description: "TypeScript type reference",
			parent: "uses",
		},
		{
			name: "extends-class",
			description: "Class inheritance",
			isHierarchical: true,
			isInheritable: true,
		},
		{
			name: "implements-interface",
			description: "Interface implementation",
		},
		{
			name: "uses",
			description: "Generic usage relationship",
			isTransitive: true,
		},
		{
			name: "defines",
			description: "File defines symbol",
		},
	],

	semanticTags: [
		{
			name: "entry-symbol",
			category: "role",
			description: "Entry point symbol (main function, init, etc.)",
		},
		{
			name: "utility",
			category: "role",
			description: "Utility function or helper",
		},
	],

	// ===== Analyzer Configuration =====
	analyzer: {
		className: "SymbolDependencyAnalyzer",
		config: {
			// Symbol types to track
			trackCalls: true,
			trackInstantiations: true,
			trackTypeReferences: true,
			trackInheritance: true,
			// Scope for analysis
			includeBuiltins: false,
			includeNodeModules: false,
		},
	},
};
