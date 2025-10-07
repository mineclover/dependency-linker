/**
 * Markdown Tag Convention Manager
 * 마크다운 태그 컨벤션 관리
 */

import type { MarkdownTag } from "./MarkdownTagCollector";

export interface TagCategory {
	/** 카테고리 이름 */
	name: string;
	/** 카테고리 설명 */
	description: string;
	/** 태그 목록 */
	tags: string[];
	/** 우선순위 */
	priority: number;
}

export interface TagPriority {
	/** 태그 이름 */
	tagName: string;
	/** 우선순위 값 */
	priority: number;
	/** 사용 빈도 */
	frequency: number;
	/** 중요도 */
	importance: number;
}

export interface TagDefinition {
	/** 태그 이름 */
	name: string;
	/** 정의 */
	definition: string;
	/** 사용 예시 */
	examples: string[];
	/** 관련 태그 */
	relatedTags: string[];
	/** 메타데이터 */
	metadata: {
		createdAt: string;
		updatedAt: string;
		version: string;
	};
}

export interface TagAnalysisResult {
	/** 카테고리들 */
	categories: TagCategory[];
	/** 우선순위들 */
	priorities: TagPriority[];
	/** 정의들 */
	definitions: TagDefinition[];
	/** 통계 */
	statistics: {
		totalTags: number;
		uniqueTags: number;
		categoryCount: number;
		averagePriority: number;
	};
}

/**
 * 마크다운 태그 컨벤션 관리자
 */
export class MarkdownTagConventionManager {
	/**
	 * 태그 분석
	 */
	async analyzeTags(
		tags: MarkdownTag[],
		filePath: string,
	): Promise<TagAnalysisResult> {
		try {
			// 카테고리 분석
			const categories = this.analyzeCategories(tags);

			// 우선순위 분석
			const priorities = this.analyzePriorities(tags);

			// 정의 분석
			const definitions = this.analyzeDefinitions(tags);

			// 통계 계산
			const statistics = this.calculateStatistics(tags, categories, priorities);

			return {
				categories,
				priorities,
				definitions,
				statistics,
			};
		} catch (error) {
			console.error("Failed to analyze tags:", error);
			return {
				categories: [],
				priorities: [],
				definitions: [],
				statistics: {
					totalTags: 0,
					uniqueTags: 0,
					categoryCount: 0,
					averagePriority: 0,
				},
			};
		}
	}

	/**
	 * 카테고리 분석
	 */
	private analyzeCategories(tags: MarkdownTag[]): TagCategory[] {
		const categoryMap = new Map<string, TagCategory>();

		for (const tag of tags) {
			const categoryName = tag.metadata?.category || "general";

			if (!categoryMap.has(categoryName)) {
				categoryMap.set(categoryName, {
					name: categoryName,
					description: this.getCategoryDescription(categoryName),
					tags: [],
					priority: this.getCategoryPriority(categoryName),
				});
			}

			const category = categoryMap.get(categoryName)!;
			if (!category.tags.includes(tag.name)) {
				category.tags.push(tag.name);
			}
		}

		return Array.from(categoryMap.values()).sort(
			(a, b) => b.priority - a.priority,
		);
	}

	/**
	 * 우선순위 분석
	 */
	private analyzePriorities(tags: MarkdownTag[]): TagPriority[] {
		const priorityMap = new Map<string, TagPriority>();

		for (const tag of tags) {
			const tagName = tag.name;

			if (!priorityMap.has(tagName)) {
				priorityMap.set(tagName, {
					tagName,
					priority: tag.metadata?.priority || 1,
					frequency: 0,
					importance: this.calculateImportance(tag),
				});
			}

			const priority = priorityMap.get(tagName)!;
			priority.frequency++;
		}

		return Array.from(priorityMap.values()).sort(
			(a, b) => b.priority - a.priority,
		);
	}

	/**
	 * 정의 분석
	 */
	private analyzeDefinitions(tags: MarkdownTag[]): TagDefinition[] {
		const definitionMap = new Map<string, TagDefinition>();

		for (const tag of tags) {
			const tagName = tag.name;

			if (!definitionMap.has(tagName)) {
				definitionMap.set(tagName, {
					name: tagName,
					definition: this.getTagDefinition(tagName),
					examples: this.getTagExamples(tagName),
					relatedTags: this.getRelatedTags(tagName),
					metadata: {
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						version: "1.0.0",
					},
				});
			}
		}

		return Array.from(definitionMap.values());
	}

	/**
	 * 통계 계산
	 */
	private calculateStatistics(
		tags: MarkdownTag[],
		categories: TagCategory[],
		priorities: TagPriority[],
	): TagAnalysisResult["statistics"] {
		const uniqueTags = new Set(tags.map((tag) => tag.name));
		const averagePriority =
			priorities.length > 0
				? priorities.reduce((sum, p) => sum + p.priority, 0) / priorities.length
				: 0;

		return {
			totalTags: tags.length,
			uniqueTags: uniqueTags.size,
			categoryCount: categories.length,
			averagePriority,
		};
	}

	/**
	 * 카테고리 설명 가져오기
	 */
	private getCategoryDescription(categoryName: string): string {
		const descriptions: Record<string, string> = {
			functionality: "기능 관련 태그",
			example: "예시 관련 태그",
			requirement: "요구사항 관련 태그",
			scenario: "시나리오 관련 태그",
			improvement: "개선 관련 태그",
			task: "작업 관련 태그",
			test: "테스트 관련 태그",
			error: "에러 관련 태그",
			general: "일반 태그",
		};

		return descriptions[categoryName] || "알 수 없는 카테고리";
	}

	/**
	 * 카테고리 우선순위 가져오기
	 */
	private getCategoryPriority(categoryName: string): number {
		const priorities: Record<string, number> = {
			functionality: 10,
			requirement: 9,
			test: 8,
			example: 7,
			scenario: 6,
			improvement: 5,
			task: 4,
			error: 3,
			general: 1,
		};

		return priorities[categoryName] || 1;
	}

	/**
	 * 태그 중요도 계산
	 */
	private calculateImportance(tag: MarkdownTag): number {
		let importance = 1.0;

		// 태그 타입에 따른 중요도
		const typeImportance: Record<MarkdownTag["type"], number> = {
			heading: 1.0,
			inline: 0.8,
			link: 0.9,
			definition: 1.0,
			category: 0.7,
		};

		importance *= typeImportance[tag.type] || 0.5;

		// 우선순위에 따른 중요도
		importance *= (tag.metadata?.priority || 1) / 10;

		return Math.min(1.0, importance);
	}

	/**
	 * 태그 정의 가져오기
	 */
	private getTagDefinition(tagName: string): string {
		const definitions: Record<string, string> = {
			"#기능": "기능 정의를 나타내는 태그",
			"#예시": "사용 예시를 나타내는 태그",
			"#요구사항": "요구사항을 나타내는 태그",
			"#시나리오": "사용자 시나리오를 나타내는 태그",
			"#개선": "개선 사항을 나타내는 태그",
			"#todo": "할 일을 나타내는 태그",
			"#테스트": "테스트 케이스를 나타내는 태그",
			"#에러": "에러 유형을 나타내는 태그",
		};

		return definitions[tagName] || "태그 정의가 없습니다";
	}

	/**
	 * 태그 예시 가져오기
	 */
	private getTagExamples(tagName: string): string[] {
		const examples: Record<string, string[]> = {
			"#기능": ["#기능 사용자 인증", "#기능 데이터 처리"],
			"#예시": ["#예시 코드 스니펫", "#예시 사용법"],
			"#요구사항": ["#요구사항 성능", "#요구사항 보안"],
			"#시나리오": ["#시나리오 로그인", "#시나리오 결제"],
			"#개선": ["#개선 성능", "#개선 UI"],
			"#todo": ["#todo 리팩토링", "#todo 테스트"],
			"#테스트": ["#테스트 단위", "#테스트 통합"],
			"#에러": ["#에러 404", "#에러 500"],
		};

		return examples[tagName] || [];
	}

	/**
	 * 관련 태그 가져오기
	 */
	private getRelatedTags(tagName: string): string[] {
		const relatedTags: Record<string, string[]> = {
			"#기능": ["#예시", "#요구사항"],
			"#예시": ["#기능", "#테스트"],
			"#요구사항": ["#기능", "#시나리오"],
			"#시나리오": ["#요구사항", "#테스트"],
			"#개선": ["#todo", "#기능"],
			"#todo": ["#개선", "#기능"],
			"#테스트": ["#예시", "#시나리오"],
			"#에러": ["#테스트", "#개선"],
		};

		return relatedTags[tagName] || [];
	}
}
