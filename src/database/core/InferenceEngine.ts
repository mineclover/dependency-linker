/**
 * InferenceEngine
 *
 * Hierarchical, Transitive, Inheritable 관계 추론 엔진
 * SQL Recursive CTE 기반 추론 + 타입 안전 캐시 관리
 */

import { GraphDatabase } from '../GraphDatabase';
import { EdgeTypeRegistry } from '../types/EdgeTypeRegistry';
import {
  InferredRelationship,
  InferencePath,
  HierarchicalQueryOptions,
  TransitiveQueryOptions,
  InheritableQueryOptions,
  InferenceEngineConfig,
  InferenceResult,
  InferenceStatistics,
  InferenceCacheEntry,
  InferenceValidationResult,
} from '../types/InferenceTypes';

export class InferenceEngine {
  private database: GraphDatabase;
  private config: Required<InferenceEngineConfig>;

  constructor(database: GraphDatabase, config?: InferenceEngineConfig) {
    this.database = database;
    this.config = {
      enableCache: config?.enableCache ?? true,
      cacheSyncStrategy: config?.cacheSyncStrategy ?? 'lazy',
      defaultMaxPathLength: config?.defaultMaxPathLength ?? 10,
      defaultMaxHierarchyDepth: config?.defaultMaxHierarchyDepth ?? Infinity,
      enableCycleDetection: config?.enableCycleDetection ?? true,
    };
  }

  /**
   * Hierarchical 추론: 자식 타입들을 부모 타입으로 조회
   *
   * @example
   * // imports_library, imports_file 관계를 'imports'로 조회
   * const allImports = await engine.queryHierarchical('imports', { includeChildren: true });
   */
  async queryHierarchical(
    edgeType: string,
    options: HierarchicalQueryOptions = {}
  ): Promise<InferredRelationship[]> {
    const {
      includeChildren = true,
      includeParents = false,
      maxDepth = this.config.defaultMaxHierarchyDepth,
    } = options;

    const startTime = Date.now();
    const inferences: InferredRelationship[] = [];

    // Edge type 정의 가져오기
    const edgeTypeDef = EdgeTypeRegistry.get(edgeType);
    if (!edgeTypeDef) {
      throw new Error(`Edge type not found: ${edgeType}`);
    }

    const relatedTypes = new Set<string>([edgeType]);

    // 자식 타입들 수집
    if (includeChildren) {
      const children = this.getChildTypes(edgeType, maxDepth);
      children.forEach(type => relatedTypes.add(type));
    }

    // 부모 타입들 수집
    if (includeParents) {
      const parents = EdgeTypeRegistry.getHierarchyPath(edgeType);
      parents.forEach(type => relatedTypes.add(type));
    }

    // 모든 관련 타입의 관계 조회
    const relationships = await this.database.findRelationships({
      relationshipTypes: Array.from(relatedTypes),
    });

    // 추론 결과 생성
    for (const rel of relationships) {
      const inferenceType = rel.type === edgeType ? 'hierarchical' : 'hierarchical';
      const depth = this.calculateHierarchyDepth(rel.type, edgeType);

      inferences.push({
        fromNodeId: rel.fromNodeId,
        toNodeId: rel.toNodeId,
        type: edgeType, // 요청된 타입으로 정규화
        path: {
          edgeIds: [rel.id!],
          depth,
          inferenceType,
          description: `${rel.type} → ${edgeType}`,
        },
        inferredAt: new Date(),
        sourceFile: rel.sourceFile,
      });
    }

    return inferences;
  }

  /**
   * Transitive 추론: A→B, B→C ⇒ A→C
   *
   * @example
   * // depends_on 관계의 전이적 의존성 추론
   * const transitive = await engine.queryTransitive(nodeId, 'depends_on');
   */
  async queryTransitive(
    fromNodeId: number,
    edgeType: string,
    options: TransitiveQueryOptions = {}
  ): Promise<InferredRelationship[]> {
    const {
      maxPathLength = this.config.defaultMaxPathLength,
      detectCycles = this.config.enableCycleDetection,
      relationshipTypes = [edgeType],
    } = options;

    // Edge type이 transitive인지 확인
    const edgeTypeDef = EdgeTypeRegistry.get(edgeType);
    if (!edgeTypeDef?.isTransitive) {
      throw new Error(`Edge type '${edgeType}' is not transitive`);
    }

    const inferences: InferredRelationship[] = [];

    // SQL Recursive CTE로 전이적 관계 추론
    const sql = `
      WITH RECURSIVE transitive_paths AS (
        -- Base case: 직접 관계
        SELECT
          e.id as edge_id,
          e.start_node_id as from_node,
          e.end_node_id as to_node,
          e.type,
          e.source_file,
          1 as depth,
          CAST(e.id AS TEXT) as path,
          CAST(e.start_node_id AS TEXT) as visited_nodes
        FROM edges e
        WHERE e.start_node_id = ?
          AND e.type IN (${relationshipTypes.map(() => '?').join(', ')})

        UNION ALL

        -- Recursive case: 간접 관계
        SELECT
          e.id,
          tp.from_node,
          e.end_node_id,
          e.type,
          e.source_file,
          tp.depth + 1,
          tp.path || ',' || CAST(e.id AS TEXT),
          tp.visited_nodes || ',' || CAST(e.end_node_id AS TEXT)
        FROM edges e
        INNER JOIN transitive_paths tp ON e.start_node_id = tp.to_node
        WHERE tp.depth < ?
          AND e.type IN (${relationshipTypes.map(() => '?').join(', ')})
          ${detectCycles ? "AND INSTR(tp.visited_nodes, CAST(e.end_node_id AS TEXT)) = 0" : ''}
      )
      SELECT DISTINCT
        from_node,
        to_node,
        type,
        source_file,
        depth,
        path
      FROM transitive_paths
      WHERE depth > 1  -- 직접 관계 제외, 추론된 관계만
      ORDER BY depth, from_node, to_node
    `;

    return new Promise((resolve, reject) => {
      this.database['db']!.all(
        sql,
        [fromNodeId, ...relationshipTypes, maxPathLength, ...relationshipTypes],
        (err: Error | null, rows: any[]) => {
          if (err) {
            reject(new Error(`Transitive query failed: ${err.message}`));
          } else {
            const inferences = rows.map(row => ({
              fromNodeId: row.from_node,
              toNodeId: row.to_node,
              type: row.type,
              path: {
                edgeIds: row.path.split(',').map((id: string) => parseInt(id, 10)),
                depth: row.depth,
                inferenceType: 'transitive' as const,
                description: `Transitive path (depth ${row.depth})`,
              },
              inferredAt: new Date(),
              sourceFile: row.source_file,
            }));
            resolve(inferences);
          }
        }
      );
    });
  }

  /**
   * Inheritable 추론: parent(A,B), rel(B,C) ⇒ rel(A,C)
   *
   * @example
   * // File contains Class, Class extends BaseClass ⇒ File extends BaseClass
   * const inheritable = await engine.queryInheritable(fileNodeId, 'contains', 'extends');
   */
  async queryInheritable(
    fromNodeId: number,
    parentRelationshipType: string,
    inheritableType: string,
    options: InheritableQueryOptions = {}
  ): Promise<InferredRelationship[]> {
    const {
      maxInheritanceDepth = Infinity,
    } = options;

    // Edge type이 inheritable인지 확인
    const edgeTypeDef = EdgeTypeRegistry.get(inheritableType);
    if (!edgeTypeDef?.isInheritable) {
      throw new Error(`Edge type '${inheritableType}' is not inheritable`);
    }

    const inferences: InferredRelationship[] = [];

    // SQL로 상속 가능한 관계 추론
    const sql = `
      WITH RECURSIVE inheritance_paths AS (
        -- Base case: 직접 자식들
        SELECT
          parent.id as parent_edge_id,
          parent.start_node_id as root_node,
          parent.end_node_id as child_node,
          child_rel.id as child_rel_id,
          child_rel.end_node_id as target_node,
          child_rel.type as rel_type,
          child_rel.source_file,
          1 as depth,
          CAST(parent.id AS TEXT) || ',' || CAST(child_rel.id AS TEXT) as path
        FROM edges parent
        INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
        WHERE parent.start_node_id = ?
          AND parent.type = ?
          AND child_rel.type = ?

        UNION ALL

        -- Recursive case: 간접 자식들
        SELECT
          ip.parent_edge_id,
          ip.root_node,
          parent.end_node_id,
          child_rel.id,
          child_rel.end_node_id,
          child_rel.type,
          child_rel.source_file,
          ip.depth + 1,
          ip.path || ',' || CAST(parent.id AS TEXT) || ',' || CAST(child_rel.id AS TEXT)
        FROM inheritance_paths ip
        INNER JOIN edges parent ON ip.child_node = parent.start_node_id
        INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
        WHERE ip.depth < ?
          AND parent.type = ?
          AND child_rel.type = ?
      )
      SELECT DISTINCT
        root_node,
        target_node,
        rel_type,
        source_file,
        depth,
        path
      FROM inheritance_paths
      ORDER BY depth, root_node, target_node
    `;

    return new Promise((resolve, reject) => {
      this.database['db']!.all(
        sql,
        [fromNodeId, parentRelationshipType, inheritableType, maxInheritanceDepth, parentRelationshipType, inheritableType],
        (err: Error | null, rows: any[]) => {
          if (err) {
            reject(new Error(`Inheritable query failed: ${err.message}`));
          } else {
            const inferences = rows.map(row => ({
              fromNodeId: row.root_node,
              toNodeId: row.target_node,
              type: row.rel_type,
              path: {
                edgeIds: row.path.split(',').map((id: string) => parseInt(id, 10)),
                depth: row.depth,
                inferenceType: 'inheritable' as const,
                description: `Inherited via ${parentRelationshipType} (depth ${row.depth})`,
              },
              inferredAt: new Date(),
              sourceFile: row.source_file,
            }));
            resolve(inferences);
          }
        }
      );
    });
  }

  /**
   * 모든 추론 실행 및 통합
   */
  async inferAll(fromNodeId: number, edgeTypes?: string[]): Promise<InferenceResult> {
    const startTime = Date.now();
    const allInferences: InferredRelationship[] = [];

    const typesToInfer = edgeTypes || EdgeTypeRegistry.getAll().map(def => def.type);

    for (const type of typesToInfer) {
      const edgeTypeDef = EdgeTypeRegistry.get(type);
      if (!edgeTypeDef) continue;

      try {
        // Hierarchical 추론
        const hierarchical = await this.queryHierarchical(type, { includeChildren: true });
        allInferences.push(...hierarchical);

        // Transitive 추론
        if (edgeTypeDef.isTransitive) {
          const transitive = await this.queryTransitive(fromNodeId, type);
          allInferences.push(...transitive);
        }
      } catch (error) {
        console.warn(`Inference failed for type '${type}':`, error);
      }
    }

    const executionTime = Date.now() - startTime;

    // 통계 계산
    const statistics = this.calculateStatistics(allInferences);

    return {
      inferences: allInferences,
      statistics,
      executionTime,
    };
  }

  /**
   * 추론 캐시 동기화
   */
  async syncCache(force: boolean = false): Promise<number> {
    if (!this.config.enableCache) {
      return 0;
    }

    if (this.config.cacheSyncStrategy === 'manual' && !force) {
      return 0;
    }

    // edge_inference_cache 테이블 재계산
    const sql = `
      DELETE FROM edge_inference_cache
    `;

    return new Promise((resolve, reject) => {
      this.database['db']!.run(sql, (err: Error | null) => {
        if (err) {
          reject(new Error(`Cache sync failed: ${err.message}`));
        } else {
          // TODO: 모든 추론 재계산 및 캐시 저장
          resolve(0);
        }
      });
    });
  }

  /**
   * 추론 결과 검증
   */
  async validate(): Promise<InferenceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validatedCount = 0;

    // Edge type 계층 구조 검증
    const hierarchyValidation = EdgeTypeRegistry.validateHierarchy();
    if (!hierarchyValidation.valid) {
      errors.push(...hierarchyValidation.errors);
    }

    // 순환 참조 검증
    const allTypes = EdgeTypeRegistry.getAll();
    for (const typeDef of allTypes) {
      if (typeDef.isTransitive) {
        // TODO: 순환 참조 검증 로직
        validatedCount++;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validatedCount,
    };
  }

  // ========== Private Methods ==========

  /**
   * 자식 타입들 재귀적으로 수집
   */
  private getChildTypes(edgeType: string, maxDepth: number = Infinity, currentDepth: number = 0): string[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const children = EdgeTypeRegistry.getChildren(edgeType);
    const allChildren: string[] = [...children];

    for (const child of children) {
      const grandChildren = this.getChildTypes(child, maxDepth, currentDepth + 1);
      allChildren.push(...grandChildren);
    }

    return allChildren;
  }

  /**
   * 계층 깊이 계산
   */
  private calculateHierarchyDepth(fromType: string, toType: string): number {
    const path = EdgeTypeRegistry.getHierarchyPath(fromType);
    const index = path.indexOf(toType);
    return index === -1 ? 1 : path.length - index;
  }

  /**
   * 추론 통계 계산
   */
  private calculateStatistics(inferences: InferredRelationship[]): InferenceStatistics {
    const inferredByType = {
      hierarchical: 0,
      transitive: 0,
      inheritable: 0,
    };

    let totalDepth = 0;
    let maxDepth = 0;

    for (const inference of inferences) {
      inferredByType[inference.path.inferenceType]++;
      totalDepth += inference.path.depth;
      maxDepth = Math.max(maxDepth, inference.path.depth);
    }

    return {
      directRelationships: inferences.filter(i => i.path.depth === 1).length,
      inferredByType,
      cachedInferences: 0, // TODO: 캐시에서 조회
      averageDepth: inferences.length > 0 ? totalDepth / inferences.length : 0,
      maxDepth,
    };
  }
}