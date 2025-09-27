import type Parser from "tree-sitter";
import type {
	ClassExportInfo,
	ClassMethodInfo,
	ClassPropertyInfo,
} from "../types/result-types";
import { ASTTraverser } from "../utils/ASTTraverser";
import { NodeUtils } from "../utils/NodeUtils";

/**
 * Information about class inheritance
 */
export interface InheritanceInfo {
	superClass?: string;
	implementsInterfaces?: string[];
}

/**
 * Information about class members
 */
export interface ClassMemberInfo {
	methods: ClassMethodInfo[];
	properties: ClassPropertyInfo[];
}

/**
 * Analyzer for extracting detailed class information
 */
export class ClassAnalyzer {
	/**
	 * Extract complete class information
	 * @param classNode Class declaration node
	 * @param className Name of the class
	 * @param isDefaultExport Whether this is a default export
	 * @returns Complete class export information
	 */
	extractClassInfo(
		classNode: Parser.SyntaxNode,
		className: string,
		isDefaultExport: boolean = false,
	): ClassExportInfo {
		const inheritance = this.extractInheritance(classNode);
		const members = this.extractMembers(classNode);

		return {
			className,
			location: NodeUtils.getSourceLocation(classNode),
			methods: members.methods,
			properties: members.properties,
			isDefaultExport,
			superClass: inheritance.superClass,
			implementsInterfaces: inheritance.implementsInterfaces,
		};
	}

	/**
	 * Extract class members (methods and properties)
	 * @param classNode Class declaration node
	 * @returns Class member information
	 */
	extractMembers(classNode: Parser.SyntaxNode): ClassMemberInfo {
		const methods: ClassMethodInfo[] = [];
		const properties: ClassPropertyInfo[] = [];

		const classBody = this.findClassBody(classNode);
		if (!classBody) {
			return { methods, properties };
		}

		// Traverse class body to find members
		for (let i = 0; i < classBody.namedChildCount; i++) {
			const member = classBody.namedChild(i);
			if (!member) continue;

			switch (member.type) {
				case "method_definition":
				case "function_declaration": {
					const methodInfo = this.extractMethodInfo(member);
					if (methodInfo) {
						methods.push(methodInfo);
					}
					break;
				}

				case "field_definition":
				case "property_declaration":
				case "public_field_definition": {
					const propertyInfo = this.extractPropertyInfo(member);
					if (propertyInfo) {
						properties.push(propertyInfo);
					}
					break;
				}

				case "constructor_declaration": {
					// Constructor is a special case of method
					const constructorInfo = this.extractConstructorInfo(member);
					if (constructorInfo) {
						methods.push(constructorInfo);
					}
					break;
				}
			}
		}

		return { methods, properties };
	}

	/**
	 * Extract inheritance information (extends and implements)
	 * @param classNode Class declaration node
	 * @returns Inheritance information
	 */
	extractInheritance(classNode: Parser.SyntaxNode): InheritanceInfo {
		const inheritance: InheritanceInfo = {};

		// Look for class heritage clause
		const heritage = this.findClassHeritage(classNode);
		if (heritage) {
			inheritance.superClass = this.extractSuperClass(heritage);
			inheritance.implementsInterfaces =
				this.extractImplementsInterfaces(heritage);
		}

		return inheritance;
	}

	/**
	 * Find class body node
	 */
	private findClassBody(
		classNode: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		return ASTTraverser.findNode(
			classNode,
			(node) => node.type === "class_body" || node.type === "declaration_list",
		);
	}

	/**
	 * Find class heritage clause (extends/implements)
	 */
	private findClassHeritage(
		classNode: Parser.SyntaxNode,
	): Parser.SyntaxNode | undefined {
		return ASTTraverser.findNode(
			classNode,
			(node) =>
				node.type === "class_heritage" ||
				node.type === "extends_clause" ||
				node.type === "implements_clause",
		);
	}

	/**
	 * Extract super class from heritage clause
	 */
	private extractSuperClass(heritage: Parser.SyntaxNode): string | undefined {
		// Look for extends clause
		const extendsClause = ASTTraverser.findNode(
			heritage,
			(node) => node.type === "extends_clause",
		);

		if (extendsClause) {
			const identifier = ASTTraverser.findNode(
				extendsClause,
				(node) => node.type === "identifier",
			);
			return identifier ? identifier.text : undefined;
		}

		// Alternative: direct identifier after 'extends'
		const text = heritage.text;
		const extendsMatch = text.match(/extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
		return extendsMatch ? extendsMatch[1] : undefined;
	}

	/**
	 * Extract implemented interfaces from heritage clause
	 */
	private extractImplementsInterfaces(
		heritage: Parser.SyntaxNode,
	): string[] | undefined {
		const interfaces: string[] = [];

		// Look for implements clause
		const implementsClause = ASTTraverser.findNode(
			heritage,
			(node) => node.type === "implements_clause",
		);

		if (implementsClause) {
			const identifiers = ASTTraverser.findNodesByType(
				implementsClause,
				"identifier",
			);
			interfaces.push(...identifiers.map((id) => id.text));
		} else {
			// Alternative: parse from text
			const text = heritage.text;
			const implementsMatch = text.match(/implements\s+([^{]+)/);
			if (implementsMatch) {
				const interfaceList = implementsMatch[1].trim();
				interfaces.push(
					...interfaceList.split(",").map((iface) => iface.trim()),
				);
			}
		}

		return interfaces.length > 0 ? interfaces : undefined;
	}

	/**
	 * Extract method information
	 */
	private extractMethodInfo(
		methodNode: Parser.SyntaxNode,
	): ClassMethodInfo | undefined {
		const name = NodeUtils.getIdentifierName(methodNode);
		if (!name) {
			return undefined;
		}

		return {
			name,
			isStatic: NodeUtils.isStatic(methodNode),
			isAsync: NodeUtils.isAsync(methodNode),
			visibility: NodeUtils.getVisibility(methodNode),
			parameters: this.extractMethodParameters(methodNode),
			returnType: this.extractMethodReturnType(methodNode),
			location: NodeUtils.getSourceLocation(methodNode),
		};
	}

	/**
	 * Extract constructor information
	 */
	private extractConstructorInfo(
		constructorNode: Parser.SyntaxNode,
	): ClassMethodInfo | undefined {
		return {
			name: "constructor",
			isStatic: false,
			isAsync: false,
			visibility: "public",
			parameters: this.extractMethodParameters(constructorNode),
			returnType: undefined, // Constructors don't have return types
			location: NodeUtils.getSourceLocation(constructorNode),
		};
	}

	/**
	 * Extract property information
	 */
	private extractPropertyInfo(
		propertyNode: Parser.SyntaxNode,
	): ClassPropertyInfo | undefined {
		const name = NodeUtils.getIdentifierName(propertyNode);
		if (!name) {
			return undefined;
		}

		return {
			name,
			isStatic: NodeUtils.isStatic(propertyNode),
			visibility: NodeUtils.getVisibility(propertyNode),
			type: this.extractPropertyType(propertyNode),
			initialValue: this.extractPropertyInitialValue(propertyNode),
			location: NodeUtils.getSourceLocation(propertyNode),
		};
	}

	/**
	 * Extract method parameters
	 */
	private extractMethodParameters(
		methodNode: Parser.SyntaxNode,
	): ClassMethodInfo["parameters"] {
		const parameters: ClassMethodInfo["parameters"] = [];

		const paramsNode = ASTTraverser.findNode(
			methodNode,
			(node) => node.type === "formal_parameters" || node.type === "parameters",
		);

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
	 * Extract parameter information from parameter node
	 */
	private extractParameterInfo(
		paramNode: Parser.SyntaxNode,
	): ClassMethodInfo["parameters"][0] | undefined {
		const name = NodeUtils.getIdentifierName(paramNode);
		if (!name) {
			return undefined;
		}

		return {
			name,
			type: this.extractParameterType(paramNode),
			optional: this.isOptionalParameter(paramNode),
			defaultValue: this.extractParameterDefaultValue(paramNode),
		};
	}

	/**
	 * Extract parameter type
	 */
	private extractParameterType(
		paramNode: Parser.SyntaxNode,
	): string | undefined {
		const typeAnnotation = ASTTraverser.findNode(
			paramNode,
			(node) => node.type === "type_annotation",
		);

		if (typeAnnotation) {
			return typeAnnotation.text.replace(/^:\s*/, ""); // Remove leading colon
		}

		// Fallback: try to infer from text
		const text = paramNode.text;
		const typeMatch = text.match(/:\s*([^=,)]+)/);
		return typeMatch ? typeMatch[1].trim() : undefined;
	}

	/**
	 * Check if parameter is optional
	 */
	private isOptionalParameter(paramNode: Parser.SyntaxNode): boolean {
		return (
			paramNode.text.includes("?") ||
			paramNode.text.includes("=") ||
			paramNode.type === "optional_parameter"
		);
	}

	/**
	 * Extract parameter default value
	 */
	private extractParameterDefaultValue(
		paramNode: Parser.SyntaxNode,
	): string | undefined {
		const assignmentPattern = ASTTraverser.findNode(
			paramNode,
			(node) => node.type === "assignment_pattern",
		);

		if (assignmentPattern) {
			// Get the right side of the assignment
			const rightSide = assignmentPattern.namedChild(1);
			return rightSide ? rightSide.text : undefined;
		}

		// Fallback: parse from text
		const text = paramNode.text;
		const defaultMatch = text.match(/=\s*([^,)]+)/);
		return defaultMatch ? defaultMatch[1].trim() : undefined;
	}

	/**
	 * Extract method return type
	 */
	private extractMethodReturnType(
		methodNode: Parser.SyntaxNode,
	): string | undefined {
		const typeAnnotation = ASTTraverser.findNode(
			methodNode,
			(node) => node.type === "type_annotation",
		);

		if (typeAnnotation) {
			return typeAnnotation.text.replace(/^:\s*/, ""); // Remove leading colon
		}

		// Fallback: parse from text (look for ): returnType pattern)
		const text = methodNode.text;
		const returnTypeMatch = text.match(/\):\s*([^{]+)/);
		return returnTypeMatch ? returnTypeMatch[1].trim() : undefined;
	}

	/**
	 * Extract property type
	 */
	private extractPropertyType(
		propertyNode: Parser.SyntaxNode,
	): string | undefined {
		const typeAnnotation = ASTTraverser.findNode(
			propertyNode,
			(node) => node.type === "type_annotation",
		);

		if (typeAnnotation) {
			return typeAnnotation.text.replace(/^:\s*/, ""); // Remove leading colon
		}

		// Fallback: infer from text
		const text = propertyNode.text;
		const typeMatch = text.match(/:\s*([^=;]+)/);
		return typeMatch ? typeMatch[1].trim() : undefined;
	}

	/**
	 * Extract property initial value
	 */
	private extractPropertyInitialValue(
		propertyNode: Parser.SyntaxNode,
	): string | undefined {
		// Look for assignment or initializer
		const text = propertyNode.text;
		const assignmentMatch = text.match(/=\s*([^;]+)/);
		return assignmentMatch ? assignmentMatch[1].trim() : undefined;
	}
}
