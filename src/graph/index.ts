/**
 * Dependency Graph Analysis Module
 * 의존성 그래프 분석 모듈의 메인 익스포트
 */

// Types
export type {
	FileDependency,
	DependencyNode,
	DependencyEdge,
	DependencyGraph,
	PathResolutionOptions,
	PathResolutionResult,
	GraphAnalysisResult,
	GraphBuildOptions,
	GraphBuildResult,
} from "./types";

// Path Resolution
export {
	PathResolver,
	createPathResolver,
	resolvePath,
} from "./PathResolver";

// Graph Building
export {
	DependencyGraphBuilder,
	createDependencyGraphBuilder,
	buildDependencyGraph,
} from "./DependencyGraphBuilder";

// Graph Analysis
export {
	GraphAnalyzer,
	createGraphAnalyzer,
	analyzeGraph,
} from "./GraphAnalyzer";

// High-level API
export {
	createDependencyAnalyzer,
	analyzeDependencyGraph,
} from "./api";