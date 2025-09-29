/**
 * Java Queries - Main Export
 * Java 언어별 모든 쿼리들의 통합 익스포트
 */

// ===== EXPORT QUERIES =====
export * from "./exports";
export { default as exportQueries } from "./exports";
// ===== IMPORT QUERIES =====
export * from "./imports";
export { default as importQueries } from "./imports";

import javaExportQueries from "./exports";
// ===== CONSOLIDATED EXPORT =====
import javaImportQueries from "./imports";

export const javaQueries = {
	...javaImportQueries,
	...javaExportQueries,
} as const;

export default javaQueries;

// ===== QUERY REGISTRATION HELPER =====
import type { QueryEngine } from "../../core/QueryEngine";
import type { QueryKey } from "../../core/QueryResultMap";

/**
 * 모든 Java 쿼리를 엔진에 등록
 */
export function registerJavaQueries(engine: QueryEngine): void {
	// Import queries
	Object.entries(javaImportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});

	// Export queries
	Object.entries(javaExportQueries).forEach(([key, query]) => {
		engine.register(key as QueryKey, query);
	});
}

// ===== JAVA QUERY KEYS =====
export type JavaQueryKey = keyof typeof javaQueries;
