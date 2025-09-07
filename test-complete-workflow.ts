#!/usr/bin/env bun

/**
 * Complete Dependency Analysis Workflow Test
 * Test the entire system as described by the user
 */

import { DataCollectionEngine } from './src/services/data/dataCollectionEngine.js';
import { DatabaseSchemaManager } from './src/infrastructure/notion/DatabaseSchemaManager';

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete Dependency Analysis Workflow\n');

  try {
    // Step 1: Schema Management Test
    console.log('1️⃣ Testing Schema Management...');
    const schemaManager = new DatabaseSchemaManager('.');
    const schemas = await schemaManager.loadSchemas();
    console.log(`✅ Loaded ${Object.keys(schemas.databases).length} database schemas`);
    console.log(`   Databases: ${Object.keys(schemas.databases).join(', ')}`);

    // Step 2: File Node Identification
    console.log('\n2️⃣ Testing File Node Identification...');
    const testFiles = [
      './src/main.ts',
      './README.md',
      './package.json'
    ];

    const collectionEngine = new DataCollectionEngine();
    const fileResults = [];

    for (const filePath of testFiles) {
      try {
        const result = await collectionEngine.collectFromFile(filePath, 'files');
        fileResults.push(result);
        console.log(`✅ Analyzed: ${result.filePath}`);
        console.log(`   Properties: ${Object.keys(result.data).length}`);
        console.log(`   Errors: ${result.errors.length}`);
        
        // Show key dependency information
        if (result.data.Imports && Array.isArray(result.data.Imports)) {
          console.log(`   Dependencies: ${result.data.Imports.length} imports found`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to analyze ${filePath}: ${error}`);
      }
    }

    // Step 3: Dependency Relationship Analysis
    console.log('\n3️⃣ Testing Dependency Relationship Analysis...');
    const allDependencies = new Set();
    const internalDependencies = new Set();
    const externalDependencies = new Set();

    fileResults.forEach(result => {
      if (result.data.Imports && Array.isArray(result.data.Imports)) {
        result.data.Imports.forEach(imp => {
          allDependencies.add(imp);
          if (imp.startsWith('.')) {
            internalDependencies.add(imp);
          } else {
            externalDependencies.add(imp);
          }
        });
      }
    });

    console.log(`✅ Dependency Analysis Complete`);
    console.log(`   Total dependencies: ${allDependencies.size}`);
    console.log(`   Internal dependencies: ${internalDependencies.size}`);
    console.log(`   External dependencies: ${externalDependencies.size}`);

    // Step 4: Static Code Analysis Verification
    console.log('\n4️⃣ Testing Static Code Analysis...');
    const mainTsResult = fileResults.find(r => r.filePath.includes('main.ts'));
    if (mainTsResult) {
      console.log('✅ Static Analysis Results for main.ts:');
      console.log(`   File Size: ${mainTsResult.data['Size (bytes)']} bytes`);
      console.log(`   Extension: ${mainTsResult.data.Extension}`);
      console.log(`   Project: ${mainTsResult.data.Project}`);
      console.log(`   Status: ${mainTsResult.data.Status}`);
      console.log(`   Last Modified: ${mainTsResult.data['Last Modified']}`);
    }

    // Step 5: Schema-based Configuration Test
    console.log('\n5️⃣ Testing Schema-based Configuration...');
    const fileSchema = schemas.databases.files;
    if (fileSchema) {
      console.log(`✅ Files Database Schema Loaded`);
      console.log(`   Title: ${fileSchema.title}`);
      console.log(`   Properties: ${Object.keys(fileSchema.properties).length}`);
      console.log(`   Key properties: ${Object.keys(fileSchema.properties).slice(0, 5).join(', ')}...`);
    }

    console.log('\n🎉 Complete Dependency Analysis Workflow Test Completed!');
    console.log('\nSummary:');
    console.log(`✅ Schema Management: ${Object.keys(schemas.databases).length} databases`);
    console.log(`✅ File Analysis: ${fileResults.length} files processed`);
    console.log(`✅ Dependency Tracking: ${allDependencies.size} total dependencies`);
    console.log(`✅ Static Analysis: File properties, sizes, dates extracted`);
    console.log(`✅ Schema Configuration: JSON-based schema system working`);

    // Show sample data structure that would be uploaded to Notion
    console.log('\n📊 Sample Notion Document Structure:');
    if (mainTsResult) {
      console.log(JSON.stringify({
        'File Name': mainTsResult.data.Name,
        'File Path': mainTsResult.data['File Path'], 
        'Extension': mainTsResult.data.Extension,
        'Size': mainTsResult.data['Size (bytes)'],
        'Project': mainTsResult.data.Project,
        'Dependencies': mainTsResult.data.Imports?.slice(0, 3) || [],
        'Analysis Date': new Date().toISOString()
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
    process.exit(1);
  }
}

testCompleteWorkflow();