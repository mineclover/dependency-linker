/**
 * Database Module Index
 * 그래프 데이터베이스 시스템의 통합 진입점
 */

export { GraphDatabase, createGraphDatabase } from './GraphDatabase';
export { GraphStorage, createGraphStorage } from './GraphStorage';
export { GraphQueryEngine, createGraphQueryEngine } from './GraphQueryEngine';

// Inference module - centralized inference capabilities
export * from './inference';

export type {
  GraphNode,
  GraphRelationship,
  ProjectInfo,
  AnalysisSession,
  GraphQueryOptions,
  DependencyPath,
} from './GraphDatabase';

export type {
  StorageOptions,
  StorageResult,
} from './GraphStorage';

export type {
  GraphEdge,
  EdgeType,
  InferredRelationship,
  QueryFilter,
  GraphQueryResult,
} from './GraphQueryEngine';

/**
 * 통합 그래프 분석 시스템
 */
import { GraphStorage } from './GraphStorage';
import { GraphQueryEngine } from './GraphQueryEngine';

export class GraphAnalysisSystem {
  private storage: GraphStorage;
  private queryEngine: GraphQueryEngine;

  constructor(options: {
    projectRoot: string;
    projectName?: string;
    dbPath?: string;
  }) {
    this.storage = createGraphStorage({
      projectRoot: options.projectRoot,
      projectName: options.projectName,
      dbPath: options.dbPath,
    });

    this.queryEngine = createGraphQueryEngine(this.storage.getDatabase());
  }

  /**
   * 분석 결과 저장
   */
  async store(results: Parameters<GraphStorage['storeAnalysisResults']>[0]) {
    return this.storage.storeAnalysisResults(results);
  }

  /**
   * 그래프 쿼리
   */
  async query(filter?: Parameters<GraphQueryEngine['query']>[0]) {
    return this.queryEngine.query(filter);
  }

  /**
   * 추론 관계 계산
   */
  async computeInferences() {
    return this.queryEngine.computeInferences();
  }

  /**
   * 파일 의존성 조회
   */
  async getFileDependencies(filePath: string) {
    return this.storage.getFileDependencies(filePath);
  }

  /**
   * 순환 의존성 조회
   */
  async getCircularDependencies() {
    return this.storage.getCircularDependencies();
  }

  /**
   * 프로젝트 통계
   */
  async getStats() {
    return this.storage.getProjectStats();
  }

  /**
   * 시스템 종료
   */
  async close() {
    return this.storage.close();
  }
}

/**
 * 그래프 분석 시스템 팩토리
 */
export function createGraphAnalysisSystem(options: {
  projectRoot: string;
  projectName?: string;
  dbPath?: string;
}): GraphAnalysisSystem {
  return new GraphAnalysisSystem(options);
}