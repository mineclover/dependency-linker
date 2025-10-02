/**
 * Tree-sitter Query Execution Engine
 * Tree-sitter 쿼리를 실행하여 QueryMatch 객체를 생성하는 엔진
 */

import Parser from "tree-sitter";
import type { QueryMatch, SupportedLanguage } from "./types";

/**
 * Tree-sitter 쿼리 실행 엔진
 */
export class TreeSitterQueryEngine {
	private languageQueries: Map<SupportedLanguage, Map<string, string>> =
		new Map();
	private parsers: Map<SupportedLanguage, Parser> = new Map();

	/**
	 * 언어별 쿼리 등록
	 */
	registerQuery(
		language: SupportedLanguage,
		queryName: string,
		queryString: string,
	): void {
		if (!this.languageQueries.has(language)) {
			this.languageQueries.set(language, new Map());
		}
		this.languageQueries.get(language)?.set(queryName, queryString);
	}

	/**
	 * 언어별 파서 설정
	 */
	setParser(language: SupportedLanguage, parser: Parser): void {
		this.parsers.set(language, parser);
	}

	/**
	 * 단일 쿼리 실행
	 */
	executeQuery(
		queryName: string,
		queryString: string,
		tree: Parser.Tree,
		language: SupportedLanguage,
	): QueryMatch[] {
		try {
			const parser = this.parsers.get(language);
			if (!parser) {
				throw new Error(`No parser available for language: ${language}`);
			}

			// Tree-sitter Query 객체 생성 (올바른 API 사용)
			const parserLanguage = parser.getLanguage();
			const query = new Parser.Query(parserLanguage, queryString);

			// 쿼리 실행
			const captures = query.captures(tree.rootNode);

			// 캡처가 없으면 빈 배열 반환
			if (captures.length === 0) {
				return [];
			}

			// 캡처를 QueryMatch 형태로 변환
			// captures()는 모든 캡처를 평탄화하여 반환하므로
			// 하나의 QueryMatch로 묶음
			const matches: QueryMatch[] = [
				{
					queryName: queryName,
					captures: captures.map((c) => ({
						name: c.name,
						node: c.node,
					})),
				},
			];

			return matches;
		} catch (error) {
			console.warn(`Query execution failed for ${queryName}:`, error);
			return [];
		}
	}

	/**
	 * 언어별 모든 등록된 쿼리 실행
	 */
	executeAllQueries(
		tree: Parser.Tree,
		language: SupportedLanguage,
	): Record<string, QueryMatch[]> {
		const results: Record<string, QueryMatch[]> = {};
		const queries = this.languageQueries.get(language);

		if (!queries) {
			return results;
		}

		for (const [queryName, queryString] of queries) {
			results[queryName] = this.executeQuery(
				queryName,
				queryString,
				tree,
				language,
			);
		}

		return results;
	}

	/**
	 * 특정 쿼리들만 실행
	 */
	executeSelectedQueries(
		queryNames: string[],
		tree: Parser.Tree,
		language: SupportedLanguage,
	): Record<string, QueryMatch[]> {
		const results: Record<string, QueryMatch[]> = {};
		const queries = this.languageQueries.get(language);

		if (!queries) {
			return results;
		}

		for (const queryName of queryNames) {
			const queryString = queries.get(queryName);
			if (queryString) {
				results[queryName] = this.executeQuery(
					queryName,
					queryString,
					tree,
					language,
				);
			}
		}

		return results;
	}

	/**
	 * 등록된 쿼리 목록 조회
	 */
	getRegisteredQueries(language: SupportedLanguage): string[] {
		const queries = this.languageQueries.get(language);
		return queries ? Array.from(queries.keys()) : [];
	}

	/**
	 * 지원되는 언어 목록 조회
	 */
	getSupportedLanguages(): SupportedLanguage[] {
		return Array.from(this.languageQueries.keys());
	}
}

/**
 * 전역 Tree-sitter 쿼리 엔진 인스턴스
 */
export const globalTreeSitterQueryEngine = new TreeSitterQueryEngine();

/**
 * Tree-sitter 쿼리 등록 헬퍼 함수
 */
export function registerTreeSitterQuery(
	language: SupportedLanguage,
	queryName: string,
	queryString: string,
): void {
	globalTreeSitterQueryEngine.registerQuery(language, queryName, queryString);
}

/**
 * Tree-sitter 파서 설정 헬퍼 함수
 */
export function setTreeSitterParser(
	language: SupportedLanguage,
	parser: Parser,
): void {
	globalTreeSitterQueryEngine.setParser(language, parser);
}
