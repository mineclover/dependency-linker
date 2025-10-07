/**
 * TypeScript Queries - Main Export
 * TypeScript 언어별 모든 쿼리들의 통합 익스포트
 */

// ===== EXPORT QUERIES =====
export * from "./exports";
export { default as exportQueries } from "./exports";
// ===== IMPORT QUERIES =====
export * from "./imports";
export { default as importQueries } from "./imports";
// ===== CLASS QUERIES =====
export * from "./classes";
export { default as classQueries } from "./classes";

import typeScriptExportQueries from "./exports";
// ===== CONSOLIDATED EXPORT =====
import typeScriptImportQueries from "./imports";
import typeScriptClassQueries from "./classes";

export const typeScriptQueries = {
	...typeScriptImportQueries,
	...typeScriptExportQueries,
	...typeScriptClassQueries,
} as const;

export default typeScriptQueries;

// ===== QUERY REGISTRATION HELPER =====
import type { QueryEngine } from "../../core/QueryEngine";
import type { QueryKey } from "../../core/QueryResultMap";

/**
 * 모든 TypeScript 쿼리를 엔진에 등록
 */
export function registerTypeScriptQueries(engine: QueryEngine): void {
	// Import queries
	Object.entries(typeScriptImportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});

	// Export queries
	Object.entries(typeScriptExportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});

	// Class queries
	Object.entries(typeScriptClassQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});
}

// ===== TYPESCRIPT QUERY KEYS =====
export type TypeScriptQueryKey = keyof typeof typeScriptQueries;
