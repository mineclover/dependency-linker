#!/usr/bin/env bun

/**
 * Test Export Markdown Functionality
 * 새로운 export-markdown 기능을 테스트하는 스크립트
 */

import { runExportMarkdown } from './src/cli/commands/export-markdown.js';
import { logger } from './src/shared/utils/index.js';

async function testExportMarkdown() {
  logger.info('🧪 Testing Export Markdown functionality...');

  try {
    // 테스트할 파일 경로 (절대 경로 사용)
    const testFilePath = '/Users/junwoobang/project/dependency-linker/src/main.ts';
    
    logger.info(`📄 Testing export for file: ${testFilePath}`);
    
    // 마크다운 내보내기 실행
    const result = await runExportMarkdown(testFilePath, {
      depth: 2,
      includeReverse: true,
      includeSourceCode: true,
      includeNotionContent: false, // Notion API 키가 없을 수 있으므로 false
      createIndex: true,
      autoCleanup: false, // 테스트 후 수동으로 확인하기 위해 false
      retentionMinutes: 120
    });

    if (result.success) {
      logger.success('✅ Page-Based Export completed successfully!');
      logger.info(`📁 Output directory: ${result.outputDir}`);
      logger.info(`📄 Notion pages generated: ${result.summary.notionPages}`);
      logger.info(`📊 Source files analyzed: ${result.summary.exportedFiles}`);
      logger.info(`📋 Pages with Notion content: ${result.summary.filesWithNotionContent}`);
      logger.info(`📏 Total size: ${(result.summary.totalSize / 1024).toFixed(2)} KB`);
      logger.info(`⏱️ Export time: ${result.summary.exportTime}ms`);
      
      if (result.tempFolderId) {
        logger.info(`🔑 Temporary folder ID: ${result.tempFolderId}`);
        logger.info(`💡 Files are saved in: ${result.outputDir}`);
        logger.info(`🎯 Method: Files grouped by Notion pages`);
      }
    } else {
      logger.error(`❌ Export failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    logger.error(`💥 Test failed: ${error}`);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  testExportMarkdown().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}