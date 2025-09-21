/**
 * IdentifierExtractor - Built-in extractor for identifier analysis
 * Extracts function declarations, class definitions, variable declarations, and interfaces
 */

import type Parser from "tree-sitter";
import type {
	ExtractorConfiguration,
	ExtractorMetadata,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor";

export interface IdentifierInfo {
	name: string;
	type:
		| "function"
		| "class"
		| "interface"
		| "variable"
		| "constant"
		| "enum"
		| "type";
	visibility: "public" | "private" | "protected" | "default";
	isExported: boolean;
	isAsync?: boolean;
	isStatic?: boolean;
	parameters?: string[];
	returnType?: string;
	location: {
		line: number;
		column: number;
		endLine: number;
		endColumn: number;
	};
}

export interface IdentifierExtractionResult {
	identifiers: IdentifierInfo[];
	totalCount: number;
	functionCount: number;
	classCount: number;
	interfaceCount: number;
	variableCount: number;
	constantCount: number;
	enumCount: number;
	typeCount: number;
	exportedCount: number;
}

export class IdentifierExtractor
	implements IDataExtractor<IdentifierExtractionResult>
{
	public readonly name = "IdentifierExtractor";
	public readonly version = "1.0.0";
	public readonly description =
		"Extracts identifier information from source code";

	extract(tree: Parser.Tree, sourceCode: string): IdentifierExtractionResult {
		const identifiers: IdentifierInfo[] = [];
		const cursor = tree.walk();

		const visit = (node: Parser.SyntaxNode) => {
			// Handle function declarations
			if (
				node.type === "function_declaration" ||
				node.type === "function_signature"
			) {
				const identifier = this.extractFunctionDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle method definitions
			else if (node.type === "method_definition") {
				const identifier = this.extractMethodDefinition(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle class declarations
			else if (node.type === "class_declaration") {
				const identifier = this.extractClassDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle interface declarations
			else if (node.type === "interface_declaration") {
				const identifier = this.extractInterfaceDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle variable declarations
			else if (node.type === "variable_declarator") {
				const identifier = this.extractVariableDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle enum declarations
			else if (node.type === "enum_declaration") {
				const identifier = this.extractEnumDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}
			// Handle type alias declarations
			else if (node.type === "type_alias_declaration") {
				const identifier = this.extractTypeDeclaration(node, sourceCode);
				if (identifier) {
					identifiers.push(identifier);
				}
			}

			// Recursively visit children
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					visit(child);
				}
			}
		};

		visit(cursor.currentNode);

		// Calculate statistics
		const functionCount = identifiers.filter(
			(i) => i.type === "function",
		).length;
		const classCount = identifiers.filter((i) => i.type === "class").length;
		const interfaceCount = identifiers.filter(
			(i) => i.type === "interface",
		).length;
		const variableCount = identifiers.filter(
			(i) => i.type === "variable",
		).length;
		const constantCount = identifiers.filter(
			(i) => i.type === "constant",
		).length;
		const enumCount = identifiers.filter((i) => i.type === "enum").length;
		const typeCount = identifiers.filter((i) => i.type === "type").length;
		const exportedCount = identifiers.filter((i) => i.isExported).length;

		return {
			identifiers,
			totalCount: identifiers.length,
			functionCount,
			classCount,
			interfaceCount,
			variableCount,
			constantCount,
			enumCount,
			typeCount,
			exportedCount,
		};
	}

	private extractFunctionDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isAsync = this.hasModifier(node, "async");
		const isExported = this.isExported(node);
		const visibility = this.getVisibility(node);
		const parameters = this.extractParameters(node);
		const returnType = this.extractReturnType(node);

		return {
			name,
			type: "function",
			visibility,
			isExported,
			isAsync,
			parameters,
			returnType,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractMethodDefinition(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isAsync = this.hasModifier(node, "async");
		const isStatic = this.hasModifier(node, "static");
		const visibility = this.getVisibility(node);
		const parameters = this.extractParameters(node);
		const returnType = this.extractReturnType(node);

		return {
			name,
			type: "function",
			visibility,
			isExported: false, // Methods are not directly exported
			isAsync,
			isStatic,
			parameters,
			returnType,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractClassDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isExported = this.isExported(node);
		const visibility = this.getVisibility(node);

		return {
			name,
			type: "class",
			visibility,
			isExported,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractInterfaceDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isExported = this.isExported(node);
		const visibility = this.getVisibility(node);

		return {
			name,
			type: "interface",
			visibility,
			isExported,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractVariableDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const parent = node.parent;
		const isConstant =
			parent?.type === "lexical_declaration" &&
			parent.firstChild?.text === "const";
		const isExported = this.isExported(parent || node);
		const visibility = this.getVisibility(parent || node);

		return {
			name,
			type: isConstant ? "constant" : "variable",
			visibility,
			isExported,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractEnumDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isExported = this.isExported(node);
		const visibility = this.getVisibility(node);

		return {
			name,
			type: "enum",
			visibility,
			isExported,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractTypeDeclaration(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): IdentifierInfo | null {
		const nameNode = node.childForFieldName("name");
		if (!nameNode) return null;

		const name = nameNode.text;
		const isExported = this.isExported(node);
		const visibility = this.getVisibility(node);

		return {
			name,
			type: "type",
			visibility,
			isExported,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private hasModifier(node: Parser.SyntaxNode, modifier: string): boolean {
		// Check if node has specific modifier (async, static, etc.)
		return node.text.includes(modifier);
	}

	private isExported(node: Parser.SyntaxNode): boolean {
		// Check if the declaration is exported
		let current: Parser.SyntaxNode | null = node;
		while (current) {
			if (
				current.type === "export_statement" ||
				current.text.startsWith("export ")
			) {
				return true;
			}
			current = current.parent;
		}
		return false;
	}

	private getVisibility(
		node: Parser.SyntaxNode,
	): "public" | "private" | "protected" | "default" {
		const text = node.text;
		if (text.includes("private")) return "private";
		if (text.includes("protected")) return "protected";
		if (text.includes("public")) return "public";
		return "default";
	}

	private extractParameters(node: Parser.SyntaxNode): string[] {
		const parameters: string[] = [];
		const paramsNode = node.childForFieldName("parameters");

		if (paramsNode) {
			for (let i = 0; i < paramsNode.childCount; i++) {
				const param = paramsNode.child(i);
				if (
					param?.type === "required_parameter" ||
					param?.type === "optional_parameter"
				) {
					const pattern = param.childForFieldName("pattern");
					if (pattern) {
						parameters.push(pattern.text);
					}
				}
			}
		}

		return parameters;
	}

	private extractReturnType(node: Parser.SyntaxNode): string | undefined {
		const typeNode = node.childForFieldName("return_type");
		return typeNode?.text;
	}

	supports(language: string): boolean {
		return ["typescript", "javascript", "tsx", "jsx"].includes(
			language.toLowerCase(),
		);
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(data: IdentifierExtractionResult): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (!data.identifiers || !Array.isArray(data.identifiers)) {
			errors.push("Identifiers must be an array");
		}

		if (typeof data.totalCount !== "number" || data.totalCount < 0) {
			errors.push("totalCount must be a non-negative number");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			quality: {
				completeness: errors.length === 0 ? 1.0 : 0.5,
				accuracy: 1.0,
				consistency: 1.0,
				confidence: 0.9,
			},
		};
	}

	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedLanguages: ["typescript", "javascript", "tsx", "jsx"],
			outputTypes: ["IdentifierExtractionResult"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.05,
				memoryUsage: "low",
				timeComplexity: "linear",
				maxRecommendedFileSize: 2 * 1024 * 1024, // 2MB
			},
			author: "TypeScript Dependency Linker",
			license: "MIT",
		};
	}

	configure(_options: ExtractorConfiguration): void {
		// Configuration handled via constructor or setter methods
	}

	getConfiguration(): ExtractorConfiguration {
		return {
			enabled: true,
			priority: 1,
			timeout: 15000,
			memoryLimit: 50 * 1024 * 1024, // 50MB
			languages: ["typescript", "javascript", "tsx", "jsx"],
			defaultOptions: {
				includeLocations: true,
				includeComments: false,
				maxDepth: 10,
			},
			errorHandling: "lenient",
			logLevel: "info",
		};
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				identifiers: {
					type: "array",
					description: "Array of identifier information",
				},
				totalCount: {
					type: "number",
					description: "Total number of identifiers found",
				},
			},
			required: ["identifiers", "totalCount"],
			version: "1.0.0",
		};
	}

	dispose(): void {
		// No resources to clean up
	}
}
