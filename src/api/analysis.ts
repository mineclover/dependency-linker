/**
 * Unified Analysis API
 * 통합 분석 API - 사용자가 쉽게 사용할 수 있는 고수준 분석 인터페이스
 */

import type { SupportedLanguage, QueryExecutionContext } from "../core/types";
import type { QueryKey, QueryResult } from "../core/QueryResultMap";
import type { CustomKeyMapping } from "../mappers/CustomKeyMapper";
import { createCustomKeyMapper } from "../mappers/CustomKeyMapper";
import { parseCode } from "../parsers";
import {
	executeTreeSitterQuery,
	executeMultipleTreeSitterQueries,
	executeAllLanguageQueries,
	initializeQueryBridge
} from "../core/QueryBridge";

// ===== ANALYSIS RESULT TYPES =====

/**
 * 완전한 분석 결과
 */
export interface AnalysisResult {
	// 기본 정보
	language: SupportedLanguage;
	filePath: string;
	sourceCode: string;

	// 파싱 결과
	parseMetadata: {
		nodeCount: number;
		parseTime: number;
	};

	// 쿼리 결과
	queryResults: Record<QueryKey, QueryResult<QueryKey>[]>;

	// 커스텀 매핑 결과 (제공된 경우)
	customResults?: Record<string, QueryResult<QueryKey>[]>;

	// 성능 메트릭
	performanceMetrics: {
		totalExecutionTime: number;
		queryExecutionTime: number;
		customMappingTime?: number;
	};
}

/**
 * 분석 옵션
 */
export interface AnalysisOptions {
	// 실행할 쿼리 키들 (미지정시 모든 지원 쿼리 실행)
	queryKeys?: QueryKey[];

	// 커스텀 키 매핑
	customMapping?: CustomKeyMapping;

	// 조건부 커스텀 매핑
	customConditions?: Record<string, boolean>;

	// 성능 최적화 옵션
	enableParallelExecution?: boolean;
	enableCaching?: boolean;
}

// ===== CORE ANALYSIS FUNCTIONS =====

/**
 * 파일 분석 - 가장 기본적인 분석 함수
 */
export async function analyzeFile(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string = "unknown",
	options: AnalysisOptions = {}
): Promise<AnalysisResult> {
	const startTime = performance.now();

	try {
		// 1. 파싱
		const parseResult = await parseCode(sourceCode, language, filePath);
		const context: QueryExecutionContext = parseResult.context;

		// 2. 쿼리 실행
		const queryStartTime = performance.now();

		let queryResults: Record<QueryKey, QueryResult<QueryKey>[]>;

		if (options.queryKeys && options.queryKeys.length > 0) {
			// 지정된 쿼리만 실행
			queryResults = await executeMultipleTreeSitterQueries(options.queryKeys, context);
		} else {
			// 모든 지원 쿼리 실행
			queryResults = await executeAllLanguageQueries(context);
		}

		const queryExecutionTime = performance.now() - queryStartTime;

		// 3. 커스텀 매핑 실행 (옵션인 경우)
		let customResults: Record<string, QueryResult<QueryKey>[]> | undefined;
		let customMappingTime: number | undefined;

		if (options.customMapping) {
			const customStartTime = performance.now();
			const customMapper = createCustomKeyMapper(options.customMapping);

			// 커스텀 매핑에 필요한 매치 데이터 생성
			const allMatches = [];
			for (const [queryKey, results] of Object.entries(queryResults)) {
				// QueryResult를 QueryMatch로 변환 (간단한 변환)
				const matches = results.map(result => ({
					queryName: queryKey,
					captures: [{ name: "result", node: null as any }] // 실제로는 원본 노드가 필요
				}));
				allMatches.push(...matches);
			}

			if (options.customConditions) {
				customResults = await customMapper.executeConditional(
					options.customConditions,
					allMatches,
					context
				);
			} else {
				customResults = await customMapper.execute(allMatches, context);
			}

			customMappingTime = performance.now() - customStartTime;
		}

		const totalExecutionTime = performance.now() - startTime;

		return {
			language,
			filePath: context.filePath,
			sourceCode: context.sourceCode,
			parseMetadata: {
				nodeCount: parseResult.metadata.nodeCount,
				parseTime: parseResult.metadata.parseTime
			},
			queryResults,
			customResults,
			performanceMetrics: {
				totalExecutionTime,
				queryExecutionTime,
				customMappingTime
			}
		};

	} catch (error) {
		throw new Error(`Analysis failed for ${filePath}: ${error}`);
	}
}

/**
 * TypeScript 파일 분석 (편의 함수)
 */
export async function analyzeTypeScriptFile(
	sourceCode: string,
	filePath: string = "unknown.ts",
	options: Omit<AnalysisOptions, 'language'> = {}
): Promise<AnalysisResult> {
	const language: SupportedLanguage = filePath.endsWith('.tsx') ? 'tsx' : 'typescript';
	return analyzeFile(sourceCode, language, filePath, options);
}

/**
 * JavaScript 파일 분석 (편의 함수)
 */
export async function analyzeJavaScriptFile(
	sourceCode: string,
	filePath: string = "unknown.js",
	options: Omit<AnalysisOptions, 'language'> = {}
): Promise<AnalysisResult> {
	const language: SupportedLanguage = filePath.endsWith('.jsx') ? 'jsx' : 'javascript';
	return analyzeFile(sourceCode, language, filePath, options);
}

/**
 * Java 파일 분석 (편의 함수)
 */
export async function analyzeJavaFile(
	sourceCode: string,
	filePath: string = "Unknown.java",
	options: Omit<AnalysisOptions, 'language'> = {}
): Promise<AnalysisResult> {
	return analyzeFile(sourceCode, "java", filePath, options);
}

/**
 * Python 파일 분석 (편의 함수)
 */
export async function analyzePythonFile(
	sourceCode: string,
	filePath: string = "unknown.py",
	options: Omit<AnalysisOptions, 'language'> = {}
): Promise<AnalysisResult> {
	return analyzeFile(sourceCode, "python", filePath, options);
}

// ===== SPECIALIZED ANALYSIS FUNCTIONS =====

/**
 * 임포트 분석 전용 함수
 */
export async function analyzeImports(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string = "unknown"
): Promise<{
	sources: QueryResult<QueryKey>[];
	named: QueryResult<QueryKey>[];
	defaults: QueryResult<QueryKey>[];
	types?: QueryResult<QueryKey>[]; // TypeScript만
}> {
	const importQueryKeys = getImportQueryKeys(language);
	const result = await analyzeFile(sourceCode, language, filePath, {
		queryKeys: importQueryKeys
	});

	return {
		sources: result.queryResults[getSourceQueryKey(language)] || [],
		named: result.queryResults[getNamedImportQueryKey(language)] || [],
		defaults: result.queryResults[getDefaultImportQueryKey(language)] || [],
		...(language.startsWith('typescript') || language.startsWith('tsx') ? {
			types: result.queryResults[getTypeImportQueryKey(language)] || []
		} : {})
	};
}

/**
 * 의존성 분석 전용 함수
 */
export async function analyzeDependencies(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string = "unknown"
): Promise<{
	internal: string[];     // 내부 의존성 (상대 경로)
	external: string[];     // 외부 의존성 (npm 패키지 등)
	builtin: string[];      // 내장 모듈
}> {
	const result = await analyzeImports(sourceCode, language, filePath);

	const dependencies = {
		internal: [] as string[],
		external: [] as string[],
		builtin: [] as string[]
	};

	// 소스 분석하여 분류
	for (const sourceResult of result.sources) {
		if ('source' in sourceResult) {
			const source = (sourceResult as any).source;
			if (source.startsWith('./') || source.startsWith('../')) {
				dependencies.internal.push(source);
			} else if (isBuiltinModule(source, language)) {
				dependencies.builtin.push(source);
			} else {
				dependencies.external.push(source);
			}
		}
	}

	return dependencies;
}

// ===== HELPER FUNCTIONS =====

function getImportQueryKeys(language: SupportedLanguage): QueryKey[] {
	switch (language) {
		case "typescript":
		case "tsx":
			return ["ts-import-sources", "ts-named-imports", "ts-default-imports", "ts-type-imports"] as QueryKey[];
		case "javascript":
		case "jsx":
			return ["js-import-sources", "js-named-imports", "js-default-imports"] as QueryKey[];
		case "java":
			return ["java-import-sources", "java-import-statements"] as QueryKey[];
		case "python":
			return ["python-import-sources", "python-import-statements", "python-from-imports"] as QueryKey[];
		default:
			return [];
	}
}

function getSourceQueryKey(language: SupportedLanguage): QueryKey {
	switch (language) {
		case "typescript":
		case "tsx":
			return "ts-import-sources" as QueryKey;
		case "javascript":
		case "jsx":
			return "js-import-sources" as QueryKey;
		case "java":
			return "java-import-sources" as QueryKey;
		case "python":
			return "python-import-sources" as QueryKey;
		default:
			throw new Error(`Unsupported language: ${language}`);
	}
}

function getNamedImportQueryKey(language: SupportedLanguage): QueryKey {
	switch (language) {
		case "typescript":
		case "tsx":
			return "ts-named-imports" as QueryKey;
		case "javascript":
		case "jsx":
			return "js-named-imports" as QueryKey;
		default:
			throw new Error(`Named imports not supported for language: ${language}`);
	}
}

function getDefaultImportQueryKey(language: SupportedLanguage): QueryKey {
	switch (language) {
		case "typescript":
		case "tsx":
			return "ts-default-imports" as QueryKey;
		case "javascript":
		case "jsx":
			return "js-default-imports" as QueryKey;
		default:
			throw new Error(`Default imports not supported for language: ${language}`);
	}
}

function getTypeImportQueryKey(language: SupportedLanguage): QueryKey {
	switch (language) {
		case "typescript":
		case "tsx":
			return "ts-type-imports" as QueryKey;
		default:
			throw new Error(`Type imports not supported for language: ${language}`);
	}
}

function isBuiltinModule(source: string, language: SupportedLanguage): boolean {
	// 언어별 내장 모듈 판별 로직
	switch (language) {
		case "typescript":
		case "tsx":
		case "javascript":
		case "jsx":
			return [
				'fs', 'path', 'os', 'crypto', 'events', 'stream', 'util', 'url',
				'querystring', 'http', 'https', 'net', 'tls', 'dns', 'child_process'
			].includes(source);
		case "python":
			return [
				'os', 'sys', 'pathlib', 'datetime', 'json', 'urllib', 'http',
				'collections', 'itertools', 'functools', 'typing'
			].includes(source);
		case "java":
			return source.startsWith('java.') || source.startsWith('javax.');
		default:
			return false;
	}
}

// ===== INITIALIZATION =====

/**
 * 분석 시스템 초기화
 */
export function initializeAnalysisSystem(): void {
	initializeQueryBridge();
	console.log("✅ Analysis system initialized");
}