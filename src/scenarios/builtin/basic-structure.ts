/**
 * Basic Structure Scenario
 *
 * Foundational scenario that creates file nodes and basic structure for all languages.
 * This is the base scenario that all other scenarios typically extend.
 */

import type { ScenarioSpec } from "../types";

export const basicStructureSpec: ScenarioSpec = {
	// ===== Identity =====
	id: "basic-structure",
	name: "Basic Code Structure",
	description:
		"Extracts basic code structure elements (files, directories) for all languages",
	version: "1.0.0",

	// ===== Type Specifications =====
	nodeTypes: [
		{
			name: "file",
			description: "Source code file",
			defaultProperties: {
				exists: true,
			},
		},
		{
			name: "directory",
			description: "Directory containing files",
		},
	],

	edgeTypes: [
		{
			name: "contains",
			description: "Containment relationship (directory contains file)",
			isHierarchical: true,
		},
	],

	semanticTags: [
		{
			name: "source",
			category: "type",
			description: "Source code file",
		},
		{
			name: "test",
			category: "type",
			description: "Test file",
		},
		{
			name: "config",
			category: "type",
			description: "Configuration file",
		},
	],

	// ===== Analyzer Configuration =====
	analyzer: {
		className: "BasicStructureAnalyzer",
		config: {
			// File path patterns for semantic tagging
			testPatterns: ["**/*.test.*", "**/*.spec.*", "**/tests/**"],
			configPatterns: ["**/*.config.*", "**/config/**"],
		},
	},
};
