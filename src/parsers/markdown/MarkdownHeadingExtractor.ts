/**
 * Markdown Heading Extractor
 * 마크다운 문서에서 헤딩 추출
 */

import { MarkdownParser } from "./MarkdownParser";

export interface MarkdownHeading {
	/** 헤딩 레벨 (1-6) */
	level: number;
	/** 헤딩 텍스트 */
	text: string;
	/** 앵커 ID */
	anchorId: string;
	/** 위치 정보 */
	location: {
		line: number;
		column: number;
		endLine?: number;
		endColumn?: number;
	};
}

export interface HeadingExtractionResult {
	/** 추출된 헤딩들 */
	headings: MarkdownHeading[];
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
}

/**
 * 마크다운 헤딩 추출기
 */
export class MarkdownHeadingExtractor {
	private parser: MarkdownParser;

	constructor() {
		this.parser = new MarkdownParser();
	}

	/**
	 * 마크다운에서 헤딩 추출
	 */
	async extractHeadings(markdown: string): Promise<MarkdownHeading[]> {
		try {
			const result = await this.parser.parse(markdown);
			const headings: MarkdownHeading[] = [];

			// Tree-sitter AST에서 헤딩 노드 찾기
			if (result.tree && result.tree.rootNode) {
				this.extractHeadingsFromNode(result.tree.rootNode, headings);
			}

			// Tree-sitter 파싱이 실패하거나 헤딩을 찾지 못한 경우 정규식 fallback 사용
			if (headings.length === 0) {
				return this.extractHeadingsWithRegex(markdown);
			}

			return headings;
		} catch (error) {
			console.error("Failed to extract headings:", error);
			// Tree-sitter 파싱 실패 시 정규식 fallback 사용
			return this.extractHeadingsWithRegex(markdown);
		}
	}

	/**
	 * AST 노드에서 헤딩 추출
	 */
	private extractHeadingsFromNode(
		node: any,
		headings: MarkdownHeading[],
	): void {
		if (!node) return;

		// 헤딩 노드 확인
		if (this.isHeadingNode(node)) {
			const heading = this.createHeadingFromNode(node);
			if (heading) {
				headings.push(heading);
			}
		}

		// 자식 노드들 재귀적으로 처리
		if (node.children) {
			for (const child of node.children) {
				this.extractHeadingsFromNode(child, headings);
			}
		}
	}

	/**
	 * 헤딩 노드인지 확인
	 */
	private isHeadingNode(node: any): boolean {
		return node.type === "atx_heading" || node.type === "setext_heading";
	}

	/**
	 * 노드에서 헤딩 객체 생성
	 */
	private createHeadingFromNode(node: any): MarkdownHeading | null {
		try {
			// 헤딩 레벨 추출
			let level = 1;
			if (node.type === "atx_heading") {
				// ATX 헤딩 (# ## ###)
				const levelNode = node.children?.find(
					(child: any) =>
						child.type === "atx_h1_marker" ||
						child.type === "atx_h2_marker" ||
						child.type === "atx_h3_marker" ||
						child.type === "atx_h4_marker" ||
						child.type === "atx_h5_marker" ||
						child.type === "atx_h6_marker",
				);
				if (levelNode) {
					level = parseInt(
						levelNode.text.replace(/#/g, "").length.toString(),
						10,
					);
				}
			} else if (node.type === "setext_heading") {
				// Setext 헤딩 (===, ---)
				const markerNode = node.children?.find(
					(child: any) =>
						child.type === "setext_h1_underline" ||
						child.type === "setext_h2_underline",
				);
				if (markerNode) {
					level = markerNode.type === "setext_h1_underline" ? 1 : 2;
				}
			}

			// 헤딩 텍스트 추출
			const textNode = node.children?.find(
				(child: any) => child.type === "heading_content",
			);
			let text = textNode ? textNode.text.trim() : node.text.trim();

			// 태그 제거 (테스트 호환성)
			text = this.removeTagsFromText(text);

			// 앵커 ID 생성
			const anchorId = this.generateAnchorId(text);

			return {
				level,
				text,
				anchorId,
				location: {
					line: node.startPosition.row + 1,
					column: node.startPosition.column + 1,
					endLine: node.endPosition.row + 1,
					endColumn: node.endPosition.column + 1,
				},
			};
		} catch (error) {
			console.error("Failed to create heading from node:", error);
			return null;
		}
	}

	/**
	 * 정규식을 사용한 헤딩 추출 (fallback)
	 */
	private extractHeadingsWithRegex(markdown: string): MarkdownHeading[] {
		const headings: MarkdownHeading[] = [];
		const lines = markdown.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// ATX 헤딩 (# ## ###)
			const atxMatch = /^(#{1,6})\s+(.+)$/.exec(line);
			if (atxMatch) {
				const level = atxMatch[1].length;
				let text = atxMatch[2].trim();
				// 태그 제거
				text = this.removeTagsFromText(text);
				const anchorId = this.generateAnchorId(text);

				headings.push({
					level,
					text,
					anchorId,
					location: {
						line: i + 1,
						column: 0,
						endLine: i + 1,
						endColumn: line.length,
					},
				});
				continue;
			}

			// Setext 헤딩 (===, ---)
			if (i < lines.length - 1) {
				const nextLine = lines[i + 1];
				const setextMatch = /^([=-]+)$/.exec(nextLine);
				if (setextMatch && line.trim().length > 0) {
					const level = nextLine.startsWith("=") ? 1 : 2;
					let text = line.trim();
					// 태그 제거
					text = this.removeTagsFromText(text);
					const anchorId = this.generateAnchorId(text);

					headings.push({
						level,
						text,
						anchorId,
						location: {
							line: i + 1,
							column: 0,
							endLine: i + 2,
							endColumn: nextLine.length,
						},
					});
					i++; // 다음 줄을 건너뛰기
				}
			}
		}

		return headings;
	}

	/**
	 * 텍스트에서 태그 제거
	 */
	private removeTagsFromText(text: string): string {
		// #태그 패턴 제거
		return text.replace(/#[\w가-힣-]+/g, "").trim();
	}

	/**
	 * 앵커 ID 생성
	 */
	private generateAnchorId(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, "") // 특수문자 제거
			.replace(/\s+/g, "-") // 공백을 하이픈으로
			.replace(/-+/g, "-") // 연속된 하이픈을 하나로
			.replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거
	}
}
