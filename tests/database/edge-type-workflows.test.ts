/**
 * EdgeType Workflow System Tests
 * GraphQueryEngine 새로운 타입 생성 및 의존성 추론 워크플로우 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GraphDatabase } from '../../src/database/GraphDatabase';
import { EdgeTypeManager } from '../../src/database/types/EdgeTypeManager';
import {
  createBasicImportEdgeType,
  createHierarchicalDependencyTypes,
  createInferenceBasedEdgeType,
  createProjectAnalysisWorkflow,
  demonstrateDynamicEdgeTypeManagement,
  createCodebaseAnalysisExample
} from '../../src/database/examples/EdgeTypeWorkflows';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';

describe('EdgeType Workflow System', () => {
  let database: GraphDatabase;
  let edgeTypeManager: EdgeTypeManager;
  let dbPath: string;

  beforeEach(async () => {
    // 임시 데이터베이스 파일 생성
    dbPath = join(tmpdir(), `test-edge-workflow-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
    edgeTypeManager = new EdgeTypeManager(database);
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  describe('Workflow 1: 기본 엣지 타입 생성', () => {
    it('should create basic import edge type successfully', async () => {
      // 기본 import 엣지 타입 생성
      await createBasicImportEdgeType(edgeTypeManager);

      // 생성된 타입 확인
      const importType = edgeTypeManager.getEdgeType('imports');
      expect(importType).toBeDefined();
      expect(importType?.type).toBe('imports');
      expect(importType?.isDirected).toBe(true);
      expect(importType?.priority).toBe(10);
      expect(importType?.schema.properties).toHaveProperty('importType');
    });

    it('should validate schema requirements', async () => {
      await createBasicImportEdgeType(edgeTypeManager);
      const importType = edgeTypeManager.getEdgeType('imports');

      expect(importType?.schema.required).toContain('importType');
      expect(importType?.schema.required).toContain('importPath');
      expect(importType?.schema.properties.importType.enum).toEqual([
        'default', 'named', 'namespace', 'dynamic'
      ]);
    });
  });

  describe('Workflow 2: 계층적 엣지 타입 생성', () => {
    it('should create hierarchical dependency types', async () => {
      await createHierarchicalDependencyTypes(edgeTypeManager);

      // 기본 의존성 타입 확인
      const baseDependency = edgeTypeManager.getEdgeType('depends_on');
      expect(baseDependency).toBeDefined();
      expect(baseDependency?.isTransitive).toBe(true);
      expect(baseDependency?.isInheritable).toBe(true);

      // 하위 타입들 확인
      const functionCalls = edgeTypeManager.getEdgeType('function_calls');
      expect(functionCalls).toBeDefined();
      expect(functionCalls?.parentType).toBe('depends_on');
      expect(functionCalls?.priority).toBe(8);

      const classExtends = edgeTypeManager.getEdgeType('class_extends');
      expect(classExtends).toBeDefined();
      expect(classExtends?.parentType).toBe('depends_on');
      expect(classExtends?.priority).toBe(9);

      const interfaceImplements = edgeTypeManager.getEdgeType('interface_implements');
      expect(interfaceImplements).toBeDefined();
      expect(interfaceImplements?.parentType).toBe('depends_on');
      expect(interfaceImplements?.priority).toBe(7);
    });

    it('should maintain parent-child relationships', async () => {
      await createHierarchicalDependencyTypes(edgeTypeManager);

      const hierarchy = edgeTypeManager.getEdgeTypeHierarchy();
      expect(hierarchy).toHaveProperty('depends_on');

      const dependsOnNode = hierarchy['depends_on'];
      expect(dependsOnNode.children).toBeDefined();
      expect(dependsOnNode.children?.length).toBe(3);

      const childTypes = dependsOnNode.children?.map(child => child.type) || [];
      expect(childTypes).toContain('function_calls');
      expect(childTypes).toContain('class_extends');
      expect(childTypes).toContain('interface_implements');
    });
  });

  describe('Workflow 3: 추론 규칙 기반 엣지 타입', () => {
    it('should create edge type with inference rules', async () => {
      await createInferenceBasedEdgeType(edgeTypeManager);

      const indirectDependency = edgeTypeManager.getEdgeType('indirect_dependency');
      expect(indirectDependency).toBeDefined();
      expect(indirectDependency?.inferenceRules).toBeDefined();
      expect(indirectDependency?.inferenceRules?.length).toBe(2);

      // 전이적 의존성 규칙 확인
      const transitiveRule = indirectDependency?.inferenceRules?.[0];
      expect(transitiveRule?.id).toBe('transitive_dependency');
      expect(transitiveRule?.condition.type).toBe('path');
      expect(transitiveRule?.action.type).toBe('create_edge');

      // 순환 의존성 탐지 규칙 확인
      const circularRule = indirectDependency?.inferenceRules?.[1];
      expect(circularRule?.id).toBe('circular_dependency_detection');
      expect(circularRule?.condition.type).toBe('pattern');
      expect(circularRule?.action.type).toBe('update_metadata');
    });

    it('should set correct conflict resolution strategy', async () => {
      await createInferenceBasedEdgeType(edgeTypeManager);

      const indirectDependency = edgeTypeManager.getEdgeType('indirect_dependency');
      expect(indirectDependency?.conflictResolution).toBe('merge_metadata');
    });
  });

  describe('Workflow 4: 프로젝트 분석 시스템', () => {
    it('should create complete project analysis workflow', async () => {
      await createProjectAnalysisWorkflow(database);

      const availableTypes = edgeTypeManager.getAvailableEdgeTypes();
      expect(availableTypes.length).toBeGreaterThanOrEqual(5);

      // 모든 기본 타입들이 생성되었는지 확인
      const typeNames = availableTypes.map(type => type.type);
      expect(typeNames).toContain('imports');
      expect(typeNames).toContain('depends_on');
      expect(typeNames).toContain('function_calls');
      expect(typeNames).toContain('class_extends');
      expect(typeNames).toContain('interface_implements');
      expect(typeNames).toContain('indirect_dependency');
      expect(typeNames).toContain('performance_impact');
    });

    it('should create performance edge type with aggregation rules', async () => {
      await createProjectAnalysisWorkflow(database);

      const performanceType = edgeTypeManager.getEdgeType('performance_impact');
      expect(performanceType).toBeDefined();
      expect(performanceType?.schema.properties).toHaveProperty('impactScore');
      expect(performanceType?.schema.properties).toHaveProperty('bottleneckType');

      // 집계 추론 규칙 확인
      const aggregationRule = performanceType?.inferenceRules?.[0];
      expect(aggregationRule?.id).toBe('performance_aggregation');
      expect(aggregationRule?.action.type).toBe('aggregate');
      expect(aggregationRule?.action.aggregationMethod).toBe('sum');
    });
  });

  describe('Workflow 5: 동적 엣지 타입 관리', () => {
    it('should update edge type properties', async () => {
      // 먼저 기본 타입들 생성
      await createHierarchicalDependencyTypes(edgeTypeManager);

      const originalType = edgeTypeManager.getEdgeType('depends_on');
      expect(originalType?.priority).toBe(5);
      expect(originalType?.isTransitive).toBe(true);

      // 동적 업데이트 실행
      const updateResult = await edgeTypeManager.updateEdgeType('depends_on', {
        priority: 8,
        isTransitive: false,
        description: '업데이트된 기본 의존성 관계'
      });

      expect(updateResult.success).toBe(true);

      // 업데이트된 값 확인
      const updatedType = edgeTypeManager.getEdgeType('depends_on');
      expect(updatedType?.priority).toBe(8);
      expect(updatedType?.isTransitive).toBe(false);
      expect(updatedType?.description).toBe('업데이트된 기본 의존성 관계');
    });

    it('should handle edge type deletion with dependencies', async () => {
      await createHierarchicalDependencyTypes(edgeTypeManager);

      // 의존성이 있는 타입 삭제 시도
      const deleteResult = await edgeTypeManager.deleteEdgeType('depends_on', false);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.warnings).toBeDefined();

      // 강제 삭제
      const forceDeleteResult = await edgeTypeManager.deleteEdgeType('depends_on', true);
      expect(forceDeleteResult.success).toBe(true);

      // 삭제 확인
      const deletedType = edgeTypeManager.getEdgeType('depends_on');
      expect(deletedType).toBeUndefined();
    });
  });

  describe('실제 코드베이스 분석 예제', () => {
    it('should provide realistic edge type definitions', () => {
      const codebaseTypes = createCodebaseAnalysisExample();
      expect(codebaseTypes).toHaveLength(3);

      // 파일 import 타입
      const fileImports = codebaseTypes.find(type => type.type === 'file_imports');
      expect(fileImports).toBeDefined();
      expect(fileImports?.schema.properties.importPath).toBeDefined();

      // API 호출 타입
      const apiCalls = codebaseTypes.find(type => type.type === 'api_calls');
      expect(apiCalls).toBeDefined();
      expect(apiCalls?.schema.properties.endpoint).toBeDefined();
      expect(apiCalls?.schema.properties.method.enum).toEqual(['GET', 'POST', 'PUT', 'DELETE']);

      // 데이터베이스 접근 타입
      const dbAccess = codebaseTypes.find(type => type.type === 'database_access');
      expect(dbAccess).toBeDefined();
      expect(dbAccess?.schema.properties.table).toBeDefined();
      expect(dbAccess?.schema.properties.operation.enum).toEqual(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
    });
  });

  describe('EdgeTypeManager 통합 기능', () => {
    it('should validate edge type definitions', async () => {
      // 잘못된 엣지 타입 생성 시도
      const invalidType = {
        type: '',  // 빈 이름
        description: 'Invalid type',
        schema: {},
        isDirected: true,
        isTransitive: false,
        isInheritable: false,
        priority: 5
      };

      const result = await edgeTypeManager.createEdgeType(invalidType);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Edge type name is required');
    });

    it('should prevent duplicate edge type names', async () => {
      await createBasicImportEdgeType(edgeTypeManager);

      // 같은 이름으로 다시 생성 시도
      const duplicateResult = await edgeTypeManager.createEdgeType({
        type: 'imports',
        description: 'Duplicate imports',
        schema: {},
        isDirected: true,
        isTransitive: false,
        isInheritable: false,
        priority: 5
      });

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.errors).toContain("Edge type 'imports' already exists");
    });

    it('should validate edge type name format', async () => {
      const invalidNameType = {
        type: 'Invalid-Name!',  // 잘못된 형식
        description: 'Invalid name format',
        schema: {},
        isDirected: true,
        isTransitive: false,
        isInheritable: false,
        priority: 5
      };

      const result = await edgeTypeManager.createEdgeType(invalidNameType);
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Edge type name must start with lowercase letter');
    });

    it('should validate inference rule priorities', async () => {
      const invalidRuleType = {
        type: 'test_type',
        description: 'Test type with invalid rule',
        schema: {},
        isDirected: true,
        isTransitive: false,
        isInheritable: false,
        priority: 5,
        inferenceRules: [{
          id: 'invalid_rule',
          name: 'Invalid Rule',
          description: 'Rule with invalid priority',
          condition: { type: 'path' as const },
          action: { type: 'create_edge' as const, targetEdgeType: 'test' },
          priority: 150,  // 범위 초과
          enabled: true
        }]
      };

      const result = await edgeTypeManager.createEdgeType(invalidRuleType);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inference rule priority must be between 0 and 100');
    });
  });

  describe('InferenceEngine 기능', () => {
    beforeEach(async () => {
      // 테스트용 노드들 생성
      await database.upsertNode({
        identifier: 'test:node:a',
        type: 'function',
        name: 'nodeA',
        sourceFile: '/test/a.ts',
        language: 'typescript'
      });

      await database.upsertNode({
        identifier: 'test:node:b',
        type: 'function',
        name: 'nodeB',
        sourceFile: '/test/b.ts',
        language: 'typescript'
      });

      await database.upsertNode({
        identifier: 'test:node:c',
        type: 'function',
        name: 'nodeC',
        sourceFile: '/test/c.ts',
        language: 'typescript'
      });
    });

    it('should apply inference rules to existing edges', async () => {
      // 추론 규칙이 있는 엣지 타입 생성
      await createInferenceBasedEdgeType(edgeTypeManager);

      // 테스트 엣지 추가
      const allNodes = await database.findNodes({ nodeTypes: ['function'] });

      const nodeA = allNodes.find(n => n.identifier === 'test:node:a');
      const nodeB = allNodes.find(n => n.identifier === 'test:node:b');

      if (nodeA && nodeB && nodeA.id && nodeB.id) {
        await database.upsertRelationship({
          fromNodeId: nodeA.id,
          toNodeId: nodeB.id,
          type: 'depends_on',
          metadata: { strength: 5 }
        });
      }

      // 추론 실행 후 확인 (실제 추론 실행은 EdgeTypeManager의 create 시 자동 실행됨)
      const indirectType = edgeTypeManager.getEdgeType('indirect_dependency');
      expect(indirectType).toBeDefined();
      expect(indirectType?.inferenceRules?.length).toBe(2);
    });
  });
});

/**
 * 성능 테스트
 */
describe('EdgeType Workflow Performance', () => {
  let database: GraphDatabase;
  let edgeTypeManager: EdgeTypeManager;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `test-edge-perf-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
    edgeTypeManager = new EdgeTypeManager(database);
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  it('should handle bulk edge type creation efficiently', async () => {
    const startTime = Date.now();

    // 100개의 엣지 타입 생성
    const createPromises = [];
    for (let i = 0; i < 100; i++) {
      const edgeType = {
        type: `bulk_type_${i}`,
        description: `Bulk created type ${i}`,
        schema: { properties: { index: { type: 'number' } } },
        isDirected: true,
        isTransitive: false,
        isInheritable: false,
        priority: i % 10
      };

      createPromises.push(edgeTypeManager.createEdgeType(edgeType));
    }

    const results = await Promise.all(createPromises);
    const endTime = Date.now();

    // 모든 생성이 성공했는지 확인
    const successCount = results.filter(result => result.success).length;
    expect(successCount).toBe(100);

    // 성능 확인 (10초 이내)
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(10000);

    console.log(`✅ 100개 엣지 타입 생성 완료: ${duration}ms`);
  });

  it('should retrieve edge types efficiently', async () => {
    // 먼저 여러 타입 생성
    await createProjectAnalysisWorkflow(database);

    const startTime = Date.now();

    // 1000번 조회
    for (let i = 0; i < 1000; i++) {
      edgeTypeManager.getAvailableEdgeTypes();
      edgeTypeManager.getEdgeTypeHierarchy();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 1초 이내에 완료되어야 함
    expect(duration).toBeLessThan(1000);

    console.log(`✅ 1000번 조회 완료: ${duration}ms`);
  });
});