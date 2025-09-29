/**
 * Inference Types
 * Type-safe definitions for relationship inference system
 */

/**
 * 추론된 관계의 타입
 */
export type InferredRelationType = 'hierarchical' | 'transitive' | 'inheritable';

/**
 * 추론 경로 정보
 */
export interface InferencePath {
  /** 경로를 구성하는 직접 관계 ID들 */
  edgeIds: number[];
  /** 경로의 깊이 (1 = 직접 관계, >1 = 추론된 관계) */
  depth: number;
  /** 추론 타입 */
  inferenceType: InferredRelationType;
  /** 경로 설명 (A → B → C) */
  description: string;
}

/**
 * 추론된 관계 정보
 */
export interface InferredRelationship {
  /** 시작 노드 ID */
  fromNodeId: number;
  /** 종료 노드 ID */
  toNodeId: number;
  /** 추론된 관계 타입 */
  type: string;
  /** 추론 경로 */
  path: InferencePath;
  /** 추론 시점 */
  inferredAt: Date;
  /** 출처 파일 (경로 상 첫 번째 edge의 source_file) */
  sourceFile: string;
}

/**
 * 계층적 추론 쿼리 옵션
 */
export interface HierarchicalQueryOptions {
  /** 자식 타입들을 포함할지 여부 (기본: true) */
  includeChildren?: boolean;
  /** 부모 타입들을 포함할지 여부 (기본: false) */
  includeParents?: boolean;
  /** 최대 계층 깊이 (기본: 무제한) */
  maxDepth?: number;
}

/**
 * 전이적 추론 쿼리 옵션
 */
export interface TransitiveQueryOptions {
  /** 최대 경로 길이 (기본: 10) */
  maxPathLength?: number;
  /** 순환 참조 감지 (기본: true) */
  detectCycles?: boolean;
  /** 관계 타입 필터 (지정된 타입만 전이 적용) */
  relationshipTypes?: string[];
}

/**
 * 상속 가능 추론 쿼리 옵션
 */
export interface InheritableQueryOptions {
  /** 부모 관계 타입 (contains, declares 등) */
  parentRelationshipType?: string;
  /** 상속할 관계 타입들 */
  inheritableTypes?: string[];
  /** 최대 상속 깊이 (기본: 무제한) */
  maxInheritanceDepth?: number;
}

/**
 * 추론 캐시 항목
 */
export interface InferenceCacheEntry {
  /** 캐시 ID */
  id?: number;
  /** 시작 노드 ID */
  startNodeId: number;
  /** 종료 노드 ID */
  endNodeId: number;
  /** 추론된 타입 */
  inferredType: string;
  /** 추론 경로 (JSON) */
  edgePath: string;
  /** 경로 깊이 */
  depth: number;
  /** 계산 시점 */
  computedAt: Date;
}

/**
 * 추론 통계
 */
export interface InferenceStatistics {
  /** 직접 관계 수 */
  directRelationships: number;
  /** 추론된 관계 수 (타입별) */
  inferredByType: Record<InferredRelationType, number>;
  /** 캐시된 추론 수 */
  cachedInferences: number;
  /** 평균 추론 깊이 */
  averageDepth: number;
  /** 최대 추론 깊이 */
  maxDepth: number;
}

/**
 * 추론 엔진 설정
 */
export interface InferenceEngineConfig {
  /** 자동 캐시 활성화 (기본: true) */
  enableCache?: boolean;
  /** 캐시 동기화 전략 */
  cacheSyncStrategy?: 'eager' | 'lazy' | 'manual';
  /** 기본 최대 경로 길이 (기본: 10) */
  defaultMaxPathLength?: number;
  /** 기본 최대 계층 깊이 (기본: 무제한) */
  defaultMaxHierarchyDepth?: number;
  /** 순환 참조 감지 활성화 (기본: true) */
  enableCycleDetection?: boolean;
}

/**
 * 추론 결과
 */
export interface InferenceResult {
  /** 추론된 관계들 */
  inferences: InferredRelationship[];
  /** 추론 통계 */
  statistics: InferenceStatistics;
  /** 실행 시간 (ms) */
  executionTime: number;
}

/**
 * Edge Type 추론 규칙
 */
export interface EdgeTypeInferenceRule {
  /** Edge type */
  type: string;
  /** Hierarchical 추론: 부모 타입 */
  parentType?: string;
  /** Transitive 추론 가능 여부 */
  isTransitive: boolean;
  /** Inheritable 추론 가능 여부 */
  isInheritable: boolean;
  /** 우선순위 */
  priority: number;
}

/**
 * 추론 검증 결과
 */
export interface InferenceValidationResult {
  /** 검증 성공 여부 */
  valid: boolean;
  /** 검증 오류 메시지 */
  errors: string[];
  /** 경고 메시지 */
  warnings: string[];
  /** 검증된 추론 수 */
  validatedCount: number;
}