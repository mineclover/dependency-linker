/**
 * Database Module Index
 * 그래프 데이터베이스 시스템의 통합 진입점
 */

export type {
	AnalysisSession,
	DependencyPath,
	GraphNode,
	GraphQueryOptions,
	GraphRelationship,
	ProjectInfo,
} from "./GraphDatabase";
export { createGraphDatabase, GraphDatabase } from "./GraphDatabase";
export type {
	EdgeType,
	GraphEdge,
	GraphQueryResult,
	InferredRelationship,
	QueryFilter,
} from "./GraphQueryEngine";
export { createGraphQueryEngine, GraphQueryEngine } from "./GraphQueryEngine";
export type {
	ParseResult,
	StorageOptions,
	StorageResult,
} from "./GraphStorage";
export { createGraphStorage, GraphStorage } from "./GraphStorage";
// Inference module - centralized inference capabilities
export * from "./inference";
// Search module - RDF-based symbol search
export * from "./search";
// Services module - Unknown Symbol System and other services
export * from "./services";

import type { GraphNode } from "./GraphDatabase";
import {
	createGraphQueryEngine,
	type GraphQueryEngine,
} from "./GraphQueryEngine";
/**
 * 통합 그래프 분석 시스템
 */
import { createGraphStorage, type GraphStorage } from "./GraphStorage";

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
	async store(results: Parameters<GraphStorage["storeAnalysisResults"]>[0]) {
		return this.storage.storeAnalysisResults(results);
	}

	/**
	 * 그래프 쿼리
	 */
	async query(filter?: Parameters<GraphQueryEngine["query"]>[0]) {
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
	 * 모든 노드 리스트업 (유형별 그룹화)
	 */
	async listAllNodes() {
		const allNodes = await this.storage.getDatabase().findNodes({});

		// 유형별로 그룹화
		const nodesByType = new Map<string, GraphNode[]>();

		for (const node of allNodes) {
			if (!nodesByType.has(node.type)) {
				nodesByType.set(node.type, []);
			}
			nodesByType.get(node.type)!.push(node);
		}

		// 통계 계산
		const stats = {
			totalNodes: allNodes.length,
			nodeTypes: Array.from(nodesByType.keys()),
			countByType: Object.fromEntries(
				Array.from(nodesByType.entries()).map(([type, nodes]) => [
					type,
					nodes.length,
				]),
			),
		};

		return {
			nodes: allNodes,
			nodesByType: Object.fromEntries(nodesByType),
			stats,
		};
	}

	/**
	 * 특정 유형의 노드만 조회
	 */
	async listNodesByType(nodeType: string) {
		return this.storage.getDatabase().findNodes({ nodeTypes: [nodeType] });
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
