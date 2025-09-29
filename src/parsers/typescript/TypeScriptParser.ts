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

	private createParser(isTsx: boolean): Parser {
		const parser = new Parser();
		parser.setLanguage(isTsx ? TypeScript.tsx : TypeScript.typescript);
		return parser;
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

			const parser = this.createParser(isTsx);
			const tree = parser.parse(sourceCode);

			if (!tree.rootNode) {
				throw new Error("Failed to parse TypeScript code");
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
