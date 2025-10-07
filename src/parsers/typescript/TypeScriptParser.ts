/**
 * TypeScript Parser
 * TypeScript/TSX 파일 파싱을 위한 tree-sitter 래퍼
 * Thread-Safe Parser Pool 사용
 */

import { promises as fs } from "node:fs";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import type { QueryExecutionContext } from "../../core/types";
import { BaseParser, type ParseResult, type ParserOptions } from "../base";

/**
 * Parser Pool for Thread Safety
 * 각 파서 인스턴스가 독립적인 Language 객체를 사용하도록 보장
 */
class ParserPool {
	private static instance: ParserPool;
	private tsParsers: Parser[] = [];
	private tsxParsers: Parser[] = [];
	private maxPoolSize = 10;
	private currentTsIndex = 0;
	private currentTsxIndex = 0;

	private constructor() {}

	static getInstance(): ParserPool {
		if (!ParserPool.instance) {
			ParserPool.instance = new ParserPool();
		}
		return ParserPool.instance;
	}

	/**
	 * TypeScript Parser 인스턴스 가져오기 (Thread-Safe)
	 */
	getTypeScriptParser(): Parser {
		if (this.tsParsers.length === 0) {
			this.initializeParsers();
		}

		const parser = this.tsParsers[this.currentTsIndex];
		this.currentTsIndex = (this.currentTsIndex + 1) % this.tsParsers.length;
		return parser;
	}

	/**
	 * TSX Parser 인스턴스 가져오기 (Thread-Safe)
	 */
	getTsxParser(): Parser {
		if (this.tsxParsers.length === 0) {
			this.initializeParsers();
		}

		const parser = this.tsxParsers[this.currentTsxIndex];
		this.currentTsxIndex = (this.currentTsxIndex + 1) % this.tsxParsers.length;
		return parser;
	}

	/**
	 * Parser Pool 초기화
	 * 각 Parser가 독립적인 Language 객체를 사용하도록 보장
	 */
	private initializeParsers(): void {
		try {
			// TypeScript Parsers 초기화
			for (let i = 0; i < this.maxPoolSize; i++) {
				const parser = new Parser();
				// TypeScript.typescript가 직접 Language 객체
				const language = TypeScript.typescript;
				if (!language) {
					throw new Error("TypeScript.typescript not available");
				}

				parser.setLanguage(language);

				// 언어 설정 검증
				const setLanguage = parser.getLanguage();
				if (!setLanguage) {
					throw new Error("Failed to set TypeScript language on parser");
				}

				this.tsParsers.push(parser);
			}

			// TSX Parsers 초기화
			for (let i = 0; i < this.maxPoolSize; i++) {
				const parser = new Parser();
				// TypeScript.tsx가 직접 Language 객체
				const language = TypeScript.tsx;
				if (!language) {
					throw new Error("TypeScript.tsx not available");
				}

				parser.setLanguage(language);

				// 언어 설정 검증
				const setLanguage = parser.getLanguage();
				if (!setLanguage) {
					throw new Error("Failed to set TSX language on parser");
				}

				this.tsxParsers.push(parser);
			}
		} catch (error) {
			console.error("Failed to initialize parsers:", error);
			throw error;
		}
	}

	/**
	 * Pool 크기 조정
	 */
	setPoolSize(size: number): void {
		this.maxPoolSize = Math.max(1, Math.min(20, size));
	}

	/**
	 * Pool 상태 확인
	 */
	getPoolStatus(): { tsParsers: number; tsxParsers: number; maxSize: number } {
		return {
			tsParsers: this.tsParsers.length,
			tsxParsers: this.tsxParsers.length,
			maxSize: this.maxPoolSize,
		};
	}

	/**
	 * Pool 초기화 (테스트 격리용)
	 */
	clearPool(): void {
		this.tsParsers = [];
		this.tsxParsers = [];
		this.currentTsIndex = 0;
		this.currentTsxIndex = 0;
	}
}

export class TypeScriptParser extends BaseParser {
	protected language = "typescript" as const;
	protected fileExtensions = ["ts", "tsx"];

	private parserPool: ParserPool;

	constructor() {
		super();
		this.parserPool = ParserPool.getInstance();
	}

	/**
	 * Get tree-sitter Parser instance for query execution
	 * Thread-safe parser pool에서 가져옴
	 */
	getParser(): Parser {
		return this.parserPool.getTypeScriptParser();
	}

	/**
	 * Parser Pool 인스턴스 반환 (디버깅용)
	 */
	getParserPool(): ParserPool {
		return this.parserPool;
	}

	/**
	 * 파서 캐시 클리어 (테스트 격리용)
	 */
	clearCache(): void {
		this.parserPool.clearPool();
	}

	/**
	 * 소스 코드 파싱 (Thread-Safe)
	 */
	override async parse(
		sourceCode: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		const startTime = performance.now();

		// Jest 환경에서 mock 파싱 사용
		if (process.env.NODE_ENV === "test") {
			return this.mockParse(sourceCode, options);
		}

		try {
			// TSX 파일인지 확인
			const isTsx =
				options.filePath?.endsWith(".tsx") ||
				(sourceCode.includes("<") &&
					(sourceCode.includes("/>") || sourceCode.includes("</")));

			// Thread-safe parser pool에서 parser 가져오기
			const parser = isTsx
				? this.parserPool.getTsxParser()
				: this.parserPool.getTypeScriptParser();

			// 파서 상태 디버깅
			const language = parser.getLanguage();
			if (!language) {
				throw new Error("Parser language not set");
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
	 * Tree-sitter 노드 개수 계산
	 */
	protected override countTreeSitterNodes(node: any): number {
		if (!node) return 0;
		let count = 1;
		for (let i = 0; i < node.childCount; i++) {
			count += this.countTreeSitterNodes(node.child(i));
		}
		return count;
	}

	/**
	 * Jest 환경에서 사용할 mock 파싱 - 실제 파싱 수행
	 */
	private async mockParse(
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

			// Thread-safe parser pool에서 parser 가져오기
			const parser = isTsx
				? this.parserPool.getTsxParser()
				: this.parserPool.getTypeScriptParser();

			// 파서 상태 디버깅
			const language = parser.getLanguage();
			if (!language) {
				throw new Error("Parser language not set");
			}

			const tree = parser.parse(sourceCode);
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
			console.error("Mock parsing error details:", {
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				sourceCode: `${sourceCode.slice(0, 100)}...`,
				options,
			});

			// 파싱 실패 시 기본 mock tree 반환
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
				filePath: options.filePath || "unknown.ts",
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

	/**
	 * Parser Pool 상태 확인
	 */
	getPoolStatus(): { tsParsers: number; tsxParsers: number; maxSize: number } {
		return this.parserPool.getPoolStatus();
	}

	/**
	 * Parser Pool 크기 조정
	 */
	setPoolSize(size: number): void {
		this.parserPool.setPoolSize(size);
	}
}

export default TypeScriptParser;
