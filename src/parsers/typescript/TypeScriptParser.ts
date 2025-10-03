/**
 * TypeScript Parser
 * TypeScript/TSX 파일 파싱을 위한 tree-sitter 래퍼
 */

import { promises as fs } from "node:fs";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { QueryExecutionContext } from "../../core/types";
import { BaseParser, type ParseResult, type ParserOptions } from "../base";

export class TypeScriptParser extends BaseParser {
	protected language = "typescript" as const;
	protected fileExtensions = ["ts", "tsx", "js", "jsx"];

	// Cache parser instances for reuse
	private tsParser: Parser | null = null;
	private tsxParser: Parser | null = null;

	private createParser(isTsx: boolean): Parser {
		const parser = new Parser();
		parser.setLanguage(isTsx ? TypeScript.tsx : TypeScript.typescript);
		return parser;
	}

	/**
	 * Get tree-sitter Parser instance for query execution
	 * Returns TypeScript parser by default (works for both TS and TSX)
	 */
	getParser(): Parser {
		if (!this.tsParser) {
			this.tsParser = this.createParser(false);
		}
		return this.tsParser;
	}

	/**
	 * 파서 캐시 클리어 (테스트 격리용)
	 */
	clearCache(): void {
		this.tsParser = null;
		this.tsxParser = null;
	}

	/**
	 * 소스 코드 파싱
	 */
	override async parse(
		sourceCode: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		const startTime = performance.now();

		try {
			// TSX 파일인지 확인
			const isTsx =
				options.filePath?.endsWith(".tsx") ||
				(sourceCode.includes("<") &&
					(sourceCode.includes("/>") || sourceCode.includes("</")));

			// Use cached parsers
			let parser: Parser;
			if (isTsx) {
				if (!this.tsxParser) {
					this.tsxParser = this.createParser(true);
				}
				parser = this.tsxParser;
			} else {
				if (!this.tsParser) {
					this.tsParser = this.createParser(false);
				}
				parser = this.tsParser;
			}

			const tree = parser.parse(sourceCode);

			// tree-sitter always returns a tree with a rootNode
			// Even if there are syntax errors, it returns a best-effort AST
			if (!tree || !tree.rootNode) {
				throw new Error(
					"Failed to parse TypeScript code: No tree or rootNode returned",
				);
			}

			const parseTime = performance.now() - startTime;

			const context: QueryExecutionContext = {
				sourceCode,
				language: this.language,
				filePath: options.filePath || "unknown.ts",
				tree,
			};

			return {
				tree,
				context,
				metadata: {
					language: this.language,
					filePath: options.filePath,
					parseTime,
					nodeCount: this.countTreeSitterNodes(tree.rootNode),
				},
			};
		} catch (error) {
			console.error("TypeScript parsing error details:", {
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				sourceCode: `${sourceCode.slice(0, 100)}...`,
				options,
			});
			throw new Error(
				`TypeScript parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * 파일 파싱
	 */
	override async parseFile(
		filePath: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		try {
			const sourceCode = await fs.readFile(filePath, "utf-8");
			return this.parse(sourceCode, { ...options, filePath });
		} catch (error) {
			throw new Error(
				`Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}

export default TypeScriptParser;
