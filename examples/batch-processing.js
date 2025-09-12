#!/usr/bin/env node

/**
 * Batch Processing Example
 * Demonstrates efficient processing of multiple files with progress tracking and error handling
 */

const { TypeScriptAnalyzer, getBatchAnalysis, analyzeDirectory } = require('../dist/index.js');
const { BatchAnalyzer } = require('../dist/api/BatchAnalyzer.js');
const path = require('path');

async function batchProcessingExample() {
  console.log('=== Batch Processing Example ===\n');

  try {
    // Example 1: Simple batch analysis using factory function
    console.log('1. Simple batch analysis:');
    const filePaths = [
      './demo/examples/simple-component.tsx',
      './demo/examples/complex-app.tsx',
      './demo/examples/node-backend.ts'
    ];

    const results1 = await getBatchAnalysis(filePaths, {
      concurrency: 2,
      onProgress: (completed, total) => {
        const percentage = Math.round((completed / total) * 100);
        process.stdout.write(`\r  Progress: ${completed}/${total} (${percentage}%)`);
      }
    });

    console.log('\n');
    results1.forEach(result => {
      if (result.success) {
        console.log(`  ✅ ${path.basename(result.filePath)}: ${result.dependencies.length} deps`);
      } else {
        console.log(`  ❌ ${path.basename(result.filePath)}: ${result.error?.message}`);
      }
    });
    console.log();

    // Example 2: Directory analysis
    console.log('2. Directory analysis:');
    const dirResults = await analyzeDirectory('./demo/examples', {
      extensions: ['.ts', '.tsx'],
      ignorePatterns: ['**/*.test.ts', '**/node_modules/**']
    });

    console.log(`  📁 Analyzed ${dirResults.length} files in directory`);
    const totalDeps = dirResults.reduce((sum, r) => sum + r.dependencies.length, 0);
    console.log(`  📦 Total dependencies found: ${totalDeps}\n`);

    // Example 3: Advanced batch processing with BatchAnalyzer
    console.log('3. Advanced batch processing:');
    const analyzer = new TypeScriptAnalyzer();
    const batchAnalyzer = new BatchAnalyzer(analyzer, {
      maxConcurrency: 3,
      enableResourceMonitoring: true,
      memoryLimit: 256 // 256 MB
    });

    const batchResult = await batchAnalyzer.processBatch(filePaths, {
      continueOnError: true,
      onProgress: (completed, total) => {
        const percentage = Math.round((completed / total) * 100);
        process.stdout.write(`\r  Advanced progress: ${completed}/${total} (${percentage}%)`);
      },
      onFileComplete: (filePath, result) => {
        // Could log individual completions
      },
      onFileError: (filePath, error) => {
        console.log(`\n  ⚠️  Error in ${path.basename(filePath)}: ${error.message}`);
      }
    });

    console.log('\n');
    console.log(`  ✅ Batch completed: ${batchResult.summary.successfulFiles}/${batchResult.summary.totalFiles} files`);
    console.log(`  📊 Summary:`, {
      totalDependencies: batchResult.summary.totalDependencies,
      totalImports: batchResult.summary.totalImports,
      totalExports: batchResult.summary.totalExports,
      averageTime: `${batchResult.summary.averageTime.toFixed(2)}ms`
    });

    // Example 4: Resource monitoring
    console.log('\n4. Resource monitoring:');
    const resourceMetrics = batchAnalyzer.getResourceMetrics();
    console.log(`  💾 Memory usage: ${resourceMetrics.memoryUsage}MB`);
    console.log(`  ⚡ Active operations: ${resourceMetrics.activeOperations}`);
    console.log(`  ✅ Completed operations: ${resourceMetrics.completedOperations}`);
    console.log(`  ❌ Error operations: ${resourceMetrics.errorOperations}\n`);

    // Example 5: Large batch with error handling strategies
    console.log('5. Error handling strategies:');
    
    // Create a list with some invalid files
    const mixedFilePaths = [
      ...filePaths,
      './non-existent-file.ts',
      './another-missing-file.tsx'
    ];

    console.log('  Testing fail-fast strategy:');
    try {
      await batchAnalyzer.processBatch(mixedFilePaths, { 
        failFast: true 
      });
    } catch (error) {
      console.log(`    ❌ Failed fast as expected: ${error.message}`);
    }

    console.log('  Testing best-effort strategy:');
    const bestEffortResult = await batchAnalyzer.processBatch(mixedFilePaths, {
      continueOnError: true
    });
    console.log(`    ✅ Best effort: ${bestEffortResult.summary.successfulFiles} successful, ${bestEffortResult.errors.length} errors\n`);

    // Example 6: Performance comparison
    console.log('6. Performance comparison:');
    const testFiles = filePaths.slice(0, 2); // Use fewer files for fair comparison

    // Sequential processing
    const sequentialStart = Date.now();
    for (const filePath of testFiles) {
      await analyzer.analyzeFile(filePath);
    }
    const sequentialTime = Date.now() - sequentialStart;

    // Batch processing
    const batchStart = Date.now();
    await batchAnalyzer.processBatch(testFiles, { concurrency: 2 });
    const batchTime = Date.now() - batchStart;

    console.log(`  📈 Sequential: ${sequentialTime}ms`);
    console.log(`  📈 Batch (concurrent): ${batchTime}ms`);
    console.log(`  🚀 Speedup: ${(sequentialTime / batchTime).toFixed(2)}x\n`);

    // Clean up
    batchAnalyzer.dispose();
    analyzer.clearCache();
    console.log('✅ Batch processing example completed successfully!');

  } catch (error) {
    console.error('❌ Batch processing example failed:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Cancellation example
async function cancellationExample() {
  console.log('\n=== Cancellation Example ===');
  
  const analyzer = new TypeScriptAnalyzer();
  const batchAnalyzer = new BatchAnalyzer(analyzer);

  // Create a simple cancellation token
  let cancelled = false;
  const cancellationToken = {
    isCancelled: () => cancelled,
    onCancellationRequested: (callback) => {
      setTimeout(() => {
        cancelled = true;
        callback();
      }, 1000); // Cancel after 1 second
    }
  };

  try {
    // Create a larger file list that would take some time
    const largeBatch = Array(20).fill('./demo/examples/complex-app.tsx');
    
    console.log('Starting batch processing (will be cancelled)...');
    await batchAnalyzer.processBatch(largeBatch, {}, cancellationToken);
  } catch (error) {
    if (error.message.includes('cancelled')) {
      console.log('✅ Cancellation handled gracefully');
    } else {
      throw error;
    }
  } finally {
    batchAnalyzer.dispose();
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    await batchProcessingExample();
    // Uncomment to test cancellation
    // await cancellationExample();
  })().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { batchProcessingExample, cancellationExample };