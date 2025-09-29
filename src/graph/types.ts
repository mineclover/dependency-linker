/**
 * Dependency Graph Analysis Types
 * 의존성 그래프 분석을 위한 타입 정의
 */

import type { SupportedLanguage } from "../core/types";

// ===== DEPENDENCY GRAPH TYPES =====

/**
 * 단일 파일의 의존성 정보
 */
export interface FileDependency {
	/** 파일의 절대 경로 */
	filePath: string;
	/** 파일의 언어 */
	language: SupportedLanguage;
	/** 직접 의존성 (import statements) */
	directDependencies: string[];
	/** 내부 의존성 (프로젝트 내 파일들) */
	internalDependencies: string[];
	/** 외부 의존성 (npm packages) */
	externalDependencies: string[];
	/** 내장 모듈 의존성 (built-in modules) */
	builtinDependencies: string[];
	/** 분석 타임스탬프 */
	analyzedAt: Date;
	/** 파일 존재 여부 */
	exists: boolean;
}

/**
 * 의존성 그래프 노드
 */
export interface DependencyNode {
	/** 노드 ID (절대 경로) */
	id: string;
	/** 파일 경로 */
	filePath: string;
	/** 파일 언어 */
	language?: SupportedLanguage;
	/** 노드 타입 */
	type: "internal" | "external" | "builtin" | "missing";
	/** 파일 존재 여부 */
	exists: boolean;
	/** 의존성 정보 (internal 타입인 경우) */
	dependency?: FileDependency;
}

/**
 * 의존성 그래프 엣지
 */
export interface DependencyEdge {
	/** 시작 노드 (의존하는 파일) */
	from: string;
	/** 끝 노드 (의존되는 파일) */
	to: string;
	/** 의존성 타입 */
	type: "import" | "export" | "dynamic";
	/** Import statement 원본 텍스트 */
	importStatement?: string;
	/** Import 라인 번호 */
	lineNumber?: number;
}

/**
 * 의존성 그래프
 */
export interface DependencyGraph {
	/** 프로젝트 루트 경로 */
	projectRoot: string;
	/** 노드 맵 (id -> node) */
	nodes: Map<string, DependencyNode>;
	/** 엣지 배열 */
	edges: DependencyEdge[];
	/** 분석 메타데이터 */
	metadata: {
		totalFiles: number;
		analyzedFiles: number;
		totalDependencies: number;
		circularDependencies: string[][];
		unresolvedDependencies: string[];
		createdAt: Date;
		analysisTime: number;
	};
}

// ===== PATH RESOLUTION TYPES =====

/**
 * 경로 해결 옵션
 */
export interface PathResolutionOptions {
	/** 프로젝트 루트 경로 */
	projectRoot: string;
	/** 베이스 경로 (현재 파일 위치) */
	basePath: string;
	/** 파일 확장자 해결 순서 */
	extensions?: string[];
	/** alias 매핑 (예: @ -> src) */
	aliasMap?: Record<string, string>;
	/** tsconfig 경로 매핑 고려 여부 */
	useTsConfig?: boolean;
}

/**
 * 경로 해결 결과
 */
export interface PathResolutionResult {
	/** 해결된 절대 경로 */
	resolvedPath: string;
	/** 원본 import 경로 */
	originalPath: string;
	/** 해결 타입 */
	resolutionType: "relative" | "absolute" | "alias" | "external" | "builtin";
	/** 파일 존재 여부 */
	exists: boolean;
	/** 사용된 확장자 */
	extension?: string;
}

// ===== GRAPH ANALYSIS TYPES =====

/**
 * 그래프 분석 결과
 */
export interface GraphAnalysisResult {
	/** 순환 의존성 */
	circularDependencies: {
		cycles: string[][];
		totalCycles: number;
		maxDepth: number;
	};
	/** 의존성 깊이 분석 */
	dependencyDepth: {
		maxDepth: number;
		averageDepth: number;
		depthDistribution: Record<number, number>;
	};
	/** 허브 파일 (많이 의존되는 파일) */
	hubFiles: Array<{
		filePath: string;
		incomingDependencies: number;
		outgoingDependencies: number;
		hubScore: number;
	}>;
	/** 고립된 파일 */
	isolatedFiles: string[];
	/** 미해결 의존성 */
	unresolvedDependencies: Array<{
		from: string;
		to: string;
		originalImport: string;
	}>;
}

// ===== BUILD OPTIONS =====

/**
 * 그래프 빌드 옵션
 */
export interface GraphBuildOptions {
	/** 프로젝트 루트 경로 */
	projectRoot: string;
	/** 진입점 파일들 */
	entryPoints: string[];
	/** 분석할 파일 패턴 (glob) */
	includePatterns?: string[];
	/** 제외할 파일 패턴 (glob) */
	excludePatterns?: string[];
	/** 최대 분석 깊이 */
	maxDepth?: number;
	/** 외부 의존성 포함 여부 */
	includeExternalDependencies?: boolean;
	/** 경로 해결 옵션 */
	pathResolution?: Partial<PathResolutionOptions>;
	/** 병렬 처리 여부 */
	parallel?: boolean;
	/** 진행 상황 콜백 */
	onProgress?: (current: number, total: number, currentFile: string) => void;
}

/**
 * 그래프 빌드 결과
 */
export interface GraphBuildResult {
	/** 생성된 의존성 그래프 */
	graph: DependencyGraph;
	/** 분석 결과 */
	analysis: GraphAnalysisResult;
	/** 처리된 파일 수 */
	processedFiles: number;
	/** 처리 시간 (ms) */
	processingTime: number;
	/** 에러 로그 */
	errors: Array<{
		filePath: string;
		error: string;
		type: "parse" | "resolve" | "analysis";
	}>;
}