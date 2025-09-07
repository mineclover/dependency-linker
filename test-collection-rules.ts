#!/usr/bin/env bun

/**
 * Collection Rules Test Script
 * 데이터 수집 규칙 초기화 및 적용을 테스트합니다
 */

import { DataCollectionEngine } from './src/services/data/dataCollectionEngine.js';
import { DataCollectionRulesService } from './src/services/data/dataCollectionRulesService.js';

async function testCollectionRules() {
  console.log('🔍 Testing Data Collection Rules\n');

  try {
    // 1. 데이터 수집 규칙 서비스 테스트
    console.log('1️⃣ Testing Collection Rules Service...');
    const rulesService = new DataCollectionRulesService();
    
    try {
      const result = await rulesService.initializeCollectionRules();
      console.log('✅ Collection Rules: Successfully initialized');
      console.log(`   - Success: ${result.success}`);
      if (!result.success) {
        console.log(`   - Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Collection Rules Error: ${error}`);
    }

    // 2. 적용 가능한 규칙 확인
    console.log('\n2️⃣ Testing Applicable Rules...');
    try {
      const applicableRules = rulesService.getApplicableRules('./src/main.ts', 'files');
      console.log(`✅ Applicable Rules: Found ${applicableRules.length} rules`);
      
      if (applicableRules.length > 0) {
        applicableRules.forEach((rule, index) => {
          console.log(`   - Rule ${index + 1}: ${rule.name || 'Unnamed'}`);
          console.log(`     File patterns: ${rule.extractionRules?.fileTypes?.join(', ') || 'None'}`);
          console.log(`     Database: ${rule.databaseName}`);
        });
      }
    } catch (error) {
      console.log(`❌ Applicable Rules Error: ${error}`);
    }

    // 3. 실제 데이터 수집 재테스트
    console.log('\n3️⃣ Re-testing Data Collection...');
    const collectionEngine = new DataCollectionEngine();
    
    try {
      const result = await collectionEngine.collectFromFile('./src/main.ts', 'files');
      
      console.log('✅ Data Collection: File analyzed');
      console.log(`   - File: ${result.filePath}`);
      console.log(`   - Data properties: ${Object.keys(result.data).length}`);
      console.log(`   - Errors: ${result.errors.length}`);
      
      if (Object.keys(result.data).length > 0) {
        console.log('   - Collected data:');
        Object.entries(result.data).forEach(([key, value]) => {
          console.log(`     ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        });
      }
      
      if (result.errors.length > 0) {
        console.log(`   - Error details: ${result.errors.join('; ')}`);
      }
    } catch (error) {
      console.log(`❌ Data Collection Error: ${error}`);
    }

    console.log('\n🎉 Collection rules test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCollectionRules();