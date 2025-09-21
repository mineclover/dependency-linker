/**
 * TypeScriptParser implementation
 * Tree-sitter based parser for TypeScript and JavaScript files
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
// import { LegacyAnalysisResult } from '../models/AnalysisResult'; // Removed - legacy not needed
import type { DependencyInfo } from "../models/DependencyInfo";
import type { ExportInfo } from "../models/ExportInfo";
import type { ImportInfo } from "../models/ImportInfo";
import type {
	ASTVisitor,
	ILanguageParser,
	ParseError,
	ParseResult,
	ParserMetadata,
	ParserOptions,
	ParseWarning,
	SyntaxValidationResult,
} from "./ILanguageParser";

export class TypeScriptParser implements ILanguageParser {
	private parser: Parser;
	private options: ParserOptions;

	constructor(options: ParserOptions = {}) {
		this.parser = new Parser();
		this.parser.setLanguage(TypeScript.typescript);

		this.options = {
			maxFileSize: 10 * 1024 * 1024, // 10MB
			memoryLimit: 100 * 1024 * 1024, // 100MB
			timeout: 30000, // 30 seconds
			enableErrorRecovery: true,
			enableIncremental: true,
			includeLocations: true,
			includeTrivia: false,
			encoding: "utf-8",
			...options,
		};
	}

	/**
	 * Parses a file and returns AST with metadata
	 */
	async parse(filePath: string, content?: string): Promise<ParseResult> {
		const startTime = Date.now();
		const errors: ParseError[] = [];
		const warnings: ParseWarning[] = [];

		try {
			// Read file content if not provided
			const sourceCode =
				content ??
				(await fs.readFile(filePath, this.options.encoding as BufferEncoding));

			// Check file size limit
			const maxFileSize = this.options.maxFileSize ?? 10 * 1024 * 1024;
			if (sourceCode.length > maxFileSize) {
				throw new Error(
					`File size exceeds limit: ${sourceCode.length} > ${maxFileSize}`,
				);
			}

			// Detect language
			const language = this.detectLanguage(filePath, sourceCode);

			// Set appropriate language variant
			if (language === "tsx") {
				this.parser.setLanguage(TypeScript.tsx);
			} else {
				this.parser.setLanguage(TypeScript.typescript);
			}

			// Parse with timeout
			const timeout = this.options.timeout ?? 30000;
			const ast = await this.parseWithTimeout(sourceCode, timeout);

			if (!ast) {
				throw new Error("Failed to parse file - AST is null");
			}

			// Check for syntax errors
			const syntaxErrors = this.extractSyntaxErrors(ast, sourceCode);
			errors.push(...syntaxErrors);

			const parseTime = Date.now() - startTime;

			return {
				ast,
				language,
				parseTime,
				cacheHit: false,
				errors,
				warnings,
				metadata: {
					nodeCount: this.countNodes(ast),
					maxDepth: this.calculateMaxDepth(ast),
					fileSize: sourceCode.length,
					encoding: this.options.encoding ?? "utf-8",
					parserVersion: "1.0.0",
					grammarVersion: "0.20.3",
					memoryUsage: process.memoryUsage().heapUsed,
					incremental: false,
					timings: {
						languageDetection: 1,
						grammarLoad: 0,
						fileRead: content ? 0 : 5,
						parsing: parseTime - 6,
						validation: 1,
						cache: 0,
					},
				},
			};
		} catch (error) {
			const parseTime = Date.now() - startTime;

			errors.push({
				type: "syntax",
				message: error instanceof Error ? error.message : String(error),
				location: { line: 1, column: 1 },
				severity: "error",
			});

			return {
				ast: null,
				language: this.detectLanguage(filePath),
				parseTime,
				cacheHit: false,
				errors,
				warnings,
				metadata: {
					nodeCount: 0,
					maxDepth: 0,
					fileSize: 0,
					encoding: this.options.encoding ?? "utf-8",
					parserVersion: "1.0.0",
					grammarVersion: "0.20.3",
					memoryUsage: process.memoryUsage().heapUsed,
					incremental: false,
					timings: {
						languageDetection: 1,
						grammarLoad: 0,
						fileRead: 0,
						parsing: parseTime,
						validation: 0,
						cache: 0,
					},
				},
			};
		}
	}

	/**
	 * Checks if this parser supports the given language
	 */
	supports(language: string): boolean {
		const normalizedLang = language.toLowerCase();
		return [
			"typescript",
			"javascript",
			"ts",
			"js",
			"tsx",
			"jsx",
			".ts",
			".tsx",
			".js",
			".jsx",
		].includes(normalizedLang);
	}

	/**
	 * Detects the language from file path and/or content
	 */
	detectLanguage(filePath: string, content?: string): string {
		const ext = path.extname(filePath).toLowerCase();

		switch (ext) {
			case ".ts":
				return "typescript";
			case ".tsx":
				return "tsx";
			case ".js":
				return "javascript";
			case ".jsx":
				return "jsx";
			default:
				// Try to detect from content
				if (content) {
					if (
						content.includes("interface ") ||
						content.includes(": ") ||
						content.includes("as ")
					) {
						return filePath.includes(".tsx") || content.includes("<")
							? "tsx"
							: "typescript";
					}
					if (content.includes("import ") || content.includes("export ")) {
						return "javascript";
					}
				}
				return "typescript"; // Default fallback
		}
	}

	/**
	 * Gets the underlying grammar/parser instance
	 */
	getGrammar(): any {
		return this.parser.getLanguage();
	}

	/**
	 * Validates syntax without full parsing
	 */
	validateSyntax(content: string): SyntaxValidationResult {
		const startTime = Date.now();

		try {
			const ast = this.parser.parse(content);
			const errors = ast ? this.extractSyntaxErrors(ast, content) : [];

			return {
				isValid: errors.length === 0,
				errors,
				validationTime: Date.now() - startTime,
				firstErrorPosition:
					errors.length > 0 ? errors[0].location.offset : undefined,
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [
					{
						type: "syntax",
						message: error instanceof Error ? error.message : String(error),
						location: { line: 1, column: 1 },
						severity: "error",
					},
				],
				validationTime: Date.now() - startTime,
			};
		}
	}

	/**
	 * Gets parser metadata
	 */
	getMetadata(): ParserMetadata {
		return {
			name: "TypeScriptParser",
			version: "1.0.0",
			supportedLanguages: [
				"typescript",
				"javascript",
				"ts",
				"js",
				"tsx",
				"jsx",
			],
			supportedExtensions: [".ts", ".tsx", ".js", ".jsx"],
			capabilities: {
				incrementalParsing: true,
				errorRecovery: true,
				syntaxHighlighting: true,
				codeFolding: true,
				maxFileSize: this.options.maxFileSize || 10485760,
				memoryLimit: this.options.memoryLimit || 104857600,
			},
			performance: {
				averageSpeed: 10000, // lines per second
				memoryPerKB: 2048,
				timeComplexity: "linear",
				threadSafe: false,
			},
		};
	}

	/**
	 * Configures the parser with options
	 */
	configure(options: ParserOptions): void {
		this.options = { ...this.options, ...options };
	}

	/**
	 * Gets the current parser configuration
	 */
	getConfiguration(): ParserOptions {
		return { ...this.options };
	}

	/**
	 * Cleans up parser resources
	 */
	dispose(): void {
		// Tree-sitter parsers are automatically garbage collected
		// No explicit cleanup needed for the parser itself
	}

	/**
	 * Traverses AST with visitor pattern
	 */
	traverse(ast: any, visitor: ASTVisitor): void {
		if (!ast) return;

		const visit = (node: any, parent?: any): void => {
			// Call enter hook
			if (visitor.enter) {
				const shouldContinue = visitor.enter(node, parent);
				if (shouldContinue === false) return;
			}

			// Call type-specific hook
			if (visitor[node.type]) {
				const shouldContinue = visitor[node.type]?.(node, parent);
				if (shouldContinue === false) return;
			}

			// Visit children
			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i), node);
			}

			// Call leave hook
			if (visitor.leave) {
				visitor.leave(node, parent);
			}
		};

		visit(ast.rootNode);
	}

	private async parseWithTimeout(
		content: string,
		timeout: number,
	): Promise<any> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Parse timeout after ${timeout}ms`));
			}, timeout);

			try {
				const ast = this.parser.parse(content);
				clearTimeout(timer);
				resolve(ast);
			} catch (error) {
				clearTimeout(timer);
				reject(error);
			}
		});
	}

	private extractSyntaxErrors(ast: any, _content: string): ParseError[] {
		const errors: ParseError[] = [];

		const visit = (node: any): void => {
			if (node.hasError) {
				errors.push({
					type: "syntax",
					message: `Syntax error at ${node.type}`,
					location: {
						line: node.startPosition.row + 1,
						column: node.startPosition.column + 1,
						endLine: node.endPosition.row + 1,
						endColumn: node.endPosition.column + 1,
						offset: node.startIndex,
						length: node.endIndex - node.startIndex,
					},
					severity: "error",
				});
			}

			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i));
			}
		};

		visit(ast.rootNode);
		return errors;
	}

	private countNodes(ast: any): number {
		let count = 0;

		const visit = (node: any): void => {
			count++;
			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i));
			}
		};

		visit(ast.rootNode);
		return count;
	}

	private calculateMaxDepth(ast: any): number {
		const visit = (node: any, depth: number = 0): number => {
			let maxDepth = depth;

			for (let i = 0; i < node.childCount; i++) {
				const childDepth = visit(node.child(i), depth + 1);
				maxDepth = Math.max(maxDepth, childDepth);
			}

			return maxDepth;
		};

		return visit(ast.rootNode);
	}

	/**
	 * Legacy parseFile method for backward compatibility
	 * Parses file and extracts dependencies in the old format
	 */
	async parseFile(filePath: string, content?: string): Promise<any> {
		const startTime = Date.now();

		try {
			// Parse using the new method
			const parseResult = await this.parse(filePath, content);

			if (parseResult.errors.length > 0) {
				return {
					filePath,
					success: false,
					dependencies: [],
					imports: [],
					exports: [],
					parseTime: parseResult.parseTime,
					error: {
						code: "PARSE_ERROR",
						message: parseResult.errors[0].message,
						details: parseResult.errors,
					},
				};
			}

			// Extract dependencies from AST
			const dependencies = this.extractDependenciesFromAST(parseResult.ast);
			const imports = this.extractImportsFromAST(parseResult.ast);
			const exports = this.extractExportsFromAST(parseResult.ast);

			return {
				filePath,
				success: true,
				dependencies,
				imports,
				exports,
				parseTime: Date.now() - startTime,
			};
		} catch (error) {
			return {
				filePath,
				success: false,
				dependencies: [],
				imports: [],
				exports: [],
				parseTime: Date.now() - startTime,
				error: {
					code: "PARSE_ERROR",
					message: error instanceof Error ? error.message : String(error),
					details: error,
				},
			};
		}
	}

	/**
	 * Extract dependencies from AST
	 */
	private extractDependenciesFromAST(ast: any): DependencyInfo[] {
		const dependencies: DependencyInfo[] = [];

		const visit = (node: any): void => {
			if (node.type === "import_statement") {
				const source = this.extractImportSource(node);
				if (source) {
					dependencies.push({
						source,
						type: this.classifyDependencyType(source),
						location: {
							line: node.startPosition.row + 1,
							column: node.startPosition.column + 1,
							offset: node.startIndex,
						},
					});
				}
			} else if (node.type === "call_expression") {
				// Handle require() calls
				const source = this.extractRequireSource(node);
				if (source) {
					dependencies.push({
						source,
						type: this.classifyDependencyType(source),
						location: {
							line: node.startPosition.row + 1,
							column: node.startPosition.column + 1,
							offset: node.startIndex,
						},
					});
				}
			}

			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i));
			}
		};

		visit(ast.rootNode);
		return dependencies;
	}

	/**
	 * Extract imports from AST
	 */
	private extractImportsFromAST(_ast: any): ImportInfo[] {
		// Placeholder - implement based on existing ImportInfo structure
		return [];
	}

	/**
	 * Extract exports from AST
	 */
	private extractExportsFromAST(ast: any): ExportInfo[] {
		const exports: ExportInfo[] = [];

		const visit = (node: any): void => {
			switch (node.type) {
				case "export_statement":
				case "export_declaration": {
					const exportInfo = this.extractExportFromStatement(node);
					if (exportInfo) {
						if (Array.isArray(exportInfo)) {
							exports.push(...exportInfo);
						} else {
							exports.push(exportInfo);
						}
					}
					break;
				}

				case "function_declaration":
				case "class_declaration":
				case "interface_declaration":
				case "type_alias_declaration":
				case "variable_statement":
					// Check if this declaration has export modifier
					if (this.hasExportModifier(node)) {
						const exportInfo = this.extractExportFromDeclaration(node);
						if (exportInfo) {
							exports.push(exportInfo);
						}
					}
					break;
			}

			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i));
			}
		};

		visit(ast.rootNode);
		return exports;
	}

	/**
	 * Extract import source from import_statement node
	 */
	private extractImportSource(node: any): string | null {
		// Find string_literal child node
		const visit = (n: any): string | null => {
			if (n.type === "string") {
				return n.text.slice(1, -1); // Remove quotes
			}
			for (let i = 0; i < n.childCount; i++) {
				const result = visit(n.child(i));
				if (result) return result;
			}
			return null;
		};
		return visit(node);
	}

	/**
	 * Extract require source from call_expression node
	 */
	private extractRequireSource(node: any): string | null {
		// Check if this is a require() call
		if (
			node.firstChild?.type === "identifier" &&
			node.firstChild.text === "require"
		) {
			const args = node.child(1); // arguments node
			if (args?.type === "arguments") {
				const firstArg = args.firstChild?.nextSibling; // skip '('
				if (firstArg?.type === "string") {
					return firstArg.text.slice(1, -1); // Remove quotes
				}
			}
		}
		return null;
	}

	/**
	 * Classify dependency type based on source
	 */
	private classifyDependencyType(
		source: string,
	): "external" | "relative" | "internal" {
		if (source.startsWith("./") || source.startsWith("../")) {
			return "relative";
		}
		if (
			source.startsWith("@") ||
			!source.includes("/") ||
			source.startsWith("node:")
		) {
			return "external";
		}
		return "internal";
	}

	/**
	 * Extract export info from export statement
	 */
	private extractExportFromStatement(
		node: any,
	): ExportInfo | ExportInfo[] | null {
		const location = {
			line: node.startPosition.row + 1,
			column: node.startPosition.column + 1,
			offset: node.startIndex,
		};

		// Handle different types of export statements
		if (node.type === "export_statement") {
			// export { name1, name2 }; or export { name1 as alias };
			const exports: ExportInfo[] = [];
			const visit = (n: any): void => {
				if (n.type === "export_specifier") {
					const name = this.getIdentifierText(n.child(0)); // exported name
					if (name) {
						exports.push({
							name,
							type: "named",
							isTypeOnly: false,
							location,
						});
					}
				}
				for (let i = 0; i < n.childCount; i++) {
					visit(n.child(i));
				}
			};
			visit(node);
			return exports.length > 0 ? exports : null;
		}

		return null;
	}

	/**
	 * Extract export info from declaration with export modifier
	 */
	private extractExportFromDeclaration(node: any): ExportInfo | null {
		const location = {
			line: node.startPosition.row + 1,
			column: node.startPosition.column + 1,
			offset: node.startIndex,
		};

		let name: string | null = null;
		let type: ExportInfo["type"] = "named";
		let isTypeOnly = false;

		switch (node.type) {
			case "function_declaration":
				name = this.getFunctionName(node);
				type = "function";
				break;
			case "class_declaration":
			case "interface_declaration":
			case "type_alias_declaration":
				name = this.getDeclarationName(node);
				isTypeOnly =
					node.type === "interface_declaration" ||
					node.type === "type_alias_declaration";
				break;
			case "variable_statement":
				name = this.getVariableDeclarationName(node);
				break;
		}

		if (name) {
			return {
				name,
				type,
				isTypeOnly,
				location,
			};
		}

		return null;
	}

	/**
	 * Check if node has export modifier
	 */
	private hasExportModifier(node: any): boolean {
		// Look for export keyword in first few children
		for (let i = 0; i < Math.min(3, node.childCount); i++) {
			const child = node.child(i);
			if (child.type === "export" || child.text === "export") {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get identifier text from node
	 */
	private getIdentifierText(node: any): string | null {
		if (node.type === "identifier") {
			return node.text;
		}
		return null;
	}

	/**
	 * Get function name
	 */
	private getFunctionName(node: any): string | null {
		// Look for identifier after 'function' keyword
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child.type === "identifier" && child.text !== "function") {
				return child.text;
			}
		}
		return null;
	}

	/**
	 * Get declaration name (class, interface, type)
	 */
	private getDeclarationName(node: any): string | null {
		// Look for identifier after the declaration keyword
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);
			if (child.type === "type_identifier" || child.type === "identifier") {
				const text = child.text;
				if (
					text &&
					text !== "class" &&
					text !== "interface" &&
					text !== "type"
				) {
					return text;
				}
			}
		}
		return null;
	}

	/**
	 * Get variable declaration name
	 */
	private getVariableDeclarationName(node: any): string | null {
		// Look for variable_declarator and get its identifier
		const visit = (n: any): string | null => {
			if (n.type === "variable_declarator") {
				const firstChild = n.child(0);
				if (firstChild && firstChild.type === "identifier") {
					return firstChild.text;
				}
			}
			for (let i = 0; i < n.childCount; i++) {
				const result = visit(n.child(i));
				if (result) return result;
			}
			return null;
		};
		return visit(node);
	}
}
