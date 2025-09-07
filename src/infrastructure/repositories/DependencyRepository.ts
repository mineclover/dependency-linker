/**
 * Dependency Repository - Infrastructure Layer
 * Implements dependency analysis access for project exploration
 */

import { DependencyAnalyzer } from '../dependencies/analyzer.js';
import type { IDependencyRepository, DependencyStatistics } from '../../domain/interfaces/IDependencyRepository.js';
import type { DependencyGraph } from '../../domain/entities/ProjectExploration.js';

/**
 * Dependency Repository
 * Handles all dependency analysis operations
 */
export class DependencyRepository implements IDependencyRepository {
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(private projectPath: string) {
    this.dependencyAnalyzer = new DependencyAnalyzer(projectPath);
  }

  /**
   * Analyze project-wide dependencies
   */
  async analyzeProjectDependencies(): Promise<DependencyGraph> {
    const dependencyGraph = await this.dependencyAnalyzer.analyzeProject();
    return this.transformDependencyGraph(dependencyGraph);
  }

  /**
   * Analyze dependencies for specific file/path
   */
  async analyzeDependencies(
    filePath: string, 
    direction: 'in' | 'out' | 'both', 
    maxDepth?: number
  ): Promise<DependencyGraph> {
    // Implementation depends on the DependencyAnalyzer interface
    // This is a placeholder that would call appropriate analyzer methods
    const dependencyGraph = await this.dependencyAnalyzer.analyzeFile(filePath, {
      direction,
      maxDepth
    });
    
    return this.transformDependencyGraph(dependencyGraph);
  }

  /**
   * Get dependency statistics
   */
  getStatistics(): DependencyStatistics {
    const stats = this.dependencyAnalyzer.getStatistics();
    
    // Transform infrastructure statistics to domain format
    return {
      totalDependencies: stats.totalDependencies,
      internalDependencies: stats.internalDependencies,
      externalDependencies: stats.externalDependencies,
      circularDependencies: stats.circularDependencies,
      mostDependent: stats.mostDependent,
      leastDependent: stats.leastDependent
    };
  }

  /**
   * Transform infrastructure dependency graph to domain format
   */
  private transformDependencyGraph(rawGraph: any): DependencyGraph {
    // This transformation would depend on the actual DependencyAnalyzer output format
    // Placeholder implementation
    return {
      nodes: rawGraph.nodes?.map((node: any) => ({
        id: node.id,
        filePath: node.filePath,
        type: node.type,
        moduleType: node.moduleType
      })) || [],
      edges: rawGraph.edges?.map((edge: any) => ({
        from: edge.from,
        to: edge.to,
        importType: edge.importType,
        isCircular: edge.isCircular
      })) || [],
      statistics: this.getStatistics()
    };
  }
}