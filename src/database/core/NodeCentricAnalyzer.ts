/**
 * Node-Centric Analysis Framework
 * 노드 중심 분석 프레임워크 - 특정 노드를 기준으로 다양한 분석 수행
 */

import type { GraphDatabase } from "../GraphDatabase";
import type { GraphQueryEngine } from "../GraphQueryEngine";
import { createCircularDependencyDetector } from "./CircularDependencyDetector";
import type { NodeIdentifier } from "./NodeIdentifier";

export interface NodeAnalysisOptions {
	maxDepth: number;
	includeInferred: boolean;
	edgeTypes?: string[];
	timeout: number;
}

export interface NodeImpactAnalysis {
	node: {
		id: string;
		identifier: string;
		type: string;
		name: string;
	};
	dependencies: {
		direct: NodeReference[];
		transitive: NodeReference[];
		depth: number;
	};
	dependents: {
		direct: NodeReference[];
		transitive: NodeReference[];
		depth: number;
	};
	metrics: {
		fanIn: number; // 들어오는 의존성 수
		fanOut: number; // 나가는 의존성 수
		instability: number; // I = fanOut / (fanIn + fanOut)
		centrality: number; // 중앙성 점수
		criticalityScore: number; // 중요도 점수
	};
	risks: {
		circularDependencies: CircularRisk[];
		highCoupling: boolean;
		singlePointOfFailure: boolean;
	};
}

export interface NodeReference {
	id: string;
	identifier: string;
	type: string;
	name: string;
	relationshipType: string;
	distance: number;
	weight: number;
}

export interface CircularRisk {
	cycle: string[];
	depth: number;
	severity: "low" | "medium" | "high";
	description: string;
}

export interface NodeNeighborhood {
	center: NodeReference;
	immediate: {
		incoming: NodeReference[];
		outgoing: NodeReference[];
	};
	extended: {
		level2: NodeReference[];
		level3: NodeReference[];
	};
	clusters: NodeCluster[];
}

export interface NodeCluster {
	id: string;
	nodes: NodeReference[];
	cohesion: number;
	purpose: string;
}

export interface NodeEvolutionAnalysis {
	node: NodeReference;
	changeFrequency: number;
	impactRadius: number;
	stabilityScore: number;
	refactoringRisk: "low" | "medium" | "high";
	recommendations: string[];
}

/**
 * 노드 중심 분석기
 *
 * 특정 노드를 기준으로 다양한 분석을 수행:
 * - 영향도 분석 (Impact Analysis)
 * - 의존성 분석 (Dependency Analysis)
 * - 위험 분석 (Risk Analysis)
 * - 이웃 분석 (Neighborhood Analysis)
 * - 진화 분석 (Evolution Analysis)
 */
export class NodeCentricAnalyzer {
	private db: GraphDatabase;
	private queryEngine: GraphQueryEngine;
	private nodeIdentifier: NodeIdentifier;
	private defaultOptions: Required<NodeAnalysisOptions>;

	constructor(
		db: GraphDatabase,
		queryEngine: GraphQueryEngine,
		nodeIdentifier: NodeIdentifier,
		options: Partial<NodeAnalysisOptions> = {},
	) {
		this.db = db;
		this.queryEngine = queryEngine;
		this.nodeIdentifier = nodeIdentifier;
		this.defaultOptions = {
			maxDepth: 10,
			includeInferred: true,
			edgeTypes: ["imports", "depends_on", "calls", "contains", "declares"],
			timeout: 30000,
			...options,
		};
	}

	/**
	 * 종합 노드 영향도 분석
	 */
	async analyzeNodeImpact(
		nodeIdentifier: string,
		options: Partial<NodeAnalysisOptions> = {},
	): Promise<NodeImpactAnalysis> {
		const opts = { ...this.defaultOptions, ...options };

		// 노드 정보 조회
		const nodes = await this.db.findNodes({});
		const node = nodes.find((n) => n.identifier === nodeIdentifier);

		if (!node) {
			throw new Error(`Node not found: ${nodeIdentifier}`);
		}

		// 병렬로 분석 수행
		const [dependencies, dependents, metrics, risks] = await Promise.all([
			this.analyzeDependencies(node.id!, opts),
			this.analyzeDependents(node.id!, opts),
			this.calculateNodeMetrics(node.id!, opts),
			this.analyzeNodeRisks(node.id!, opts),
		]);

		return {
			node: {
				id: node.id!.toString(),
				identifier: node.identifier,
				type: node.type,
				name: node.name,
			},
			dependencies,
			dependents,
			metrics,
			risks,
		};
	}

	/**
	 * 노드 이웃 분석
	 */
	async analyzeNodeNeighborhood(
		nodeIdentifier: string,
		options: Partial<NodeAnalysisOptions> = {},
	): Promise<NodeNeighborhood> {
		const opts = { ...this.defaultOptions, ...options };

		const nodes = await this.db.findNodes({});
		const centerNode = nodes.find((n) => n.identifier === nodeIdentifier);

		if (!centerNode) {
			throw new Error(`Node not found: ${nodeIdentifier}`);
		}

		const center: NodeReference = {
			id: centerNode.id!.toString(),
			identifier: centerNode.identifier,
			type: centerNode.type,
			name: centerNode.name,
			relationshipType: "self",
			distance: 0,
			weight: 1,
		};

		// 레벨별 이웃 노드 조회
		const [immediate, level2, level3] = await Promise.all([
			this.getImmediateNeighbors(centerNode.id!, opts),
			this.getNeighborsAtDistance(centerNode.id!, 2, opts),
			this.getNeighborsAtDistance(centerNode.id!, 3, opts),
		]);

		// 클러스터 분석
		const allNeighbors = [
			...immediate.incoming,
			...immediate.outgoing,
			...level2,
			...level3,
		];
		const clusters = await this.identifyNodeClusters(allNeighbors, opts);

		return {
			center,
			immediate,
			extended: {
				level2,
				level3,
			},
			clusters,
		};
	}

	/**
	 * 노드 진화 분석
	 */
	async analyzeNodeEvolution(
		nodeIdentifier: string,
		options: Partial<NodeAnalysisOptions> = {},
	): Promise<NodeEvolutionAnalysis> {
		const opts = { ...this.defaultOptions, ...options };

		const nodes = await this.db.findNodes({});
		const node = nodes.find((n) => n.identifier === nodeIdentifier);

		if (!node) {
			throw new Error(`Node not found: ${nodeIdentifier}`);
		}

		const nodeRef: NodeReference = {
			id: node.id!.toString(),
			identifier: node.identifier,
			type: node.type,
			name: node.name,
			relationshipType: "self",
			distance: 0,
			weight: 1,
		};

		// 변경 빈도 추정 (메타데이터 기반)
		const changeFrequency = this.estimateChangeFrequency(node);

		// 영향 반경 계산
		const impactRadius = await this.calculateImpactRadius(node.id!, opts);

		// 안정성 점수 계산
		const stabilityScore = await this.calculateStabilityScore(node.id!, opts);

		// 리팩토링 위험도 평가
		const refactoringRisk = this.assessRefactoringRisk(
			changeFrequency,
			impactRadius,
			stabilityScore,
		);

		// 추천사항 생성
		const recommendations = this.generateRecommendations(
			node,
			changeFrequency,
			impactRadius,
			stabilityScore,
		);

		return {
			node: nodeRef,
			changeFrequency,
			impactRadius,
			stabilityScore,
			refactoringRisk,
			recommendations,
		};
	}

	/**
	 * 노드 간 최단 경로 분석
	 */
	async findShortestPath(
		fromIdentifier: string,
		toIdentifier: string,
		options: Partial<NodeAnalysisOptions> = {},
	): Promise<NodeReference[] | null> {
		const opts = { ...this.defaultOptions, ...options };

		const nodes = await this.db.findNodes({
			limit: 1000, // 충분한 수로 설정
		});

		const fromNode = nodes.find((n) => n.identifier === fromIdentifier);
		const toNode = nodes.find((n) => n.identifier === toIdentifier);

		if (!fromNode || !toNode) {
			return null;
		}

		const path = await this.db.findDependencyPath(
			fromNode.id!,
			toNode.id!,
			opts.maxDepth,
		);

		if (!path) {
			return null;
		}

		return path.nodes.map((node, index) => ({
			id: node.id!.toString(),
			identifier: node.identifier,
			type: node.type,
			name: node.name,
			relationshipType:
				index === 0
					? "start"
					: index === path.nodes.length - 1
						? "end"
						: "intermediate",
			distance: index,
			weight: 1,
		}));
	}

	/**
	 * 노드 클러스터링
	 */
	async clusterRelatedNodes(
		seedIdentifiers: string[],
		options: Partial<NodeAnalysisOptions> = {},
	): Promise<NodeCluster[]> {
		const opts = { ...this.defaultOptions, ...options };

		const clusters: NodeCluster[] = [];

		for (const identifier of seedIdentifiers) {
			const neighborhood = await this.analyzeNodeNeighborhood(identifier, opts);
			const allNodes = [
				neighborhood.center,
				...neighborhood.immediate.incoming,
				...neighborhood.immediate.outgoing,
				...neighborhood.extended.level2,
			];

			const cluster: NodeCluster = {
				id: `cluster-${identifier}`,
				nodes: allNodes,
				cohesion: this.calculateClusterCohesion(allNodes),
				purpose: this.inferClusterPurpose(allNodes),
			};

			clusters.push(cluster);
		}

		return clusters;
	}

	// Private 메서드들

	private async analyzeDependencies(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeImpactAnalysis["dependencies"]> {
		const direct = await this.db.findNodeDependencies(
			nodeId,
			options.edgeTypes,
		);
		const transitive = await this.getTransitiveDependencies(nodeId, options);

		return {
			direct: direct.map((node) => this.nodeToReference(node, "dependency", 1)),
			transitive: transitive,
			depth: Math.max(...transitive.map((ref) => ref.distance), 1),
		};
	}

	private async analyzeDependents(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeImpactAnalysis["dependents"]> {
		const direct = await this.db.findNodeDependents(nodeId, options.edgeTypes);
		const transitive = await this.getTransitiveDependents(nodeId, options);

		return {
			direct: direct.map((node) => this.nodeToReference(node, "dependent", 1)),
			transitive: transitive,
			depth: Math.max(...transitive.map((ref) => ref.distance), 1),
		};
	}

	private async calculateNodeMetrics(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeImpactAnalysis["metrics"]> {
		const [dependencies, dependents] = await Promise.all([
			this.db.findNodeDependencies(nodeId, options.edgeTypes),
			this.db.findNodeDependents(nodeId, options.edgeTypes),
		]);

		const fanOut = dependencies.length;
		const fanIn = dependents.length;
		const total = fanIn + fanOut;

		const instability = total === 0 ? 0 : fanOut / total;
		const centrality = this.calculateCentrality(fanIn, fanOut);
		const criticalityScore = this.calculateCriticalityScore(
			fanIn,
			fanOut,
			instability,
		);

		return {
			fanIn,
			fanOut,
			instability,
			centrality,
			criticalityScore,
		};
	}

	private async analyzeNodeRisks(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeImpactAnalysis["risks"]> {
		const detector = createCircularDependencyDetector({
			maxDepth: options.maxDepth,
			timeout: options.timeout,
			edgeTypes: options.edgeTypes,
		});

		const circularResult = await detector.detectFromNode(
			nodeId.toString(),
			async (id) => {
				const edges = await this.db.findNodeDependencies(
					parseInt(id),
					options.edgeTypes,
				);
				return edges.map((node) => ({
					to: node.id!.toString(),
					type: "dependency",
				}));
			},
		);

		const circularDependencies: CircularRisk[] = circularResult.cycles.map(
			(cycle) => ({
				cycle: cycle.nodes,
				depth: cycle.depth,
				severity: this.assessCycleSeverity(cycle.depth, cycle.weight),
				description: `Circular dependency involving ${cycle.nodes.length} nodes`,
			}),
		);

		const [dependencies, dependents] = await Promise.all([
			this.db.findNodeDependencies(nodeId, options.edgeTypes),
			this.db.findNodeDependents(nodeId, options.edgeTypes),
		]);

		const highCoupling = dependencies.length > 10 || dependents.length > 20;
		const singlePointOfFailure = dependents.length > 50;

		return {
			circularDependencies,
			highCoupling,
			singlePointOfFailure,
		};
	}

	private async getTransitiveDependencies(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeReference[]> {
		const visited = new Set<number>();
		const result: NodeReference[] = [];

		const dfs = async (currentId: number, distance: number): Promise<void> => {
			if (distance >= options.maxDepth || visited.has(currentId)) {
				return;
			}

			visited.add(currentId);

			const dependencies = await this.db.findNodeDependencies(
				currentId,
				options.edgeTypes,
			);

			for (const dep of dependencies) {
				if (dep.id && !visited.has(dep.id)) {
					result.push(this.nodeToReference(dep, "dependency", distance + 1));
					await dfs(dep.id, distance + 1);
				}
			}
		};

		await dfs(nodeId, 0);
		return result;
	}

	private async getTransitiveDependents(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeReference[]> {
		const visited = new Set<number>();
		const result: NodeReference[] = [];

		const dfs = async (currentId: number, distance: number): Promise<void> => {
			if (distance >= options.maxDepth || visited.has(currentId)) {
				return;
			}

			visited.add(currentId);

			const dependents = await this.db.findNodeDependents(
				currentId,
				options.edgeTypes,
			);

			for (const dep of dependents) {
				if (dep.id && !visited.has(dep.id)) {
					result.push(this.nodeToReference(dep, "dependent", distance + 1));
					await dfs(dep.id, distance + 1);
				}
			}
		};

		await dfs(nodeId, 0);
		return result;
	}

	private async getImmediateNeighbors(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<{ incoming: NodeReference[]; outgoing: NodeReference[] }> {
		const [dependencies, dependents] = await Promise.all([
			this.db.findNodeDependencies(nodeId, options.edgeTypes),
			this.db.findNodeDependents(nodeId, options.edgeTypes),
		]);

		return {
			incoming: dependents.map((node) =>
				this.nodeToReference(node, "dependent", 1),
			),
			outgoing: dependencies.map((node) =>
				this.nodeToReference(node, "dependency", 1),
			),
		};
	}

	private async getNeighborsAtDistance(
		nodeId: number,
		distance: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeReference[]> {
		// BFS로 특정 거리의 노드들 찾기
		const visited = new Set<number>();
		const queue: Array<{ id: number; dist: number }> = [
			{ id: nodeId, dist: 0 },
		];
		const result: NodeReference[] = [];

		while (queue.length > 0) {
			const { id, dist } = queue.shift()!;

			if (visited.has(id)) continue;
			visited.add(id);

			if (dist === distance) {
				const nodes = await this.db.findNodes({});
				const node = nodes.find((n) => n.id === id);
				if (node) {
					result.push(this.nodeToReference(node, "neighbor", distance));
				}
				continue;
			}

			if (dist < distance) {
				const neighbors = await this.db.findNodeDependencies(
					id,
					options.edgeTypes,
				);
				for (const neighbor of neighbors) {
					if (neighbor.id && !visited.has(neighbor.id)) {
						queue.push({ id: neighbor.id, dist: dist + 1 });
					}
				}
			}
		}

		return result;
	}

	private async identifyNodeClusters(
		nodes: NodeReference[],
		options: Required<NodeAnalysisOptions>,
	): Promise<NodeCluster[]> {
		// 간단한 클러스터링 알고리즘 (타입 기반)
		const clusters: NodeCluster[] = [];
		const nodesByType = new Map<string, NodeReference[]>();

		nodes.forEach((node) => {
			if (!nodesByType.has(node.type)) {
				nodesByType.set(node.type, []);
			}
			nodesByType.get(node.type)!.push(node);
		});

		for (const [type, typeNodes] of nodesByType) {
			if (typeNodes.length >= 2) {
				clusters.push({
					id: `cluster-${type}`,
					nodes: typeNodes,
					cohesion: this.calculateClusterCohesion(typeNodes),
					purpose: this.inferClusterPurpose(typeNodes),
				});
			}
		}

		return clusters;
	}

	private nodeToReference(
		node: any,
		relationshipType: string,
		distance: number,
	): NodeReference {
		return {
			id: node.id?.toString() || "0",
			identifier: node.identifier,
			type: node.type,
			name: node.name,
			relationshipType,
			distance,
			weight: 1,
		};
	}

	private calculateCentrality(fanIn: number, fanOut: number): number {
		return Math.sqrt(fanIn * fanOut);
	}

	private calculateCriticalityScore(
		fanIn: number,
		fanOut: number,
		instability: number,
	): number {
		return (fanIn + fanOut) * (1 - instability);
	}

	private assessCycleSeverity(
		depth: number,
		weight: number,
	): "low" | "medium" | "high" {
		if (depth <= 2) return "low";
		if (depth <= 4 || weight > 10) return "medium";
		return "high";
	}

	private estimateChangeFrequency(node: any): number {
		// 메타데이터나 파일 정보 기반으로 변경 빈도 추정
		return Math.random(); // 실제로는 git 이력이나 메타데이터 활용
	}

	private async calculateImpactRadius(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<number> {
		const transitiveDependents = await this.getTransitiveDependents(
			nodeId,
			options,
		);
		return Math.max(...transitiveDependents.map((ref) => ref.distance), 0);
	}

	private async calculateStabilityScore(
		nodeId: number,
		options: Required<NodeAnalysisOptions>,
	): Promise<number> {
		const [dependencies, dependents] = await Promise.all([
			this.db.findNodeDependencies(nodeId, options.edgeTypes),
			this.db.findNodeDependents(nodeId, options.edgeTypes),
		]);

		const fanOut = dependencies.length;
		const fanIn = dependents.length;
		const total = fanIn + fanOut;

		return total === 0 ? 1 : fanIn / total; // 안정성은 들어오는 의존성 비율
	}

	private assessRefactoringRisk(
		changeFrequency: number,
		impactRadius: number,
		stabilityScore: number,
	): "low" | "medium" | "high" {
		const riskScore = changeFrequency * impactRadius * (1 - stabilityScore);

		if (riskScore < 0.3) return "low";
		if (riskScore < 0.7) return "medium";
		return "high";
	}

	private generateRecommendations(
		node: any,
		changeFrequency: number,
		impactRadius: number,
		stabilityScore: number,
	): string[] {
		const recommendations: string[] = [];

		if (changeFrequency > 0.7) {
			recommendations.push(
				"Consider stabilizing this frequently changing component",
			);
		}

		if (impactRadius > 5) {
			recommendations.push(
				"High impact radius - changes affect many components",
			);
		}

		if (stabilityScore < 0.3) {
			recommendations.push(
				"Low stability - consider reducing outgoing dependencies",
			);
		}

		return recommendations;
	}

	private calculateClusterCohesion(nodes: NodeReference[]): number {
		// 클러스터 내 노드들의 응집도 계산
		return Math.min(1, nodes.length / 10);
	}

	private inferClusterPurpose(nodes: NodeReference[]): string {
		const types = new Set(nodes.map((n) => n.type));
		if (types.has("class") && types.has("method")) {
			return "Object-oriented module";
		}
		if (types.has("function")) {
			return "Functional module";
		}
		return `${nodes[0]?.type || "Mixed"} collection`;
	}
}

/**
 * 노드 중심 분석기 팩토리
 */
export function createNodeCentricAnalyzer(
	db: GraphDatabase,
	queryEngine: GraphQueryEngine,
	nodeIdentifier: NodeIdentifier,
	options?: Partial<NodeAnalysisOptions>,
): NodeCentricAnalyzer {
	return new NodeCentricAnalyzer(db, queryEngine, nodeIdentifier, options);
}
