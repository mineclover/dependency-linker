/**
 * Advanced Webpack Plugin for TypeScript File Analyzer
 * Enhanced version with performance monitoring, bundle optimization, and detailed reporting
 */

const { analyzeTypeScriptFile, getBatchAnalysis } = require('../dist/index');
const { BatchAnalyzer } = require('../dist/api/BatchAnalyzer');
const path = require('path');
const fs = require('fs');

class TypeScriptAnalyzerWebpackPlugin {
  constructor(options = {}) {
    this.options = {
      outputFile: 'webpack-dependency-analysis.json',
      enablePerformanceTracking: true,
      enableBundleOptimization: true,
      enableHotReloadAnalysis: process.env.NODE_ENV === 'development',
      enableMemoryTracking: true,
      enableCircularDependencyDetection: true,
      enableCodeSplittingSuggestions: true,
      analysisLevel: 'comprehensive', // 'basic', 'standard', 'comprehensive'
      onAnalysisComplete: null,
      onBuildStart: null,
      onBuildEnd: null,
      ...options
    };

    this.analysisData = {
      modules: new Map(),
      chunks: new Map(),
      buildStats: {},
      performance: {
        startTime: null,
        endTime: null,
        moduleAnalysisTime: 0,
        memoryUsage: []
      }
    };

    this.batchAnalyzer = null;
  }

  apply(compiler) {
    const pluginName = 'TypeScriptAnalyzerWebpackPlugin';
    
    compiler.hooks.compile.tap(pluginName, () => {
      this.analysisData.performance.startTime = Date.now();
      
      if (this.options.enableMemoryTracking) {
        this.startMemoryTracking();
      }
      
      if (this.options.onBuildStart) {
        this.options.onBuildStart(this.analysisData);
      }
      
      console.log('[webpack:typescript-analyzer] Starting comprehensive analysis...');
    });

    compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
      factory.hooks.module.tap(pluginName, (module, info) => {
        if (this.isTypeScriptModule(module)) {
          this.scheduleModuleAnalysis(module);
        }
      });
    });

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // Hook into module processing
      compilation.hooks.buildModule.tap(pluginName, (module) => {
        if (this.isTypeScriptModule(module)) {
          this.analyzeModule(module, compilation);
        }
      });

      // Hook into chunk optimization
      compilation.hooks.optimizeChunks.tap(pluginName, (chunks) => {
        if (this.options.enableCodeSplittingSuggestions) {
          this.analyzeChunkOptimization(chunks, compilation);
        }
      });

      // Emit analysis results
      compilation.hooks.additionalAssets.tapAsync(pluginName, (callback) => {
        this.generateAnalysisReport(compilation)
          .then(() => callback())
          .catch(callback);
      });
    });

    compiler.hooks.done.tap(pluginName, (stats) => {
      this.analysisData.performance.endTime = Date.now();
      this.analysisData.buildStats = this.extractBuildStats(stats);
      
      if (this.options.enableMemoryTracking) {
        this.stopMemoryTracking();
      }
      
      if (this.options.onBuildEnd) {
        this.options.onBuildEnd(this.analysisData, stats);
      }
      
      this.logPerformanceSummary();
    });
  }

  isTypeScriptModule(module) {
    const resource = module.resource || module.userRequest;
    return resource && /\.(ts|tsx)$/.test(resource) && 
           !resource.includes('node_modules');
  }

  scheduleModuleAnalysis(module) {
    // Add to analysis queue
    if (!this.batchAnalyzer) {
      const { TypeScriptAnalyzer } = require('../dist/index');
      const analyzer = new TypeScriptAnalyzer({ enableCache: true });
      this.batchAnalyzer = new BatchAnalyzer(analyzer, {
        maxConcurrency: 4,
        enableResourceMonitoring: true
      });
    }
  }

  async analyzeModule(module, compilation) {
    const resource = module.resource || module.userRequest;
    if (!resource) return;

    try {
      const startTime = Date.now();
      const result = await analyzeTypeScriptFile(resource);
      const analysisTime = Date.now() - startTime;
      
      this.analysisData.performance.moduleAnalysisTime += analysisTime;

      // Enhanced module information
      const moduleAnalysis = {
        ...result,
        webpackInfo: {
          id: module.id,
          size: module.size ? module.size() : 0,
          reasons: module.reasons ? module.reasons.length : 0,
          usedExports: module.usedExports,
          providedExports: module.providedExports,
          optimizationBailout: module.optimizationBailout,
          analysisTime
        },
        buildContext: {
          isEntry: module.isEntryModule ? module.isEntryModule() : false,
          depth: this.calculateModuleDepth(module),
          chunksIncluded: []
        }
      };

      this.analysisData.modules.set(resource, moduleAnalysis);

      // Detect circular dependencies
      if (this.options.enableCircularDependencyDetection) {
        this.detectCircularDependencies(resource, result);
      }

    } catch (error) {
      console.warn(`[webpack:typescript-analyzer] Analysis failed for ${resource}:`, error.message);
    }
  }

  calculateModuleDepth(module) {
    let depth = 0;
    let current = module;
    
    while (current && current.reasons && current.reasons.length > 0) {
      depth++;
      current = current.reasons[0].module;
      if (depth > 10) break; // Prevent infinite loops
    }
    
    return depth;
  }

  analyzeChunkOptimization(chunks, compilation) {
    chunks.forEach(chunk => {
      const chunkModules = Array.from(chunk.modulesIterable || []);
      const typeScriptModules = chunkModules.filter(m => this.isTypeScriptModule(m));
      
      const chunkAnalysis = {
        name: chunk.name,
        id: chunk.id,
        size: chunk.size(),
        moduleCount: typeScriptModules.length,
        entryModule: chunk.entryModule ? chunk.entryModule.resource : null,
        dependencies: this.extractChunkDependencies(typeScriptModules),
        optimization: {
          canSplit: typeScriptModules.length > 5,
          commonModules: this.findCommonModules(typeScriptModules),
          heavyModules: typeScriptModules
            .filter(m => {
              const analysis = this.analysisData.modules.get(m.resource);
              return analysis && analysis.dependencies && analysis.dependencies.length > 10;
            })
            .map(m => m.resource)
        }
      };

      this.analysisData.chunks.set(chunk.name || chunk.id, chunkAnalysis);
    });
  }

  extractChunkDependencies(modules) {
    const dependencies = new Set();
    
    modules.forEach(module => {
      const analysis = this.analysisData.modules.get(module.resource);
      if (analysis && analysis.dependencies) {
        analysis.dependencies.forEach(dep => {
          if (dep.type === 'external') {
            dependencies.add(dep.source);
          }
        });
      }
    });

    return Array.from(dependencies);
  }

  findCommonModules(modules) {
    const importCounts = new Map();
    
    modules.forEach(module => {
      const analysis = this.analysisData.modules.get(module.resource);
      if (analysis && analysis.dependencies) {
        analysis.dependencies.forEach(dep => {
          if (dep.type === 'relative' || dep.type === 'internal') {
            const count = importCounts.get(dep.source) || 0;
            importCounts.set(dep.source, count + 1);
          }
        });
      }
    });

    return Array.from(importCounts.entries())
      .filter(([, count]) => count > 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  detectCircularDependencies(currentFile, analysis) {
    // Simplified circular dependency detection
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (file) => {
      if (recursionStack.has(file)) return true;
      if (visited.has(file)) return false;
      
      visited.add(file);
      recursionStack.add(file);
      
      const moduleAnalysis = this.analysisData.modules.get(file);
      if (moduleAnalysis && moduleAnalysis.dependencies) {
        for (const dep of moduleAnalysis.dependencies) {
          if (dep.type === 'relative' && hasCycle(dep.resolvedPath)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(file);
      return false;
    };
    
    if (hasCycle(currentFile)) {
      console.warn(`[webpack:typescript-analyzer] Circular dependency detected: ${currentFile}`);
    }
  }

  startMemoryTracking() {
    this.memoryInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.analysisData.performance.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external
      });
    }, 1000);
  }

  stopMemoryTracking() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
  }

  async generateAnalysisReport(compilation) {
    const report = {
      timestamp: new Date().toISOString(),
      webpackVersion: compilation.compiler.webpack.version,
      buildInfo: {
        mode: compilation.compiler.options.mode,
        context: compilation.compiler.context,
        entry: compilation.compiler.options.entry,
        performance: this.analysisData.performance
      },
      modules: Object.fromEntries(this.analysisData.modules),
      chunks: Object.fromEntries(this.analysisData.chunks),
      summary: this.generateSummary(),
      optimization: this.generateOptimizationReport(),
      performance: this.generatePerformanceReport(),
      warnings: this.generateWarnings()
    };

    const reportContent = JSON.stringify(report, null, 2);
    
    compilation.assets[this.options.outputFile] = {
      source: () => reportContent,
      size: () => reportContent.length
    };

    if (this.options.onAnalysisComplete) {
      await this.options.onAnalysisComplete(report);
    }
  }

  generateSummary() {
    const modules = Array.from(this.analysisData.modules.values());
    const chunks = Array.from(this.analysisData.chunks.values());
    
    return {
      totalModules: modules.length,
      totalChunks: chunks.length,
      totalDependencies: modules.reduce((sum, m) => sum + (m.dependencies?.length || 0), 0),
      externalDependencies: this.getUniqueExternalDependencies().length,
      averageModuleSize: modules.length > 0 ? 
        modules.reduce((sum, m) => sum + (m.webpackInfo?.size || 0), 0) / modules.length : 0,
      totalBuildTime: this.analysisData.performance.endTime - this.analysisData.performance.startTime,
      analysisOverhead: this.analysisData.performance.moduleAnalysisTime
    };
  }

  generateOptimizationReport() {
    const suggestions = [];

    // Analyze chunk splitting opportunities
    const largeChunks = Array.from(this.analysisData.chunks.values())
      .filter(chunk => chunk.moduleCount > 10);

    if (largeChunks.length > 0) {
      suggestions.push({
        type: 'chunk-splitting',
        priority: 'medium',
        description: `${largeChunks.length} chunks have >10 modules and could benefit from splitting`,
        chunks: largeChunks.map(c => c.name)
      });
    }

    // Analyze common dependencies
    const commonDeps = this.findMostCommonDependencies();
    if (commonDeps.length > 0) {
      suggestions.push({
        type: 'common-chunk',
        priority: 'low',
        description: 'Consider extracting common dependencies into separate chunks',
        dependencies: commonDeps.slice(0, 5)
      });
    }

    return {
      suggestions,
      metrics: {
        chunksAnalyzed: this.analysisData.chunks.size,
        optimizationOpportunities: suggestions.length
      }
    };
  }

  generatePerformanceReport() {
    const memoryUsage = this.analysisData.performance.memoryUsage;
    
    return {
      analysisTime: this.analysisData.performance.moduleAnalysisTime,
      totalBuildTime: this.analysisData.performance.endTime - this.analysisData.performance.startTime,
      memoryStats: memoryUsage.length > 0 ? {
        peak: Math.max(...memoryUsage.map(m => m.heapUsed)),
        average: memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / memoryUsage.length,
        samples: memoryUsage.length
      } : null,
      efficiency: {
        averageTimePerModule: this.analysisData.modules.size > 0 ? 
          this.analysisData.performance.moduleAnalysisTime / this.analysisData.modules.size : 0
      }
    };
  }

  generateWarnings() {
    const warnings = [];
    const modules = Array.from(this.analysisData.modules.values());

    // Modules with no exports
    const noExportModules = modules.filter(m => 
      m.success && (!m.exports || m.exports.length === 0)
    );
    
    if (noExportModules.length > 0) {
      warnings.push({
        type: 'no-exports',
        count: noExportModules.length,
        message: 'Modules with no exports (potential dead code)'
      });
    }

    // Large modules
    const largeModules = modules.filter(m => 
      m.webpackInfo && m.webpackInfo.size > 50000 // 50KB
    );
    
    if (largeModules.length > 0) {
      warnings.push({
        type: 'large-modules',
        count: largeModules.length,
        message: 'Modules larger than 50KB (consider code splitting)'
      });
    }

    return warnings;
  }

  getUniqueExternalDependencies() {
    const deps = new Set();
    
    this.analysisData.modules.forEach(module => {
      if (module.dependencies) {
        module.dependencies.forEach(dep => {
          if (dep.type === 'external') {
            deps.add(dep.source);
          }
        });
      }
    });

    return Array.from(deps);
  }

  findMostCommonDependencies() {
    const depCounts = new Map();
    
    this.analysisData.modules.forEach(module => {
      if (module.dependencies) {
        module.dependencies.forEach(dep => {
          if (dep.type === 'external') {
            const count = depCounts.get(dep.source) || 0;
            depCounts.set(dep.source, count + 1);
          }
        });
      }
    });

    return Array.from(depCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([dep, count]) => ({ dependency: dep, count }));
  }

  extractBuildStats(stats) {
    const compilation = stats.compilation;
    
    return {
      errors: compilation.errors.length,
      warnings: compilation.warnings.length,
      modules: compilation.modules ? compilation.modules.size : 0,
      chunks: compilation.chunks ? compilation.chunks.size : 0,
      assets: Object.keys(compilation.assets).length,
      time: stats.endTime - stats.startTime
    };
  }

  logPerformanceSummary() {
    const summary = this.generateSummary();
    const performance = this.generatePerformanceReport();
    
    console.log('\n📊 TypeScript Analysis Summary:');
    console.log(`   Modules analyzed: ${summary.totalModules}`);
    console.log(`   Analysis time: ${performance.analysisTime}ms`);
    console.log(`   Average per module: ${performance.efficiency.averageTimePerModule.toFixed(2)}ms`);
    console.log(`   External dependencies: ${summary.externalDependencies}`);
    console.log('');
  }
}

module.exports = TypeScriptAnalyzerWebpackPlugin;