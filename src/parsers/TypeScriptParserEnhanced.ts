/**
 * Enhanced TypeScript Parser for Tree-Sitter Analyzer
 * Combines existing tree-sitter functionality with enhanced features
 */

import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { DependencyInfo } from "../models/DependencyInfo";
import type { ExportInfo } from "../models/ExportInfo";
import type { ImportInfo, ImportSpecifier } from "../models/ImportInfo";
import type { SourceLocation } from "../models/SourceLocation";
import { createLogger } from "../utils/logger";

const logger = createLogger("TypeScriptParserEnhanced");

export class TypeScriptParserEnhanced {
	private language: any;

	constructor() {
		try {
			this.language = TypeScript.tsx;
		} catch (error: any) {
			throw new Error(`Parser initialization failed: ${error.message}`);
		}
	}

	/**
	 * Parse TypeScript/TSX file content and extract dependencies
	 */
	parseFile(content: string): {
		dependencies: DependencyInfo[];
		imports: ImportInfo[];
		exports: ExportInfo[];
		hasParseErrors: boolean;
	} {
		// Validate input
		if (typeof content !== "string") {
			throw new Error("Content must be a string");
		}

		if (content.length === 0) {
			logger.warn("Empty content provided for parsing");
			return {
				dependencies: [],
				imports: [],
				exports: [],
				hasParseErrors: false,
			};
		}

		// Create fresh parser instance to avoid state corruption issues
		const parser = new Parser();
		try {
			parser.setLanguage(this.language);
		} catch (error) {
			throw new Error(
				`Failed to set parser language: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		let tree;
		try {
			tree = parser.parse(content);
		} catch (error) {
			throw new Error(
				`Parser.parse() failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		if (!tree) {
			throw new Error(
				"Parser failed to create syntax tree - parse() returned null",
			);
		}

		const rootNode = tree.rootNode;
		if (!rootNode) {
			throw new Error(
				"Parser failed to create root node - tree.rootNode is null",
			);
		}

		// Check for parsing errors - but still attempt to extract what we can
		const hasParseErrors = rootNode.hasError;
		if (hasParseErrors) {
			logger.warn("Parse errors detected, but attempting partial extraction");
		}

		const dependencies: DependencyInfo[] = [];
		const imports: ImportInfo[] = [];
		const exports: ExportInfo[] = [];

		this.traverseNode(rootNode, content, { dependencies, imports, exports });

		return { dependencies, imports, exports, hasParseErrors };
	}

	/**
	 * Traverse AST node and extract information
	 */
	private traverseNode(
		node: Parser.SyntaxNode,
		content: string,
		collectors: {
			dependencies: DependencyInfo[];
			imports: ImportInfo[];
			exports: ExportInfo[];
		},
	): void {
		// Null safety check
		if (!node) {
			return;
		}

		// Process import statements
		if (node.type === "import_statement") {
			const importDeps = this.extractImportStatement(node, content);
			collectors.dependencies.push(...importDeps);

			const importInfo = this.extractImportInfo(node, content);
			if (importInfo) {
				collectors.imports.push(importInfo);
			}
		}

		// Process require calls (CommonJS)
		if (node.type === "call_expression") {
			const requireDep = this.extractRequireCall(node, content);
			if (requireDep) {
				collectors.dependencies.push(requireDep);
			}
		}

		// Process dynamic imports
		if (node.type === "call_expression" && this.isDynamicImport(node)) {
			const dynamicDep = this.extractDynamicImport(node, content);
			if (dynamicDep) {
				collectors.dependencies.push(dynamicDep);
			}
		}

		// Process export statements
		if (node.type === "export_statement") {
			const exportInfos = this.extractExportInfo(node, content);
			collectors.exports.push(...exportInfos);

			// Also extract dependencies from re-export statements
			const sourceNode = node.childForFieldName("source");
			if (sourceNode) {
				const source = sourceNode.text.replace(/['"`]/g, "");
				const dependency: DependencyInfo = {
					source,
					type: this.classifyDependencyType(source),
					location: this.nodeToLocation(node),
				};
				collectors.dependencies.push(dependency);
			}
		}

		// Recursively process child nodes
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child) {
				this.traverseNode(child, content, collectors);
			}
		}
	}

	/**
	 * Extract import statement information
	 */
	private extractImportStatement(
		node: Parser.SyntaxNode,
		_content: string,
	): DependencyInfo[] {
		const sourceNode = node.childForFieldName("source");
		if (!sourceNode) return [];

		const source = sourceNode.text.replace(/['"`]/g, "");
		const dependency: DependencyInfo = {
			source,
			type: this.classifyDependencyType(source),
			location: this.nodeToLocation(node),
		};

		return [dependency];
	}

	/**
	 * Extract detailed import information
	 */
	private extractImportInfo(
		node: Parser.SyntaxNode,
		_content: string,
	): ImportInfo | null {
		const sourceNode = node.childForFieldName("source");
		if (!sourceNode) return null;

		const source = sourceNode.text.replace(/['"`]/g, "");
		const specifiers: ImportSpecifier[] = [];

		const importClause =
			node.childForFieldName("import") ||
			node.children.find((child) => child.type === "import_clause");
		if (importClause) {
			// Extract named imports
			const namedImports = this.findNodesByType(
				importClause,
				"import_specifier",
			);
			for (const spec of namedImports) {
				const nameNode =
					spec.childForFieldName("name") ||
					spec.children.find((child) => child.type === "identifier");
				const _aliasNode = spec.childForFieldName("alias");

				// For aliased imports: identifier "as" identifier
				const identifiers = spec.children.filter(
					(child) => child.type === "identifier",
				);

				if (
					identifiers.length >= 2 &&
					spec.children.some((child) => child.text === "as")
				) {
					// Aliased import: first is imported, last is local
					specifiers.push({
						type: "named",
						imported: identifiers[0].text,
						local: identifiers[identifiers.length - 1].text,
					});
				} else if (nameNode || identifiers.length > 0) {
					// Regular named import
					const actualNameNode = nameNode || identifiers[0];
					specifiers.push({
						type: "named",
						imported: actualNameNode.text,
						local: actualNameNode.text,
					});
				}
			}

			// Extract default import - check for direct identifier (can coexist with named imports)
			const directIdentifier = importClause.children.find(
				(child) => child.type === "identifier",
			);
			if (directIdentifier) {
				specifiers.push({
					type: "default",
					imported: "default",
					local: directIdentifier.text,
				});
			}

			// Extract namespace import
			const namespaceImport = this.findNodesByType(
				importClause,
				"namespace_import",
			)[0];
			if (namespaceImport) {
				const aliasNode =
					namespaceImport.childForFieldName("name") ||
					namespaceImport.children.find((child) => child.type === "identifier");
				if (aliasNode) {
					specifiers.push({
						type: "namespace",
						imported: "*",
						local: aliasNode.text,
					});
				}
			}
		}

		return {
			source,
			specifiers,
			location: this.nodeToLocation(node),
			isTypeOnly: this.isTypeOnlyImport(node),
		};
	}

	/**
	 * Extract require call information
	 */
	private extractRequireCall(
		node: Parser.SyntaxNode,
		_content: string,
	): DependencyInfo | null {
		const functionNode = node.childForFieldName("function");
		if (!functionNode || functionNode.text !== "require") return null;

		const argumentsNode = node.childForFieldName("arguments");
		if (!argumentsNode) return null;

		const firstArg = argumentsNode.children.find(
			(child) => child.type === "string",
		);
		if (!firstArg) return null;

		const source = firstArg.text.replace(/['"`]/g, "");

		return {
			source,
			type: this.classifyDependencyType(source),
			location: this.nodeToLocation(node),
		};
	}

	/**
	 * Check if call expression is dynamic import
	 */
	private isDynamicImport(node: Parser.SyntaxNode): boolean {
		const functionNode = node.childForFieldName("function");
		return functionNode?.text === "import";
	}

	/**
	 * Extract dynamic import information
	 */
	private extractDynamicImport(
		node: Parser.SyntaxNode,
		_content: string,
	): DependencyInfo | null {
		const argumentsNode = node.childForFieldName("arguments");
		if (!argumentsNode) return null;

		const firstArg = argumentsNode.children.find(
			(child) => child.type === "string" || child.type === "template_string",
		);
		if (!firstArg) return null;

		let source = firstArg.text.replace(/['"`]/g, "");

		// Handle template literals (basic support)
		if (firstArg.type === "template_string") {
			source = source.replace(/^`|`$/g, "");
			// For now, treat template strings as dynamic
		}

		return {
			source,
			type: this.classifyDependencyType(source),
			location: this.nodeToLocation(node),
		};
	}

	/**
	 * Extract export statement information
	 */
	private extractExportInfo(
		node: Parser.SyntaxNode,
		_content: string,
	): ExportInfo[] {
		// Handle different export types
		const declarationNode = node.childForFieldName("declaration");
		const sourceNode = node.childForFieldName("source");

		// Find declaration nodes by type (since they might not be in field-named structure)
		const lexicalDeclaration = node.children.find(
			(child) => child.type === "lexical_declaration",
		);
		const interfaceDeclaration = node.children.find(
			(child) => child.type === "interface_declaration",
		);
		const functionDeclaration = node.children.find(
			(child) => child.type === "function_declaration",
		);
		const classDeclaration = node.children.find(
			(child) => child.type === "class_declaration",
		);
		const typeAliasDeclaration = node.children.find(
			(child) => child.type === "type_alias_declaration",
		);

		// Check if it's a default export
		const hasDefault = node.children.some((child) => child.text === "default");

		// Handle re-exports (exports with 'from' clause)
		if (sourceNode) {
			return this.extractReExports(node, sourceNode);
		}

		if (
			declarationNode ||
			lexicalDeclaration ||
			interfaceDeclaration ||
			functionDeclaration ||
			classDeclaration ||
			typeAliasDeclaration
		) {
			// Export declaration (export const, export function, etc.)
			const actualDeclaration =
				declarationNode ||
				lexicalDeclaration ||
				interfaceDeclaration ||
				functionDeclaration ||
				classDeclaration ||
				typeAliasDeclaration;
			const exportInfo = this.extractExportDeclaration(
				actualDeclaration!,
				node,
			);
			return exportInfo ? [exportInfo] : [];
		} else if (hasDefault) {
			// Default export without declaration (e.g., export default { ... })
			return [
				{
					name: "default",
					type: "default",
					location: this.nodeToLocation(node),
					isTypeOnly: this.isTypeOnlyExport(node),
				},
			];
		} else {
			// Named exports without source
			const exportInfo = this.extractNamedExport(node);
			return exportInfo ? [exportInfo] : [];
		}
	}

	/**
	 * Extract export declaration
	 */
	private extractExportDeclaration(
		declarationNode: Parser.SyntaxNode,
		exportNode: Parser.SyntaxNode,
	): ExportInfo | null {
		let name = "default";
		let type: "default" | "named" = "named";

		// Check if it's default export
		if (exportNode.children.some((child) => child.text === "default")) {
			type = "default";
		}

		// Extract name from declaration
		if (
			declarationNode.type === "function_declaration" ||
			declarationNode.type === "class_declaration"
		) {
			const nameNode = declarationNode.childForFieldName("name");
			if (nameNode) {
				name = nameNode.text;
			}
		} else if (declarationNode.type === "interface_declaration") {
			// Handle interface exports
			const nameNode = declarationNode.children.find(
				(child) => child.type === "type_identifier",
			);
			if (nameNode) {
				name = nameNode.text;
			}
		} else if (declarationNode.type === "type_alias_declaration") {
			// Handle type alias exports (export type Foo = ...)
			const nameNode = declarationNode.children.find(
				(child) => child.type === "type_identifier",
			);
			if (nameNode) {
				name = nameNode.text;
			}
		} else if (declarationNode.type === "lexical_declaration") {
			// Handle const/let exports
			const declarators = this.findNodesByType(
				declarationNode,
				"variable_declarator",
			);
			if (declarators.length > 0) {
				const nameNode = declarators[0].children.find(
					(child) => child.type === "identifier",
				);
				if (nameNode) {
					name = nameNode.text;
				}
			}
		} else if (declarationNode.type === "variable_declaration") {
			const declarators = this.findNodesByType(
				declarationNode,
				"variable_declarator",
			);
			if (declarators.length > 0) {
				const nameNode = declarators[0].childForFieldName("name");
				if (nameNode) {
					name = nameNode.text;
				}
			}
		}

		return {
			name,
			type,
			location: this.nodeToLocation(exportNode),
			isTypeOnly: this.isTypeOnlyExport(exportNode),
		};
	}

	/**
	 * Extract re-export information (supports multiple exports from single statement)
	 */
	private extractReExports(
		exportNode: Parser.SyntaxNode,
		sourceNode: Parser.SyntaxNode,
	): ExportInfo[] {
		const source = sourceNode.text.replace(/['"`]/g, "");
		const exports: ExportInfo[] = [];
		const isTypeOnly = this.isTypeOnlyExport(exportNode);
		const location = this.nodeToLocation(exportNode);

		// Handle export * from './module'
		const hasWildcard = exportNode.children.some((child) => child.text === "*");
		if (hasWildcard) {
			// Check if it's namespace export (export * as name from './module')
			const namespaceExport = this.findNodesByType(
				exportNode,
				"namespace_export",
			)[0];
			if (namespaceExport) {
				const nameNode = namespaceExport.children.find(
					(child) => child.type === "identifier",
				);
				if (nameNode) {
					exports.push({
						name: nameNode.text,
						type: "re-export",
						source,
						location,
						isTypeOnly,
					});
				}
			} else {
				// Regular wildcard export
				exports.push({
					name: "*",
					type: "re-export",
					source,
					location,
					isTypeOnly,
				});
			}
		}

		// Handle export { name1, name2 } from './module'
		const exportSpecifiers = this.findNodesByType(
			exportNode,
			"export_specifier",
		);
		for (const spec of exportSpecifiers) {
			const identifiers = spec.children.filter(
				(child) => child.type === "identifier",
			);

			if (
				identifiers.length >= 2 &&
				spec.children.some((child) => child.text === "as")
			) {
				// Aliased export: export { orig as alias } from './module'
				exports.push({
					name: identifiers[identifiers.length - 1].text, // Last identifier is the local name
					type: "re-export",
					source,
					location,
					isTypeOnly,
				});
			} else if (identifiers.length > 0) {
				// Regular export: export { name } from './module'
				exports.push({
					name: identifiers[0].text,
					type: "re-export",
					source,
					location,
					isTypeOnly,
				});
			}
		}

		return exports;
	}

	/**
	 * Extract named export
	 */
	private extractNamedExport(exportNode: Parser.SyntaxNode): ExportInfo | null {
		const exportSpecifiers = this.findNodesByType(
			exportNode,
			"export_specifier",
		);

		if (exportSpecifiers.length > 0) {
			const nameNode = exportSpecifiers[0].childForFieldName("name");
			if (nameNode) {
				return {
					name: nameNode.text,
					type: "named",
					location: this.nodeToLocation(exportNode),
					isTypeOnly: this.isTypeOnlyExport(exportNode),
				};
			}
		}

		return null;
	}

	/**
	 * Classify dependency type based on source
	 */
	private classifyDependencyType(
		source: string,
	): "external" | "internal" | "relative" {
		if (source.startsWith("./") || source.startsWith("../")) {
			return "relative";
		} else if (source.startsWith("/") || source.match(/^[a-zA-Z]:/)) {
			return "internal";
		} else {
			return "external";
		}
	}

	/**
	 * Check if import is type-only
	 */
	private isTypeOnlyImport(node: Parser.SyntaxNode): boolean {
		return node.children.some((child) => child.text === "type");
	}

	/**
	 * Check if export is type-only
	 */
	private isTypeOnlyExport(node: Parser.SyntaxNode): boolean {
		// Check for explicit 'type' keyword
		if (node.children.some((child) => child.text === "type")) {
			return true;
		}

		// Check if exporting type-only constructs
		const hasInterfaceDeclaration = node.children.some(
			(child) => child.type === "interface_declaration",
		);
		const hasTypeAliasDeclaration = node.children.some(
			(child) => child.type === "type_alias_declaration",
		);

		return hasInterfaceDeclaration || hasTypeAliasDeclaration;
	}

	/**
	 * Convert AST node to source location
	 */
	private nodeToLocation(node: Parser.SyntaxNode): SourceLocation {
		return {
			line: node.startPosition.row + 1,
			column: node.startPosition.column,
			offset: node.startIndex,
		};
	}

	/**
	 * Find all nodes of a specific type within a parent node
	 */
	private findNodesByType(
		node: Parser.SyntaxNode,
		type: string,
	): Parser.SyntaxNode[] {
		const nodes: Parser.SyntaxNode[] = [];

		const visit = (current: Parser.SyntaxNode) => {
			if (current.type === type) {
				nodes.push(current);
			}

			for (let i = 0; i < current.childCount; i++) {
				const child = current.child(i);
				if (child) {
					visit(child);
				}
			}
		};

		visit(node);
		return nodes;
	}
}
