/**
 * Explore Service - Application Service Layer (Clean Architecture)
 * Orchestrates domain services and infrastructure repositories
 * Refactored to remove direct infrastructure dependencies
 */

import { ProjectExplorationService } from '../domain/services/ProjectExplorationService.js';
import type { IFileSystemRepository } from '../domain/interfaces/IFileSystemRepository.js';
import type { IDependencyRepository } from '../domain/interfaces/IDependencyRepository.js';
import type { CommandResult } from '../shared/types/index.js';
import { logger } from '../shared/utils/index.js';
import * as path from 'path';

// Re-export types from domain layer
export type {
  ExploreProjectOptions,
  ExploreDependenciesOptions,
  ExplorePathOptions
} from '../domain/services/ProjectExplorationService.js';

export interface ExploreDocsOptions {
  docsPath?: string;
  linkToCode?: boolean;
  checkSyncStatus?: boolean;
}

/**
 * Explore Service - Clean Architecture Application Service
 * Coordinates domain services with infrastructure repositories
 */
export class ExploreService {
  private projectExplorationService: ProjectExplorationService;
  private projectPath: string;

  constructor(
    projectPath: string = process.cwd(),
    fileSystemRepository?: IFileSystemRepository,
    dependencyRepository?: IDependencyRepository
  ) {
    this.projectPath = path.resolve(projectPath);
    
    // Use injected repositories or create default ones
    if (fileSystemRepository && dependencyRepository) {
      this.projectExplorationService = new ProjectExplorationService(
        fileSystemRepository,
        dependencyRepository,
        this.projectPath
      );
    } else {
      // Fallback to direct instantiation (for backward compatibility)
      const { FileSystemRepository } = require('../infrastructure/repositories/FileSystemRepository.js');
      const { DependencyRepository } = require('../infrastructure/repositories/DependencyRepository.js');
      
      const fsRepo = new FileSystemRepository(this.projectPath);
      const depRepo = new DependencyRepository(this.projectPath);
      
      this.projectExplorationService = new ProjectExplorationService(
        fsRepo,
        depRepo,
        this.projectPath
      );
    }
  }

  /**
   * Project structure exploration (delegated to domain service)
   */
  async exploreProject(options: ExploreProjectOptions = {}): Promise<CommandResult> {
    const result = await this.projectExplorationService.exploreProject(options);
    
    return {
      success: result.success,
      message: result.message,
      data: result.data
    };
  }

  /**
   * Dependency exploration (delegated to domain service)
   */
  async exploreDependencies(options: ExploreDependenciesOptions): Promise<CommandResult> {
    const result = await this.projectExplorationService.exploreDependencies(options);
    
    return {
      success: result.success,
      message: result.message,
      data: result.data
    };
  }

  /**
   * Documentation exploration (legacy implementation - could be extracted to domain)
   */
  async exploreDocs(options: ExploreDocsOptions = {}): Promise<CommandResult> {
    try {
      logger.info('Starting documentation exploration', '📚');

      const docsPath = options.docsPath || path.join(this.projectPath, 'docs');
      
      // This is a simplified implementation - in a full refactor,
      // this would be extracted to a DocumentExplorationService
      const explorationResult = await this.projectExplorationService.exploreProject({
        pattern: '*.md',
        maxDepth: 10
      });

      if (!explorationResult.success) {
        return explorationResult;
      }

      const docFiles = explorationResult.data.structure?.files.filter(f => 
        f.type === 'documentation' && f.path.includes('docs')
      ) || [];

      return {
        success: true,
        message: `Documentation exploration completed: ${docFiles.length} documents`,
        data: {
          docs: docFiles,
          syncStatus: null, // Would be implemented with proper domain service
          codeLinks: null // Would be implemented with proper domain service
        }
      };

    } catch (error) {
      logger.error(`Documentation exploration failed: ${error}`);
      return {
        success: false,
        message: `Documentation exploration failed: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Path exploration (delegated to domain service)
   */
  async explorePath(options: ExplorePathOptions): Promise<CommandResult> {
    const result = await this.projectExplorationService.explorePath(options);
    
    return {
      success: result.success,
      message: result.message,
      data: result.data
    };
  }

  // Legacy helper method - would be moved to DocumentExplorationService in full refactor
  // Currently unused as exploreDocs uses simplified implementation

  /**
   * Project summary (uses domain service)
   */
  async getProjectSummary(): Promise<CommandResult> {
    try {
      logger.info('Generating project summary...', '📊');

      const [projectResult, dependencyResult] = await Promise.all([
        this.exploreProject({ showDependencies: true }),
        this.exploreDependencies({})
      ]);

      if (!projectResult.success) {
        return projectResult;
      }

      const summary = {
        project: {
          name: path.basename(this.projectPath),
          path: this.projectPath,
          fileCount: projectResult.data?.structure?.files?.length || 0,
          directoryCount: projectResult.data?.structure?.directories?.length || 0
        },
        dependencies: projectResult.data?.dependencies?.statistics,
        health: projectResult.data?.health,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        message: 'Project summary generated successfully',
        data: summary
      };

    } catch (error) {
      logger.error(`Project summary generation failed: ${error}`);
      return {
        success: false,
        message: `Project summary generation failed: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }
}