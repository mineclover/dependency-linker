/**
 * EdgeType Workflow Examples
 * GraphQueryEngine 에서 새로운 타입 생성 및 의존성 추론 정의 워크플로우
 */

import { EdgeTypeManager, EdgeTypeDefinition, InferenceRule } from '../types/EdgeTypeManager';
import { GraphDatabase } from '../GraphDatabase';

/**
 * Workflow 1: 기본 엣지 타입 생성
 * 파일 간 import/export 관계를 위한 기본 엣지 타입 정의
 */
export async function createBasicImportEdgeType(
  edgeTypeManager: EdgeTypeManager
): Promise<void> {
  console.log('📋 Workflow 1: 기본 Import 엣지 타입 생성');

  const importEdgeType: EdgeTypeDefinition = {
    type: 'imports',
    description: '파일 간 import/export 의존성 관계',
    schema: {
      properties: {
        importType: {
          type: 'string',
          enum: ['default', 'named', 'namespace', 'dynamic']
        },
        importPath: { type: 'string' },
        isRelative: { type: 'boolean' }
      },
      required: ['importType', 'importPath']
    },
    isDirected: true,
    isTransitive: false,
    isInheritable: false,
    priority: 10
  };

  const result = await edgeTypeManager.createEdgeType(importEdgeType);

  if (result.success) {
    console.log('✅ Import 엣지 타입 생성 완료');
  } else {
    console.error('❌ 생성 실패:', result.errors);
  }
}

/**
 * Workflow 2: 계층적 엣지 타입 생성
 * 상위 타입을 기반으로 한 세분화된 의존성 관계 정의
 */
export async function createHierarchicalDependencyTypes(
  edgeTypeManager: EdgeTypeManager
): Promise<void> {
  console.log('📋 Workflow 2: 계층적 의존성 타입 생성');

  // 1. 기본 의존성 타입 (상위 타입)
  const baseDependency: EdgeTypeDefinition = {
    type: 'depends_on',
    description: '기본 의존성 관계',
    schema: {
      properties: {
        strength: { type: 'number', minimum: 1, maximum: 10 },
        category: { type: 'string' }
      }
    },
    isDirected: true,
    isTransitive: true,
    isInheritable: true,
    priority: 5
  };

  await edgeTypeManager.createEdgeType(baseDependency);

  // 2. 구체적인 하위 타입들
  const subtypes = [
    {
      type: 'function_calls',
      description: '함수 호출 의존성',
      parentType: 'depends_on',
      priority: 8,
      schema: {
        properties: {
          functionName: { type: 'string' },
          callCount: { type: 'number' },
          isAsync: { type: 'boolean' }
        }
      }
    },
    {
      type: 'class_extends',
      description: '클래스 상속 관계',
      parentType: 'depends_on',
      priority: 9,
      schema: {
        properties: {
          className: { type: 'string' },
          isAbstract: { type: 'boolean' }
        }
      }
    },
    {
      type: 'interface_implements',
      description: '인터페이스 구현 관계',
      parentType: 'depends_on',
      priority: 7,
      schema: {
        properties: {
          interfaceName: { type: 'string' },
          methodCount: { type: 'number' }
        }
      }
    }
  ];

  for (const subtype of subtypes) {
    const definition: EdgeTypeDefinition = {
      ...subtype,
      isDirected: true,
      isTransitive: false,
      isInheritable: true
    };

    const result = await edgeTypeManager.createEdgeType(definition);

    if (result.success) {
      console.log(`✅ ${subtype.type} 타입 생성 완료`);
    } else {
      console.error(`❌ ${subtype.type} 생성 실패:`, result.errors);
    }
  }
}

/**
 * Workflow 3: 추론 규칙이 있는 엣지 타입 생성
 * 자동 추론을 통한 간접 의존성 발견
 */
export async function createInferenceBasedEdgeType(
  edgeTypeManager: EdgeTypeManager
): Promise<void> {
  console.log('📋 Workflow 3: 추론 규칙 기반 엣지 타입 생성');

  // 추론 규칙 정의
  const transitiveRule: InferenceRule = {
    id: 'transitive_dependency',
    name: '전이적 의존성 추론',
    description: 'A → B, B → C이면 A → C 관계를 추론',
    condition: {
      type: 'path',
      pattern: 'A -> B -> C',
      edgeTypeConstraints: ['depends_on', 'function_calls'],
      nodeTypeConstraints: ['function', 'class', 'module']
    },
    action: {
      type: 'create_edge',
      targetEdgeType: 'indirect_dependency',
      metadataTransform: {
        inferenceType: 'transitive',
        pathLength: 2,
        confidence: 0.8
      }
    },
    priority: 50,
    enabled: true
  };

  const circularDetectionRule: InferenceRule = {
    id: 'circular_dependency_detection',
    name: '순환 의존성 탐지',
    description: '순환 참조 패턴 자동 탐지 및 표시',
    condition: {
      type: 'pattern',
      pattern: '.*\\s--\\[depends_on\\]-->\\s.*\\s--\\[depends_on\\]-->\\s.*',
      edgeTypeConstraints: ['depends_on', 'imports']
    },
    action: {
      type: 'update_metadata',
      targetEdgeType: 'depends_on',
      metadataTransform: {
        hasCycles: true,
        riskLevel: 'high',
        detectedAt: new Date().toISOString()
      }
    },
    priority: 90,
    enabled: true
  };

  // 간접 의존성 타입 생성
  const indirectDependency: EdgeTypeDefinition = {
    type: 'indirect_dependency',
    description: '추론된 간접 의존성 관계',
    schema: {
      properties: {
        inferenceType: { type: 'string', enum: ['transitive', 'aggregated'] },
        pathLength: { type: 'number' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        sourceRules: { type: 'array', items: { type: 'string' } }
      }
    },
    isDirected: true,
    isTransitive: false,
    isInheritable: false,
    priority: 3,
    inferenceRules: [transitiveRule, circularDetectionRule],
    conflictResolution: 'merge_metadata'
  };

  const result = await edgeTypeManager.createEdgeType(indirectDependency);

  if (result.success) {
    console.log('✅ 추론 기반 엣지 타입 생성 완료');
    console.log(`📊 활성화된 추론 규칙: ${result.affectedInferences}개`);
  } else {
    console.error('❌ 생성 실패:', result.errors);
  }
}

/**
 * Workflow 4: 복합 워크플로우 - 프로젝트 의존성 분석 시스템
 * 여러 엣지 타입을 조합한 종합적인 의존성 분석
 */
export async function createProjectAnalysisWorkflow(
  database: GraphDatabase
): Promise<void> {
  console.log('📋 Workflow 4: 프로젝트 의존성 분석 시스템 구축');

  const edgeTypeManager = new EdgeTypeManager(database);

  // 1. 기본 타입들 생성
  await createBasicImportEdgeType(edgeTypeManager);
  await createHierarchicalDependencyTypes(edgeTypeManager);
  await createInferenceBasedEdgeType(edgeTypeManager);

  // 2. 성능 관련 엣지 타입 추가
  const performanceEdgeType: EdgeTypeDefinition = {
    type: 'performance_impact',
    description: '성능에 영향을 미치는 의존성',
    schema: {
      properties: {
        impactScore: { type: 'number', minimum: 1, maximum: 100 },
        bottleneckType: {
          type: 'string',
          enum: ['cpu', 'memory', 'io', 'network']
        },
        measuredLatency: { type: 'number' }
      }
    },
    isDirected: true,
    isTransitive: false,
    isInheritable: false,
    priority: 15,
    inferenceRules: [{
      id: 'performance_aggregation',
      name: '성능 영향 집계',
      description: '연결된 컴포넌트들의 성능 영향 집계',
      condition: {
        type: 'custom',
        customFunction: `
          return edge.metadata &&
                 edge.metadata.impactScore &&
                 edge.metadata.impactScore > 50;
        `
      },
      action: {
        type: 'aggregate',
        targetEdgeType: 'performance_impact',
        aggregationMethod: 'sum',
        metadataTransform: {
          aggregationType: 'performance_sum'
        }
      },
      priority: 40,
      enabled: true
    }]
  };

  await edgeTypeManager.createEdgeType(performanceEdgeType);

  // 3. 엣지 타입 계층 구조 조회
  const hierarchy = edgeTypeManager.getEdgeTypeHierarchy();
  console.log('🌳 엣지 타입 계층 구조:');
  console.log(JSON.stringify(hierarchy, null, 2));

  // 4. 사용 가능한 모든 엣지 타입 조회
  const availableTypes = edgeTypeManager.getAvailableEdgeTypes();
  console.log(`📊 총 ${availableTypes.length}개의 엣지 타입이 정의됨:`);
  availableTypes.forEach(type => {
    console.log(`  - ${type.type}: ${type.description} (우선순위: ${type.priority})`);
  });
}

/**
 * Workflow 5: 동적 엣지 타입 관리
 * 런타임에서 엣지 타입 수정 및 업데이트
 */
export async function demonstrateDynamicEdgeTypeManagement(
  edgeTypeManager: EdgeTypeManager
): Promise<void> {
  console.log('📋 Workflow 5: 동적 엣지 타입 관리');

  // 1. 기존 엣지 타입 조회
  const existingType = edgeTypeManager.getEdgeType('depends_on');
  if (!existingType) {
    console.log('⚠️ depends_on 타입이 없어 먼저 생성합니다.');
    await createHierarchicalDependencyTypes(edgeTypeManager);
  }

  // 2. 엣지 타입 업데이트
  console.log('🔧 엣지 타입 업데이트 중...');
  const updateResult = await edgeTypeManager.updateEdgeType('depends_on', {
    description: '업데이트된 기본 의존성 관계 - 향상된 추론 기능',
    priority: 8,
    isTransitive: false, // 전이성 비활성화
    inferenceRules: [{
      id: 'updated_rule',
      name: '업데이트된 추론 규칙',
      description: '새로운 추론 로직',
      condition: {
        type: 'pattern',
        pattern: '.*module.*'
      },
      action: {
        type: 'update_metadata',
        targetEdgeType: 'depends_on',
        metadataTransform: {
          updatedRule: true,
          timestamp: new Date().toISOString()
        }
      },
      priority: 60,
      enabled: true
    }]
  });

  if (updateResult.success) {
    console.log('✅ 엣지 타입 업데이트 완료');
    if (updateResult.warnings) {
      console.log('⚠️ 경고사항:', updateResult.warnings);
    }
    console.log(`📊 영향받은 추론: ${updateResult.affectedInferences}개`);
  } else {
    console.error('❌ 업데이트 실패:', updateResult.errors);
  }

  // 3. 의존성 체크 후 삭제 시도
  console.log('🗑️ 엣지 타입 삭제 시도...');
  const deleteResult = await edgeTypeManager.deleteEdgeType('depends_on', false);

  if (!deleteResult.success) {
    console.log('⚠️ 의존성이 있어 삭제할 수 없습니다:', deleteResult.warnings);

    // 강제 삭제
    const forceDeleteResult = await edgeTypeManager.deleteEdgeType('depends_on', true);
    if (forceDeleteResult.success) {
      console.log('✅ 강제 삭제 완료');
    }
  }
}

/**
 * 통합 예제 실행 함수
 */
export async function runAllEdgeTypeWorkflows(database: GraphDatabase): Promise<void> {
  console.log('🚀 EdgeType 워크플로우 통합 실행 시작\n');

  try {
    // Workflow 1-4: 기본 설정 및 프로젝트 분석 시스템 구축
    await createProjectAnalysisWorkflow(database);

    console.log('\n' + '='.repeat(50) + '\n');

    // Workflow 5: 동적 관리 데모
    const edgeTypeManager = new EdgeTypeManager(database);
    await demonstrateDynamicEdgeTypeManagement(edgeTypeManager);

    console.log('\n🎉 모든 워크플로우 실행 완료!');

  } catch (error) {
    console.error('❌ 워크플로우 실행 중 오류:', error);
  }
}

/**
 * 실제 사용 예제 - 코드베이스 분석
 */
export function createCodebaseAnalysisExample(): EdgeTypeDefinition[] {
  return [
    // 파일 레벨 의존성
    {
      type: 'file_imports',
      description: '파일 간 import 관계',
      schema: { properties: { importPath: { type: 'string' } } },
      isDirected: true,
      isTransitive: false,
      isInheritable: false,
      priority: 10
    },

    // API 호출 의존성
    {
      type: 'api_calls',
      description: 'API 엔드포인트 호출 관계',
      schema: {
        properties: {
          endpoint: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          frequency: { type: 'number' }
        }
      },
      isDirected: true,
      isTransitive: false,
      isInheritable: false,
      priority: 8
    },

    // 데이터베이스 의존성
    {
      type: 'database_access',
      description: '데이터베이스 테이블/컬렉션 접근',
      schema: {
        properties: {
          table: { type: 'string' },
          operation: { type: 'string', enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] }
        }
      },
      isDirected: true,
      isTransitive: false,
      isInheritable: false,
      priority: 9
    }
  ];
}