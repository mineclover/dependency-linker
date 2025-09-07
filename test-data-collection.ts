#!/usr/bin/env bun

/**
 * Test Data Collection Engine
 * Test the data collection engine with proper rules
 */

import { DataCollectionEngine } from './src/services/data/dataCollectionEngine.js';

async function testDataCollection() {
  console.log('🔧 Testing Data Collection Engine\n');

  try {
    console.log('1️⃣ Creating Data Collection Engine...');
    const collectionEngine = new DataCollectionEngine();

    console.log('2️⃣ Testing file analysis...');
    const result = await collectionEngine.collectFromFile('./src/main.ts', 'files');

    console.log(`✅ File analyzed: ${result.filePath}`);
    console.log(`📊 Database: ${result.databaseName}`);
    console.log(`📋 Data properties collected: ${Object.keys(result.data).length}`);
    console.log(`⚠️  Errors: ${result.errors.length}`);

    if (Object.keys(result.data).length > 0) {
      console.log('\n📊 Collected Data:');
      Object.entries(result.data).forEach(([key, value]) => {
        const displayValue = typeof value === 'object' 
          ? JSON.stringify(value, null, 2) 
          : String(value);
        console.log(`  ${key}: ${displayValue}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    if (result.notionId) {
      console.log(`\n🔗 Notion ID: ${result.notionId}`);
    }

    console.log('\n🎉 Data collection test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDataCollection();