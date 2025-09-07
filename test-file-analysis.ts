#!/usr/bin/env bun

/**
 * Test File Analysis and Dependency Collection
 * 실제 파일 분석 및 의존성 수집 테스트
 */

import { parserFactory } from './src/services/parsers/parserFactory.js';
import { analysisIndexManager } from './src/services/analysis/analysisIndexManager.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function testFileAnalysis() {
  console.log('🔍 Testing File Analysis and Dependency Collection...');

  try {
    // 1. 테스트할 파일 선택 (main.ts는 의존성이 많음)
    const testFilePath = resolve('./src/main.ts');
    console.log(`📄 Analyzing file: ${testFilePath}`);

    // 2. 파일 내용 읽기
    const fileContent = readFileSync(testFilePath, 'utf-8');
    console.log(`📏 File size: ${fileContent.length} characters`);

    // 3. TypeScript 파서 가져오기
    const parser = parserFactory.getParserByFilePath(testFilePath);
    if (!parser) {
      throw new Error('Failed to get TypeScript parser');
    }
    console.log(`🔧 Parser created: ${parser.language} v${parser.parserVersion}`);

    // 4. 파일 분석 실행
    console.log('⚡ Starting analysis...');
    const analysisResult = await parser.analyzeFile(testFilePath, fileContent);
    
    console.log('\n📊 Analysis Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Language: ${analysisResult.language}`);
    console.log(`📁 File Path: ${analysisResult.filePath}`);
    console.log(`⏱️ Analysis Time: ${analysisResult.analysisTime}ms`);
    console.log(`🔗 Dependencies: ${analysisResult.dependencies.length}`);
    console.log(`📤 Exports: ${analysisResult.exports.length}`);
    console.log(`🔧 Functions: ${analysisResult.functions.length}`);
    console.log(`🏗️ Classes: ${analysisResult.classes.length}`);
    console.log(`📝 Variables: ${analysisResult.variables.length}`);

    // 5. 의존성 상세 정보 출력
    if (analysisResult.dependencies.length > 0) {
      console.log('\n🔗 Dependencies Detail:');
      analysisResult.dependencies.forEach((dep, index) => {
        console.log(`${index + 1}. ${dep.source} (${dep.type}) - Local: ${dep.isLocal}`);
        if (dep.resolved) {
          console.log(`   Resolved: ${dep.resolved}`);
        }
      });
    }

    // 6. 함수 정보 출력
    if (analysisResult.functions.length > 0) {
      console.log('\n🔧 Functions:');
      analysisResult.functions.slice(0, 5).forEach((func, index) => {
        console.log(`${index + 1}. ${func.name}(${func.params.join(', ')}) -> ${func.returnType || 'unknown'}`);
      });
      if (analysisResult.functions.length > 5) {
        console.log(`   ... and ${analysisResult.functions.length - 5} more functions`);
      }
    }

    // 7. 분석 결과를 데이터베이스에 저장
    console.log('\n💾 Saving analysis to database...');
    analysisIndexManager.saveAnalysisResult(analysisResult);
    console.log('✅ Analysis saved successfully!');

    // 8. 데이터베이스에서 다시 조회해서 확인
    const savedFile = analysisIndexManager.getFileByPath(testFilePath);
    console.log('\n📋 Retrieved from database:');
    console.log(savedFile);

    // 9. 의존성 정보 확인
    if (savedFile) {
      const dependencies = analysisIndexManager.getFileDependencies(savedFile.id);
      console.log(`\n🔗 Dependencies in database: ${dependencies.length}`);
      dependencies.slice(0, 3).forEach((dep, index) => {
        console.log(`${index + 1}. ${dep.source} (${dep.type})`);
      });
    }

    console.log('\n✅ File analysis test completed successfully! 🎉');

  } catch (error) {
    console.error('❌ File analysis test failed:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  testFileAnalysis().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}