import type Parser from "tree-sitter";
import type { ParameterInfo } from "../types/export-types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { NodeUtils } from "../utils/NodeUtils";

/**
 * Detailed parameter information with additional metadata
 */
export interface DetailedParameterInfo extends ParameterInfo {
	/** Whether this is a rest parameter (...args) */
	isRest?: boolean;

	/** Whether this parameter is destructured */
	isDestructured?: boolean;

	/** Destructuring pattern details if applicable */
	destructuringPattern?: {
		type: "object" | "array";
		properties: string[];
	};

	/** JSDoc comment for the parameter */
	documentation?: string;
}

/**
 * Analyzer for extracting detailed parameter information from functions and methods
 */
export class ParameterAnalyzer {
	/**
	 * Extract parameters from a function or method node
	 * @param functionNode Function or method declaration node
	 * @returns Array of detailed parameter information
	 */
	extractParameters(functionNode: Parser.SyntaxNode): DetailedParameterInfo[] {
		const parameters: DetailedParameterInfo[] = [];

		const paramsNode = this.findParametersNode(functionNode);
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
	 * Extract return type from a function or method node
	 * @param functionNode Function or method declaration node
	 * @returns Return type string or undefined
	 */
	extractReturnType(functionNode: Parser.SyntaxNode): string | undefined {
		// Look for type annotation after the parameter list
		const typeAnnotation = ASTTraverser.findNode(
			functionNode,
			(node) =>
				node.type === "type_annotation" &&
				this.isReturnTypeAnnotation(node, functionNode),
		);

		if (typeAnnotation) {
			return this.cleanTypeAnnotation(typeAnnotation.text);
		}

		// Fallback: parse from text
		const text = functionNode.text;
		const returnTypeMatch = text.match(/\):\s*([^{=>\s][^{]*?)(?:\s*[{=>]|$)/);
		return returnTypeMatch ? returnTypeMatch[1].trim() : undefined;
	}

	/**
	 * Find the parameters node in a function
	 */
	private findParametersNode(
		functionNode: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		return ASTTraverser.findNode(
			functionNode,
			(node) =>
				node.type === "formal_parameters" ||
				node.type === "parameters" ||
				node.type === "parameter_list",
		);
	}

	/**
	 * Extract detailed information from a parameter node
	 */
	private extractParameterInfo(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo | undefined {
		switch (paramNode.type) {
			case "identifier":
				return this.extractSimpleParameter(paramNode);

			case "required_parameter":
			case "optional_parameter":
				return this.extractTypedParameter(paramNode);

			case "rest_parameter":
				return this.extractRestParameter(paramNode);

			case "object_pattern":
				return this.extractObjectDestructuredParameter(paramNode);

			case "array_pattern":
				return this.extractArrayDestructuredParameter(paramNode);

			case "assignment_pattern":
				return this.extractParameterWithDefault(paramNode);

			default:
				// Try generic extraction
				return this.extractGenericParameter(paramNode);
		}
	}

	/**
	 * Extract simple parameter (just identifier)
	 */
	private extractSimpleParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo {
		return {
			name: paramNode.text,
			optional: false,
		};
	}

	/**
	 * Extract typed parameter (with type annotation)
	 */
	private extractTypedParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo | undefined {
		const name = NodeUtils.getIdentifierName(paramNode);
		if (!name) {
			return undefined;
		}

		const param: DetailedParameterInfo = {
			name,
			optional:
				paramNode.type === "optional_parameter" || paramNode.text.includes("?"),
		};

		// Extract type
		param.type = this.extractParameterType(paramNode);

		// Extract default value
		param.defaultValue = this.extractDefaultValue(paramNode);
		if (param.defaultValue) {
			param.optional = true;
		}

		return param;
	}

	/**
	 * Extract rest parameter (...args)
	 */
	private extractRestParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo | undefined {
		const identifier = ASTTraverser.findNode(
			paramNode,
			(node) => node.type === "identifier",
		);
		if (!identifier) {
			return undefined;
		}

		return {
			name: `...${identifier.text}`,
			optional: true,
			isRest: true,
			type: this.extractParameterType(paramNode),
		};
	}

	/**
	 * Extract object destructured parameter ({ prop1, prop2 })
	 */
	private extractObjectDestructuredParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo {
		const properties = this.extractObjectPatternProperties(paramNode);

		return {
			name: `{ ${properties.join(", ")} }`,
			optional: false,
			isDestructured: true,
			destructuringPattern: {
				type: "object",
				properties,
			},
			type: this.extractParameterType(paramNode),
		};
	}

	/**
	 * Extract array destructured parameter ([item1, item2])
	 */
	private extractArrayDestructuredParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo {
		const properties = this.extractArrayPatternProperties(paramNode);

		return {
			name: `[${properties.join(", ")}]`,
			optional: false,
			isDestructured: true,
			destructuringPattern: {
				type: "array",
				properties,
			},
			type: this.extractParameterType(paramNode),
		};
	}

	/**
	 * Extract parameter with default value (param = defaultValue)
	 */
	private extractParameterWithDefault(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo | undefined {
		const identifier = paramNode.namedChild(0);
		if (!identifier) {
			return undefined;
		}

		const name = NodeUtils.getIdentifierName(identifier);
		if (!name) {
			return undefined;
		}

		const defaultValue = paramNode.namedChild(1);

		return {
			name,
			optional: true,
			type: this.extractParameterType(identifier),
			defaultValue: defaultValue ? defaultValue.text : undefined,
		};
	}

	/**
	 * Extract generic parameter (fallback method)
	 */
	private extractGenericParameter(
		paramNode: Parser.SyntaxNode,
	): DetailedParameterInfo | undefined {
		const name = NodeUtils.getIdentifierName(paramNode);
		if (!name) {
			return undefined;
		}

		return {
			name,
			optional: paramNode.text.includes("?") || paramNode.text.includes("="),
			type: this.extractParameterType(paramNode),
			defaultValue: this.extractDefaultValue(paramNode),
		};
	}

	/**
	 * Extract parameter type from node
	 */
	private extractParameterType(
		paramNode: Parser.SyntaxNode,
	): string | undefined {
		const typeAnnotation = ASTTraverser.findNode(
			paramNode,
			(node) => node.type === "type_annotation",
		);

		if (typeAnnotation) {
			return this.cleanTypeAnnotation(typeAnnotation.text);
		}

		// Try to extract from parameter text
		const text = paramNode.text;
		const typeMatch = text.match(/:\s*([^=,)}\]]+)/);
		return typeMatch ? typeMatch[1].trim() : undefined;
	}

	/**
	 * Extract default value from parameter
	 */
	private extractDefaultValue(
		paramNode: Parser.SyntaxNode,
	): string | undefined {
		const assignmentPattern = ASTTraverser.findNode(
			paramNode,
			(node) => node.type === "assignment_pattern",
		);

		if (assignmentPattern) {
			const defaultValueNode = assignmentPattern.namedChild(1);
			return defaultValueNode ? defaultValueNode.text : undefined;
		}

		// Fallback: parse from text
		const text = paramNode.text;
		const defaultMatch = text.match(/=\s*([^,)}\]]+)/);
		return defaultMatch ? defaultMatch[1].trim() : undefined;
	}

	/**
	 * Extract properties from object pattern
	 */
	private extractObjectPatternProperties(
		objectPattern: Parser.SyntaxNode,
	): string[] {
		const properties: string[] = [];

		for (let i = 0; i < objectPattern.namedChildCount; i++) {
			const child = objectPattern.namedChild(i);
			if (!child) continue;

			switch (child.type) {
				case "shorthand_property_identifier":
				case "identifier":
					properties.push(child.text);
					break;

				case "pair": {
					// Handle property: alias pattern
					const key = child.namedChild(0);
					const value = child.namedChild(1);
					if (key && value) {
						properties.push(`${key.text}: ${value.text}`);
					}
					break;
				}

				case "rest_pattern": {
					const restId = NodeUtils.getIdentifierName(child);
					if (restId) {
						properties.push(`...${restId}`);
					}
					break;
				}
			}
		}

		return properties;
	}

	/**
	 * Extract properties from array pattern
	 */
	private extractArrayPatternProperties(
		arrayPattern: Parser.SyntaxNode,
	): string[] {
		const properties: string[] = [];

		for (let i = 0; i < arrayPattern.namedChildCount; i++) {
			const child = arrayPattern.namedChild(i);
			if (!child) continue;

			if (child.type === "identifier") {
				properties.push(child.text);
			} else if (child.type === "rest_pattern") {
				const restId = NodeUtils.getIdentifierName(child);
				if (restId) {
					properties.push(`...${restId}`);
				}
			} else {
				// For complex patterns, just use the text
				properties.push(child.text);
			}
		}

		return properties;
	}

	/**
	 * Check if a type annotation is for return type (not parameter type)
	 */
	private isReturnTypeAnnotation(
		typeNode: Parser.SyntaxNode,
		functionNode: Parser.SyntaxNode,
	): boolean {
		// Return type annotations typically come after the parameter list
		const paramsNode = this.findParametersNode(functionNode);
		if (!paramsNode) {
			return true; // Assume it's return type if no params found
		}

		// Check if the type annotation comes after the parameters
		return (
			typeNode.startPosition.row > paramsNode.endPosition.row ||
			(typeNode.startPosition.row === paramsNode.endPosition.row &&
				typeNode.startPosition.column > paramsNode.endPosition.column)
		);
	}

	/**
	 * Clean type annotation text (remove leading colon and whitespace)
	 */
	private cleanTypeAnnotation(typeText: string): string {
		return typeText.replace(/^:\s*/, "").trim();
	}

	/**
	 * Extract JSDoc documentation for parameters (if available)
	 * @param functionNode Function node to extract docs from
	 * @returns Map of parameter names to their documentation
	 */
	extractParameterDocumentation(
		functionNode: Parser.SyntaxNode,
	): Map<string, string> {
		const docs = new Map<string, string>();

		// Look for JSDoc comment before the function
		const parent = functionNode.parent;
		if (!parent) {
			return docs;
		}

		// Find comment nodes that precede the function
		for (let i = 0; i < parent.childCount; i++) {
			const child = parent.child(i);
			if (child === functionNode) {
				break;
			}

			if (child && child.type === "comment" && child.text.includes("/**")) {
				this.parseJSDocParameters(child.text, docs);
			}
		}

		return docs;
	}

	/**
	 * Parse JSDoc comment for parameter documentation
	 */
	private parseJSDocParameters(
		jsDocComment: string,
		docs: Map<string, string>,
	): void {
		const paramMatches = jsDocComment.matchAll(
			/@param\s+(?:\{[^}]+\}\s+)?(\w+)\s+(.+)/g,
		);

		for (const match of paramMatches) {
			const paramName = match[1];
			const paramDoc = match[2].trim();
			docs.set(paramName, paramDoc);
		}
	}
}
