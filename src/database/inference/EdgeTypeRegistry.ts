/**
 * Edge Type Registry
 * 계층 구조를 포함한 모든 edge type 정의를 중앙에서 관리
 */

export interface EdgeTypeDefinition {
	type: string;
	description: string;
	schema: Record<string, any>;
	isDirected: boolean;
	isTransitive: boolean;
	isInheritable: boolean;
	priority: number;
}

/**
 * Edge Type Registry
 *
 * 역할:
 * 1. 모든 edge type 정의를 코드로 명확히 관리
 * 2. Flat Edge Type List 관리 (계층 구조 제거)
 * 3. schema.sql과 동기화 기준점 제공
 * 4. 동적 edge type 추가 시 검증 기준
 */
export class EdgeTypeRegistry {
	private static definitions: Map<string, EdgeTypeDefinition> = new Map();

	/**
	 * 핵심 Edge Types (schema.sql에 정의된 기본 타입들)
	 */
	static readonly CORE_TYPES: EdgeTypeDefinition[] = [
		// ===== 구조적 관계 (Structural) =====
		{
			type: "contains",
			description: "Contains relationship (A contains B)",
			schema: {},
			isDirected: true,
			isTransitive: true,
			isInheritable: true,
			priority: 0,
		},
		{
			type: "declares",
			description: "Declaration relationship (A declares B)",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: true,
			priority: 0,
		},
		{
			type: "belongs_to",
			description: "Ownership relationship (A belongs to B)",
			schema: {},
			isDirected: true,
			isTransitive: true,
			isInheritable: false,
			priority: 0,
		},

		// ===== 의존성 관계 (Dependency) - 최상위 =====
		{
			type: "depends_on",
			description: "General dependency relationship",
			schema: { dependencyType: "string" },
			isDirected: true,
			isTransitive: true,
			isInheritable: false,
			priority: 0,
		},

		// ===== 코드 관계 (Code Relationships) =====
		{
			type: "imports",
			description: "File imports another file",
			schema: {
				importPath: "string",
				isNamespace: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "exports_to",
			description: "File exports to another file",
			schema: {
				exportName: "string",
				isDefault: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "calls",
			description: "Method calls another method",
			schema: {
				callType: "string",
				isAsync: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "references",
			description: "Code references another element",
			schema: { referenceType: "string" },
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "extends",
			description: "Class extends another class",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: true,
			priority: 5,
		},
		{
			type: "implements",
			description: "Class implements interface",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: true,
			priority: 5,
		},
		{
			type: "uses",
			description: "Uses another component",
			schema: { usageType: "string" },
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "instantiates",
			description: "Creates instance of class",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},

		// ===== 타입 관계 (Type Relationships) =====
		{
			type: "has_type",
			description: "Variable/parameter has type",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "returns",
			description: "Function returns type",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "throws",
			description: "Function throws exception type",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},

		// ===== 할당과 접근 (Assignment & Access) =====
		{
			type: "assigns_to",
			description: "Assignment to variable/property",
			schema: { operator: "string" },
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "accesses",
			description: "Accesses property/variable",
			schema: { accessType: "string" },
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},

		// ===== 상속과 재정의 (Inheritance & Override) =====
		{
			type: "overrides",
			description: "Method overrides parent method",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "shadows",
			description: "Variable shadows outer scope variable",
			schema: {},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "annotated_with",
			description: "Decorated/annotated with",
			schema: { annotation: "string" },
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
	];

	/**
	 * 확장 Edge Types (애플리케이션에서 동적으로 추가)
	 * FileDependencyAnalyzer, MethodAnalyzer 등이 사용
	 */
	static readonly EXTENDED_TYPES: EdgeTypeDefinition[] = [
		{
			type: "imports_library",
			description: "Imports external library or package",
			schema: {
				importType: "string",
				importedItems: "array",
				isDirectDependency: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 6,
		},
		{
			type: "imports_file",
			description: "Imports local file or module",
			schema: {
				importType: "string",
				importedItems: "array",
				isDirectDependency: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 6,
		},
		{
			type: "aliasOf",
			description: "Symbol is an alias of another symbol (import alias)",
			schema: {
				isInferred: "boolean",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "resolvedTo",
			description: "Unknown node resolved to actual type node",
			schema: {
				isInferred: "boolean",
				confidence: "number",
				resolvedAt: "string",
			},
			isDirected: true,
			isTransitive: false,
			isInheritable: false,
			priority: 10,
		},
	];

	/**
	 * 레지스트리 초기화
	 */
	static initialize(): void {
		EdgeTypeRegistry.definitions.clear();

		// Core types 등록
		for (const def of EdgeTypeRegistry.CORE_TYPES) {
			EdgeTypeRegistry.definitions.set(def.type, def);
		}

		// Extended types 등록
		for (const def of EdgeTypeRegistry.EXTENDED_TYPES) {
			EdgeTypeRegistry.definitions.set(def.type, def);
		}
	}

	/**
	 * Edge type 정의 조회
	 */
	static get(type: string): EdgeTypeDefinition | undefined {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		return EdgeTypeRegistry.definitions.get(type);
	}

	/**
	 * 모든 edge type 정의 조회
	 */
	static getAll(): EdgeTypeDefinition[] {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		return Array.from(EdgeTypeRegistry.definitions.values());
	}

	/**
	 * Core types만 조회 (schema.sql과 동기화 필요)
	 */
	static getCoreTypes(): EdgeTypeDefinition[] {
		return EdgeTypeRegistry.CORE_TYPES;
	}

	/**
	 * Extended types만 조회 (동적 등록 필요)
	 */
	static getExtendedTypes(): EdgeTypeDefinition[] {
		return EdgeTypeRegistry.EXTENDED_TYPES;
	}

	/**
	 * Type 정의 검증
	 * 중복 type 이름 등 기본 무결성 체크
	 */
	static validateHierarchy(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// 중복 type 이름 확인
		const typeNames = new Set<string>();
		const allTypes = [
			...EdgeTypeRegistry.CORE_TYPES,
			...EdgeTypeRegistry.EXTENDED_TYPES,
		];

		for (const def of allTypes) {
			if (typeNames.has(def.type)) {
				errors.push(`Duplicate type name: ${def.type}`);
			}
			typeNames.add(def.type);
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * DB에 등록해야 할 edge types 반환
	 * (schema.sql에 없고 동적으로 추가해야 하는 것들)
	 */
	static getTypesForDynamicRegistration(): EdgeTypeDefinition[] {
		return EdgeTypeRegistry.EXTENDED_TYPES;
	}

	/**
	 * Edge type 동적 등록
	 */
	static register(type: string, definition: EdgeTypeDefinition): void {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		EdgeTypeRegistry.definitions.set(type, definition);
	}

	/**
	 * Edge type 동적 제거
	 */
	static unregister(type: string): boolean {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		return EdgeTypeRegistry.definitions.delete(type);
	}

	/**
	 * Edge type 존재 여부 확인
	 */
	static exists(type: string): boolean {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		return EdgeTypeRegistry.definitions.has(type);
	}

	/**
	 * 특정 속성을 가진 Edge types 조회
	 */
	static getByProperty(
		property: keyof EdgeTypeDefinition,
		value: any,
	): EdgeTypeDefinition[] {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}

		const results: EdgeTypeDefinition[] = [];
		for (const definition of EdgeTypeRegistry.definitions.values()) {
			if (definition[property] === value) {
				results.push(definition);
			}
		}
		return results;
	}

	/**
	 * Transitive edge types 조회
	 */
	static getTransitiveTypes(): EdgeTypeDefinition[] {
		return EdgeTypeRegistry.getByProperty("isTransitive", true);
	}

	/**
	 * Inheritable edge types 조회
	 */
	static getInheritableTypes(): EdgeTypeDefinition[] {
		return EdgeTypeRegistry.getByProperty("isInheritable", true);
	}

	/**
	 * Priority별 Edge types 조회 (낮은 우선순위부터)
	 */
	static getByPriority(): EdgeTypeDefinition[] {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}

		return Array.from(EdgeTypeRegistry.definitions.values()).sort(
			(a, b) => a.priority - b.priority,
		);
	}

	/**
	 * All edge types 목록 출력 (Flat List)
	 */
	static printFlatList(): string {
		const lines: string[] = [];

		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}

		// Priority별로 정렬
		const allTypes = EdgeTypeRegistry.getByPriority();

		for (const def of allTypes) {
			const properties = [];
			if (def.isTransitive) properties.push("transitive");
			if (def.isInheritable) properties.push("inheritable");
			if (def.isDirected) properties.push("directed");
			const propStr =
				properties.length > 0 ? ` (${properties.join(", ")})` : "";

			lines.push(`• ${def.type} [priority: ${def.priority}]${propStr}`);
		}

		return lines.join("\n");
	}

	/**
	 * Edge types 통계 정보
	 */
	static getStatistics(): {
		total: number;
		transitive: number;
		inheritable: number;
		directed: number;
		byPriority: Record<number, number>;
	} {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}

		const allTypes = Array.from(EdgeTypeRegistry.definitions.values());
		const byPriority: Record<number, number> = {};

		for (const def of allTypes) {
			byPriority[def.priority] = (byPriority[def.priority] || 0) + 1;
		}

		return {
			total: allTypes.length,
			transitive: allTypes.filter((t) => t.isTransitive).length,
			inheritable: allTypes.filter((t) => t.isInheritable).length,
			directed: allTypes.filter((t) => t.isDirected).length,
			byPriority,
		};
	}
}

// 자동 초기화
EdgeTypeRegistry.initialize();
