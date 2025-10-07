import { performance } from "node:perf_hooks";
import type { GraphDatabase, GraphNode } from "../GraphDatabase";

export interface BatchUnknownNodeConfig {
	batchSize?: number;
	enableTransaction?: boolean;
	enableIndexing?: boolean;
	enableCaching?: boolean;
}

export interface UnknownNodeIndexConfig {
	enableTypeIndex?: boolean;
	enableMetadataIndex?: boolean;
	enableImportedFromIndex?: boolean;
	indexSizeLimit?: number; // MB
}

export interface PerformanceMetrics {
	executionTime: number;
	nodesCreated: number;
	relationshipsCreated: number;
	queriesExecuted: number;
	memoryUsage: {
		rss: number;
		heapUsed: number;
		heapTotal: number;
	};
	cacheHitRate?: number;
	indexSize?: number;
}

export class UnknownSymbolPerformanceOptimizer {
	private database: GraphDatabase;
	private config: Required<BatchUnknownNodeConfig> &
		Required<UnknownNodeIndexConfig>;
	private queryCache: Map<string, { result: any; timestamp: number }> =
		new Map();
	private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

	constructor(
		database: GraphDatabase,
		config?: Partial<BatchUnknownNodeConfig & UnknownNodeIndexConfig>,
	) {
		this.database = database;
		this.config = {
			// Batch config
			batchSize: config?.batchSize ?? 100,
			enableTransaction: config?.enableTransaction ?? true,
			enableIndexing: config?.enableIndexing ?? true,
			enableCaching: config?.enableCaching ?? true,
			// Index config
			enableTypeIndex: config?.enableTypeIndex ?? true,
			enableMetadataIndex: config?.enableMetadataIndex ?? true,
			enableImportedFromIndex: config?.enableImportedFromIndex ?? true,
			indexSizeLimit: config?.indexSizeLimit ?? 10, // 10MB
		};
	}

	/**
	 * 배치 Unknown 노드 생성 (성능 최적화)
	 */
	async batchCreateUnknownNodes(
		unknownNodes: Array<{
			identifier: string;
			name: string;
			sourceFile: string;
			language: string;
			metadata?: Record<string, any>;
		}>,
		aliasRelationships: Array<{
			fromNodeId: number;
			toNodeId: number;
			aliasName: string;
		}> = [],
	): Promise<PerformanceMetrics> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		let nodesCreated = 0;
		let relationshipsCreated = 0;
		let queriesExecuted = 0;

		try {
			if (this.config.enableTransaction) {
				await this.database.runQuery("BEGIN TRANSACTION");
			}

			// 배치 크기로 나누어 처리
			for (let i = 0; i < unknownNodes.length; i += this.config.batchSize) {
				const batch = unknownNodes.slice(i, i + this.config.batchSize);

				// 노드 배치 생성
				const createdNodes = await this.batchCreateNodes(batch);
				nodesCreated += createdNodes.length;
				queriesExecuted += 1;

				// Alias 관계 생성
				if (aliasRelationships.length > 0) {
					const batchRelationships = aliasRelationships.slice(
						i,
						i + this.config.batchSize,
					);
					await this.batchCreateRelationships(batchRelationships);
					relationshipsCreated += batchRelationships.length;
					queriesExecuted += 1;
				}
			}

			if (this.config.enableTransaction) {
				await this.database.runQuery("COMMIT");
			}
		} catch (error) {
			if (this.config.enableTransaction) {
				await this.database.runQuery("ROLLBACK");
			}
			throw error;
		}

		const endTime = performance.now();
		const endMemory = process.memoryUsage();

		return {
			executionTime: endTime - startTime,
			nodesCreated,
			relationshipsCreated,
			queriesExecuted,
			memoryUsage: {
				rss: endMemory.rss - startMemory.rss,
				heapUsed: endMemory.heapUsed - startMemory.heapUsed,
				heapTotal: endMemory.heapTotal - startMemory.heapTotal,
			},
		};
	}

	/**
	 * Unknown 노드 인덱스 최적화
	 */
	async optimizeUnknownNodeIndexes(): Promise<PerformanceMetrics> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		let queriesExecuted = 0;

		try {
			// 타입별 인덱스
			if (this.config.enableTypeIndex) {
				await this.database.runQuery(`
					CREATE INDEX IF NOT EXISTS idx_nodes_type_unknown 
					ON nodes(type) WHERE type = 'unknown'
				`);
				queriesExecuted += 1;
			}

			// 메타데이터 인덱스
			if (this.config.enableMetadataIndex) {
				await this.database.runQuery(`
					CREATE INDEX IF NOT EXISTS idx_nodes_metadata_is_alias 
					ON nodes(json_extract(metadata, '$.isAlias'))
					WHERE type = 'unknown'
				`);
				queriesExecuted += 1;

				await this.database.runQuery(`
					CREATE INDEX IF NOT EXISTS idx_nodes_metadata_original_name 
					ON nodes(json_extract(metadata, '$.originalName'))
					WHERE type = 'unknown'
				`);
				queriesExecuted += 1;
			}

			// ImportedFrom 인덱스
			if (this.config.enableImportedFromIndex) {
				await this.database.runQuery(`
					CREATE INDEX IF NOT EXISTS idx_nodes_metadata_imported_from 
					ON nodes(json_extract(metadata, '$.importedFrom'))
					WHERE type = 'unknown'
				`);
				queriesExecuted += 1;
			}

			// 인덱스 크기 확인
			// const indexSize = await this.getIndexSize();
		} catch (error) {
			throw new Error(`Index optimization failed: ${(error as Error).message}`);
		}

		const endTime = performance.now();
		const endMemory = process.memoryUsage();

		return {
			executionTime: endTime - startTime,
			nodesCreated: 0,
			relationshipsCreated: 0,
			queriesExecuted,
			memoryUsage: {
				rss: endMemory.rss - startMemory.rss,
				heapUsed: endMemory.heapUsed - startMemory.heapUsed,
				heapTotal: endMemory.heapTotal - startMemory.heapTotal,
			},
			// indexSize: indexSize,
		};
	}

	/**
	 * Unknown 노드 쿼리 성능 최적화
	 */
	async optimizeUnknownNodeQueries(): Promise<{
		queryPerformance: Map<string, number>;
		recommendations: string[];
	}> {
		const queryPerformance = new Map<string, number>();
		const recommendations: string[] = [];

		// 자주 사용되는 쿼리들 성능 측정
		const queries = [
			{
				name: "find_unknown_by_type",
				query: "SELECT * FROM nodes WHERE type = 'unknown'",
			},
			{
				name: "find_unknown_by_alias",
				query:
					"SELECT * FROM nodes WHERE json_extract(metadata, '$.isAlias') = 1",
			},
			{
				name: "find_unknown_by_imported_from",
				query:
					"SELECT * FROM nodes WHERE json_extract(metadata, '$.importedFrom') = ?",
				params: ["src/types.ts"],
			},
			{
				name: "find_unknown_with_relationships",
				query: `
					SELECT n.*, r.type as relationship_type 
					FROM nodes n 
					LEFT JOIN edges r ON n.id = r.start_node_id 
					WHERE n.type = 'unknown'
				`,
			},
		];

		for (const queryInfo of queries) {
			const startTime = performance.now();

			try {
				if (queryInfo.params) {
					await this.database.runQuery(queryInfo.query, queryInfo.params);
				} else {
					await this.database.runQuery(queryInfo.query);
				}

				const executionTime = performance.now() - startTime;
				queryPerformance.set(queryInfo.name, executionTime);

				// 성능 권장사항 생성
				if (executionTime > 100) {
					recommendations.push(
						`Query '${queryInfo.name}' is slow (${executionTime.toFixed(2)}ms). Consider adding indexes.`,
					);
				}
			} catch (error) {
				console.warn(
					`Query '${queryInfo.name}' failed:`,
					(error as Error).message,
				);
			}
		}

		return { queryPerformance, recommendations };
	}

	/**
	 * 캐시 기반 Unknown 노드 조회
	 */
	async findUnknownNodesCached(conditions: {
		type?: string;
		isAlias?: boolean;
		importedFrom?: string;
		sourceFile?: string;
	}): Promise<GraphNode[]> {
		const cacheKey = this.generateCacheKey(conditions);

		if (this.config.enableCaching) {
			const cached = this.queryCache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
				return cached.result;
			}
		}

		// const startTime = performance.now();
		const results = await this.findUnknownNodes(conditions);
		// const executionTime = performance.now() - startTime;

		if (this.config.enableCaching) {
			this.queryCache.set(cacheKey, {
				result: results,
				timestamp: Date.now(),
			});
		}

		// 캐시 크기 제한
		if (this.queryCache.size > 1000) {
			this.cleanupCache();
		}

		return results;
	}

	/**
	 * 성능 벤치마크 실행
	 */
	async runPerformanceBenchmark(): Promise<{
		overallScore: number;
		metrics: PerformanceMetrics;
		recommendations: string[];
	}> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		// 벤치마크 테스트 데이터 생성
		const testNodes = this.generateTestData(1000);
		const testRelationships = this.generateTestRelationships(500);

		// 배치 생성 성능 테스트
		const batchMetrics = await this.batchCreateUnknownNodes(
			testNodes,
			testRelationships,
		);

		// 인덱스 최적화 성능 테스트
		const indexMetrics = await this.optimizeUnknownNodeIndexes();

		// 쿼리 성능 테스트
		const { queryPerformance, recommendations } =
			await this.optimizeUnknownNodeQueries();

		const endTime = performance.now();
		const endMemory = process.memoryUsage();

		// 전체 성능 점수 계산
		let overallScore = 100;

		// 실행 시간 기반 점수 조정
		if (batchMetrics.executionTime > 1000) overallScore -= 20;
		if (indexMetrics.executionTime > 500) overallScore -= 15;

		// 메모리 사용량 기반 점수 조정
		const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
		if (memoryIncrease > 50 * 1024 * 1024) overallScore -= 10; // 50MB 이상 증가 시

		// 쿼리 성능 기반 점수 조정
		for (const [, executionTime] of queryPerformance) {
			if (executionTime > 50) overallScore -= 5;
		}

		return {
			overallScore: Math.max(0, overallScore),
			metrics: {
				executionTime: endTime - startTime,
				nodesCreated: batchMetrics.nodesCreated,
				relationshipsCreated: batchMetrics.relationshipsCreated,
				queriesExecuted:
					batchMetrics.queriesExecuted + indexMetrics.queriesExecuted,
				memoryUsage: {
					rss: endMemory.rss - startMemory.rss,
					heapUsed: endMemory.heapUsed - startMemory.heapUsed,
					heapTotal: endMemory.heapTotal - startMemory.heapTotal,
				},
			},
			recommendations,
		};
	}

	// Private helper methods
	private async batchCreateNodes(nodes: any[]): Promise<GraphNode[]> {
		const placeholders = nodes.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
		const values = nodes.flatMap((node) => [
			node.identifier,
			"unknown",
			node.name,
			node.sourceFile,
			node.language,
			JSON.stringify(node.metadata || {}),
		]);

		const sql = `
			INSERT INTO nodes (identifier, type, name, source_file, language, metadata)
			VALUES ${placeholders}
		`;

		await this.database.runQuery(sql, values);

		// 생성된 노드들 조회
		const createdNodes = await this.database.runQuery(
			"SELECT * FROM nodes WHERE identifier IN (?)",
			[nodes.map((n) => n.identifier)],
		);

		return createdNodes;
	}

	private async batchCreateRelationships(relationships: any[]): Promise<void> {
		const placeholders = relationships.map(() => "(?, ?, ?, ?)").join(", ");
		const values = relationships.flatMap((rel) => [
			rel.fromNodeId,
			rel.toNodeId,
			"aliasOf",
			JSON.stringify({ aliasName: rel.aliasName }),
		]);

		const sql = `
			INSERT INTO edges (start_node_id, end_node_id, type, metadata)
			VALUES ${placeholders}
		`;

		await this.database.runQuery(sql, values);
	}

	private async findUnknownNodes(conditions: any): Promise<GraphNode[]> {
		const whereClause = [];
		const params = [];

		if (conditions.type) {
			whereClause.push("type = ?");
			params.push(conditions.type);
		}

		if (conditions.isAlias !== undefined) {
			whereClause.push("json_extract(metadata, '$.isAlias') = ?");
			params.push(conditions.isAlias ? 1 : 0);
		}

		if (conditions.importedFrom) {
			whereClause.push("json_extract(metadata, '$.importedFrom') = ?");
			params.push(conditions.importedFrom);
		}

		if (conditions.sourceFile) {
			whereClause.push("source_file = ?");
			params.push(conditions.sourceFile);
		}

		const sql = `SELECT * FROM nodes WHERE ${whereClause.join(" AND ")}`;
		return await this.database.runQuery(sql, params);
	}

	private generateCacheKey(conditions: any): string {
		return `unknown_nodes_${JSON.stringify(conditions)}`;
	}

	private cleanupCache(): void {
		const now = Date.now();
		for (const [key, value] of this.queryCache.entries()) {
			if (now - value.timestamp > this.cacheTTL) {
				this.queryCache.delete(key);
			}
		}
	}

	private generateTestData(count: number): any[] {
		const nodes = [];
		for (let i = 0; i < count; i++) {
			nodes.push({
				identifier: `test-project/src/file${i}.ts#Unknown:Symbol${i}`,
				name: `Symbol${i}`,
				sourceFile: `src/file${i}.ts`,
				language: "typescript",
				metadata: {
					isAlias: i % 2 === 0,
					originalName: `OriginalSymbol${i}`,
					importedFrom: `src/types${i % 5}.ts`,
				},
			});
		}
		return nodes;
	}

	private generateTestRelationships(count: number): any[] {
		const relationships = [];
		for (let i = 0; i < count; i++) {
			relationships.push({
				fromNodeId: i + 1,
				toNodeId: (i + 1) * 2,
				aliasName: `Alias${i}`,
			});
		}
		return relationships;
	}
}
