/**
 * Unknown Node Resolver
 *
 * Unknown 노드를 실제 타입 노드와 자동으로 연결하는 Resolution 엔진
 *
 * @module UnknownNodeResolver
 * @see features/type-management/UNKNOWN_NODE_RESOLUTION.md
 */

import type {
	GraphDatabase,
	GraphNode,
	GraphRelationship,
} from "../GraphDatabase";

/**
 * Resolution 결과
 */
export interface ResolutionResult {
	/** 성공적으로 해소된 노드 목록 */
	resolved: ResolvedNode[];

	/** 해소 실패한 노드 목록 */
	unresolved: UnresolvedNode[];

	/** 통계 정보 */
	statistics: ResolutionStatistics;
}

/**
 * 해소된 노드 정보
 */
export interface ResolvedNode {
	/** Unknown 노드 */
	unknown: GraphNode;

	/** 실제 타입 노드 */
	actual: GraphNode;

	/** 신뢰도 (0.0 ~ 1.0) */
	confidence: number;
}

/**
 * 미해소 노드 정보
 */
export interface UnresolvedNode {
	/** Unknown 노드 */
	node: GraphNode;

	/** 미해소 이유 */
	reason: UnresolvedReason;
}

/**
 * 미해소 이유
 */
export type UnresolvedReason =
	| "no_candidates" // 매칭 후보 없음
	| "external" // 외부 라이브러리
	| "dynamic" // 동적 import
	| "ambiguous"; // 모호한 매칭 (여러 후보)

/**
 * Resolution 통계
 */
export interface ResolutionStatistics {
	/** 전체 Unknown 노드 수 */
	total: number;

	/** 해소 성공 수 */
	resolvedCount: number;

	/** 해소 실패 수 */
	unresolvedCount: number;

	/** 성공률 (0.0 ~ 1.0) */
	successRate: number;

	/** 해소된 Alias 체인 수 */
	aliasChains: number;

	/** 평균 Alias 체인 길이 */
	avgChainLength: number;
}

/**
 * Unknown 노드 해소 엔진
 *
 * Unknown 노드를 실제 타입 노드(Method, Class, Function 등)와 매칭하여
 * resolvedTo 관계로 연결합니다.
 *
 * @example
 * ```typescript
 * const resolver = new UnknownNodeResolver(db);
 * const result = await resolver.resolveAll();
 *
 * console.log(`Resolved: ${result.statistics.resolvedCount}/${result.statistics.total}`);
 * console.log(`Success rate: ${(result.statistics.successRate * 100).toFixed(1)}%`);
 * ```
 */
export class UnknownNodeResolver {
	/**
	 * 노드 타입 우선순위
	 *
	 * 같은 이름의 여러 심볼이 있을 때 우선적으로 선택되는 순서
	 */
	private static readonly TYPE_PRIORITY = [
		"class",
		"function",
		"interface",
		"type-alias",
		"method",
		"variable",
		"constant",
		"symbol",
	];

	/**
	 * Alias 체인 최대 길이
	 *
	 * 순환 alias 감지 및 무한 루프 방지
	 */
	private static readonly MAX_CHAIN_DEPTH = 10;

	constructor(private db: GraphDatabase) {}

	/**
	 * 모든 Unknown 노드 해소
	 *
	 * @returns Resolution 결과 (성공/실패 목록 및 통계)
	 *
	 * @example
	 * ```typescript
	 * const result = await resolver.resolveAll();
	 *
	 * // 성공 사례
	 * for (const { unknown, actual, confidence } of result.resolved) {
	 *   console.log(`${unknown.name} → ${actual.type}:${actual.name} (${confidence})`);
	 * }
	 *
	 * // 실패 사례
	 * for (const { node, reason } of result.unresolved) {
	 *   console.log(`${node.name}: ${reason}`);
	 * }
	 * ```
	 */
	async resolveAll(): Promise<ResolutionResult> {
		const unknownNodes = await this.findAllUnknownNodes();

		const resolved: ResolvedNode[] = [];
		const unresolved: UnresolvedNode[] = [];
		let aliasChainCount = 0;
		let totalChainLength = 0;

		for (const unknown of unknownNodes) {
			const actual = await this.findActualNode(unknown);

			if (actual) {
				// resolvedTo 관계 생성
				await this.createResolutionEdge(unknown, actual);

				resolved.push({
					unknown,
					actual,
					confidence: 1.0, // 규칙 기반이므로 100%
				});

				// Alias 체인 추적
				if (unknown.metadata?.isAlias) {
					aliasChainCount++;
					const chainLength = await this.getAliasChainLength(unknown.id!);
					totalChainLength += chainLength;
				}
			} else {
				// 해소 실패 - 이유 판단
				const reason = await this.determineUnresolvedReason(unknown);
				unresolved.push({ node: unknown, reason });
			}
		}

		const statistics: ResolutionStatistics = {
			total: unknownNodes.length,
			resolvedCount: resolved.length,
			unresolvedCount: unresolved.length,
			successRate:
				unknownNodes.length > 0 ? resolved.length / unknownNodes.length : 0,
			aliasChains: aliasChainCount,
			avgChainLength:
				aliasChainCount > 0 ? totalChainLength / aliasChainCount : 0,
		};

		return { resolved, unresolved, statistics };
	}

	/**
	 * Unknown 노드에 매칭되는 실제 타입 노드 찾기
	 *
	 * **매칭 규칙**:
	 * - 같은 sourceFile
	 * - 같은 name (또는 metadata.name)
	 * - type !== "unknown"
	 *
	 * @param unknown Unknown 노드
	 * @returns 매칭된 실제 타입 노드 또는 null
	 */
	private async findActualNode(unknown: GraphNode): Promise<GraphNode | null> {
		// 1. 같은 sourceFile로 모든 노드 검색
		const candidates = await this.db.findNodes({
			sourceFiles: [unknown.sourceFile],
		});

		// 2. name 매칭 필터링
		const matched = candidates.filter((node) => {
			if (node.type === "unknown") return false;

			// node.name 또는 node.metadata?.name과 매칭
			const nodeName = node.name || node.metadata?.name;
			return nodeName === unknown.name;
		});

		if (matched.length === 0) {
			return null;
		}

		// 3. 우선순위 기반 최적 매칭 선택
		return this.selectBestMatch(matched);
	}

	/**
	 * 우선순위 기반 최적 매칭 선택
	 *
	 * 같은 이름의 여러 심볼이 있을 때 우선순위가 높은 타입 선택
	 *
	 * @param candidates 매칭 후보 노드 목록
	 * @returns 우선순위가 가장 높은 노드
	 */
	private selectBestMatch(candidates: GraphNode[]): GraphNode {
		for (const type of UnknownNodeResolver.TYPE_PRIORITY) {
			const match = candidates.find((c) => c.type === type);
			if (match) {
				return match;
			}
		}

		// 우선순위에 없는 타입이면 첫 번째 반환
		return candidates[0];
	}

	/**
	 * resolvedTo 관계 생성
	 *
	 * Unknown 노드 → 실제 타입 노드 관계 생성
	 *
	 * @param unknown Unknown 노드
	 * @param actual 실제 타입 노드
	 */
	private async createResolutionEdge(
		unknown: GraphNode,
		actual: GraphNode,
	): Promise<void> {
		if (!unknown.id || !actual.id) {
			throw new Error("Node IDs are required for relationship creation");
		}

		const actualName = actual.name || actual.metadata?.name || "<unnamed>";
		const relationship: GraphRelationship = {
			fromNodeId: unknown.id,
			toNodeId: actual.id,
			type: "resolvedTo",
			label: `${unknown.name} resolved to ${actual.type}:${actualName}`,
			metadata: {
				isInferred: true,
				confidence: 1.0, // 규칙 기반이므로 100%
				resolvedAt: new Date().toISOString(),
			},
			weight: 1,
			sourceFile: unknown.sourceFile,
		};

		await this.db.upsertRelationship(relationship);
	}

	/**
	 * Alias 체인 해소
	 *
	 * aliasOf와 resolvedTo 관계를 따라가 최종 실제 타입 노드 반환
	 *
	 * @param nodeId 시작 노드 ID
	 * @returns 최종 실제 타입 노드 또는 null
	 *
	 * @example
	 * ```typescript
	 * // UserType --aliasOf--> User --resolvedTo--> Class:User
	 * const actual = await resolver.resolveAliasChain(userTypeId);
	 * // → Class:User 반환
	 * ```
	 */
	async resolveAliasChain(nodeId: number): Promise<GraphNode | null> {
		const visited = new Set<number>();
		let currentId: number | null = nodeId;
		let depth = 0;

		while (currentId !== null && !visited.has(currentId)) {
			// 순환 및 최대 depth 체크
			if (depth >= UnknownNodeResolver.MAX_CHAIN_DEPTH) {
				console.warn(
					`Alias chain exceeded max depth (${UnknownNodeResolver.MAX_CHAIN_DEPTH})`,
				);
				break;
			}

			visited.add(currentId);

			// 현재 노드 조회 (모든 노드 가져온 후 필터링)
			const allNodes = await this.db.findNodes({});
			const nodes = allNodes.filter((n) => n.id === currentId);
			if (nodes.length === 0) {
				return null;
			}

			const current = nodes[0];

			// 1. aliasOf 관계 찾기
			const aliasEdges = await this.db.findRelationships({
				relationshipTypes: ["aliasOf"],
			});
			const currentAliasEdges = aliasEdges.filter(
				(e) => e.fromNodeId === currentId,
			);

			if (currentAliasEdges.length > 0) {
				currentId = currentAliasEdges[0].toNodeId;
				depth++;
				continue;
			}

			// 2. resolvedTo 관계 찾기
			const resolvedEdges = await this.db.findRelationships({
				relationshipTypes: ["resolvedTo"],
			});
			const currentResolvedEdges = resolvedEdges.filter(
				(e) => e.fromNodeId === currentId,
			);

			if (currentResolvedEdges.length > 0) {
				const actualId = currentResolvedEdges[0].toNodeId;
				const actualNodes = allNodes.filter((n) => n.id === actualId);
				return actualNodes.length > 0 ? actualNodes[0] : null;
			}

			// 더 이상 관계가 없으면 현재 노드 반환
			return current;
		}

		// 순환 감지 또는 max depth 초과
		if (currentId !== null) {
			const allNodes = await this.db.findNodes({});
			const nodes = allNodes.filter((n) => n.id === currentId);
			return nodes.length > 0 ? nodes[0] : null;
		}

		return null;
	}

	/**
	 * 모든 Unknown 노드 조회
	 *
	 * @returns Unknown 타입 노드 목록
	 */
	private async findAllUnknownNodes(): Promise<GraphNode[]> {
		return await this.db.findNodes({
			nodeTypes: ["unknown"],
		});
	}

	/**
	 * 미해소 이유 판단
	 *
	 * @param unknown Unknown 노드
	 * @returns 미해소 이유
	 */
	private async determineUnresolvedReason(
		unknown: GraphNode,
	): Promise<UnresolvedReason> {
		// 외부 라이브러리 감지 (node_modules 경로)
		if (unknown.sourceFile?.includes("node_modules")) {
			return "external";
		}

		// 동적 import 감지 (메타데이터에 표시)
		if (unknown.metadata?.isDynamic) {
			return "dynamic";
		}

		// 후보 노드 확인
		const candidates = await this.db.findNodes({
			sourceFiles: [unknown.sourceFile],
		});

		const matched = candidates.filter((node) => {
			if (node.type === "unknown") return false;
			const nodeName = node.name || node.metadata?.name;
			return nodeName === unknown.name;
		});

		// 후보가 전혀 없음
		if (matched.length === 0) {
			return "no_candidates";
		}

		// 후보가 여러 개 (모호함)
		if (matched.length > 1) {
			return "ambiguous";
		}

		// 기본값
		return "no_candidates";
	}

	/**
	 * Alias 체인 길이 계산
	 *
	 * @param nodeId 시작 노드 ID
	 * @returns 체인 길이
	 */
	private async getAliasChainLength(nodeId: number): Promise<number> {
		const visited = new Set<number>();
		let currentId: number | null = nodeId;
		let length = 0;

		while (currentId !== null && !visited.has(currentId)) {
			visited.add(currentId);

			const aliasEdges = await this.db.findRelationships({
				relationshipTypes: ["aliasOf"],
			});
			const currentEdges = aliasEdges.filter((e) => e.fromNodeId === currentId);

			if (currentEdges.length === 0) {
				break;
			}

			currentId = currentEdges[0].toNodeId;
			length++;

			if (length >= UnknownNodeResolver.MAX_CHAIN_DEPTH) {
				break;
			}
		}

		return length;
	}
}
