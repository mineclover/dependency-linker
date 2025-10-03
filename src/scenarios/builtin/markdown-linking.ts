/**
 * Markdown Linking Scenario
 *
 * Analyzes markdown document dependencies including links, images, includes,
 * and symbol references. Extends basic-structure for file context.
 */

import type { ScenarioSpec } from "../types";

export const markdownLinkingSpec: ScenarioSpec = {
	// ===== Identity =====
	id: "markdown-linking",
	name: "Markdown Link Analysis",
	description:
		"Analyzes markdown document dependencies including links, images, includes, and references",
	version: "1.0.0",

	// ===== Dependencies =====
	extends: ["basic-structure"],

	// ===== Type Specifications =====
	nodeTypes: [
		{
			name: "markdown-document",
			description: "Markdown document",
		},
		{
			name: "heading-symbol",
			description: "Markdown heading as symbol",
		},
		{
			name: "image-resource",
			description: "Image resource",
		},
		{
			name: "anchor",
			description: "Document anchor/section",
		},
	],

	edgeTypes: [
		{
			name: "md-links-to",
			description: "Markdown document links to another document",
			parent: "references",
		},
		{
			name: "md-embeds-image",
			description: "Markdown embeds image",
			parent: "references",
		},
		{
			name: "md-wiki-links",
			description: "Wiki-style link [[target]]",
			parent: "references",
		},
		{
			name: "md-references-symbol",
			description: "References code symbol (@ClassName)",
			parent: "references",
		},
		{
			name: "md-includes",
			description: "Include directive (<!-- include:path -->)",
			parent: "references",
		},
		{
			name: "md-contains-heading",
			description: "Document contains heading symbol",
			isHierarchical: true,
		},
		{
			name: "md-links-anchor",
			description: "Internal anchor link (#section)",
		},
		{
			name: "references",
			description: "Generic reference relationship",
			isTransitive: true,
		},
	],

	semanticTags: [
		{
			name: "documentation",
			category: "type",
			description: "Documentation file",
		},
		{
			name: "readme",
			category: "type",
			description: "README file",
		},
		{
			name: "index",
			category: "role",
			description: "Index or table of contents",
		},
	],

	// ===== Analyzer Configuration =====
	analyzer: {
		className: "MarkdownLinkingAnalyzer",
		config: {
			// Link patterns to track
			trackStandardLinks: true,
			trackWikiLinks: true,
			trackImages: true,
			trackIncludes: true,
			trackSymbolReferences: true,
			trackAnchors: true,
			trackHeadingSymbols: true,
			trackHashtags: true,
		},
	},
};
