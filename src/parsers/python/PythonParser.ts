/**
 * Python Parser
 * Python 파일 파싱을 위한 tree-sitter 래퍼
 */

import { promises as fs } from "node:fs";
import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import type { QueryExecutionContext } from "../../core/types";
import { BaseParser, type ParseResult, type ParserOptions } from "../base";

export class PythonParser extends BaseParser {
	protected language = "python" as const;
	protected fileExtensions = ["py", "pyi"];

	private parser: Parser;

	constructor() {
		super();

		// Python 파서 초기화
		this.parser = new Parser();
		this.parser.setLanguage(Python);
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
			const tree = this.parser.parse(sourceCode);

			if (!tree.rootNode) {
				throw new Error("Failed to parse Python code");
			}

			const parseTime = performance.now() - startTime;

			const context: QueryExecutionContext = {
				sourceCode,
				language: this.language,
				filePath: options.filePath || "unknown.py",
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
				`Python parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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

export default PythonParser;
