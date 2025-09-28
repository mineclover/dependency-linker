import type Parser from "tree-sitter";

/**
 * Node visitor function type
 */
export type NodeVisitor = (node: Parser.SyntaxNode) => undefined | boolean;

/**
 * Node predicate function type
 */
export type NodePredicate = (node: Parser.SyntaxNode) => boolean;

/**
 * Traverse AST iteratively (more efficient than recursive for large trees)
 * @param root Root node to start traversal
 * @param visitor Function called for each node. Return false to skip children.
 */
export function traverse(root: Parser.SyntaxNode, visitor: NodeVisitor): void {
	const stack: { node: Parser.SyntaxNode; childIndex: number }[] = [
		{ node: root, childIndex: 0 },
	];

	while (stack.length > 0) {
		const current = stack[stack.length - 1];
		const { node, childIndex } = current;

		// If we've processed all children, pop and continue
		if (childIndex >= node.childCount) {
			stack.pop();
			continue;
		}

		// Process current child
		const child = node.child(childIndex);
		if (child) {
			const shouldTraverseChildren = visitor(child);

			// Move to next sibling
			current.childIndex++;

			// Add child to stack if we should traverse its children
			if (shouldTraverseChildren !== false) {
				stack.push({ node: child, childIndex: 0 });
			}
		} else {
			// No more children, pop current node
			stack.pop();
		}
	}
}

/**
 * Find all nodes matching a predicate
 * @param root Root node to search from
 * @param predicate Function to test each node
 * @returns Array of matching nodes
 */
export function findNodes(
	root: Parser.SyntaxNode,
	predicate: NodePredicate,
): Parser.SyntaxNode[] {
	const results: Parser.SyntaxNode[] = [];

	traverse(root, (node) => {
		if (predicate(node)) {
			results.push(node);
		}
		return true; // Continue traversal
	});

	return results;
}

/**
 * Find first node matching a predicate
 * @param root Root node to search from
 * @param predicate Function to test each node
 * @returns First matching node or undefined
 */
export function findNode(
	root: Parser.SyntaxNode,
	predicate: NodePredicate,
): Parser.SyntaxNode | undefined {
	let result: Parser.SyntaxNode | undefined;

	traverse(root, (node) => {
		if (predicate(node)) {
			result = node;
			return false; // Stop traversal
		}
		return true; // Continue traversal
	});

	return result;
}

/**
 * Find nodes by type efficiently
 * @param root Root node to search from
 * @param nodeType Type of nodes to find
 * @returns Array of nodes with matching type
 */
export function findNodesByType(
	root: Parser.SyntaxNode,
	nodeType: string,
): Parser.SyntaxNode[] {
	return findNodes(root, (node) => node.type === nodeType);
}

/**
 * Find nodes by multiple types efficiently
 * @param root Root node to search from
 * @param nodeTypes Set of node types to find
 * @returns Array of nodes with matching types
 */
export function findNodesByTypes(
	root: Parser.SyntaxNode,
	nodeTypes: Set<string>,
): Parser.SyntaxNode[] {
	return findNodes(root, (node) => nodeTypes.has(node.type));
}

/**
 * Get all children of a node (direct children only)
 * @param node Parent node
 * @returns Array of direct children
 */
export function getChildren(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
	const children: Parser.SyntaxNode[] = [];
	for (let i = 0; i < node.childCount; i++) {
		const child = node.child(i);
		if (child) {
			children.push(child);
		}
	}
	return children;
}

/**
 * Get children by type
 * @param node Parent node
 * @param nodeType Type of children to find
 * @returns Array of children with matching type
 */
export function getChildrenByType(
	node: Parser.SyntaxNode,
	nodeType: string,
): Parser.SyntaxNode[] {
	return getChildren(node).filter(
		(child) => child.type === nodeType,
	);
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
