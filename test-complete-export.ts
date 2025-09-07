#!/usr/bin/env bun

/**
 * Test Complete Project Export
 * 전체 프로젝트의 마크다운 내보내기 테스트
 */

import { runExportMarkdown } from './src/cli/commands/export-markdown.js';
import { logger } from './src/shared/utils/index.js';

async function testCompleteExport() {
  logger.info('🧪 Testing Complete Project Export...');

  try {
    // 프로젝트의 주요 진입점들을 테스트
    const testFiles = [
      '/Users/junwoobang/project/dependency-linker/src/main.ts',
      '/Users/junwoobang/project/dependency-linker/src/services/index.ts',
      '/Users/junwoobang/project/dependency-linker/src_new/infrastructure/notion/NotionClient.ts'
    ];

    for (let i = 0; i < testFiles.length; i++) {
      const testFilePath = testFiles[i];
      logger.info(`\n📄 [${i+1}/${testFiles.length}] Testing export for: ${testFilePath}`);
      
      try {
        const result = await runExportMarkdown(testFilePath, {
          depth: 3, // 더 깊은 탐색
          includeReverse: true,
          includeSourceCode: true,
          includeNotionContent: false,
          createIndex: true,
          autoCleanup: false,
          retentionMinutes: 120
        });

        if (result.success) {
          logger.success(`✅ Export ${i+1} completed!`);
          logger.info(`📁 Output: ${result.outputDir}`);
          logger.info(`📊 Files: ${result.summary.exportedFiles}`);
          logger.info(`📄 Pages: ${result.summary.notionPages || 'N/A'}`);
          logger.info(`📏 Size: ${(result.summary.totalSize / 1024).toFixed(2)} KB`);
          logger.info(`⏱️ Time: ${result.summary.exportTime}ms`);
        } else {
          logger.error(`❌ Export ${i+1} failed: ${result.error}`);
        }

      } catch (error) {
        logger.error(`💥 Export ${i+1} error: ${error}`);
      }
    }

    // 데이터베이스 통계 출력
    logger.info('\n💾 Final Database Statistics:');
    const { analysisIndexManager } = await import('./src/services/analysis/analysisIndexManager.js');
    const stats = analysisIndexManager.getStatistics();
    
    logger.info(`📦 Total files: ${stats.totalFiles.count}`);
    logger.info(`🔗 Total dependencies: ${stats.totalDependencies.count}`);
    logger.info(`🔧 Total functions: ${stats.totalFunctions.count}`);
    logger.info(`🏗️ Total classes: ${stats.totalClasses.count}`);
    
    logger.info('🏷️ Files by language:');
    stats.filesByLanguage.forEach((lang: any) => {
      logger.info(`  ${lang.language}: ${lang.count} files`);
    });

    logger.success('\n🎉 Complete project export testing finished!');

  } catch (error) {
    logger.error(`💥 Complete export test failed: ${error}`);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  testCompleteExport().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}