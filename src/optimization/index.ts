/**
 * Test Optimization Framework - Main Entry Point
 * Provides a unified API for the entire optimization framework
 */

// Re-export everything from models and services
export * from '../models/optimization';
export * from '../services/optimization';

// Re-export helper utilities
export { PerformanceBenchmark } from '../helpers/benchmark/PerformanceBenchmark';

// Main framework class that combines all functionality
export class TestOptimizationFramework {
  private orchestrator: import('../services/optimization').OptimizationOrchestrator;

  constructor(config?: import('../services/optimization').OptimizationServiceConfig) {
    // Import is done dynamically to avoid circular dependencies
    const { OptimizationOrchestrator } = require('../services/optimization');
    this.orchestrator = new OptimizationOrchestrator(config);
  }

  /**
   * Initialize the framework
   */
  async initialize(): Promise<void> {
    await this.orchestrator.initialize();
  }

  /**
   * Cleanup framework resources
   */
  async cleanup(): Promise<void> {
    await this.orchestrator.cleanup();
  }

  /**
   * Optimize tests using the complete workflow
   */
  async optimize(testFilesPattern: string) {
    return await this.orchestrator.optimizeTestSuite(testFilesPattern);
  }

  /**
   * Get access to individual services for advanced usage
   */
  getServices() {
    return this.orchestrator.getServices();
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.orchestrator.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: any) {
    return this.orchestrator.updateConfig(updates);
  }
}

/**
 * Factory function for creating framework instance
 */
export function createOptimizationFramework(
  config?: import('../services/optimization').OptimizationServiceConfig
): TestOptimizationFramework {
  return new TestOptimizationFramework(config);
}

/**
 * Quick optimization function for simple use cases
 */
export async function optimizeTestFiles(
  testFilesPattern: string,
  config?: import('../services/optimization').OptimizationServiceConfig
): Promise<{
  analysis: any;
  optimizations: any[];
  performance: any;
}> {
  const framework = createOptimizationFramework(config);

  try {
    await framework.initialize();
    return await framework.optimize(testFilesPattern);
  } finally {
    await framework.cleanup();
  }
}

// Export version information
export const VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'Test Optimization Framework';

// Export compatibility information
export const COMPATIBILITY = {
  node: '>=18.0.0',
  jest: '>=29.0.0',
  typescript: '>=5.0.0'
} as const;