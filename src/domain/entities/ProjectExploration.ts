/**
 * Project Exploration Domain Entity
 * Represents the business rules and data for project exploration
 */

export interface ProjectStructure {
  files: FileInfo[];
  directories: DirectoryInfo[];
  statistics: ProjectStatistics;
}

export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  extension: string;
  size: number;
  lastModified: Date;
  type: FileType;
  content?: string;
}

export interface DirectoryInfo {
  name: string;
  path: string;
  relativePath: string;
  fileCount: number;
  subdirectoryCount: number;
}

export interface ProjectStatistics {
  totalFiles: number;
  totalDirectories: number;
  fileTypeDistribution: Record<string, number>;
  sizeDistribution: {
    small: number; // < 1KB
    medium: number; // 1KB - 100KB
    large: number; // > 100KB
  };
  lastModifiedRange: {
    oldest: Date;
    newest: Date;
  };
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  statistics: DependencyStatistics;
}

export interface DependencyNode {
  id: string;
  filePath: string;
  type: 'internal' | 'external';
  moduleType: 'file' | 'package' | 'builtin';
}

export interface DependencyEdge {
  from: string;
  to: string;
  importType: 'import' | 'require' | 'dynamic';
  isCircular?: boolean;
}

export interface DependencyStatistics {
  totalDependencies: number;
  internalDependencies: number;
  externalDependencies: number;
  circularDependencies: number;
  mostDependent: { file: string; count: number };
  leastDependent: { file: string; count: number };
}

export type FileType = 
  | 'source' 
  | 'test' 
  | 'config' 
  | 'documentation' 
  | 'asset' 
  | 'build' 
  | 'other';

export const FILE_TYPE_PATTERNS: Record<string, FileType> = {
  // Source files
  '.ts': 'source',
  '.js': 'source',
  '.tsx': 'source',
  '.jsx': 'source',
  '.vue': 'source',
  '.py': 'source',
  '.go': 'source',
  '.java': 'source',
  '.cpp': 'source',
  '.c': 'source',
  '.cs': 'source',
  '.rb': 'source',
  '.php': 'source',
  '.swift': 'source',
  '.kt': 'source',
  '.scala': 'source',
  
  // Test files
  '.test.ts': 'test',
  '.test.js': 'test',
  '.spec.ts': 'test',
  '.spec.js': 'test',
  
  // Configuration files
  '.json': 'config',
  '.yaml': 'config',
  '.yml': 'config',
  '.toml': 'config',
  '.ini': 'config',
  '.env': 'config',
  
  // Documentation
  '.md': 'documentation',
  '.rst': 'documentation',
  '.txt': 'documentation',
  
  // Assets
  '.png': 'asset',
  '.jpg': 'asset',
  '.jpeg': 'asset',
  '.gif': 'asset',
  '.svg': 'asset',
  '.ico': 'asset',
  '.css': 'asset',
  '.scss': 'asset',
  '.sass': 'asset',
  '.less': 'asset',
  
  // Build outputs
  '.map': 'build',
  '.min.js': 'build',
  '.bundle.js': 'build',
  '.d.ts': 'build'
};

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  size?: number;
  content?: string;
}

export interface ProjectTypeDetection {
  type: string;
  confidence: number;
  indicators: string[];
}

export interface ExplorationStrategy {
  depth: 'shallow' | 'comprehensive';
  parallelism: 'sequential' | 'parallel';
  batchSize?: number;
}

/**
 * ProjectExploration Domain Entity
 * Core business logic for project exploration and type detection
 */
export class ProjectExploration {
  private readonly config: any;

  constructor(config: any) {
    if (!config.project?.path) {
      throw new Error('Project path cannot be empty');
    }
    
    if (!config.parser?.extensions || config.parser.extensions.length === 0) {
      throw new Error('At least one file extension must be configured');
    }
    
    this.config = config;
  }

  /**
   * Detect project type from file structure
   */
  detectProjectType(files: ProjectFile[] | null): ProjectTypeDetection {
    if (!files || files.length === 0) {
      return {
        type: 'unknown',
        confidence: 0,
        indicators: []
      };
    }

    const indicators: string[] = [];
    let type = 'unknown';
    let confidence = 0;

    // Check for TypeScript
    if (files.some(f => f.name === 'tsconfig.json')) {
      indicators.push('tsconfig.json');
      type = 'typescript';
      confidence += 40;
    }

    if (files.some(f => f.extension === '.ts' || f.extension === '.tsx')) {
      indicators.push('TypeScript files');
      if (type !== 'typescript') {
        type = 'typescript';
        confidence += 30;
      } else {
        confidence += 20;
      }
    }

    // Check for JavaScript
    if (files.some(f => f.name === 'package.json')) {
      indicators.push('package.json');
      if (type === 'unknown') {
        type = 'javascript';
        confidence += 30;
      } else {
        confidence += 20;
      }
    }

    if (files.some(f => f.extension === '.js' || f.extension === '.jsx')) {
      indicators.push('JavaScript files');
      if (type === 'unknown') {
        type = 'javascript';
        confidence += 30;
      } else if (type === 'javascript') {
        confidence += 20;
      }
    }

    // Normalize confidence to 0-100
    confidence = Math.min(100, confidence);

    return {
      type,
      confidence,
      indicators
    };
  }

  /**
   * Filter project files based on configuration rules
   */
  filterProjectFiles(files: ProjectFile[] | null | undefined): ProjectFile[] {
    if (!files || files.length === 0) {
      return [];
    }

    return files.filter(file => {
      // Check file has required properties
      if (!file.path || !file.extension) {
        return false;
      }

      // Apply extension filter
      if (this.config.parser?.extensions) {
        const hasValidExtension = this.config.parser.extensions.some((ext: string) => 
          file.extension === ext || file.extension === `.${ext.replace('.', '')}`
        );
        if (!hasValidExtension) {
          return false;
        }
      }

      // Apply ignore patterns
      if (this.config.parser?.ignorePatterns) {
        const isIgnored = this.config.parser.ignorePatterns.some((pattern: string) => {
          if (pattern.includes('**')) {
            const simplePattern = pattern.replace('**/', '').replace('/**', '');
            return file.path.includes(simplePattern);
          }
          if (pattern.startsWith('*.')) {
            const extension = pattern.replace('*', '');
            return file.name.endsWith(extension);
          }
          return file.path.includes(pattern);
        });
        
        if (isIgnored) {
          return false;
        }
      }

      // Apply size filter (default 1MB if not specified)
      const maxSize = this.config.parser?.maxFileSize || 1048576;
      if (file.size && file.size > maxSize) {
        return false;
      }

      return true;
    });
  }

  /**
   * Determine exploration strategy based on project characteristics
   */
  determineExplorationStrategy(files: ProjectFile[]): ExplorationStrategy {
    const fileCount = files.length;

    if (fileCount < 100) {
      return {
        depth: 'comprehensive',
        parallelism: 'sequential'
      };
    } else if (fileCount < 500) {
      return {
        depth: 'comprehensive',
        parallelism: 'parallel',
        batchSize: 10
      };
    } else {
      return {
        depth: 'shallow',
        parallelism: 'parallel',
        batchSize: Math.min(50, Math.ceil(fileCount / 20))
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): boolean {
    if (!this.config.project?.path) {
      return false;
    }

    if (!this.config.parser?.extensions || this.config.parser.extensions.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Validate ignore pattern format
   */
  validateIgnorePattern(pattern: any): void {
    if (!pattern || typeof pattern !== 'string' || pattern.length === 0) {
      throw new Error('Invalid ignore pattern');
    }
  }
}

/**
 * Business rules for project exploration
 */
export class ProjectExplorationRules {
  /**
   * Determine file type based on extension and path
   */
  static determineFileType(filePath: string): FileType {
    const extension = this.extractExtension(filePath);
    
    // Check for test files first (more specific)
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 'test';
    }
    
    // Check for build/dist directories
    if (filePath.includes('/build/') || filePath.includes('/dist/') || filePath.includes('/out/')) {
      return 'build';
    }
    
    // Use extension mapping
    return FILE_TYPE_PATTERNS[extension] || 'other';
  }
  
  /**
   * Extract file extension from path
   */
  private static extractExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }
  
  /**
   * Determine size category
   */
  static categorizeSizeByBytes(sizeInBytes: number): 'small' | 'medium' | 'large' {
    if (sizeInBytes < 1024) return 'small';
    if (sizeInBytes < 102400) return 'medium'; // 100KB
    return 'large';
  }
  
  /**
   * Check if file should be ignored based on common patterns
   */
  static shouldIgnoreFile(filePath: string): boolean {
    const ignorePatternsRegex = [
      /node_modules/,
      /\.git/,
      /\.DS_Store/,
      /\.env\.local/,
      /\.env\.production/,
      /\.log$/,
      /\.tmp$/,
      /\.cache/,
      /coverage/,
      /\.nyc_output/,
      /build/,
      /dist/,
      /out/
    ];
    
    return ignorePatternsRegex.some(pattern => pattern.test(filePath));
  }
  
  /**
   * Validate exploration options
   */
  static validateExploreOptions(options: {
    pattern?: string;
    maxDepth?: number;
    includeIgnored?: boolean;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (options.maxDepth !== undefined && options.maxDepth < 1) {
      errors.push('Max depth must be at least 1');
    }
    
    if (options.pattern) {
      try {
        new RegExp(options.pattern);
      } catch {
        errors.push('Invalid regex pattern');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Calculate project health metrics
   */
  static calculateProjectHealth(structure: ProjectStructure, dependencies: DependencyGraph): {
    score: number;
    factors: {
      testCoverage: number;
      dependencyComplexity: number;
      fileOrganization: number;
      documentationCoverage: number;
    };
    recommendations: string[];
  } {
    const factors = {
      testCoverage: this.calculateTestCoverage(structure),
      dependencyComplexity: this.calculateDependencyComplexity(dependencies),
      fileOrganization: this.calculateOrganizationScore(structure),
      documentationCoverage: this.calculateDocumentationCoverage(structure)
    };
    
    const score = (
      factors.testCoverage * 0.3 +
      factors.dependencyComplexity * 0.25 +
      factors.fileOrganization * 0.25 +
      factors.documentationCoverage * 0.2
    );
    
    const recommendations = this.generateRecommendations(factors);
    
    return { score, factors, recommendations };
  }
  
  private static calculateTestCoverage(structure: ProjectStructure): number {
    const sourceFiles = structure.files.filter(f => f.type === 'source').length;
    const testFiles = structure.files.filter(f => f.type === 'test').length;
    
    if (sourceFiles === 0) return 1;
    return Math.min(testFiles / sourceFiles, 1);
  }
  
  private static calculateDependencyComplexity(dependencies: DependencyGraph): number {
    const { totalDependencies, circularDependencies } = dependencies.statistics;
    
    if (totalDependencies === 0) return 1;
    
    // Lower complexity score for more circular dependencies
    const circularRatio = circularDependencies / totalDependencies;
    return Math.max(1 - circularRatio * 2, 0);
  }
  
  private static calculateOrganizationScore(structure: ProjectStructure): number {
    // Simple heuristic: well-organized projects have balanced directory structure
    const avgFilesPerDir = structure.statistics.totalFiles / structure.statistics.totalDirectories;
    
    // Ideal range: 5-15 files per directory
    if (avgFilesPerDir >= 5 && avgFilesPerDir <= 15) return 1;
    if (avgFilesPerDir >= 3 && avgFilesPerDir <= 20) return 0.8;
    if (avgFilesPerDir >= 1 && avgFilesPerDir <= 30) return 0.6;
    return 0.4;
  }
  
  private static calculateDocumentationCoverage(structure: ProjectStructure): number {
    const totalFiles = structure.statistics.totalFiles;
    const docFiles = structure.files.filter(f => f.type === 'documentation').length;
    
    if (totalFiles === 0) return 1;
    
    // Good documentation should be 5-15% of total files
    const docRatio = docFiles / totalFiles;
    if (docRatio >= 0.05 && docRatio <= 0.15) return 1;
    if (docRatio >= 0.02 && docRatio <= 0.25) return 0.8;
    if (docRatio > 0) return 0.6;
    return 0.2;
  }
  
  private static generateRecommendations(factors: any): string[] {
    const recommendations: string[] = [];
    
    if (factors.testCoverage < 0.5) {
      recommendations.push('Consider adding more test files to improve test coverage');
    }
    
    if (factors.dependencyComplexity < 0.7) {
      recommendations.push('Review circular dependencies and complex dependency chains');
    }
    
    if (factors.fileOrganization < 0.7) {
      recommendations.push('Consider reorganizing files into more balanced directory structure');
    }
    
    if (factors.documentationCoverage < 0.6) {
      recommendations.push('Add more documentation files (README, guides, API docs)');
    }
    
    return recommendations;
  }
}