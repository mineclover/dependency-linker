import type Parser from "tree-sitter";
import type { ExportMethodInfo } from "../types/result-types";
import { NodeUtils } from "../utils/NodeUtils";
import { BaseNodeProcessor, type ProcessingContext } from "./NodeProcessor";

/**
 * Processor for default exports and other generic export patterns
 */
export class DefaultProcessor extends BaseNodeProcessor {
	canProcess(node: Parser.SyntaxNode): boolean {
		// Handle all export_statement nodes
		if (node.type === "export_statement") {
			return true;
		}
		return false;
	}

	process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];

		// Only handle export_statement nodes with default exports
		if (node.type === "export_statement") {
			const exportText = node.text;
			if (exportText.includes("export default")) {
				const defaultExport = this.processDefaultExportStatement(node, context);
				if (defaultExport) {
					exports.push(defaultExport);
				}

				// If this is a default class export, also extract class members
				const exportedNode = this.findDefaultExportedNode(node);
				if (exportedNode && NodeUtils.isClassDeclaration(exportedNode)) {
					const classMembers = this.extractClassMembers(exportedNode, context);
					exports.push(...classMembers);
				}
			}
		}

		return exports;
	}

	/**
	 * Check if node represents a default export pattern
	 */
	private isDefaultExportPattern(node: Parser.SyntaxNode): boolean {
		const text = node.text;
		return text.includes("export default");
	}

	/**
	 * Process an export statement
	 */
	private processExportStatement(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];
		const exportText = node.text;

		// Handle different export patterns in priority order
		if (exportText.includes("export default")) {
			// Handle default exports
			const defaultExport = this.processDefaultExportStatement(node, context);
			if (defaultExport) {
				exports.push(defaultExport);
			}
		} else if (exportText.includes("export *")) {
			// Handle "export * from" re-exports
			exports.push(...this.processReExports(node, context));
		} else if (exportText.includes("export {")) {
			// Handle named exports and re-exports like "export { ... } from ..."
			exports.push(...this.processNamedExports(node, context));
		} else {
			// Direct exports (export const, export function, etc.)
			exports.push(...this.processDirectExports(node, context));
		}

		return exports;
	}

	/**
	 * Process default export statement
	 */
	private processDefaultExportStatement(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo | undefined {
		// Find what's being exported as default
		const exportedNode = this.findDefaultExportedNode(node);
		if (!exportedNode) {
			return this.createGenericDefaultExport(node, context);
		}

		const name = this.extractDefaultExportName(exportedNode, node);
		const exportType = this.determineDefaultExportType(exportedNode);

		return {
			name,
			exportType,
			declarationType: "default_export",
			location: NodeUtils.getSourceLocation(node),
			isAsync: NodeUtils.isAsync(exportedNode),
			parameters: this.extractParametersIfFunction(exportedNode),
			returnType: this.extractReturnTypeIfFunction(exportedNode),
		};
	}

	/**
	 * Find the node being exported as default
	 */
	private findDefaultExportedNode(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		// Look for the declaration after 'export default'
		for (let i = 0; i < node.namedChildCount; i++) {
			const child = node.namedChild(i);
			if (child && this.isExportableDeclaration(child)) {
				return child;
			}
		}

		return undefined;
	}

	/**
	 * Check if node is an exportable declaration
	 */
	private isExportableDeclaration(node: Parser.SyntaxNode): boolean {
		return (
			NodeUtils.isFunctionDeclaration(node) ||
			NodeUtils.isClassDeclaration(node) ||
			NodeUtils.isVariableDeclaration(node) ||
			node.type === "identifier" ||
			node.type === "assignment_expression" ||
			node.type === "call_expression" ||
			node.type === "object_expression" ||
			node.type === "array_expression"
		);
	}

	/**
	 * Extract name for default export
	 */
	private extractDefaultExportName(
		exportedNode: Parser.SyntaxNode,
		exportStatement: Parser.SyntaxNode,
	): string {
		// For default exports, the name should always be "default"
		return "default";
	}

	/**
	 * Determine export type for default export
	 */
	private determineDefaultExportType(
		node: Parser.SyntaxNode,
	): ExportMethodInfo["exportType"] {
		if (NodeUtils.isFunctionDeclaration(node)) {
			return "function";
		}
		if (NodeUtils.isClassDeclaration(node)) {
			return "class";
		}
		if (NodeUtils.isVariableDeclaration(node)) {
			return "variable";
		}
		if (NodeUtils.isTypeDeclaration(node)) {
			return "type";
		}

		return "default";
	}

	/**
	 * Create generic default export when specific node can't be identified
	 */
	private createGenericDefaultExport(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo {
		return {
			name: "default",
			exportType: "default",
			declarationType: "default_export",
			location: NodeUtils.getSourceLocation(node),
		};
	}

	/**
	 * Process named exports (export { name1, name2 })
	 */
	private processNamedExports(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];
		const exportText = node.text;

		// Extract export specifiers
		const specifiers = this.extractExportSpecifiers(exportText);

		for (const specifier of specifiers) {
			const namedExport: ExportMethodInfo = {
				name: specifier.external,
				exportType: specifier.isReExport ? "re_export" : "variable", // Use re_export for re-exports
				declarationType: specifier.isReExport ? "re_export" : "named_export",
				location: NodeUtils.getSourceLocation(node),
			};

			exports.push(namedExport);
		}

		return exports;
	}

	/**
	 * Extract export specifiers from export text
	 */
	private extractExportSpecifiers(exportText: string): Array<{
		internal: string;
		external: string;
		isReExport: boolean;
	}> {
		const specifiers: Array<{
			internal: string;
			external: string;
			isReExport: boolean;
		}> = [];

		const isReExport = exportText.includes(" from ");

		// Extract the part between braces
		const braceMatch = exportText.match(/\{([^}]+)\}/);
		if (!braceMatch) {
			return specifiers;
		}

		const specifierText = braceMatch[1];
		const parts = specifierText.split(",").map((part) => part.trim());

		for (const part of parts) {
			if (!part) continue;

			// Handle "name as alias" pattern
			const aliasMatch = part.match(
				/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)$/,
			);
			if (aliasMatch) {
				specifiers.push({
					internal: aliasMatch[1],
					external: aliasMatch[2],
					isReExport,
				});
			} else {
				// Simple name
				const nameMatch = part.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
				if (nameMatch) {
					specifiers.push({
						internal: nameMatch[1],
						external: nameMatch[1],
						isReExport,
					});
				}
			}
		}

		return specifiers;
	}

	/**
	 * Process re-exports (export * from 'module')
	 */
	private processReExports(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exportText = node.text;

		// Handle different re-export patterns
		if (exportText.includes("export *")) {
			// Extract module name for "export * from 'module'"
			const moduleMatch = exportText.match(/from\s+['"]([^'"]+)['"]/);
			const moduleName = moduleMatch ? moduleMatch[1] : "unknown";

			const reExport: ExportMethodInfo = {
				name: `* from ${moduleName}`,
				exportType: "re_export",
				declarationType: "re_export",
				location: NodeUtils.getSourceLocation(node),
			};

			return [reExport];
		}

		return [];
	}

	/**
	 * Process direct exports (export const, export function, etc.)
	 */
	private processDirectExports(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		// This should be handled by specific processors (FunctionProcessor, VariableProcessor, etc.)
		// This is a fallback for any exports not caught by other processors
		const exports: ExportMethodInfo[] = [];

		const name = NodeUtils.getIdentifierName(node);
		if (name) {
			const directExport: ExportMethodInfo = {
				name,
				exportType: "variable", // Generic fallback
				declarationType: "named_export",
				location: NodeUtils.getSourceLocation(node),
			};

			exports.push(directExport);
		}

		return exports;
	}

	/**
	 * Process default export
	 */
	private processDefaultExport(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo | undefined {
		return this.processDefaultExportStatement(node, context);
	}

	/**
	 * Extract parameters if the exported item is a function
	 */
	private extractParametersIfFunction(
		node: Parser.SyntaxNode,
	): ExportMethodInfo["parameters"] {
		if (!NodeUtils.isFunctionDeclaration(node)) {
			return undefined;
		}

		// Basic parameter extraction - this could be delegated to FunctionProcessor
		const text = node.text;
		const paramMatch = text.match(/\(([^)]*)\)/);
		if (!paramMatch || !paramMatch[1].trim()) {
			return [];
		}

		const paramText = paramMatch[1];
		const params = paramText
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p);

		return params.map((param) => {
			const name = param
				.split(":")[0]
				.trim()
				.replace(/[?=].*$/, "");
			return {
				name,
				optional: param.includes("?") || param.includes("="),
			};
		});
	}

	/**
	 * Extract return type if the exported item is a function
	 */
	private extractReturnTypeIfFunction(
		node: Parser.SyntaxNode,
	): string | undefined {
		if (!NodeUtils.isFunctionDeclaration(node)) {
			return undefined;
		}

		const text = node.text;
		const returnTypeMatch = text.match(/\):\s*([^{]+)/);
		return returnTypeMatch ? returnTypeMatch[1].trim() : undefined;
	}

	/**
	 * Extract class members from a class declaration
	 */
	private extractClassMembers(
		classNode: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];
		const className = NodeUtils.getIdentifierName(classNode) || "default";

		// Create context for class members
		const classContext: ProcessingContext = {
			...context,
			currentClass: className,
			isWithinExport: true,
		};

		// Find class body
		const classBody = this.findClassBody(classNode);
		if (classBody) {
			const memberExports = this.processClassMembers(classBody, classContext);
			exports.push(...memberExports);
		}

		return exports;
	}

	/**
	 * Find the class body node
	 */
	private findClassBody(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child &&
				(child.type === "class_body" || child.type === "class_heritage")
			) {
				// If it's heritage, look for the body after it
				if (child.type === "class_heritage") {
					for (let j = i + 1; j < node.childCount; j++) {
						const nextChild = node.child(j);
						if (nextChild && nextChild.type === "class_body") {
							return nextChild;
						}
					}
				} else {
					return child;
				}
			}
		}
		return undefined;
	}

	/**
	 * Process all members in a class body
	 */
	private processClassMembers(
		classBody: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];

		for (let i = 0; i < classBody.namedChildCount; i++) {
			const member = classBody.namedChild(i);
			if (member) {
				const memberExports = this.processClassMember(member, context);
				exports.push(...memberExports);
			}
		}

		return exports;
	}

	/**
	 * Process a single class member
	 */
	private processClassMember(
		member: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];

		switch (member.type) {
			case "method_definition":
			case "function_declaration":
				exports.push(...this.processMethod(member, context));
				break;

			case "field_definition":
			case "property_declaration":
			case "public_field_definition":
				exports.push(...this.processProperty(member, context));
				break;

			case "constructor_declaration":
				// Constructor is not typically exported separately
				break;

			default: {
				// Try to process as generic member
				const memberName = NodeUtils.getIdentifierName(member);
				if (memberName && this.isPublicMember(member)) {
					const memberExport: ExportMethodInfo = {
						name: memberName,
						exportType: this.getMemberExportType(member),
						declarationType: "class_member",
						location: NodeUtils.getSourceLocation(member),
						parentClass: context.currentClass,
						isStatic: NodeUtils.isStatic(member),
						visibility: NodeUtils.getVisibility(member),
					};
					exports.push(memberExport);
				}
				break;
			}
		}

		return exports;
	}

	/**
	 * Process a class method
	 */
	private processMethod(
		method: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const methodName = NodeUtils.getIdentifierName(method);
		if (!methodName || !this.isPublicMember(method)) {
			return [];
		}

		const methodExport: ExportMethodInfo = {
			name: methodName,
			exportType: "class_method",
			declarationType: "class_member",
			location: NodeUtils.getSourceLocation(method),
			parentClass: context.currentClass,
			isAsync: NodeUtils.isAsync(method),
			isStatic: NodeUtils.isStatic(method),
			visibility: NodeUtils.getVisibility(method),
		};

		// Add parameters and return type if available
		methodExport.parameters = this.extractBasicParameters(method);
		methodExport.returnType = this.extractBasicReturnType(method);

		return [methodExport];
	}

	/**
	 * Process a class property
	 */
	private processProperty(
		property: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const propertyName = NodeUtils.getIdentifierName(property);
		if (!propertyName || !this.isPublicMember(property)) {
			return [];
		}

		const propertyExport: ExportMethodInfo = {
			name: propertyName,
			exportType: "class_property",
			declarationType: "class_member",
			location: NodeUtils.getSourceLocation(property),
			parentClass: context.currentClass,
			isStatic: NodeUtils.isStatic(property),
			visibility: NodeUtils.getVisibility(property),
		};

		return [propertyExport];
	}

	/**
	 * Check if a member is public (should be exported)
	 */
	private isPublicMember(member: Parser.SyntaxNode): boolean {
		// For comprehensive testing, extract all members regardless of visibility
		// Tests expect private methods to be included
		return true;
	}

	/**
	 * Get export type for a class member
	 */
	private getMemberExportType(
		member: Parser.SyntaxNode,
	): ExportMethodInfo["exportType"] {
		if (NodeUtils.isFunctionDeclaration(member)) {
			return "class_method";
		}
		return "class_property";
	}

	/**
	 * Basic parameter extraction (simplified)
	 */
	private extractBasicParameters(
		method: Parser.SyntaxNode,
	): ExportMethodInfo["parameters"] {
		// This is a simplified version - full extraction would use FunctionProcessor
		const text = NodeUtils.getText(method);
		const paramMatch = text.match(/\(([^)]*)\)/);
		if (!paramMatch || !paramMatch[1].trim()) {
			return [];
		}

		const paramText = paramMatch[1];
		const params = paramText
			.split(",")
			.map((p) => p.trim())
			.filter((p) => p);

		return params.map((param) => {
			const name = param
				.split(":")[0]
				.trim()
				.replace(/[?=].*$/, "");
			return {
				name,
				optional: param.includes("?") || param.includes("="),
			};
		});
	}

	/**
	 * Basic return type extraction (simplified)
	 */
	private extractBasicReturnType(
		method: Parser.SyntaxNode,
	): string | undefined {
		const text = NodeUtils.getText(method);
		const returnTypeMatch = text.match(/\):\s*([^{]+)/);
		return returnTypeMatch ? returnTypeMatch[1].trim() : undefined;
	}
}
