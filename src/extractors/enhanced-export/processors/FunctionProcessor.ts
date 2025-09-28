import type Parser from "tree-sitter";
import type { ExportMethodInfo, ParameterInfo } from "../types/result-types";
import {
	isFunctionDeclaration,
	getSourceLocation,
	getIdentifierName,
	isAsync,
	isStatic,
	getVisibility,
} from "../utils/NodeUtils";
import { BaseNodeProcessor, type ProcessingContext } from "./NodeProcessor";

/**
 * Processor for function exports
 */
export class FunctionProcessor extends BaseNodeProcessor {
	canProcess(node: Parser.SyntaxNode): boolean {
		// Check if this is a function declaration directly
		if (isFunctionDeclaration(node)) {
			return true;
		}

		// Check if this is an export statement containing a function declaration
		if (node.type === "export_statement") {
			// Skip default exports - they should be handled by DefaultProcessor
			const exportText = node.text;
			if (exportText.includes("export default")) {
				return false;
			}

			for (let i = 0; i < node.namedChildCount; i++) {
				const child = node.namedChild(i);
				if (child && isFunctionDeclaration(child)) {
					return true;
				}
			}
		}

		return false;
	}

	process(
		node: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		// Extract the actual function declaration node
		const functionNode = this.getFunctionDeclarationNode(node);
		if (!functionNode) {
			return [];
		}

		if (!this.isExported(node, context)) {
			return [];
		}

		const name = this.extractName(functionNode);
		if (!name) {
			return [];
		}

		const exportInfo: ExportMethodInfo = {
			name,
			exportType: "function",
			declarationType: this.getDeclarationType(node, context),
			location: getSourceLocation(functionNode),
			isAsync: isAsync(functionNode),
			parameters: this.extractParameters(functionNode),
			returnType: this.extractReturnType(functionNode),
		};

		// Add parent class if this is a class method
		if (context.currentClass) {
			exportInfo.parentClass = context.currentClass;
			exportInfo.exportType = "class_method";
			exportInfo.declarationType = "class_member";
			exportInfo.isStatic = isStatic(functionNode);
			exportInfo.visibility = getVisibility(functionNode);
		}

		return [exportInfo];
	}

	/**
	 * Extract function parameters
	 */
	private extractParameters(node: Parser.SyntaxNode): ParameterInfo[] {
		const parameters: ParameterInfo[] = [];

		// Find formal_parameters node
		const paramsNode = this.findParametersNode(node);
		if (!paramsNode) {
			return parameters;
		}

		for (let i = 0; i < paramsNode.namedChildCount; i++) {
			const paramNode = paramsNode.namedChild(i);
			if (paramNode) {
				const paramInfo = this.extractParameterInfo(paramNode);
				if (paramInfo) {
					parameters.push(paramInfo);
				}
			}
		}

		return parameters;
	}

	/**
	 * Find the parameters node in a function
	 */
	private findParametersNode(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		// Look for formal_parameters
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (
				child &&
				(child.type === "formal_parameters" || child.type === "parameters")
			) {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * Extract information from a parameter node
	 */
	private extractParameterInfo(
		paramNode: Parser.SyntaxNode,
	): ParameterInfo | undefined {
		// Check if this is a rest parameter by text content (tree-sitter may classify it as required_parameter)
		if (paramNode.text.trim().startsWith("...")) {
			return this.extractRestParameter(paramNode);
		}

		switch (paramNode.type) {
			case "identifier":
				return {
					name: paramNode.text,
					optional: false,
				};

			case "required_parameter":
			case "optional_parameter":
				return this.extractTypedParameter(paramNode);

			case "rest_parameter":
				return this.extractRestParameter(paramNode);

			default: {
				// Try to extract name from children
				const name = getIdentifierName(paramNode);
				if (name) {
					return {
						name,
						optional: paramNode.type.includes("optional"),
					};
				}
				return undefined;
			}
		}
	}

	/**
	 * Extract typed parameter information
	 */
	private extractTypedParameter(
		paramNode: Parser.SyntaxNode,
	): ParameterInfo | undefined {
		const name = getIdentifierName(paramNode);
		if (!name) {
			return undefined;
		}

		const info: ParameterInfo = {
			name,
			optional:
				paramNode.type === "optional_parameter" || paramNode.text.includes("?"),
		};

		// Extract type annotation
		const typeNode = this.findChildByType(paramNode, "type_annotation");
		if (typeNode) {
			info.type = typeNode.text.replace(/^:\s*/, ""); // Remove leading colon
		}

		// Extract default value
		const defaultNode = this.findChildByType(paramNode, "assignment_pattern");
		if (defaultNode) {
			info.defaultValue = defaultNode.text;
			info.optional = true;
		}

		return info;
	}

	/**
	 * Extract rest parameter information
	 */
	private extractRestParameter(
		paramNode: Parser.SyntaxNode,
	): ParameterInfo | undefined {
		let name = getIdentifierName(paramNode);

		// If we can't get the name through NodeUtils, try extracting from text
		if (!name) {
			const text = paramNode.text.trim();
			const match = text.match(/^\.\.\.(\w+)/);
			if (match) {
				name = match[1];
			}
		}

		if (!name) {
			return undefined;
		}

		// Don't add ... prefix if it's already there
		const finalName = name.startsWith("...") ? name : `...${name}`;

		return {
			name: finalName,
			optional: true,
			type: this.extractRestParameterType(paramNode),
		};
	}

	/**
	 * Extract type from rest parameter
	 */
	private extractRestParameterType(
		paramNode: Parser.SyntaxNode,
	): string | undefined {
		const typeNode = this.findChildByType(paramNode, "type_annotation");
		if (typeNode) {
			return typeNode.text.replace(/^:\s*/, "");
		}
		return undefined;
	}

	/**
	 * Extract return type from function
	 */
	private extractReturnType(node: Parser.SyntaxNode): string | undefined {
		const typeNode = this.findChildByType(node, "type_annotation");
		if (typeNode) {
			return typeNode.text.replace(/^:\s*/, ""); // Remove leading colon
		}
		return undefined;
	}

	/**
	 * Find child node by type
	 */
	private findChildByType(
		node: Parser.SyntaxNode,
		type: string,
	): Parser.SyntaxNode | undefined {
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child && child.type === type) {
				return child;
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
		if (context.currentClass) {
			return "class_member";
		}

		// Check if it's a default export
		const parent = node.parent;
		if (parent && parent.type === "export_statement") {
			const exportText = parent.text;
			if (exportText.includes("export default")) {
				return "default_export";
			}
		}

		return "named_export";
	}

	/**
	 * Extract the actual function declaration node from an export statement or return the node if it's already a function
	 */
	private getFunctionDeclarationNode(
		node: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		// If this is already a function declaration, return it
		if (isFunctionDeclaration(node)) {
			return node;
		}

		// If this is an export statement, find the function declaration inside it
		if (node.type === "export_statement") {
			for (let i = 0; i < node.namedChildCount; i++) {
				const child = node.namedChild(i);
				if (child && isFunctionDeclaration(child)) {
					return child;
				}
			}
		}

		return undefined;
	}
}
