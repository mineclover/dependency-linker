/**
 * Circular Dependency Detection Tests
 * 순환 의존성 탐지 시스템의 성능과 정확성 테스트
 */

import { createCircularDependencyDetector } from '../../src/database/core/CircularDependencyDetector';
import type { CircularDependencyOptions } from '../../src/database/core/CircularDependencyDetector';

describe('CircularDependencyDetector', () => {
  describe('Simple Circular Dependencies', () => {
    test('should detect basic circular dependency (A -> B -> A)', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 5,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].nodes).toEqual(expect.arrayContaining(['A', 'B', 'A']));
      expect(result.cycles[0].depth).toBe(2);
      expect(result.stats.timeoutOccurred).toBe(false);
    });

    test('should detect triangle circular dependency (A -> B -> C -> A)', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].nodes).toEqual(expect.arrayContaining(['A', 'B', 'C', 'A']));
      expect(result.cycles[0].depth).toBe(3);
    });

    test('should detect self-referencing circular dependency (A -> A)', async () => {
      const graph = new Map([
        ['A', [{ to: 'A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 5,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [{ id: 'A', type: 'file' }]
      );

      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].nodes).toEqual(['A', 'A']);
      expect(result.cycles[0].depth).toBe(1);
    });
  });

  describe('Complex Circular Dependencies', () => {
    test('should detect multiple separate cycles', async () => {
      const graph = new Map([
        // Cycle 1: A -> B -> A
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'A', type: 'imports' }]],
        // Cycle 2: C -> D -> E -> C
        ['C', [{ to: 'D', type: 'imports' }]],
        ['D', [{ to: 'E', type: 'imports' }]],
        ['E', [{ to: 'C', type: 'imports' }]],
        // Non-circular: F -> G
        ['F', [{ to: 'G', type: 'imports' }]],
        ['G', []],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 2000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
          { id: 'D', type: 'file' },
          { id: 'E', type: 'file' },
          { id: 'F', type: 'file' },
          { id: 'G', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBe(2);

      // 사이클 길이 확인
      const cycleLengths = result.cycles.map(cycle => cycle.depth);
      expect(cycleLengths).toContain(2); // A -> B -> A
      expect(cycleLengths).toContain(3); // C -> D -> E -> C
    });

    test('should handle overlapping cycles', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'A', type: 'imports' }, { to: 'D', type: 'imports' }]],
        ['D', [{ to: 'B', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 15,
        maxCycles: 10,
        timeout: 2000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
          { id: 'D', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBeGreaterThan(0);

      // 중복 사이클이 제거되었는지 확인
      const uniqueCycles = new Set(result.cycles.map(cycle => cycle.nodes.join('->')));
      expect(uniqueCycles.size).toBe(result.cycles.length);
    });

    test('should handle deep nested cycles', async () => {
      // 깊은 체인에서의 순환: A -> B -> C -> D -> E -> B
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'D', type: 'imports' }]],
        ['D', [{ to: 'E', type: 'imports' }]],
        ['E', [{ to: 'B', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 20,
        maxCycles: 10,
        timeout: 3000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
          { id: 'D', type: 'file' },
          { id: 'E', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].depth).toBe(4); // B -> C -> D -> E -> B
    });
  });

  describe('Performance and Limits', () => {
    test('should respect depth limits', async () => {
      // 매우 긴 체인 생성
      const chainLength = 50;
      const graph = new Map();

      for (let i = 0; i < chainLength - 1; i++) {
        graph.set(`node${i}`, [{ to: `node${i + 1}`, type: 'imports' }]);
      }
      // 마지막에서 첫 번째로 순환
      graph.set(`node${chainLength - 1}`, [{ to: 'node0', type: 'imports' }]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10, // 깊이 제한
        maxCycles: 10,
        timeout: 2000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => Array.from({ length: chainLength }, (_, i) => ({ id: `node${i}`, type: 'file' }))
      );

      expect(result.stats.maxDepthReached).toBeLessThanOrEqual(10);
      expect(result.stats.timeoutOccurred).toBe(false);
    });

    test('should respect timeout limits', async () => {
      // 복잡한 그래프로 시간 지연 시뮬레이션
      const nodeCount = 100;
      const graph = new Map();

      // 모든 노드가 서로 연결된 복잡한 그래프
      for (let i = 0; i < nodeCount; i++) {
        const connections = [];
        for (let j = 0; j < 5; j++) {
          const target = (i + j + 1) % nodeCount;
          connections.push({ to: `node${target}`, type: 'imports' });
        }
        graph.set(`node${i}`, connections);
      }

      const detector = createCircularDependencyDetector({
        maxDepth: 20,
        maxCycles: 1000,
        timeout: 50, // 매우 짧은 시간 제한
        edgeTypes: ['imports'],
      });

      const startTime = Date.now();
      const result = await detector.detect(
        async (nodeId) => {
          // 처리 지연 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 1));
          return graph.get(nodeId) || [];
        },
        async () => Array.from({ length: nodeCount }, (_, i) => ({ id: `node${i}`, type: 'file' }))
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // 타임아웃으로 빨리 종료
    });

    test('should respect cycle count limits', async () => {
      // 많은 순환을 생성하는 그래프
      const graph = new Map();

      // 10개의 독립적인 순환 생성
      for (let cycle = 0; cycle < 20; cycle++) {
        const nodeA = `cycle${cycle}_A`;
        const nodeB = `cycle${cycle}_B`;
        graph.set(nodeA, [{ to: nodeB, type: 'imports' }]);
        graph.set(nodeB, [{ to: nodeA, type: 'imports' }]);
      }

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 5, // 최대 5개 순환만 허용
        timeout: 5000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => {
          const nodes = [];
          for (let cycle = 0; cycle < 20; cycle++) {
            nodes.push({ id: `cycle${cycle}_A`, type: 'file' });
            nodes.push({ id: `cycle${cycle}_B`, type: 'file' });
          }
          return nodes;
        }
      );

      expect(result.cycles.length).toBeLessThanOrEqual(5);
      expect(result.truncated).toBe(true);
    });
  });

  describe('Edge Type Filtering', () => {
    test('should only detect cycles for specified edge types', async () => {
      const graph = new Map([
        ['A', [
          { to: 'B', type: 'imports' },
          { to: 'C', type: 'calls' },
        ]],
        ['B', [{ to: 'A', type: 'imports' }]], // import 순환
        ['C', [{ to: 'A', type: 'calls' }]],   // call 순환
      ]);

      // imports만 확인
      const importDetector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      const importResult = await importDetector.detect(
        async (nodeId) => (graph.get(nodeId) || []).filter(edge => edge.type === 'imports'),
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
        ]
      );

      expect(importResult.cycles.length).toBe(1);

      // calls만 확인
      const callDetector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['calls'],
      });

      const callResult = await callDetector.detect(
        async (nodeId) => (graph.get(nodeId) || []).filter(edge => edge.type === 'calls'),
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
        ]
      );

      expect(callResult.cycles.length).toBe(1);
    });

    test('should exclude specified node types', async () => {
      const graph = new Map([
        ['internal_A', [{ to: 'internal_B', type: 'imports' }]],
        ['internal_B', [{ to: 'library_C', type: 'imports' }]],
        ['library_C', [{ to: 'internal_A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
        excludeNodeTypes: ['library'],
      });

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'internal_A', type: 'file' },
          { id: 'internal_B', type: 'file' },
          { id: 'library_C', type: 'library' },
        ]
      );

      // library 노드는 제외되므로 순환이 감지되지 않아야 함
      expect(result.cycles.length).toBe(0);
    });
  });

  describe('Node-Specific Detection', () => {
    test('should detect cycles from specific starting node', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'A', type: 'imports' }]],
        ['D', [{ to: 'E', type: 'imports' }]],
        ['E', [{ to: 'D', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      // A에서 시작하는 순환만 탐지
      const result = await detector.detectFromNode(
        'A',
        async (nodeId) => graph.get(nodeId) || []
      );

      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].nodes).toContain('A');
      expect(result.cycles[0].nodes).toContain('B');
      expect(result.cycles[0].nodes).toContain('C');
      expect(result.cycles[0].nodes).not.toContain('D');
      expect(result.cycles[0].nodes).not.toContain('E');
    });

    test('should find circular path between two specific nodes', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'D', type: 'imports' }]],
        ['D', [{ to: 'A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 10,
        timeout: 1000,
        edgeTypes: ['imports'],
      });

      const circularPath = await detector.findCircularPath(
        'A',
        'C',
        async (nodeId) => graph.get(nodeId) || []
      );

      expect(circularPath).toBeDefined();
      expect(circularPath!.nodes).toContain('A');
      expect(circularPath!.nodes).toContain('C');
      expect(circularPath!.depth).toBeGreaterThan(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty graph', async () => {
      const detector = createCircularDependencyDetector();

      const result = await detector.detect(
        async () => [],
        async () => []
      );

      expect(result.cycles.length).toBe(0);
      expect(result.stats.totalNodesVisited).toBe(0);
      expect(result.stats.timeoutOccurred).toBe(false);
    });

    test('should handle single node with no edges', async () => {
      const detector = createCircularDependencyDetector();

      const result = await detector.detect(
        async () => [],
        async () => [{ id: 'A', type: 'file' }]
      );

      expect(result.cycles.length).toBe(0);
      expect(result.stats.totalNodesVisited).toBe(1);
    });

    test('should handle linear dependency chain', async () => {
      const graph = new Map([
        ['A', [{ to: 'B', type: 'imports' }]],
        ['B', [{ to: 'C', type: 'imports' }]],
        ['C', [{ to: 'D', type: 'imports' }]],
        ['D', []],
      ]);

      const detector = createCircularDependencyDetector();

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
          { id: 'C', type: 'file' },
          { id: 'D', type: 'file' },
        ]
      );

      expect(result.cycles.length).toBe(0);
      expect(result.stats.totalNodesVisited).toBe(4);
    });

    test('should handle nodes with invalid edges', async () => {
      const graph = new Map([
        ['A', [
          { to: 'B', type: 'imports' },
          { to: 'NONEXISTENT', type: 'imports' },
        ]],
        ['B', [{ to: 'A', type: 'imports' }]],
      ]);

      const detector = createCircularDependencyDetector();

      const result = await detector.detect(
        async (nodeId) => graph.get(nodeId) || [],
        async () => [
          { id: 'A', type: 'file' },
          { id: 'B', type: 'file' },
        ]
      );

      // 유효한 순환은 여전히 감지되어야 함
      expect(result.cycles.length).toBe(1);
      expect(result.cycles[0].nodes).toEqual(expect.arrayContaining(['A', 'B']));
    });
  });
});