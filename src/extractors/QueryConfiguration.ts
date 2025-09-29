/**
 * Tree-sitter Query Configuration System
 * 외부에서 주입 가능한 쿼리 시스템
 */

/**
 * 지원되는 언어 타입
 */
export type SupportedLanguage =
	| "typescript"
	| "tsx"
	| "javascript"
	| "jsx"
	| "go"
	| "java"
	| "python"
	| "rust";

/**
 * 쿼리 결과 처리 함수 타입
 */
export type QueryProcessor = (
	matches: any[],
	context: QueryProcessorContext,
) => void;

/**
 * 쿼리 처리 컨텍스트
 */
export interface QueryProcessorContext {
	importMap: Map<string, { source: string; originalName: string }>;
	usageMap: Map<string, any>;
	addUsage: (source: string, methodName: string) => void;
	extractStringFromNode: (node: any) => string;
	findChildByType: (node: any, type: string) => any;
}

/**
 * 단일 쿼리 정의
 */
export interface QueryDefinition {
	/** 쿼리 이름 (고유 식별자) */
	name: string;

	/** 쿼리 설명 */
	description: string;

	/** Tree-sitter 쿼리 문자열 */
	query: string;

	/** 쿼리 결과 처리 함수 */
	processor: QueryProcessor;

	/** 적용 가능한 언어들 */
	languages: SupportedLanguage[];

	/** 쿼리 우선순위 (높을수록 먼저 실행) */
	priority?: number;

	/** 쿼리 활성화 여부 */
	enabled?: boolean;
}

/**
 * 쿼리 구성 설정
 */
export interface QueryConfiguration {
	/** Import 분석 쿼리들 */
	importQueries: QueryDefinition[];

	/** Usage 분석 쿼리들 */
	usageQueries: QueryDefinition[];

	/** 전역 설정 */
	settings: {
		/** 쿼리 실패 시 fallback 사용 여부 */
		enableFallback: boolean;

		/** 쿼리 캐싱 사용 여부 */
		enableCaching: boolean;

		/** 디버그 모드 */
		debug: boolean;

		/** 최대 쿼리 실행 시간 (ms) */
		timeout?: number;
	};
}

/**
 * 기본 TypeScript/TSX Import 쿼리들
 */
export const DEFAULT_TYPESCRIPT_IMPORT_QUERIES: QueryDefinition[] = [
	{
		name: "typescript-imports",
		description: "TypeScript/TSX import statements analysis",
		query: `
      (import_statement
        (import_clause
          [
            (identifier) @default_import
            (named_imports
              (import_specifier
                (identifier) @named_import))
            (namespace_import) @namespace_import
          ])
        (string) @source)
    `,
		processor: (matches, context) => {
			for (const match of matches) {
				const captures: Record<string, any[]> = {};

				// Capture 그룹화
				for (const capture of match.captures) {
					const name = capture.name;
					if (!captures[name]) captures[name] = [];
					captures[name].push(capture.node);
				}

				const sources = captures.source;
				if (!sources || sources.length === 0) return;

				const source = context.extractStringFromNode(sources[0]);

				// Named imports 처리
				const namedImports = captures.named_import || [];
				for (const namedImport of namedImports) {
					context.importMap.set(namedImport.text, {
						source,
						originalName: namedImport.text,
					});
				}

				// Namespace imports 처리
				const namespaceImports = captures.namespace_import || [];
				for (const nsImport of namespaceImports) {
					const aliasNode = context.findChildByType(nsImport, "identifier");
					if (aliasNode) {
						context.importMap.set(aliasNode.text, {
							source,
							originalName: "*",
						});
					}
				}

				// Default imports 처리
				const defaultImports = captures.default_import || [];
				for (const defaultImport of defaultImports) {
					context.importMap.set(defaultImport.text, {
						source,
						originalName: "default",
					});
				}
			}
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		priority: 100,
		enabled: true,
	},
];

/**
 * 기본 TypeScript/TSX Usage 쿼리들
 */
export const DEFAULT_TYPESCRIPT_USAGE_QUERIES: QueryDefinition[] = [
	{
		name: "typescript-function-calls",
		description: "TypeScript/TSX function calls analysis",
		query: `
      (call_expression
        (identifier) @function_call)
    `,
		processor: (matches, context) => {
			for (const match of matches) {
				const captures: Record<string, any[]> = {};

				for (const capture of match.captures) {
					const name = capture.name;
					if (!captures[name]) captures[name] = [];
					captures[name].push(capture.node);
				}

				// Direct function calls 처리
				if (captures.function_call) {
					for (const funcNode of captures.function_call) {
						const functionName = funcNode.text;
						const importInfo = context.importMap.get(functionName);
						if (importInfo) {
							context.addUsage(importInfo.source, functionName);
						}
					}
				}
			}
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		priority: 90,
		enabled: true,
	},

	{
		name: "typescript-member-expressions",
		description: "TypeScript/TSX member expression calls (object.method)",
		query: `
      (call_expression
        (member_expression
          (identifier) @object_name
          (identifier) @method_name))
    `,
		processor: (matches, context) => {
			for (const match of matches) {
				const captures: Record<string, any[]> = {};

				for (const capture of match.captures) {
					const name = capture.name;
					if (!captures[name]) captures[name] = [];
					captures[name].push(capture.node);
				}

				// Member expression calls 처리
				if (captures.object_name && captures.method_name) {
					for (let i = 0; i < captures.object_name.length; i++) {
						const objectNode = captures.object_name[i];
						const methodNode = captures.method_name[i];

						if (objectNode && methodNode) {
							const objectName = objectNode.text;
							const methodName = methodNode.text;
							const importInfo = context.importMap.get(objectName);

							if (importInfo) {
								context.addUsage(
									importInfo.source,
									`${objectName}.${methodName}`,
								);
							}
						}
					}
				}
			}
		},
		languages: ["typescript", "tsx", "javascript", "jsx"],
		priority: 85,
		enabled: true,
	},
];

/**
 * 기본 쿼리 구성
 */
export const DEFAULT_QUERY_CONFIGURATION: QueryConfiguration = {
	importQueries: DEFAULT_TYPESCRIPT_IMPORT_QUERIES,
	usageQueries: DEFAULT_TYPESCRIPT_USAGE_QUERIES,
	settings: {
		enableFallback: true,
		enableCaching: true,
		debug: false,
		timeout: 5000,
	},
};

/**
 * 쿼리 구성 빌더
 */
export class QueryConfigurationBuilder {
	private config: QueryConfiguration;

	constructor(baseConfig?: Partial<QueryConfiguration>) {
		this.config = {
			importQueries: baseConfig?.importQueries || [
				...DEFAULT_TYPESCRIPT_IMPORT_QUERIES,
			],
			usageQueries: baseConfig?.usageQueries || [
				...DEFAULT_TYPESCRIPT_USAGE_QUERIES,
			],
			settings: {
				...DEFAULT_QUERY_CONFIGURATION.settings,
				...baseConfig?.settings,
			},
		};
	}

	/**
	 * Import 쿼리 추가
	 */
	addImportQuery(query: QueryDefinition): this {
		this.config.importQueries.push(query);
		return this;
	}

	/**
	 * Usage 쿼리 추가
	 */
	addUsageQuery(query: QueryDefinition): this {
		this.config.usageQueries.push(query);
		return this;
	}

	/**
	 * 기존 쿼리 비활성화
	 */
	disableQuery(queryName: string): this {
		[...this.config.importQueries, ...this.config.usageQueries]
			.filter((q) => q.name === queryName)
			.forEach((q) => (q.enabled = false));
		return this;
	}

	/**
	 * 설정 업데이트
	 */
	updateSettings(settings: Partial<QueryConfiguration["settings"]>): this {
		this.config.settings = { ...this.config.settings, ...settings };
		return this;
	}

	/**
	 * 언어별 쿼리 필터링
	 */
	forLanguage(language: SupportedLanguage): this {
		this.config.importQueries = this.config.importQueries.filter((q) =>
			q.languages.includes(language),
		);
		this.config.usageQueries = this.config.usageQueries.filter((q) =>
			q.languages.includes(language),
		);
		return this;
	}

	/**
	 * 최종 구성 반환
	 */
	build(): QueryConfiguration {
		// 우선순위별 정렬
		this.config.importQueries.sort(
			(a, b) => (b.priority || 0) - (a.priority || 0),
		);
		this.config.usageQueries.sort(
			(a, b) => (b.priority || 0) - (a.priority || 0),
		);

		return { ...this.config };
	}
}
