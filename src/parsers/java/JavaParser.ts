/**
 * Java Parser
 * Java 파일 파싱을 위한 tree-sitter 래퍼
 */

import { promises as fs } from "node:fs";
import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type { QueryExecutionContext } from "../../core/types";
import { BaseParser, type ParseResult, type ParserOptions } from "../base";

export class JavaParser extends BaseParser {
	protected language = "java" as const;
	protected fileExtensions = ["java"];

	// Cache parser instance for reuse
	private parser: Parser | null = null;

	private createParser(): Parser {
		const parser = new Parser();
		try {
			// Java 언어 설정
			parser.setLanguage(Java);

			// 언어 설정 검증
			const setLanguage = parser.getLanguage();
			if (!setLanguage) {
				throw new Error("Failed to set Java language on parser");
			}
		} catch (error) {
			console.warn(
				`Java parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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

			// 파서 언어 설정 확인
			const language = parser.getLanguage();
			console.log("Java parser language:", {
				language: !!language,
				languageName: language?.name,
			});

			const tree = parser.parse(sourceCode);

			console.log("Java parsing result:", {
				tree: !!tree,
				rootNode: !!tree?.rootNode,
				rootNodeType: tree?.rootNode?.type,
				sourceCodeLength: sourceCode.length,
			});

			if (!tree || !tree.rootNode) {
				console.warn("Tree-sitter Java parsing failed, using fallback parsing");
				return this.fallbackParse(sourceCode, options);
			}

			const parseTime = performance.now() - startTime;

			const context: QueryExecutionContext = {
				sourceCode,
				language: this.language,
				filePath: options.filePath || "unknown.java",
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
			console.error("Java parsing error details:", {
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				sourceCode: `${sourceCode.slice(0, 100)}...`,
				options,
			});
			throw new Error(
				`Java parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Fallback 파싱 (Tree-sitter 실패 시)
	 */
	private async fallbackParse(
		sourceCode: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		const startTime = performance.now();

		// 기본 mock tree 생성
		const mockTree = {
			rootNode: {
				type: "program",
				text: sourceCode,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: sourceCode.split("\n").length - 1, column: 0 },
				childCount: 1,
				children: [],
			},
		} as any;

		const context: QueryExecutionContext = {
			sourceCode,
			language: this.language,
			filePath: options.filePath || "unknown.java",
			tree: mockTree,
		};

		return {
			tree: mockTree,
			context,
			metadata: {
				language: this.language,
				filePath: options.filePath,
				parseTime: performance.now() - startTime,
				nodeCount: 1,
			},
		};
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

export default JavaParser;
