/**
 * Base Result Types
 * 모든 쿼리 결과의 기본 타입들
 */

import type { BaseQueryResult } from "../core/types";

// ===== COMMON RESULT TYPES =====

/**
 * Comment 분석 결과
 */
export interface CommentResult extends BaseQueryResult {
  queryName: "comments";
  commentType: "single-line" | "multi-line" | "jsdoc";
  content: string;
  isDocumentation: boolean;
}

/**
 * Identifier 분석 결과
 */
export interface IdentifierResult extends BaseQueryResult {
  queryName: "identifiers";
  name: string;
  context: "declaration" | "reference" | "assignment";
  scope?: string;
}