import type Parser from "tree-sitter";
import type { ExportMethodInfo } from "../types/result-types";

/**
 * Processing context shared between processors
 */
export interface ProcessingContext {
	/** Source code being analyzed */
	sourceCode: string;

	/** File path being processed */
	filePath: string;

	/** Current class name (if processing within a class) */
	currentClass?: string;

	/** Whether we're inside an export statement */
	isWithinExport: boolean;

	/** Cache for expensive operations */
	cache: Map<string, any>;
}

/**
 * Base interface for all node processors
 */
export interface NodeProcessor {
	/**
	 * Check if this processor can handle the given node type
	 * @param node Tree-sitter node to check
	 * @returns True if this processor can handle the node
	 */
	canProcess(node: Parser.SyntaxNode): boolean;

	/**
	 * Process a node and extract export information
	 * @param node Tree-sitter node to process
	 * @param context Processing context
	 * @returns Array of extracted export information
	 */
	process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[];
}

/**
 * Abstract base class for node processors with common functionality
 */
export abstract class BaseNodeProcessor implements NodeProcessor {
	abstract canProcess(node: Parser.SyntaxNode): boolean;
	abstract process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[];

	/**
	 * Check if node is exported (has export keyword)
	 * @param node Node to check
	 * @param context Processing context
	 * @returns True if node is exported
	 */
	protected isExported(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): boolean {
		// Check if we're within an export statement
		if (context.isWithinExport) {
			return true;
		}

		// Check if the node itself or its parent is an export statement
		let current = node;
		while (current) {
			if (current.type === "export_statement") {
				return true;
			}
			current = current.parent!;
		}

		return false;
	}

	/**
	 * Extract name from an identifier node
	 * @param node Node to extract name from
	 * @returns Name string or undefined
	 */
	protected extractName(node: Parser.SyntaxNode): string | undefined {
		if (
			node.type === "identifier" ||
			node.type === "type_identifier" ||
			node.type === "property_identifier"
		) {
			return node.text;
		}

		// Look for identifier, type_identifier, or property_identifier child
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child &&
				(child.type === "identifier" ||
					child.type === "type_identifier" ||
					child.type === "property_identifier")
			) {
				return child.text;
			}
		}

		return undefined;
	}

	/**
	 * Get cached value or compute and cache it
	 * @param key Cache key
	 * @param context Processing context
	 * @param compute Function to compute value if not cached
	 * @returns Cached or computed value
	 */
	protected getCachedOrCompute<T>(
		key: string,
		context: ProcessingContext,
		compute: () => T,
	): T {
		if (context.cache.has(key)) {
			return context.cache.get(key);
		}

		const value = compute();
		context.cache.set(key, value);
		return value;
	}
}
