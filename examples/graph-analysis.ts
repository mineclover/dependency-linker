/**
 * Graph Analysis Usage Examples
 * 그래프 분석 시스템 사용 예제
 */

import { analyzeProjectToGraph, analyzeFileToGraph, createGraphAnalysisSystem } from '../src/integration';
import type { QueryFilter } from '../src/database';

async function basicUsageExample() {
  console.log('🔍 Basic Project Analysis Example');

  // 프로젝트 전체 분석
  const result = await analyzeProjectToGraph('/path/to/project', {
    projectName: 'My Project',
    enableInference: true,
    includePatterns: ['src/**/*.{ts,tsx,js,jsx}'],
    excludePatterns: ['**/node_modules/**', '**/*.test.*'],
  });

  console.log('📊 Analysis Results:');
  console.log(`- Files analyzed: ${result.stats.totalFiles}`);
  console.log(`- Nodes created: ${result.stats.totalNodes}`);
  console.log(`- Edges created: ${result.stats.totalEdges}`);
  console.log(`- Inferences computed: ${result.inferenceCount}`);
  console.log(`- Processing time: ${result.stats.processingTime}ms`);

  return result;
}

async function singleFileAnalysisExample() {
  console.log('📄 Single File Analysis Example');

  // 단일 파일 분석
  const result = await analyzeFileToGraph(
    '/path/to/project',
    '/path/to/project/src/components/UserProfile.tsx'
  );

  console.log('📊 File Analysis Results:');
  console.log(`- Imports: ${result.result.imports?.length || 0}`);
  console.log(`- Exports: ${result.result.exports?.length || 0}`);
  console.log(`- Declarations: ${result.result.declarations?.length || 0}`);
  console.log(`- Function calls: ${result.result.functionCalls?.length || 0}`);

  return result;
}

async function advancedQueryExample() {
  console.log('🔍 Advanced Query Example');

  const system = createGraphAnalysisSystem({
    projectRoot: '/path/to/project',
    projectName: 'My Project',
  });

  try {
    // 1. 특정 파일 타입의 노드만 조회
    const tsFiles = await system.query({
      nodeTypes: ['file'],
      languages: ['typescript', 'tsx'],
    });

    console.log(`📁 TypeScript files: ${tsFiles.nodes.length}`);

    // 2. import 관계만 조회
    const importRelations = await system.query({
      edgeTypes: ['imports'],
      includeInferred: false,
    });

    console.log(`🔗 Import relationships: ${importRelations.edges.length}`);

    // 3. 특정 파일의 의존성 조회
    const dependencies = await system.getFileDependencies('src/api/auth.ts');

    console.log('📦 Dependencies:');
    console.log(`- Direct dependencies: ${dependencies.dependencies.length}`);
    console.log(`- Files depending on this: ${dependencies.dependents.length}`);

    // 4. 순환 의존성 검사
    const cycles = await system.getCircularDependencies();

    if (cycles.length > 0) {
      console.log(`⚠️  Found ${cycles.length} circular dependencies`);
      cycles.forEach((cycle, index) => {
        console.log(`  Cycle ${index + 1}: ${cycle.map(n => n.name).join(' → ')}`);
      });
    } else {
      console.log('✅ No circular dependencies found');
    }

    // 5. 추론된 관계 포함 조회
    const withInferences = await system.query({
      edgeTypes: ['depends_on'],
      includeInferred: true,
      maxDepth: 3,
    });

    console.log(`🧠 Inferred relationships: ${withInferences.inferred?.length || 0}`);

    return {
      tsFiles,
      importRelations,
      dependencies,
      cycles,
      withInferences,
    };

  } finally {
    await system.close();
  }
}

async function hierarchyAnalysisExample() {
  console.log('🏗️ Hierarchy Analysis Example');

  const system = createGraphAnalysisSystem({
    projectRoot: '/path/to/project',
  });

  try {
    // 컨테인먼트 계층 조회 (파일 → 클래스 → 메서드)
    const containmentQuery: QueryFilter = {
      edgeTypes: ['contains', 'declares'],
      includeInferred: true,
    };

    const hierarchy = await system.query(containmentQuery);

    console.log('📊 Containment Hierarchy:');

    // 파일별 선언 분석
    const fileNodes = hierarchy.nodes.filter(n => n.type === 'file');

    for (const file of fileNodes.slice(0, 5)) { // 상위 5개 파일만 표시
      const fileEdges = hierarchy.edges.filter(e => e.startNodeId === file.id);
      const declarationCount = fileEdges.length;

      console.log(`📄 ${file.name}: ${declarationCount} declarations`);

      // 해당 파일의 선언들 표시
      const declarations = fileEdges.map(edge => {
        const declaration = hierarchy.nodes.find(n => n.id === edge.endNodeId);
        return declaration ? `${declaration.type}:${declaration.name}` : 'unknown';
      });

      console.log(`   └─ ${declarations.slice(0, 3).join(', ')}${declarations.length > 3 ? '...' : ''}`);
    }

    return hierarchy;

  } finally {
    await system.close();
  }
}

async function performanceAnalysisExample() {
  console.log('⚡ Performance Analysis Example');

  const startTime = Date.now();

  const system = createGraphAnalysisSystem({
    projectRoot: '/path/to/project',
  });

  try {
    // 프로젝트 통계
    const stats = await system.getStats();

    console.log('📊 Project Statistics:');
    console.log(`- Total nodes: ${stats.totalNodes}`);
    console.log(`- Total relationships: ${stats.totalRelationships}`);

    console.log('\n📁 Files by language:');
    Object.entries(stats.filesByLanguage).forEach(([lang, count]) => {
      console.log(`  ${lang}: ${count} files`);
    });

    console.log('\n🔗 Nodes by type:');
    Object.entries(stats.nodesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n🔗 Relationships by type:');
    Object.entries(stats.relationshipsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // 추론 시간 측정
    const inferenceStart = Date.now();
    const inferenceCount = await system.computeInferences();
    const inferenceTime = Date.now() - inferenceStart;

    console.log(`\n🧠 Inference computation:`);
    console.log(`- Inferred relationships: ${inferenceCount}`);
    console.log(`- Computation time: ${inferenceTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total analysis time: ${totalTime}ms`);

    return {
      stats,
      inferenceCount,
      inferenceTime,
      totalTime,
    };

  } finally {
    await system.close();
  }
}

// 모든 예제 실행
async function runAllExamples() {
  try {
    console.log('🚀 Starting Graph Analysis Examples\n');

    await basicUsageExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await singleFileAnalysisExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await advancedQueryExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await hierarchyAnalysisExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await performanceAnalysisExample();

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// 실행
if (require.main === module) {
  runAllExamples();
}

export {
  basicUsageExample,
  singleFileAnalysisExample,
  advancedQueryExample,
  hierarchyAnalysisExample,
  performanceAnalysisExample,
  runAllExamples,
};