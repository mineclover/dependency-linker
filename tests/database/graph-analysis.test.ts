/**
 * Comprehensive Graph Analysis Test Scenarios
 * 그래프 분석 시스템의 포괄적 테스트 시나리오
 */

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { createGraphDatabase } from '../../src/database/GraphDatabase';
import { createGraphQueryEngine } from '../../src/database/GraphQueryEngine';
import { createNodeIdentifier } from '../../src/database/core/NodeIdentifier';
import { createNodeCentricAnalyzer } from '../../src/database/core/NodeCentricAnalyzer';
import { createCircularDependencyDetector } from '../../src/database/core/CircularDependencyDetector';

describe('Graph Analysis System - Comprehensive Test Scenarios', () => {
  let testDir: string;
  let db: ReturnType<typeof createGraphDatabase>;
  let queryEngine: ReturnType<typeof createGraphQueryEngine>;
  let nodeIdentifier: ReturnType<typeof createNodeIdentifier>;
  let analyzer: ReturnType<typeof createNodeCentricAnalyzer>;

  const projectRoot = '/test/project';

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'graph-test-'));
  });

  beforeEach(async () => {
    const dbPath = join(testDir, `test-${Date.now()}.db`);
    db = createGraphDatabase(dbPath);
    await db.initialize();

    queryEngine = createGraphQueryEngine(db);
    nodeIdentifier = createNodeIdentifier(projectRoot);
    analyzer = createNodeCentricAnalyzer(db, queryEngine, nodeIdentifier);
  });

  afterEach(async () => {
    await db.close();
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Scenario 1: React Application Analysis', () => {
    beforeEach(async () => {
      await setupReactApplicationGraph();
    });

    test('should identify component hierarchy', async () => {
      // App.tsx -> UserProfile.tsx -> Avatar.tsx 계층 구조
      const appComponentId = await getNodeIdByIdentifier('file#src/App.tsx');
      const userProfileId = await getNodeIdByIdentifier('file#src/components/UserProfile.tsx');
      const avatarId = await getNodeIdByIdentifier('file#src/components/Avatar.tsx');

      expect(appComponentId).toBeDefined();
      expect(userProfileId).toBeDefined();
      expect(avatarId).toBeDefined();

      // App이 UserProfile을 import하는지 확인
      const appDependencies = await db.findNodeDependencies(appComponentId!, ['imports']);
      const importedUserProfile = appDependencies.find(dep => dep.id === userProfileId);
      expect(importedUserProfile).toBeDefined();

      // UserProfile이 Avatar를 import하는지 확인
      const userProfileDependencies = await db.findNodeDependencies(userProfileId!, ['imports']);
      const importedAvatar = userProfileDependencies.find(dep => dep.id === avatarId);
      expect(importedAvatar).toBeDefined();
    });

    test('should detect component reusability', async () => {
      // Avatar 컴포넌트가 여러 곳에서 사용되는지 확인
      const avatarId = await getNodeIdByIdentifier('file#src/components/Avatar.tsx');
      const avatarDependents = await db.findNodeDependents(avatarId!, ['imports']);

      expect(avatarDependents.length).toBeGreaterThan(1);

      // UserProfile과 ContactCard에서 모두 사용되는지 확인
      const dependentNames = avatarDependents.map(dep => dep.name);
      expect(dependentNames).toContain('UserProfile.tsx');
      expect(dependentNames).toContain('ContactCard.tsx');
    });

    test('should analyze hook dependencies', async () => {
      // Custom hook 의존성 분석
      const useUserDataId = await getNodeIdByIdentifier('function#src/hooks/useUserData.ts::useUserData()');

      if (useUserDataId) {
        const hookDependencies = await db.findNodeDependencies(useUserDataId, ['calls', 'references']);
        expect(hookDependencies.length).toBeGreaterThan(0);

        // API 함수를 호출하는지 확인
        const apiCalls = hookDependencies.filter(dep =>
          dep.identifier.includes('api') || dep.type === 'function'
        );
        expect(apiCalls.length).toBeGreaterThan(0);
      }
    });

    test('should identify circular dependencies in components', async () => {
      // 순환 의존성 테스트를 위한 추가 관계 생성
      await createCircularDependency();

      const detector = createCircularDependencyDetector({
        maxDepth: 10,
        maxCycles: 50,
        timeout: 5000,
        edgeTypes: ['imports'],
      });

      const result = await detector.detect(
        async (nodeId) => {
          const dependencies = await db.findNodeDependencies(parseInt(nodeId), ['imports']);
          return dependencies.map(dep => ({ to: dep.id!.toString(), type: 'imports' }));
        },
        async () => {
          const nodes = await db.findNodes({ nodeTypes: ['file'] });
          return nodes.map(n => ({ id: n.id!.toString(), type: n.type }));
        }
      );

      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.stats.totalNodesVisited).toBeGreaterThan(0);
      expect(result.stats.processingTime).toBeLessThan(5000);
    });
  });

  describe('Scenario 2: API Layer Analysis', () => {
    beforeEach(async () => {
      await setupApiLayerGraph();
    });

    test('should trace API endpoint dependencies', async () => {
      const userApiId = await getNodeIdByIdentifier('file#src/api/user.ts');
      const authServiceId = await getNodeIdByIdentifier('file#src/services/auth.ts');

      expect(userApiId).toBeDefined();
      expect(authServiceId).toBeDefined();

      // API가 인증 서비스를 의존하는지 확인
      const dependencies = await db.findNodeDependencies(userApiId!, ['imports', 'calls']);
      const authDependency = dependencies.find(dep => dep.id === authServiceId);
      expect(authDependency).toBeDefined();
    });

    test('should analyze service layer coupling', async () => {
      const userServiceId = await getNodeIdByIdentifier('file#src/services/user.ts');

      // 노드가 실제로 생성되었는지 확인
      expect(userServiceId).toBeDefined();

      if (userServiceId) {
        const analysis = await analyzer.analyzeNodeImpact('file#src/services/user.ts');

        expect(analysis.metrics.fanIn).toBeGreaterThan(0); // 다른 서비스들이 의존
        expect(analysis.metrics.fanOut).toBeGreaterThan(0); // 다른 서비스들에 의존
        expect(analysis.metrics.instability).toBeLessThan(1); // 완전히 불안정하지 않음

        // 높은 결합도 확인
        if (analysis.risks.highCoupling) {
          expect(analysis.dependencies.direct.length + analysis.dependents.direct.length).toBeGreaterThan(10);
        }
      }
    });

    test('should identify critical API nodes', async () => {
      const authServiceId = await getNodeIdByIdentifier('file#src/services/auth.ts');

      if (authServiceId) {
        const analysis = await analyzer.analyzeNodeImpact('file#src/services/auth.ts');

        // 인증 서비스는 중요한 노드여야 함
        expect(analysis.metrics.criticalityScore).toBeGreaterThanOrEqual(5);

        // 많은 노드들이 의존해야 함
        expect(analysis.dependents.direct.length).toBeGreaterThan(3);

        // 단일 장애점인지 확인
        if (analysis.risks.singlePointOfFailure) {
          expect(analysis.dependents.direct.length).toBeGreaterThan(50);
        }
      }
    });
  });

  describe('Scenario 3: Library and Package Analysis', () => {
    beforeEach(async () => {
      await setupLibraryDependencyGraph();
    });

    test('should distinguish internal vs external dependencies', async () => {
      const appId = await getNodeIdByIdentifier('file#src/App.tsx');

      if (appId) {
        const dependencies = await db.findNodeDependencies(appId, ['imports']);

        const internalDeps = dependencies.filter(dep => dep.type === 'file');
        const externalDeps = dependencies.filter(dep => dep.type === 'library');

        expect(internalDeps.length).toBeGreaterThan(0);
        expect(externalDeps.length).toBeGreaterThan(0);

        // React, lodash 등 외부 라이브러리 확인
        const externalNames = externalDeps.map(dep => dep.name);
        expect(externalNames).toContain('react');
        expect(externalNames).toContain('lodash');
      }
    });

    test('should analyze library usage patterns', async () => {
      // React 라이브러리의 사용 패턴 분석
      const reactLibId = await getNodeIdByIdentifier('lib#react');

      if (reactLibId) {
        const reactDependents = await db.findNodeDependents(reactLibId, ['imports']);

        // 여러 컴포넌트에서 React를 사용하는지 확인
        expect(reactDependents.length).toBeGreaterThan(2);

        // 모든 의존자가 컴포넌트 파일인지 확인
        const componentFiles = reactDependents.filter(dep =>
          dep.sourceFile.includes('components/') || dep.name.includes('Component')
        );
        expect(componentFiles.length).toBeGreaterThan(0);
      }
    });

    test('should identify unused libraries', async () => {
      // 사용되지 않는 라이브러리 감지
      const allLibraries = await db.findNodes({ nodeTypes: ['library'] });

      for (const lib of allLibraries) {
        const dependents = await db.findNodeDependents(lib.id!, ['imports']);

        if (dependents.length === 0) {
          // 사용되지 않는 라이브러리 발견
          console.log(`Unused library detected: ${lib.name}`);
        }
      }

      // 최소 하나의 라이브러리는 사용되어야 함
      const usedLibraries = await Promise.all(
        allLibraries.map(async lib => {
          const dependents = await db.findNodeDependents(lib.id!, ['imports']);
          return dependents.length > 0;
        })
      );

      expect(usedLibraries.some(used => used)).toBe(true);
    });
  });

  describe('Scenario 4: Node-Centric Deep Analysis', () => {
    beforeEach(async () => {
      await setupComplexDependencyGraph();
    });

    test('should perform comprehensive node impact analysis', async () => {
      const coreUtilId = 'file#src/utils/core.ts';
      const analysis = await analyzer.analyzeNodeImpact(coreUtilId);

      // 기본 구조 검증
      expect(analysis.node.identifier).toBe(coreUtilId);
      expect(analysis.dependencies).toBeDefined();
      expect(analysis.dependents).toBeDefined();
      expect(analysis.metrics).toBeDefined();
      expect(analysis.risks).toBeDefined();

      // 메트릭 검증
      expect(analysis.metrics.fanIn).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.fanOut).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.instability).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.instability).toBeLessThanOrEqual(1);

      // 중요도 점수 검증
      expect(analysis.metrics.criticalityScore).toBeGreaterThanOrEqual(0);
    });

    test('should analyze node neighborhood', async () => {
      const coreUtilId = 'file#src/utils/core.ts';
      const neighborhood = await analyzer.analyzeNodeNeighborhood(coreUtilId);

      expect(neighborhood.center.identifier).toBe(coreUtilId);
      expect(neighborhood.immediate).toBeDefined();
      expect(neighborhood.extended).toBeDefined();
      expect(neighborhood.clusters).toBeDefined();

      // 즉시 이웃이 있어야 함
      expect(
        neighborhood.immediate.incoming.length + neighborhood.immediate.outgoing.length
      ).toBeGreaterThan(0);
    });

    test('should find shortest path between nodes', async () => {
      const sourceId = 'file#src/App.tsx';
      const targetId = 'file#src/utils/helpers.ts';

      const path = await analyzer.findShortestPath(sourceId, targetId);

      if (path) {
        expect(path.length).toBeGreaterThan(1);
        expect(path[0].identifier).toBe(sourceId);
        expect(path[path.length - 1].identifier).toBe(targetId);

        // 경로의 연속성 확인
        for (let i = 0; i < path.length - 1; i++) {
          expect(path[i + 1].distance).toBe(path[i].distance + 1);
        }
      }
    });

    test('should perform node evolution analysis', async () => {
      const nodeId = 'file#src/services/api.ts';
      const evolution = await analyzer.analyzeNodeEvolution(nodeId);

      expect(evolution.node.identifier).toBe(nodeId);
      expect(evolution.changeFrequency).toBeGreaterThanOrEqual(0);
      expect(evolution.changeFrequency).toBeLessThanOrEqual(1);
      expect(evolution.impactRadius).toBeGreaterThanOrEqual(0);
      expect(evolution.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(evolution.stabilityScore).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(evolution.refactoringRisk);
      expect(Array.isArray(evolution.recommendations)).toBe(true);
    });

    test('should cluster related nodes', async () => {
      const seedNodes = [
        'file#src/components/UserProfile.tsx',
        'file#src/components/Avatar.tsx',
        'file#src/utils/helpers.ts'
      ];

      const clusters = await analyzer.clusterRelatedNodes(seedNodes);

      expect(clusters.length).toBeGreaterThan(0);

      for (const cluster of clusters) {
        expect(cluster.id).toBeDefined();
        expect(cluster.nodes.length).toBeGreaterThan(0);
        expect(cluster.cohesion).toBeGreaterThanOrEqual(0);
        expect(cluster.cohesion).toBeLessThanOrEqual(1);
        expect(cluster.purpose).toBeDefined();
      }
    });
  });

  describe('Scenario 5: Performance and Edge Cases', () => {
    test('should handle large graphs efficiently', async () => {
      await setupLargeGraph(1000); // 1000개 노드

      const startTime = Date.now();
      const stats = await db.getStats();
      const processingTime = Date.now() - startTime;

      expect(stats.totalNodes).toBe(1000);
      expect(processingTime).toBeLessThan(5000); // 5초 이내
    });

    test('should handle deep dependency chains', async () => {
      await setupDeepDependencyChain(20); // 20단계 깊이

      const detector = createCircularDependencyDetector({
        maxDepth: 25,
        timeout: 10000,
      });

      const result = await detector.detect(
        async (nodeId) => {
          const dependencies = await db.findNodeDependencies(parseInt(nodeId), ['imports']);
          return dependencies.map(dep => ({ to: dep.id!.toString(), type: 'imports' }));
        },
        async () => {
          const nodes = await db.findNodes({});
          return nodes.map(n => ({ id: n.id!.toString(), type: n.type }));
        }
      );

      expect(result.stats.maxDepthReached).toBeLessThanOrEqual(25);
      expect(result.stats.timeoutOccurred).toBe(false);
    });

    test('should respect timeout limits', async () => {
      await setupComplexGraph(100);

      const detector = createCircularDependencyDetector({
        maxDepth: 50,
        timeout: 100, // 매우 짧은 시간 제한
      });

      const startTime = Date.now();
      const result = await detector.detect(
        async (nodeId) => {
          const dependencies = await db.findNodeDependencies(parseInt(nodeId), ['imports']);
          return dependencies.map(dep => ({ to: dep.id!.toString(), type: 'imports' }));
        },
        async () => {
          const nodes = await db.findNodes({});
          return nodes.map(n => ({ id: n.id!.toString(), type: n.type }));
        }
      );
      const actualTime = Date.now() - startTime;

      expect(actualTime).toBeLessThan(500); // 타임아웃으로 인해 빨리 종료
    });
  });

  // 헬퍼 메서드들

  async function setupReactApplicationGraph() {
    // 파일 노드들
    const files = [
      { id: 'file#src/App.tsx', name: 'App.tsx', type: 'file' },
      { id: 'file#src/components/UserProfile.tsx', name: 'UserProfile.tsx', type: 'file' },
      { id: 'file#src/components/Avatar.tsx', name: 'Avatar.tsx', type: 'file' },
      { id: 'file#src/components/ContactCard.tsx', name: 'ContactCard.tsx', type: 'file' },
      { id: 'file#src/hooks/useUserData.ts', name: 'useUserData.ts', type: 'file' },
    ];

    // 라이브러리 노드들
    const libraries = [
      { id: 'lib#react', name: 'react', type: 'library' },
      { id: 'lib#lodash', name: 'lodash', type: 'library' },
    ];

    // 함수 노드들
    const functions = [
      { id: 'function#src/hooks/useUserData.ts::useUserData()', name: 'useUserData', type: 'function' },
      { id: 'function#src/api/user.ts::fetchUser()', name: 'fetchUser', type: 'function' },
      { id: 'function#src/api/user.ts::updateUser()', name: 'updateUser', type: 'function' },
    ];

    // 모든 노드 생성
    for (const node of [...files, ...libraries, ...functions]) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.includes('src/') ? node.id.split('#')[1] : node.name,
        language: 'typescript',
        metadata: {},
      });
    }

    // 관계 생성
    const relationships = [
      { from: 'file#src/App.tsx', to: 'file#src/components/UserProfile.tsx', type: 'imports' },
      { from: 'file#src/components/UserProfile.tsx', to: 'file#src/components/Avatar.tsx', type: 'imports' },
      { from: 'file#src/components/ContactCard.tsx', to: 'file#src/components/Avatar.tsx', type: 'imports' },
      { from: 'file#src/App.tsx', to: 'lib#react', type: 'imports' },
      { from: 'file#src/App.tsx', to: 'lib#lodash', type: 'imports' },
      { from: 'file#src/components/UserProfile.tsx', to: 'lib#react', type: 'imports' },
      { from: 'file#src/components/Avatar.tsx', to: 'lib#react', type: 'imports' },
      { from: 'file#src/hooks/useUserData.ts', to: 'lib#lodash', type: 'imports' },
      // Hook function dependencies
      { from: 'function#src/hooks/useUserData.ts::useUserData()', to: 'function#src/api/user.ts::fetchUser()', type: 'calls' },
      { from: 'function#src/hooks/useUserData.ts::useUserData()', to: 'function#src/api/user.ts::updateUser()', type: 'references' },
    ];

    for (const rel of relationships) {
      const fromId = await getNodeIdByIdentifier(rel.from);
      const toId = await getNodeIdByIdentifier(rel.to);

      if (fromId && toId) {
        await db.upsertRelationship({
          fromNodeId: fromId,
          toNodeId: toId,
          type: rel.type,
          metadata: {},
        });
      }
    }
  }

  async function setupApiLayerGraph() {
    const nodes = [
      { id: 'file#src/api/user.ts', name: 'user.ts', type: 'file' },
      { id: 'file#src/api/auth.ts', name: 'auth.ts', type: 'file' },
      { id: 'file#src/services/user.ts', name: 'user.ts', type: 'file' },
      { id: 'file#src/services/auth.ts', name: 'auth.ts', type: 'file' },
      { id: 'file#src/services/database.ts', name: 'database.ts', type: 'file' },
      { id: 'file#src/controllers/user.ts', name: 'user.ts', type: 'file' },
    ];

    for (const node of nodes) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.split('#')[1],
        language: 'typescript',
        metadata: {},
      });
    }

    const relationships = [
      { from: 'file#src/api/user.ts', to: 'file#src/services/auth.ts', type: 'imports' },
      { from: 'file#src/api/user.ts', to: 'file#src/services/user.ts', type: 'imports' },
      { from: 'file#src/api/auth.ts', to: 'file#src/services/auth.ts', type: 'imports' },
      { from: 'file#src/services/user.ts', to: 'file#src/services/database.ts', type: 'imports' },
      { from: 'file#src/services/auth.ts', to: 'file#src/services/database.ts', type: 'imports' },
      { from: 'file#src/controllers/user.ts', to: 'file#src/services/user.ts', type: 'imports' },
      { from: 'file#src/controllers/user.ts', to: 'file#src/services/auth.ts', type: 'imports' },
      // 추가 auth 의존성
      { from: 'file#src/services/user.ts', to: 'file#src/services/auth.ts', type: 'imports' },
      { from: 'file#src/services/database.ts', to: 'file#src/services/auth.ts', type: 'imports' },
    ];

    for (const rel of relationships) {
      const fromId = await getNodeIdByIdentifier(rel.from);
      const toId = await getNodeIdByIdentifier(rel.to);

      if (fromId && toId) {
        await db.upsertRelationship({
          fromNodeId: fromId,
          toNodeId: toId,
          type: rel.type,
          metadata: {},
        });
      }
    }
  }

  async function setupLibraryDependencyGraph() {
    await setupReactApplicationGraph(); // 이미 라이브러리 포함
  }

  async function setupComplexDependencyGraph() {
    const nodes = [
      { id: 'file#src/App.tsx', name: 'App.tsx', type: 'file' },
      { id: 'file#src/utils/core.ts', name: 'core.ts', type: 'file' },
      { id: 'file#src/utils/helpers.ts', name: 'helpers.ts', type: 'file' },
      { id: 'file#src/services/api.ts', name: 'api.ts', type: 'file' },
      { id: 'file#src/services/user.ts', name: 'user.ts', type: 'file' },
      { id: 'file#src/services/auth.ts', name: 'auth.ts', type: 'file' },
      { id: 'file#src/components/Layout.tsx', name: 'Layout.tsx', type: 'file' },
      { id: 'file#src/components/UserProfile.tsx', name: 'UserProfile.tsx', type: 'file' },
      { id: 'file#src/components/Avatar.tsx', name: 'Avatar.tsx', type: 'file' },
    ];

    for (const node of nodes) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.split('#')[1],
        language: 'typescript',
        metadata: {},
      });
    }

    const relationships = [
      { from: 'file#src/App.tsx', to: 'file#src/components/Layout.tsx', type: 'imports' },
      { from: 'file#src/App.tsx', to: 'file#src/services/api.ts', type: 'imports' },
      { from: 'file#src/services/api.ts', to: 'file#src/utils/core.ts', type: 'imports' },
      { from: 'file#src/utils/core.ts', to: 'file#src/utils/helpers.ts', type: 'imports' },
      { from: 'file#src/components/Layout.tsx', to: 'file#src/utils/helpers.ts', type: 'imports' },
      { from: 'file#src/services/api.ts', to: 'file#src/services/user.ts', type: 'imports' },
      { from: 'file#src/services/api.ts', to: 'file#src/services/auth.ts', type: 'imports' },
      { from: 'file#src/services/user.ts', to: 'file#src/utils/core.ts', type: 'imports' },
      { from: 'file#src/services/auth.ts', to: 'file#src/utils/core.ts', type: 'imports' },
      { from: 'file#src/components/UserProfile.tsx', to: 'file#src/services/user.ts', type: 'imports' },
      { from: 'file#src/components/UserProfile.tsx', to: 'file#src/components/Avatar.tsx', type: 'imports' },
      { from: 'file#src/components/Avatar.tsx', to: 'file#src/utils/helpers.ts', type: 'imports' },
    ];

    for (const rel of relationships) {
      const fromId = await getNodeIdByIdentifier(rel.from);
      const toId = await getNodeIdByIdentifier(rel.to);

      if (fromId && toId) {
        await db.upsertRelationship({
          fromNodeId: fromId,
          toNodeId: toId,
          type: rel.type,
          metadata: {},
        });
      }
    }
  }

  async function createCircularDependency() {
    // A -> B -> C -> A 순환 생성
    const circularNodes = [
      { id: 'file#src/circular/A.ts', name: 'A.ts', type: 'file' },
      { id: 'file#src/circular/B.ts', name: 'B.ts', type: 'file' },
      { id: 'file#src/circular/C.ts', name: 'C.ts', type: 'file' },
    ];

    for (const node of circularNodes) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.split('#')[1],
        language: 'typescript',
        metadata: {},
      });
    }

    const circularRels = [
      { from: 'file#src/circular/A.ts', to: 'file#src/circular/B.ts', type: 'imports' },
      { from: 'file#src/circular/B.ts', to: 'file#src/circular/C.ts', type: 'imports' },
      { from: 'file#src/circular/C.ts', to: 'file#src/circular/A.ts', type: 'imports' },
    ];

    for (const rel of circularRels) {
      const fromId = await getNodeIdByIdentifier(rel.from);
      const toId = await getNodeIdByIdentifier(rel.to);

      if (fromId && toId) {
        await db.upsertRelationship({
          fromNodeId: fromId,
          toNodeId: toId,
          type: rel.type,
          metadata: {},
        });
      }
    }
  }

  async function setupLargeGraph(nodeCount: number) {
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: `file#src/generated/file${i}.ts`,
      name: `file${i}.ts`,
      type: 'file',
    }));

    for (const node of nodes) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.split('#')[1],
        language: 'typescript',
        metadata: {},
      });
    }
  }

  async function setupDeepDependencyChain(depth: number) {
    const nodes = Array.from({ length: depth }, (_, i) => ({
      id: `file#src/chain/level${i}.ts`,
      name: `level${i}.ts`,
      type: 'file',
    }));

    for (const node of nodes) {
      await db.upsertNode({
        identifier: node.id,
        type: node.type as any,
        name: node.name,
        sourceFile: node.id.split('#')[1],
        language: 'typescript',
        metadata: {},
      });
    }

    // 체인 관계 생성: level0 -> level1 -> level2 -> ...
    for (let i = 0; i < depth - 1; i++) {
      const fromId = await getNodeIdByIdentifier(`file#src/chain/level${i}.ts`);
      const toId = await getNodeIdByIdentifier(`file#src/chain/level${i + 1}.ts`);

      if (fromId && toId) {
        await db.upsertRelationship({
          fromNodeId: fromId,
          toNodeId: toId,
          type: 'imports',
          metadata: {},
        });
      }
    }
  }

  async function setupComplexGraph(nodeCount: number) {
    // 복잡한 그래프 (많은 상호 연결)
    await setupLargeGraph(nodeCount);

    // 무작위 관계 생성
    for (let i = 0; i < nodeCount * 2; i++) {
      const fromIndex = Math.floor(Math.random() * nodeCount);
      const toIndex = Math.floor(Math.random() * nodeCount);

      if (fromIndex !== toIndex) {
        const fromId = await getNodeIdByIdentifier(`file#src/generated/file${fromIndex}.ts`);
        const toId = await getNodeIdByIdentifier(`file#src/generated/file${toIndex}.ts`);

        if (fromId && toId) {
          await db.upsertRelationship({
            fromNodeId: fromId,
            toNodeId: toId,
            type: 'imports',
            metadata: {},
          });
        }
      }
    }
  }

  async function getNodeIdByIdentifier(identifier: string): Promise<number | null> {
    const nodes = await db.findNodes({});
    const node = nodes.find(n => n.identifier === identifier);
    return node?.id || null;
  }
});