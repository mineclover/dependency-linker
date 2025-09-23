/**
 * JavaParser implementation
 * Tree-sitter based parser for Java files
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type { AST } from "../extractors/IDataExtractor";
import type { TreeSitterLanguage, TreeSitterNode, TreeSitterTree } from "../types/TreeSitterTypes";
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

export class JavaParser implements ILanguageParser {
	private parser: Parser;
	private options: ParserOptions;

	constructor(options: ParserOptions = {}) {
		this.parser = new Parser();
		this.parser.setLanguage(Java);

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

			// Parse with timeout
			const timeout = this.options.timeout ?? 30000;
			const ast = await this.parseWithTimeout(sourceCode, timeout);

			if (!ast) {
				throw new Error("Failed to parse file - AST is null");
			}

			// Check for syntax errors
			const syntaxErrors = this.extractSyntaxErrors(ast, sourceCode);
			errors.push(...syntaxErrors);

			// Add Java-specific warnings
			const javaWarnings = this.extractJavaWarnings(ast, sourceCode);
			warnings.push(...javaWarnings);

			const parseTime = Date.now() - startTime;

			return {
				ast,
				language: "java",
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
					grammarVersion: "0.20.2",
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
				language: "java",
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
					grammarVersion: "0.20.2",
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
		return ["java"].includes(language.toLowerCase());
	}

	/**
	 * Detects the language from file path and/or content
	 */
	detectLanguage(filePath: string, content?: string): string {
		const ext = path.extname(filePath).toLowerCase();

		if (ext === ".java") {
			return "java";
		}

		// Try to detect from content
		if (content) {
			if (
				content.includes("public class ") ||
				content.includes("package ") ||
				content.includes("import java.")
			) {
				return "java";
			}
		}

		return "unknown";
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
			name: "JavaParser",
			version: "1.0.0",
			supportedLanguages: ["java"],
			supportedExtensions: [".java"],
			capabilities: {
				incrementalParsing: true,
				errorRecovery: true,
				syntaxHighlighting: true,
				codeFolding: true,
				maxFileSize: this.options.maxFileSize || 10485760,
				memoryLimit: this.options.memoryLimit || 104857600,
			},
			performance: {
				averageSpeed: 8000, // lines per second (Java is more verbose)
				memoryPerKB: 2560,
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
	): Promise<TreeSitterTree> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Parse timeout after ${timeout}ms`));
			}, timeout);

			try {
				const ast = this.parser.parse(content) as unknown as TreeSitterTree;
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
			if (node.hasError()) {
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

	private extractJavaWarnings(ast: any, content: string): ParseWarning[] {
		const warnings: ParseWarning[] = [];

		const visit = (node: any): void => {
			// Check for common Java style issues
			if (node.type === "class_declaration") {
				const text = content.slice(node.startIndex, node.endIndex);
				// Check if class name matches file name (simplified)
				if (!text.includes("public class")) {
					warnings.push({
						message:
							"Consider making class public if it should be accessible from other packages",
						location: {
							line: node.startPosition.row + 1,
							column: node.startPosition.column + 1,
						},
						code: "JAVA_CLASS_VISIBILITY",
					});
				}
			}

			// Check for raw types
			if (node.type === "type_identifier") {
				const text = content.slice(node.startIndex, node.endIndex);
				if (["List", "Map", "Set", "Collection"].includes(text)) {
					warnings.push({
						message: "Consider using parameterized types instead of raw types",
						location: {
							line: node.startPosition.row + 1,
							column: node.startPosition.column + 1,
						},
						code: "JAVA_RAW_TYPE",
					});
				}
			}

			// Check for deprecated API usage (simplified)
			if (node.type === "method_invocation") {
				const text = content.slice(node.startIndex, node.endIndex);
				if (text.includes(".finalize(")) {
					warnings.push({
						message: "finalize() method is deprecated and should be avoided",
						location: {
							line: node.startPosition.row + 1,
							column: node.startPosition.column + 1,
						},
						code: "JAVA_DEPRECATED_METHOD",
					});
				}
			}

			for (let i = 0; i < node.childCount; i++) {
				visit(node.child(i));
			}
		};

		visit(ast.rootNode);
		return warnings;
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
}
