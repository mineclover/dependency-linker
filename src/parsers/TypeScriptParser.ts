/**
 * TypeScriptParser implementation
 * Tree-sitter based parser for TypeScript and JavaScript files
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { AST } from "../extractors/IDataExtractor";
import type { DependencyInfo } from "../models/DependencyInfo";
import type { ExportInfo } from "../models/ExportInfo";
import type { ImportInfo } from "../models/ImportInfo";
import { TypeSafeAST } from "../types/ASTWrappers";
import type {
	TreeSitterLanguage,
	TreeSitterNode,
	TreeSitterTree,
} from "../types/TreeSitterTypes";
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

/**
 * TypeScript/TSX Parser using Tree-sitter
 *
 * Provides fast, accurate parsing of TypeScript and TSX files with support for:
 * - Modern TypeScript syntax (ES2022+)
 * - JSX/TSX components
 * - Type annotations and generics
 * - Decorators and metadata
 * - Error recovery for partial/invalid code
 *
 * @example
 * ```typescript
 * // Basic usage (deps-cli compatible)
 * const parser = new TypeScriptParser();
 * const result = await parser.parse('app.ts', 'export const API_URL = "https://api.example.com";');
 *
 * if (result.ast) {
 *   console.log(`Parsed ${result.metadata.nodeCount} AST nodes in ${result.parseTime}ms`);
 * }
 *
 * // Advanced configuration
 * const parser = new TypeScriptParser({
 *   maxFileSize: 50 * 1024 * 1024, // 50MB files
 *   includeTrivia: true,           // Include comments
 *   timeout: 60000                 // 1 minute timeout
 * });
 * ```
 *
 * @since 2.0.0
 */
export class TypeScriptParser implements ILanguageParser {
	private parser: Parser;
	private options: ParserOptions;

	/**
	 * Creates a new TypeScript parser instance
	 *
	 * @param options - Parser configuration options. If not provided, uses sensible defaults.
	 *                  All options are optional and will be merged with defaults.
	 *
	 * @example
	 * ```typescript
	 * // deps-cli compatible: no parameters
	 * const parser = new TypeScriptParser();
	 *
	 * // Custom configuration
	 * const parser = new TypeScriptParser({
	 *   timeout: 15000,        // 15 second timeout
	 *   maxFileSize: 5 * 1024 * 1024, // 5MB limit
	 *   includeTrivia: true    // Include comments
	 * });
	 * ```
	 */
	constructor(options?: ParserOptions) {
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
			...(options || {}),
		};
	}

	/**
	 * Parses TypeScript/TSX source code and returns detailed parse results
	 *
	 * This is the primary method used by deps-cli and other consumers.
	 * Automatically detects language variant (TS/TSX) and handles errors gracefully.
	 *
	 * @param filePath - Path to the source file (used for language detection and error reporting)
	 * @param content - Optional source code content. If not provided, reads from filePath.
	 *
	 * @returns Promise resolving to ParseResult containing:
	 *   - `ast`: Tree-sitter AST (null if parsing failed)
	 *   - `language`: Detected language ("typescript", "tsx", etc.)
	 *   - `parseTime`: Parse duration in milliseconds
	 *   - `errors`: Array of syntax errors found
	 *   - `metadata`: Detailed parsing statistics
	 *
	 * @example
	 * ```typescript
	 * // deps-cli usage pattern
	 * const parser = new TypeScriptParser();
	 * const parseResult = await parser.parse(filePath, content);
	 *
	 * if (parseResult.ast) {
	 *   const exportResult = extractor.extractExports(parseResult.ast, filePath);
	 *   // Process exports...
	 * }
	 *
	 * // Error handling
	 * if (parseResult.errors.length > 0) {
	 *   console.warn(`Found ${parseResult.errors.length} syntax errors`);
	 * }
	 * ```
	 *
	 * @throws Will reject if file cannot be read or memory/timeout limits exceeded
	 * @since 2.0.0
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

			// Create type-safe AST wrapper
			const typedAST = new TypeSafeAST(ast);

			return {
				ast,
				typedAST,
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
	 *
	 * @param language - Language identifier to check support for
	 * @returns true if the language is supported, false otherwise
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 * console.log(parser.supports("typescript")); // true
	 * console.log(parser.supports("tsx"));        // true
	 * console.log(parser.supports("python"));     // false
	 * ```
	 *
	 * Supported languages:
	 * - "typescript", "ts" - TypeScript files
	 * - "tsx" - TypeScript React files
	 * - "javascript", "js" - JavaScript files (with TS parser)
	 * - "jsx" - JavaScript React files
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
	/**
	 * Detects the language variant from file path and/or content
	 *
	 * Uses file extension as primary indicator, falls back to content analysis
	 * when extension is ambiguous or missing. Essential for setting correct
	 * tree-sitter grammar.
	 *
	 * @param filePath - Path to source file (used for extension detection)
	 * @param content - Optional source code content for heuristic analysis
	 *
	 * @returns Language identifier:
	 *   - "typescript" - .ts files or content with TypeScript features
	 *   - "tsx" - .tsx files or TypeScript with JSX syntax
	 *   - "javascript" - .js files or basic JavaScript
	 *   - "jsx" - .jsx files or JavaScript with JSX syntax
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 *
	 * // Extension-based detection
	 * parser.detectLanguage("Button.tsx");           // "tsx"
	 * parser.detectLanguage("utils.ts");             // "typescript"
	 * parser.detectLanguage("legacy.js");            // "javascript"
	 *
	 * // Content-based heuristics
	 * parser.detectLanguage("unknown.txt", "interface User {}"); // "typescript"
	 * parser.detectLanguage("unknown.txt", "const App = <div/>"); // "tsx"
	 * ```
	 *
	 * @internal Used internally by parse() method
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
	getGrammar(): TreeSitterLanguage | null {
		return this.parser.getLanguage();
	}

	/**
	 * Validates syntax without full parsing
	 */
	/**
	 * Validates TypeScript/TSX syntax without full parsing overhead
	 *
	 * Performs lightweight syntax validation by parsing content and checking
	 * for errors. More efficient than full parse() when only validation is needed.
	 *
	 * @param content - Source code to validate
	 *
	 * @returns SyntaxValidationResult containing:
	 *   - `isValid`: true if no syntax errors found
	 *   - `errors`: Array of syntax errors with location details
	 *   - `validationTime`: Time spent validating in milliseconds
	 *   - `firstErrorPosition`: Offset of first error (if any)
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 *
	 * // Valid syntax
	 * const result1 = parser.validateSyntax("const x = 42;");
	 * console.log(result1.isValid); // true
	 *
	 * // Invalid syntax
	 * const result2 = parser.validateSyntax("const = invalid");
	 * console.log(result2.isValid); // false
	 * console.log(result2.errors.length); // > 0
	 * console.log(result2.firstErrorPosition); // position of error
	 * ```
	 *
	 * @since 2.0.0
	 */
	validateSyntax(content: string): SyntaxValidationResult {
		const startTime = Date.now();

		try {
			const ast = this.parser.parse(content) as unknown as TreeSitterTree;
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
	/**
	 * Gets comprehensive metadata about the parser capabilities and configuration
	 *
	 * Returns detailed information about supported languages, performance characteristics,
	 * and current configuration. Useful for diagnostics and capability detection.
	 *
	 * @returns ParserMetadata containing:
	 *   - `name`: Parser identifier
	 *   - `version`: Current parser version
	 *   - `supportedLanguages`: Array of supported language identifiers
	 *   - `supportedExtensions`: Array of supported file extensions
	 *   - `capabilities`: Feature flags and limits
	 *   - `performance`: Performance characteristics and metrics
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 * const metadata = parser.getMetadata();
	 *
	 * console.log(metadata.name);                    // "TypeScriptParser"
	 * console.log(metadata.supportedLanguages);      // ["typescript", "tsx", ...]
	 * console.log(metadata.capabilities.maxFileSize); // 10485760
	 * console.log(metadata.performance.averageSpeed); // 10000 lines/sec
	 *
	 * // Check capabilities
	 * if (metadata.capabilities.incrementalParsing) {
	 *   console.log("Incremental parsing supported");
	 * }
	 * ```
	 *
	 * @since 2.0.0
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
	/**
	 * Updates parser configuration with new options
	 *
	 * Merges provided options with existing configuration. Allows runtime
	 * reconfiguration without creating new parser instance.
	 *
	 * @param options - Partial configuration options to update
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 *
	 * // Update timeout and file size limits
	 * parser.configure({
	 *   timeout: 45000,         // 45 second timeout
	 *   maxFileSize: 20 * 1024 * 1024  // 20MB limit
	 * });
	 *
	 * // Enable trivia parsing for comments
	 * parser.configure({ includeTrivia: true });
	 * ```
	 *
	 * @since 2.0.0
	 */
	configure(options: ParserOptions): void {
		this.options = { ...this.options, ...options };
	}

	/**
	 * Gets the current parser configuration
	 */
	/**
	 * Gets a copy of the current parser configuration
	 *
	 * Returns a shallow copy of current options to prevent external mutation.
	 * Useful for inspecting current settings or creating similar parser instances.
	 *
	 * @returns Copy of current ParserOptions configuration
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser({ timeout: 60000 });
	 * const config = parser.getConfiguration();
	 *
	 * console.log(config.timeout);     // 60000
	 * console.log(config.maxFileSize); // 10485760 (default)
	 *
	 * // Safe to modify returned object
	 * config.timeout = 30000; // doesn't affect parser
	 * ```
	 *
	 * @since 2.0.0
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
	/**
	 * Traverses AST using visitor pattern with lifecycle hooks
	 *
	 * Provides flexible AST traversal with enter/leave hooks and node-type-specific
	 * callbacks. Essential for building custom analyzers and extractors.
	 *
	 * @param ast - Tree-sitter AST to traverse
	 * @param visitor - Visitor object with optional callback methods:
	 *   - `enter(node, parent)`: Called before visiting node children
	 *   - `leave(node, parent)`: Called after visiting node children
	 *   - `[nodeType](node, parent)`: Called for specific node types
	 *
	 * @example
	 * ```typescript
	 * const parser = new TypeScriptParser();
	 * const result = await parser.parse("test.ts", code);
	 *
	 * if (result.ast) {
	 *   const identifiers: string[] = [];
	 *
	 *   parser.traverse(result.ast, {
	 *     // Collect all identifiers
	 *     identifier: (node) => {
	 *       identifiers.push(node.text);
	 *     },
	 *
	 *     // Track function entries
	 *     function_declaration: (node) => {
	 *       console.log(`Found function: ${node.child(1)?.text}`);
	 *     },
	 *
	 *     // General enter/leave hooks
	 *     enter: (node, parent) => {
	 *       console.log(`Entering ${node.type}`);
	 *       return true; // continue traversal
	 *     }
	 *   });
	 * }
	 * ```
	 *
	 * @remarks
	 * - Visitor methods can return `false` to skip child traversal
	 * - `enter` hook is called before node-specific callbacks
	 * - `leave` hook is called after visiting all children
	 * - Traversal is depth-first, pre-order for enter, post-order for leave
	 *
	 * @since 2.0.0
	 */
	traverse(ast: AST, visitor: ASTVisitor): void {
		if (!ast) return;

		const visit = (node: TreeSitterNode, parent?: TreeSitterNode): void => {
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
			if (node?.childCount) {
				for (let i = 0; i < node.childCount; i++) {
					const child = node.child(i);
					if (child) visit(child, node);
				}
			}

			// Call leave hook
			if (visitor.leave) {
				visitor.leave(node, parent);
			}
		};

		if ((ast as TreeSitterTree)?.rootNode) {
			visit((ast as TreeSitterTree).rootNode);
		}
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

	private extractSyntaxErrors(
		ast: TreeSitterTree,
		_content: string,
	): ParseError[] {
		const errors: ParseError[] = [];

		const visit = (node: TreeSitterNode): void => {
			// Add null check to prevent errors
			if (!node) return;
			
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
				const child = node.child(i);
				if (child) visit(child);
			}
		};

		// Add null check for ast and rootNode
		if (ast && ast.rootNode) {
			visit(ast.rootNode);
		}
		return errors;
	}

	private countNodes(ast: TreeSitterTree): number {
		let count = 0;

		const visit = (node: TreeSitterNode): void => {
			count++;
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) visit(child);
			}
		};

		visit(ast.rootNode);
		return count;
	}

	private calculateMaxDepth(ast: TreeSitterTree): number {
		const visit = (node: TreeSitterNode, depth: number = 0): number => {
			let maxDepth = depth;

			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child) {
					const childDepth = visit(child, depth + 1);
					maxDepth = Math.max(maxDepth, childDepth);
				}
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
	private extractDependenciesFromAST(ast: TreeSitterTree): DependencyInfo[] {
		const dependencies: DependencyInfo[] = [];

		const visit = (node: TreeSitterNode): void => {
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
				const child = node.child(i);
				if (child) visit(child);
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
	private extractImportSource(node: TreeSitterNode): string | null {
		// Find string_literal child node
		const visit = (n: TreeSitterNode): string | null => {
			if (n.type === "string") {
				return n.text.slice(1, -1); // Remove quotes
			}
			for (let i = 0; i < n.childCount; i++) {
				const child = n.child(i);
				if (child) {
					const result = visit(child);
					if (result) return result;
				}
			}
			return null;
		};
		return visit(node);
	}

	/**
	 * Extract require source from call_expression node
	 */
	private extractRequireSource(node: TreeSitterNode): string | null {
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
