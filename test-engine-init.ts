#!/usr/bin/env bun

/**
 * Test Engine Initialization
 * Test if DataCollectionEngine initializes its rules service
 */

import { DataCollectionEngine } from './src/services/data/dataCollectionEngine.js';
import { DataCollectionRulesService } from './src/services/data/dataCollectionRulesService.js';

async function testEngineInit() {
  console.log('🔍 Testing Engine Initialization\n');

  try {
    // Test 1: Separate rules service initialization
    console.log('1️⃣ Testing separate rules service...');
    const separateRulesService = new DataCollectionRulesService();
    await separateRulesService.initializeCollectionRules();
    const separateRules = separateRulesService.getApplicableRules('./src/main.ts', 'files');
    console.log(`Separate service found ${separateRules.length} rules`);

    // Test 2: Engine with default constructor  
    console.log('\n2️⃣ Testing engine with default constructor...');
    const engine = new DataCollectionEngine();
    
    // Let's check if we can access the internal rules service
    console.log('Trying to collect data without initialization...');
    const result1 = await engine.collectFromFile('./src/main.ts', 'files');
    console.log(`Engine result 1 - errors: ${result1.errors.length}, data: ${Object.keys(result1.data).length}`);

    // Test 3: Try initializing through the engine's rules service
    console.log('\n3️⃣ Testing manual initialization through engine...');
    // Access the private field to test if initialization helps
    const engineRulesService = (engine as any).rulesService;
    if (engineRulesService && typeof engineRulesService.initializeCollectionRules === 'function') {
      console.log('Initializing engine rules service...');
      const initResult = await engineRulesService.initializeCollectionRules();
      console.log(`Initialization result: ${initResult.success}`);
      
      const result2 = await engine.collectFromFile('./src/main.ts', 'files');
      console.log(`Engine result 2 - errors: ${result2.errors.length}, data: ${Object.keys(result2.data).length}`);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEngineInit();