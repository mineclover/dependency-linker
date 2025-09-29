/**
 * Primary Analysis - Query Result Types
 * 1차 분석: Tree-sitter 쿼리 결과 타입 정의
 *
 * 목적: Tree-sitter로 추출한 원시 Import 데이터의 타입 안전성 보장
 */

import type { SourceLocation } from "../../../models/SourceLocation";

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

// ===== 의존성 분석 관련 쿼리 결과 타입들 =====

/**
 * 외부 패키지 의존성 결과
 */
export interface ExternalDependencyResult {
	/** 패키지명 */
	packageName: string;
	/** import된 항목들 */
	importedItems: string[];
	/** import 개수 */
	importCount: number;
	/** dev dependency 여부 */
	isDevDependency?: boolean;
}

/**
 * 내부 모듈 의존성 결과
 */
export interface InternalDependencyResult {
	/** 모듈 경로 */
	modulePath: string;
	/** 해결된 경로 */
	resolvedPath?: string;
	/** import된 항목들 */
	importedItems: string[];
	/** import 개수 */
	importCount: number;
	/** 상대 깊이 */
	relativeDepth: number;
}

/**
 * 의존성 그래프 노드
 */
export interface DependencyGraphNode {
	/** 노드 ID */
	id: string;
	/** 노드 타입 */
	type: "external" | "internal";
	/** 표시명 */
	label: string;
}

/**
 * 의존성 그래프 엣지
 */
export interface DependencyGraphEdge {
	/** 시작 노드 */
	from: string;
	/** 끝 노드 */
	to: string;
	/** 가중치 */
	weight: number;
}

/**
 * 의존성 그래프 구조
 */
export interface DependencyGraph {
	/** 노드들 */
	nodes: DependencyGraphNode[];
	/** 엣지들 */
	edges: DependencyGraphEdge[];
}

// ===== TypeScript 분석 관련 쿼리 결과 타입들 =====

/**
 * 인터페이스 사용 결과
 */
export interface InterfaceUsageResult {
	/** 인터페이스명 */
	interfaceName: string;
	/** 소스 */
	source: string;
	/** 사용 타입 */
	usageType: "extends" | "implements" | "type-annotation";
}

/**
 * 제네릭 타입 사용 결과
 */
export interface GenericTypeResult {
	/** 타입명 */
	typeName: string;
	/** 타입 파라미터들 */
	typeParameters: string[];
	/** 소스 */
	source: string;
}

// ===== 통합 쿼리 결과 타입들 =====

/**
 * 모든 쿼리 결과의 Union 타입 (Import 관련만)
 */
export type QueryResult =
	| ImportSourceResult
	| NamedImportResult
	| DefaultImportResult
	| NamespaceImportResult
	| TypeImportResult;

/**
 * 쿼리별 결과 타입 매핑 (Import 관련만)
 */
export interface QueryResultMapping {
	"import-sources": ImportSourceResult[];
	"named-imports": NamedImportResult[];
	"default-imports": DefaultImportResult[];
	"namespace-imports": NamespaceImportResult[];
	"type-imports": TypeImportResult[];
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
 * 전체 쿼리 분석 결과 (Import 관련만)
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
 * 타입 안전한 쿼리 정의 인터페이스
 */
export interface TypedQueryDefinition<T extends keyof QueryResultMapping> {
	name: string;
	description: string;
	query: string;
	processor: (matches: any[], context: any, collector: any) => void;
	languages: string[];
	resultType: T;
	priority: number;
	enabled: boolean;
}

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
