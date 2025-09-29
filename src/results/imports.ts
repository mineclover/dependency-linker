/**
 * Import Related Result Types
 * Import 관련 쿼리 결과 타입들
 */

import type { BaseQueryResult } from "../core/types";

/**
 * Import Source 분석 결과
 */
export interface ImportSourceResult extends BaseQueryResult {
  queryName: "import-sources" | "ts-import-sources" | "js-import-sources";
  source: string;
  isRelative: boolean;
  fileExtension?: string;
  importType: "static" | "dynamic";
}

/**
 * Named Import 분석 결과
 */
export interface NamedImportResult extends BaseQueryResult {
  queryName: "named-imports" | "ts-named-imports" | "js-named-imports";
  name: string;
  alias?: string;
  source: string;
  isTypeOnly?: boolean; // TypeScript 전용
}

/**
 * Default Import 분석 결과
 */
export interface DefaultImportResult extends BaseQueryResult {
  queryName: "default-imports" | "ts-default-imports" | "js-default-imports";
  name: string;
  source: string;
}

/**
 * Type Import 분석 결과 (TypeScript 전용)
 */
export interface TypeImportResult extends BaseQueryResult {
  queryName: "type-imports" | "ts-type-imports";
  name: string;
  alias?: string;
  source: string;
  importKind: "type" | "typeof";
}

/**
 * Go Import 분석 결과
 */
export interface GoImportResult extends BaseQueryResult {
  queryName: "go-import-declarations";
  packagePath: string;
  alias?: string;
  isStandard: boolean;
  isLocal: boolean;
}

/**
 * Java Import 분석 결과
 */
export interface JavaImportResult extends BaseQueryResult {
  queryName: "java-import-declarations";
  packageName: string;
  className: string;
  isStatic: boolean;
  isWildcard: boolean;
}