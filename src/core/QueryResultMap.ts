/**
 * Central Query Result Map Management
 * QueryResultMap의 중앙 관리 시스템
 */

import type {
  UnifiedQueryResultMap,
  TypeScriptQueryResultMap,
  JavaScriptQueryResultMap,
  GoQueryResultMap,
  JavaQueryResultMap,
  QueryKey,
  LanguageGroup,
  LanguageQueryKey,
} from "../results";
import type { BaseQueryResult } from "./types";

// ===== MAIN QUERY RESULT MAP =====
export type { UnifiedQueryResultMap as QueryResultMap };
export type { QueryKey };

// ===== LANGUAGE-SPECIFIC MAPS =====
export type { TypeScriptQueryResultMap };
export type { JavaScriptQueryResultMap };
export type { GoQueryResultMap };
export type { JavaQueryResultMap };

// ===== TYPE UTILITIES =====
export type QueryResult<K extends QueryKey> = UnifiedQueryResultMap[K];

export type LanguageSpecificQueryKey<L extends LanguageGroup> = LanguageQueryKey<L>;

export type LanguageSpecificQueryResult<L extends LanguageGroup, K extends LanguageSpecificQueryKey<L>> =
  L extends "typescript" ? K extends keyof TypeScriptQueryResultMap ? TypeScriptQueryResultMap[K] : never :
  L extends "javascript" ? K extends keyof JavaScriptQueryResultMap ? JavaScriptQueryResultMap[K] : never :
  L extends "go" ? K extends keyof GoQueryResultMap ? GoQueryResultMap[K] : never :
  K extends keyof JavaQueryResultMap ? JavaQueryResultMap[K] : never;

// ===== VALIDATION TYPES =====
export type ValidateQueryResultMap<T extends Record<string, BaseQueryResult>> = {
  [K in keyof T]: T[K] extends { queryName: K } ? T[K] : never;
};

export type ValidatedQueryResultMap = {
  [K in keyof UnifiedQueryResultMap]: UnifiedQueryResultMap[K] extends { queryName: K } ? UnifiedQueryResultMap[K] : never;
};

// ===== QUERY KEY FILTERING =====
export type ImportQueryKeys = Extract<QueryKey, `${string}import${string}`>;
export type ExportQueryKeys = Extract<QueryKey, `${string}export${string}`>;
export type ClassQueryKeys = Extract<QueryKey, `${string}class${string}` | `${string}interface${string}` | `${string}enum${string}` | `${string}struct${string}`>;
export type FunctionQueryKeys = Extract<QueryKey, `${string}function${string}` | `${string}method${string}` | `${string}arrow${string}` | `${string}lambda${string}` | `${string}closure${string}`>;

export type LanguageQueryKeys<L extends LanguageGroup> = Extract<QueryKey, `${L}-${string}`>;

// ===== RUNTIME UTILITIES =====

/**
 * 쿼리 키가 특정 언어에 속하는지 확인
 */
export function isLanguageQueryKey<L extends LanguageGroup>(
  queryKey: QueryKey,
  language: L
): queryKey is LanguageQueryKeys<L> {
  return queryKey.startsWith(`${language}-`);
}

/**
 * 쿼리 키에서 언어를 추출
 */
export function extractLanguageFromQueryKey(queryKey: QueryKey): LanguageGroup | "common" {
  const parts = queryKey.split("-");
  const language = parts[0];

  if (["typescript", "javascript", "go", "java"].includes(language)) {
    return language as LanguageGroup;
  }

  return "common";
}

/**
 * 언어별 쿼리 키 필터링
 */
export function filterQueryKeysByLanguage<L extends LanguageGroup>(
  queryKeys: QueryKey[],
  language: L
): LanguageQueryKeys<L>[] {
  return queryKeys.filter((key): key is LanguageQueryKeys<L> =>
    isLanguageQueryKey(key, language)
  );
}

/**
 * 모든 언어의 쿼리 키를 언어별로 그룹화
 */
export function groupQueryKeysByLanguage(queryKeys: QueryKey[]): Record<LanguageGroup | "common", QueryKey[]> {
  const groups: Record<LanguageGroup | "common", QueryKey[]> = {
    typescript: [],
    javascript: [],
    go: [],
    java: [],
    common: [],
  };

  for (const key of queryKeys) {
    const language = extractLanguageFromQueryKey(key);
    groups[language].push(key);
  }

  return groups;
}

// ===== CONSTANTS =====
export const ALL_LANGUAGE_GROUPS: LanguageGroup[] = ["typescript", "javascript", "go", "java"];

export const COMMON_QUERY_KEYS: (keyof import("../results").BaseQueryResultMap)[] = [
  "comments",
  "identifiers",
];

export const IMPORT_QUERY_PATTERN = /^(ts|js|go|java)-?.*import/;
export const EXPORT_QUERY_PATTERN = /^(ts|js|go|java)-?.*export/;
export const CLASS_QUERY_PATTERN = /^(ts|js|go|java)-?.*(class|interface|enum|struct)/;
export const FUNCTION_QUERY_PATTERN = /^(ts|js|go|java)-?.*(function|method|arrow|lambda|closure)/;