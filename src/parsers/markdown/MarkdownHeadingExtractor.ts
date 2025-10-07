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
			this.extractHeadingsFromNode(result.tree.rootNode, headings);

			return headings;
		} catch (error) {
			console.error("Failed to extract headings:", error);
			return [];
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
			const text = textNode ? textNode.text.trim() : node.text.trim();

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
