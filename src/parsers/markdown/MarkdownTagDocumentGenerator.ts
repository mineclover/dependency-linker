/**
 * Markdown Tag Document Generator
 * 마크다운 태그 문서 생성
 */

import { TagAnalysisResult } from "./MarkdownTagConventionManager";

export interface DocumentGenerationOptions {
	/** 문서 제목 */
	title?: string;
	/** 문서 설명 */
	description?: string;
	/** 포함할 섹션 */
	sections?: string[];
	/** 출력 형식 */
	format?: "markdown" | "html" | "json";
	/** 메타데이터 포함 여부 */
	includeMetadata?: boolean;
}

export interface GeneratedDocument {
	/** 문서 내용 */
	content: string;
	/** 메타데이터 */
	metadata: {
		generatedAt: string;
		version: string;
		totalTags: number;
		categoryCount: number;
	};
}

/**
 * 마크다운 태그 문서 생성기
 */
export class MarkdownTagDocumentGenerator {
	/**
	 * 태그 컨벤션 문서 생성
	 */
	async generateTagConventionDocument(
		analysis: TagAnalysisResult,
		options: DocumentGenerationOptions = {},
	): Promise<GeneratedDocument> {
		const {
			title = "Tag Convention Document",
			description = "마크다운 태그 컨벤션 문서",
			sections = ["overview", "categories", "priorities", "definitions"],
			format = "markdown",
			includeMetadata = true,
		} = options;

		let content = "";

		// 제목과 설명
		content += `# ${title}\n\n`;
		content += `${description}\n\n`;

		// 개요 섹션
		if (sections.includes("overview")) {
			content += this.generateOverviewSection(analysis);
		}

		// 카테고리 섹션
		if (sections.includes("categories")) {
			content += this.generateCategoriesSection(analysis);
		}

		// 우선순위 섹션
		if (sections.includes("priorities")) {
			content += this.generatePrioritiesSection(analysis);
		}

		// 정의 섹션
		if (sections.includes("definitions")) {
			content += this.generateDefinitionsSection(analysis);
		}

		// 메타데이터
		if (includeMetadata) {
			content += this.generateMetadataSection(analysis);
		}

		return {
			content,
			metadata: {
				generatedAt: new Date().toISOString(),
				version: "1.0.0",
				totalTags: analysis.statistics.totalTags,
				categoryCount: analysis.statistics.categoryCount,
			},
		};
	}

	/**
	 * 개요 섹션 생성
	 */
	private generateOverviewSection(analysis: TagAnalysisResult): string {
		let content = "## 개요\n\n";

		content += `이 문서는 프로젝트에서 사용되는 마크다운 태그의 컨벤션을 정의합니다.\n\n`;

		content += `### 통계\n\n`;
		content += `- **총 태그 수**: ${analysis.statistics.totalTags}개\n`;
		content += `- **고유 태그 수**: ${analysis.statistics.uniqueTags}개\n`;
		content += `- **카테고리 수**: ${analysis.statistics.categoryCount}개\n`;
		content += `- **평균 우선순위**: ${analysis.statistics.averagePriority.toFixed(2)}\n\n`;

		return content;
	}

	/**
	 * 카테고리 섹션 생성
	 */
	private generateCategoriesSection(analysis: TagAnalysisResult): string {
		let content = "## 태그 카테고리\n\n";

		for (const category of analysis.categories) {
			content += `### ${category.name}\n\n`;
			content += `${category.description}\n\n`;
			content += `**우선순위**: ${category.priority}\n\n`;
			content += `**태그 목록**:\n`;

			for (const tag of category.tags) {
				content += `- ${tag}\n`;
			}
			content += `\n`;
		}

		return content;
	}

	/**
	 * 우선순위 섹션 생성
	 */
	private generatePrioritiesSection(analysis: TagAnalysisResult): string {
		let content = "## 태그 우선순위\n\n";

		content += `태그의 우선순위는 사용 빈도와 중요도를 기반으로 계산됩니다.\n\n`;

		content += `| 태그 | 우선순위 | 빈도 | 중요도 |\n`;
		content += `|------|----------|------|--------|\n`;

		for (const priority of analysis.priorities) {
			content += `| ${priority.tagName} | ${priority.priority} | ${priority.frequency} | ${priority.importance.toFixed(2)} |\n`;
		}

		content += `\n`;

		return content;
	}

	/**
	 * 정의 섹션 생성
	 */
	private generateDefinitionsSection(analysis: TagAnalysisResult): string {
		let content = "## 태그 정의\n\n";

		for (const definition of analysis.definitions) {
			content += `### ${definition.name}\n\n`;
			content += `${definition.definition}\n\n`;

			if (definition.examples.length > 0) {
				content += `**사용 예시**:\n`;
				for (const example of definition.examples) {
					content += `- ${example}\n`;
				}
				content += `\n`;
			}

			if (definition.relatedTags.length > 0) {
				content += `**관련 태그**: ${definition.relatedTags.join(", ")}\n\n`;
			}

			content += `---\n\n`;
		}

		return content;
	}

	/**
	 * 메타데이터 섹션 생성
	 */
	private generateMetadataSection(analysis: TagAnalysisResult): string {
		let content = "## 메타데이터\n\n";

		content += `- **생성일**: ${new Date().toLocaleDateString()}\n`;
		content += `- **버전**: 1.0.0\n`;
		content += `- **총 태그 수**: ${analysis.statistics.totalTags}개\n`;
		content += `- **카테고리 수**: ${analysis.statistics.categoryCount}개\n`;
		content += `- **평균 우선순위**: ${analysis.statistics.averagePriority.toFixed(2)}\n\n`;

		return content;
	}
}
