/**
 * Graph Query Engine
 * GraphQL-style 쿼리 엔진과 추론 시스템
 */

import type { GraphDatabase, GraphNode } from "./GraphDatabase";

export interface GraphEdge {
	id?: number;
	startNodeId: number;
	endNodeId: number;
	type: string;
	label?: string;
	metadata?: Record<string, any>;
	weight?: number;
}

export interface EdgeType {
	type: string;
	description: string;
	schema: Record<string, any>;
	isDirected: boolean;
	parentType?: string;
	isTransitive: boolean;
	isInheritable: boolean;
}

export interface InferredRelationship {
	startNodeId: number;
	endNodeId: number;
	inferredType: string;
	edgePath: string;
	depth: number;
}

export interface QueryFilter {
	nodeTypes?: string[];
	edgeTypes?: string[];
	sourceFiles?: string[];
	languages?: string[];
	startNodeId?: number;
	endNodeId?: number;
	maxDepth?: number;
	includeInferred?: boolean;
}

export interface GraphQueryResult {
	nodes: GraphNode[];
	edges: GraphEdge[];
	inferred?: InferredRelationship[];
	stats: {
		nodeCount: number;
		edgeCount: number;
		inferredCount: number;
	};
}

/**
 * 그래프 쿼리 엔진 - GraphQL 스타일의 쿼리와 추론 시스템
 */
export class GraphQueryEngine {
	constructor(private db: GraphDatabase) {}

	/**
	 * 유연한 그래프 쿼리 실행
	 */
	async query(filter: QueryFilter = {}): Promise<GraphQueryResult> {
		const nodes = await this.queryNodes(filter);
		const edges = await this.queryEdges(filter);

		let inferred: InferredRelationship[] = [];
		if (filter.includeInferred) {
			inferred = await this.queryInferred(filter);
		}

		return {
			nodes,
			edges,
			inferred,
			stats: {
				nodeCount: nodes.length,
				edgeCount: edges.length,
				inferredCount: inferred.length,
			},
		};
	}

	/**
	 * 노드 쿼리
	 */
	private async queryNodes(filter: QueryFilter): Promise<GraphNode[]> {
		return new Promise((resolve, reject) => {
			const conditions: string[] = [];
			const params: any[] = [];

			if (filter.nodeTypes?.length) {
				conditions.push(
					`type IN (${filter.nodeTypes.map(() => "?").join(", ")})`,
				);
				params.push(...filter.nodeTypes);
			}

			if (filter.sourceFiles?.length) {
				conditions.push(
					`source_file IN (${filter.sourceFiles.map(() => "?").join(", ")})`,
				);
				params.push(...filter.sourceFiles);
			}

			if (filter.languages?.length) {
				conditions.push(
					`language IN (${filter.languages.map(() => "?").join(", ")})`,
				);
				params.push(...filter.languages);
			}

			const whereClause = conditions.length
				? `WHERE ${conditions.join(" AND ")}`
				: "";

			const sql = `
        SELECT id, identifier, type, name, source_file, language, metadata,
               start_line, start_column, end_line, end_column
        FROM nodes
        ${whereClause}
        ORDER BY source_file, start_line, start_column
      `;

			// @ts-expect-error
			this.db.db?.all(sql, params, (err, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to query nodes: ${err.message}`));
				} else {
					const nodes = rows.map((row) => ({
						id: row.id,
						identifier: row.identifier,
						type: row.type,
						name: row.name,
						sourceFile: row.source_file,
						language: row.language,
						metadata: JSON.parse(row.metadata || "{}"),
						startLine: row.start_line,
						startColumn: row.start_column,
						endLine: row.end_line,
						endColumn: row.end_column,
					}));
					resolve(nodes);
				}
			});
		});
	}

	/**
	 * 엣지 쿼리
	 */
	private async queryEdges(filter: QueryFilter): Promise<GraphEdge[]> {
		return new Promise((resolve, reject) => {
			const conditions: string[] = [];
			const params: any[] = [];

			if (filter.edgeTypes?.length) {
				conditions.push(
					`e.type IN (${filter.edgeTypes.map(() => "?").join(", ")})`,
				);
				params.push(...filter.edgeTypes);
			}

			if (filter.startNodeId) {
				conditions.push("e.start_node_id = ?");
				params.push(filter.startNodeId);
			}

			if (filter.endNodeId) {
				conditions.push("e.end_node_id = ?");
				params.push(filter.endNodeId);
			}

			if (filter.sourceFiles?.length) {
				conditions.push(
					`(n1.source_file IN (${filter.sourceFiles.map(() => "?").join(", ")}) OR n2.source_file IN (${filter.sourceFiles.map(() => "?").join(", ")}))`,
				);
				params.push(...filter.sourceFiles, ...filter.sourceFiles);
			}

			const whereClause = conditions.length
				? `WHERE ${conditions.join(" AND ")}`
				: "";

			const sql = `
        SELECT e.id, e.start_node_id, e.end_node_id, e.type, e.label, e.metadata, e.weight
        FROM edges e
        JOIN nodes n1 ON e.start_node_id = n1.id
        JOIN nodes n2 ON e.end_node_id = n2.id
        ${whereClause}
        ORDER BY e.start_node_id, e.end_node_id
      `;

			// @ts-expect-error
			this.db.db?.all(sql, params, (err, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to query edges: ${err.message}`));
				} else {
					const edges = rows.map((row) => ({
						id: row.id,
						startNodeId: row.start_node_id,
						endNodeId: row.end_node_id,
						type: row.type,
						label: row.label,
						metadata: JSON.parse(row.metadata || "{}"),
						weight: row.weight,
					}));
					resolve(edges);
				}
			});
		});
	}

	/**
	 * 추론된 관계 쿼리
	 */
	private async queryInferred(
		filter: QueryFilter,
	): Promise<InferredRelationship[]> {
		return new Promise((resolve, reject) => {
			const conditions: string[] = [];
			const params: any[] = [];

			if (filter.edgeTypes?.length) {
				conditions.push(
					`inferred_type IN (${filter.edgeTypes.map(() => "?").join(", ")})`,
				);
				params.push(...filter.edgeTypes);
			}

			if (filter.startNodeId) {
				conditions.push("start_node_id = ?");
				params.push(filter.startNodeId);
			}

			if (filter.endNodeId) {
				conditions.push("end_node_id = ?");
				params.push(filter.endNodeId);
			}

			if (filter.maxDepth) {
				conditions.push("depth <= ?");
				params.push(filter.maxDepth);
			}

			const whereClause = conditions.length
				? `WHERE ${conditions.join(" AND ")}`
				: "";

			const sql = `
        SELECT start_node_id, end_node_id, inferred_type, edge_path, depth
        FROM edge_inference_cache
        ${whereClause}
        ORDER BY depth, start_node_id, end_node_id
      `;

			// @ts-expect-error
			this.db.db?.all(sql, params, (err, rows: any[]) => {
				if (err) {
					reject(
						new Error(`Failed to query inferred relationships: ${err.message}`),
					);
				} else {
					const inferred = rows.map((row) => ({
						startNodeId: row.start_node_id,
						endNodeId: row.end_node_id,
						inferredType: row.inferred_type,
						edgePath: row.edge_path,
						depth: row.depth,
					}));
					resolve(inferred);
				}
			});
		});
	}

	/**
	 * 추론 관계 계산 및 캐시 업데이트
	 */
	async computeInferences(): Promise<number> {
		await this.clearInferenceCache();

		const edgeTypes = await this.getEdgeTypes();
		let totalInferences = 0;

		// 1. 전이적 관계 계산 (A->B, B->C => A->C)
		for (const edgeType of edgeTypes.filter((et) => et.isTransitive)) {
			const count = await this.computeTransitiveInferences(edgeType.type);
			totalInferences += count;
		}

		// 2. 상속 가능한 관계 계산 (parent(A,B) && relation(B,C) => relation(A,C))
		for (const edgeType of edgeTypes.filter((et) => et.isInheritable)) {
			const count = await this.computeInheritableInferences(edgeType);
			totalInferences += count;
		}

		return totalInferences;
	}

	/**
	 * 전이적 관계 계산
	 */
	private async computeTransitiveInferences(edgeType: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const sql = `
        WITH RECURSIVE transitive_closure AS (
          -- Base case: direct edges
          SELECT
            start_node_id,
            end_node_id,
            type,
            json_array(id) as path_ids,
            1 as depth
          FROM edges
          WHERE type = ?

          UNION ALL

          -- Recursive case: extend paths
          SELECT
            tc.start_node_id,
            e.end_node_id,
            ? as type,
            json_insert(tc.path_ids, '$[#]', e.id) as path_ids,
            tc.depth + 1 as depth
          FROM transitive_closure tc
          JOIN edges e ON tc.end_node_id = e.start_node_id
          WHERE e.type = ? AND tc.depth < 10
            AND tc.start_node_id != e.end_node_id  -- Prevent cycles
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
        WHERE depth > 1  -- Only inferred relationships
      `;

			// @ts-expect-error
			this.db.db?.run(sql, [edgeType, edgeType, edgeType], function (err) {
				if (err) {
					reject(
						new Error(
							`Failed to compute transitive inferences: ${err.message}`,
						),
					);
				} else {
					resolve(this.changes || 0);
				}
			});
		});
	}

	/**
	 * 상속 가능한 관계 계산
	 */
	private async computeInheritableInferences(
		edgeType: EdgeType,
	): Promise<number> {
		if (!edgeType.parentType) return 0;

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

			// @ts-expect-error
			this.db.db?.run(
				sql,
				[edgeType.type, edgeType.parentType, edgeType.type],
				function (err) {
					if (err) {
						reject(
							new Error(
								`Failed to compute inheritable inferences: ${err.message}`,
							),
						);
					} else {
						resolve(this.changes || 0);
					}
				},
			);
		});
	}

	/**
	 * 추론 캐시 초기화
	 */
	private async clearInferenceCache(): Promise<void> {
		return new Promise((resolve, reject) => {
			// @ts-expect-error
			this.db.db?.run("DELETE FROM edge_inference_cache", [], (err) => {
				if (err) {
					reject(new Error(`Failed to clear inference cache: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 엣지 타입 정보 조회
	 */
	private async getEdgeTypes(): Promise<EdgeType[]> {
		return new Promise((resolve, reject) => {
			const sql = `
        SELECT type, description, schema, is_directed, parent_type, is_transitive, is_inheritable
        FROM edge_types
        ORDER BY type
      `;

			// @ts-expect-error
			this.db.db?.all(sql, [], (err, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to get edge types: ${err.message}`));
				} else {
					const edgeTypes = rows.map((row) => ({
						type: row.type,
						description: row.description,
						schema: JSON.parse(row.schema || "{}"),
						isDirected: Boolean(row.is_directed),
						parentType: row.parent_type,
						isTransitive: Boolean(row.is_transitive),
						isInheritable: Boolean(row.is_inheritable),
					}));
					resolve(edgeTypes);
				}
			});
		});
	}

	/**
	 * 특정 노드의 모든 관계 조회 (직접 + 추론)
	 */
	async getNodeRelationships(
		nodeId: number,
		includeInferred = true,
	): Promise<{
		outgoing: (GraphEdge | InferredRelationship)[];
		incoming: (GraphEdge | InferredRelationship)[];
	}> {
		const outgoing: (GraphEdge | InferredRelationship)[] = [];
		const incoming: (GraphEdge | InferredRelationship)[] = [];

		// 직접 관계
		const directOutgoing = await this.queryEdges({ startNodeId: nodeId });
		const directIncoming = await this.queryEdges({ endNodeId: nodeId });

		outgoing.push(...directOutgoing);
		incoming.push(...directIncoming);

		// 추론된 관계
		if (includeInferred) {
			const inferredOutgoing = await this.queryInferred({
				startNodeId: nodeId,
			});
			const inferredIncoming = await this.queryInferred({ endNodeId: nodeId });

			outgoing.push(...inferredOutgoing);
			incoming.push(...inferredIncoming);
		}

		return { outgoing, incoming };
	}

	/**
	 * 두 노드 간의 모든 경로 찾기
	 */
	async findAllPaths(
		startNodeId: number,
		endNodeId: number,
		maxDepth = 5,
	): Promise<{
		directPaths: GraphEdge[][];
		inferredPaths: InferredRelationship[];
	}> {
		const directPaths: GraphEdge[][] = [];
		const inferredPaths = await this.queryInferred({
			startNodeId,
			endNodeId,
			maxDepth,
		});

		// BFS로 직접 경로 탐색
		const visited = new Set<number>();
		const queue: { nodeId: number; path: GraphEdge[] }[] = [
			{ nodeId: startNodeId, path: [] },
		];

		while (queue.length > 0 && directPaths.length < 10) {
			// 최대 10개 경로
			const { nodeId, path } = queue.shift()!;

			if (nodeId === endNodeId && path.length > 0) {
				directPaths.push([...path]);
				continue;
			}

			if (path.length >= maxDepth || visited.has(nodeId)) {
				continue;
			}

			visited.add(nodeId);

			const outgoingEdges = await this.queryEdges({ startNodeId: nodeId });
			for (const edge of outgoingEdges) {
				if (!visited.has(edge.endNodeId)) {
					queue.push({
						nodeId: edge.endNodeId,
						path: [...path, edge],
					});
				}
			}
		}

		return { directPaths, inferredPaths };
	}

	/**
	 * GraphQL 스타일 쿼리 실행
	 */
	async graphqlQuery(query: string): Promise<any> {
		// 간단한 GraphQL 파서 (실제로는 더 복잡한 파서 필요)
		const result: any = {};

		if (query.includes("nodes")) {
			result.nodes = await this.queryNodes({});
		}

		if (query.includes("edges")) {
			result.edges = await this.queryEdges({});
		}

		if (query.includes("inferred")) {
			result.inferred = await this.queryInferred({});
		}

		if (query.includes("stats")) {
			// @ts-expect-error
			result.stats = await this.db.getStats();
		}

		return result;
	}
}

/**
 * 그래프 쿼리 엔진 팩토리
 */
export function createGraphQueryEngine(db: GraphDatabase): GraphQueryEngine {
	return new GraphQueryEngine(db);
}
