/**
 * Dependency Repository Interface
 * Domain interface for dependency analysis operations
 */

import type { DependencyGraph } from '../entities/ProjectExploration.js';

export interface DependencyStatistics {
  totalDependencies: number;
  externalDependencies: number;
  internalDependencies: number;
  circularDependencies: number;
}

export interface IDependencyRepository {
  analyzeProjectDependencies(): Promise<DependencyGraph>;
  analyzeDependencies(filePath: string, direction: 'in' | 'out' | 'both', maxDepth?: number): Promise<DependencyGraph>;
  getStatistics(): DependencyStatistics;
}