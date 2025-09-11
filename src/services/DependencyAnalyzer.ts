/**
 * Dependency Analyzer Service
 * Analyzes and classifies dependencies from parsed TypeScript files
 */

import { DependencyInfo, classifyDependencyType, isNodeBuiltin, isScopedPackage, getPackageName } from '../models/DependencyInfo';
import { SourceLocation } from '../models/SourceLocation';

export interface ClassifiedDependency extends DependencyInfo {
  /** Whether this is a Node.js built-in module */
  isNodeBuiltin: boolean;
  /** Whether this is a scoped package */
  isScopedPackage: boolean;
  /** The package name (without sub-paths) */
  packageName: string;
  /** File extension if applicable */
  extension?: string;
}

export interface DependencyStats {
  total: number;
  external: number;
  internal: number;
  relative: number;
  nodeBuiltins: number;
  scopedPackages: number;
  uniquePackages: number;
}

export class DependencyAnalyzer {
  /**
   * Classifies an array of dependencies with additional metadata
   * @param dependencies Raw dependencies from parser
   * @param filePath Context file path for relative resolution
   * @returns Promise<ClassifiedDependency[]>
   */
  async classifyDependencies(
    dependencies: DependencyInfo[],
    filePath?: string
  ): Promise<ClassifiedDependency[]> {
    return dependencies.map(dep => this.classifyDependency(dep, filePath));
  }

  /**
   * Classifies a single dependency with additional metadata
   * @param dependency Raw dependency from parser
   * @param filePath Context file path for relative resolution
   * @returns ClassifiedDependency
   */
  classifyDependency(dependency: DependencyInfo, filePath?: string): ClassifiedDependency {
    const packageName = getPackageName(dependency.source);
    const extension = this.extractExtension(dependency.source);
    
    const result: ClassifiedDependency = {
      ...dependency,
      type: classifyDependencyType(dependency.source), // Re-classify to ensure consistency
      isNodeBuiltin: isNodeBuiltin(dependency.source),
      isScopedPackage: isScopedPackage(dependency.source),
      packageName
    };
    
    if (extension) {
      result.extension = extension;
    }
    
    return result;
  }

  /**
   * Generates statistics for classified dependencies
   * @param dependencies Array of classified dependencies
   * @returns DependencyStats
   */
  getClassificationStats(dependencies: ClassifiedDependency[]): DependencyStats {
    const uniquePackages = new Set(
      dependencies
        .filter(dep => dep.type === 'external')
        .map(dep => dep.packageName)
    );

    return {
      total: dependencies.length,
      external: dependencies.filter(dep => dep.type === 'external').length,
      internal: dependencies.filter(dep => dep.type === 'internal').length,
      relative: dependencies.filter(dep => dep.type === 'relative').length,
      nodeBuiltins: dependencies.filter(dep => dep.isNodeBuiltin).length,
      scopedPackages: dependencies.filter(dep => dep.isScopedPackage).length,
      uniquePackages: uniquePackages.size
    };
  }

  /**
   * Groups dependencies by package name
   * @param dependencies Array of classified dependencies
   * @returns Map of package name to dependencies
   */
  groupByPackage(dependencies: ClassifiedDependency[]): Map<string, ClassifiedDependency[]> {
    const groups = new Map<string, ClassifiedDependency[]>();
    
    for (const dep of dependencies) {
      const key = dep.packageName || dep.source;
      const existing = groups.get(key) || [];
      existing.push(dep);
      groups.set(key, existing);
    }
    
    return groups;
  }

  /**
   * Gets the most frequently used external packages
   * @param dependencies Array of classified dependencies
   * @param limit Maximum number of results
   * @returns Array of packages with usage count
   */
  getTopPackages(
    dependencies: ClassifiedDependency[],
    limit: number = 10
  ): Array<{ package: string; count: number; isScoped: boolean; isNodeBuiltin: boolean }> {
    const packageCounts = new Map<string, {
      count: number;
      isScoped: boolean;
      isNodeBuiltin: boolean;
    }>();
    
    for (const dep of dependencies) {
      if (dep.type === 'external') {
        const existing = packageCounts.get(dep.packageName) || {
          count: 0,
          isScoped: dep.isScopedPackage,
          isNodeBuiltin: dep.isNodeBuiltin
        };
        existing.count++;
        packageCounts.set(dep.packageName, existing);
      }
    }
    
    return Array.from(packageCounts.entries())
      .map(([packageName, info]) => ({ 
        package: packageName, 
        ...info 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Detects potential circular dependencies
   * @param dependencies Array of classified dependencies
   * @param currentFilePath Path of the current file
   * @returns Array of potential circular dependency sources
   */
  detectPotentialCircularDependencies(
    dependencies: ClassifiedDependency[],
    currentFilePath?: string
  ): string[] {
    // This is a simplified implementation
    // In a full implementation, this would require analyzing multiple files
    const relativeDeps = dependencies.filter(dep => dep.type === 'relative');
    
    // For now, just return relative dependencies that might be circular
    // (This would need more sophisticated analysis with actual file system traversal)
    return relativeDeps.map(dep => dep.source);
  }

  /**
   * Analyzes import patterns and suggests optimizations
   * @param dependencies Array of classified dependencies
   * @returns Array of optimization suggestions
   */
  suggestOptimizations(dependencies: ClassifiedDependency[]): string[] {
    const suggestions: string[] = [];
    const packageGroups = this.groupByPackage(dependencies);
    
    // Suggest combining multiple imports from same package
    for (const [packageName, deps] of packageGroups) {
      if (deps.length > 3 && deps[0].type === 'external') {
        suggestions.push(`Consider combining ${deps.length} imports from '${packageName}' into fewer import statements`);
      }
    }
    
    // Suggest using barrel exports for internal modules
    const internalDeps = dependencies.filter(dep => dep.type === 'internal');
    const internalPackages = new Set(internalDeps.map(dep => dep.packageName));
    
    if (internalPackages.size > 5) {
      suggestions.push(`Consider creating barrel exports (index.ts files) to simplify ${internalPackages.size} internal imports`);
    }
    
    // Warn about deep relative imports
    const deepRelativeDeps = dependencies.filter(dep => 
      dep.type === 'relative' && dep.source.split('/').length > 3
    );
    
    if (deepRelativeDeps.length > 0) {
      suggestions.push(`${deepRelativeDeps.length} imports use deep relative paths - consider flattening the structure`);
    }
    
    return suggestions;
  }

  /**
   * Validates dependencies for potential issues
   * @param dependencies Array of classified dependencies
   * @returns Array of validation warnings
   */
  validateDependencies(dependencies: ClassifiedDependency[]): string[] {
    const warnings: string[] = [];
    
    // Check for unused Node.js built-ins that might need polyfills in browser
    const nodeBuiltins = dependencies.filter(dep => dep.isNodeBuiltin);
    if (nodeBuiltins.length > 0) {
      warnings.push(`Using ${nodeBuiltins.length} Node.js built-in modules - ensure compatibility with target environment`);
    }
    
    // Check for relative imports without file extensions
    const relativeWithoutExt = dependencies.filter(dep => 
      dep.type === 'relative' && !dep.extension && !dep.source.includes('.')
    );
    
    if (relativeWithoutExt.length > 0) {
      warnings.push(`${relativeWithoutExt.length} relative imports missing file extensions`);
    }
    
    // Check for mixed import styles (ES6 vs CommonJS would need more analysis)
    const packageGroups = this.groupByPackage(dependencies);
    for (const [packageName, deps] of packageGroups) {
      if (deps.length > 1) {
        // This would require more sophisticated analysis to detect mixed import styles
      }
    }
    
    return warnings;
  }

  /**
   * Extracts file extension from a dependency source
   * @param source Dependency source string
   * @returns File extension or undefined
   */
  private extractExtension(source: string): string | undefined {
    const lastDot = source.lastIndexOf('.');
    const lastSlash = source.lastIndexOf('/');
    
    if (lastDot > lastSlash && lastDot !== -1) {
      return source.substring(lastDot);
    }
    
    return undefined;
  }

  /**
   * Resolves a relative path against a base path (simplified)
   * @param basePath Base file path
   * @param relativePath Relative path to resolve
   * @returns Resolved path
   */
  private resolvePath(basePath: string, relativePath: string): string {
    // Simplified path resolution
    // In a full implementation, this would use Node.js path.resolve()
    if (relativePath.startsWith('./')) {
      return relativePath.substring(2);
    }
    if (relativePath.startsWith('../')) {
      return relativePath;
    }
    return relativePath;
  }

  /**
   * Creates a dependency report
   * @param dependencies Array of classified dependencies
   * @returns Formatted dependency report
   */
  generateReport(dependencies: ClassifiedDependency[]): string {
    const stats = this.getClassificationStats(dependencies);
    const topPackages = this.getTopPackages(dependencies, 5);
    const suggestions = this.suggestOptimizations(dependencies);
    const warnings = this.validateDependencies(dependencies);
    
    let report = '# Dependency Analysis Report\n\n';
    
    // Statistics
    report += '## Statistics\n';
    report += `- Total Dependencies: ${stats.total}\n`;
    report += `- External Packages: ${stats.external}\n`;
    report += `- Internal Modules: ${stats.internal}\n`;
    report += `- Relative Imports: ${stats.relative}\n`;
    report += `- Node.js Built-ins: ${stats.nodeBuiltins}\n`;
    report += `- Scoped Packages: ${stats.scopedPackages}\n`;
    report += `- Unique Packages: ${stats.uniquePackages}\n\n`;
    
    // Top packages
    if (topPackages.length > 0) {
      report += '## Most Used Packages\n';
      for (const pkg of topPackages) {
        const flags = [];
        if (pkg.isNodeBuiltin) flags.push('Node.js');
        if (pkg.isScoped) flags.push('Scoped');
        const flagStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
        report += `- ${pkg.package}: ${pkg.count} imports${flagStr}\n`;
      }
      report += '\n';
    }
    
    // Suggestions
    if (suggestions.length > 0) {
      report += '## Optimization Suggestions\n';
      for (const suggestion of suggestions) {
        report += `- ${suggestion}\n`;
      }
      report += '\n';
    }
    
    // Warnings
    if (warnings.length > 0) {
      report += '## Warnings\n';
      for (const warning of warnings) {
        report += `- ⚠️ ${warning}\n`;
      }
      report += '\n';
    }
    
    return report;
  }
}