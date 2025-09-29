/**
 * Function Related Result Types
 * 함수 관련 쿼리 결과 타입들
 */

import type { BaseQueryResult } from "../core/types";

/**
 * Function Declaration 분석 결과
 */
export interface FunctionDeclarationResult extends BaseQueryResult {
  queryName: "function-declarations" | "ts-function-declarations" | "js-function-declarations" | "go-function-declarations" | "java-function-declarations";
  functionName: string;
  isExported: boolean;
  isAsync?: boolean; // TypeScript/JavaScript
  isGenerator?: boolean; // TypeScript/JavaScript
  isStatic?: boolean; // Java
  accessModifier?: "public" | "private" | "protected"; // TypeScript/Java
  parameters: Array<{
    name: string;
    type?: string;
    isOptional?: boolean;
    defaultValue?: string;
    isVariadic?: boolean; // Go
  }>;
  returnType?: string;
  receiverType?: string; // Go methods
}

/**
 * Arrow Function 분석 결과 (TypeScript/JavaScript)
 */
export interface ArrowFunctionResult extends BaseQueryResult {
  queryName: "ts-arrow-functions" | "js-arrow-functions";
  isAsync: boolean;
  parameters: Array<{
    name: string;
    type?: string;
    isOptional?: boolean;
    defaultValue?: string;
  }>;
  returnType?: string;
  isExported: boolean;
}

/**
 * Function Call 분석 결과
 */
export interface FunctionCallResult extends BaseQueryResult {
  queryName: "function-calls" | "ts-function-calls" | "js-function-calls" | "go-function-calls" | "java-function-calls";
  functionName: string;
  argumentCount: number;
  isMethodCall: boolean;
  receiver?: string; // 메서드 호출인 경우
  packageName?: string; // Go 패키지 함수 호출
}

/**
 * Lambda Expression 분석 결과 (Java)
 */
export interface LambdaExpressionResult extends BaseQueryResult {
  queryName: "java-lambda-expressions";
  parameters: Array<{
    name: string;
    type?: string;
  }>;
  hasExplicitTypes: boolean;
  isBlock: boolean; // 블록 형태 vs 표현식 형태
}

/**
 * Closure 분석 결과 (Go)
 */
export interface ClosureResult extends BaseQueryResult {
  queryName: "go-closures";
  capturedVariables: string[];
  isAssigned: boolean;
  assignmentTarget?: string;
}