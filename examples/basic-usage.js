#!/usr/bin/env node

/**
 * Basic API Usage Example
 * Demonstrates simple file analysis with error handling and performance monitoring
 */

const { TypeScriptAnalyzer, analyzeTypeScriptFile, extractDependencies } = require('../dist/index.js');

async function basicExample() {
  console.log('=== Basic TypeScript Analysis Example ===\n');

  try {
    // Example 1: Simple function-based API
    console.log('1. Using simple function API:');
    const result1 = await analyzeTypeScriptFile('./demo/examples/simple-component.tsx');
    
    if (result1.success) {
      console.log(`  ✅ Analyzed: ${result1.filePath}`);
      console.log(`  📦 Dependencies: ${result1.dependencies.length}`);
      console.log(`  📥 Imports: ${result1.imports.length}`);
      console.log(`  📤 Exports: ${result1.exports.length}`);
      console.log(`  ⏱️  Parse time: ${result1.parseTime}ms\n`);
    } else {
      console.error(`  ❌ Analysis failed: ${result1.error?.message}\n`);
    }

    // Example 2: Extract dependencies only
    console.log('2. Extracting dependencies only:');
    const deps = await extractDependencies('./demo/examples/complex-app.tsx');
    console.log(`  📦 Dependencies found: ${deps.join(', ')}\n`);

    // Example 3: Class-based API with options
    console.log('3. Using class-based API with options:');
    const analyzer = new TypeScriptAnalyzer({
      enableCache: true,
      defaultTimeout: 10000
    });

    const result3 = await analyzer.analyzeFile('./demo/examples/node-backend.ts', {
      format: 'json',
      includeSources: true,
      parseTimeout: 15000
    });

    if (result3.success) {
      console.log(`  ✅ Analyzed: ${result3.filePath}`);
      console.log(`  📦 Dependencies: ${result3.dependencies.map(d => d.source).join(', ')}`);
      console.log(`  ⚙️  Include sources: enabled`);
      console.log(`  ⏱️  Parse time: ${result3.parseTime}ms\n`);
    }

    // Example 4: Error handling
    console.log('4. Error handling example:');
    try {
      await analyzeTypeScriptFile('./non-existent-file.ts');
    } catch (error) {
      console.log(`  ✅ Error handled gracefully: ${error.message}\n`);
    }

    // Example 5: Format output
    console.log('5. Different output formats:');
    const result5 = await analyzer.analyzeFile('./demo/examples/simple-component.tsx');
    
    console.log('  JSON format:');
    console.log(`    ${JSON.stringify(result5, null, 2).split('\n')[0]}...\n`);

    console.log('  Formatted output:');
    const formatted = analyzer.formatResult(result5, 'summary');
    console.log(`    ${formatted.split('\n')[0]}\n`);

    // Clean up
    analyzer.clearCache();
    console.log('✅ Basic example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Performance monitoring wrapper
async function runWithPerformanceMonitoring() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  await basicExample();

  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;
  const duration = endTime - startTime;
  const memoryDelta = (endMemory - startMemory) / 1024 / 1024; // MB

  console.log('\n=== Performance Metrics ===');
  console.log(`Total execution time: ${duration}ms`);
  console.log(`Memory usage change: ${memoryDelta.toFixed(2)}MB`);
  console.log(`Peak memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
}

// Run the example
if (require.main === module) {
  runWithPerformanceMonitoring().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { basicExample };