/**
 * Export Related Result Types
 * Export 관련 쿼리 결과 타입들
 */

import type { BaseQueryResult } from "../core/types";

/**
 * Export Declaration 분석 결과
 */
export interface ExportDeclarationResult extends BaseQueryResult {
  queryName: "export-declarations" | "ts-export-declarations" | "js-export-declarations";
  exportType: "named" | "default" | "namespace" | "re-export";
  exportName: string;
  isDefault: boolean;
  source?: string; // re-export인 경우
  localName?: string; // 로컬 이름이 다른 경우
}

/**
 * Export Assignment 분석 결과 (TypeScript 전용)
 */
export interface ExportAssignmentResult extends BaseQueryResult {
  queryName: "ts-export-assignments";
  expression: string;
  isDefault: boolean;
}

/**
 * Go Export 분석 결과 (대문자로 시작하는 식별자)
 */
export interface GoExportResult extends BaseQueryResult {
  queryName: "go-exports";
  name: string;
  exportType: "function" | "variable" | "constant" | "type" | "struct" | "interface";
  isPublic: boolean;
}

/**
 * Java Export 분석 결과 (public 멤버)
 */
export interface JavaExportResult extends BaseQueryResult {
  queryName: "java-exports";
  name: string;
  exportType: "class" | "interface" | "enum" | "method" | "field";
  visibility: "public" | "protected" | "package";
  isStatic: boolean;
}