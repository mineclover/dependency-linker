import type Parser from "tree-sitter";
import type { SourceLocation } from "../types/export-types";

/**
 * Utility functions for working with tree-sitter nodes
 */
export class NodeUtils {
	/**
	 * Extract text from a node with caching
	 */
	private static textCache = new Map<Parser.SyntaxNode, string>();

	/**
	 * Get text content of a node (cached)
	 * @param node Tree-sitter node
	 * @returns Text content
	 */
	static getText(node: Parser.SyntaxNode): string {
		if (NodeUtils.textCache.has(node)) {
			return NodeUtils.textCache.get(node)!;
		}

		const text = node.text;
		NodeUtils.textCache.set(node, text);
		return text;
	}

	/**
	 * Clear the text cache
	 */
	static clearTextCache(): void {
		NodeUtils.textCache.clear();
	}

	/**
	 * Convert tree-sitter position to SourceLocation
	 * @param node Tree-sitter node
	 * @returns SourceLocation object
	 */
	static getSourceLocation(node: Parser.SyntaxNode): SourceLocation {
		return {
			line: node.startPosition.row + 1, // Convert 0-based to 1-based
			column: node.startPosition.column + 1,
			endLine: node.endPosition.row + 1,
			endColumn: node.endPosition.column + 1,
		};
	}

	/**
	 * Check if a node has a specific child type
	 * @param node Parent node
	 * @param childType Type to search for
	 * @returns True if child type is found
	 */
	static hasChildOfType(node: Parser.SyntaxNode, childType: string): boolean {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.type === childType) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get the name of an identifier node
	 * @param node Node to extract name from
	 * @returns Name string or undefined
	 */
	static getIdentifierName(node: Parser.SyntaxNode): string | undefined {
		if (node.type === "identifier" || node.type === "property_identifier") {
			return NodeUtils.getText(node);
		}

		// Look for identifier or property_identifier child
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child &&
				(child.type === "identifier" || child.type === "property_identifier")
			) {
				return NodeUtils.getText(child);
			}
		}

		return undefined;
	}

	/**
	 * Check if a node is an export statement
	 * @param node Node to check
	 * @returns True if node is an export statement
	 */
	static isExportStatement(node: Parser.SyntaxNode): boolean {
		return node.type === "export_statement";
	}

	/**
	 * Check if a node is a function declaration
	 * @param node Node to check
	 * @returns True if node is a function declaration
	 */
	static isFunctionDeclaration(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "function_declaration" ||
			node.type === "function" ||
			node.type === "arrow_function"
		);
	}

	/**
	 * Check if a node is a class declaration
	 * @param node Node to check
	 * @returns True if node is a class declaration
	 */
	static isClassDeclaration(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "class_declaration" ||
			node.type === "class" ||
			node.type === "abstract_class_declaration"
		);
	}

	/**
	 * Check if a node is a variable declaration
	 * @param node Node to check
	 * @returns True if node is a variable declaration
	 */
	static isVariableDeclaration(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "variable_declaration" ||
			node.type === "lexical_declaration"
		);
	}

	/**
	 * Check if a node is a type declaration (interface, type alias, enum)
	 * @param node Node to check
	 * @returns True if node is a type declaration
	 */
	static isTypeDeclaration(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "interface_declaration" ||
			node.type === "type_alias_declaration" ||
			node.type === "enum_declaration"
		);
	}

	/**
	 * Get all named children of a node
	 * @param node Parent node
	 * @returns Array of named children
	 */
	static getNamedChildren(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
		const children: Parser.SyntaxNode[] = [];
		for (let i = 0; i < node.namedChildCount; i++) {
			const child = node.namedChild(i);
			if (child) {
				children.push(child);
			}
		}
		return children;
	}

	/**
	 * Find the nearest ancestor of a specific type
	 * @param node Starting node
	 * @param ancestorType Type to search for
	 * @returns Ancestor node or undefined
	 */
	static findAncestor(
		node: Parser.SyntaxNode,
		ancestorType: string,
	): Parser.SyntaxNode | undefined {
		let current = node.parent;
		while (current) {
			if (current.type === ancestorType) {
				return current;
			}
			current = current.parent;
		}
		return undefined;
	}

	/**
	 * Check if a node is inside an export statement
	 * @param node Node to check
	 * @returns True if node is within an export
	 */
	static isWithinExport(node: Parser.SyntaxNode): boolean {
		return NodeUtils.findAncestor(node, "export_statement") !== undefined;
	}

	/**
	 * Extract visibility modifier from class member
	 * @param node Class member node
	 * @returns Visibility modifier
	 */
	static getVisibility(
		node: Parser.SyntaxNode,
	): "public" | "private" | "protected" {
		const text = NodeUtils.getText(node);

		if (text.includes("private")) {
			return "private";
		}
		if (text.includes("protected")) {
			return "protected";
		}
		return "public";
	}

	/**
	 * Check if a node represents a static member
	 * @param node Node to check
	 * @returns True if static
	 */
	static isStatic(node: Parser.SyntaxNode): boolean {
		const text = NodeUtils.getText(node);
		return text.includes("static");
	}

	/**
	 * Check if a node represents an async function
	 * @param node Node to check
	 * @returns True if async
	 */
	static isAsync(node: Parser.SyntaxNode): boolean {
		const text = NodeUtils.getText(node);
		return text.includes("async");
	}

	/**
	 * Get the depth of a node in the AST
	 * @param node Node to measure
	 * @returns Depth from root
	 */
	static getDepth(node: Parser.SyntaxNode): number {
		let depth = 0;
		let current = node.parent;
		while (current) {
			depth++;
			current = current.parent;
		}
		return depth;
	}

	/**
	 * Get first child by type
	 * @param node Parent node
	 * @param nodeType Type of child to find
	 * @returns First child with matching type or undefined
	 */
	static getChildByType(
		node: Parser.SyntaxNode,
		nodeType: string,
	): Parser.SyntaxNode | undefined {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.type === nodeType) {
				return child;
			}
		}
		return undefined;
	}
}
