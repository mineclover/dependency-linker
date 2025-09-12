/**
 * Rollup Plugin for TypeScript File Analyzer
 * Provides build-time dependency analysis for Rollup projects
 */

const { analyzeTypeScriptFile } = require('../dist/index');
const path = require('path');
const fs = require('fs');

/**
 * Rollup plugin for TypeScript dependency analysis
 * @param {Object} options Plugin configuration options
 * @returns {Object} Rollup plugin object
 */
function typescriptAnalyzer(options = {}) {
  const {
    include = ['**/*.ts', '**/*.tsx'],
    exclude = ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
    outputFile = 'rollup-dependency-analysis.json',
    enableBundleOptimization = true,
    enableTreeShakingAnalysis = true,
    enableChunkAnalysis = true,
    onAnalysisComplete = null
  } = options;

  let analyzedModules = new Map();
  let bundleInfo = null;

  return {
    name: 'typescript-analyzer',

    buildStart(inputOptions) {
      console.log('[rollup:typescript-analyzer] Starting dependency analysis');
      analyzedModules.clear();
      bundleInfo = {
        input: inputOptions.input,
        external: inputOptions.external || [],
        startTime: Date.now()
      };
    },

    async transform(code, id) {
      // Skip non-TypeScript files
      if (!/\.(ts|tsx)$/.test(id)) return null;

      // Skip excluded patterns
      if (exclude.some(pattern => {
        const { minimatch } = require('minimatch');
        return minimatch(id, pattern);
      })) return null;

      try {
        const result = await analyzeTypeScriptFile(id);
        analyzedModules.set(id, {
          ...result,
          bundleInfo: {
            isEntry: bundleInfo.input === id || 
                    (Array.isArray(bundleInfo.input) && bundleInfo.input.includes(id)),
            transformTime: Date.now()
          }
        });

        console.log(`[rollup:typescript-analyzer] Analyzed: ${path.relative(process.cwd(), id)}`);
        
      } catch (error) {
        console.warn(`[rollup:typescript-analyzer] Failed to analyze ${id}:`, error.message);
      }

      return null; // Don't transform the code
    },

    generateBundle(outputOptions, bundle) {
      const endTime = Date.now();
      const buildTime = endTime - bundleInfo.startTime;

      console.log(`[rollup:typescript-analyzer] Generating analysis report for ${analyzedModules.size} modules`);

      // Analyze bundle structure
      const bundleAnalysis = this.analyzeBundleStructure(bundle, analyzedModules);
      
      // Generate comprehensive report
      const report = {
        timestamp: new Date().toISOString(),
        buildInfo: {
          ...bundleInfo,
          endTime,
          buildTime,
          outputOptions: {
            format: outputOptions.format,
            file: outputOptions.file,
            dir: outputOptions.dir
          }
        },
        modules: Object.fromEntries(analyzedModules),
        bundleAnalysis,
        summary: this.generateSummary(),
        optimization: enableBundleOptimization ? this.generateOptimizationSuggestions() : null,
        treeShaking: enableTreeShakingAnalysis ? this.analyzeTreeShaking(bundle) : null
      };

      // Emit the analysis file
      this.emitFile({
        type: 'asset',
        fileName: outputFile,
        source: JSON.stringify(report, null, 2)
      });

      if (onAnalysisComplete) {
        onAnalysisComplete(report);
      }

      this.logBundleAnalysis(bundleAnalysis);
    },

    analyzeBundleStructure(bundle, modules) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
      const assets = Object.values(bundle).filter(item => item.type === 'asset');

      return {
        totalChunks: chunks.length,
        totalAssets: assets.length,
        entryChunks: chunks.filter(chunk => chunk.isEntry).length,
        dynamicChunks: chunks.filter(chunk => chunk.isDynamicEntry).length,
        chunkSizes: chunks.map(chunk => ({
          fileName: chunk.fileName,
          size: Buffer.byteLength(chunk.code, 'utf8'),
          modules: Object.keys(chunk.modules).length,
          dependencies: this.getChunkDependencies(chunk, modules)
        })),
        totalBundleSize: chunks.reduce((total, chunk) => 
          total + Buffer.byteLength(chunk.code, 'utf8'), 0
        )
      };
    },

    getChunkDependencies(chunk, modules) {
      const dependencies = new Set();
      
      Object.keys(chunk.modules).forEach(moduleId => {
        const moduleInfo = modules.get(moduleId);
        if (moduleInfo && moduleInfo.dependencies) {
          moduleInfo.dependencies.forEach(dep => {
            if (dep.type === 'external') {
              dependencies.add(dep.source);
            }
          });
        }
      });

      return Array.from(dependencies);
    },

    generateSummary() {
      const modules = Array.from(analyzedModules.values());
      const totalDependencies = modules.reduce((sum, m) => sum + (m.dependencies?.length || 0), 0);
      const externalDeps = new Set();
      
      modules.forEach(module => {
        module.dependencies?.forEach(dep => {
          if (dep.type === 'external') {
            externalDeps.add(dep.source);
          }
        });
      });

      return {
        totalModules: modules.length,
        successfulModules: modules.filter(m => m.success).length,
        totalDependencies,
        externalDependencies: Array.from(externalDeps),
        averageDependenciesPerModule: modules.length > 0 ? 
          (totalDependencies / modules.length).toFixed(2) : 0
      };
    },

    generateOptimizationSuggestions() {
      const modules = Array.from(analyzedModules.values());
      const suggestions = [];

      // Find modules with many dependencies
      const heavyModules = modules.filter(m => 
        m.dependencies && m.dependencies.length > 15
      );

      if (heavyModules.length > 0) {
        suggestions.push({
          type: 'code-splitting',
          severity: 'medium',
          message: `Consider code splitting for ${heavyModules.length} modules with >15 dependencies`,
          modules: heavyModules.map(m => m.filePath)
        });
      }

      // Find commonly imported modules (good candidates for separate chunks)
      const importCounts = new Map();
      modules.forEach(module => {
        module.dependencies?.forEach(dep => {
          if (dep.type === 'relative' || dep.type === 'internal') {
            const count = importCounts.get(dep.source) || 0;
            importCounts.set(dep.source, count + 1);
          }
        });
      });

      const commonModules = Array.from(importCounts.entries())
        .filter(([, count]) => count > 3)
        .sort(([,a], [,b]) => b - a);

      if (commonModules.length > 0) {
        suggestions.push({
          type: 'common-chunk',
          severity: 'low',
          message: `Consider creating common chunks for frequently imported modules`,
          modules: commonModules.slice(0, 5).map(([module, count]) => ({ module, count }))
        });
      }

      return suggestions;
    },

    analyzeTreeShaking(bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
      const analysis = {
        totalExports: 0,
        usedExports: 0,
        unusedExports: []
      };

      // This is a simplified tree-shaking analysis
      // In a real implementation, you'd need more sophisticated analysis
      chunks.forEach(chunk => {
        Object.keys(chunk.modules).forEach(moduleId => {
          const moduleInfo = analyzedModules.get(moduleId);
          if (moduleInfo && moduleInfo.exports) {
            analysis.totalExports += moduleInfo.exports.length;
            // Simplified: assume all exports are used if they're in the bundle
            analysis.usedExports += moduleInfo.exports.length;
          }
        });
      });

      analysis.treeShakingEfficiency = analysis.totalExports > 0 ? 
        (analysis.usedExports / analysis.totalExports * 100).toFixed(2) + '%' : '100%';

      return analysis;
    },

    logBundleAnalysis(analysis) {
      console.log('\n📦 Bundle Analysis Summary:');
      console.log(`   Total chunks: ${analysis.totalChunks}`);
      console.log(`   Entry chunks: ${analysis.entryChunks}`);
      console.log(`   Bundle size: ${(analysis.totalBundleSize / 1024).toFixed(2)} KB`);
      console.log(`   Largest chunk: ${Math.max(...analysis.chunkSizes.map(c => c.size / 1024)).toFixed(2)} KB`);
      console.log('');
    }
  };
}

module.exports = typescriptAnalyzer;