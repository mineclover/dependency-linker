/**
 * Go Parser
 * Go 파일 파싱을 위한 tree-sitter 래퍼
 */

import { promises as fs } from "node:fs";
import Parser from "tree-sitter";
import Go from "tree-sitter-go";
import type { QueryExecutionContext } from "../../core/types";
import { BaseParser, type ParseResult, type ParserOptions } from "../base";

export class GoParser extends BaseParser {
	protected language = "go" as const;
	protected fileExtensions = ["go"];

	// Cache parser instance for reuse
	private parser: Parser | null = null;

	private createParser(): Parser {
		const parser = new Parser();
		try {
			// Go 언어 설정
			parser.setLanguage(Go);

			// 언어 설정 검증
			const setLanguage = parser.getLanguage();
			if (!setLanguage) {
				throw new Error("Failed to set Go language on parser");
			}
		} catch (error) {
			console.warn(
				`Go parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		}
		return parser;
	}

	/**
	 * Get tree-sitter Parser instance for query execution
	 */
	getParser(): Parser {
		if (!this.parser) {
			this.parser = this.createParser();
		}
		return this.parser;
	}

	/**
	 * 파서 캐시 클리어 (테스트 격리용)
	 */
	clearCache(): void {
		this.parser = null;
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
			const parser = this.getParser();
			const tree = parser.parse(sourceCode);

			if (!tree || !tree.rootNode) {
				throw new Error(
					"Failed to parse Go code: No tree or rootNode returned",
				);
			}

			const parseTime = performance.now() - startTime;

			const context: QueryExecutionContext = {
				sourceCode,
				language: this.language,
				filePath: options.filePath || "unknown.go",
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
			throw new Error(
				`Go parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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

export default GoParser;
