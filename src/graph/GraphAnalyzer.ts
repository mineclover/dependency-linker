/**
 * Graph Analyzer
 * 의존성 그래프 분석 및 인사이트 제공
 */

import type {
	DependencyGraph,
	GraphAnalysisResult,
} from "./types";

/**
 * 그래프 분석기 클래스
 */
export class GraphAnalyzer {
	private graph: DependencyGraph;

	constructor(graph: DependencyGraph) {
		this.graph = graph;
	}

	/**
	 * 전체 그래프 분석
	 */
	analyze(): GraphAnalysisResult {
		return {
			circularDependencies: this.analyzeCircularDependencies(),
			dependencyDepth: this.analyzeDependencyDepth(),
			hubFiles: this.analyzeHubFiles(),
			isolatedFiles: this.findIsolatedFiles(),
			unresolvedDependencies: this.findUnresolvedDependencies(),
		};
	}

	/**
	 * 순환 의존성 분석
	 */
	private analyzeCircularDependencies() {
		const cycles = this.graph.metadata.circularDependencies;

		return {
			cycles,
			totalCycles: cycles.length,
			maxDepth: cycles.length > 0 ?
				Math.max(...cycles.map(cycle => cycle.length)) : 0,
		};
	}

	/**
	 * 의존성 깊이 분석
	 */
	private analyzeDependencyDepth() {
		const depths = new Map<string, number>();
		const visited = new Set<string>();

		// 각 노드의 의존성 깊이 계산
		const calculateDepth = (nodeId: string, currentDepth: number): number => {
			if (visited.has(nodeId)) {
				return depths.get(nodeId) || 0;
			}

			visited.add(nodeId);

			const dependencies = this.graph.edges
				.filter(edge => edge.from === nodeId)
				.map(edge => edge.to)
				.filter(depId => this.graph.nodes.has(depId) &&
					this.graph.nodes.get(depId)?.type === "internal");

			if (dependencies.length === 0) {
				depths.set(nodeId, currentDepth);
				return currentDepth;
			}

			let maxDepth = currentDepth;
			for (const depId of dependencies) {
				const depDepth = calculateDepth(depId, currentDepth + 1);
				maxDepth = Math.max(maxDepth, depDepth);
			}

			depths.set(nodeId, maxDepth);
			return maxDepth;
		};

		// 모든 내부 노드에 대해 깊이 계산
		for (const [nodeId, node] of this.graph.nodes) {
			if (node.type === "internal") {
				calculateDepth(nodeId, 0);
			}
		}

		const depthValues = Array.from(depths.values());
		const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;
		const averageDepth = depthValues.length > 0 ?
			depthValues.reduce((sum, depth) => sum + depth, 0) / depthValues.length : 0;

		// 깊이별 분포
		const depthDistribution: Record<number, number> = {};
		depthValues.forEach(depth => {
			depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;
		});

		return {
			maxDepth,
			averageDepth,
			depthDistribution,
		};
	}

	/**
	 * 허브 파일 분석 (많이 의존되는 파일)
	 */
	private analyzeHubFiles() {
		const incomingCount = new Map<string, number>();
		const outgoingCount = new Map<string, number>();

		// 들어오는/나가는 의존성 카운트
		this.graph.edges.forEach(edge => {
			// 들어오는 의존성 (다른 파일이 이 파일을 의존)
			incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);

			// 나가는 의존성 (이 파일이 다른 파일을 의존)
			outgoingCount.set(edge.from, (outgoingCount.get(edge.from) || 0) + 1);
		});

		const hubFiles = Array.from(this.graph.nodes.entries())
			.filter(([_, node]) => node.type === "internal")
			.map(([nodeId, node]) => {
				const incoming = incomingCount.get(nodeId) || 0;
				const outgoing = outgoingCount.get(nodeId) || 0;

				// 허브 점수: 들어오는 의존성에 더 큰 가중치
				const hubScore = incoming * 2 + outgoing;

				return {
					filePath: node.filePath,
					incomingDependencies: incoming,
					outgoingDependencies: outgoing,
					hubScore,
				};
			})
			.sort((a, b) => b.hubScore - a.hubScore)
			.slice(0, 10); // 상위 10개만

		return hubFiles;
	}

	/**
	 * 고립된 파일 찾기 (의존성이 없는 파일)
	 */
	private findIsolatedFiles(): string[] {
		const connectedNodes = new Set<string>();

		// 연결된 노드들 수집
		this.graph.edges.forEach(edge => {
			connectedNodes.add(edge.from);
			connectedNodes.add(edge.to);
		});

		// 연결되지 않은 내부 노드들 찾기
		const isolatedFiles: string[] = [];
		for (const [nodeId, node] of this.graph.nodes) {
			if (node.type === "internal" && !connectedNodes.has(nodeId)) {
				isolatedFiles.push(node.filePath);
			}
		}

		return isolatedFiles;
	}

	/**
	 * 미해결 의존성 찾기
	 */
	private findUnresolvedDependencies() {
		const unresolvedDeps: GraphAnalysisResult["unresolvedDependencies"] = [];

		this.graph.edges.forEach(edge => {
			const toNode = this.graph.nodes.get(edge.to);

			// 노드가 존재하지 않거나 파일이 존재하지 않는 경우
			if (!toNode || !toNode.exists) {
				const fromNode = this.graph.nodes.get(edge.from);
				if (fromNode?.dependency) {
					// 원본 import 문 찾기
					const originalImport = fromNode.dependency.directDependencies
						.find(dep => edge.to.includes(dep)) || edge.to;

					unresolvedDeps.push({
						from: edge.from,
						to: edge.to,
						originalImport,
					});
				}
			}
		});

		return unresolvedDeps;
	}

	/**
	 * 특정 파일의 의존성 트리 분석
	 */
	getDependencyTree(filePath: string, maxDepth = 5): any {
		const buildTree = (nodeId: string, currentDepth: number): any => {
			if (currentDepth >= maxDepth) {
				return { filePath: nodeId, truncated: true };
			}

			const node = this.graph.nodes.get(nodeId);
			if (!node) {
				return { filePath: nodeId, exists: false };
			}

			const dependencies = this.graph.edges
				.filter(edge => edge.from === nodeId)
				.map(edge => edge.to)
				.filter(depId => this.graph.nodes.has(depId))
				.map(depId => buildTree(depId, currentDepth + 1));

			return {
				filePath: node.filePath,
				type: node.type,
				exists: node.exists,
				dependencies: dependencies.length > 0 ? dependencies : undefined,
			};
		};

		return buildTree(filePath, 0);
	}

	/**
	 * 특정 파일에 의존하는 파일들 찾기
	 */
	getDependents(filePath: string): string[] {
		return this.graph.edges
			.filter(edge => edge.to === filePath)
			.map(edge => edge.from)
			.filter(fromId => this.graph.nodes.has(fromId));
	}

	/**
	 * 특정 파일이 의존하는 파일들 찾기
	 */
	getDependencies(filePath: string): string[] {
		return this.graph.edges
			.filter(edge => edge.from === filePath)
			.map(edge => edge.to)
			.filter(toId => this.graph.nodes.has(toId));
	}

	/**
	 * 두 파일 간의 의존성 경로 찾기
	 */
	findDependencyPath(from: string, to: string): string[] | null {
		const visited = new Set<string>();
		const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];

		while (queue.length > 0) {
			const { node, path } = queue.shift()!;

			if (node === to) {
				return path;
			}

			if (visited.has(node)) {
				continue;
			}

			visited.add(node);

			// 직접 의존성들을 큐에 추가
			const dependencies = this.graph.edges
				.filter(edge => edge.from === node)
				.map(edge => edge.to)
				.filter(depId => this.graph.nodes.has(depId) && !visited.has(depId));

			for (const dep of dependencies) {
				queue.push({ node: dep, path: [...path, dep] });
			}
		}

		return null; // 경로를 찾지 못함
	}

	/**
	 * 그래프 통계 요약
	 */
	getStatistics() {
		const internalNodes = Array.from(this.graph.nodes.values())
			.filter(node => node.type === "internal");

		const externalNodes = Array.from(this.graph.nodes.values())
			.filter(node => node.type === "external");

		const languageDistribution: Record<string, number> = {};
		internalNodes.forEach(node => {
			if (node.language) {
				languageDistribution[node.language] =
					(languageDistribution[node.language] || 0) + 1;
			}
		});

		return {
			totalFiles: this.graph.metadata.totalFiles,
			internalFiles: internalNodes.length,
			externalPackages: externalNodes.length,
			totalDependencies: this.graph.metadata.totalDependencies,
			circularDependencies: this.graph.metadata.circularDependencies.length,
			languageDistribution,
			analysisTime: this.graph.metadata.analysisTime,
		};
	}
}

/**
 * 그래프 분석기 팩토리 함수
 */
export function createGraphAnalyzer(graph: DependencyGraph): GraphAnalyzer {
	return new GraphAnalyzer(graph);
}

/**
 * 간단한 그래프 분석 함수
 */
export function analyzeGraph(graph: DependencyGraph): GraphAnalysisResult {
	const analyzer = createGraphAnalyzer(graph);
	return analyzer.analyze();
}