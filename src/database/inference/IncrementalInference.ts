/**
 * Incremental Inference System
 * 변경된 노드만 재추론하여 성능을 최적화하는 시스템
 */

import type { GraphDatabase } from "../GraphDatabase";
import { EdgeTypeRegistry } from "./EdgeTypeRegistry";
import type { InferredRelationship } from "./InferenceTypes";
import { InferenceLRUCache } from "./LRUCache";

export interface IncrementalInferenceConfig {
	enableIncremental: boolean;
	maxDirtyNodes: number;
	batchSize: number;
	debounceMs: number;
}

export interface DirtyNode {
	nodeId: number;
	lastModified: Date;
	affectedEdgeTypes: string[];
}

export interface IncrementalInferenceResult {
	recomputedNodes: number;
	affectedRelationships: number;
	executionTime: number;
	cacheHits: number;
	cacheMisses: number;
}

/**
 * Incremental Inference Engine
 * 변경된 노드만 추론하여 성능을 최적화
 */
export class IncrementalInferenceEngine {
	private database: GraphDatabase;
	private config: Required<IncrementalInferenceConfig>;
	private cache: InferenceLRUCache;
	private dirtyNodes = new Map<number, DirtyNode>();
	private debounceTimer?: NodeJS.Timeout;

	constructor(
		database: GraphDatabase,
		config?: Partial<IncrementalInferenceConfig>,
	) {
		this.database = database;
		this.config = {
			enableIncremental: config?.enableIncremental ?? true,
			maxDirtyNodes: config?.maxDirtyNodes ?? 1000,
			batchSize: config?.batchSize ?? 50,
			debounceMs: config?.debounceMs ?? 1000,
		};
		this.cache = new InferenceLRUCache(2000, 300000); // 5 minutes TTL
	}

	/**
	 * 노드 변경을 추적
	 */
	markNodeDirty(nodeId: number, affectedEdgeTypes?: string[]): void {
		if (!this.config.enableIncremental) {
			return;
		}

		const now = new Date();
		const existing = this.dirtyNodes.get(nodeId);

		if (existing) {
			// Update existing dirty node
			existing.lastModified = now;
			if (affectedEdgeTypes) {
				existing.affectedEdgeTypes = [
					...new Set([...existing.affectedEdgeTypes, ...affectedEdgeTypes]),
				];
			}
		} else {
			// Create new dirty node
			this.dirtyNodes.set(nodeId, {
				nodeId,
				lastModified: now,
				affectedEdgeTypes: affectedEdgeTypes || [],
			});
		}

		// Debounce incremental inference
		this.scheduleIncrementalInference();
	}

	/**
	 * 배치로 노드 변경 추적
	 */
	markNodesDirty(nodeIds: number[], affectedEdgeTypes?: string[]): void {
		if (!this.config.enableIncremental) {
			return;
		}

		nodeIds.forEach((nodeId) => {
			this.markNodeDirty(nodeId, affectedEdgeTypes);
		});
	}

	/**
	 * 증분 추론 실행 (debounced)
	 */
	private scheduleIncrementalInference(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.executeIncrementalInference();
		}, this.config.debounceMs);
	}

	/**
	 * 증분 추론 실행
	 */
	async executeIncrementalInference(): Promise<IncrementalInferenceResult> {
		const startTime = performance.now();
		let recomputedNodes = 0;
		let affectedRelationships = 0;
		let cacheHits = 0;
		let cacheMisses = 0;

		if (this.dirtyNodes.size === 0) {
			return {
				recomputedNodes: 0,
				affectedRelationships: 0,
				executionTime: performance.now() - startTime,
				cacheHits: 0,
				cacheMisses: 0,
			};
		}

		// Process dirty nodes in batches
		const dirtyNodeIds = Array.from(this.dirtyNodes.keys());
		const batches = this.createBatches(dirtyNodeIds, this.config.batchSize);

		for (const batch of batches) {
			const batchResult = await this.processBatch(batch);
			recomputedNodes += batchResult.recomputedNodes;
			affectedRelationships += batchResult.affectedRelationships;
			cacheHits += batchResult.cacheHits;
			cacheMisses += batchResult.cacheMisses;
		}

		// Clear processed dirty nodes
		this.dirtyNodes.clear();

		return {
			recomputedNodes,
			affectedRelationships,
			executionTime: performance.now() - startTime,
			cacheHits,
			cacheMisses,
		};
	}

	/**
	 * 배치 처리
	 */
	private async processBatch(nodeIds: number[]): Promise<{
		recomputedNodes: number;
		affectedRelationships: number;
		cacheHits: number;
		cacheMisses: number;
	}> {
		let recomputedNodes = 0;
		let affectedRelationships = 0;
		let cacheHits = 0;
		let cacheMisses = 0;

		// Get affected edge types for this batch
		const affectedEdgeTypes = new Set<string>();
		for (const nodeId of nodeIds) {
			const dirtyNode = this.dirtyNodes.get(nodeId);
			if (dirtyNode) {
				dirtyNode.affectedEdgeTypes.forEach((type) => {
					affectedEdgeTypes.add(type);
				});
			}
		}

		// Process each affected edge type
		for (const edgeType of affectedEdgeTypes) {
			const edgeTypeDef = EdgeTypeRegistry.get(edgeType);
			if (!edgeTypeDef) {
				continue;
			}

			// Check cache first
			const _cacheKey = this.generateCacheKey("incremental", edgeType, nodeIds);
			const cachedResults = this.cache.getResults("hierarchical", edgeType, {
				nodeIds,
			});

			if (cachedResults) {
				cacheHits++;
				affectedRelationships += cachedResults.length;
			} else {
				cacheMisses++;

				// Recompute for affected nodes
				const results = await this.recomputeForNodes(
					nodeIds,
					edgeType,
					edgeTypeDef,
				);
				affectedRelationships += results.length;
				recomputedNodes += nodeIds.length;

				// Cache results
				this.cache.cacheResults("hierarchical", edgeType, results, { nodeIds });
			}
		}

		return {
			recomputedNodes,
			affectedRelationships,
			cacheHits,
			cacheMisses,
		};
	}

	/**
	 * 특정 노드들에 대한 재계산
	 */
	private async recomputeForNodes(
		nodeIds: number[],
		edgeType: string,
		edgeTypeDef: any,
	): Promise<InferredRelationship[]> {
		const results: InferredRelationship[] = [];

		// Get relationships for affected nodes
		const relationships = await this.database.findRelationships({
			relationshipTypes: [edgeType],
			fromNodeIds: nodeIds,
		});

		// Process each relationship
		for (const rel of relationships) {
			// Apply inference rules based on edge type
			if (edgeTypeDef.isTransitive) {
				const transitiveResults = await this.computeTransitiveInference(rel);
				results.push(...transitiveResults);
			}

			if (edgeTypeDef.isInheritable) {
				const inheritableResults = await this.computeInheritableInference(rel);
				results.push(...inheritableResults);
			}
		}

		return results;
	}

	/**
	 * 전이적 추론 계산
	 */
	private async computeTransitiveInference(
		relationship: any,
	): Promise<InferredRelationship[]> {
		// Simplified transitive inference
		// In a real implementation, this would use SQL recursive CTE
		const results: InferredRelationship[] = [];

		// Find transitive paths
		const transitivePaths = await this.database.findRelationships({
			relationshipTypes: [relationship.type],
			fromNodeIds: [relationship.toNodeId],
		});

		for (const path of transitivePaths) {
			results.push({
				fromNodeId: relationship.fromNodeId,
				toNodeId: path.toNodeId,
				type: relationship.type,
				path: {
					edgeIds: [relationship.id, path.id],
					depth: 2,
					inferenceType: "transitive",
					description: `${relationship.type} → ${path.type}`,
				},
				inferredAt: new Date(),
				sourceFile: relationship.sourceFile,
			});
		}

		return results;
	}

	/**
	 * 상속 가능한 추론 계산
	 */
	private async computeInheritableInference(
		relationship: any,
	): Promise<InferredRelationship[]> {
		// Simplified inheritable inference
		const results: InferredRelationship[] = [];

		// Find inheritable relationships
		const inheritableRels = await this.database.findRelationships({
			relationshipTypes: ["contains"],
			fromNodeIds: [relationship.toNodeId],
		});

		for (const inheritableRel of inheritableRels) {
			results.push({
				fromNodeId: relationship.fromNodeId,
				toNodeId: inheritableRel.toNodeId,
				type: relationship.type,
				path: {
					edgeIds: [relationship.id, inheritableRel.id],
					depth: 2,
					inferenceType: "inheritable",
					description: `${relationship.type} → ${inheritableRel.type}`,
				},
				inferredAt: new Date(),
				sourceFile: relationship.sourceFile,
			});
		}

		return results;
	}

	/**
	 * 배치 생성
	 */
	private createBatches<T>(items: T[], batchSize: number): T[][] {
		const batches: T[][] = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * 캐시 키 생성
	 */
	private generateCacheKey(
		prefix: string,
		edgeType: string,
		nodeIds: number[],
	): string {
		const sortedNodeIds = [...nodeIds].sort((a, b) => a - b);
		return `${prefix}:${edgeType}:${sortedNodeIds.join(",")}`;
	}

	/**
	 * 캐시 무효화
	 */
	invalidateCache(edgeType?: string): void {
		if (edgeType) {
			this.cache.invalidateEdgeType(edgeType);
		} else {
			this.cache.clear();
		}
	}

	/**
	 * 더티 노드 상태 확인
	 */
	getDirtyNodes(): DirtyNode[] {
		return Array.from(this.dirtyNodes.values());
	}

	/**
	 * 캐시 통계
	 */
	getCacheStats() {
		return this.cache.getStats();
	}

	/**
	 * 증분 추론 강제 실행
	 */
	async forceIncrementalInference(): Promise<IncrementalInferenceResult> {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		return this.executeIncrementalInference();
	}

	/**
	 * 리소스 정리
	 */
	destroy(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.cache.destroy();
		this.dirtyNodes.clear();
	}
}
