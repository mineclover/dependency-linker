/**
 * Optimized Inference Engine
 * LRU 캐시와 Incremental Inference를 활용한 성능 최적화된 추론 엔진
 */

import type { GraphDatabase } from "../GraphDatabase";
import { EdgeTypeRegistry } from "./EdgeTypeRegistry";
import { IncrementalInferenceEngine } from "./IncrementalInference";
import type {
	InferenceEngineConfig,
	InferredRelationship,
} from "./InferenceTypes";
import { InferenceLRUCache } from "./LRUCache";
import { PerformanceMonitor } from "./PerformanceMonitor";

export interface OptimizedInferenceConfig extends InferenceEngineConfig {
	enableLRUCache: boolean;
	enableIncremental: boolean;
	enablePerformanceMonitoring: boolean;
	cacheSize: number;
	cacheTTL: number;
	incrementalBatchSize: number;
	performanceMonitoringInterval: number;
}

/**
 * Optimized Inference Engine
 * 성능 최적화된 추론 엔진
 */
export class OptimizedInferenceEngine {
	private database: GraphDatabase;
	private config: Required<OptimizedInferenceConfig>;
	private cache: InferenceLRUCache;
	private incrementalEngine: IncrementalInferenceEngine;
	private performanceMonitor: PerformanceMonitor;
	private monitoringInterval?: NodeJS.Timeout;

	constructor(
		database: GraphDatabase,
		config?: Partial<OptimizedInferenceConfig>,
	) {
		this.database = database;
		this.config = {
			enableCache: config?.enableCache ?? true,
			cacheSyncStrategy: config?.cacheSyncStrategy ?? "lazy",
			defaultMaxPathLength: config?.defaultMaxPathLength ?? 10,
			defaultMaxHierarchyDepth: config?.defaultMaxHierarchyDepth ?? Infinity,
			enableCycleDetection: config?.enableCycleDetection ?? true,
			enableLRUCache: config?.enableLRUCache ?? true,
			enableIncremental: config?.enableIncremental ?? true,
			enablePerformanceMonitoring: config?.enablePerformanceMonitoring ?? true,
			cacheSize: config?.cacheSize ?? 2000,
			cacheTTL: config?.cacheTTL ?? 300000, // 5 minutes
			incrementalBatchSize: config?.incrementalBatchSize ?? 50,
			performanceMonitoringInterval:
				config?.performanceMonitoringInterval ?? 60000, // 1 minute
		};

		// Initialize components
		this.cache = new InferenceLRUCache(
			this.config.cacheSize,
			this.config.cacheTTL,
		);
		this.incrementalEngine = new IncrementalInferenceEngine(database, {
			enableIncremental: this.config.enableIncremental,
			batchSize: this.config.incrementalBatchSize,
		});
		this.performanceMonitor = new PerformanceMonitor();

		// Start performance monitoring if enabled
		if (this.config.enablePerformanceMonitoring) {
			this.startPerformanceMonitoring();
		}
	}

	/**
	 * 계층적 추론 (최적화된 버전)
	 */
	async queryHierarchical(
		edgeType: string,
		options: { includeChildren?: boolean; includeParents?: boolean } = {},
	): Promise<InferredRelationship[]> {
		return this.performanceMonitor
			.measure(
				"queryHierarchical",
				async () => {
					// Check cache first
					if (this.config.enableLRUCache) {
						const cachedResults = this.cache.getResults(
							"hierarchical",
							edgeType,
							options,
						);
						if (cachedResults) {
							return cachedResults;
						}
					}

					// Execute hierarchical inference
					const results = await this.executeHierarchicalInference(
						edgeType,
						options,
					);

					// Cache results
					if (this.config.enableLRUCache) {
						this.cache.cacheResults("hierarchical", edgeType, results, options);
					}

					return results;
				},
				{ edgeType, options },
			)
			.then(({ result }) => result);
	}

	/**
	 * 전이적 추론 (최적화된 버전)
	 */
	async queryTransitive(
		fromNodeId: number,
		edgeType: string,
		options: { maxPathLength?: number } = {},
	): Promise<InferredRelationship[]> {
		return this.performanceMonitor
			.measure(
				"queryTransitive",
				async () => {
					// Check cache first
					if (this.config.enableLRUCache) {
						const cacheKey = `transitive:${fromNodeId}:${edgeType}:${options.maxPathLength || 10}`;
						const cachedResults = this.cache.get(cacheKey);
						if (cachedResults) {
							return cachedResults.results;
						}
					}

					// Execute transitive inference
					const results = await this.executeTransitiveInference(
						fromNodeId,
						edgeType,
						options,
					);

					// Cache results
					if (this.config.enableLRUCache) {
						const cacheKey = `transitive:${fromNodeId}:${edgeType}:${options.maxPathLength || 10}`;
						this.cache.set(cacheKey, {
							results,
							computedAt: new Date(),
							edgeType,
							queryType: "transitive",
						});
					}

					return results;
				},
				{ fromNodeId, edgeType, options },
			)
			.then(({ result }) => result);
	}

	/**
	 * 상속 가능한 추론 (최적화된 버전)
	 */
	async queryInheritable(
		edgeType: string,
		options: { maxDepth?: number } = {},
	): Promise<InferredRelationship[]> {
		return this.performanceMonitor
			.measure(
				"queryInheritable",
				async () => {
					// Check cache first
					if (this.config.enableLRUCache) {
						const cachedResults = this.cache.getResults(
							"inheritable",
							edgeType,
							options,
						);
						if (cachedResults) {
							return cachedResults;
						}
					}

					// Execute inheritable inference
					const results = await this.executeInheritableInference(
						edgeType,
						options,
					);

					// Cache results
					if (this.config.enableLRUCache) {
						this.cache.cacheResults("inheritable", edgeType, results, options);
					}

					return results;
				},
				{ edgeType, options },
			)
			.then(({ result }) => result);
	}

	/**
	 * 노드 변경 추적 (Incremental Inference)
	 */
	markNodeChanged(nodeId: number, affectedEdgeTypes?: string[]): void {
		if (this.config.enableIncremental) {
			this.incrementalEngine.markNodeDirty(nodeId, affectedEdgeTypes);
		}
	}

	/**
	 * 배치 노드 변경 추적
	 */
	markNodesChanged(nodeIds: number[], affectedEdgeTypes?: string[]): void {
		if (this.config.enableIncremental) {
			this.incrementalEngine.markNodesDirty(nodeIds, affectedEdgeTypes);
		}
	}

	/**
	 * 증분 추론 실행
	 */
	async executeIncrementalInference(): Promise<any> {
		if (this.config.enableIncremental) {
			return this.incrementalEngine.forceIncrementalInference();
		}
		return null;
	}

	/**
	 * 성능 벤치마크 실행
	 */
	async runPerformanceBenchmark(): Promise<any> {
		const results = await Promise.all([
			this.benchmarkParsing(),
			this.benchmarkDatabase(),
			this.benchmarkInference(),
			this.benchmarkCache(),
		]);

		return {
			parsing: results[0],
			database: results[1],
			inference: results[2],
			cache: results[3],
		};
	}

	/**
	 * 성능 보고서 생성
	 */
	generatePerformanceReport(): any {
		return this.performanceMonitor.generateReport();
	}

	/**
	 * 캐시 통계
	 */
	getCacheStats(): any {
		return this.cache.getStats();
	}

	/**
	 * 증분 추론 통계
	 */
	getIncrementalStats(): any {
		return {
			dirtyNodes: this.incrementalEngine.getDirtyNodes().length,
			cacheStats: this.incrementalEngine.getCacheStats(),
		};
	}

	/**
	 * 계층적 추론 실행
	 */
	private async executeHierarchicalInference(
		edgeType: string,
		options: { includeChildren?: boolean; includeParents?: boolean },
	): Promise<InferredRelationship[]> {
		// Get related edge types
		const relatedTypes = new Set<string>([edgeType]);

		if (options.includeChildren) {
			const allTypes = EdgeTypeRegistry.getAll();
			allTypes.forEach((type) => {
				if (type.type.includes(edgeType) || edgeType.includes(type.type)) {
					relatedTypes.add(type.type);
				}
			});
		}

		if (options.includeParents) {
			const transitiveTypes = EdgeTypeRegistry.getTransitiveTypes();
			transitiveTypes.forEach((type) => {
				relatedTypes.add(type.type);
			});
		}

		// Query relationships
		const relationships = await this.database.findRelationships({
			relationshipTypes: Array.from(relatedTypes),
		});

		// Convert to inferred relationships
		return relationships.map((rel) => ({
			fromNodeId: rel.fromNodeId,
			toNodeId: rel.toNodeId,
			type: edgeType,
			path: {
				edgeIds: [rel.id!],
				depth: 1,
				inferenceType: "hierarchical" as const,
				description: `${rel.type} → ${edgeType}`,
			},
			inferredAt: new Date(),
			sourceFile: rel.sourceFile,
		}));
	}

	/**
	 * 전이적 추론 실행
	 */
	private async executeTransitiveInference(
		fromNodeId: number,
		edgeType: string,
		options: { maxPathLength?: number },
	): Promise<InferredRelationship[]> {
		const maxPathLength =
			options.maxPathLength || this.config.defaultMaxPathLength;

		// Use SQL recursive CTE for transitive inference
		// This is a simplified implementation
		const relationships = await this.database.findRelationships({
			relationshipTypes: [edgeType],
			fromNodeIds: [fromNodeId],
		});

		const results: InferredRelationship[] = [];

		// Find transitive paths
		for (const rel of relationships) {
			const transitiveRels = await this.database.findRelationships({
				relationshipTypes: [edgeType],
				fromNodeIds: [rel.toNodeId],
			});

			for (const transitiveRel of transitiveRels) {
				results.push({
					fromNodeId,
					toNodeId: transitiveRel.toNodeId,
					type: edgeType,
					path: {
						edgeIds: [rel.id!, transitiveRel.id!],
						depth: 2,
						inferenceType: "transitive" as const,
						description: `${edgeType} → ${edgeType}`,
					},
					inferredAt: new Date(),
					sourceFile: rel.sourceFile,
				});
			}
		}

		return results;
	}

	/**
	 * 상속 가능한 추론 실행
	 */
	private async executeInheritableInference(
		edgeType: string,
		options: { maxDepth?: number },
	): Promise<InferredRelationship[]> {
		const maxDepth = options.maxDepth || this.config.defaultMaxHierarchyDepth;

		// Get inheritable relationships
		const relationships = await this.database.findRelationships({
			relationshipTypes: [edgeType],
		});

		const results: InferredRelationship[] = [];

		// Find inheritable paths
		for (const rel of relationships) {
			const inheritableRels = await this.database.findRelationships({
				relationshipTypes: ["contains"],
				fromNodeIds: [rel.toNodeId],
			});

			for (const inheritableRel of inheritableRels) {
				results.push({
					fromNodeId: rel.fromNodeId,
					toNodeId: inheritableRel.toNodeId,
					type: edgeType,
					path: {
						edgeIds: [rel.id!, inheritableRel.id!],
						depth: 2,
						inferenceType: "inheritable" as const,
						description: `${edgeType} → contains`,
					},
					inferredAt: new Date(),
					sourceFile: rel.sourceFile,
				});
			}
		}

		return results;
	}

	/**
	 * 파싱 성능 벤치마크
	 */
	private async benchmarkParsing(): Promise<any> {
		// This would be implemented with actual parsing benchmarks
		return this.performanceMonitor.benchmark(
			"parsing",
			async () => {
				// Simulate parsing operation
				await new Promise((resolve) => setTimeout(resolve, 10));
			},
			10,
		);
	}

	/**
	 * 데이터베이스 성능 벤치마크
	 */
	private async benchmarkDatabase(): Promise<any> {
		return this.performanceMonitor.benchmark(
			"database",
			async () => {
				await this.database.findNodes({});
				await this.database.findRelationships({});
			},
			5,
		);
	}

	/**
	 * 추론 성능 벤치마크
	 */
	private async benchmarkInference(): Promise<any> {
		return this.performanceMonitor.benchmark(
			"inference",
			async () => {
				await this.queryHierarchical("depends_on");
				await this.queryTransitive(1, "depends_on");
			},
			5,
		);
	}

	/**
	 * 캐시 성능 벤치마크
	 */
	private async benchmarkCache(): Promise<any> {
		const operations = Array.from({ length: 100 }, (_, i) => ({
			key: `test_${i}`,
			value: { data: `value_${i}` },
			operation: i % 2 === 0 ? ("set" as const) : ("get" as const),
		}));

		return this.performanceMonitor.benchmarkCache(this.cache, operations);
	}

	/**
	 * 성능 모니터링 시작
	 */
	private startPerformanceMonitoring(): void {
		this.monitoringInterval = setInterval(() => {
			const report = this.generatePerformanceReport();
			console.log("📊 Performance Report:", {
				overallScore: report.overallScore,
				recommendations: report.recommendations,
			});
		}, this.config.performanceMonitoringInterval);
	}

	/**
	 * LRU 캐시 통계 조회
	 */
	getLRUCacheStatistics(): {
		size: number;
		maxSize: number;
		hitRate: number;
		missRate: number;
		evictions: number;
	} {
		return {
			size: this.cache.size(),
			maxSize: this.cache.maxSize,
			hitRate: this.cache.getHitRate(),
			missRate: this.cache.getMissRate(),
			evictions: this.cache.getEvictionCount(),
		};
	}

	/**
	 * 성능 메트릭 조회
	 */
	getPerformanceMetrics(): Map<string, any> {
		return this.performanceMonitor.getMetrics();
	}

	/**
	 * 캐시 통계 조회 (별칭)
	 */
	getCacheStatistics(): {
		size: number;
		maxSize: number;
		hitRate: number;
		missRate: number;
		evictions: number;
	} {
		return this.getLRUCacheStatistics();
	}

	/**
	 * 캐시 정리
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * 리소스 정리
	 */
	destroy(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}
		this.cache.destroy();
		this.incrementalEngine.destroy();
		this.performanceMonitor.clear();
	}
}
