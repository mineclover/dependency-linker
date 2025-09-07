/**
 * Dependencies Infrastructure - Index
 * 의존성 분석 인프라스트럭처 계층의 통합 export
 */

export { 
  DependencyAnalyzer, 
  createDependencyAnalyzer,
  type ImportStatement,
  type ImportSpecifier,
  type FileDependency,
  type LegacyDependencyGraph,
  type FileNode,
  type ExportStatement
} from './analyzer.js';

// 레거시 호환성을 위한 통합 export
export {
  DependencyAnalyzer
} from './analyzer.js';