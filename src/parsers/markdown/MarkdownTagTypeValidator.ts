/**
 * Markdown Tag Type Validator
 * 마크다운 태그 유형 검증
 */

import type { MarkdownTag } from "./MarkdownTagCollector";

export interface TagValidationResult {
	/** 유효성 */
	isValid: boolean;
	/** 점수 (0-1) */
	score: number;
	/** 제안사항 */
	suggestions: string[];
	/** 에러 */
	errors: string[];
	/** 경고 */
	warnings: string[];
}

export interface TagTypeDefinition {
	/** 태그 이름 */
	name: string;
	/** 패턴 */
	pattern: RegExp;
	/** 규칙 */
	rules: string[];
	/** 메타데이터 */
	metadata: {
		description: string;
		examples: string[];
		relatedTags: string[];
	};
}

/**
 * 마크다운 태그 유형 검증기
 */
export class MarkdownTagTypeValidator {
	private tagTypeDefinitions: Map<string, TagTypeDefinition> = new Map();

	constructor() {
		this.initializeTagTypeDefinitions();
	}

	/**
	 * 단일 태그 검증
	 */
	async validateSingleTag(
		tag: MarkdownTag,
		markdown: string,
	): Promise<TagValidationResult> {
		const result: TagValidationResult = {
			isValid: true,
			score: 1.0,
			suggestions: [],
			errors: [],
			warnings: [],
		};

		try {
			// 태그 유형 정의 확인
			const definition = this.tagTypeDefinitions.get(tag.name);
			if (!definition) {
				result.warnings.push(`태그 유형 정의가 없습니다: ${tag.name}`);
				result.score = 0.5;
				return result;
			}

			// 패턴 검증
			const patternValid = this.validatePattern(tag, definition);
			if (!patternValid) {
				result.errors.push(`태그 패턴이 유효하지 않습니다: ${tag.name}`);
				result.isValid = false;
				result.score = 0.0;
			}

			// 규칙 검증
			const ruleResults = this.validateRules(tag, definition, markdown);
			result.suggestions.push(...ruleResults.suggestions);
			result.warnings.push(...ruleResults.warnings);
			result.errors.push(...ruleResults.errors);

			// 점수 계산
			result.score = this.calculateScore(tag, definition, markdown);

			// 유효성 재평가
			if (result.errors.length > 0) {
				result.isValid = false;
			}

			return result;
		} catch (error) {
			result.errors.push(`태그 검증 중 오류 발생: ${error}`);
			result.isValid = false;
			result.score = 0.0;
			return result;
		}
	}

	/**
	 * 태그 유형 정의 초기화
	 */
	private initializeTagTypeDefinitions(): void {
		// 기능 태그
		this.tagTypeDefinitions.set("#기능", {
			name: "#기능",
			pattern: /#기능\s+[가-힣\w\s]+/,
			rules: [
				"기능 설명이 포함되어야 함",
				"명확한 동작을 설명해야 함",
				"사용자 관점에서 작성해야 함",
			],
			metadata: {
				description: "기능 정의를 나타내는 태그",
				examples: ["#기능 사용자 인증", "#기능 데이터 처리"],
				relatedTags: ["#예시", "#요구사항"],
			},
		});

		// 예시 태그
		this.tagTypeDefinitions.set("#예시", {
			name: "#예시",
			pattern: /#예시\s+[가-힣\w\s]+/,
			rules: [
				"구체적인 예시가 포함되어야 함",
				"코드나 사용법을 보여줘야 함",
				"실행 가능한 예시여야 함",
			],
			metadata: {
				description: "사용 예시를 나타내는 태그",
				examples: ["#예시 코드 스니펫", "#예시 사용법"],
				relatedTags: ["#기능", "#테스트"],
			},
		});

		// 요구사항 태그
		this.tagTypeDefinitions.set("#요구사항", {
			name: "#요구사항",
			pattern: /#요구사항\s+[가-힣\w\s]+/,
			rules: [
				"명확한 요구사항이 기술되어야 함",
				"측정 가능한 기준이 있어야 함",
				"검증 가능한 조건이어야 함",
			],
			metadata: {
				description: "요구사항을 나타내는 태그",
				examples: ["#요구사항 성능", "#요구사항 보안"],
				relatedTags: ["#기능", "#시나리오"],
			},
		});

		// 시나리오 태그
		this.tagTypeDefinitions.set("#시나리오", {
			name: "#시나리오",
			pattern: /#시나리오\s+[가-힣\w\s]+/,
			rules: [
				"사용자 시나리오가 기술되어야 함",
				"단계별 과정이 포함되어야 함",
				"예상 결과가 명시되어야 함",
			],
			metadata: {
				description: "사용자 시나리오를 나타내는 태그",
				examples: ["#시나리오 로그인", "#시나리오 결제"],
				relatedTags: ["#요구사항", "#테스트"],
			},
		});

		// 개선 태그
		this.tagTypeDefinitions.set("#개선", {
			name: "#개선",
			pattern: /#개선\s+[가-힣\w\s]+/,
			rules: [
				"개선 사항이 구체적으로 기술되어야 함",
				"현재 문제점이 명시되어야 함",
				"개선 방향이 제시되어야 함",
			],
			metadata: {
				description: "개선 사항을 나타내는 태그",
				examples: ["#개선 성능", "#개선 UI"],
				relatedTags: ["#todo", "#기능"],
			},
		});

		// TODO 태그
		this.tagTypeDefinitions.set("#todo", {
			name: "#todo",
			pattern: /#todo\s+[가-힣\w\s]+/,
			rules: [
				"할 일이 구체적으로 기술되어야 함",
				"우선순위가 명시되어야 함",
				"완료 기준이 있어야 함",
			],
			metadata: {
				description: "할 일을 나타내는 태그",
				examples: ["#todo 리팩토링", "#todo 테스트"],
				relatedTags: ["#개선", "#기능"],
			},
		});

		// 테스트 태그
		this.tagTypeDefinitions.set("#테스트", {
			name: "#테스트",
			pattern: /#테스트\s+[가-힣\w\s]+/,
			rules: [
				"테스트 케이스가 명확해야 함",
				"입력과 예상 출력이 명시되어야 함",
				"테스트 조건이 구체적이어야 함",
			],
			metadata: {
				description: "테스트 케이스를 나타내는 태그",
				examples: ["#테스트 단위", "#테스트 통합"],
				relatedTags: ["#예시", "#시나리오"],
			},
		});

		// 에러 태그
		this.tagTypeDefinitions.set("#에러", {
			name: "#에러",
			pattern: /#에러\s+[가-힣\w\s]+/,
			rules: [
				"에러 유형이 명확해야 함",
				"에러 원인이 기술되어야 함",
				"해결 방법이 제시되어야 함",
			],
			metadata: {
				description: "에러 유형을 나타내는 태그",
				examples: ["#에러 404", "#에러 500"],
				relatedTags: ["#테스트", "#개선"],
			},
		});
	}

	/**
	 * 패턴 검증
	 */
	private validatePattern(
		tag: MarkdownTag,
		definition: TagTypeDefinition,
	): boolean {
		const context = tag.context || "";
		return definition.pattern.test(context);
	}

	/**
	 * 규칙 검증
	 */
	private validateRules(
		tag: MarkdownTag,
		definition: TagTypeDefinition,
		markdown: string,
	): { suggestions: string[]; warnings: string[]; errors: string[] } {
		const suggestions: string[] = [];
		const warnings: string[] = [];
		const errors: string[] = [];

		// 각 규칙에 대해 검증
		for (const rule of definition.rules) {
			const isValid = this.validateRule(tag, rule, markdown);
			if (!isValid) {
				suggestions.push(`규칙 위반: ${rule}`);
			}
		}

		return { suggestions, warnings, errors };
	}

	/**
	 * 개별 규칙 검증
	 */
	private validateRule(
		tag: MarkdownTag,
		rule: string,
		_markdown: string,
	): boolean {
		// 간단한 규칙 검증 로직
		const context = tag.context || "";

		switch (rule) {
			case "기능 설명이 포함되어야 함":
				return context.length > 10;
			case "구체적인 예시가 포함되어야 함":
				return context.includes("예시") || context.includes("예:");
			case "명확한 요구사항이 기술되어야 함":
				return context.length > 15;
			case "사용자 시나리오가 기술되어야 함":
				return context.includes("사용자") || context.includes("시나리오");
			case "개선 사항이 구체적으로 기술되어야 함":
				return context.includes("개선") || context.includes("향상");
			case "할 일이 구체적으로 기술되어야 함":
				return context.length > 5;
			case "테스트 케이스가 명확해야 함":
				return context.includes("테스트") || context.includes("검증");
			case "에러 유형이 명확해야 함":
				return context.includes("에러") || context.includes("오류");
			default:
				return true;
		}
	}

	/**
	 * 점수 계산
	 */
	private calculateScore(
		tag: MarkdownTag,
		definition: TagTypeDefinition,
		markdown: string,
	): number {
		let score = 1.0;

		// 패턴 검증 점수
		const patternValid = this.validatePattern(tag, definition);
		if (!patternValid) {
			score -= 0.5;
		}

		// 규칙 검증 점수
		let validRules = 0;
		for (const rule of definition.rules) {
			if (this.validateRule(tag, rule, markdown)) {
				validRules++;
			}
		}
		score = (score * validRules) / definition.rules.length;

		// 컨텍스트 길이 점수
		const contextLength = (tag.context || "").length;
		if (contextLength < 10) {
			score -= 0.2;
		} else if (contextLength > 50) {
			score += 0.1;
		}

		return Math.max(0.0, Math.min(1.0, score));
	}
}
