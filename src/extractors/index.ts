/**
 * Import Analysis System - Unified Entry Point
 * Import 분석 시스템 통합 진입점
 *
 * 2단계 분석 아키텍처:
 * 1. Primary Analysis (1차 분석): Tree-sitter 쿼리 기반 원시 데이터 수집
 * 2. Secondary Analysis (2차 분석): 도메인 특화 해석 및 통계 생성
 */

// ========================================
// 1차 분석: Tree-sitter Query Based
// ========================================

// Primary Analysis - Core Exports
export * from "./primary-analysis";

// ========================================
// Legacy Data Extractors
// ========================================

export {
	type ComplexityExtractionResult,
	ComplexityExtractor,
	type ComplexityInfo,
} from "./ComplexityExtractor";

// ===== BUILT-IN EXTRACTORS =====
export {
	type DependencyExtractionResult,
	DependencyExtractor,
	type DependencyInfo,
} from "./DependencyExtractor";
export {
	type EnhancedDependencyExtractionResult,
	EnhancedDependencyExtractor,
	type EnhancedDependencyInfo,
	type UsedMethodInfo,
} from "./EnhancedDependencyExtractor";
export {
	type ClassExportInfo,
	type ClassMethodInfo,
	type ClassPropertyInfo,
	type EnhancedExportExtractionResult,
	EnhancedExportExtractor,
	type ExportMethodInfo,
	type ExportStatistics,
} from "./EnhancedExportExtractor";
// ===== BASE INTERFACE =====
export { IDataExtractor } from "./IDataExtractor";
export {
	type IdentifierExtractionResult,
	IdentifierExtractor,
	type IdentifierInfo,
} from "./IdentifierExtractor";
export {
	type MarkdownLinkDependency,
	type MarkdownLinkExtractionOptions,
	MarkdownLinkExtractor,
} from "./MarkdownLinkExtractor";
