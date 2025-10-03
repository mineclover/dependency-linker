/**
 * Markdown to GraphDB integration
 *
 * Converts markdown dependencies to graph database relationships.
 * Supports all markdown dependency types and creates appropriate edge types.
 */

import type { GraphDatabase } from "../database/GraphDatabase";
import type {
	MarkdownDependency,
	MarkdownDependencyType,
	MarkdownExtractionResult,
} from "../core/markdown-types";
import type { SupportedLanguage } from "../core/types";
import { extractMarkdownDependencies } from "../core/MarkdownDependencyExtractor";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Markdown edge type mapping to GraphDB edge types
 */
const MARKDOWN_EDGE_TYPES: Record<
	MarkdownDependencyType,
	{
		name: string;
		description: string;
		isTransitive?: boolean;
		isHierarchical?: boolean;
	}
> = {
	link: {
		name: "md-link",
		description: "Markdown standard link reference",
		isTransitive: true,
	},
	image: {
		name: "md-image",
		description: "Markdown image reference",
	},
	wikilink: {
		name: "md-wikilink",
		description: "Wiki-style link reference",
		isTransitive: true,
	},
	"symbol-reference": {
		name: "md-symbol-ref",
		description: "Symbol reference in markdown (@ClassName)",
		isTransitive: true,
	},
	include: {
		name: "md-include",
		description: "File include directive",
		isTransitive: true,
	},
	"code-block-reference": {
		name: "md-code-ref",
		description: "Code block file reference",
	},
	anchor: {
		name: "md-anchor",
		description: "Internal anchor link",
	},
	hashtag: {
		name: "md-hashtag",
		description: "Hashtag reference (#tag, #태그)",
		isTransitive: false,
	},
};

/**
 * Register markdown edge types in GraphDB
 */
export async function registerMarkdownEdgeTypes(
	db: GraphDatabase,
): Promise<void> {
	// Register dependency edge types
	for (const [type, config] of Object.entries(MARKDOWN_EDGE_TYPES)) {
		await db.createEdgeType({
			name: config.name,
			description: config.description,
			isTransitive: config.isTransitive || false,
			isHierarchical: config.isHierarchical || false,
			isInheritable: false,
		});
	}

	// Register heading symbol edge type
	await db.createEdgeType({
		name: "md-contains-heading",
		description: "Markdown file contains heading symbol with semantic types",
		isTransitive: false,
		isHierarchical: true,
		isInheritable: false,
	});
}

/**
 * Options for markdown to graph conversion
 */
export interface MarkdownToGraphOptions {
	/** Base directory for resolving relative paths */
	baseDir?: string;

	/** Session ID for tracking analysis */
	sessionId?: string;

	/** Whether to skip external URLs */
	skipExternalUrls?: boolean;

	/** Whether to create nodes for missing targets */
	createMissingNodes?: boolean;

	/** Custom metadata to attach to relationships */
	metadata?: Record<string, unknown>;
}

/**
 * Convert markdown file to graph nodes and relationships
 */
export async function markdownFileToGraph(
	db: GraphDatabase,
	filePath: string,
	options: MarkdownToGraphOptions = {},
): Promise<{
	nodesCreated: number;
	relationshipsCreated: number;
	result: MarkdownExtractionResult;
}> {
	// Read file content
	const content = fs.readFileSync(filePath, "utf-8");

	// Extract dependencies
	const result = extractMarkdownDependencies(filePath, content);

	// Convert to graph
	return markdownResultToGraph(db, result, options);
}

/**
 * Convert markdown extraction result to graph nodes and relationships
 */
export async function markdownResultToGraph(
	db: GraphDatabase,
	result: MarkdownExtractionResult,
	options: MarkdownToGraphOptions = {},
): Promise<{
	nodesCreated: number;
	relationshipsCreated: number;
	result: MarkdownExtractionResult;
}> {
	let nodesCreated = 0;
	let relationshipsCreated = 0;

	const {
		baseDir = process.cwd(),
		sessionId,
		skipExternalUrls = true,
		createMissingNodes = true,
		metadata = {},
	} = options;

	// Create or update source node (markdown file)
	const sourceNodeId = await db.upsertNode({
		identifier: `file:${result.filePath}`,
		type: "file",
		name: path.basename(result.filePath),
		sourceFile: result.filePath,
		language: result.language,
		metadata: {
			...(result.frontMatter || {}),
			headingCount: result.headings?.length || 0,
		},
	});
	nodesCreated++;

	// Process each dependency
	for (const dep of result.dependencies) {
		// Skip external URLs if requested
		if (skipExternalUrls && dep.isExternal) {
			continue;
		}

		// Resolve target path
		const targetPath = resolveTargetPath(dep.to, result.filePath, baseDir);

		// Create or update target node
		let targetNodeId: number;

		if (dep.isExternal) {
			// External URL node
			targetNodeId = await db.upsertNode({
				identifier: `external:${dep.to}`,
				type: "external-resource",
				name: dep.to,
				sourceFile: result.filePath,
				language: "external" as SupportedLanguage,
				metadata: {
					url: dep.to,
					...(dep.text ? { linkText: dep.text } : {}),
				},
			});
		} else if (dep.type === "symbol-reference") {
			// Symbol reference node
			targetNodeId = await db.upsertNode({
				identifier: `symbol:${dep.to}`,
				type: "symbol",
				name: dep.to,
				sourceFile: result.filePath,
				language: result.language,
				metadata: {
					namePath: dep.to,
					referencedFrom: result.filePath,
				},
			});
		} else {
			// File/resource node
			const targetExists = fs.existsSync(targetPath);

			if (!targetExists && !createMissingNodes) {
				continue;
			}

			targetNodeId = await db.upsertNode({
				identifier: `file:${targetPath}`,
				type: targetExists ? "file" : "missing-file",
				name: path.basename(targetPath),
				sourceFile: targetPath,
				language: targetExists ? ("markdown" as SupportedLanguage) : ("unknown" as SupportedLanguage),
				metadata: {
					exists: targetExists,
					...(dep.type === "image" ? { resourceType: "image" } : {}),
				},
			});
		}

		nodesCreated++;

		// Get edge type configuration
		const edgeConfig = MARKDOWN_EDGE_TYPES[dep.type];

		// Create relationship
		await db.upsertRelationship({
			fromNodeId: sourceNodeId,
			toNodeId: targetNodeId,
			type: edgeConfig.name,
			metadata: {
				line: dep.location.line,
				column: dep.location.column,
				...(dep.text ? { text: dep.text } : {}),
				...(dep.context ? { context: dep.context } : {}),
				...(dep.metadata || {}),
				...metadata,
			},
		});

		relationshipsCreated++;
	}

	// Process headings as symbols with semantic types
	if (result.headings && result.headings.length > 0) {
		for (const heading of result.headings) {
			// Create heading symbol node
			const headingText = heading.cleanText || heading.text;
			const headingIdentifier = `heading:${result.filePath}#${headingText}`;

			const headingNodeId = await db.upsertNode({
				identifier: headingIdentifier,
				type: "heading-symbol",
				name: headingText,
				sourceFile: result.filePath,
				language: result.language,
				semanticTags: heading.tags || [],
				metadata: {
					level: heading.level,
					line: heading.line,
					fullText: heading.text,
				},
			});

			nodesCreated++;

			// Create relationship from file to heading
			await db.upsertRelationship({
				fromNodeId: sourceNodeId,
				toNodeId: headingNodeId,
				type: "md-contains-heading",
				metadata: {
					level: heading.level,
					line: heading.line,
				},
			});

			relationshipsCreated++;
		}
	}

	return {
		nodesCreated,
		relationshipsCreated,
		result,
	};
}

/**
 * Resolve target path relative to source file
 */
function resolveTargetPath(
	target: string,
	sourceFile: string,
	baseDir: string,
): string {
	// If target is absolute or starts with /, use as is
	if (path.isAbsolute(target) || target.startsWith("/")) {
		return path.join(baseDir, target);
	}

	// Resolve relative to source file directory
	const sourceDir = path.dirname(sourceFile);
	return path.resolve(sourceDir, target);
}

/**
 * Batch process multiple markdown files
 */
export async function markdownDirectoryToGraph(
	db: GraphDatabase,
	dirPath: string,
	options: MarkdownToGraphOptions = {},
): Promise<{
	filesProcessed: number;
	totalNodes: number;
	totalRelationships: number;
}> {
	let filesProcessed = 0;
	let totalNodes = 0;
	let totalRelationships = 0;

	// Find all markdown files recursively
	const markdownFiles = findMarkdownFiles(dirPath);

	// Create session for batch operation
	const sessionId =
		options.sessionId ||
		`markdown-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	// Process each file
	for (const filePath of markdownFiles) {
		try {
			const result = await markdownFileToGraph(db, filePath, {
				...options,
				sessionId,
				baseDir: dirPath,
			});

			filesProcessed++;
			totalNodes += result.nodesCreated;
			totalRelationships += result.relationshipsCreated;
		} catch (error) {
			console.error(`Error processing ${filePath}:`, error);
		}
	}

	return {
		filesProcessed,
		totalNodes,
		totalRelationships,
	};
}

/**
 * Find all markdown files in directory recursively
 */
function findMarkdownFiles(dirPath: string): string[] {
	const markdownFiles: string[] = [];

	function traverse(currentPath: string) {
		const entries = fs.readdirSync(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and hidden directories
				if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
					traverse(fullPath);
				}
			} else if (entry.isFile()) {
				// Check for markdown extensions
				if (/\.(md|markdown|mdx)$/i.test(entry.name)) {
					markdownFiles.push(fullPath);
				}
			}
		}
	}

	traverse(dirPath);
	return markdownFiles;
}

/**
 * Query markdown dependencies from GraphDB
 */
export async function queryMarkdownDependencies(
	db: GraphDatabase,
	filePath: string,
): Promise<Array<{ type: string; target: string; metadata: any }>> {
	// Find source node
	const nodes = await db.findNodes({
		sourceFiles: [filePath],
	});

	if (nodes.length === 0) {
		return [];
	}

	const sourceNode = nodes[0];

	// Find all markdown relationships
	const markdownEdgeTypes = Object.values(MARKDOWN_EDGE_TYPES).map(
		(e) => e.name,
	);

	const relationships = await db.findRelationships({
		relationshipTypes: markdownEdgeTypes,
		sourceFiles: [filePath],
	});

	// Filter relationships that start from our source node
	const sourceRelationships = relationships.filter(
		(r) => r.fromNodeId === sourceNode.id,
	);

	// Get all target node IDs
	const targetNodeIds = sourceRelationships.map((r) => r.toNodeId);

	// Fetch all nodes to build a map
	const allNodes = await db.findNodes({});
	const nodeMap = new Map(allNodes.map((n) => [n.id!, n]));

	// Build result
	return sourceRelationships.map((rel) => {
		const targetNode = nodeMap.get(rel.toNodeId);
		return {
			type: rel.type,
			target: targetNode?.sourceFile || targetNode?.name || "unknown",
			metadata: rel.metadata,
		};
	});
}

/**
 * Query heading symbols by semantic type
 */
export async function queryHeadingsBySemanticType(
	db: GraphDatabase,
	semanticType: string,
): Promise<
	Array<{
		heading: string;
		sourceFile: string;
		level: number;
		line: number;
		allTypes: string[];
	}>
> {
	// Find all heading symbol nodes
	const allNodes = await db.findNodes({});
	const headingNodes = allNodes.filter((n) => n.type === "heading-symbol");

	// Filter by semantic type
	const matchingHeadings = headingNodes
		.filter((node) => {
			const types = node.semanticTags || [];
			return Array.isArray(types) && types.includes(semanticType);
		})
		.map((node) => ({
			heading: node.name || "",
			sourceFile: node.sourceFile || "",
			level: (node.metadata?.level as number) || 0,
			line: (node.metadata?.line as number) || 0,
			allTypes: (node.semanticTags as string[]) || [],
		}));

	return matchingHeadings;
}

/**
 * Query headings from specific file
 */
export async function queryFileHeadings(
	db: GraphDatabase,
	filePath: string,
): Promise<
	Array<{
		heading: string;
		level: number;
		line: number;
		semanticTypes: string[];
	}>
> {
	const allNodes = await db.findNodes({
		sourceFiles: [filePath],
	});

	const headingNodes = allNodes.filter((n) => n.type === "heading-symbol");

	return headingNodes
		.map((node) => ({
			heading: node.name || "",
			level: (node.metadata?.level as number) || 0,
			line: (node.metadata?.line as number) || 0,
			semanticTypes: (node.semanticTags as string[]) || [],
		}))
		.sort((a, b) => a.line - b.line);
}

/**
 * Get all semantic types used in the database
 */
export async function getAllSemanticTypes(
	db: GraphDatabase,
): Promise<Map<string, number>> {
	const allNodes = await db.findNodes({});
	const headingNodes = allNodes.filter((n) => n.type === "heading-symbol");

	const typeCounts = new Map<string, number>();

	for (const node of headingNodes) {
		const types = (node.semanticTags as string[]) || [];
		for (const type of types) {
			typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
		}
	}

	return typeCounts;
}
