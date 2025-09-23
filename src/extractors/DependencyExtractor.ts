/**
 * DependencyExtractor - Built-in extractor for dependency analysis
 * Extracts import/export dependency information from AST nodes
 */

import type Parser from "tree-sitter";
import type {
	AST,
	ExtractorConfiguration,
	ExtractorMetadata,
	ExtractorOptions,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor";

export interface DependencyInfo {
	source: string;
	specifiers: string[];
	type: "import" | "export" | "require" | "dynamic";
	isTypeOnly: boolean;
	location: {
		line: number;
		column: number;
		endLine: number;
		endColumn: number;
	};
}

export interface DependencyExtractionResult {
	dependencies: DependencyInfo[];
	totalCount: number;
	importCount: number;
	exportCount: number;
	dynamicImportCount: number;
	typeOnlyImportCount: number;
}

export class DependencyExtractor
	implements IDataExtractor<DependencyExtractionResult>
{
	private config: ExtractorConfiguration = {
		enabled: true,
		priority: 1,
		timeout: 20000,
		memoryLimit: 75 * 1024 * 1024, // 75MB
		languages: ["typescript", "javascript", "tsx", "jsx"],
		defaultOptions: {
			includeLocations: true,
			includeComments: false,
			maxDepth: 10,
			custom: {
				includeTypeOnly: true,
				followDynamicImports: true,
			},
		},
		errorHandling: "lenient",
		logLevel: "info",
	};

	public readonly name = "DependencyExtractor";
	public readonly version = "1.0.0";
	public readonly description =
		"Extracts dependency information from source code";

	extract(
		ast: AST,
		_filePath: string,
		_options?: ExtractorOptions,
	): DependencyExtractionResult {
		const tree = ast as Parser.Tree;
		const sourceCode = ""; // TODO: Read source code from filePath if needed
		const dependencies: DependencyInfo[] = [];
		const cursor = tree.walk();

		const visit = (node: Parser.SyntaxNode) => {
			// Handle import declarations
			if (node.type === "import_statement") {
				const dependency = this.extractImportStatement(node, sourceCode);
				if (dependency) {
					dependencies.push(dependency);
				}
			}
			// Handle export declarations
			else if (node.type.includes("export")) {
				const dependency = this.extractExportStatement(node, sourceCode);
				if (dependency) {
					dependencies.push(dependency);
				}
			}
			// Handle call expressions (require and dynamic imports)
			else if (node.type === "call_expression") {
				// Try require first
				let dependency = this.extractRequireCall(node, sourceCode);
				if (dependency) {
					dependencies.push(dependency);
				} else {
					// Try dynamic import
					dependency = this.extractDynamicImport(node, sourceCode);
					if (dependency) {
						dependencies.push(dependency);
					}
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
		const importCount = dependencies.filter((d) => d.type === "import").length;
		const exportCount = dependencies.filter((d) => d.type === "export").length;
		const dynamicImportCount = dependencies.filter(
			(d) => d.type === "dynamic",
		).length;
		const typeOnlyImportCount = dependencies.filter((d) => d.isTypeOnly).length;

		return {
			dependencies,
			totalCount: dependencies.length,
			importCount,
			exportCount,
			dynamicImportCount,
			typeOnlyImportCount,
		};
	}

	private extractImportStatement(
		node: Parser.SyntaxNode,
		sourceCode: string,
	): DependencyInfo | null {
		const sourceNode = node.childForFieldName("source");
		if (!sourceNode) return null;

		const source = this.extractStringLiteral(sourceNode.text);
		const specifiers = this.extractImportSpecifiers(node, sourceCode);
		const isTypeOnly = node.text.includes("import type");

		return {
			source,
			specifiers,
			type: "import",
			isTypeOnly,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractExportStatement(
		node: Parser.SyntaxNode,
		sourceCode: string,
	): DependencyInfo | null {
		// Handle re-exports (export ... from "module")
		const sourceNode = node.childForFieldName("source");
		if (sourceNode) {
			const source = this.extractStringLiteral(sourceNode.text);
			const specifiers = this.extractExportSpecifiers(node, sourceCode);

			return {
				source,
				specifiers,
				type: "export",
				isTypeOnly: node.text.includes("export type"),
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column,
					endLine: node.endPosition.row + 1,
					endColumn: node.endPosition.column,
				},
			};
		}

		return null;
	}

	private extractRequireCall(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): DependencyInfo | null {
		const functionNode = node.childForFieldName("function");
		if (functionNode?.text !== "require") return null;

		const argumentsNode = node.childForFieldName("arguments");
		if (!argumentsNode) return null;

		const firstArg = argumentsNode.firstChild?.nextSibling;
		if (!firstArg) return null;

		// Only handle string literals, not variables
		if (
			firstArg.type !== "string" &&
			!firstArg.text.startsWith('"') &&
			!firstArg.text.startsWith("'")
		) {
			return null;
		}

		const source = this.extractStringLiteral(firstArg.text);

		return {
			source,
			specifiers: [],
			type: "require",
			isTypeOnly: false,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractDynamicImport(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): DependencyInfo | null {
		const functionNode = node.childForFieldName("function");
		// Check for dynamic import() calls
		if (functionNode?.text !== "import") return null;

		const argumentsNode = node.childForFieldName("arguments");
		if (!argumentsNode) return null;

		const firstArg = argumentsNode.firstChild?.nextSibling;
		if (!firstArg) return null;

		// Only handle string literals, not variables
		if (
			firstArg.type !== "string" &&
			!firstArg.text.startsWith('"') &&
			!firstArg.text.startsWith("'")
		) {
			return null;
		}

		const source = this.extractStringLiteral(firstArg.text);

		return {
			source,
			specifiers: [],
			type: "dynamic",
			isTypeOnly: false,
			location: {
				line: node.startPosition.row + 1,
				column: node.startPosition.column,
				endLine: node.endPosition.row + 1,
				endColumn: node.endPosition.column,
			},
		};
	}

	private extractImportSpecifiers(
		node: Parser.SyntaxNode,
		_sourceCode: string,
	): string[] {
		const specifiers: string[] = [];
		const importClause = node.childForFieldName("import");

		if (!importClause) return specifiers;

		// Handle different import patterns
		if (importClause.type === "identifier") {
			// Default import: import foo from "module"
			specifiers.push(importClause.text);
		} else if (importClause.type === "namespace_import") {
			// Namespace import: import * as foo from "module"
			const alias = importClause.childForFieldName("alias");
			if (alias) {
				specifiers.push(`* as ${alias.text}`);
			}
		} else if (importClause.type === "named_imports") {
			// Named imports: import { foo, bar } from "module"
			this.extractNamedSpecifiers(importClause, specifiers);
		}

		return specifiers;
	}

	private extractExportSpecifiers(
		_node: Parser.SyntaxNode,
		_sourceCode: string,
	): string[] {
		const specifiers: string[] = [];
		// Implementation for export specifiers would be similar to import specifiers
		// This is a simplified version
		return specifiers;
	}

	private extractNamedSpecifiers(
		namedImportsNode: Parser.SyntaxNode,
		specifiers: string[],
	): void {
		for (let i = 0; i < namedImportsNode.childCount; i++) {
			const child = namedImportsNode.child(i);
			if (child?.type === "import_specifier") {
				const name = child.childForFieldName("name");
				const alias = child.childForFieldName("alias");

				if (name) {
					if (alias) {
						specifiers.push(`${name.text} as ${alias.text}`);
					} else {
						specifiers.push(name.text);
					}
				}
			}
		}
	}

	private extractStringLiteral(text: string): string {
		// Remove quotes from string literals
		return text.replace(/^['"`]|['"`]$/g, "");
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

	validate(data: DependencyExtractionResult): ValidationResult {
		const errors: string[] = [];

		if (!data.dependencies || !Array.isArray(data.dependencies)) {
			errors.push("Dependencies must be an array");
		}

		if (typeof data.totalCount !== "number" || data.totalCount < 0) {
			errors.push("totalCount must be a non-negative number");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings: [],
		};
	}

	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			supportedLanguages: ["typescript", "javascript", "tsx", "jsx"],
			outputTypes: ["DependencyExtractionResult"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.08,
				memoryUsage: "medium",
				timeComplexity: "linear",
				maxRecommendedFileSize: 1.5 * 1024 * 1024, // 1.5MB
			},
			author: "TypeScript Dependency Linker",
			license: "MIT",
		};
	}

	configure(options: ExtractorConfiguration): void {
		this.config = { ...this.config, ...options };
	}

	getConfiguration(): ExtractorConfiguration {
		return { ...this.config };
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				dependencies: {
					type: "array",
					description: "Array of dependency information",
					items: {
						type: "object",
						properties: {
							source: { type: "string" },
							specifiers: { type: "array", items: { type: "string" } },
							type: { type: "string" },
							isTypeOnly: { type: "boolean" },
						},
						constraints: {
							enum: ["import", "export", "require", "dynamic"],
						},
					},
				},
				totalCount: {
					type: "number",
					description: "Total count of dependencies",
				},
				importCount: { type: "number", description: "Number of imports" },
				exportCount: { type: "number", description: "Number of exports" },
				dynamicImportCount: {
					type: "number",
					description: "Number of dynamic imports",
				},
				typeOnlyImportCount: {
					type: "number",
					description: "Number of type-only imports",
				},
			},
			required: ["dependencies", "totalCount", "importCount", "exportCount"],
			version: "1.0.0",
		};
	}

	dispose(): void {
		// Cleanup if needed
	}
}
