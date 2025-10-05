/**
 * InferenceEngine
 *
 * Hierarchical, Transitive, Inheritable 관계 추론 엔진
 * SQL Recursive CTE 기반 추론 + 타입 안전 캐시 관리
 */

import type { GraphDatabase } from "../GraphDatabase";
import { EdgeTypeRegistry } from "./EdgeTypeRegistry";
import { ErrorHandler, ERROR_CODES } from "./ErrorHandler";
import { PERFORMANCE_CONSTANTS, ConfigValidators } from "./Constants";
import {
	type HierarchicalQueryOptions,
	InferenceCacheEntry,
	type InferenceEngineConfig,
	InferencePath,
	type InferenceResult,
	type InferenceStatistics,
	type InferenceValidationResult,
	type InferredRelationship,
	type InheritableQueryOptions,
	type TransitiveQueryOptions,
} from "./InferenceTypes";

export class InferenceEngine {
	private database: GraphDatabase;
	private config: Required<InferenceEngineConfig>;

	constructor(database: GraphDatabase, config?: InferenceEngineConfig) {
		this.database = database;

		// 설정 검증
		if (config) {
			ConfigValidators.validatePerformanceConfig({
				maxPathLength: config.defaultMaxPathLength,
				maxHierarchyDepth: config.defaultMaxHierarchyDepth,
			});
		}

		this.config = {
			enableCache: config?.enableCache ?? true,
			cacheSyncStrategy: config?.cacheSyncStrategy ?? "lazy",
			defaultMaxPathLength:
				config?.defaultMaxPathLength ??
				PERFORMANCE_CONSTANTS.DEFAULT_MAX_PATH_LENGTH,
			defaultMaxHierarchyDepth:
				config?.defaultMaxHierarchyDepth ??
				PERFORMANCE_CONSTANTS.DEFAULT_MAX_HIERARCHY_DEPTH,
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
		options: HierarchicalQueryOptions = {},
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

		// 유사한 타입들 수집 (이름 기반)
		if (includeChildren) {
			const allTypes = EdgeTypeRegistry.getAll();
			allTypes.forEach((type) => {
				if (type.type.includes(edgeType) || edgeType.includes(type.type)) {
					relatedTypes.add(type.type);
				}
			});
		}

		// 특정 속성을 가진 타입들 수집
		if (includeParents) {
			const transitiveTypes = EdgeTypeRegistry.getTransitiveTypes();
			transitiveTypes.forEach((type) => {
				relatedTypes.add(type.type);
			});
		}

		// 모든 관련 타입의 관계 조회
		const relationships = await this.database.findRelationships({
			relationshipTypes: Array.from(relatedTypes),
		});

		// 추론 결과 생성
		for (const rel of relationships) {
			const inferenceType =
				rel.type === edgeType ? "hierarchical" : "hierarchical";
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
		options: TransitiveQueryOptions = {},
	): Promise<InferredRelationship[]> {
		const {
			maxPathLength = this.config.defaultMaxPathLength,
			detectCycles = this.config.enableCycleDetection,
			relationshipTypes = [edgeType],
		} = options;

		// Edge type이 transitive인지 확인
		const edgeTypeDef = EdgeTypeRegistry.get(edgeType);
		if (!edgeTypeDef?.isTransitive) {
			ErrorHandler.handle(
				new Error(`Edge type '${edgeType}' is not transitive`),
				"queryTransitive",
				ERROR_CODES.EDGE_TYPE_NOT_TRANSITIVE,
			);
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
          AND e.type IN (${relationshipTypes.map(() => "?").join(", ")})

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
          AND e.type IN (${relationshipTypes.map(() => "?").join(", ")})
          ${detectCycles ? "AND INSTR(tp.visited_nodes, CAST(e.end_node_id AS TEXT)) = 0" : ""}
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

		return ErrorHandler.safeExecute(
			() =>
				new Promise<InferredRelationship[]>((resolve, reject) => {
					this.database["db"]!.all(
						sql,
						[
							fromNodeId,
							...relationshipTypes,
							maxPathLength,
							...relationshipTypes,
						],
						(err: Error | null, rows: any[]) => {
							if (err) {
								reject(new Error(`Transitive query failed: ${err.message}`));
							} else {
								const inferences = rows.map((row) => ({
									fromNodeId: row.from_node,
									toNodeId: row.to_node,
									type: row.type,
									path: {
										edgeIds: row.path
											.split(",")
											.map((id: string) => parseInt(id, 10)),
										depth: row.depth,
										inferenceType: "transitive" as const,
										description: `Transitive path (depth ${row.depth})`,
									},
									inferredAt: new Date(),
									sourceFile: row.source_file,
								}));
								resolve(inferences);
							}
						},
					);
				}),
			"queryTransitive",
			ERROR_CODES.INFERENCE_QUERY_FAILED,
		);
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
		options: InheritableQueryOptions = {},
	): Promise<InferredRelationship[]> {
		const { maxInheritanceDepth = Infinity } = options;

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
			this.database["db"]!.all(
				sql,
				[
					fromNodeId,
					parentRelationshipType,
					inheritableType,
					maxInheritanceDepth,
					parentRelationshipType,
					inheritableType,
				],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(new Error(`Inheritable query failed: ${err.message}`));
					} else {
						const inferences = rows.map((row) => ({
							fromNodeId: row.root_node,
							toNodeId: row.target_node,
							type: row.rel_type,
							path: {
								edgeIds: row.path
									.split(",")
									.map((id: string) => parseInt(id, 10)),
								depth: row.depth,
								inferenceType: "inheritable" as const,
								description: `Inherited via ${parentRelationshipType} (depth ${row.depth})`,
							},
							inferredAt: new Date(),
							sourceFile: row.source_file,
						}));
						resolve(inferences);
					}
				},
			);
		});
	}

	/**
	 * 모든 추론 실행 및 통합
	 */
	async inferAll(
		fromNodeId: number,
		edgeTypes?: string[],
	): Promise<InferenceResult> {
		const startTime = Date.now();
		const allInferences: InferredRelationship[] = [];

		const typesToInfer =
			edgeTypes || EdgeTypeRegistry.getAll().map((def) => def.type);

		for (const type of typesToInfer) {
			const edgeTypeDef = EdgeTypeRegistry.get(type);
			if (!edgeTypeDef) continue;

			try {
				// Hierarchical 추론
				const hierarchical = await this.queryHierarchical(type, {
					includeChildren: true,
				});
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

		// 통계 계산 (async version)
		const statistics = await this.calculateStatisticsAsync(allInferences);

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

		if (this.config.cacheSyncStrategy === "manual" && !force) {
			return 0;
		}

		// 1. 기존 캐시 삭제
		await this.clearCache();

		// 2. 모든 추론 재계산 및 캐시 저장
		let totalCached = 0;
		const allTypes = EdgeTypeRegistry.getAll();

		for (const typeDef of allTypes) {
			try {
				// 전이적 관계 캐싱
				if (typeDef.isTransitive) {
					const transitiveCount = await this.cacheTransitiveInferences(
						typeDef.type,
					);
					totalCached += transitiveCount;
				}

				// 상속 가능한 관계 캐싱
				if (typeDef.isInheritable) {
					const inheritableCount = await this.cacheInheritableInferences(
						typeDef.type,
					);
					totalCached += inheritableCount;
				}
			} catch (error) {
				console.warn(
					`Failed to cache inferences for type '${typeDef.type}':`,
					error,
				);
			}
		}

		return totalCached;
	}

	/**
	 * 캐시 초기화
	 */
	private async clearCache(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.database["db"]!.run(
				"DELETE FROM edge_inference_cache",
				(err: Error | null) => {
					if (err) {
						reject(new Error(`Cache clear failed: ${err.message}`));
					} else {
						resolve();
					}
				},
			);
		});
	}

	/**
	 * 전이적 관계 캐싱
	 */
	private async cacheTransitiveInferences(edgeType: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const sql = `
        WITH RECURSIVE transitive_closure AS (
          -- Base case: 직접 관계
          SELECT
            start_node_id,
            end_node_id,
            type,
            json_array(id) as path_ids,
            1 as depth
          FROM edges
          WHERE type = ?

          UNION ALL

          -- Recursive case: 간접 관계
          SELECT
            tc.start_node_id,
            e.end_node_id,
            ? as type,
            json_insert(tc.path_ids, '$[#]', e.id) as path_ids,
            tc.depth + 1 as depth
          FROM transitive_closure tc
          JOIN edges e ON tc.end_node_id = e.start_node_id
          WHERE e.type = ? AND tc.depth < ?
            AND tc.start_node_id != e.end_node_id  -- 순환 방지
        )
        INSERT OR IGNORE INTO edge_inference_cache
          (start_node_id, end_node_id, inferred_type, edge_path, depth)
        SELECT
          start_node_id,
          end_node_id,
          type,
          path_ids,
          depth
        FROM transitive_closure
        WHERE depth > 1  -- 직접 관계 제외
      `;

			this.database["db"]!.run(
				sql,
				[edgeType, edgeType, edgeType, this.config.defaultMaxPathLength],
				function (err: Error | null) {
					if (err) {
						reject(new Error(`Transitive cache failed: ${err.message}`));
					} else {
						resolve(this.changes || 0);
					}
				},
			);
		});
	}

	/**
	 * 상속 가능한 관계 캐싱
	 */
	private async cacheInheritableInferences(edgeType: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const sql = `
        INSERT OR IGNORE INTO edge_inference_cache
          (start_node_id, end_node_id, inferred_type, edge_path, depth)
        SELECT
          parent_edge.start_node_id,
          child_edge.end_node_id,
          ? as inferred_type,
          json_array(parent_edge.id, child_edge.id) as edge_path,
          2 as depth
        FROM edges parent_edge
        JOIN edges child_edge ON parent_edge.end_node_id = child_edge.start_node_id
        WHERE parent_edge.type = ? AND child_edge.type = ?
          AND parent_edge.start_node_id != child_edge.end_node_id
      `;

			this.database["db"]!.run(
				sql,
				[edgeType, edgeType, edgeType],
				function (err: Error | null) {
					if (err) {
						reject(new Error(`Inheritable cache failed: ${err.message}`));
					} else {
						resolve(this.changes || 0);
					}
				},
			);
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
				const cycles = await this.detectCycles(typeDef.type);
				if (cycles.length > 0) {
					errors.push(
						`Circular reference detected in '${typeDef.type}': ${cycles.length} cycles found`,
					);
					for (const cycle of cycles.slice(0, 5)) {
						// 최대 5개만 보고
						warnings.push(`  Cycle: ${cycle.nodes.join(" → ")}`);
					}
					if (cycles.length > 5) {
						warnings.push(`  ... and ${cycles.length - 5} more cycles`);
					}
				}
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

	/**
	 * 순환 참조 감지
	 */
	private async detectCycles(
		edgeType: string,
	): Promise<Array<{ nodes: number[] }>> {
		return new Promise((resolve, reject) => {
			const sql = `
        WITH RECURSIVE cycle_detection AS (
          -- Base case: 모든 노드에서 시작
          SELECT
            start_node_id as origin,
            start_node_id,
            end_node_id,
            CAST(start_node_id AS TEXT) as path,
            0 as depth
          FROM edges
          WHERE type = ?

          UNION ALL

          -- Recursive case: 경로 확장
          SELECT
            cd.origin,
            e.start_node_id,
            e.end_node_id,
            cd.path || ',' || CAST(e.start_node_id AS TEXT),
            cd.depth + 1
          FROM cycle_detection cd
          JOIN edges e ON cd.end_node_id = e.start_node_id
          WHERE e.type = ?
            AND cd.depth < 50  -- 최대 깊이 제한
            AND INSTR(',' || cd.path || ',', ',' || CAST(e.start_node_id AS TEXT) || ',') = 0  -- 방문하지 않은 노드만 (구분자 포함 검색)
        )
        SELECT DISTINCT origin, path || ',' || CAST(end_node_id AS TEXT) as cycle_path
        FROM cycle_detection
        WHERE end_node_id = origin  -- 시작 노드로 돌아온 경우
        LIMIT 100  -- 최대 100개 사이클만
      `;

			this.database["db"]!.all(
				sql,
				[edgeType, edgeType],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(new Error(`Cycle detection failed: ${err.message}`));
					} else {
						const cycles = rows.map((row) => ({
							nodes: row.cycle_path
								.split(",")
								.map((id: string) => parseInt(id, 10)),
						}));
						resolve(cycles);
					}
				},
			);
		});
	}

	// ========== Private Methods ==========

	/**
	 * 계층 깊이 계산
	 */
	private calculateHierarchyDepth(fromType: string, toType: string): number {
		// Flat List에서는 단순히 타입이 같은지 확인
		return fromType === toType ? 0 : 1;
	}

	/**
	 * 추론 통계 계산 (Async version with accurate cache count)
	 */
	private async calculateStatisticsAsync(
		inferences: InferredRelationship[],
	): Promise<InferenceStatistics> {
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

		// Get accurate cached inference count
		const cachedInferences = await this.getCachedInferenceCountAsync();

		return {
			directRelationships: inferences.filter((i) => i.path.depth === 1).length,
			inferredByType,
			cachedInferences,
			averageDepth: inferences.length > 0 ? totalDepth / inferences.length : 0,
			maxDepth,
		};
	}

	/**
	 * 추론 통계 계산 (Sync version - deprecated)
	 * @deprecated Use calculateStatisticsAsync for accurate cache count
	 */
	private calculateStatistics(
		inferences: InferredRelationship[],
	): InferenceStatistics {
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
			directRelationships: inferences.filter((i) => i.path.depth === 1).length,
			inferredByType,
			cachedInferences: 0, // Always 0 in sync version
			averageDepth: inferences.length > 0 ? totalDepth / inferences.length : 0,
			maxDepth,
		};
	}

	/**
	 * 캐시된 추론 수 조회 (비동기)
	 */
	private async getCachedInferenceCountAsync(): Promise<number> {
		if (!this.config.enableCache) {
			return 0;
		}

		return new Promise((resolve) => {
			this.database["db"]!.get(
				"SELECT COUNT(*) as count FROM edge_inference_cache",
				(err: Error | null, row: any) => {
					if (err) {
						console.warn("Failed to get cached inference count:", err);
						resolve(0);
					} else {
						resolve(row?.count || 0);
					}
				},
			);
		});
	}

	/**
	 * 캐시된 추론 수 조회 (동기 - 통계 계산용)
	 * Note: 정확도보다 성능을 위해 0을 반환 (실제 캐시 수는 비동기 메서드 사용)
	 */
	private getCachedInferenceCount(): number {
		// calculateStatistics는 동기 메서드이므로 0 반환
		// 정확한 캐시 수가 필요하면 getCachedInferenceCountAsync() 사용
		return 0;
	}
}
