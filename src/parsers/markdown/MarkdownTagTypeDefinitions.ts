/**
 * Markdown Tag Type Definitions
 * 명시적으로 정의된 태그 유형들
 */

// ===== EXPLICIT TAG TYPES =====

/**
 * 명시적 태그 유형
 */
export type ExplicitTagType =
	| "function_definition" // 기능 정의
	| "example" // 예시
	| "requirement" // 요구사항
	| "user_scenario" // 유저 시나리오
	| "improvement" // 개선 사항
	| "todo" // TODO
	| "test_case" // 테스트 케이스
	| "error_type"; // 에러 유형

/**
 * 태그 유형 정의
 */
export interface TagTypeDefinition {
	/** 태그 유형 ID */
	id: ExplicitTagType;
	/** 태그 유형 이름 */
	name: string;
	/** 태그 유형 설명 */
	description: string;
	/** 태그 패턴 */
	patterns: string[];
	/** 사용 예시 */
	examples: string[];
	/** 사용 규칙 */
	rules: string[];
	/** 우선순위 */
	priority: number;
	/** 카테고리 */
	category: string;
	/** 관련 태그 */
	relatedTags: ExplicitTagType[];
	/** 메타데이터 */
	metadata: {
		/** 생성일 */
		createdAt: Date;
		/** 수정일 */
		updatedAt: Date;
		/** 버전 */
		version: string;
		/** 작성자 */
		author?: string;
	};
}

/**
 * 태그 유형 컨테이너
 */
export class TagTypeContainer {
	private definitions = new Map<ExplicitTagType, TagTypeDefinition>();

	constructor() {
		this.initializeDefaultDefinitions();
	}

	/**
	 * 기본 태그 유형 정의 초기화
	 */
	private initializeDefaultDefinitions(): void {
		// 기능 정의
		this.definitions.set("function_definition", {
			id: "function_definition",
			name: "기능 정의",
			description: "시스템의 기능을 정의하는 태그입니다.",
			patterns: ["#기능", "#function", "#define"],
			examples: [
				"## 사용자 인증 기능 #기능",
				"[로그인 API](api.md) #function",
				"## 데이터베이스 연결 #define",
			],
			rules: [
				"기능의 목적과 동작을 명확히 설명해야 합니다.",
				"기능의 입력과 출력을 정의해야 합니다.",
				"기능의 제약사항을 명시해야 합니다.",
			],
			priority: 10,
			category: "definition",
			relatedTags: ["requirement", "user_scenario"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 예시
		this.definitions.set("example", {
			id: "example",
			name: "예시",
			description: "코드나 사용법의 예시를 보여주는 태그입니다.",
			patterns: ["#예시", "#example", "#demo"],
			examples: [
				"## 사용법 예시 #예시",
				"[API 사용 예시](example.md) #example",
				"```javascript\n// 코드 예시 #demo\n```",
			],
			rules: [
				"실행 가능한 코드 예시를 제공해야 합니다.",
				"예시의 목적을 명확히 설명해야 합니다.",
				"예시의 결과를 예상할 수 있어야 합니다.",
			],
			priority: 8,
			category: "example",
			relatedTags: ["function_definition", "test_case"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 요구사항
		this.definitions.set("requirement", {
			id: "requirement",
			name: "요구사항",
			description: "시스템의 요구사항을 정의하는 태그입니다.",
			patterns: ["#요구사항", "#requirement", "#req"],
			examples: [
				"## 성능 요구사항 #요구사항",
				"[보안 요구사항](security.md) #requirement",
				"## 사용자 요구사항 #req",
			],
			rules: [
				"요구사항은 측정 가능해야 합니다.",
				"요구사항의 우선순위를 명시해야 합니다.",
				"요구사항의 출처를 명시해야 합니다.",
			],
			priority: 9,
			category: "requirement",
			relatedTags: ["function_definition", "user_scenario"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 유저 시나리오
		this.definitions.set("user_scenario", {
			id: "user_scenario",
			name: "유저 시나리오",
			description: "사용자의 행동 시나리오를 정의하는 태그입니다.",
			patterns: ["#시나리오", "#scenario", "#user-story"],
			examples: [
				"## 로그인 시나리오 #시나리오",
				"[구매 프로세스](purchase.md) #scenario",
				"## 사용자 여행 #user-story",
			],
			rules: [
				"사용자의 목표를 명확히 정의해야 합니다.",
				"시나리오의 단계를 순서대로 설명해야 합니다.",
				"예외 상황도 고려해야 합니다.",
			],
			priority: 8,
			category: "scenario",
			relatedTags: ["requirement", "function_definition"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 개선 사항
		this.definitions.set("improvement", {
			id: "improvement",
			name: "개선 사항",
			description: "시스템 개선을 위한 아이디어나 계획을 정의하는 태그입니다.",
			patterns: ["#개선", "#improvement", "#enhancement"],
			examples: [
				"## 성능 개선 #개선",
				"[UI 개선 계획](ui.md) #improvement",
				"## 사용자 경험 개선 #enhancement",
			],
			rules: [
				"개선의 목적을 명확히 설명해야 합니다.",
				"개선의 우선순위를 명시해야 합니다.",
				"개선의 예상 효과를 설명해야 합니다.",
			],
			priority: 6,
			category: "improvement",
			relatedTags: ["todo", "function_definition"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// TODO
		this.definitions.set("todo", {
			id: "todo",
			name: "TODO",
			description: "해야 할 일을 정의하는 태그입니다.",
			patterns: ["#todo", "#TODO", "#할일"],
			examples: [
				"## 구현해야 할 기능 #todo",
				"[버그 수정](bug.md) #TODO",
				"## 문서화 작업 #할일",
			],
			rules: [
				"TODO의 내용을 구체적으로 설명해야 합니다.",
				"TODO의 우선순위를 명시해야 합니다.",
				"TODO의 담당자를 명시해야 합니다.",
			],
			priority: 5,
			category: "task",
			relatedTags: ["improvement", "test_case"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 테스트 케이스
		this.definitions.set("test_case", {
			id: "test_case",
			name: "테스트 케이스",
			description: "테스트 시나리오를 정의하는 태그입니다.",
			patterns: ["#테스트", "#test", "#testcase"],
			examples: [
				"## 단위 테스트 #테스트",
				"[통합 테스트](integration.md) #test",
				"## 사용자 테스트 #testcase",
			],
			rules: [
				"테스트의 목적을 명확히 설명해야 합니다.",
				"테스트의 입력과 예상 출력을 정의해야 합니다.",
				"테스트의 실행 조건을 명시해야 합니다.",
			],
			priority: 7,
			category: "test",
			relatedTags: ["example", "function_definition"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});

		// 에러 유형
		this.definitions.set("error_type", {
			id: "error_type",
			name: "에러 유형",
			description: "에러의 유형과 처리 방법을 정의하는 태그입니다.",
			patterns: ["#에러", "#error", "#exception"],
			examples: [
				"## 인증 에러 #에러",
				"[네트워크 에러](network.md) #error",
				"## 데이터베이스 에러 #exception",
			],
			rules: [
				"에러의 원인을 명확히 설명해야 합니다.",
				"에러의 해결 방법을 제시해야 합니다.",
				"에러의 발생 조건을 명시해야 합니다.",
			],
			priority: 8,
			category: "error",
			relatedTags: ["test_case", "function_definition"],
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				version: "1.0.0",
				author: "system",
			},
		});
	}

	/**
	 * 태그 유형 정의 조회
	 */
	getDefinition(tagType: ExplicitTagType): TagTypeDefinition | undefined {
		return this.definitions.get(tagType);
	}

	/**
	 * 모든 태그 유형 정의 조회
	 */
	getAllDefinitions(): TagTypeDefinition[] {
		return Array.from(this.definitions.values());
	}

	/**
	 * 태그 유형 정의 추가/수정
	 */
	setDefinition(definition: TagTypeDefinition): void {
		definition.metadata.updatedAt = new Date();
		this.definitions.set(definition.id, definition);
	}

	/**
	 * 태그 유형 정의 삭제
	 */
	removeDefinition(tagType: ExplicitTagType): boolean {
		return this.definitions.delete(tagType);
	}

	/**
	 * 태그 이름으로 유형 찾기
	 */
	findTypeByTagName(tagName: string): ExplicitTagType | undefined {
		for (const [type, definition] of this.definitions) {
			if (
				definition.patterns.some((pattern) =>
					pattern.toLowerCase().includes(tagName.toLowerCase()),
				)
			) {
				return type;
			}
		}
		return undefined;
	}

	/**
	 * 태그 유형 검증
	 */
	validateTagType(tagName: string, expectedType: ExplicitTagType): boolean {
		const definition = this.getDefinition(expectedType);
		if (!definition) return false;

		return definition.patterns.some((pattern) =>
			pattern.toLowerCase().includes(tagName.toLowerCase()),
		);
	}

	/**
	 * 태그 유형 통계
	 */
	getStatistics(): {
		totalTypes: number;
		typesByCategory: Record<string, number>;
		typesByPriority: Record<number, number>;
	} {
		const typesByCategory: Record<string, number> = {};
		const typesByPriority: Record<number, number> = {};

		for (const definition of this.definitions.values()) {
			typesByCategory[definition.category] =
				(typesByCategory[definition.category] || 0) + 1;
			typesByPriority[definition.priority] =
				(typesByPriority[definition.priority] || 0) + 1;
		}

		return {
			totalTypes: this.definitions.size,
			typesByCategory,
			typesByPriority,
		};
	}
}

// ===== GLOBAL INSTANCE =====

/**
 * 전역 태그 유형 컨테이너
 */
export const globalTagTypeContainer = new TagTypeContainer();

/**
 * 편의 함수들
 */
export function getTagTypeDefinition(
	tagType: ExplicitTagType,
): TagTypeDefinition | undefined {
	return globalTagTypeContainer.getDefinition(tagType);
}

export function getAllTagTypeDefinitions(): TagTypeDefinition[] {
	return globalTagTypeContainer.getAllDefinitions();
}

export function findTagTypeByTagName(
	tagName: string,
): ExplicitTagType | undefined {
	return globalTagTypeContainer.findTypeByTagName(tagName);
}

export function validateTagType(
	tagName: string,
	expectedType: ExplicitTagType,
): boolean {
	return globalTagTypeContainer.validateTagType(tagName, expectedType);
}
