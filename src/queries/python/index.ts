/**
 * Python Queries - Main Export
 * Python 언어별 모든 쿼리들의 통합 익스포트
 */

// ===== EXPORT QUERIES =====
export * from "./exports";
export { default as exportQueries } from "./exports";
// ===== IMPORT QUERIES =====
export * from "./imports";
export { default as importQueries } from "./imports";

import pythonExportQueries from "./exports";
// ===== CONSOLIDATED EXPORT =====
import pythonImportQueries from "./imports";

export const pythonQueries = {
	...pythonImportQueries,
	...pythonExportQueries,
} as const;

export default pythonQueries;

// ===== QUERY REGISTRATION HELPER =====
import type { QueryEngine } from "../../core/QueryEngine";
import type { QueryKey } from "../../core/QueryResultMap";

/**
 * 모든 Python 쿼리를 엔진에 등록
 */
export function registerPythonQueries(engine: QueryEngine): void {
	// Import queries
	Object.entries(pythonImportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});

	// Export queries
	Object.entries(pythonExportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});
}

// ===== PYTHON QUERY KEYS =====
export type PythonQueryKey = keyof typeof pythonQueries;
