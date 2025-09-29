/**
 * Functional Query Composition - 함수형 쿼리 조합 시스템
 * 타입 안전한 쿼리 결과 조합과 자동 타입 추론
 */

import type {
	QueryKey,
	QueryResultMap,
} from "../queries/ImportQueries";
import type {
	FunctionalQueryEngine,
	MultiQueryExecutionResult,
	QueryExecutionOptions,
} from "./QueryEngine";

/**
 * 조합 가능한 결과 타입들
 */
export interface ComposableResults {
	// Import 분석 조합
	importAnalysis: {
		sources: QueryResultMap["import-sources"][];
		namedImports: QueryResultMap["named-imports"][];
		defaultImports: QueryResultMap["default-imports"][];
		typeImports: QueryResultMap["type-imports"][];
	};

	// TypeScript 전용 조합
	typeScriptAnalysis: {
		typeImports: QueryResultMap["type-imports"][];
	};

	// JavaScript 전용 조합
	javaScriptAnalysis: {
		sources: QueryResultMap["import-sources"][];
		namedImports: QueryResultMap["named-imports"][];
		defaultImports: QueryResultMap["default-imports"][];
	};
}

/**
 * 조합 타입 키
 */
export type CompositionKey = keyof ComposableResults;

/**
 * 함수형 쿼리 조합기
 */
export class FunctionalQueryComposer {
	constructor(private engine: FunctionalQueryEngine) {}

	/**
	 * Import 분석 조합 실행
	 */
	async composeImportAnalysis(
		options: QueryExecutionOptions
	): Promise<ComposableResults["importAnalysis"]> {
		const isTypeScript = options.language === "typescript" || options.language === "tsx";

		const baseQueries: ["import-sources", "named-imports", "default-imports"] = [
			"import-sources",
			"named-imports",
			"default-imports"
		];

		// TypeScript인 경우 type-imports 추가
		const queries = isTypeScript
			? [...baseQueries, "type-imports" as const]
			: baseQueries;

		const results = await this.engine.executeQueries(queries, options);

		return {
			sources: results["import-sources"].results,
			namedImports: results["named-imports"].results,
			defaultImports: results["default-imports"].results,
			typeImports: isTypeScript ? results["type-imports"].results : [],
		};
	}

	/**
	 * TypeScript 전용 분석 조합
	 */
	async composeTypeScriptAnalysis(
		options: QueryExecutionOptions
	): Promise<ComposableResults["typeScriptAnalysis"]> {
		if (options.language !== "typescript" && options.language !== "tsx") {
			throw new Error("TypeScript analysis is only available for TypeScript files");
		}

		const result = await this.engine.executeQuery("type-imports", options);

		return {
			typeImports: result.results,
		};
	}

	/**
	 * JavaScript 전용 분석 조합
	 */
	async composeJavaScriptAnalysis(
		options: QueryExecutionOptions
	): Promise<ComposableResults["javaScriptAnalysis"]> {
		const queries: ["import-sources", "named-imports", "default-imports"] = [
			"import-sources",
			"named-imports",
			"default-imports"
		];

		const results = await this.engine.executeQueries(queries, options);

		return {
			sources: results["import-sources"].results,
			namedImports: results["named-imports"].results,
			defaultImports: results["default-imports"].results,
		};
	}

	/**
	 * 동적 조합 실행
	 */
	async compose<K extends CompositionKey>(
		compositionKey: K,
		options: QueryExecutionOptions
	): Promise<ComposableResults[K]> {
		switch (compositionKey) {
			case "importAnalysis":
				return this.composeImportAnalysis(options) as Promise<ComposableResults[K]>;

			case "typeScriptAnalysis":
				return this.composeTypeScriptAnalysis(options) as Promise<ComposableResults[K]>;

			case "javaScriptAnalysis":
				return this.composeJavaScriptAnalysis(options) as Promise<ComposableResults[K]>;

			default:
				throw new Error(`Unknown composition key: ${compositionKey}`);
		}
	}
}

/**
 * 타입 안전한 조합 헬퍼 함수들
 */

/**
 * Import 분석 수행
 */
export async function analyzeImports(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<ComposableResults["importAnalysis"]> {
	const composer = new FunctionalQueryComposer(engine);
	return composer.composeImportAnalysis(options);
}

/**
 * TypeScript 타입 분석
 */
export async function analyzeTypeScriptTypes(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<ComposableResults["typeScriptAnalysis"]> {
	const composer = new FunctionalQueryComposer(engine);
	return composer.composeTypeScriptAnalysis(options);
}

/**
 * JavaScript 분석
 */
export async function analyzeJavaScript(
	engine: FunctionalQueryEngine,
	options: QueryExecutionOptions
): Promise<ComposableResults["javaScriptAnalysis"]> {
	const composer = new FunctionalQueryComposer(engine);
	return composer.composeJavaScriptAnalysis(options);
}

/**
 * 조합 결과를 통합 분석 결과로 변환
 */
export interface UnifiedAnalysisResult {
	totalImports: number;
	packageImports: number;
	localImports: number;
	namedImportsCount: number;
	defaultImportsCount: number;
	typeImportsCount: number;
	uniqueSources: string[];
	importSummary: {
		sources: QueryResultMap["import-sources"][];
		named: QueryResultMap["named-imports"][];
		defaults: QueryResultMap["default-imports"][];
		types: QueryResultMap["type-imports"][];
	};
}

/**
 * 조합 결과를 통합 분석으로 변환
 */
export function unifyAnalysisResults(
	compositionResults: ComposableResults["importAnalysis"]
): UnifiedAnalysisResult {
	const { sources, namedImports, defaultImports, typeImports } = compositionResults;

	const packageImports = sources.filter(s => s.type === "package").length;
	const localImports = sources.filter(s => s.type === "local").length;
	const uniqueSources = Array.from(new Set(sources.map(s => s.source)));

	return {
		totalImports: sources.length,
		packageImports,
		localImports,
		namedImportsCount: namedImports.length,
		defaultImportsCount: defaultImports.length,
		typeImportsCount: typeImports.length,
		uniqueSources,
		importSummary: {
			sources,
			named: namedImports,
			defaults: defaultImports,
			types: typeImports,
		},
	};
}

/**
 * 조합 실행 시간 측정 데코레이터
 */
export function withTiming<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	label: string
): T {
	return (async (...args: any[]) => {
		const start = Date.now();
		try {
			const result = await fn(...args);
			const duration = Date.now() - start;
			console.log(`[${label}] Completed in ${duration}ms`);
			return result;
		} catch (error) {
			const duration = Date.now() - start;
			console.error(`[${label}] Failed after ${duration}ms:`, error);
			throw error;
		}
	}) as T;
}

/**
 * 타이밍이 포함된 조합 헬퍼들
 */
export const timedAnalyzeImports = withTiming(analyzeImports, "Import Analysis");
export const timedAnalyzeTypeScriptTypes = withTiming(analyzeTypeScriptTypes, "TypeScript Analysis");
export const timedAnalyzeJavaScript = withTiming(analyzeJavaScript, "JavaScript Analysis");

/**
 * 조합 실행 팩토리
 */
export class CompositionFactory {
	private composer: FunctionalQueryComposer;

	constructor(engine: FunctionalQueryEngine) {
		this.composer = new FunctionalQueryComposer(engine);
	}

	/**
	 * 언어별 최적 조합 실행
	 */
	async executeOptimalComposition(
		options: QueryExecutionOptions
	): Promise<ComposableResults["importAnalysis"] | ComposableResults["javaScriptAnalysis"]> {
		const isTypeScript = options.language === "typescript" || options.language === "tsx";

		if (isTypeScript) {
			return this.composer.composeImportAnalysis(options);
		} else {
			return this.composer.composeJavaScriptAnalysis(options);
		}
	}

	/**
	 * 조건부 TypeScript 분석 추가
	 */
	async executeWithConditionalTypeScript(
		options: QueryExecutionOptions
	): Promise<{
		base: ComposableResults["importAnalysis"] | ComposableResults["javaScriptAnalysis"];
		typescript?: ComposableResults["typeScriptAnalysis"];
	}> {
		const base = await this.executeOptimalComposition(options);

		const isTypeScript = options.language === "typescript" || options.language === "tsx";
		const typescript = isTypeScript
			? await this.composer.composeTypeScriptAnalysis(options)
			: undefined;

		return { base, typescript };
	}

	/**
	 * 모든 조합 실행 (디버깅/완전 분석용)
	 */
	async executeAllCompositions(
		options: QueryExecutionOptions
	): Promise<{
		importAnalysis: ComposableResults["importAnalysis"];
		javaScriptAnalysis: ComposableResults["javaScriptAnalysis"];
		typeScriptAnalysis?: ComposableResults["typeScriptAnalysis"];
	}> {
		const importAnalysis = await this.composer.composeImportAnalysis(options);
		const javaScriptAnalysis = await this.composer.composeJavaScriptAnalysis(options);

		const isTypeScript = options.language === "typescript" || options.language === "tsx";
		const typeScriptAnalysis = isTypeScript
			? await this.composer.composeTypeScriptAnalysis(options)
			: undefined;

		return {
			importAnalysis,
			javaScriptAnalysis,
			typeScriptAnalysis,
		};
	}
}