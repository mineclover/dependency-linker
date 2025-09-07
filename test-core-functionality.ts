#!/usr/bin/env bun

/**
 * Core Functionality Test Script
 * 핵심 의존성 분석 기능들을 테스트합니다
 */

import { DataCollectionEngine } from './src/services/data/dataCollectionEngine.js';
import { DatabaseSchemaManager } from './src/infrastructure/notion/DatabaseSchemaManager';

async function testCoreFunctionality() {
  console.log('🔍 Core Dependency Analysis Functionality Test\n');

  try {
    // 1. 스키마 관리자 테스트
    console.log('1️⃣ Testing Schema Manager...');
    const schemaManager = new DatabaseSchemaManager('.');
    
    try {
      const schemas = await schemaManager.loadSchemas();
      console.log('✅ Schema Manager: Successfully loaded schemas');
      console.log(`   - Found databases: ${Object.keys(schemas.databases).join(', ')}`);
    } catch (error) {
      console.log(`❌ Schema Manager Error: ${error}`);
    }

    // 2. 데이터 수집 엔진 테스트
    console.log('\n2️⃣ Testing Data Collection Engine...');
    const collectionEngine = new DataCollectionEngine();
    
    try {
      // 테스트용 TypeScript 파일로 분석
      const testFile = './src/main.ts';
      const result = await collectionEngine.collectFromFile(testFile, 'files');
      
      console.log('✅ Data Collection Engine: Successfully analyzed file');
      console.log(`   - File: ${result.filePath}`);
      console.log(`   - Database: ${result.databaseName}`);
      console.log(`   - Data keys: ${Object.keys(result.data).join(', ')}`);
      console.log(`   - Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log(`   - Error details: ${result.errors.join('; ')}`);
      }
    } catch (error) {
      console.log(`❌ Data Collection Engine Error: ${error}`);
    }

    // 3. 파일 시스템 접근 테스트
    console.log('\n3️⃣ Testing File System Access...');
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir('./src', { withFileTypes: true });
      const tsFiles = files.filter(f => f.name.endsWith('.ts')).length;
      console.log(`✅ File System: Found ${tsFiles} TypeScript files in src/`);
    } catch (error) {
      console.log(`❌ File System Error: ${error}`);
    }

    console.log('\n🎉 Core functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCoreFunctionality();