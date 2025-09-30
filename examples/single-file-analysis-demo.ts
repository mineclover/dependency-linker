/**
 * Single File Analysis Demo
 * 단일 파일 분석 API 사용 예제
 */

import { join } from 'node:path';
import {
  analyzeSingleFile,
  analyzeMultipleFiles,
  SingleFileAnalyzer,
  SingleFileAnalysisError,
} from '../src/integration';

// 프로젝트 루트 경로
const projectRoot = process.cwd();

/**
 * Example 1: 기본 단일 파일 분석
 */
async function basicSingleFileAnalysis() {
  console.log('\n=== Example 1: Basic Single File Analysis ===\n');

  try {
    const filePath = join(projectRoot, 'src/integration/SingleFileAnalysis.ts');

    const result = await analyzeSingleFile(filePath, {
      projectName: 'Demo Project',
      enableInference: true,
    });

    console.log('✅ Analysis Complete');
    console.log(`File: ${result.filePath}`);
    console.log(`Language: ${result.language}`);
    console.log(`Nodes created: ${result.stats.nodesCreated}`);
    console.log(`Edges created: ${result.stats.edgesCreated}`);
    console.log(`Inference count: ${result.inferenceCount}`);
    console.log(`Processing time: ${result.stats.processingTime}ms`);

    // 파싱 결과 확인
    console.log(`\nImports: ${result.parseResult.imports?.length || 0}`);
    console.log(`Exports: ${result.parseResult.exports?.length || 0}`);
    console.log(`Declarations: ${result.parseResult.declarations?.length || 0}`);
  } catch (error) {
    if (error instanceof SingleFileAnalysisError) {
      console.error(`❌ Error [${error.code}]: ${error.message}`);
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

/**
 * Example 2: 커스텀 DB 경로 사용
 */
async function customDbPath() {
  console.log('\n=== Example 2: Custom DB Path ===\n');

  const filePath = join(projectRoot, 'src/database/GraphDatabase.ts');
  const dbPath = join(projectRoot, '.tmp/custom-analysis.db');

  try {
    const result = await analyzeSingleFile(filePath, {
      dbPath,
      projectRoot,
      projectName: 'Custom DB Demo',
      enableInference: true,
    });

    console.log('✅ Analysis Complete');
    console.log(`Database stored at: ${dbPath}`);
    console.log(`Nodes: ${result.stats.nodesCreated}, Edges: ${result.stats.edgesCreated}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 3: 여러 파일 분석 (배치 처리)
 */
async function multipleFilesAnalysis() {
  console.log('\n=== Example 3: Multiple Files Analysis ===\n');

  const files = [
    join(projectRoot, 'src/integration/SingleFileAnalysis.ts'),
    join(projectRoot, 'src/integration/DependencyToGraph.ts'),
    join(projectRoot, 'src/integration/index.ts'),
  ];

  try {
    console.log(`Analyzing ${files.length} files...\n`);

    const results = await analyzeMultipleFiles(files, {
      projectName: 'Batch Analysis Demo',
      enableInference: true,
    });

    console.log(`✅ Analyzed ${results.length} files\n`);

    results.forEach((result, index) => {
      console.log(`File ${index + 1}: ${result.filePath.split('/').pop()}`);
      console.log(`  Nodes: ${result.stats.nodesCreated}, Edges: ${result.stats.edgesCreated}`);
      console.log(`  Time: ${result.stats.processingTime}ms`);
    });

    // 전체 통계
    const totalNodes = results.reduce((sum, r) => sum + r.stats.nodesCreated, 0);
    const totalEdges = results.reduce((sum, r) => sum + r.stats.edgesCreated, 0);
    const totalTime = results.reduce((sum, r) => sum + r.stats.processingTime, 0);

    console.log(`\nTotal Statistics:`);
    console.log(`  Total Nodes: ${totalNodes}`);
    console.log(`  Total Edges: ${totalEdges}`);
    console.log(`  Total Time: ${totalTime}ms`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 4: SingleFileAnalyzer 클래스 직접 사용
 * (GraphAnalysisSystem 재사용)
 */
async function reuseAnalyzer() {
  console.log('\n=== Example 4: Reuse Analyzer Instance ===\n');

  const analyzer = new SingleFileAnalyzer();

  try {
    const files = [
      join(projectRoot, 'src/core/types.ts'),
      join(projectRoot, 'src/core/Parser.ts'),
    ];

    console.log('Analyzing files with reused analyzer instance...\n');

    for (const file of files) {
      const result = await analyzer.analyze(file, {
        projectName: 'Reuse Demo',
        enableInference: false, // 마지막에 한 번만 실행
      });

      console.log(`✅ ${file.split('/').pop()}`);
      console.log(`  Nodes: ${result.stats.nodesCreated}, Time: ${result.stats.processingTime}ms`);
    }

    console.log('\nClosing analyzer...');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await analyzer.close();
    console.log('✅ Analyzer closed');
  }
}

/**
 * Example 5: 에러 처리
 */
async function errorHandling() {
  console.log('\n=== Example 5: Error Handling ===\n');

  // 1. 존재하지 않는 파일
  try {
    await analyzeSingleFile('/nonexistent/file.ts');
  } catch (error) {
    if (error instanceof SingleFileAnalysisError) {
      console.log(`❌ Expected Error [${error.code}]: ${error.message}`);
    }
  }

  // 2. 상대 경로 (절대 경로 필요)
  try {
    await analyzeSingleFile('relative/path/file.ts');
  } catch (error) {
    if (error instanceof SingleFileAnalysisError) {
      console.log(`❌ Expected Error [${error.code}]: ${error.message}`);
    }
  }

  // 3. 지원하지 않는 파일 타입
  try {
    await analyzeSingleFile(join(projectRoot, 'package.json'));
  } catch (error) {
    if (error instanceof SingleFileAnalysisError) {
      console.log(`❌ Expected Error [${error.code}]: ${error.message}`);
    }
  }

  console.log('\n✅ Error handling examples complete');
}

/**
 * Example 6: 언어 명시적 지정
 */
async function explicitLanguage() {
  console.log('\n=== Example 6: Explicit Language Specification ===\n');

  const filePath = join(projectRoot, 'src/integration/SingleFileAnalysis.ts');

  try {
    const result = await analyzeSingleFile(filePath, {
      autoDetectLanguage: false,
      language: 'typescript', // 명시적으로 언어 지정
      projectName: 'Explicit Language Demo',
    });

    console.log('✅ Analysis Complete');
    console.log(`Specified language: typescript`);
    console.log(`Detected language: ${result.language}`);
    console.log(`Nodes created: ${result.stats.nodesCreated}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Example 7: 추론 비활성화
 */
async function withoutInference() {
  console.log('\n=== Example 7: Analysis Without Inference ===\n');

  const filePath = join(projectRoot, 'src/database/GraphDatabase.ts');

  try {
    const startTime = Date.now();

    const result = await analyzeSingleFile(filePath, {
      enableInference: false,
      projectName: 'No Inference Demo',
    });

    const totalTime = Date.now() - startTime;

    console.log('✅ Analysis Complete (No Inference)');
    console.log(`Nodes: ${result.stats.nodesCreated}`);
    console.log(`Edges: ${result.stats.edgesCreated}`);
    console.log(`Inference count: ${result.inferenceCount || 'N/A'}`);
    console.log(`Total time: ${totalTime}ms`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * 모든 예제 실행
 */
async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('Single File Analysis API Demo');
  console.log('='.repeat(60));

  await basicSingleFileAnalysis();
  await customDbPath();
  await multipleFilesAnalysis();
  await reuseAnalyzer();
  await errorHandling();
  await explicitLanguage();
  await withoutInference();

  console.log('\n' + '='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60) + '\n');
}

// 실행
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicSingleFileAnalysis,
  customDbPath,
  multipleFilesAnalysis,
  reuseAnalyzer,
  errorHandling,
  explicitLanguage,
  withoutInference,
};