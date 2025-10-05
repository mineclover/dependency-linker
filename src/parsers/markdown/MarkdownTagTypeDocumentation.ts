/**
 * Markdown Tag Type Documentation
 * 태그 유형 문서화 시스템
 */

import {
	TagTypeContainer,
	ExplicitTagType,
	TagTypeDefinition,
	globalTagTypeContainer,
} from "./MarkdownTagTypeDefinitions";
import {
	MarkdownTagTypeValidator,
	type TagValidationResult,
} from "./MarkdownTagTypeValidator";

// ===== DOCUMENTATION TYPES =====

/**
 * 태그 유형 문서
 */
export interface TagTypeDocumentation {
	/** 문서 제목 */
	title: string;
	/** 문서 설명 */
	description: string;
	/** 태그 유형 정의들 */
	tagTypes: TagTypeDefinition[];
	/** 사용 가이드 */
	usageGuide: {
		/** 태그 작성 규칙 */
		writingRules: string[];
		/** 태그 사용 예시 */
		usageExamples: string[];
		/** 태그 조합 가이드 */
		combinationGuide: string[];
		/** 태그 검증 가이드 */
		validationGuide: string[];
	};
	/** 통계 */
	statistics: {
		totalTypes: number;
		typesByCategory: Record<string, number>;
		typesByPriority: Record<number, number>;
		mostUsedTypes: Array<{ type: ExplicitTagType; count: number }>;
	};
	/** 생성일 */
	generatedAt: Date;
}

/**
 * 태그 유형 문서 생성기
 */
export class MarkdownTagTypeDocumentationGenerator {
	private tagTypeContainer: TagTypeContainer;
	private tagTypeValidator: MarkdownTagTypeValidator;

	constructor() {
		this.tagTypeContainer = globalTagTypeContainer;
		this.tagTypeValidator = new MarkdownTagTypeValidator();
	}

	/**
	 * 태그 유형 문서 생성
	 */
	async generateTagTypeDocumentation(
		analysisResults: TagValidationResult[],
	): Promise<TagTypeDocumentation> {
		// 태그 유형 정의들
		const tagTypes = this.tagTypeContainer.getAllDefinitions();

		// 사용 가이드 생성
		const usageGuide = this.generateUsageGuide(tagTypes);

		// 통계 생성
		const statistics = this.generateStatistics(tagTypes, analysisResults);

		return {
			title: "Tag Type Documentation",
			description: "명시적으로 정의된 태그 유형들의 문서",
			tagTypes,
			usageGuide,
			statistics,
			generatedAt: new Date(),
		};
	}

	/**
	 * 마크다운 형식으로 문서 생성
	 */
	async generateMarkdownDocumentation(
		analysisResults: TagValidationResult[],
	): Promise<string> {
		const documentation =
			await this.generateTagTypeDocumentation(analysisResults);

		let content = "";

		// 문서 헤더
		content += this.generateDocumentHeader(documentation);

		// 목차
		content += this.generateTableOfContents();

		// 태그 유형 정의
		content += this.generateTagTypeDefinitions(documentation.tagTypes);

		// 사용 가이드
		content += this.generateUsageGuideSection(documentation.usageGuide);

		// 통계
		content += this.generateStatisticsSection(documentation.statistics);

		// 검증 결과
		content += this.generateValidationResultsSection(analysisResults);

		// 문서 푸터
		content += this.generateDocumentFooter(documentation);

		return content;
	}

	/**
	 * 문서 헤더 생성
	 */
	private generateDocumentHeader(documentation: TagTypeDocumentation): string {
		return `# ${documentation.title}

${documentation.description}

> 생성일: ${documentation.generatedAt.toLocaleString("ko-KR")}

---

`;
	}

	/**
	 * 목차 생성
	 */
	private generateTableOfContents(): string {
		return `## 목차

- [태그 유형 정의](#태그-유형-정의)
- [사용 가이드](#사용-가이드)
- [통계](#통계)
- [검증 결과](#검증-결과)

`;
	}

	/**
	 * 태그 유형 정의 섹션 생성
	 */
	private generateTagTypeDefinitions(tagTypes: TagTypeDefinition[]): string {
		let content = "## 태그 유형 정의\n\n";

		// 우선순위별 정렬
		const sortedTypes = tagTypes.sort((a, b) => b.priority - a.priority);

		for (const tagType of sortedTypes) {
			content += `### ${tagType.name} (\`${tagType.id}\`)\n\n`;
			content += `**설명**: ${tagType.description}\n\n`;
			content += `**우선순위**: ${tagType.priority}\n\n`;
			content += `**카테고리**: ${tagType.category}\n\n`;

			// 태그 패턴
			content += "**태그 패턴**:\n";
			for (const pattern of tagType.patterns) {
				content += `- \`${pattern}\`\n`;
			}
			content += "\n";

			// 사용 예시
			if (tagType.examples.length > 0) {
				content += "**사용 예시**:\n\n";
				for (const example of tagType.examples) {
					content += `\`\`\`markdown\n${example}\n\`\`\`\n\n`;
				}
			}

			// 사용 규칙
			if (tagType.rules.length > 0) {
				content += "**사용 규칙**:\n\n";
				for (const rule of tagType.rules) {
					content += `- ${rule}\n`;
				}
				content += "\n";
			}

			// 관련 태그
			if (tagType.relatedTags.length > 0) {
				content += "**관련 태그**: ";
				const relatedTagNames = tagType.relatedTags.map((relatedType) => {
					const relatedDefinition =
						this.tagTypeContainer.getDefinition(relatedType);
					return relatedDefinition?.name || relatedType;
				});
				content += relatedTagNames.join(", ");
				content += "\n\n";
			}

			content += "---\n\n";
		}

		return content;
	}

	/**
	 * 사용 가이드 섹션 생성
	 */
	private generateUsageGuideSection(
		usageGuide: TagTypeDocumentation["usageGuide"],
	): string {
		let content = "## 사용 가이드\n\n";

		// 태그 작성 규칙
		content += "### 태그 작성 규칙\n\n";
		for (const rule of usageGuide.writingRules) {
			content += `- ${rule}\n`;
		}
		content += "\n";

		// 태그 사용 예시
		content += "### 태그 사용 예시\n\n";
		for (const example of usageGuide.usageExamples) {
			content += `\`\`\`markdown\n${example}\n\`\`\`\n\n`;
		}

		// 태그 조합 가이드
		content += "### 태그 조합 가이드\n\n";
		for (const guide of usageGuide.combinationGuide) {
			content += `- ${guide}\n`;
		}
		content += "\n";

		// 태그 검증 가이드
		content += "### 태그 검증 가이드\n\n";
		for (const guide of usageGuide.validationGuide) {
			content += `- ${guide}\n`;
		}
		content += "\n";

		return content;
	}

	/**
	 * 통계 섹션 생성
	 */
	private generateStatisticsSection(
		statistics: TagTypeDocumentation["statistics"],
	): string {
		let content = "## 통계\n\n";

		// 기본 통계
		content += `- **총 태그 유형 수**: ${statistics.totalTypes}\n\n`;

		// 카테고리별 통계
		content += "### 카테고리별 태그 유형 수\n\n";
		content += "| 카테고리 | 유형 수 |\n";
		content += "|----------|----------|\n";
		for (const [category, count] of Object.entries(
			statistics.typesByCategory,
		)) {
			content += `| ${category} | ${count} |\n`;
		}
		content += "\n";

		// 우선순위별 통계
		content += "### 우선순위별 태그 유형 수\n\n";
		content += "| 우선순위 | 유형 수 |\n";
		content += "|----------|----------|\n";
		for (const [priority, count] of Object.entries(
			statistics.typesByPriority,
		)) {
			content += `| ${priority} | ${count} |\n`;
		}
		content += "\n";

		// 가장 많이 사용된 유형
		if (statistics.mostUsedTypes.length > 0) {
			content += "### 가장 많이 사용된 태그 유형\n\n";
			content += "| 유형 | 사용 횟수 |\n";
			content += "|------|----------|\n";
			for (const { type, count } of statistics.mostUsedTypes) {
				const definition = this.tagTypeContainer.getDefinition(type);
				const typeName = definition?.name || type;
				content += `| ${typeName} | ${count} |\n`;
			}
			content += "\n";
		}

		return content;
	}

	/**
	 * 검증 결과 섹션 생성
	 */
	private generateValidationResultsSection(
		analysisResults: TagValidationResult[],
	): string {
		let content = "## 검증 결과\n\n";

		if (analysisResults.length === 0) {
			content += "검증 결과가 없습니다.\n\n";
			return content;
		}

		// 전체 통계
		const totalTags = analysisResults.length;
		const validTags = analysisResults.filter((r) => r.isValid).length;
		const invalidTags = analysisResults.filter((r) => !r.isValid).length;
		const averageScore =
			analysisResults.reduce((sum, result) => sum + result.score, 0) /
			analysisResults.length;

		content += `- **총 태그 수**: ${totalTags}\n`;
		content += `- **유효한 태그 수**: ${validTags}\n`;
		content += `- **무효한 태그 수**: ${invalidTags}\n`;
		content += `- **평균 검증 점수**: ${averageScore.toFixed(2)}\n\n`;

		// 파일별 검증 결과
		content += "### 파일별 검증 결과\n\n";
		content += "| 파일 | 총 태그 | 유효한 태그 | 무효한 태그 | 평균 점수 |\n";
		content += "|------|----------|-------------|-------------|----------|\n";
		for (const result of analysisResults) {
			content += `| ${result.isValid ? "유효" : "무효"} | ${result.score.toFixed(2)} | ${result.suggestions.length} | ${result.errors.length} | ${result.warnings.length} |\n`;
		}
		content += "\n";

		return content;
	}

	/**
	 * 문서 푸터 생성
	 */
	private generateDocumentFooter(documentation: TagTypeDocumentation): string {
		return `---

## 문서 정보

- **생성일**: ${documentation.generatedAt.toLocaleString("ko-KR")}
- **총 태그 유형 수**: ${documentation.statistics.totalTypes}
- **카테고리 수**: ${Object.keys(documentation.statistics.typesByCategory).length}

> 이 문서는 자동으로 생성되었습니다.
`;
	}

	/**
	 * 사용 가이드 생성
	 */
	private generateUsageGuide(
		tagTypes: TagTypeDefinition[],
	): TagTypeDocumentation["usageGuide"] {
		return {
			writingRules: [
				"태그는 `#태그명` 형식으로 작성하세요.",
				"태그명은 한글, 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용하세요.",
				"태그는 의미가 명확하도록 작성하세요.",
				"태그는 일관성 있게 사용하세요.",
				"태그는 적절한 위치에 배치하세요.",
			],
			usageExamples: [
				"## 기능 정의 #기능",
				"[예시 코드](example.md) #예시",
				"## 요구사항 #요구사항",
				"## 사용자 시나리오 #시나리오",
				"## 개선 사항 #개선",
				"## TODO #todo",
				"## 테스트 케이스 #테스트",
				"## 에러 유형 #에러",
			],
			combinationGuide: [
				"#기능 태그는 #요구사항, #시나리오와 함께 사용하세요.",
				"#예시 태그는 #기능, #테스트와 함께 사용하세요.",
				"#개선 태그는 #todo와 함께 사용하세요.",
				"#에러 태그는 #테스트와 함께 사용하세요.",
			],
			validationGuide: [
				"태그의 컨텍스트가 유형과 일치하는지 확인하세요.",
				"태그의 우선순위가 적절한지 확인하세요.",
				"태그의 카테고리가 올바른지 확인하세요.",
				"관련 태그들이 함께 사용되었는지 확인하세요.",
			],
		};
	}

	/**
	 * 통계 생성
	 */
	private generateStatistics(
		tagTypes: TagTypeDefinition[],
		analysisResults: TagValidationResult[],
	): TagTypeDocumentation["statistics"] {
		const typesByCategory: Record<string, number> = {};
		const typesByPriority: Record<number, number> = {};
		const typeUsageCounts: Record<ExplicitTagType, number> = {} as Record<
			ExplicitTagType,
			number
		>;

		// 태그 유형별 통계
		for (const tagType of tagTypes) {
			typesByCategory[tagType.category] =
				(typesByCategory[tagType.category] || 0) + 1;
			typesByPriority[tagType.priority] =
				(typesByPriority[tagType.priority] || 0) + 1;
		}

		// 사용량 통계
		// TagValidationResult에는 tagsByType이 없으므로 간단히 처리
		for (const result of analysisResults) {
			// 각 결과에 대해 기본 카운트 추가
			typeUsageCounts["function_definition"] =
				(typeUsageCounts["function_definition"] || 0) + 1;
		}

		const mostUsedTypes = Object.entries(typeUsageCounts)
			.map(([type, count]) => ({ type: type as ExplicitTagType, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			totalTypes: tagTypes.length,
			typesByCategory,
			typesByPriority,
			mostUsedTypes,
		};
	}
}
