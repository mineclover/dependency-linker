/**
 * Context Document Generator
 *
 * Generates markdown documentation for files and symbols to store
 * metadata and conceptual information that's difficult to capture in code.
 *
 * Design Principles:
 * 1. Unique Identification: Each node (file/symbol) has a unique, predictable identifier
 * 2. Folder Structure: Organized by files/ and symbols/ for clear separation
 * 3. Programmatic Generation: Consistent naming and structure for automation
 * 4. Serena-Compatible: Uses name_path style for symbol identification
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { GraphNode } from "../database/GraphDatabase";

/**
 * Node identifier components
 */
export interface NodeIdentifier {
	/** Relative file path from project root */
	filePath: string;
	/** Symbol name path (Serena style: /ClassName/methodName) */
	symbolPath?: string;
	/** Unique identifier string */
	id: string;
	/** Document file path */
	documentPath: string;
}

/**
 * Context document metadata
 */
export interface ContextDocumentMetadata {
	nodeId: number;
	type: string;
	filePath: string;
	symbolPath?: string;
	namespace?: string;
	language?: string;
	generatedAt: string;
}

/**
 * Context document content
 */
export interface ContextDocument {
	metadata: ContextDocumentMetadata;
	purpose?: string;
	concepts?: string;
	notes?: string;
}

/**
 * Generate unique identifier from file path (mirrored structure)
 *
 * @param filePath Relative file path (e.g., "src/database/GraphDatabase.ts")
 * @returns Same as input for mirrored structure
 */
export function generateFileIdentifier(filePath: string): string {
	return filePath;
}

/**
 * Generate unique identifier from symbol path (mirrored structure)
 *
 * @param filePath Relative file path
 * @param symbolPath Symbol name path (Serena style: /ClassName/methodName)
 * @returns Path for symbol document (e.g., "src/database/GraphDatabase.ts/ClassName__methodName")
 */
export function generateSymbolIdentifier(
	filePath: string,
	symbolPath: string,
): string {
	// Remove leading slash and replace remaining slashes with double underscore
	const symbolId = symbolPath.replace(/^\//, "").replace(/\//g, "__");
	return `${filePath}/${symbolId}`;
}

/**
 * Parse identifier back to components
 *
 * @param identifier File path or symbol path
 * @returns Parsed components
 */
export function parseIdentifier(identifier: string): {
	filePath: string;
	symbolPath?: string;
} {
	// Check if this is a symbol path (contains file directory structure)
	// Symbol paths look like: "src/file.ts/ClassName__method"
	const lastSlashIndex = identifier.lastIndexOf("/");

	if (lastSlashIndex === -1) {
		// No slash, just a filename
		return { filePath: identifier };
	}

	// Check if the last segment contains __
	const lastSegment = identifier.substring(lastSlashIndex + 1);

	if (lastSegment.includes("__")) {
		// This is a symbol path
		const filePath = identifier.substring(0, lastSlashIndex);
		const symbolPath = `/${lastSegment.replace(/__/g, "/")}`;
		return { filePath, symbolPath };
	}

	// Regular file path
	return { filePath: identifier };
}

/**
 * Generate node identifier with mirrored folder structure
 */
export function generateNodeIdentifier(
	projectRoot: string,
	filePath: string,
	symbolPath?: string,
): NodeIdentifier {
	const relativePath = path.relative(projectRoot, filePath);

	if (!symbolPath) {
		// File-level node - mirror the directory structure
		const id = generateFileIdentifier(relativePath);
		return {
			filePath: relativePath,
			id,
			documentPath: path.join(
				projectRoot,
				".dependency-linker/context/files",
				`${id}.md`,
			),
		};
	}

	// Symbol-level node - create subdirectory for file, then symbol docs
	const id = generateSymbolIdentifier(relativePath, symbolPath);
	return {
		filePath: relativePath,
		symbolPath,
		id,
		documentPath: path.join(
			projectRoot,
			".dependency-linker/context/symbols",
			`${id}.md`,
		),
	};
}

/**
 * Generate markdown content for file-level context
 */
export function generateFileContextMarkdown(
	metadata: ContextDocumentMetadata,
	dependencies?: string[],
	dependents?: string[],
): string {
	const lines: string[] = [];

	lines.push(`# File: ${metadata.filePath}`);
	lines.push("");
	lines.push(`**Type**: ${metadata.type}`);
	if (metadata.namespace) {
		lines.push(`**Namespace**: ${metadata.namespace}`);
	}
	if (metadata.language) {
		lines.push(`**Language**: ${metadata.language}`);
	}
	lines.push("");

	lines.push("## Purpose");
	lines.push("[User-editable section for file purpose and responsibilities]");
	lines.push("");

	lines.push("## Key Concepts");
	lines.push("[User-editable section for important concepts and patterns]");
	lines.push("");

	if (dependencies && dependencies.length > 0) {
		lines.push("## Dependencies");
		for (const dep of dependencies) {
			lines.push(`- ${dep}`);
		}
		lines.push("");
	}

	if (dependents && dependents.length > 0) {
		lines.push("## Dependents");
		for (const dep of dependents) {
			lines.push(`- ${dep}`);
		}
		lines.push("");
	}

	lines.push("## Implementation Notes");
	lines.push(
		"[User-editable section for implementation details and decisions]",
	);
	lines.push("");

	lines.push("## Related Documentation");
	lines.push("[Links to related context documents]");
	lines.push("");

	lines.push("---");
	lines.push(`*Generated: ${metadata.generatedAt}*`);
	lines.push(`*Node ID: ${metadata.nodeId}*`);
	lines.push("");

	return lines.join("\n");
}

/**
 * Generate markdown content for symbol-level context
 */
export function generateSymbolContextMarkdown(
	metadata: ContextDocumentMetadata,
	symbolKind?: string,
): string {
	const lines: string[] = [];

	const symbolName = metadata.symbolPath?.split("/").pop() || "Unknown";

	lines.push(`# Symbol: ${symbolName}`);
	lines.push("");
	lines.push(`**File**: ${metadata.filePath}`);
	lines.push(`**Symbol Path**: ${metadata.symbolPath || "/"}`);
	lines.push(`**Type**: ${symbolKind || metadata.type}`);
	if (metadata.namespace) {
		lines.push(`**Namespace**: ${metadata.namespace}`);
	}
	lines.push("");

	lines.push("## Purpose");
	lines.push(
		"[User-editable section describing what this symbol does and why it exists]",
	);
	lines.push("");

	lines.push("## Responsibilities");
	lines.push("[User-editable section listing key responsibilities]");
	lines.push("");

	lines.push("## Key Concepts");
	lines.push(
		"[User-editable section for important concepts, algorithms, or patterns]",
	);
	lines.push("");

	lines.push("## Dependencies");
	lines.push("[Symbols or modules this depends on]");
	lines.push("");

	lines.push("## Usage Examples");
	lines.push("[User-editable section with code examples]");
	lines.push("");

	lines.push("## Implementation Notes");
	lines.push("[User-editable section for technical details and decisions]");
	lines.push("");

	lines.push("## Related Symbols");
	lines.push("[Links to related context documents]");
	lines.push("");

	lines.push("---");
	lines.push(`*Generated: ${metadata.generatedAt}*`);
	lines.push(`*Node ID: ${metadata.nodeId}*`);
	lines.push("");

	return lines.join("\n");
}

/**
 * Context Document Generator class
 */
export class ContextDocumentGenerator {
	constructor(private projectRoot: string) {}

	/**
	 * Ensure context directories exist
	 */
	async ensureDirectories(): Promise<void> {
		const contextDir = path.join(
			this.projectRoot,
			".dependency-linker/context",
		);
		const filesDir = path.join(contextDir, "files");
		const symbolsDir = path.join(contextDir, "symbols");

		await fs.mkdir(filesDir, { recursive: true });
		await fs.mkdir(symbolsDir, { recursive: true });
	}

	/**
	 * Generate context document for a file node
	 */
	async generateFileContext(
		node: GraphNode,
		dependencies?: string[],
		dependents?: string[],
	): Promise<string> {
		await this.ensureDirectories();

		const filePath = node.sourceFile || node.name;
		const identifier = generateNodeIdentifier(this.projectRoot, filePath);

		// Check if document already exists
		try {
			await fs.access(identifier.documentPath);
			// Document exists, don't overwrite user edits
			return identifier.documentPath;
		} catch {
			// Document doesn't exist, create it
		}

		// Ensure parent directory exists (mirrored structure)
		const parentDir = path.dirname(identifier.documentPath);
		await fs.mkdir(parentDir, { recursive: true });

		const metadata: ContextDocumentMetadata = {
			nodeId: node.id!,
			type: node.type,
			filePath,
			namespace: (node.metadata as any)?.namespace,
			language: node.language,
			generatedAt: new Date().toISOString(),
		};

		const content = generateFileContextMarkdown(
			metadata,
			dependencies,
			dependents,
		);

		await fs.writeFile(identifier.documentPath, content, "utf-8");

		return identifier.documentPath;
	}

	/**
	 * Generate context document for a symbol node
	 */
	async generateSymbolContext(
		node: GraphNode,
		symbolPath: string,
		symbolKind?: string,
	): Promise<string> {
		await this.ensureDirectories();

		const filePath = node.sourceFile || node.name;
		const identifier = generateNodeIdentifier(
			this.projectRoot,
			filePath,
			symbolPath,
		);

		// Check if document already exists
		try {
			await fs.access(identifier.documentPath);
			// Document exists, don't overwrite user edits
			return identifier.documentPath;
		} catch {
			// Document doesn't exist, create it
		}

		// Ensure parent directory exists (mirrored structure + file subdirectory)
		const parentDir = path.dirname(identifier.documentPath);
		await fs.mkdir(parentDir, { recursive: true });

		const metadata: ContextDocumentMetadata = {
			nodeId: node.id!,
			type: node.type,
			filePath,
			symbolPath,
			namespace: (node.metadata as any)?.namespace,
			language: node.language,
			generatedAt: new Date().toISOString(),
		};

		const content = generateSymbolContextMarkdown(metadata, symbolKind);

		await fs.writeFile(identifier.documentPath, content, "utf-8");

		return identifier.documentPath;
	}

	/**
	 * Get document path for a node
	 */
	getDocumentPath(filePath: string, symbolPath?: string): string {
		const identifier = generateNodeIdentifier(
			this.projectRoot,
			filePath,
			symbolPath,
		);
		return identifier.documentPath;
	}

	/**
	 * Check if context document exists
	 */
	async documentExists(
		filePath: string,
		symbolPath?: string,
	): Promise<boolean> {
		const docPath = this.getDocumentPath(filePath, symbolPath);
		try {
			await fs.access(docPath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Recursively list all markdown files in a directory
	 */
	private async listMarkdownFiles(dir: string): Promise<string[]> {
		const results: string[] = [];

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					// Recursively search subdirectories
					const subFiles = await this.listMarkdownFiles(fullPath);
					results.push(...subFiles);
				} else if (entry.isFile() && entry.name.endsWith(".md")) {
					// Add markdown file (relative to parent dir)
					results.push(entry.name);
				}
			}
		} catch {
			// Directory doesn't exist yet
		}

		return results;
	}

	/**
	 * List all context documents (recursively in mirrored structure)
	 */
	async listDocuments(): Promise<{
		files: string[];
		symbols: string[];
	}> {
		const filesDir = path.join(
			this.projectRoot,
			".dependency-linker/context/files",
		);
		const symbolsDir = path.join(
			this.projectRoot,
			".dependency-linker/context/symbols",
		);

		const files = await this.listMarkdownFiles(filesDir);
		const symbols = await this.listMarkdownFiles(symbolsDir);

		return { files, symbols };
	}
}

/**
 * Create a context document generator instance
 */
export function createContextDocumentGenerator(
	projectRoot: string,
): ContextDocumentGenerator {
	return new ContextDocumentGenerator(projectRoot);
}
