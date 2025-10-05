/**
 * Markdown Parser
 * 마크다운 파일 파싱 및 심볼 추출
 */

import Parser = require("tree-sitter");
import { createRDFAddress } from "../../core/RDFAddress";
import type { NodeType } from "../../core/RDFAddress";
import type { SupportedLanguage } from "../../core/types";
import { BaseParser, type ParserOptions, type ParseResult } from "../base";

// ===== MARKDOWN TYPES =====

/**
 * 마크다운 심볼 타입
 */
export type MarkdownSymbolType =
	| "heading"
	| "link"
	| "image"
	| "code_block"
	| "inline_code"
	| "list_item"
	| "table"
	| "blockquote"
	| "reference"
	| "tag";

/**
 * 마크다운 심볼 정보
 */
export interface MarkdownSymbol {
	/** 심볼 타입 */
	type: MarkdownSymbolType;
	/** 심볼 이름/내용 */
	name: string;
	/** 심볼 레벨 (heading의 경우) */
	level?: number;
	/** 파일 경로 (링크의 경우) */
	filePath?: string;
	/** URL (링크의 경우) */
	url?: string;
	/** 앵커 ID (heading의 경우) */
	anchorId?: string;
	/** 위치 정보 */
	location: {
		line: number;
		column: number;
		endLine?: number;
		endColumn?: number;
	};
	/** 메타데이터 */
	metadata: Record<string, any>;
}

/**
 * 마크다운 파싱 결과
 */
export interface MarkdownParseResult {
	/** Tree-sitter 파싱 결과 */
	tree: any;
	/** 추출된 심볼들 */
	symbols: MarkdownSymbol[];
	/** 링크 정보 */
	links: MarkdownLink[];
	/** 파일 경로 */
	filePath: string;
	/** 프로젝트 이름 */
	projectName: string;
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
	/** 메타데이터 */
	metadata: {
		nodeCount: number;
		headingCount: number;
		linkCount: number;
		tagCount: number;
	};
}

/**
 * 마크다운 링크 정보
 */
export interface MarkdownLink {
	/** 링크 텍스트 */
	text: string;
	/** 링크 URL */
	url: string;
	/** 링크 타입 */
	type: "internal" | "external" | "anchor";
	/** 대상 파일 경로 (내부 링크의 경우) */
	targetPath?: string;
	/** 앵커 ID (앵커 링크의 경우) */
	anchorId?: string;
	/** 위치 정보 */
	location: {
		line: number;
		column: number;
	};
}

// ===== MARKDOWN PARSER =====

/**
 * 마크다운 파서
 */
export class MarkdownParser extends BaseParser {
	protected language: SupportedLanguage = "markdown";
	protected fileExtensions: string[] = ["md", "markdown", "mdx"];
	private parser: Parser;

	constructor() {
		super();
		this.parser = new Parser();
		// Tree-sitter 마크다운 언어 설정
		try {
			const markdownLanguage = require("tree-sitter-markdown");
			this.parser.setLanguage(markdownLanguage);
		} catch (error) {
			console.warn(
				"Tree-sitter markdown language not available, using fallback parsing",
			);
		}
	}

	/**
	 * tree-sitter Parser 인스턴스 반환
	 */
	getParser(): Parser {
		return this.parser;
	}

	/**
	 * 소스 코드 파싱
	 */
	async parse(
		sourceCode: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		const startTime = Date.now();

		try {
			const tree = this.parser.parse(sourceCode);
			const nodeCount = this.countTreeSitterNodes(tree.rootNode);

			return {
				tree,
				context: {
					language: this.language,
					filePath: options.filePath || "",
					sourceCode,
					tree,
				},
				metadata: {
					language: this.language,
					filePath: options.filePath,
					parseTime: Date.now() - startTime,
					nodeCount,
				},
			};
		} catch (error) {
			// Tree-sitter 파싱 실패 시 fallback 파싱 사용
			return this.fallbackParse(sourceCode, options);
		}
	}

	/**
	 * Fallback 파싱 (Tree-sitter 없이)
	 */
	private fallbackParse(
		sourceCode: string,
		options: ParserOptions = {},
	): ParseResult {
		// 가짜 tree 객체 생성
		const fakeTree = {
			rootNode: {
				type: "document",
				text: sourceCode,
				startPosition: { row: 0, column: 0 },
				endPosition: { row: sourceCode.split("\n").length - 1, column: 0 },
			},
		} as any;

		return {
			tree: fakeTree,
			context: {
				language: this.language,
				filePath: options.filePath || "",
				sourceCode,
				tree: fakeTree,
			},
			metadata: {
				language: this.language,
				filePath: options.filePath,
				parseTime: 0,
				nodeCount: 1,
			},
		};
	}

	/**
	 * 마크다운 전용 파싱 (심볼 추출 포함)
	 */
	async parseMarkdown(
		source: string,
		filePath: string = "",
		projectName: string = "",
	): Promise<MarkdownParseResult> {
		try {
			const parseResult = await this.parse(source);
			const symbols = this.extractMarkdownSymbols(source);
			const links = this.extractMarkdownLinks(source);
			const metadata = {
				nodeCount: parseResult.metadata.nodeCount,
				headingCount: symbols.filter((s) => s.type === "heading").length,
				linkCount: symbols.filter((s) => s.type === "link").length,
				tagCount: symbols.filter((s) => s.type === "tag").length,
			};

			return {
				tree: parseResult.tree,
				symbols,
				links,
				filePath,
				projectName,
				errors: [],
				warnings: [],
				metadata,
			};
		} catch (error) {
			throw new Error(`Markdown parsing failed: ${error}`);
		}
	}

	/**
	 * 마크다운 심볼 추출
	 */
	private extractMarkdownSymbols(source: string): MarkdownSymbol[] {
		const symbols: MarkdownSymbol[] = [];

		// 헤딩 추출
		const headingRegex = /^(#{1,6})\s+(.+)$/gm;
		let match;
		while ((match = headingRegex.exec(source)) !== null) {
			const level = match[1].length;
			const text = match[2].trim();
			symbols.push({
				type: "heading",
				name: text,
				location: {
					line: source.substring(0, match.index).split("\n").length,
					column: 0,
					endLine: source.substring(0, match.index).split("\n").length,
					endColumn: match[0].length,
				},
				metadata: {
					level,
					text,
				},
			});
		}

		// 링크 추출
		const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
		while ((match = linkRegex.exec(source)) !== null) {
			const text = match[1];
			const url = match[2];
			symbols.push({
				type: "link",
				name: text,
				location: {
					line: source.substring(0, match.index).split("\n").length,
					column: 0,
					endLine: source.substring(0, match.index).split("\n").length,
					endColumn: match[0].length,
				},
				metadata: {
					url,
					text,
				},
			});
		}

		// 태그 추출
		const tagRegex = /#[\w가-힣]+/g;
		while ((match = tagRegex.exec(source)) !== null) {
			const tag = match[0];
			symbols.push({
				type: "tag",
				name: tag,
				location: {
					line: source.substring(0, match.index).split("\n").length,
					column: 0,
					endLine: source.substring(0, match.index).split("\n").length,
					endColumn: match[0].length,
				},
				metadata: {
					tag,
				},
			});
		}

		return symbols;
	}

	/**
	 * 마크다운 링크 추출
	 */
	private extractMarkdownLinks(source: string): MarkdownLink[] {
		const links: MarkdownLink[] = [];

		// 링크 추출
		const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
		let match;
		while ((match = linkRegex.exec(source)) !== null) {
			const text = match[1];
			const url = match[2];
			const linkType = this.determineLinkType(url);

			links.push({
				text,
				url,
				type: linkType,
				targetPath:
					linkType === "internal" ? this.extractInternalPath(url) : undefined,
				anchorId: linkType === "anchor" ? this.extractAnchorId(url) : undefined,
				location: {
					line: source.substring(0, match.index).split("\n").length,
					column: 0,
				},
			});
		}

		return links;
	}

	/**
	 * 링크 타입 결정
	 */
	private determineLinkType(url: string): "internal" | "external" | "anchor" {
		if (url.startsWith("#")) {
			return "anchor";
		} else if (
			url.startsWith("http://") ||
			url.startsWith("https://") ||
			url.startsWith("mailto:")
		) {
			return "external";
		} else {
			return "internal";
		}
	}

	/**
	 * 내부 경로 추출
	 */
	private extractInternalPath(url: string): string {
		// 상대 경로를 절대 경로로 변환하는 로직
		return url;
	}

	/**
	 * 앵커 ID 추출
	 */
	private extractAnchorId(url: string): string {
		return url.substring(1); // # 제거
	}

	/**
	 * 파일 파싱
	 */
	async parseFile(
		filePath: string,
		options: ParserOptions = {},
	): Promise<ParseResult> {
		const fs = await import("node:fs/promises");
		const sourceCode = await fs.readFile(filePath, "utf-8");
		return this.parse(sourceCode, { ...options, filePath });
	}

	/**
	 * 파서 캐시 클리어
	 */
	clearCache(): void {
		// 마크다운 파서는 캐시를 사용하지 않음
	}

	/**
	 * 심볼 추출
	 */
	private async extractSymbols(
		node: any,
		sourceCode: string,
		symbols: MarkdownSymbol[],
		links: MarkdownLink[],
	): Promise<void> {
		// AST 노드 순회
		for (let i = 0; i < node.childCount; i++) {
			const child = node.child(i);

			if (!child) continue;

			// Heading 추출
			if (child.type === "atx_heading" || child.type === "setext_heading") {
				const heading = this.extractHeading(child, sourceCode);
				if (heading) {
					symbols.push(heading);
				}
			}

			// Link 추출
			if (child.type === "link") {
				const link = this.extractLink(child, sourceCode);
				if (link) {
					links.push(link);
					symbols.push({
						type: "link",
						name: link.text,
						url: link.url,
						filePath: link.targetPath,
						location: link.location,
						metadata: {
							rawText: link.text,
							attributes: { url: link.url },
						},
					});
				}
			}

			// Image 추출
			if (child.type === "image") {
				const image = this.extractImage(child, sourceCode);
				if (image) {
					symbols.push(image);
				}
			}

			// Code block 추출
			if (child.type === "fenced_code_block") {
				const codeBlock = this.extractCodeBlock(child, sourceCode);
				if (codeBlock) {
					symbols.push(codeBlock);
				}
			}

			// 재귀적으로 하위 노드 처리
			await this.extractSymbols(child, sourceCode, symbols, links);
		}
	}

	/**
	 * Heading 추출
	 */
	private extractHeading(node: any, sourceCode: string): MarkdownSymbol | null {
		try {
			// Heading 레벨 추출
			let level = 1;
			if (node.type === "atx_heading") {
				// ATX heading (# ## ###)
				const hashNode = node.child(0);
				if (hashNode && hashNode.type === "atx_h1_marker") {
					level = 1;
				} else if (hashNode && hashNode.type === "atx_h2_marker") {
					level = 2;
				} else if (hashNode && hashNode.type === "atx_h3_marker") {
					level = 3;
				} else if (hashNode && hashNode.type === "atx_h4_marker") {
					level = 4;
				} else if (hashNode && hashNode.type === "atx_h5_marker") {
					level = 5;
				} else if (hashNode && hashNode.type === "atx_h6_marker") {
					level = 6;
				}
			}

			// Heading 텍스트 추출
			const textNode = node.descendantsOfType("heading_content")[0];
			if (!textNode) return null;

			const text = sourceCode
				.slice(textNode.startIndex, textNode.endIndex)
				.trim();
			const anchorId = this.generateAnchorId(text);

			return {
				type: "heading",
				name: text,
				level,
				anchorId,
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
					endLine: node.endPosition.row + 1,
					endColumn: node.endPosition.column + 1,
				},
				metadata: {
					rawText: text,
					attributes: { level: level.toString(), anchorId },
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * Link 추출
	 */
	private extractLink(node: any, sourceCode: string): MarkdownLink | null {
		try {
			// Link 텍스트 추출
			const textNode = node.descendantsOfType("link_text")[0];
			if (!textNode) return null;

			const text = sourceCode
				.slice(textNode.startIndex, textNode.endIndex)
				.trim();

			// Link URL 추출
			const urlNode = node.descendantsOfType("destination")[0];
			if (!urlNode) return null;

			const url = sourceCode.slice(urlNode.startIndex, urlNode.endIndex).trim();

			// 링크 타입 결정
			const linkType = this.determineLinkType(url);
			const targetPath =
				linkType === "internal" ? this.extractInternalPath(url) : undefined;
			const anchorId =
				linkType === "anchor" ? this.extractAnchorId(url) : undefined;

			return {
				text,
				url,
				type: linkType,
				targetPath,
				anchorId,
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * Image 추출
	 */
	private extractImage(node: any, sourceCode: string): MarkdownSymbol | null {
		try {
			// Image alt text 추출
			const altNode = node.descendantsOfType("link_text")[0];
			if (!altNode) return null;

			const altText = sourceCode
				.slice(altNode.startIndex, altNode.endIndex)
				.trim();

			// Image URL 추출
			const urlNode = node.descendantsOfType("destination")[0];
			if (!urlNode) return null;

			const url = sourceCode.slice(urlNode.startIndex, urlNode.endIndex).trim();

			return {
				type: "image",
				name: altText,
				url,
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
					endLine: node.endPosition.row + 1,
					endColumn: node.endPosition.column + 1,
				},
				metadata: {
					rawText: altText,
					attributes: { url, alt: altText },
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * Code block 추출
	 */
	private extractCodeBlock(
		node: any,
		sourceCode: string,
	): MarkdownSymbol | null {
		try {
			// Language 추출
			const infoNode = node.descendantsOfType("info_string")[0];
			const language = infoNode
				? sourceCode.slice(infoNode.startIndex, infoNode.endIndex).trim()
				: "text";

			// Code content 추출
			const codeNode = node.descendantsOfType("code_fence_content")[0];
			if (!codeNode) return null;

			const code = sourceCode.slice(codeNode.startIndex, codeNode.endIndex);

			return {
				type: "code_block",
				name: `${language} code block`,
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
					endLine: node.endPosition.row + 1,
					endColumn: node.endPosition.column + 1,
				},
				metadata: {
					rawText: code,
					attributes: { language, length: code.length.toString() },
				},
			};
		} catch (error) {
			return null;
		}
	}

	/**
	 * 앵커 ID 생성
	 */
	private generateAnchorId(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.trim();
	}
}
