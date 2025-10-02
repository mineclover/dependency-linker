/**
 * Query Bridge - Tree-sitter와 Processor 연결
 * Tree-sitter 쿼리 결과를 기존 쿼리 프로세서와 연결하는 브리지
 */

import { getJavaTreeSitterQueries } from "../queries/java/tree-sitter-queries";
import { getPythonTreeSitterQueries } from "../queries/python/tree-sitter-queries";
import { getTreeSitterQueries } from "../queries/typescript/tree-sitter-queries";
import { globalQueryEngine } from "./QueryEngine";
import type { QueryKey, QueryResult } from "./QueryResultMap";
import { globalTreeSitterQueryEngine } from "./TreeSitterQueryEngine";
import type { QueryExecutionContext, SupportedLanguage } from "./types";

/**
 * 언어별 Tree-sitter 쿼리 가져오기
 */
function getLanguageTreeSitterQueries(
	language: SupportedLanguage,
): Record<string, string> {
	switch (language) {
		case "typescript":
		case "tsx":
			return getTreeSitterQueries(language);
		case "javascript":
		case "jsx":
			return getTreeSitterQueries(language);
		case "java":
			return getJavaTreeSitterQueries();
		case "python":
			return getPythonTreeSitterQueries();
		case "go":
			return {}; // TODO: Go 쿼리 구현 필요
		default:
			return {};
	}
}

/**
 * Tree-sitter 쿼리를 실행하고 결과를 프로세서로 전달
 */
export async function executeTreeSitterQuery(
	queryKey: QueryKey,
	context: QueryExecutionContext,
): Promise<QueryResult<QueryKey>[]> {
	try {
		// 1. 해당 언어의 Tree-sitter 쿼리 문자열 가져오기
		const languageQueries = getLanguageTreeSitterQueries(context.language);
		const queryString = languageQueries[queryKey];

		if (!queryString) {
			console.warn(
				`No tree-sitter query found for ${queryKey} in language ${context.language}`,
			);
			return [];
		}

		// 2. Tree-sitter 쿼리 실행하여 QueryMatch 생성
		const matches = globalTreeSitterQueryEngine.executeQuery(
			queryKey,
			queryString,
			context.tree,
			context.language,
		);

		// 3. QueryMatch를 기존 프로세서로 전달하여 QueryResult 생성
		const results = await globalQueryEngine.execute(queryKey, matches, context);

		return results;
	} catch (error) {
		console.error(
			`Failed to execute tree-sitter query for ${queryKey}:`,
			error,
		);
		return [];
	}
}

/**
 * 여러 Tree-sitter 쿼리를 동시 실행
 */
export async function executeMultipleTreeSitterQueries(
	queryKeys: QueryKey[],
	context: QueryExecutionContext,
): Promise<Record<QueryKey, QueryResult<QueryKey>[]>> {
	const results: Record<QueryKey, QueryResult<QueryKey>[]> = {} as Record<
		QueryKey,
		QueryResult<QueryKey>[]
	>;

	// 병렬 실행
	const promises = queryKeys.map(async (queryKey) => {
		const queryResults = await executeTreeSitterQuery(queryKey, context);
		return { queryKey, queryResults };
	});

	const settled = await Promise.allSettled(promises);

	for (const promise of settled) {
		if (promise.status === "fulfilled") {
			const { queryKey, queryResults } = promise.value;
			results[queryKey] = queryResults;
		}
	}

	return results;
}

/**
 * 언어에 지원되는 모든 쿼리 실행
 */
export async function executeAllLanguageQueries(
	context: QueryExecutionContext,
): Promise<Record<QueryKey, QueryResult<QueryKey>[]>> {
	// 해당 언어에서 지원되는 모든 쿼리 키 가져오기
	const languageQueries = getLanguageTreeSitterQueries(context.language);
	const queryKeys = Object.keys(languageQueries) as QueryKey[];

	// 지원되는 쿼리만 필터링 (프로세서가 등록된 것들만)
	const registry = globalQueryEngine.getRegistry();
	const supportedQueryKeys = queryKeys.filter(
		(key) =>
			registry.get(key) && registry.supportsLanguage(key, context.language),
	);

	return executeMultipleTreeSitterQueries(supportedQueryKeys, context);
}

/**
 * Tree-sitter 쿼리 엔진 초기화
 * 모든 언어의 Tree-sitter 쿼리를 전역 엔진에 등록
 */
export function initializeTreeSitterQueries(): void {
	// TypeScript/JavaScript 쿼리 등록
	const tsQueries = getTreeSitterQueries("typescript");
	for (const [queryName, queryString] of Object.entries(tsQueries)) {
		globalTreeSitterQueryEngine.registerQuery(
			"typescript",
			queryName,
			queryString,
		);
		globalTreeSitterQueryEngine.registerQuery("tsx", queryName, queryString);
	}

	const jsQueries = getTreeSitterQueries("javascript");
	for (const [queryName, queryString] of Object.entries(jsQueries)) {
		globalTreeSitterQueryEngine.registerQuery(
			"javascript",
			queryName,
			queryString,
		);
		globalTreeSitterQueryEngine.registerQuery("jsx", queryName, queryString);
	}

	// Java 쿼리 등록
	const javaQueries = getJavaTreeSitterQueries();
	for (const [queryName, queryString] of Object.entries(javaQueries)) {
		globalTreeSitterQueryEngine.registerQuery("java", queryName, queryString);
	}

	// Python 쿼리 등록
	const pythonQueries = getPythonTreeSitterQueries();
	for (const [queryName, queryString] of Object.entries(pythonQueries)) {
		globalTreeSitterQueryEngine.registerQuery("python", queryName, queryString);
	}
}

/**
 * Tree-sitter 파서를 쿼리 엔진에 설정
 * ParserFactory를 통해 파서를 생성하고 TreeSitterQueryEngine에 등록
 */
export function setLanguageParsers(): void {
	try {
		// ParserFactory를 동적으로 import하여 순환 참조 방지
		const { globalParserFactory } = require("../parsers/ParserFactory");

		const supportedLanguages: SupportedLanguage[] = [
			"typescript",
			"tsx",
			"javascript",
			"jsx",
			"java",
			"python",
			"go"
		];

		for (const language of supportedLanguages) {
			try {
				const parser = globalParserFactory.createParser(language);
				if (parser && parser.parser) {
					globalTreeSitterQueryEngine.setParser(language, parser.parser);
				}
			} catch (error) {
				// 파서 생성 실패는 무시 (선택적 언어 지원)
				console.debug(`Parser for ${language} not available:`, error);
			}
		}
	} catch (error) {
		console.warn("Failed to initialize language parsers:", error);
	}
}

/**
 * Query Bridge 초기화 (시스템 시작 시 호출)
 */
export function initializeQueryBridge(): void {
	initializeTreeSitterQueries();
	setLanguageParsers();
	console.log("✅ Query Bridge initialized - Tree-sitter queries registered");
}
