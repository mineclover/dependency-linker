/**
 * Advanced Graph Analysis Usage Examples
 * 고급 그래프 분석 기능 사용 예제
 */

import {
  createGraphAnalysisSystem,
  createNodeIdentifier,
  createNodeCentricAnalyzer,
  createCircularDependencyDetector
} from '../src/database';
import { analyzeProjectToGraph } from '../src/integration';

/**
 * 예제 1: React 프로젝트의 컴포넌트 의존성 분석
 */
async function analyzeReactComponentDependencies() {
  console.log('🔍 React Component Dependency Analysis');

  const projectRoot = '/path/to/react-project';
  const system = createGraphAnalysisSystem({
    projectRoot,
    projectName: 'React App Analysis',
  });

  try {
    // 1. 프로젝트 분석 및 그래프 생성
    const result = await analyzeProjectToGraph(projectRoot, {
      includePatterns: ['src/**/*.{tsx,ts,jsx,js}'],
      excludePatterns: ['**/*.test.*', '**/*.stories.*'],
      enableInference: true,
    });

    console.log(`📊 분석 완료: ${result.stats.totalFiles}개 파일, ${result.stats.totalNodes}개 노드`);

    // 2. 컴포넌트 파일들 조회
    const components = await system.query({
      nodeTypes: ['file'],
      sourceFiles: ['src/components/**'],
    });

    console.log(`🧩 발견된 컴포넌트: ${components.nodes.length}개`);

    // 3. 가장 많이 사용되는 컴포넌트 찾기
    const componentUsage = new Map<string, number>();

    for (const component of components.nodes) {
      const dependents = await system.getFileDependencies(component.sourceFile);
      componentUsage.set(component.name, dependents.dependents.length);
    }

    const mostUsedComponents = Array.from(componentUsage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('🏆 가장 많이 사용되는 컴포넌트:');
    mostUsedComponents.forEach(([name, count], index) => {
      console.log(`  ${index + 1}. ${name}: ${count}번 사용`);
    });

    // 4. 컴포넌트 계층 구조 분석
    console.log('\n📁 컴포넌트 계층 구조:');
    const hierarchy = await system.query({
      edgeTypes: ['imports'],
      sourceFiles: ['src/components/**'],
      includeInferred: true,
    });

    // 루트 컴포넌트 (다른 컴포넌트를 import하지만 import되지 않는 컴포넌트)
    const rootComponents = components.nodes.filter(comp => {
      const imports = hierarchy.edges.filter(edge => edge.startNodeId.toString() === comp.id?.toString());
      const imported = hierarchy.edges.filter(edge => edge.endNodeId.toString() === comp.id?.toString());
      return imports.length > 0 && imported.length === 0;
    });

    console.log(`🌳 루트 컴포넌트: ${rootComponents.map(c => c.name).join(', ')}`);

    return { components, hierarchy, mostUsedComponents };

  } finally {
    await system.close();
  }
}

/**
 * 예제 2: API 서비스 레이어 분석 및 최적화 제안
 */
async function analyzeApiServiceLayer() {
  console.log('🔍 API Service Layer Analysis');

  const projectRoot = '/path/to/api-project';
  const system = createGraphAnalysisSystem({
    projectRoot,
    projectName: 'API Service Analysis',
  });

  const nodeIdentifier = createNodeIdentifier(projectRoot);
  const analyzer = createNodeCentricAnalyzer(
    system.getDatabase().getDatabase(),
    system.getQueryEngine(),
    nodeIdentifier,
    {
      maxDepth: 8,
      includeInferred: true,
      edgeTypes: ['imports', 'calls', 'depends_on'],
      timeout: 10000,
    }
  );

  try {
    // 1. 서비스 파일들 분석
    const services = await system.query({
      nodeTypes: ['file'],
      sourceFiles: ['src/services/**', 'src/api/**'],
    });

    console.log(`📡 발견된 서비스: ${services.nodes.length}개`);

    // 2. 각 서비스의 영향도 분석
    const serviceAnalyses = await Promise.all(
      services.nodes.slice(0, 5).map(async (service) => {
        try {
          const analysis = await analyzer.analyzeNodeImpact(service.identifier);
          return {
            service: service.name,
            analysis,
          };
        } catch (error) {
          console.warn(`분석 실패: ${service.name} - ${error}`);
          return null;
        }
      })
    );

    const validAnalyses = serviceAnalyses.filter(Boolean);

    // 3. 높은 결합도를 가진 서비스 식별
    const highCouplingServices = validAnalyses.filter(
      (item) => item!.analysis.risks.highCoupling
    );

    if (highCouplingServices.length > 0) {
      console.log('\n⚠️  높은 결합도를 가진 서비스:');
      highCouplingServices.forEach((item) => {
        const { service, analysis } = item!;
        console.log(`  - ${service}: Fan-in ${analysis.metrics.fanIn}, Fan-out ${analysis.metrics.fanOut}`);
        console.log(`    불안정성: ${analysis.metrics.instability.toFixed(2)}`);
      });
    }

    // 4. 단일 장애점 식별
    const criticalServices = validAnalyses.filter(
      (item) => item!.analysis.risks.singlePointOfFailure
    );

    if (criticalServices.length > 0) {
      console.log('\n🚨 단일 장애점 서비스:');
      criticalServices.forEach((item) => {
        const { service, analysis } = item!;
        console.log(`  - ${service}: ${analysis.dependents.direct.length}개 서비스가 의존`);
      });
    }

    // 5. 리팩토링 권장 사항
    console.log('\n💡 리팩토링 권장 사항:');
    validAnalyses.forEach((item) => {
      const { service, analysis } = item!;
      if (analysis.metrics.instability > 0.8) {
        console.log(`  - ${service}: 불안정성이 높음, 의존성 관리 개선 필요`);
      }
      if (analysis.metrics.criticalityScore > 20) {
        console.log(`  - ${service}: 중요도가 높음, 안정성 및 테스트 강화 필요`);
      }
    });

    return { services, validAnalyses };

  } finally {
    await system.close();
  }
}

/**
 * 예제 3: 순환 의존성 탐지 및 해결 방안 제시
 */
async function detectAndAnalyzeCircularDependencies() {
  console.log('🔍 Circular Dependency Detection & Analysis');

  const projectRoot = '/path/to/project';
  const system = createGraphAnalysisSystem({
    projectRoot,
    projectName: 'Circular Dependency Analysis',
  });

  try {
    // 1. 전체 프로젝트 분석
    await analyzeProjectToGraph(projectRoot, {
      enableInference: true,
    });

    // 2. 순환 의존성 탐지기 설정
    const detector = createCircularDependencyDetector({
      maxDepth: 15,
      maxCycles: 50,
      timeout: 30000,
      edgeTypes: ['imports', 'depends_on'],
      excludeNodeTypes: ['library', 'package'],
    });

    // 3. 순환 의존성 탐지 실행
    const result = await detector.detect(
      async (nodeId) => {
        const db = system.getDatabase().getDatabase();
        const dependencies = await db.findNodeDependencies(
          parseInt(nodeId),
          ['imports', 'depends_on']
        );
        return dependencies.map(dep => ({
          to: dep.id!.toString(),
          type: 'dependency'
        }));
      },
      async () => {
        const nodes = await system.query({ nodeTypes: ['file'] });
        return nodes.nodes.map(n => ({
          id: n.id!.toString(),
          type: n.type
        }));
      }
    );

    console.log(`🔄 순환 의존성 탐지 결과:`);
    console.log(`  - 발견된 순환: ${result.cycles.length}개`);
    console.log(`  - 방문한 노드: ${result.stats.totalNodesVisited}개`);
    console.log(`  - 처리 시간: ${result.stats.processingTime.toFixed(0)}ms`);
    console.log(`  - 최대 탐지 깊이: ${result.stats.maxDepthReached}`);

    if (result.cycles.length > 0) {
      console.log('\n📋 순환 의존성 상세:');

      result.cycles
        .sort((a, b) => b.weight - a.weight) // 가중치 순으로 정렬
        .slice(0, 5) // 상위 5개만 표시
        .forEach((cycle, index) => {
          console.log(`\n  ${index + 1}. 순환 ${cycle.depth}단계 (가중치: ${cycle.weight})`);
          console.log(`     경로: ${cycle.nodes.join(' → ')}`);

          // 해결 방안 제시
          if (cycle.depth <= 2) {
            console.log(`     💡 해결방안: 인터페이스 추출 또는 의존성 역전 적용`);
          } else if (cycle.depth <= 4) {
            console.log(`     💡 해결방안: 중간 추상화 레이어 도입 고려`);
          } else {
            console.log(`     💡 해결방안: 아키텍처 재설계 필요 (복잡한 순환)`);
          }
        });

      // 4. 순환에 자주 포함되는 노드 분석
      const nodeFrequency = new Map<string, number>();
      result.cycles.forEach(cycle => {
        cycle.nodes.forEach(node => {
          nodeFrequency.set(node, (nodeFrequency.get(node) || 0) + 1);
        });
      });

      const frequentNodes = Array.from(nodeFrequency.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      if (frequentNodes.length > 0) {
        console.log('\n🎯 순환에 자주 포함되는 노드들:');
        frequentNodes.forEach(([node, count]) => {
          console.log(`  - ${node}: ${count}번 포함`);
          console.log(`    💡 이 노드를 우선적으로 리팩토링하면 여러 순환 해결 가능`);
        });
      }
    } else {
      console.log('✅ 순환 의존성이 발견되지 않았습니다.');
    }

    return result;

  } finally {
    await system.close();
  }
}

/**
 * 예제 4: 노드 중심 심화 분석 - 특정 파일의 생태계 분석
 */
async function analyzeNodeEcosystem() {
  console.log('🔍 Node Ecosystem Deep Analysis');

  const projectRoot = '/path/to/project';
  const targetFile = 'src/utils/core.ts';

  const system = createGraphAnalysisSystem({
    projectRoot,
    projectName: 'Node Ecosystem Analysis',
  });

  const nodeIdentifier = createNodeIdentifier(projectRoot);
  const analyzer = createNodeCentricAnalyzer(
    system.getDatabase().getDatabase(),
    system.getQueryEngine(),
    nodeIdentifier
  );

  try {
    // 1. 전체 분석 실행
    await analyzeProjectToGraph(projectRoot);

    const targetIdentifier = `file#${targetFile}`;

    // 2. 종합 영향도 분석
    console.log(`🎯 분석 대상: ${targetFile}`);
    const impact = await analyzer.analyzeNodeImpact(targetIdentifier);

    console.log('\n📊 영향도 분석 결과:');
    console.log(`  - Fan-in (의존받음): ${impact.metrics.fanIn}`);
    console.log(`  - Fan-out (의존함): ${impact.metrics.fanOut}`);
    console.log(`  - 불안정성: ${impact.metrics.instability.toFixed(3)}`);
    console.log(`  - 중앙성: ${impact.metrics.centrality.toFixed(3)}`);
    console.log(`  - 중요도 점수: ${impact.metrics.criticalityScore.toFixed(1)}`);

    // 3. 이웃 노드 분석
    const neighborhood = await analyzer.analyzeNodeNeighborhood(targetIdentifier);

    console.log('\n🏘️  이웃 노드 분석:');
    console.log(`  - 직접 의존성: ${neighborhood.immediate.outgoing.length}개`);
    console.log(`  - 직접 의존자: ${neighborhood.immediate.incoming.length}개`);
    console.log(`  - 2단계 이웃: ${neighborhood.extended.level2.length}개`);
    console.log(`  - 3단계 이웃: ${neighborhood.extended.level3.length}개`);
    console.log(`  - 클러스터: ${neighborhood.clusters.length}개`);

    if (neighborhood.clusters.length > 0) {
      console.log('\n🎭 발견된 클러스터:');
      neighborhood.clusters.forEach((cluster, index) => {
        console.log(`  ${index + 1}. ${cluster.purpose} (${cluster.nodes.length}개 노드, 응집도: ${cluster.cohesion.toFixed(2)})`);
      });
    }

    // 4. 진화 분석
    const evolution = await analyzer.analyzeNodeEvolution(targetIdentifier);

    console.log('\n🔄 진화 분석:');
    console.log(`  - 변경 빈도: ${evolution.changeFrequency.toFixed(3)}`);
    console.log(`  - 영향 반경: ${evolution.impactRadius}`);
    console.log(`  - 안정성 점수: ${evolution.stabilityScore.toFixed(3)}`);
    console.log(`  - 리팩토링 위험도: ${evolution.refactoringRisk}`);

    if (evolution.recommendations.length > 0) {
      console.log('\n💡 권장사항:');
      evolution.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    // 5. 위험 요소 분석
    console.log('\n⚠️  위험 요소:');
    if (impact.risks.circularDependencies.length > 0) {
      console.log(`  - 순환 의존성: ${impact.risks.circularDependencies.length}개`);
      impact.risks.circularDependencies.forEach((risk, index) => {
        console.log(`    ${index + 1}. ${risk.severity} 위험: ${risk.description}`);
      });
    }

    if (impact.risks.highCoupling) {
      console.log(`  - 높은 결합도 위험 존재`);
    }

    if (impact.risks.singlePointOfFailure) {
      console.log(`  - 단일 장애점 위험 존재`);
    }

    // 6. 관련 노드와의 경로 분석
    if (neighborhood.immediate.outgoing.length > 0) {
      const targetDep = neighborhood.immediate.outgoing[0];
      const path = await analyzer.findShortestPath(targetIdentifier, targetDep.identifier);

      if (path) {
        console.log(`\n🛤️  ${targetDep.name}까지의 경로:`);
        console.log(`     ${path.map(p => p.name).join(' → ')}`);
      }
    }

    return {
      impact,
      neighborhood,
      evolution,
    };

  } finally {
    await system.close();
  }
}

/**
 * 예제 5: 대규모 프로젝트 성능 최적화 및 배치 분석
 */
async function largescaleProjectAnalysis() {
  console.log('🔍 Large-scale Project Performance Analysis');

  const projectRoot = '/path/to/large-project';
  const system = createGraphAnalysisSystem({
    projectRoot,
    projectName: 'Large Project Analysis',
  });

  try {
    console.log('⏱️  성능 측정 시작...');
    const startTime = Date.now();

    // 1. 배치 분석 (청크 단위로 처리)
    const batchSize = 50;
    let totalFiles = 0;
    let totalNodes = 0;
    let totalEdges = 0;

    // 디렉토리별 분석
    const directories = [
      'src/components/**',
      'src/services/**',
      'src/utils/**',
      'src/api/**',
      'src/hooks/**',
    ];

    for (const dir of directories) {
      console.log(`📁 분석 중: ${dir}`);

      const dirStartTime = Date.now();
      const result = await analyzeProjectToGraph(projectRoot, {
        includePatterns: [dir],
        excludePatterns: ['**/*.test.*', '**/node_modules/**'],
        enableInference: false, // 성능을 위해 일단 비활성화
      });

      totalFiles += result.stats.totalFiles;
      totalNodes += result.stats.totalNodes;
      totalEdges += result.stats.totalEdges;

      const dirTime = Date.now() - dirStartTime;
      console.log(`  ✅ 완료: ${result.stats.totalFiles}개 파일, ${dirTime}ms`);

      // 메모리 압박 방지를 위한 대기
      if (totalNodes > 1000) {
        console.log('  🧹 메모리 정리 중...');
        if (global.gc) {
          global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 2. 전체 추론 계산 (한 번에)
    console.log('🧠 추론 관계 계산 중...');
    const inferenceStart = Date.now();
    const inferenceCount = await system.computeInferences();
    const inferenceTime = Date.now() - inferenceStart;

    // 3. 성능 통계
    const totalTime = Date.now() - startTime;
    const stats = await system.getStats();

    console.log('\n📊 대규모 분석 결과:');
    console.log(`  - 총 파일: ${totalFiles}개`);
    console.log(`  - 총 노드: ${stats.totalNodes}개`);
    console.log(`  - 총 관계: ${stats.totalRelationships}개`);
    console.log(`  - 추론 관계: ${inferenceCount}개`);
    console.log(`  - 총 처리 시간: ${totalTime.toFixed(0)}ms`);
    console.log(`  - 추론 시간: ${inferenceTime.toFixed(0)}ms`);
    console.log(`  - 평균 파일당 처리 시간: ${(totalTime / totalFiles).toFixed(1)}ms`);

    // 4. 메모리 사용량 추정
    const memoryEstimate = (stats.totalNodes * 0.5 + stats.totalRelationships * 0.3) / 1024; // KB 추정
    console.log(`  - 예상 메모리 사용량: ${memoryEstimate.toFixed(1)}KB`);

    // 5. 성능 최적화 권장사항
    console.log('\n⚡ 성능 최적화 권장사항:');

    if (totalTime > 60000) { // 1분 이상
      console.log('  - 처리 시간이 깁니다. 배치 크기를 줄이거나 병렬 처리를 고려하세요.');
    }

    if (inferenceTime > totalTime * 0.5) {
      console.log('  - 추론 계산이 오래 걸립니다. 추론 깊이를 제한하거나 선택적 추론을 사용하세요.');
    }

    if (stats.totalRelationships / stats.totalNodes > 3) {
      console.log('  - 노드당 관계 수가 많습니다. 그래프 복잡도가 높으니 인덱스 최적화를 고려하세요.');
    }

    // 6. 언어별 분석
    console.log('\n🗣️  언어별 분포:');
    Object.entries(stats.filesByLanguage).forEach(([lang, count]) => {
      const percentage = ((count / totalFiles) * 100).toFixed(1);
      console.log(`  - ${lang}: ${count}개 (${percentage}%)`);
    });

    return {
      totalFiles,
      totalNodes: stats.totalNodes,
      totalEdges: stats.totalRelationships,
      inferenceCount,
      totalTime,
      inferenceTime,
      stats,
    };

  } finally {
    await system.close();
  }
}

// 모든 예제 실행
async function runAdvancedExamples() {
  try {
    console.log('🚀 Advanced Graph Analysis Examples\n');

    console.log('=' .repeat(60));
    await analyzeReactComponentDependencies();

    console.log('\n' + '='.repeat(60));
    await analyzeApiServiceLayer();

    console.log('\n' + '='.repeat(60));
    await detectAndAnalyzeCircularDependencies();

    console.log('\n' + '='.repeat(60));
    await analyzeNodeEcosystem();

    console.log('\n' + '='.repeat(60));
    await largescaleProjectAnalysis();

    console.log('\n✅ 모든 고급 예제가 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error('❌ 예제 실행 중 오류 발생:', error);
  }
}

// 실행
if (require.main === module) {
  runAdvancedExamples();
}

export {
  analyzeReactComponentDependencies,
  analyzeApiServiceLayer,
  detectAndAnalyzeCircularDependencies,
  analyzeNodeEcosystem,
  largescaleProjectAnalysis,
  runAdvancedExamples,
};