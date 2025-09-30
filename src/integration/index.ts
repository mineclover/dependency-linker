/**
 * Integration Module Index
 * 기존 시스템과 그래프 데이터베이스 통합 모듈
 */

export {
  DependencyToGraph,
  analyzeProjectToGraph,
  analyzeFileToGraph,
} from './DependencyToGraph';

export type {
  IntegrationOptions,
  IntegrationResult,
} from './DependencyToGraph';

// 단일 파일 분석 API
export {
  SingleFileAnalyzer,
  analyzeSingleFile,
  analyzeMultipleFiles,
  SingleFileAnalysisError,
} from './SingleFileAnalysis';

export type {
  SingleFileAnalysisOptions,
  SingleFileAnalysisResult,
} from './SingleFileAnalysis';

// 메인 API에서 사용할 수 있도록 재출력
export { createGraphAnalysisSystem } from '../database';
export type { GraphQueryResult, QueryFilter } from '../database';