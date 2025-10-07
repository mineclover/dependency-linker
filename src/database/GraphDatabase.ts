/**
 * SQLite Graph Database Management
 * 의존성 그래프 데이터 저장 및 조회를 위한 SQLite 데이터베이스 관리
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { Database } from "sqlite3";
import type { SupportedLanguage } from "../core/types";

export interface GraphNode {
	id?: number;
	identifier: string;
	type: string;
	name: string;
	sourceFile: string;
	language: SupportedLanguage;
	/** Semantic tags for categorization and context (e.g., ["api", "public", "deprecated"]) */
	semanticTags?: string[];
	metadata?: Record<string, any>;
	startLine?: number;
	startColumn?: number;
	endLine?: number;
	endColumn?: number;
}

export interface GraphRelationship {
	id?: number;
	fromNodeId: number;
	toNodeId: number;
	type: string;
	label?: string;
	metadata?: Record<string, any>;
	weight?: number;
	sourceFile?: string;
}

export interface ProjectInfo {
	id?: number;
	name: string;
	rootPath: string;
	description?: string;
	metadata?: Record<string, any>;
}

export interface AnalysisSession {
	id?: number;
	projectId: number;
	name?: string;
	config?: Record<string, any>;
	stats?: Record<string, any>;
	startedAt?: Date;
	completedAt?: Date;
}

export interface GraphQueryOptions {
	nodeTypes?: string[];
	relationshipTypes?: string[];
	sourceFiles?: string[];
	languages?: SupportedLanguage[];
	fromNodeIds?: number[];
	toNodeIds?: number[];
	limit?: number;
	offset?: number;
}

export interface DependencyPath {
	nodes: GraphNode[];
	relationships: GraphRelationship[];
	totalLength: number;
}

export interface DatabaseStatistics {
	totalNodes: number;
	totalRelationships: number;
	nodesByType: Record<string, number>;
	relationshipsByType: Record<string, number>;
	lastUpdated: string;
}

/**
 * SQLite 기반 그래프 데이터베이스 관리자
 */
export class GraphDatabase {
	private db: Database | null = null;
	private dbPath: string;
	private initialized = false;

	constructor(dbPath: string) {
		this.dbPath = dbPath;
	}

	/**
	 * 데이터베이스 초기화
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		// 디렉토리 생성
		await fs.mkdir(dirname(this.dbPath), { recursive: true });

		return new Promise((resolve, reject) => {
			this.db = new Database(this.dbPath, async (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to open database: ${err.message}`));
					return;
				}

				try {
					await this.createTables();
					this.initialized = true;
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	/**
	 * 스키마 테이블 생성
	 */
	private async createTables(): Promise<void> {
		const schemaPath = join(__dirname, "schema.sql");
		const schema = await fs.readFile(schemaPath, "utf-8");

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			this.db.exec(schema, (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to create tables: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 프로젝트 생성 또는 업데이트
	 */
	async upsertProject(project: ProjectInfo): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		const metadata = JSON.stringify(project.metadata || {});

		return new Promise((resolve, reject) => {
			const sql = `
        INSERT INTO projects (name, root_path, description, metadata)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(root_path) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          metadata = excluded.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

			this.db?.get(
				sql,
				[project.name, project.rootPath, project.description, metadata],
				(err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to upsert project: ${err.message}`));
					} else {
						resolve(row.id);
					}
				},
			);
		});
	}

	/**
	 * 분석 세션 생성
	 */
	async createSession(session: AnalysisSession): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		const config = JSON.stringify(session.config || {});
		const stats = JSON.stringify(session.stats || {});

		return new Promise((resolve, reject) => {
			const sql = `
        INSERT INTO analysis_sessions (project_id, name, config, stats)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `;

			this.db?.get(
				sql,
				[session.projectId, session.name, config, stats],
				(err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to create session: ${err.message}`));
					} else {
						resolve(row.id);
					}
				},
			);
		});
	}

	/**
	 * 노드 생성 또는 업데이트
	 */
	async upsertNode(node: GraphNode): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		const metadata = JSON.stringify(node.metadata || {});
		const semanticTags = JSON.stringify(node.semanticTags || []);

		return new Promise((resolve, reject) => {
			const sql = `
        INSERT INTO nodes (identifier, type, name, source_file, language, semantic_tags, metadata, start_line, start_column, end_line, end_column)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(identifier) DO UPDATE SET
          type = excluded.type,
          name = excluded.name,
          source_file = excluded.source_file,
          language = excluded.language,
          semantic_tags = excluded.semantic_tags,
          metadata = excluded.metadata,
          start_line = excluded.start_line,
          start_column = excluded.start_column,
          end_line = excluded.end_line,
          end_column = excluded.end_column,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

			this.db?.get(
				sql,
				[
					node.identifier,
					node.type,
					node.name,
					node.sourceFile,
					node.language,
					semanticTags,
					metadata,
					node.startLine,
					node.startColumn,
					node.endLine,
					node.endColumn,
				],
				(err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to upsert node: ${err.message}`));
					} else {
						resolve(row.id);
					}
				},
			);
		});
	}

	/**
	 * 관계 생성 또는 업데이트
	 */
	async upsertRelationship(relationship: GraphRelationship): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		const metadata = JSON.stringify(relationship.metadata || {});

		return new Promise((resolve, reject) => {
			const sql = `
        INSERT INTO edges (start_node_id, end_node_id, type, label, metadata, weight, source_file)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(start_node_id, end_node_id, type) DO UPDATE SET
          label = excluded.label,
          metadata = excluded.metadata,
          weight = excluded.weight,
          source_file = excluded.source_file,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

			this.db?.get(
				sql,
				[
					relationship.fromNodeId,
					relationship.toNodeId,
					relationship.type,
					relationship.label,
					metadata,
					relationship.weight || 1.0,
					relationship.sourceFile || null,
				],
				(err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to upsert relationship: ${err.message}`));
					} else {
						resolve(row.id);
					}
				},
			);
		});
	}

	/**
	 * 노드 조회
	 */
	async findNodes(options: GraphQueryOptions = {}): Promise<GraphNode[]> {
		if (!this.db) throw new Error("Database not initialized");

		const conditions: string[] = [];
		const params: any[] = [];

		if (options.nodeTypes?.length) {
			conditions.push(
				`type IN (${options.nodeTypes.map(() => "?").join(", ")})`,
			);
			params.push(...options.nodeTypes);
		}

		if (options.sourceFiles?.length) {
			conditions.push(
				`source_file IN (${options.sourceFiles.map(() => "?").join(", ")})`,
			);
			params.push(...options.sourceFiles);
		}

		if (options.languages?.length) {
			conditions.push(
				`language IN (${options.languages.map(() => "?").join(", ")})`,
			);
			params.push(...options.languages);
		}

		const whereClause = conditions.length
			? `WHERE ${conditions.join(" AND ")}`
			: "";
		const limitClause = options.limit ? `LIMIT ${options.limit}` : "";
		const offsetClause = options.offset ? `OFFSET ${options.offset}` : "";

		const sql = `
      SELECT id, identifier, type, name, source_file, language, semantic_tags, metadata,
             start_line, start_column, end_line, end_column
      FROM nodes
      ${whereClause}
      ORDER BY source_file, start_line, start_column
      ${limitClause} ${offsetClause}
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(sql, params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to find nodes: ${err.message}`));
				} else {
					const nodes = rows.map((row) => ({
						id: row.id,
						identifier: row.identifier,
						type: row.type,
						name: row.name,
						sourceFile: row.source_file,
						language: row.language as SupportedLanguage,
						semanticTags: JSON.parse(row.semantic_tags || "[]"),
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
	 * 관계 조회
	 */
	async findRelationships(
		options: GraphQueryOptions = {},
	): Promise<GraphRelationship[]> {
		if (!this.db) throw new Error("Database not initialized");

		const conditions: string[] = [];
		const params: any[] = [];

		if (options.relationshipTypes?.length) {
			conditions.push(
				`r.type IN (${options.relationshipTypes.map(() => "?").join(", ")})`,
			);
			params.push(...options.relationshipTypes);
		}

		if (options.sourceFiles?.length) {
			conditions.push(
				`(n1.source_file IN (${options.sourceFiles.map(() => "?").join(", ")}) OR n2.source_file IN (${options.sourceFiles.map(() => "?").join(", ")}))`,
			);
			params.push(...options.sourceFiles, ...options.sourceFiles);
		}

		if (options.fromNodeIds?.length) {
			conditions.push(
				`r.start_node_id IN (${options.fromNodeIds.map(() => "?").join(", ")})`,
			);
			params.push(...options.fromNodeIds);
		}

		if (options.toNodeIds?.length) {
			conditions.push(
				`r.end_node_id IN (${options.toNodeIds.map(() => "?").join(", ")})`,
			);
			params.push(...options.toNodeIds);
		}

		const whereClause = conditions.length
			? `WHERE ${conditions.join(" AND ")}`
			: "";
		const limitClause = options.limit ? `LIMIT ${options.limit}` : "";
		const offsetClause = options.offset ? `OFFSET ${options.offset}` : "";

		const sql = `
      SELECT r.id, r.start_node_id, r.end_node_id, r.type, r.label, r.metadata, r.weight, r.source_file
      FROM edges r
      JOIN nodes n1 ON r.start_node_id = n1.id
      JOIN nodes n2 ON r.end_node_id = n2.id
      ${whereClause}
      ORDER BY r.start_node_id, r.end_node_id
      ${limitClause} ${offsetClause}
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(sql, params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to find relationships: ${err.message}`));
				} else {
					const relationships = rows.map((row) => ({
						id: row.id,
						fromNodeId: row.start_node_id,
						toNodeId: row.end_node_id,
						type: row.type,
						label: row.label,
						metadata: JSON.parse(row.metadata || "{}"),
						weight: row.weight,
						sourceFile: row.source_file,
					}));
					resolve(relationships);
				}
			});
		});
	}

	/**
	 * 노드의 직접 의존성 조회
	 */
	async findNodeDependencies(
		nodeId: number,
		relationshipTypes?: string[],
	): Promise<GraphNode[]> {
		if (!this.db) throw new Error("Database not initialized");

		const typeCondition = relationshipTypes?.length
			? `AND r.type IN (${relationshipTypes.map(() => "?").join(", ")})`
			: "";

		const sql = `
      SELECT n.id, n.identifier, n.type, n.name, n.source_file, n.language, n.metadata,
             n.start_line, n.start_column, n.end_line, n.end_column
      FROM nodes n
      JOIN edges r ON n.id = r.end_node_id
      WHERE r.start_node_id = ? ${typeCondition}
      ORDER BY n.source_file, n.start_line, n.start_column
    `;

		const params = relationshipTypes?.length
			? [nodeId, ...relationshipTypes]
			: [nodeId];

		return new Promise((resolve, reject) => {
			this.db?.all(sql, params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to find node dependencies: ${err.message}`));
				} else {
					const nodes = rows.map((row) => ({
						id: row.id,
						identifier: row.identifier,
						type: row.type,
						name: row.name,
						sourceFile: row.source_file,
						language: row.language as SupportedLanguage,
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
	 * 노드를 의존하는 노드들 조회
	 */
	async findNodeDependents(
		nodeId: number,
		relationshipTypes?: string[],
	): Promise<GraphNode[]> {
		if (!this.db) throw new Error("Database not initialized");

		const typeCondition = relationshipTypes?.length
			? `AND r.type IN (${relationshipTypes.map(() => "?").join(", ")})`
			: "";

		const sql = `
      SELECT n.id, n.identifier, n.type, n.name, n.source_file, n.language, n.metadata,
             n.start_line, n.start_column, n.end_line, n.end_column
      FROM nodes n
      JOIN edges r ON n.id = r.start_node_id
      WHERE r.end_node_id = ? ${typeCondition}
      ORDER BY n.source_file, n.start_line, n.start_column
    `;

		const params = relationshipTypes?.length
			? [nodeId, ...relationshipTypes]
			: [nodeId];

		return new Promise((resolve, reject) => {
			this.db?.all(sql, params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to find node dependents: ${err.message}`));
				} else {
					const nodes = rows.map((row) => ({
						id: row.id,
						identifier: row.identifier,
						type: row.type,
						name: row.name,
						sourceFile: row.source_file,
						language: row.language as SupportedLanguage,
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
	 * 두 노드 간의 의존성 경로 찾기 (BFS)
	 */
	async findDependencyPath(
		fromNodeId: number,
		toNodeId: number,
		maxDepth = 10,
	): Promise<DependencyPath | null> {
		if (!this.db) throw new Error("Database not initialized");

		// BFS를 위한 재귀 CTE 쿼리
		const sql = `
      WITH RECURSIVE path_finder AS (
        SELECT
          start_node_id, end_node_id, type as rel_type,
          json_array(start_node_id) as node_path,
          json_array(id) as relationship_path,
          0 as depth
        FROM edges
        WHERE start_node_id = ?

        UNION ALL

        SELECT
          r.start_node_id, r.end_node_id, r.type as rel_type,
          json_insert(pf.node_path, '$[#]', r.end_node_id) as node_path,
          json_insert(pf.relationship_path, '$[#]', r.id) as relationship_path,
          pf.depth + 1 as depth
        FROM edges r
        JOIN path_finder pf ON r.start_node_id = pf.end_node_id
        WHERE pf.depth < ? AND pf.end_node_id != ?
      )
      SELECT node_path, relationship_path, depth
      FROM path_finder
      WHERE end_node_id = ?
      ORDER BY depth
      LIMIT 1
    `;

		return new Promise((resolve, reject) => {
			this.db?.get(
				sql,
				[fromNodeId, maxDepth, toNodeId, toNodeId],
				async (err: Error | null, row: any) => {
					if (err) {
						reject(new Error(`Failed to find dependency path: ${err.message}`));
						return;
					}

					if (!row) {
						resolve(null);
						return;
					}

					try {
						const nodeIds = JSON.parse(row.node_path);
						const relationshipIds = JSON.parse(row.relationship_path);

						// 노드와 관계 정보 조회
						const nodes = await this.getNodesByIds(nodeIds);
						const relationships =
							await this.getRelationshipsByIds(relationshipIds);

						resolve({
							nodes,
							relationships,
							totalLength: row.depth + 1,
						});
					} catch (parseError) {
						reject(new Error(`Failed to parse path result: ${parseError}`));
					}
				},
			);
		});
	}

	/**
	 * ID 목록으로 노드들 조회
	 */
	private async getNodesByIds(nodeIds: number[]): Promise<GraphNode[]> {
		if (!nodeIds.length) return [];

		const placeholders = nodeIds.map(() => "?").join(", ");
		const sql = `
      SELECT id, identifier, type, name, source_file, language, metadata,
             start_line, start_column, end_line, end_column
      FROM nodes
      WHERE id IN (${placeholders})
      ORDER BY CASE ${nodeIds.map((_id, index) => `WHEN id = ? THEN ${index}`).join(" ")} END
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(
				sql,
				[...nodeIds, ...nodeIds],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(new Error(`Failed to get nodes by IDs: ${err.message}`));
					} else {
						const nodes = rows.map((row) => ({
							id: row.id,
							identifier: row.identifier,
							type: row.type,
							name: row.name,
							sourceFile: row.source_file,
							language: row.language as SupportedLanguage,
							metadata: JSON.parse(row.metadata || "{}"),
							startLine: row.start_line,
							startColumn: row.start_column,
							endLine: row.end_line,
							endColumn: row.end_column,
						}));
						resolve(nodes);
					}
				},
			);
		});
	}

	/**
	 * ID 목록으로 관계들 조회
	 */
	private async getRelationshipsByIds(
		relationshipIds: number[],
	): Promise<GraphRelationship[]> {
		if (!relationshipIds.length) return [];

		const placeholders = relationshipIds.map(() => "?").join(", ");
		const sql = `
      SELECT id, start_node_id, end_node_id, type, label, metadata, weight, source_file
      FROM edges
      WHERE id IN (${placeholders})
      ORDER BY CASE ${relationshipIds.map((_id, index) => `WHEN id = ? THEN ${index}`).join(" ")} END
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(
				sql,
				[...relationshipIds, ...relationshipIds],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(
							new Error(`Failed to get relationships by IDs: ${err.message}`),
						);
					} else {
						const relationships = rows.map((row) => ({
							id: row.id,
							fromNodeId: row.start_node_id,
							toNodeId: row.end_node_id,
							type: row.type,
							label: row.label,
							metadata: JSON.parse(row.metadata || "{}"),
							weight: row.weight,
							sourceFile: row.source_file,
						}));
						resolve(relationships);
					}
				},
			);
		});
	}

	// Edge Type Management Methods for EdgeTypeManager

	/**
	 * 새로운 엣지 타입 생성
	 */
	async createEdgeType(definition: any): Promise<void> {
		const sql = `
      INSERT INTO edge_types (type, description, schema, is_directed, parent_type,
                             is_transitive, is_inheritable, priority, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

		return new Promise((resolve, reject) => {
			this.db?.run(
				sql,
				[
					definition.type,
					definition.description,
					JSON.stringify(definition.schema || {}),
					definition.isDirected ? 1 : 0,
					definition.parentType || null,
					definition.isTransitive ? 1 : 0,
					definition.isInheritable ? 1 : 0,
					definition.priority || 0,
					JSON.stringify({
						inferenceRules: definition.inferenceRules || [],
						validationRules: definition.validationRules || [],
						conflictResolution:
							definition.conflictResolution || "priority_based",
					}),
				],
				(err: Error | null) => {
					if (err) {
						reject(new Error(`Failed to create edge type: ${err.message}`));
					} else {
						resolve();
					}
				},
			);
		});
	}

	/**
	 * 엣지 타입 업데이트
	 */
	async updateEdgeType(type: string, updates: any): Promise<void> {
		const setParts: string[] = [];
		const values: any[] = [];

		if (updates.description !== undefined) {
			setParts.push("description = ?");
			values.push(updates.description);
		}
		if (updates.schema !== undefined) {
			setParts.push("schema = ?");
			values.push(JSON.stringify(updates.schema));
		}
		if (updates.isDirected !== undefined) {
			setParts.push("is_directed = ?");
			values.push(updates.isDirected ? 1 : 0);
		}
		if (updates.parentType !== undefined) {
			setParts.push("parent_type = ?");
			values.push(updates.parentType);
		}
		if (updates.isTransitive !== undefined) {
			setParts.push("is_transitive = ?");
			values.push(updates.isTransitive ? 1 : 0);
		}
		if (updates.isInheritable !== undefined) {
			setParts.push("is_inheritable = ?");
			values.push(updates.isInheritable ? 1 : 0);
		}
		if (updates.priority !== undefined) {
			setParts.push("priority = ?");
			values.push(updates.priority);
		}

		if (setParts.length === 0) {
			return Promise.resolve();
		}

		values.push(type);
		const sql = `UPDATE edge_types SET ${setParts.join(", ")} WHERE type = ?`;

		return new Promise((resolve, reject) => {
			this.db?.run(sql, values, (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to update edge type: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 엣지 타입 삭제
	 */
	async deleteEdgeType(type: string): Promise<void> {
		const sql = `DELETE FROM edge_types WHERE type = ?`;

		return new Promise((resolve, reject) => {
			this.db?.run(sql, [type], (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to delete edge type: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 특정 타입의 엣지들 조회
	 */
	async getEdgesByType(edgeType: string): Promise<any[]> {
		const sql = `
      SELECT e.*, n1.identifier as from_identifier, n2.identifier as to_identifier
      FROM edges e
      JOIN nodes n1 ON e.start_node_id = n1.id
      JOIN nodes n2 ON e.end_node_id = n2.id
      WHERE e.type = ?
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(sql, [edgeType], (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to get edges by type: ${err.message}`));
				} else {
					resolve(
						rows.map((row) => ({
							id: row.id,
							startNodeId: row.start_node_id,
							endNodeId: row.end_node_id,
							type: row.type,
							label: row.label,
							metadata: JSON.parse(row.metadata || "{}"),
							weight: row.weight,
							fromIdentifier: row.from_identifier,
							toIdentifier: row.to_identifier,
						})),
					);
				}
			});
		});
	}

	/**
	 * 추론 캐시 클리어
	 */
	async clearInferenceCache(edgeType: string): Promise<void> {
		const sql = `DELETE FROM edges WHERE type = ? AND JSON_EXTRACT(metadata, '$.inferred') = 1`;

		return new Promise((resolve, reject) => {
			this.db?.run(sql, [edgeType], (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to clear inference cache: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 관계 삭제
	 */
	async deleteRelationship(relationshipId: number): Promise<void> {
		const sql = `DELETE FROM edges WHERE id = ?`;

		return new Promise((resolve, reject) => {
			this.db?.run(sql, [relationshipId], (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to delete relationship: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 특정 노드에서 나가는 모든 관계 삭제
	 */
	async deleteNodeRelationships(
		nodeId: number,
		direction: "outgoing" | "incoming" | "both" = "both",
	): Promise<number> {
		let sql = "";
		const params = [nodeId];

		switch (direction) {
			case "outgoing":
				sql = `DELETE FROM edges WHERE start_node_id = ?`;
				break;
			case "incoming":
				sql = `DELETE FROM edges WHERE end_node_id = ?`;
				break;
			case "both":
				sql = `DELETE FROM edges WHERE start_node_id = ? OR end_node_id = ?`;
				params.push(nodeId);
				break;
		}

		return new Promise((resolve, reject) => {
			this.db?.run(sql, params, function (err: Error | null) {
				if (err) {
					reject(
						new Error(`Failed to delete node relationships: ${err.message}`),
					);
				} else {
					resolve(this.changes || 0);
				}
			});
		});
	}

	/**
	 * 특정 파일의 모든 의존성 관계 삭제 (파일 분석 전 정리용)
	 * @deprecated Use cleanupRelationshipsBySourceAndTypes instead for analyzer-specific cleanup
	 */
	async cleanupFileDependencies(sourceFile: string): Promise<number> {
		// 1. 해당 파일의 노드 찾기
		const nodes = await this.findNodes({ sourceFiles: [sourceFile] });
		if (nodes.length === 0) {
			return 0;
		}

		const sourceNode = nodes[0];

		// 2. 해당 노드에서 나가는 모든 import 관계 삭제
		if (!sourceNode.id) return 0;
		const deletedCount = await this.deleteNodeRelationships(
			sourceNode.id,
			"outgoing",
		);

		return deletedCount;
	}

	/**
	 * Analyzer별 관계 정리 (source_file + edge types 기반)
	 * 각 Analyzer가 생성한 관계만 정확히 삭제하여 잔여 관계 방지
	 */
	async cleanupRelationshipsBySourceAndTypes(
		sourceFile: string,
		edgeTypes: string[],
	): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");
		if (edgeTypes.length === 0) return 0;

		const placeholders = edgeTypes.map(() => "?").join(", ");
		const sql = `
      DELETE FROM edges
      WHERE source_file = ?
        AND type IN (${placeholders})
    `;

		return new Promise((resolve, reject) => {
			this.db?.run(
				sql,
				[sourceFile, ...edgeTypes],
				function (err: Error | null) {
					if (err) {
						reject(
							new Error(`Failed to cleanup relationships: ${err.message}`),
						);
					} else {
						resolve(this.changes || 0);
					}
				},
			);
		});
	}

	/**
	 * 노드 삭제
	 */
	async deleteNode(nodeId: number): Promise<void> {
		// 1. 관련 관계들 먼저 삭제
		await this.deleteNodeRelationships(nodeId, "both");

		// 2. 노드 삭제
		const sql = `DELETE FROM nodes WHERE id = ?`;

		return new Promise((resolve, reject) => {
			this.db?.run(sql, [nodeId], (err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to delete node: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * 데이터베이스 통계 조회
	 */
	async getStatistics(): Promise<DatabaseStatistics> {
		const stats: DatabaseStatistics = {
			totalNodes: 0,
			totalRelationships: 0,
			nodesByType: {},
			relationshipsByType: {},
			lastUpdated: new Date().toISOString(),
		};

		// 노드 통계
		const nodeStats = await this.getTableCounts("nodes", "type");
		stats.totalNodes = nodeStats.total;
		stats.nodesByType = nodeStats.byField;

		// 관계 통계
		const relationshipStats = await this.getTableCounts("edges", "type");
		stats.totalRelationships = relationshipStats.total;
		stats.relationshipsByType = relationshipStats.byField;

		return stats;
	}

	/**
	 * 테이블별 개수 조회 헬퍼
	 */
	private async getTableCounts(
		tableName: string,
		groupByField: string,
	): Promise<{
		total: number;
		byField: Record<string, number>;
	}> {
		return new Promise((resolve, reject) => {
			const sql = `
        SELECT ${groupByField}, COUNT(*) as count
        FROM ${tableName}
        GROUP BY ${groupByField}
      `;

			this.db?.all(sql, [], (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Failed to get table counts: ${err.message}`));
				} else {
					const byField: Record<string, number> = {};
					let total = 0;

					rows.forEach((row) => {
						byField[row[groupByField]] = row.count;
						total += row.count;
					});

					resolve({ total, byField });
				}
			});
		});
	}

	/**
	 * 순환 의존성 감지
	 */
	async findCircularDependencies(
		relationshipTypes?: string[],
	): Promise<GraphNode[][]> {
		if (!this.db) throw new Error("Database not initialized");

		const typeCondition = relationshipTypes?.length
			? `WHERE type IN (${relationshipTypes.map(() => "?").join(", ")})`
			: "";

		const sql = `
      WITH RECURSIVE cycle_finder AS (
        SELECT
          start_node_id as start_node,
          start_node_id, end_node_id,
          json_array(start_node_id) as path,
          0 as depth
        FROM edges ${typeCondition}

        UNION ALL

        SELECT
          cf.start_node,
          r.start_node_id, r.end_node_id,
          json_insert(cf.path, '$[#]', r.end_node_id) as path,
          cf.depth + 1 as depth
        FROM edges r
        JOIN cycle_finder cf ON r.start_node_id = cf.end_node_id
        WHERE cf.depth < 20
          AND json_extract(cf.path, '$[0]') != r.end_node_id
          ${relationshipTypes?.length ? `AND r.type IN (${relationshipTypes.map(() => "?").join(", ")})` : ""}
      )
      SELECT DISTINCT path
      FROM cycle_finder
      WHERE start_node = end_node_id
      ORDER BY json_array_length(path)
    `;

		const params = relationshipTypes?.length
			? [...relationshipTypes, ...relationshipTypes]
			: [];

		return new Promise((resolve, reject) => {
			this.db?.all(sql, params, async (err, rows: any[]) => {
				if (err) {
					reject(
						new Error(`Failed to find circular dependencies: ${err.message}`),
					);
					return;
				}

				try {
					const cycles: GraphNode[][] = [];

					for (const row of rows) {
						const nodeIds = JSON.parse(row.path);
						const nodes = await this.getNodesByIds(nodeIds);
						cycles.push(nodes);
					}

					resolve(cycles);
				} catch (parseError) {
					reject(new Error(`Failed to parse cycle result: ${parseError}`));
				}
			});
		});
	}

	/**
	 * 데이터베이스 연결 종료
	 */
	async close(): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve, reject) => {
			this.db?.close((err: Error | null) => {
				if (err) {
					reject(new Error(`Failed to close database: ${err.message}`));
				} else {
					this.db = null;
					this.initialized = false;
					resolve();
				}
			});
		});
	}

	/**
	 * Raw SQL 쿼리 실행
	 */
	async runQuery(sql: string, params: any[] = []): Promise<any[]> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			this.db.all(sql, params, (err: Error | null, rows: any[]) => {
				if (err) {
					reject(new Error(`Query execution failed: ${err.message}`));
				} else {
					resolve(rows || []);
				}
			});
		});
	}

	/**
	 * 데이터베이스 정보 조회
	 */
	async getStats(): Promise<{
		totalNodes: number;
		totalRelationships: number;
		nodesByType: Record<string, number>;
		relationshipsByType: Record<string, number>;
	}> {
		if (!this.db) throw new Error("Database not initialized");

		return new Promise((resolve, reject) => {
			const queries = [
				"SELECT COUNT(*) as count FROM nodes",
				"SELECT COUNT(*) as count FROM edges",
				"SELECT type, COUNT(*) as count FROM nodes GROUP BY type",
				"SELECT type, COUNT(*) as count FROM edges GROUP BY type",
			];

			Promise.all(
				queries.map(
					(sql) =>
						new Promise<any>((res, rej) => {
							this.db?.all(sql, [], (err: Error | null, rows: any) => {
								if (err) rej(err);
								else res(rows);
							});
						}),
				),
			)
				.then(([nodeCount, relCount, nodeTypes, relTypes]) => {
					const stats = {
						totalNodes: (nodeCount as any)[0].count,
						totalRelationships: (relCount as any)[0].count,
						nodesByType: {} as Record<string, number>,
						relationshipsByType: {} as Record<string, number>,
					};

					(nodeTypes as any[]).forEach((row) => {
						stats.nodesByType[row.type] = row.count;
					});

					(relTypes as any[]).forEach((row) => {
						stats.relationshipsByType[row.type] = row.count;
					});

					resolve(stats);
				})
				.catch(reject);
		});
	}

	// ========== Inference Methods ==========

	/**
	 * Hierarchical 관계 조회: Flat Edge Type List 기반 조회
	 * @param edgeType 조회할 edge type
	 * @param options 조회 옵션
	 */
	async queryHierarchicalRelationships(
		edgeType: string,
		options: { includeSimilar?: boolean; includeByProperty?: string } = {},
	): Promise<GraphRelationship[]> {
		if (!this.db) throw new Error("Database not initialized");

		const { includeSimilar = false, includeByProperty } = options;

		// Dynamic import to avoid circular dependency
		const { EdgeTypeRegistry } = await import("./inference/EdgeTypeRegistry");
		const relatedTypes = new Set<string>([edgeType]);

		// 유사한 타입들 수집 (이름 기반)
		if (includeSimilar) {
			const allTypes = EdgeTypeRegistry.getAll();
			allTypes.forEach((type) => {
				if (type.type.includes(edgeType) || edgeType.includes(type.type)) {
					relatedTypes.add(type.type);
				}
			});
		}

		// 특정 속성을 가진 타입들 수집
		if (includeByProperty) {
			const propertyTypes = EdgeTypeRegistry.getByProperty(
				includeByProperty as keyof import("./inference/EdgeTypeRegistry").EdgeTypeDefinition,
				true,
			);
			propertyTypes.forEach((type) => {
				relatedTypes.add(type.type);
			});
		}

		// 모든 관련 타입의 관계 조회
		return this.findRelationships({
			relationshipTypes: Array.from(relatedTypes),
		});
	}

	/**
	 * Transitive 관계 조회: A→B→C ⇒ A→C
	 * @param fromNodeId 시작 노드 ID
	 * @param edgeType 관계 타입 (transitive 타입이어야 함)
	 * @param maxDepth 최대 경로 깊이 (기본: 10)
	 */
	async queryTransitiveRelationships(
		fromNodeId: number,
		edgeType: string,
		maxDepth: number = 10,
	): Promise<GraphRelationship[]> {
		if (!this.db) throw new Error("Database not initialized");

		const sql = `
      WITH RECURSIVE transitive_paths AS (
        -- Base case: 직접 관계
        SELECT
          e.id,
          e.start_node_id,
          e.end_node_id,
          e.type,
          e.label,
          e.metadata,
          e.weight,
          e.source_file,
          1 as depth,
          CAST(e.start_node_id AS TEXT) as visited
        FROM edges e
        WHERE e.start_node_id = ?
          AND e.type = ?

        UNION ALL

        -- Recursive case: 간접 관계
        SELECT
          e.id,
          tp.start_node_id,
          e.end_node_id,
          e.type,
          e.label,
          e.metadata,
          e.weight,
          e.source_file,
          tp.depth + 1,
          tp.visited || ',' || CAST(e.end_node_id AS TEXT)
        FROM edges e
        INNER JOIN transitive_paths tp ON e.start_node_id = tp.end_node_id
        WHERE tp.depth < ?
          AND e.type = ?
          AND INSTR(tp.visited, CAST(e.end_node_id AS TEXT)) = 0  -- 순환 방지
      )
      SELECT DISTINCT
        id,
        start_node_id,
        end_node_id,
        type,
        label,
        metadata,
        weight,
        source_file
      FROM transitive_paths
      ORDER BY depth, start_node_id, end_node_id
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(
				sql,
				[fromNodeId, edgeType, maxDepth, edgeType],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(new Error(`Transitive query failed: ${err.message}`));
					} else {
						const relationships = rows.map((row) => ({
							id: row.id,
							fromNodeId: row.start_node_id,
							toNodeId: row.end_node_id,
							type: row.type,
							label: row.label,
							metadata: JSON.parse(row.metadata || "{}"),
							weight: row.weight,
							sourceFile: row.source_file,
						}));
						resolve(relationships);
					}
				},
			);
		});
	}

	/**
	 * Inheritable 관계 조회: parent(A,B), rel(B,C) ⇒ rel(A,C)
	 * @param fromNodeId 시작 노드 ID
	 * @param parentRelationType 부모 관계 타입 (contains, declares 등)
	 * @param inheritableType 상속 가능한 관계 타입
	 * @param maxDepth 최대 상속 깊이 (기본: 5)
	 */
	async queryInheritableRelationships(
		fromNodeId: number,
		parentRelationType: string,
		inheritableType: string,
		maxDepth: number = 5,
	): Promise<GraphRelationship[]> {
		if (!this.db) throw new Error("Database not initialized");

		const sql = `
      WITH RECURSIVE inheritance AS (
        -- Base case: 직접 자식의 관계
        SELECT
          parent.start_node_id as root_node,
          child_rel.id,
          child_rel.start_node_id,
          child_rel.end_node_id,
          child_rel.type,
          child_rel.label,
          child_rel.metadata,
          child_rel.weight,
          child_rel.source_file,
          1 as depth
        FROM edges parent
        INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
        WHERE parent.start_node_id = ?
          AND parent.type = ?
          AND child_rel.type = ?

        UNION ALL

        -- Recursive case: 간접 자식의 관계
        SELECT
          inh.root_node,
          child_rel.id,
          child_rel.start_node_id,
          child_rel.end_node_id,
          child_rel.type,
          child_rel.label,
          child_rel.metadata,
          child_rel.weight,
          child_rel.source_file,
          inh.depth + 1
        FROM inheritance inh
        INNER JOIN edges parent ON inh.end_node_id = parent.start_node_id
        INNER JOIN edges child_rel ON parent.end_node_id = child_rel.start_node_id
        WHERE inh.depth < ?
          AND parent.type = ?
          AND child_rel.type = ?
      )
      SELECT DISTINCT
        root_node as start_node_id,
        end_node_id,
        id,
        type,
        label,
        metadata,
        weight,
        source_file
      FROM inheritance
      ORDER BY depth, start_node_id, end_node_id
    `;

		return new Promise((resolve, reject) => {
			this.db?.all(
				sql,
				[
					fromNodeId,
					parentRelationType,
					inheritableType,
					maxDepth,
					parentRelationType,
					inheritableType,
				],
				(err: Error | null, rows: any[]) => {
					if (err) {
						reject(new Error(`Inheritable query failed: ${err.message}`));
					} else {
						const relationships = rows.map((row) => ({
							id: row.id,
							fromNodeId: row.start_node_id,
							toNodeId: row.end_node_id,
							type: row.type,
							label: row.label,
							metadata: JSON.parse(row.metadata || "{}"),
							weight: row.weight,
							sourceFile: row.source_file,
						}));
						resolve(relationships);
					}
				},
			);
		});
	}

	/**
	 * 추론 캐시 동기화
	 * edge_inference_cache 테이블을 현재 edges 상태로 업데이트
	 */
	async syncInferenceCache(): Promise<number> {
		if (!this.db) throw new Error("Database not initialized");

		// InferenceEngine을 사용하여 캐시 동기화
		// Note: EdgeTypeRegistry가 초기화되어 있어야 함
		const { InferenceEngine } = await import("./inference/InferenceEngine");
		const { EdgeTypeRegistry } = await import("./inference/EdgeTypeRegistry");

		// EdgeTypeRegistry가 비어있으면 캐시 동기화를 건너뜀
		const allTypes = EdgeTypeRegistry.getAll();
		if (allTypes.length === 0) {
			console.warn("EdgeTypeRegistry is empty - skipping cache sync");
			return 0;
		}

		const engine = new InferenceEngine(this, {
			enableCache: true,
			cacheSyncStrategy: "eager",
		});

		return engine.syncCache(true); // force = true
	}
}

/**
 * 그래프 데이터베이스 팩토리 함수
 */
export function createGraphDatabase(dbPath: string): GraphDatabase {
	return new GraphDatabase(dbPath);
}
