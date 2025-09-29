import type Parser from "tree-sitter";
import type { ExportMethodInfo } from "../types/result-types";
import { getChildByType } from "../utils/ASTTraverser";
import {
	getIdentifierName,
	getSourceLocation,
	isVariableDeclaration,
} from "../utils/NodeUtils";
import { BaseNodeProcessor, type ProcessingContext } from "./NodeProcessor";

/**
 * Processor for variable exports (const, let, var)
 */
export class VariableProcessor extends BaseNodeProcessor {
	canProcess(node: Parser.SyntaxNode): boolean {
		// Only process variable declarations, not export statements
		// Default exports are handled by DefaultProcessor
		if (isVariableDeclaration(node)) {
			// Check if this is part of a default export
			const parent = node.parent;
			if (parent && parent.type === "export_statement") {
				const exportText = parent.text;
				if (exportText.includes("export default")) {
					return false; // Let DefaultProcessor handle it
				}
			}
			return true;
		}
		return false;
	}

	process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		if (!this.isExported(node, context)) {
			return [];
		}

		const exports: ExportMethodInfo[] = [];

		// Variable declarations can have multiple declarators
		const declarators = this.findVariableDeclarators(node);

		for (const declarator of declarators) {
			const variableExport = this.processVariableDeclarator(
				declarator,
				node,
				context,
			);
			if (variableExport) {
				exports.push(variableExport);
			}
		}

		return exports;
	}

	/**
	 * Find all variable declarators in a variable declaration
	 */
	private findVariableDeclarators(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode[] {
		const declarators: Parser.SyntaxNode[] = [];

		for (let i = 0; i < node.namedChildCount; i++) {
			const child = node.namedChild(i);
			if (child && this.isVariableDeclarator(child)) {
				declarators.push(child);
			}
		}

		return declarators;
	}

	/**
	 * Check if a node is a variable declarator
	 */
	private isVariableDeclarator(node: Parser.SyntaxNode): boolean {
		return (
			node.type === "variable_declarator" ||
			node.type === "identifier" ||
			node.type === "assignment_expression"
		);
	}

	/**
	 * Process a single variable declarator
	 */
	private processVariableDeclarator(
		declarator: Parser.SyntaxNode,
		parent: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo | undefined {
		const name = this.extractVariableName(declarator);
		if (!name) {
			return undefined;
		}

		const variableExport: ExportMethodInfo = {
			name,
			exportType: "variable",
			declarationType: this.getDeclarationType(parent, context),
			location: getSourceLocation(declarator),
		};

		// Try to extract type information
		const typeInfo = this.extractVariableType(declarator);
		if (typeInfo) {
			variableExport.returnType = typeInfo;
		}

		return variableExport;
	}

	/**
	 * Extract variable name from declarator
	 */
	private extractVariableName(
		declarator: Parser.SyntaxNode,
	): string | undefined {
		// Direct identifier
		if (declarator.type === "identifier") {
			return declarator.text;
		}

		// Variable declarator with identifier child
		if (declarator.type === "variable_declarator") {
			const identifierChild = getChildByType(declarator, "identifier");
			if (identifierChild) {
				return identifierChild.text;
			}
		}

		// Assignment expression (name = value)
		if (declarator.type === "assignment_expression") {
			const leftSide = declarator.namedChild(0);
			if (leftSide && leftSide.type === "identifier") {
				return leftSide.text;
			}
		}

		// Destructuring patterns
		if (this.isDestructuringPattern(declarator)) {
			return this.extractDestructuringNames(declarator);
		}

		return getIdentifierName(declarator);
	}

	/**
	 * Check if node is a destructuring pattern
	 */
	private isDestructuringPattern(node: Parser.SyntaxNode): boolean {
		return node.type === "object_pattern" || node.type === "array_pattern";
	}

	/**
	 * Extract names from destructuring pattern (simplified)
	 */
	private extractDestructuringNames(
		pattern: Parser.SyntaxNode,
	): string | undefined {
		// For simplicity, we'll return the first identifier found
		// In a real implementation, you might want to handle this more comprehensively
		const identifiers = this.findAllIdentifiers(pattern);
		return identifiers.length > 0 ? identifiers[0] : undefined;
	}

	/**
	 * Find all identifiers in a node tree
	 */
	private findAllIdentifiers(node: Parser.SyntaxNode): string[] {
		const identifiers: string[] = [];

		if (node.type === "identifier") {
			identifiers.push(node.text);
		}

		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				identifiers.push(...this.findAllIdentifiers(child));
			}
		}

		return identifiers;
	}

	/**
	 * Extract type information from variable declarator
	 */
	private extractVariableType(
		declarator: Parser.SyntaxNode,
	): string | undefined {
		// Look for type annotation
		const typeAnnotation = this.findTypeAnnotation(declarator);
		if (typeAnnotation) {
			return typeAnnotation.text.replace(/^:\s*/, ""); // Remove leading colon
		}

		// Try to infer type from initializer
		const initializer = this.findInitializer(declarator);
		if (initializer) {
			return this.inferTypeFromInitializer(initializer);
		}

		return undefined;
	}

	/**
	 * Find type annotation in declarator
	 */
	private findTypeAnnotation(
		declarator: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		// Direct type annotation
		for (let i = 0; i < declarator.childCount; i++) {
			const child = declarator.child(i);
			if (child && child.type === "type_annotation") {
				return child;
			}
		}

		// Type annotation in parent
		const parent = declarator.parent;
		if (parent) {
			for (let i = 0; i < parent.childCount; i++) {
				const child = parent.child(i);
				if (child && child.type === "type_annotation") {
					return child;
				}
			}
		}

		return undefined;
	}

	/**
	 * Find initializer (value) in declarator
	 */
	private findInitializer(
		declarator: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		// Look for assignment or initializer
		for (let i = 0; i < declarator.childCount; i++) {
			const child = declarator.child(i);
			if (
				child &&
				(child.type === "assignment_expression" ||
					child.type === "call_expression" ||
					child.type === "arrow_function" ||
					child.type === "function" ||
					child.type === "object_expression" ||
					child.type === "array_expression")
			) {
				return child;
			}
		}

		return undefined;
	}

	/**
	 * Infer type from initializer value (basic inference)
	 */
	private inferTypeFromInitializer(
		initializer: Parser.SyntaxNode,
	): string | undefined {
		switch (initializer.type) {
			case "arrow_function":
			case "function":
				return "function";

			case "call_expression":
				// Could be a function call returning some type
				return this.inferFromCallExpression(initializer);

			case "object_expression":
				return "object";

			case "array_expression":
				return "array";

			case "string":
			case "template_string":
				return "string";

			case "number":
				return "number";

			case "true":
			case "false":
				return "boolean";

			case "null":
				return "null";

			case "undefined":
				return "undefined";

			default:
				return undefined;
		}
	}

	/**
	 * Infer type from call expression (basic)
	 */
	private inferFromCallExpression(
		callExpr: Parser.SyntaxNode,
	): string | undefined {
		const callee = callExpr.namedChild(0);
		if (callee && callee.type === "identifier") {
			const functionName = callee.text;

			// Common patterns
			if (functionName === "require") {
				return "any"; // CommonJS require
			}
			if (functionName === "useState") {
				return "state"; // React useState
			}
			if (functionName === "useCallback" || functionName === "useMemo") {
				return "function"; // React hooks
			}
		}

		return undefined;
	}

	/**
	 * Determine declaration type based on context
	 */
	private getDeclarationType(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo["declarationType"] {
		// Check if it's a default export
		const parent = node.parent;
		if (parent && parent.type === "export_statement") {
			const exportText = parent.text;
			if (exportText.includes("export default")) {
				return "default_export";
			}

			// Check if it's a re-export (export { ... })
			if (exportText.includes("export {") || exportText.includes("export{")) {
				return "re_export";
			}

			// If it's an export statement but not default or re-export, it's a named export
			// e.g., export const x = value, export let y = value, export var z = value
			return "named_export";
		}

		// If not within an export statement, check the context
		if (context.isWithinExport) {
			return "named_export";
		}

		// Default fallback
		return "named_export";
	}
}
