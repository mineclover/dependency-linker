/**
 * 간단한 사용법 예제들
 * Simple Usage Examples
 */

import { 
  createCodeAnalysisService, 
  createDefaultService 
} from '../src/services/codeAnalysisService';
import { analysisWorkflowManager } from '../src/services/workflow/analysisWorkflowManager';
import { parserFactory } from '../src/services/parsers';
import { analysisIndexManager } from '../src/services/analysis/analysisIndexManager';

console.log('📚 Simple Usage Examples for Code Analysis System\n');

/**
 * 예제 1: 기본적인 단일 파일 분석
 */
async function example1_basicFileAnalysis() {
  console.log('📄 Example 1: Basic File Analysis');
  console.log('-'.repeat(40));
  
  // 1. 단일 파일 직접 분석
  const result = await parserFactory.analyzeFile('./src/services/parsers/typescript/typescriptParser.ts');
  
  if (result) {
    console.log(`✅ File: ${result.filePath}`);
    console.log(`📝 Language: ${result.language}`);
    console.log(`🔗 Dependencies: ${result.dependencies.length}`);
    console.log(`⚙️  Functions: ${result.functions.length}`);
    console.log(`🏗️  Classes: ${result.classes.length}`);
    console.log(`📊 Lines of Code: ${result.metrics.linesOfCode}`);
    console.log(`⏱️  Analysis Time: ${result.analysisTime}ms\n`);
  }
}

/**
 * 예제 2: 워크플로우를 통한 파일 분석 (인덱스 저장 포함)
 */
async function example2_workflowAnalysis() {
  console.log('🔄 Example 2: Workflow Analysis with Indexing');
  console.log('-'.repeat(50));
  
  // 워크플로우를 통해 분석 (자동으로 SQLite에 저장됨)
  const result = await analysisWorkflowManager.processFile(
    './src/services/parsers/python/pythonParser.ts'
  );
  
  console.log(`✅ Success: ${result.success}`);
  console.log(`📄 File: ${result.filePath}`);
  console.log(`🗄️  Index ID: ${result.indexId}`);
  console.log(`📊 Processing Time: ${result.processingTime}ms`);
  
  if (result.analysisResult) {
    console.log(`🔗 Dependencies: ${result.analysisResult.dependencies.length}`);
    console.log(`⚙️  Functions: ${result.analysisResult.functions.length}`);
  }
  console.log();
}

/**
 * 예제 3: 배치 파일 처리
 */
async function example3_batchProcessing() {
  console.log('📦 Example 3: Batch File Processing');
  console.log('-'.repeat(40));
  
  const files = [
    './src/services/parsers/go/goParser.ts',
    './src/services/parsers/rust/rustParser.ts'
  ];
  
  const result = await analysisWorkflowManager.processBatch(files, {
    parallel: true,
    batchSize: 2,
    skipNotionUpload: true // Notion 업로드는 스킵
  });
  
  console.log(`📊 Total Files: ${result.totalFiles}`);
  console.log(`✅ Successful: ${result.successfulFiles}`);
  console.log(`⚠️  Skipped: ${result.skippedFiles}`);
  console.log(`❌ Failed: ${result.failedFiles}`);
  console.log(`⏱️  Total Time: ${result.totalTime}ms`);
  console.log(`📈 Average Time: ${Math.round(result.averageTimePerFile)}ms per file\n`);
}

/**
 * 예제 4: 실시간 파일 감시
 */
async function example4_fileWatching() {
  console.log('👀 Example 4: Real-time File Watching');
  console.log('-'.repeat(40));
  
  // 기본 서비스 생성 (자동 감시 활성화)
  const service = createDefaultService(['./examples']);
  
  // 이벤트 리스너
  service.on('fileProcessed', (data) => {
    console.log(`🔄 Processed: ${data.event.filePath}`);
  });
  
  console.log('🚀 Starting file watcher for ./examples directory...');
  console.log('📝 Try creating or modifying a .ts, .js, or .py file in the examples directory');
  console.log('⏰ Watching for 5 seconds...\n');
  
  await service.start();
  
  // 5초간 감시
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await service.stop();
  console.log('✅ File watching stopped\n');
  
  // Re-initialize database for next examples since it was closed
  analysisIndexManager.initializeDatabase();
}

/**
 * 예제 5: 인덱스 데이터 조회
 */
async function example5_queryIndexData() {
  console.log('🔍 Example 5: Querying Index Data');
  console.log('-'.repeat(35));
  
  // 통계 정보 조회
  const stats = analysisIndexManager.getStatistics();
  console.log('📊 Database Statistics:');
  console.log(`   Total Files: ${stats.totalFiles.count}`);
  console.log(`   Total Dependencies: ${stats.totalDependencies.count}`);
  console.log(`   Total Functions: ${stats.totalFunctions.count}`);
  console.log();
  
  // 언어별 파일 수 조회
  console.log('📝 Files by Language:');
  for (const langData of stats.filesByLanguage) {
    console.log(`   ${langData.language}: ${langData.count} files`);
  }
  console.log();
  
  // 특정 파일 정보 조회
  const file = analysisIndexManager.getFile('./src/services/parsers/typescript/typescriptParser.ts');
  if (file) {
    console.log('📄 File Details:');
    console.log(`   Language: ${file.language}`);
    console.log(`   Last Modified: ${new Date(file.lastModified * 1000).toLocaleString()}`);
    console.log(`   Analysis Time: ${file.analysisTime}ms`);
    
    // 해당 파일의 종속성 조회
    const dependencies = analysisIndexManager.getFileDependencies(file.id);
    console.log(`   Dependencies: ${dependencies.length}`);
  }
  console.log();
}

/**
 * 예제 6: 언어별 분석 능력 확인
 */
async function example6_languageCapabilities() {
  console.log('🌐 Example 6: Language Analysis Capabilities');
  console.log('-'.repeat(45));
  
  // 지원하는 언어 목록
  const languages = parserFactory.getSupportedLanguages();
  console.log('✅ Supported Languages:', languages.join(', '));
  
  // 지원하는 확장자 목록
  const extensions = parserFactory.getSupportedExtensions();
  console.log('📁 Supported Extensions:', extensions.join(', '));
  
  // 파서 정보
  const parserInfo = parserFactory.getParserInfo();
  console.log('\n📋 Parser Information:');
  for (const info of parserInfo) {
    console.log(`   ${info.language} v${info.version}: ${info.extensions.join(', ')}`);
  }
  
  // 파서 통계
  const parserStats = parserFactory.getParserStatistics();
  console.log('\n📊 Parser Statistics:');
  console.log(`   Total Parsers: ${parserStats.totalParsers}`);
  console.log(`   Total Extensions: ${parserStats.totalExtensions}`);
  console.log(`   Web Development: ${parserStats.parsersByCategory.webDevelopment} parsers`);
  console.log(`   Systems Programming: ${parserStats.parsersByCategory.systemsProgramming} parsers`);
  console.log(`   Scripting Languages: ${parserStats.parsersByCategory.scriptingLanguages} parsers`);
  console.log();
}

/**
 * 예제 7: 에러 처리 및 복구
 */
async function example7_errorHandling() {
  console.log('🚨 Example 7: Error Handling and Recovery');
  console.log('-'.repeat(45));
  
  // 존재하지 않는 파일
  console.log('Testing non-existent file...');
  const result1 = await analysisWorkflowManager.processFile('./non-existent-file.ts');
  console.log(`❌ Non-existent file - Success: ${result1.success}, Error: ${result1.error}`);
  
  // 지원하지 않는 파일 형식
  console.log('Testing unsupported file type...');
  const result2 = await analysisWorkflowManager.processFile('./package.json');
  console.log(`⚠️  Unsupported type - Success: ${result2.success}, Skipped: ${result2.wasSkipped}`);
  
  // 배치 처리에서의 부분 실패
  console.log('Testing batch processing with mixed file types...');
  const mixedFiles = [
    './src/services/parsers/typescript/typescriptParser.ts', // 유효
    './non-existent.ts', // 존재하지 않음
    './package.json' // 지원하지 않음
  ];
  
  const batchResult = await analysisWorkflowManager.processBatch(mixedFiles);
  console.log(`📊 Batch Result - Total: ${batchResult.totalFiles}, Success: ${batchResult.successfulFiles}, Failed: ${batchResult.failedFiles}`);
  console.log();
}

/**
 * 메인 실행 함수
 */
async function runAllExamples() {
  try {
    await example1_basicFileAnalysis();
    await example2_workflowAnalysis();
    await example3_batchProcessing();
    await example4_fileWatching();
    await example5_queryIndexData();
    await example6_languageCapabilities();
    await example7_errorHandling();
    
    console.log('🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('💥 Error running examples:', error);
  }
}

// 메인 실행
if (import.meta.main) {
  await runAllExamples();
}