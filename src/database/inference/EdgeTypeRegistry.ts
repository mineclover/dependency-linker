/**
 * Edge Type Registry
 * 계층 구조를 포함한 모든 edge type 정의를 중앙에서 관리
 */

export interface EdgeTypeDefinition {
	type: string;
	description: string;
	schema: Record<string, any>;
	isDirected: boolean;
	parentType?: string;
	isTransitive: boolean;
	isInheritable: boolean;
	priority: number;
}

/**
 * Edge Type Registry
 *
 * 역할:
 * 1. 모든 edge type 정의를 코드로 명확히 관리
 * 2. 계층 구조 일관성 보장
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
			parentType: undefined,
			isTransitive: true,
			isInheritable: true,
			priority: 0,
		},
		{
			type: "declares",
			description: "Declaration relationship (A declares B)",
			schema: {},
			isDirected: true,
			parentType: "contains",
			isTransitive: false,
			isInheritable: true,
			priority: 0,
		},
		{
			type: "belongs_to",
			description: "Ownership relationship (A belongs to B)",
			schema: {},
			isDirected: true,
			parentType: undefined,
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
			parentType: undefined,
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
			parentType: "depends_on",
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
			parentType: undefined,
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
			parentType: "depends_on",
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "references",
			description: "Code references another element",
			schema: { referenceType: "string" },
			isDirected: true,
			parentType: "depends_on",
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "extends",
			description: "Class extends another class",
			schema: {},
			isDirected: true,
			parentType: "depends_on",
			isTransitive: false,
			isInheritable: true,
			priority: 5,
		},
		{
			type: "implements",
			description: "Class implements interface",
			schema: {},
			isDirected: true,
			parentType: "depends_on",
			isTransitive: false,
			isInheritable: true,
			priority: 5,
		},
		{
			type: "uses",
			description: "Uses another component",
			schema: { usageType: "string" },
			isDirected: true,
			parentType: "depends_on",
			isTransitive: false,
			isInheritable: false,
			priority: 5,
		},
		{
			type: "instantiates",
			description: "Creates instance of class",
			schema: {},
			isDirected: true,
			parentType: "depends_on",
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
			parentType: undefined,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "returns",
			description: "Function returns type",
			schema: {},
			isDirected: true,
			parentType: undefined,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "throws",
			description: "Function throws exception type",
			schema: {},
			isDirected: true,
			parentType: undefined,
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
			parentType: undefined,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "accesses",
			description: "Accesses property/variable",
			schema: { accessType: "string" },
			isDirected: true,
			parentType: "depends_on",
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
			parentType: undefined,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "shadows",
			description: "Variable shadows outer scope variable",
			schema: {},
			isDirected: true,
			parentType: undefined,
			isTransitive: false,
			isInheritable: false,
			priority: 0,
		},
		{
			type: "annotated_with",
			description: "Decorated/annotated with",
			schema: { annotation: "string" },
			isDirected: true,
			parentType: undefined,
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
			parentType: "imports",
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
			parentType: "imports",
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
			parentType: "references",
			isTransitive: false,
			isInheritable: false,
			priority: 5,
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
	 * 특정 parent를 가진 모든 child types 조회
	 */
	static getChildTypes(parentType: string): EdgeTypeDefinition[] {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}
		return Array.from(EdgeTypeRegistry.definitions.values()).filter(
			(def) => def.parentType === parentType,
		);
	}

	/**
	 * 특정 parent를 가진 모든 child type 이름들 조회 (문자열 배열)
	 */
	static getChildren(parentType: string): string[] {
		return EdgeTypeRegistry.getChildTypes(parentType).map((def) => def.type);
	}

	/**
	 * Edge type의 전체 계층 경로 조회
	 * 예: imports_library → imports → depends_on
	 */
	static getHierarchyPath(type: string): string[] {
		if (EdgeTypeRegistry.definitions.size === 0) {
			EdgeTypeRegistry.initialize();
		}

		const path: string[] = [type];
		let current = EdgeTypeRegistry.definitions.get(type);

		while (current?.parentType) {
			path.push(current.parentType);
			current = EdgeTypeRegistry.definitions.get(current.parentType);
		}

		return path;
	}

	/**
	 * 계층 구조 검증
	 * 순환 참조, 존재하지 않는 parent 등 체크
	 */
	static validateHierarchy(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		for (const def of EdgeTypeRegistry.definitions.values()) {
			if (def.parentType) {
				// Parent가 존재하는지 확인
				if (!EdgeTypeRegistry.definitions.has(def.parentType)) {
					errors.push(
						`${def.type}: parent type '${def.parentType}' does not exist`,
					);
				}

				// 순환 참조 확인
				const path = EdgeTypeRegistry.getHierarchyPath(def.type);
				const seen = new Set<string>();
				for (const node of path) {
					if (seen.has(node)) {
						errors.push(`${def.type}: circular hierarchy detected`);
						break;
					}
					seen.add(node);
				}
			}
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
	 * 계층 구조 시각화
	 */
	static printHierarchy(): string {
		const lines: string[] = [];
		const visited = new Set<string>();

		const printNode = (type: string, indent: number = 0) => {
			if (visited.has(type)) return;
			visited.add(type);

			const def = EdgeTypeRegistry.definitions.get(type);
			if (!def) return;

			const prefix = "  ".repeat(indent);
			const properties = [];
			if (def.isTransitive) properties.push("transitive");
			if (def.isInheritable) properties.push("inheritable");
			const propStr =
				properties.length > 0 ? ` (${properties.join(", ")})` : "";

			lines.push(`${prefix}• ${type}${propStr}`);

			// Children
			const children = EdgeTypeRegistry.getChildTypes(type);
			for (const child of children) {
				printNode(child.type, indent + 1);
			}
		};

		// Root nodes (parentType이 없는 것들)
		const roots = Array.from(EdgeTypeRegistry.definitions.values()).filter(
			(def) => !def.parentType,
		);

		for (const root of roots) {
			printNode(root.type);
		}

		return lines.join("\n");
	}
}

// 자동 초기화
EdgeTypeRegistry.initialize();
