/**
 * 파서를 통한 파일 분석 → 인덱스 저장 → Notion 관계형 저장 플로우 예제
 * Complete Analysis Workflow Example: Parser → Index → Notion Relational Storage
 */

import { createCodeAnalysisService } from '../src/services/codeAnalysisService';
import { analysisIndexManager } from '../src/services/analysis/analysisIndexManager';
import path from 'path';

// 환경 변수 설정 (실제 사용 시 .env 파일에서 관리)
process.env.NOTION_FILES_DB_ID = 'your-notion-files-database-id';
process.env.NOTION_DEPENDENCIES_DB_ID = 'your-notion-dependencies-database-id';
process.env.NOTION_FUNCTIONS_DB_ID = 'your-notion-functions-database-id';
process.env.NOTION_CLASSES_DB_ID = 'your-notion-classes-database-id';
process.env.NOTION_RELATIONSHIPS_DB_ID = 'your-notion-relationships-database-id';

async function demonstrateCompleteWorkflow() {
  console.log('🚀 Starting Complete Analysis Workflow Demonstration');
  console.log('=' .repeat(60));

  // 1. 서비스 생성 및 설정
  const service = createCodeAnalysisService({
    // 감시할 경로들
    watcher: {
      enabled: true,
      paths: [
        './src_new',
        './examples'
      ],
      config: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**'
        ],
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        }
      }
    },
    
    // 워크플로우 옵션
    workflow: {
      forceReanalysis: false,
      skipNotionUpload: false, // Notion 업로드 활성화
      batchSize: 10,
      parallel: true,
      includeMetrics: true
    },
    
    // Notion 설정
    notion: {
      enabled: true,
      autoSync: true
    },
    
    // 로깅 레벨
    logLevel: 'info'
  });

  // 2. 이벤트 리스너 설정
  setupEventListeners(service);

  try {
    // 3. 서비스 시작
    console.log('\n📂 Starting Code Analysis Service...');
    await service.start();

    // 4. 단일 파일 분석 데모
    console.log('\n🔍 Demo 1: Single File Analysis');
    const singleFileResult = await service.analyzeFile('./src/services/parsers/typescript/typescriptParser.ts');
    console.log('Single file analysis result:', {
      success: singleFileResult.success,
      filePath: singleFileResult.filePath,
      analysisTime: `${singleFileResult.processingTime}ms`,
      dependencies: singleFileResult.analysisResult?.dependencies.length || 0,
      functions: singleFileResult.analysisResult?.functions.length || 0,
      classes: singleFileResult.analysisResult?.classes.length || 0,
      notionPageId: singleFileResult.notionPageId
    });

    // 5. 배치 분석 데모
    console.log('\n🔍 Demo 2: Batch File Analysis');
    const batchFiles = [
      './src/services/parsers/python/pythonParser.ts',
      './src/services/parsers/go/goParser.ts',
      './src/services/parsers/rust/rustParser.ts'
    ];
    
    const batchResult = await service.analyzeBatch(batchFiles);
    console.log('Batch analysis result:', {
      totalFiles: batchResult.totalFiles,
      successfulFiles: batchResult.successfulFiles,
      failedFiles: batchResult.failedFiles,
      totalTime: `${batchResult.totalTime}ms`,
      averageTime: `${Math.round(batchResult.averageTimePerFile)}ms`
    });

    // 6. 디렉토리 분석 데모
    console.log('\n🔍 Demo 3: Directory Analysis');
    const directoryResult = await service.analyzeDirectory('./src/services/parsers', true, {
      forceReanalysis: true
    });
    console.log('Directory analysis result:', {
      totalFiles: directoryResult.totalFiles,
      successfulFiles: directoryResult.successfulFiles,
      processingTime: `${directoryResult.totalTime}ms`
    });

    // 7. 인덱스 통계 확인
    console.log('\n📊 Index Statistics:');
    const indexStats = analysisIndexManager.getStatistics();
    console.log({
      totalFiles: indexStats.totalFiles.count,
      totalDependencies: indexStats.totalDependencies.count,
      totalFunctions: indexStats.totalFunctions.count,
      totalClasses: indexStats.totalClasses.count,
      filesByLanguage: indexStats.filesByLanguage
    });

    // 8. 관계형 데이터 쿼리 예제
    console.log('\n🔗 Relational Data Query Examples:');
    await demonstrateRelationalQueries();

    // 9. 실시간 감시 데모 (5초간)
    console.log('\n👀 Demo 4: Real-time File Watching (5 seconds)');
    console.log('Try modifying a watched file now...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 10. Notion 동기화 데모
    console.log('\n🔄 Demo 5: Notion Synchronization');
    await service.syncWithNotion();
    console.log('Notion synchronization completed');

    // 11. 서비스 상태 확인
    console.log('\n📈 Service Status:');
    const status = service.getStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n✅ All demonstrations completed successfully!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  } finally {
    // 12. 서비스 정리
    console.log('\n🧹 Cleaning up...');
    await service.stop();
    console.log('Service stopped successfully');
  }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners(service: any) {
  service.on('started', (data: any) => {
    console.log('✅ Service started at:', data.startTime);
  });

  service.on('fileProcessed', (data: any) => {
    console.log(`📄 Processed: ${path.basename(data.event.filePath)} (${data.processingTime}ms)`);
  });

  service.on('fileProcessingFailed', (data: any) => {
    console.log(`❌ Failed: ${path.basename(data.event.filePath)} - ${data.error}`);
  });

  service.on('projectAnalysisCompleted', (result: any) => {
    console.log('🎯 Project analysis completed:', {
      totalFiles: result.totalFiles,
      successfulFiles: result.successfulFiles,
      totalTime: `${result.totalTime}ms`
    });
  });

  service.on('notionSyncCompleted', () => {
    console.log('🔄 Notion synchronization completed');
  });

  service.on('stopped', (data: any) => {
    console.log('🛑 Service stopped. Uptime:', `${data.uptime}ms`);
  });
}

/**
 * 관계형 데이터 쿼리 데모
 */
async function demonstrateRelationalQueries() {
  // TypeScript 파일들 조회
  const tsFiles = analysisIndexManager.getFilesByLanguage('typescript');
  console.log(`TypeScript files: ${tsFiles.length}`);

  // 미해결 TODO 조회
  const todos = analysisIndexManager.getUnresolvedTodos();
  console.log(`Unresolved TODOs: ${todos.length}`);

  // 예제 파일의 종속성 조회
  const exampleFile = analysisIndexManager.getFile('./src/services/parsers/typescript/typescriptParser.ts');
  if (exampleFile) {
    const dependencies = analysisIndexManager.getFileDependencies(exampleFile.id);
    const functions = analysisIndexManager.getFileFunctions(exampleFile.id);
    
    console.log(`Dependencies for ${path.basename(exampleFile.filePath)}: ${dependencies.length}`);
    console.log(`Functions for ${path.basename(exampleFile.filePath)}: ${functions.length}`);
  }
}

/**
 * 성능 테스트 데모
 */
async function demonstratePerformanceTest() {
  console.log('\n⚡ Performance Test Demo');
  console.log('=' .repeat(30));

  const service = createCodeAnalysisService({
    watcher: {
      enabled: false, // 성능 테스트에서는 감시 비활성화
      paths: []
    },
    workflow: {
      parallel: true,
      batchSize: 20,
      skipNotionUpload: true // 성능 테스트에서는 Notion 업로드 스킵
    }
  });

  const testFiles = [
    './src/services/parsers/typescript/typescriptParser.ts',
    './src/services/parsers/python/pythonParser.ts',
    './src/services/parsers/go/goParser.ts',
    './src/services/parsers/rust/rustParser.ts',
    './src/services/analysis/analysisIndexManager.ts',
    './src/services/workflow/analysisWorkflowManager.ts'
  ];

  const startTime = Date.now();
  const result = await service.analyzeBatch(testFiles, { forceReanalysis: true });
  const totalTime = Date.now() - startTime;

  console.log('Performance Results:', {
    filesAnalyzed: result.successfulFiles,
    totalTime: `${totalTime}ms`,
    averagePerFile: `${Math.round(totalTime / result.successfulFiles)}ms`,
    throughput: `${Math.round(result.successfulFiles / (totalTime / 1000))} files/sec`
  });
}

/**
 * 에러 처리 데모
 */
async function demonstrateErrorHandling() {
  console.log('\n🚨 Error Handling Demo');
  console.log('=' .repeat(25));

  const service = createCodeAnalysisService({
    watcher: { enabled: false, paths: [] },
    workflow: { parallel: false }
  });

  // 존재하지 않는 파일 분석 시도
  const result1 = await service.analyzeFile('./nonexistent-file.ts');
  console.log('Non-existent file result:', {
    success: result1.success,
    error: result1.error,
    wasSkipped: result1.wasSkipped
  });

  // 지원하지 않는 파일 형식 시도
  const result2 = await service.analyzeFile('./README.md');
  console.log('Unsupported file result:', {
    success: result2.success,
    error: result2.error,
    wasSkipped: result2.wasSkipped
  });
}

// 메인 실행
if (import.meta.main) {
  console.log('🎬 Starting Analysis Workflow Demonstrations\n');
  
  try {
    await demonstrateCompleteWorkflow();
    await demonstratePerformanceTest();
    await demonstrateErrorHandling();
    
    console.log('\n🎉 All demonstrations completed successfully!');
  } catch (error) {
    console.error('\n💥 Demonstration failed:', error);
    process.exit(1);
  }
}