#!/usr/bin/env bun

/**
 * Debug Collection Rules
 * Quick debug test for collection rules structure
 */

import { DataCollectionRulesService } from './src/services/data/dataCollectionRulesService.js';

async function debugRules() {
  console.log('🔍 Debug Collection Rules\n');

  try {
    console.log('Creating DataCollectionRulesService...');
    const rulesService = new DataCollectionRulesService();

    console.log('Initializing collection rules...');
    const result = await rulesService.initializeCollectionRules();
    console.log(`Initialization result: ${result.success}`);
    
    if (!result.success) {
      console.log(`Error: ${result.error}`);
      return;
    }

    console.log('Getting all schemas...');
    const schemas = rulesService.getAllCollectionSchemas();
    console.log(`Found ${schemas.size} schemas: ${Array.from(schemas.keys()).join(', ')}`);

    console.log('\nGetting applicable rules for ./src/main.ts in files database...');
    const applicableRules = rulesService.getApplicableRules('./src/main.ts', 'files');
    console.log(`Found ${applicableRules.length} applicable rules`);

    if (applicableRules.length > 0) {
      const firstRule = applicableRules[0];
      console.log('\nFirst rule structure:');
      console.log(`- propertyName: ${firstRule.propertyName}`);
      console.log(`- propertyType: ${firstRule.propertyType}`);
      console.log(`- required: ${firstRule.required}`);
      console.log(`- extractionRules: ${JSON.stringify(firstRule.extractionRules, null, 2)}`);
      console.log(`- transformationRules: ${JSON.stringify(firstRule.transformationRules, null, 2)}`);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugRules();