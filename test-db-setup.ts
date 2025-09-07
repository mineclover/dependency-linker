#!/usr/bin/env bun

/**
 * Test Database Setup
 * 테스트를 위한 데이터베이스 셋업
 */

import { analysisIndexManager } from './src/services/analysis/analysisIndexManager.js';
import { resolve } from 'path';

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  try {
    // 현재 프로젝트의 주요 파일들을 테스트 데이터베이스에 추가
    const testFiles = [
      './src/main.ts',
      './src/shared/utils/index.ts',
      './src/services/dependency/DependencyExplorationService.ts',
      './src/services/document/DocumentExportService.ts'
    ];

    for (const filePath of testFiles) {
      const absolutePath = resolve(filePath);
      console.log(`📄 Adding file: ${filePath} -> ${absolutePath}`);
      
      const fileId = analysisIndexManager.addTestFile(absolutePath, 'TypeScript');
      console.log(`✅ Added with ID: ${fileId}`);
      
      // 확인
      const retrievedFile = analysisIndexManager.getFileByPath(absolutePath);
      console.log(`📋 Retrieved:`, retrievedFile);
    }

    console.log('\n📊 Database statistics:');
    const stats = analysisIndexManager.getStatistics();
    console.log(stats);

    console.log('\n✅ Test database setup completed!');

  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  setupTestDatabase().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}