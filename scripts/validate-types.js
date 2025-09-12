#!/usr/bin/env node
/**
 * TypeScript Definitions Validation Script
 * Validates that all exported APIs have proper TypeScript definitions
 */

const pkg = require('../dist/index');

async function validateTypeExports() {
  console.log('🔍 Validating TypeScript Definition Exports...\n');

  const validations = [
    {
      name: 'TypeScriptAnalyzer class export',
      test: () => {
        if (typeof pkg.TypeScriptAnalyzer !== 'function') {
          throw new Error('TypeScriptAnalyzer is not exported as a constructor');
        }
        
        const analyzer = new pkg.TypeScriptAnalyzer();
        
        if (typeof analyzer.analyzeFile !== 'function') {
          throw new Error('analyzeFile method is not available');
        }
        
        if (typeof analyzer.extractDependencies !== 'function') {
          throw new Error('extractDependencies method is not available');
        }
        
        console.log('  ✅ TypeScriptAnalyzer constructor and methods');
      }
    },
    
    {
      name: 'Factory function exports',
      test: () => {
        const requiredFunctions = [
          'analyzeTypeScriptFile',
          'extractDependencies', 
          'getBatchAnalysis',
          'analyzeDirectory'
        ];
        
        for (const funcName of requiredFunctions) {
          if (typeof pkg[funcName] !== 'function') {
            throw new Error(`${funcName} is not exported as a function`);
          }
        }
        
        console.log('  ✅ All factory functions properly exported');
      }
    },
    
    {
      name: 'Runtime utility exports',
      test: () => {
        const requiredRuntimeExports = [
          'OutputFormatter',
          'createLogger'
        ];
        
        for (const exportName of requiredRuntimeExports) {
          if (!pkg[exportName]) {
            throw new Error(`${exportName} is not exported`);
          }
        }
        
        console.log('  ✅ All runtime utilities exported');
      }
    },
    
    {
      name: 'TypeScript definition completeness',
      test: () => {
        const fs = require('fs');
        const dtsContent = fs.readFileSync('./dist/index.d.ts', 'utf8');
        
        const requiredTypeExports = [
          'AnalysisResult',
          'DependencyInfo',
          'ImportInfo', 
          'ExportInfo',
          'SourceLocation',
          'OutputFormat',
          'FileAnalysisRequest'
        ];
        
        for (const typeName of requiredTypeExports) {
          if (!dtsContent.includes(typeName)) {
            throw new Error(`Type ${typeName} is not available in .d.ts file`);
          }
        }
        
        console.log('  ✅ All TypeScript definitions available in .d.ts');
      }
    },
    
    {
      name: 'Package metadata validation',
      test: () => {
        const packageJson = require('../package.json');
        
        if (!packageJson.types) {
          throw new Error('package.json missing "types" field');
        }
        
        if (packageJson.types !== 'dist/index.d.ts') {
          throw new Error(`Expected types field to be 'dist/index.d.ts', got '${packageJson.types}'`);
        }
        
        const fs = require('fs');
        if (!fs.existsSync('./dist/index.d.ts')) {
          throw new Error('TypeScript declaration file dist/index.d.ts not found');
        }
        
        console.log('  ✅ Package metadata and .d.ts files present');
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const validation of validations) {
    try {
      console.log(`📋 ${validation.name}:`);
      validation.test();
      passed++;
      console.log('');
    } catch (error) {
      console.error(`❌ ${validation.name} failed:`, error.message);
      failed++;
      console.log('');
    }
  }

  console.log('📊 Validation Results:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 All TypeScript definitions are properly exported!');
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  validateTypeExports().catch((error) => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { validateTypeExports };