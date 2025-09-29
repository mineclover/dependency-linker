/**
 * Circular Dependency Detector
 * 순환 의존성 탐지 시스템 - 깊이 제한과 성능 최적화
 */

export interface CircularDependencyOptions {
  maxDepth: number;
  maxCycles: number;
  timeout: number;
  edgeTypes: string[];
  excludeNodeTypes?: string[];
}

export interface CircularPath {
  nodes: string[];
  edges: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  depth: number;
  weight: number;
}

export interface CircularDependencyResult {
  cycles: CircularPath[];
  stats: {
    totalNodesVisited: number;
    maxDepthReached: number;
    timeoutOccurred: boolean;
    processingTime: number;
  };
  truncated: boolean;
}

/**
 * 고성능 순환 의존성 탐지기
 *
 * 특징:
 * - 깊이 제한으로 무한 루프 방지
 * - 시간 제한으로 대형 프로젝트 처리
 * - 메모리 효율적인 DFS 구현
 * - 중복 cycle 제거
 */
export class CircularDependencyDetector {
  private visited = new Set<string>();
  private recursionStack = new Set<string>();
  private pathStack: string[] = [];
  private edgeStack: Array<{ from: string; to: string; type: string }> = [];

  private cycles: CircularPath[] = [];
  private nodeTypeMap = new Map<string, string>();
  private stats = {
    totalNodesVisited: 0,
    maxDepthReached: 0,
    timeoutOccurred: false,
    processingTime: 0,
  };

  private startTime = 0;
  private readonly options: Required<CircularDependencyOptions>;

  constructor(options: Partial<CircularDependencyOptions> = {}) {
    this.options = {
      maxDepth: 20,
      maxCycles: 100,
      timeout: 30000, // 30초
      edgeTypes: ['imports', 'depends_on'],
      excludeNodeTypes: ['library', 'package'],
      ...options,
    };
  }

  /**
   * 순환 의존성 탐지 실행
   */
  async detect(
    getEdges: (nodeId: string) => Promise<Array<{ to: string; type: string }>>,
    getAllNodes: () => Promise<Array<{ id: string; type: string }>>
  ): Promise<CircularDependencyResult> {
    this.reset();
    this.startTime = Date.now();

    try {
      const allNodes = await getAllNodes();

      // 노드 타입 매핑 구축
      this.nodeTypeMap.clear();
      for (const node of allNodes) {
        this.nodeTypeMap.set(node.id, node.type);
      }

      const filteredNodes = allNodes.filter(
        node => !this.options.excludeNodeTypes.includes(node.type)
      );

      for (const node of filteredNodes) {
        if (this.shouldStop()) {
          break;
        }

        if (!this.visited.has(node.id)) {
          await this.dfs(node.id, getEdges);
        }
      }

      this.stats.processingTime = Date.now() - this.startTime;

      return {
        cycles: this.cycles,
        stats: this.stats,
        truncated: this.cycles.length >= this.options.maxCycles || this.stats.timeoutOccurred,
      };

    } catch (error) {
      this.stats.processingTime = Date.now() - this.startTime;
      throw new Error(`Circular dependency detection failed: ${error}`);
    }
  }

  /**
   * 특정 노드에서 시작하는 순환 의존성 탐지
   */
  async detectFromNode(
    startNodeId: string,
    getEdges: (nodeId: string) => Promise<Array<{ to: string; type: string }>>
  ): Promise<CircularDependencyResult> {
    this.reset();
    this.startTime = Date.now();

    try {
      await this.dfs(startNodeId, getEdges);

      this.stats.processingTime = Date.now() - this.startTime;

      return {
        cycles: this.cycles,
        stats: this.stats,
        truncated: this.stats.timeoutOccurred,
      };

    } catch (error) {
      this.stats.processingTime = Date.now() - this.startTime;
      throw new Error(`Circular dependency detection from node failed: ${error}`);
    }
  }

  /**
   * 두 노드 간 순환 경로 찾기
   */
  async findCircularPath(
    nodeA: string,
    nodeB: string,
    getEdges: (nodeId: string) => Promise<Array<{ to: string; type: string }>>
  ): Promise<CircularPath | null> {
    // A에서 B로의 경로와 B에서 A로의 경로를 각각 찾기
    const pathAtoB = await this.findPath(nodeA, nodeB, getEdges);
    if (!pathAtoB) return null;

    const pathBtoA = await this.findPath(nodeB, nodeA, getEdges);
    if (!pathBtoA) return null;

    // 순환 경로 구성
    const combinedNodes = [...pathAtoB.nodes, ...pathBtoA.nodes.slice(1)];
    const combinedEdges = [...pathAtoB.edges, ...pathBtoA.edges];

    return {
      nodes: combinedNodes,
      edges: combinedEdges,
      depth: combinedNodes.length,
      weight: combinedEdges.reduce((sum, edge) => sum + 1, 0), // 단순 카운트
    };
  }

  // Private 메서드들

  private async dfs(
    nodeId: string,
    getEdges: (nodeId: string) => Promise<Array<{ to: string; type: string }>>
  ): Promise<void> {
    if (this.shouldStop()) {
      return;
    }

    // 순환 감지
    if (this.recursionStack.has(nodeId)) {
      this.handleCycleDetected(nodeId);
      return;
    }

    // 이미 방문한 노드는 스킵
    if (this.visited.has(nodeId)) {
      return;
    }

    // 깊이 제한 확인
    if (this.pathStack.length >= this.options.maxDepth) {
      this.stats.maxDepthReached = Math.max(
        this.stats.maxDepthReached,
        this.pathStack.length
      );
      return;
    }

    // 노드 방문 처리
    this.visited.add(nodeId);
    this.recursionStack.add(nodeId);
    this.pathStack.push(nodeId);
    this.stats.totalNodesVisited++;

    try {
      // 연결된 노드들 탐색
      const edges = await getEdges(nodeId);
      const relevantEdges = edges.filter(edge =>
        this.options.edgeTypes.includes(edge.type)
      );

      for (const edge of relevantEdges) {
        // 제외된 노드 타입인지 확인
        const targetNodeType = this.nodeTypeMap.get(edge.to);
        if (targetNodeType && this.options.excludeNodeTypes.includes(targetNodeType)) {
          continue; // 제외된 노드 타입이면 건너뛰기
        }

        this.edgeStack.push({
          from: nodeId,
          to: edge.to,
          type: edge.type,
        });

        await this.dfs(edge.to, getEdges);

        this.edgeStack.pop();

        if (this.shouldStop()) {
          break;
        }
      }

    } finally {
      // 백트래킹
      this.recursionStack.delete(nodeId);
      this.pathStack.pop();
    }
  }

  private handleCycleDetected(cycleStartNode: string): void {
    if (this.cycles.length >= this.options.maxCycles) {
      return;
    }

    // 순환 경로 추출
    const cycleStartIndex = this.pathStack.indexOf(cycleStartNode);
    if (cycleStartIndex === -1) {
      return;
    }

    const cycleNodes = [
      ...this.pathStack.slice(cycleStartIndex),
      cycleStartNode, // 순환 완성
    ];

    // 해당하는 엣지들 추출
    const cycleEdges: Array<{ from: string; to: string; type: string }> = [];
    for (let i = 0; i < cycleNodes.length - 1; i++) {
      const from = cycleNodes[i];
      const to = cycleNodes[i + 1];

      // edgeStack에서 해당 엣지 찾기
      const edge = this.edgeStack.find(e => e.from === from && e.to === to);
      if (edge) {
        cycleEdges.push(edge);
      }
    }

    // 중복 사이클 확인
    if (this.isDuplicateCycle(cycleNodes)) {
      return;
    }

    // 사이클 추가
    const cycle: CircularPath = {
      nodes: cycleNodes,
      edges: cycleEdges,
      depth: cycleNodes.length - 1,
      weight: this.calculateCycleWeight(cycleEdges),
    };

    this.cycles.push(cycle);
  }

  private isDuplicateCycle(nodes: string[]): boolean {
    // 정규화된 사이클 비교 (시작점과 방향에 무관하게)
    const normalized = this.normalizeCycle(nodes);

    return this.cycles.some(existingCycle => {
      const existingNormalized = this.normalizeCycle(existingCycle.nodes);
      return this.arraysEqual(normalized, existingNormalized);
    });
  }

  private normalizeCycle(nodes: string[]): string[] {
    if (nodes.length <= 1) return nodes;

    // 마지막 노드가 첫 번째와 같으면 제거
    const cycle = nodes[nodes.length - 1] === nodes[0]
      ? nodes.slice(0, -1)
      : nodes;

    if (cycle.length === 0) return cycle;

    // 사전순으로 가장 작은 노드를 시작점으로
    const minNode = cycle.reduce((min, current) => current < min ? current : min);
    const minIndex = cycle.indexOf(minNode);
    return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  private calculateCycleWeight(edges: Array<{ from: string; to: string; type: string }>): number {
    // 엣지 타입에 따른 가중치 계산
    const typeWeights: Record<string, number> = {
      'imports': 1,
      'depends_on': 2,
      'calls': 3,
      'extends': 4,
      'implements': 2,
    };

    return edges.reduce((total, edge) => {
      return total + (typeWeights[edge.type] || 1);
    }, 0);
  }

  private async findPath(
    start: string,
    target: string,
    getEdges: (nodeId: string) => Promise<Array<{ to: string; type: string }>>
  ): Promise<{ nodes: string[]; edges: Array<{ from: string; to: string; type: string }> } | null> {
    const visited = new Set<string>();
    const queue: Array<{
      node: string;
      path: string[];
      edges: Array<{ from: string; to: string; type: string }>;
    }> = [{ node: start, path: [start], edges: [] }];

    while (queue.length > 0) {
      const { node, path, edges } = queue.shift()!;

      if (node === target) {
        return { nodes: path, edges };
      }

      if (visited.has(node) || path.length > this.options.maxDepth) {
        continue;
      }

      visited.add(node);

      const nodeEdges = await getEdges(node);
      for (const edge of nodeEdges) {
        if (!this.options.edgeTypes.includes(edge.type)) {
          continue;
        }

        if (!visited.has(edge.to)) {
          queue.push({
            node: edge.to,
            path: [...path, edge.to],
            edges: [...edges, { from: node, to: edge.to, type: edge.type }],
          });
        }
      }
    }

    return null;
  }

  private shouldStop(): boolean {
    return (
      this.cycles.length >= this.options.maxCycles ||
      (Date.now() - this.startTime) > this.options.timeout
    );
  }

  private reset(): void {
    this.visited.clear();
    this.recursionStack.clear();
    this.pathStack = [];
    this.edgeStack = [];
    this.cycles = [];
    this.nodeTypeMap.clear();
    this.stats = {
      totalNodesVisited: 0,
      maxDepthReached: 0,
      timeoutOccurred: false,
      processingTime: 0,
    };
  }
}

/**
 * 순환 의존성 탐지기 팩토리
 */
export function createCircularDependencyDetector(
  options?: Partial<CircularDependencyOptions>
): CircularDependencyDetector {
  return new CircularDependencyDetector(options);
}