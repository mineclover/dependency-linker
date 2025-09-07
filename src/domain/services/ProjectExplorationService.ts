/**
 * Project Exploration Domain Service
 * Contains the core business logic for project exploration
 */

import { logger } from '../../shared/utils/index.js';
import type {
  ProjectStructure,
  FileInfo,
  DirectoryInfo,
  ProjectStatistics,
  DependencyGraph,
  FileType,
  ProjectExplorationRules
} from '../entities/ProjectExploration.js';
import type { 
  IFileSystemRepository, 
  RawFileInfo, 
  RawDirectoryInfo, 
  ExploreProjectOptions 
} from '../interfaces/IFileSystemRepository.js';
import type { IDependencyRepository, DependencyStatistics } from '../interfaces/IDependencyRepository.js';

export interface ExploreDependenciesOptions {
  filePath?: string;
  direction?: 'in' | 'out' | 'both';
  maxDepth?: number;
  includeExternal?: boolean;
}

export interface ExploreDocsOptions {
  docsPath?: string;
  linkToCode?: boolean;
  checkSyncStatus?: boolean;
}

export interface ExplorePathOptions {
  targetPath: string;
  showDependencies?: boolean;
  showContent?: boolean;
  maxLines?: number;
}

export interface ProjectExplorationResult {
  success: boolean;
  message: string;
  data: {
    structure?: ProjectStructure;
    dependencies?: DependencyGraph;
    health?: {
      score: number;
      factors: any;
      recommendations: string[];
    };
    content?: string;
  };
}

import { ProjectExplorationRules } from '../entities/ProjectExploration.js';
import type { DependencyStatistics } from '../entities/ProjectExploration.js';

/**
 * Project Exploration Domain Service
 * Implements business logic for exploring project structure and dependencies
 */
export class ProjectExplorationService {
  constructor(
    private fileSystemRepository: IFileSystemRepository,
    private dependencyRepository: IDependencyRepository,
    private projectPath: string
  ) {}

  /**
   * Explore project structure with business validation
   */
  async exploreProject(options: ExploreProjectOptions = {}): Promise<ProjectExplorationResult> {
    try {
      logger.info('Starting project structure exploration', '🔍');

      // Apply business rules for option validation
      const validation = ProjectExplorationRules.validateExploreOptions(options);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Invalid options: ${validation.errors.join(', ')}`,
          data: {}
        };
      }

      // Get raw data from infrastructure
      const rawData = await this.fileSystemRepository.exploreProject(options);
      
      // Apply business logic to transform raw data
      const structure = await this.transformToProjectStructure(rawData);
      
      logger.info(`Discovered ${structure.files.length} files`);

      let dependencies: DependencyGraph | undefined;
      let health: any;

      // Apply business rule: Include dependencies if requested
      if (options.showDependencies) {
        logger.info('Analyzing dependencies...', '🔗');
        dependencies = await this.dependencyRepository.analyzeProjectDependencies();
        
        // Calculate project health using business rules
        health = ProjectExplorationRules.calculateProjectHealth(structure, dependencies);
        
        logger.info(`Analysis complete: ${dependencies.statistics.totalDependencies} dependencies found`);
      }

      return {
        success: true,
        message: `Project exploration completed: ${structure.files.length} files${dependencies ? `, ${dependencies.statistics.totalDependencies} dependencies` : ''}`,
        data: { structure, dependencies, health }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Project exploration failed: ${errorMsg}`);
      
      return {
        success: false,
        message: `Project exploration failed: ${errorMsg}`,
        data: {}
      };
    }
  }

  /**
   * Explore specific file or directory dependencies
   */
  async exploreDependencies(options: ExploreDependenciesOptions = {}): Promise<ProjectExplorationResult> {
    try {
      logger.info('Analyzing dependencies...', '🔗');

      const filePath = options.filePath || this.projectPath;
      const direction = options.direction || 'both';
      const maxDepth = options.maxDepth || 5;

      // Business rule: Validate file path exists and is accessible
      if (options.filePath) {
        try {
          await this.fileSystemRepository.getFileStats(options.filePath);
        } catch {
          return {
            success: false,
            message: `File not found or not accessible: ${options.filePath}`,
            data: {}
          };
        }
      }

      const dependencies = await this.dependencyRepository.analyzeDependencies(
        filePath, 
        direction, 
        maxDepth
      );

      // Apply business logic for filtering external dependencies
      if (!options.includeExternal) {
        dependencies.nodes = dependencies.nodes.filter(node => node.type === 'internal');
        dependencies.edges = dependencies.edges.filter(edge => 
          dependencies.nodes.some(node => node.id === edge.from) &&
          dependencies.nodes.some(node => node.id === edge.to)
        );
      }

      return {
        success: true,
        message: `Dependency analysis completed: ${dependencies.statistics.totalDependencies} dependencies`,
        data: { dependencies }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Dependency analysis failed: ${errorMsg}`);
      
      return {
        success: false,
        message: `Dependency analysis failed: ${errorMsg}`,
        data: {}
      };
    }
  }

  /**
   * Explore specific path with content and dependencies
   */
  async explorePath(options: ExplorePathOptions): Promise<ProjectExplorationResult> {
    try {
      logger.info(`Exploring path: ${options.targetPath}`, '🎯');

      // Business rule: Validate target path
      let fileStats;
      try {
        fileStats = await this.fileSystemRepository.getFileStats(options.targetPath);
      } catch {
        return {
          success: false,
          message: `Path not found: ${options.targetPath}`,
          data: {}
        };
      }

      const data: any = {};

      // Business rule: Include content if requested and file size is reasonable
      if (options.showContent) {
        const maxSizeForContent = 1024 * 1024; // 1MB limit
        
        if (fileStats.size > maxSizeForContent) {
          logger.warning(`File too large for content display (${fileStats.size} bytes)`);
          data.contentWarning = `File too large for content display (${fileStats.size} bytes)`;
        } else {
          data.content = await this.fileSystemRepository.readFileContent(
            options.targetPath, 
            options.maxLines
          );
        }
      }

      // Business rule: Include dependencies if requested
      if (options.showDependencies) {
        const dependencies = await this.dependencyRepository.analyzeDependencies(
          options.targetPath,
          'both',
          3 // Limit depth for single file exploration
        );
        data.dependencies = dependencies;
      }

      return {
        success: true,
        message: `Path exploration completed for: ${options.targetPath}`,
        data
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Path exploration failed: ${errorMsg}`);
      
      return {
        success: false,
        message: `Path exploration failed: ${errorMsg}`,
        data: {}
      };
    }
  }

  /**
   * Transform raw file system data to domain entities using business rules
   */
  private async transformToProjectStructure(rawData: {
    files: RawFileInfo[];
    directories: RawDirectoryInfo[];
  }): Promise<ProjectStructure> {
    const files: FileInfo[] = [];
    const directories: DirectoryInfo[] = [];

    // Transform files with business logic
    for (const rawFile of rawData.files) {
      // Apply business rule: Determine file type
      const fileType = ProjectExplorationRules.determineFileType(rawFile.path);
      
      // Apply business rule: Check if file should be ignored
      if (!ProjectExplorationRules.shouldIgnoreFile(rawFile.path)) {
        try {
          const stats = await this.fileSystemRepository.getFileStats(rawFile.path);
          
          files.push({
            name: rawFile.name,
            path: rawFile.path,
            relativePath: rawFile.relativePath,
            extension: rawFile.extension,
            size: stats.size,
            lastModified: stats.lastModified,
            type: fileType
          });
        } catch (error) {
          // Skip files that can't be accessed
          logger.debug(`Skipping inaccessible file: ${rawFile.path}`);
        }
      }
    }

    // Transform directories (business logic can be added here if needed)
    for (const rawDir of rawData.directories) {
      directories.push({
        name: rawDir.name,
        path: rawDir.path,
        relativePath: rawDir.relativePath,
        fileCount: 0, // Will be calculated in statistics
        subdirectoryCount: 0 // Will be calculated in statistics
      });
    }

    // Calculate statistics using business rules
    const statistics = this.calculateProjectStatistics(files, directories);

    return { files, directories, statistics };
  }

  /**
   * Calculate project statistics using business rules
   */
  private calculateProjectStatistics(files: FileInfo[], directories: DirectoryInfo[]): ProjectStatistics {
    const fileTypeDistribution: Record<string, number> = {};
    const sizeDistribution = { small: 0, medium: 0, large: 0 };
    let oldest = new Date();
    let newest = new Date(0);

    for (const file of files) {
      // File type distribution
      fileTypeDistribution[file.type] = (fileTypeDistribution[file.type] || 0) + 1;
      
      // Size distribution using business rules
      const sizeCategory = ProjectExplorationRules.categorizeSizeByBytes(file.size);
      sizeDistribution[sizeCategory]++;
      
      // Date range
      if (file.lastModified < oldest) oldest = file.lastModified;
      if (file.lastModified > newest) newest = file.lastModified;
    }

    return {
      totalFiles: files.length,
      totalDirectories: directories.length,
      fileTypeDistribution,
      sizeDistribution,
      lastModifiedRange: { oldest, newest }
    };
  }
}