import type Parser from "tree-sitter";
import type { SourceLocation } from "../types/export-types";

/**
 * Extract text from a node with caching
 */
const textCache = new Map<Parser.SyntaxNode, string>();

/**
 * Get text content of a node (cached)
 * @param node Tree-sitter node
 * @returns Text content
 */
export function getText(node: Parser.SyntaxNode): string {
	if (textCache.has(node)) {
		const cached = textCache.get(node);
		if (cached !== undefined) {
			return cached;
		}
	}

	const text = node.text;
	textCache.set(node, text);
	return text;
}

/**
 * Clear the text cache
 */
export function clearTextCache(): void {
	textCache.clear();
}

/**
 * Convert tree-sitter position to SourceLocation
 * @param node Tree-sitter node
 * @returns SourceLocation object
 */
export function getSourceLocation(node: Parser.SyntaxNode): SourceLocation {
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
export function hasChildOfType(
	node: Parser.SyntaxNode,
	childType: string,
): boolean {
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
export function getIdentifierName(node: Parser.SyntaxNode): string | undefined {
	if (node.type === "identifier" || node.type === "property_identifier") {
		return getText(node);
	}

	// Look for identifier or property_identifier child
	for (let i = 0; i < node.childCount; i++) {
		const child = node.child(i);
		if (
			child &&
			(child.type === "identifier" || child.type === "property_identifier")
		) {
			return getText(child);
		}
	}

	return undefined;
}

/**
 * Check if a node is an export statement
 * @param node Node to check
 * @returns True if node is an export statement
 */
export function isExportStatement(node: Parser.SyntaxNode): boolean {
	return node.type === "export_statement";
}

/**
 * Check if a node is a function declaration
 * @param node Node to check
 * @returns True if node is a function declaration
 */
export function isFunctionDeclaration(node: Parser.SyntaxNode): boolean {
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
export function isClassDeclaration(node: Parser.SyntaxNode): boolean {
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
export function isVariableDeclaration(node: Parser.SyntaxNode): boolean {
	return (
		node.type === "variable_declaration" || node.type === "lexical_declaration"
	);
}

/**
 * Check if a node is a type declaration (interface, type alias, enum)
 * @param node Node to check
 * @returns True if node is a type declaration
 */
export function isTypeDeclaration(node: Parser.SyntaxNode): boolean {
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
export function getNamedChildren(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
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
export function findAncestor(
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
export function isWithinExport(node: Parser.SyntaxNode): boolean {
	return findAncestor(node, "export_statement") !== undefined;
}

/**
 * Extract visibility modifier from class member
 * @param node Class member node
 * @returns Visibility modifier
 */
export function getVisibility(
	node: Parser.SyntaxNode,
): "public" | "private" | "protected" {
	const text = getText(node);

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
export function isStatic(node: Parser.SyntaxNode): boolean {
	const text = getText(node);
	return text.includes("static");
}

/**
 * Check if a node represents an async function
 * @param node Node to check
 * @returns True if async
 */
export function isAsync(node: Parser.SyntaxNode): boolean {
	const text = getText(node);
	return text.includes("async");
}

/**
 * Get the depth of a node in the AST
 * @param node Node to measure
 * @returns Depth from root
 */
export function getDepth(node: Parser.SyntaxNode): number {
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
export function getChildByType(
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
