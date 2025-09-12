/**
 * Vite Plugin for TypeScript File Analyzer
 * Provides build-time dependency analysis for Vite projects
 */

const { analyzeTypeScriptFile, getBatchAnalysis } = require('../dist/index');
const path = require('path');

/**
 * Vite plugin for TypeScript dependency analysis
 * @param {Object} options Plugin configuration options
 * @returns {Object} Vite plugin object
 */
function typescriptAnalyzerPlugin(options = {}) {
  const {
    include = ['**/*.ts', '**/*.tsx'],
    exclude = ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
    outputFile = 'dependency-analysis.json',
    enableBundleAnalysis = true,
    enableCircularDependencyDetection = true,
    enableUnusedExportDetection = false,
    onAnalysisComplete = null,
    logLevel = 'info'
  } = options;

  let analyzedFiles = new Map();
  let isProduction = false;

  const log = (level, message, ...args) => {
    if ((logLevel === 'debug') || 
        (logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
        (logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
        (logLevel === 'error' && level === 'error')) {
      console.log(`[vite:typescript-analyzer] ${message}`, ...args);
    }
  };

  return {
    name: 'typescript-analyzer',
    configResolved(config) {
      isProduction = config.command === 'build';
      log('info', `Plugin initialized for ${isProduction ? 'production' : 'development'} build`);
    },

    buildStart(opts) {
      if (isProduction) {
        log('info', 'Starting TypeScript dependency analysis for production build');
        analyzedFiles.clear();
      }
    },

    async transform(code, id) {
      // Only analyze TypeScript files
      if (!/\.(ts|tsx)$/.test(id)) return;
      
      // Skip excluded files
      if (exclude.some(pattern => {
        const minimatch = require('minimatch');
        return minimatch(id, pattern);
      })) return;

      try {
        const result = await analyzeTypeScriptFile(id);
        analyzedFiles.set(id, result);
        
        log('debug', `Analyzed: ${path.relative(process.cwd(), id)}`);
        
        if (enableCircularDependencyDetection) {
          await detectCircularDependencies(id, result, analyzedFiles);
        }
        
      } catch (error) {
        log('warn', `Failed to analyze ${id}:`, error.message);
      }
    },

    async generateBundle(options, bundle) {
      if (!isProduction) return;

      log('info', `Generating dependency analysis for ${analyzedFiles.size} files`);

      const analysisResults = Array.from(analyzedFiles.values());
      const summary = generateAnalysisSummary(analysisResults);

      // Generate comprehensive analysis report
      const report = {
        timestamp: new Date().toISOString(),
        buildConfig: {
          command: 'build',
          mode: isProduction ? 'production' : 'development',
          totalFiles: analyzedFiles.size
        },
        summary,
        files: Object.fromEntries(analyzedFiles),
        insights: await generateInsights(analysisResults),
        warnings: await generateWarnings(analysisResults)
      };

      // Emit analysis file
      this.emitFile({
        type: 'asset',
        fileName: outputFile,
        source: JSON.stringify(report, null, 2)
      });

      if (onAnalysisComplete) {
        await onAnalysisComplete(report);
      }

      log('info', `Analysis complete. Report saved to ${outputFile}`);
      logSummary(summary);
    }
  };
}

/**
 * Detect circular dependencies
 */
async function detectCircularDependencies(currentFile, result, analyzedFiles) {
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(file, graph) {
    if (recursionStack.has(file)) {
      return true; // Circular dependency detected
    }
    
    if (visited.has(file)) {
      return false;
    }

    visited.add(file);
    recursionStack.add(file);

    const dependencies = graph.get(file)?.dependencies || [];
    for (const dep of dependencies) {
      if (dep.type === 'relative' && graph.has(dep.resolvedPath)) {
        if (hasCycle(dep.resolvedPath, graph)) {
          return true;
        }
      }
    }

    recursionStack.delete(file);
    return false;
  }

  if (hasCycle(currentFile, analyzedFiles)) {
    console.warn(`[vite:typescript-analyzer] Circular dependency detected involving: ${currentFile}`);
  }
}

/**
 * Generate analysis summary
 */
function generateAnalysisSummary(results) {
  const totalFiles = results.length;
  const successfulFiles = results.filter(r => r.success).length;
  const totalDependencies = results.reduce((sum, r) => sum + (r.dependencies?.length || 0), 0);
  const totalImports = results.reduce((sum, r) => sum + (r.imports?.length || 0), 0);
  const totalExports = results.reduce((sum, r) => sum + (r.exports?.length || 0), 0);

  const externalDeps = new Set();
  const internalDeps = new Set();

  results.forEach(result => {
    result.dependencies?.forEach(dep => {
      if (dep.type === 'external') {
        externalDeps.add(dep.source);
      } else {
        internalDeps.add(dep.source);
      }
    });
  });

  return {
    totalFiles,
    successfulFiles,
    failedFiles: totalFiles - successfulFiles,
    totalDependencies,
    totalImports,
    totalExports,
    externalDependencies: externalDeps.size,
    internalDependencies: internalDeps.size,
    externalDependenciesList: Array.from(externalDeps).sort(),
    averageDependenciesPerFile: totalFiles > 0 ? (totalDependencies / totalFiles).toFixed(2) : 0
  };
}

/**
 * Generate insights from analysis
 */
async function generateInsights(results) {
  const insights = [];

  // Most imported files
  const importCounts = new Map();
  results.forEach(result => {
    result.dependencies?.forEach(dep => {
      if (dep.type === 'relative' || dep.type === 'internal') {
        const count = importCounts.get(dep.source) || 0;
        importCounts.set(dep.source, count + 1);
      }
    });
  });

  const topImports = Array.from(importCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  if (topImports.length > 0) {
    insights.push({
      type: 'most-imported-files',
      description: 'Files that are imported most frequently',
      data: topImports.map(([file, count]) => ({ file, count }))
    });
  }

  // Heavy files (lots of dependencies)
  const heavyFiles = results
    .filter(r => r.dependencies && r.dependencies.length > 10)
    .sort((a, b) => b.dependencies.length - a.dependencies.length)
    .slice(0, 5);

  if (heavyFiles.length > 0) {
    insights.push({
      type: 'dependency-heavy-files',
      description: 'Files with the most dependencies',
      data: heavyFiles.map(file => ({
        filePath: file.filePath,
        dependencyCount: file.dependencies.length
      }))
    });
  }

  return insights;
}

/**
 * Generate warnings from analysis
 */
async function generateWarnings(results) {
  const warnings = [];

  // Files with no exports (potential dead code)
  const noExportFiles = results.filter(r => 
    r.success && (!r.exports || r.exports.length === 0)
  );

  if (noExportFiles.length > 0) {
    warnings.push({
      type: 'no-exports',
      severity: 'info',
      message: `${noExportFiles.length} files have no exports (potential dead code)`,
      files: noExportFiles.map(f => f.filePath)
    });
  }

  // Files with excessive dependencies
  const heavyFiles = results.filter(r => 
    r.success && r.dependencies && r.dependencies.length > 20
  );

  if (heavyFiles.length > 0) {
    warnings.push({
      type: 'excessive-dependencies',
      severity: 'warning',
      message: `${heavyFiles.length} files have >20 dependencies (consider refactoring)`,
      files: heavyFiles.map(f => ({ 
        filePath: f.filePath, 
        dependencyCount: f.dependencies.length 
      }))
    });
  }

  return warnings;
}

/**
 * Log summary to console
 */
function logSummary(summary) {
  console.log('\n📊 TypeScript Analysis Summary:');
  console.log(`   Files analyzed: ${summary.totalFiles}`);
  console.log(`   External dependencies: ${summary.externalDependencies}`);
  console.log(`   Internal dependencies: ${summary.internalDependencies}`);
  console.log(`   Average deps/file: ${summary.averageDependenciesPerFile}`);
  console.log('');
}

module.exports = typescriptAnalyzerPlugin;