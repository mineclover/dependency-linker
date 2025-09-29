/**
 * Query Results Type Definitions
 * 각 쿼리별 예상 출력값 타입 정의
 */

import type { SourceLocation } from "../models/SourceLocation";

/**
 * 확장된 소스 위치 정보 (시작과 끝 포함)
 */
export interface ExtendedSourceLocation extends SourceLocation {
	/** 종료 라인 번호 (1-indexed) */
	endLine: number;
	/** 종료 컬럼 번호 (0-indexed) */
	endColumn: number;
	/** 종료 바이트 오프셋 */
	endOffset: number;
}

/**
 * 기본 쿼리 결과 인터페이스
 */
export interface BaseQueryResult {
	/** 쿼리 이름 */
	queryName: string;
	/** 발견된 위치 정보 */
	location: ExtendedSourceLocation;
	/** 원본 AST 노드 텍스트 */
	nodeText: string;
}

// ===== Import 분석 쿼리 결과 타입들 =====

/**
 * Import Sources 쿼리 결과
 * 모든 import된 소스(파일/라이브러리) 수집
 */
export interface ImportSourceResult extends BaseQueryResult {
	/** 소스 경로 또는 패키지명 */
	source: string;
	/** 상대경로인지 여부 */
	isRelative: boolean;
	/** 패키지인지 로컬 파일인지 */
	type: "package" | "local";
}

/**
 * Named Imports 쿼리 결과
 * { useState, useEffect } 형태의 named import 수집
 */
export interface NamedImportResult extends BaseQueryResult {
	/** import된 식별자명 */
	name: string;
	/** 소스 경로 */
	source: string;
	/** 별칭 (as alias) */
	alias?: string;
	/** 원본 이름 */
	originalName: string;
}

/**
 * Default Imports 쿼리 결과
 * import React from 'react' 형태의 default import 수집
 */
export interface DefaultImportResult extends BaseQueryResult {
	/** default import된 식별자명 */
	name: string;
	/** 소스 경로 */
	source: string;
}

/**
 * Namespace Imports 쿼리 결과
 * import * as utils from './utils' 형태의 namespace import 수집
 */
export interface NamespaceImportResult extends BaseQueryResult {
	/** namespace 별칭 */
	alias: string;
	/** 소스 경로 */
	source: string;
}

/**
 * Type Imports 쿼리 결과 (TypeScript 전용)
 * import type { FC } from 'react' 형태의 타입 import 수집
 */
export interface TypeImportResult extends BaseQueryResult {
	/** 타입명 */
	typeName: string;
	/** 소스 경로 */
	source: string;
	/** 별칭 */
	alias?: string;
	/** named type인지 default type인지 */
	importType: "named" | "default" | "namespace";
}

// ===== Usage 분석 쿼리 결과 타입들 =====

/**
 * Function Calls 쿼리 결과
 * 모든 함수 호출 패턴 분석
 */
export interface FunctionCallResult extends BaseQueryResult {
	/** 호출된 함수명 */
	functionName: string;
	/** 함수의 소스 (import된 경우) */
	source?: string;
	/** 호출 인자들 */
	arguments: string[];
	/** 호출 컨텍스트 (어디서 호출되었는지) */
	context: "global" | "component" | "useEffect" | "event_handler" | "other";
}

/**
 * Property Access 쿼리 결과
 * object.property 형태의 속성 접근 분석
 */
export interface PropertyAccessResult extends BaseQueryResult {
	/** 객체명 */
	objectName: string;
	/** 속성명 */
	propertyName: string;
	/** 객체의 소스 */
	source?: string;
	/** 접근 타입 */
	accessType: "read" | "write" | "call";
	/** 체이닝 여부 */
	isChained: boolean;
}

/**
 * Method Chaining 쿼리 결과
 * object.method().anotherMethod() 형태의 메서드 체이닝 분석
 */
export interface MethodChainingResult extends BaseQueryResult {
	/** 체인의 루트 객체 */
	rootObject: string;
	/** 메서드 호출 체인 */
	methodChain: Array<{
		methodName: string;
		arguments: string[];
	}>;
	/** 체인 길이 */
	chainLength: number;
	/** 루트 객체의 소스 */
	source?: string;
}

/**
 * React Hooks 쿼리 결과
 * useState, useEffect 등 React Hook 사용 분석
 */
export interface ReactHookResult extends BaseQueryResult {
	/** Hook 이름 */
	hookName: string;
	/** Hook 소스 */
	source: string;
	/** Hook 인자들 */
	arguments: string[];
	/** Hook 타입 분류 */
	hookType:
		| "state"
		| "effect"
		| "context"
		| "ref"
		| "memo"
		| "callback"
		| "custom"
		| "other";
	/** 의존성 배열 (useEffect, useMemo 등) */
	dependencies?: string[];
}

/**
 * Destructuring 쿼리 결과
 * const { foo, bar } = object 형태의 구조분해할당 분석
 */
export interface DestructuringResult extends BaseQueryResult {
	/** 추출된 변수들 */
	extractedVariables: Array<{
		name: string;
		alias?: string;
	}>;
	/** 소스 객체 */
	sourceObject: string;
	/** 소스 객체의 import 정보 */
	source?: string;
	/** 구조분해 타입 */
	destructureType: "object" | "array";
}

// ===== JSX 분석 쿼리 결과 타입들 =====

/**
 * JSX Components 쿼리 결과
 * <Component> 형태의 JSX 컴포넌트 사용 분석
 */
export interface JSXComponentResult extends BaseQueryResult {
	/** 컴포넌트명 */
	componentName: string;
	/** 컴포넌트 소스 */
	source?: string;
	/** 자식 요소 개수 */
	childrenCount: number;
	/** self-closing인지 여부 */
	isSelfClosing: boolean;
	/** 조건부 렌더링인지 여부 */
	isConditional: boolean;
}

/**
 * JSX Props 쿼리 결과
 * <Component prop="value" /> 형태의 JSX props 분석
 */
export interface JSXPropsResult extends BaseQueryResult {
	/** 컴포넌트명 */
	componentName: string;
	/** prop 이름 */
	propName: string;
	/** prop 값 */
	propValue: string;
	/** prop 타입 */
	propType:
		| "string"
		| "number"
		| "boolean"
		| "expression"
		| "function"
		| "object";
	/** 동적 값인지 여부 */
	isDynamic: boolean;
}

// ===== 통합 쿼리 결과 타입들 =====

/**
 * 모든 쿼리 결과의 Union 타입
 */
export type QueryResult =
	| ImportSourceResult
	| NamedImportResult
	| DefaultImportResult
	| NamespaceImportResult
	| TypeImportResult
	| FunctionCallResult
	| PropertyAccessResult
	| MethodChainingResult
	| ReactHookResult
	| DestructuringResult
	| JSXComponentResult
	| JSXPropsResult;

/**
 * 쿼리별 결과 타입 매핑
 */
export interface QueryResultMapping {
	"import-sources": ImportSourceResult[];
	"named-imports": NamedImportResult[];
	"default-imports": DefaultImportResult[];
	"namespace-imports": NamespaceImportResult[];
	"type-imports": TypeImportResult[];
	"function-calls": FunctionCallResult[];
	"property-access": PropertyAccessResult[];
	"method-chaining": MethodChainingResult[];
	"react-hooks": ReactHookResult[];
	destructuring: DestructuringResult[];
	"jsx-components": JSXComponentResult[];
	"jsx-props": JSXPropsResult[];
}

/**
 * 쿼리 실행 결과 컨테이너
 */
export interface QueryExecutionResult<
	T extends keyof QueryResultMapping = keyof QueryResultMapping,
> {
	/** 쿼리 이름 */
	queryName: T;
	/** 실행 성공 여부 */
	success: boolean;
	/** 결과 데이터 */
	results: QueryResultMapping[T];
	/** 실행 시간 (ms) */
	executionTime: number;
	/** 에러 정보 (실패 시) */
	error?: string;
	/** 매치된 노드 수 */
	nodeCount: number;
}

/**
 * 전체 쿼리 분석 결과
 */
export interface ComprehensiveQueryResult {
	/** 파일 경로 */
	filePath: string;
	/** 분석 시작 시간 */
	timestamp: string;
	/** 전체 실행 시간 */
	totalExecutionTime: number;

	/** Import 쿼리 결과들 */
	imports: {
		sources: QueryExecutionResult<"import-sources">;
		named: QueryExecutionResult<"named-imports">;
		defaults: QueryExecutionResult<"default-imports">;
		namespaces: QueryExecutionResult<"namespace-imports">;
		types: QueryExecutionResult<"type-imports">;
	};

	/** Usage 쿼리 결과들 */
	usage: {
		functionCalls: QueryExecutionResult<"function-calls">;
		propertyAccess: QueryExecutionResult<"property-access">;
		methodChaining: QueryExecutionResult<"method-chaining">;
		reactHooks: QueryExecutionResult<"react-hooks">;
		destructuring: QueryExecutionResult<"destructuring">;
	};

	/** JSX 쿼리 결과들 */
	jsx: {
		components: QueryExecutionResult<"jsx-components">;
		props: QueryExecutionResult<"jsx-props">;
	};

	/** 요약 통계 */
	summary: {
		totalQueries: number;
		successfulQueries: number;
		failedQueries: number;
		totalNodes: number;
		avgExecutionTime: number;
	};
}

// ===== 유틸리티 타입들 =====

/**
 * 쿼리 결과 검증을 위한 타입 가드
 */
export type QueryResultTypeGuard<T extends QueryResult> = (
	result: QueryResult,
) => result is T;

/**
 * 쿼리 결과 변환 함수 타입
 */
export type QueryResultTransformer<TInput extends QueryResult, TOutput> = (
	input: TInput,
) => TOutput;

/**
 * 쿼리 결과 필터 함수 타입
 */
export type QueryResultFilter<T extends QueryResult> = (result: T) => boolean;

/**
 * 쿼리 결과 집계 함수 타입
 */
export type QueryResultAggregator<T extends QueryResult, TResult> = (
	results: T[],
) => TResult;
