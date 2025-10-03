/**
 * File Dependency Scenario
 *
 * Analyzes file-level import/require dependencies for TypeScript and JavaScript.
 * Extends basic-structure to build upon file nodes.
 */

import type { ScenarioSpec } from "../types";

export const fileDependencySpec: ScenarioSpec = {
	// ===== Identity =====
	id: "file-dependency",
	name: "File Dependency Analysis",
	description:
		"Analyzes file-level import/require dependencies for TypeScript and JavaScript",
	version: "1.0.0",

	// ===== Dependencies =====
	extends: ["basic-structure"],

	// ===== Type Specifications =====
	nodeTypes: [
		{
			name: "library",
			description: "External library or package",
			defaultProperties: {
				isExternal: true,
			},
		},
		{
			name: "module",
			description: "JavaScript/TypeScript module",
		},
	],

	edgeTypes: [
		{
			name: "imports_file",
			description: "File imports another file (relative import)",
			parent: "depends_on",
		},
		{
			name: "imports_library",
			description: "File imports external library",
			parent: "depends_on",
		},
		{
			name: "depends_on",
			description: "Generic dependency relationship",
			isTransitive: true,
		},
		{
			name: "exports",
			description: "File exports symbol",
		},
	],

	semanticTags: [
		{
			name: "entry-point",
			category: "role",
			description: "Application entry point",
		},
		{
			name: "dependency",
			category: "type",
			description: "File with dependencies",
		},
	],

	// ===== Analyzer Configuration =====
	analyzer: {
		className: "FileDependencyAnalyzer",
		config: {
			// Supported import patterns
			importPatterns: ["import", "require", "import()"],
			// Whether to resolve library versions
			resolveLibraryVersions: false,
			// Whether to track exports
			trackExports: true,
		},
	},
};
