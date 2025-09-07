/**
 * Project Root Detection Utility - Clean Architecture Shared Layer
 * Detects project roots based on package.json, .git, and other indicators
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from './index.js';

export interface ProjectInfo {
  name?: string;
  version?: string;
  type: 'npm' | 'bun' | 'yarn' | 'pnpm' | 'git' | 'deplink' | 'unknown';
  hasPackageJson: boolean;
  hasGit: boolean;
  hasDeplink: boolean;
  lockFiles: string[];
}

export interface ProjectDetectionResult {
  projectRoot: string | null;
  projectInfo: ProjectInfo | null;
  recommendations: string[];
}

export class ProjectDetector {
  private static readonly ROOT_INDICATORS = [
    'package.json',
    'package-lock.json', 
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'deplink.config.json',
    '.deplink-config.json',
    'tsconfig.json',
    'jsconfig.json'
  ];

  private static readonly ROOT_DIRS = [
    '.git',
    '.hg',
    '.svn',
    'node_modules'
  ];

  /**
   * Detect project root starting from given directory
   * Looks for package.json, .git, or deplink config files
   */
  static async detectProjectRoot(startPath: string = process.cwd()): Promise<string | null> {
    let currentPath = path.resolve(startPath);
    const rootPath = path.parse(currentPath).root;

    while (currentPath !== rootPath) {
      // Check for file indicators
      for (const indicator of this.ROOT_INDICATORS) {
        const indicatorPath = path.join(currentPath, indicator);
        if (existsSync(indicatorPath)) {
          logger.info(`Project root detected via ${indicator}: ${currentPath}`, '📍');
          return currentPath;
        }
      }

      // Check for directory indicators
      for (const dir of this.ROOT_DIRS) {
        const dirPath = path.join(currentPath, dir);
        if (existsSync(dirPath)) {
          logger.info(`Project root detected via ${dir}/: ${currentPath}`, '📍');
          return currentPath;
        }
      }

      // Move up one directory
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        break; // Reached filesystem root
      }
      currentPath = parentPath;
    }

    logger.warning(`Could not detect project root from: ${startPath}`);
    return null;
  }

  /**
   * Get project information from detected root
   */
  static async getProjectInfo(projectRoot: string): Promise<ProjectInfo> {
    const info: ProjectInfo = {
      hasPackageJson: false,
      hasGit: false,
      hasDeplink: false,
      lockFiles: [],
      type: 'unknown'
    };

    // Check package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      info.hasPackageJson = true;
      try {
        const content = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        info.name = packageJson.name;
        info.version = packageJson.version;
      } catch (error) {
        logger.warning(`Failed to parse package.json: ${error}`);
      }
    }

    // Check Git
    if (existsSync(path.join(projectRoot, '.git'))) {
      info.hasGit = true;
    }

    // Check Deplink config
    const deplinkConfigs = ['deplink.config.json', '.deplink-config.json'];
    for (const config of deplinkConfigs) {
      if (existsSync(path.join(projectRoot, config))) {
        info.hasDeplink = true;
        break;
      }
    }

    // Check lock files and determine type
    const lockFileChecks = [
      { file: 'bun.lockb', type: 'bun' as const },
      { file: 'pnpm-lock.yaml', type: 'pnpm' as const },
      { file: 'yarn.lock', type: 'yarn' as const },
      { file: 'package-lock.json', type: 'npm' as const }
    ];

    for (const { file, type } of lockFileChecks) {
      if (existsSync(path.join(projectRoot, file))) {
        info.lockFiles.push(file);
        if (info.type === 'unknown') {
          info.type = type;
        }
      }
    }

    // Fallback type determination
    if (info.type === 'unknown') {
      if (info.hasDeplink) info.type = 'deplink';
      else if (info.hasGit) info.type = 'git';
      else if (info.hasPackageJson) info.type = 'npm';
    }

    return info;
  }

  /**
   * Auto-detect and validate project setup
   */
  static async autoDetectProject(startPath?: string): Promise<ProjectDetectionResult> {
    const projectRoot = await this.detectProjectRoot(startPath);
    const recommendations: string[] = [];
    
    if (!projectRoot) {
      recommendations.push(
        'Run `deplink init` to initialize a new project',
        'Or navigate to an existing project directory'
      );
      return { projectRoot: null, projectInfo: null, recommendations };
    }

    const projectInfo = await this.getProjectInfo(projectRoot);

    // Generate recommendations
    if (!projectInfo.hasDeplink) {
      recommendations.push('Run `deplink init` to setup dependency tracking');
    }
    
    if (!projectInfo.hasPackageJson) {
      recommendations.push('Initialize npm with `npm init` for better project management');
    }
    
    if (!projectInfo.hasGit) {
      recommendations.push('Initialize Git with `git init` for version control integration');
    }
    
    if (projectInfo.lockFiles.length === 0 && projectInfo.hasPackageJson) {
      recommendations.push('Install dependencies to generate lock file');
    }
    
    if (projectInfo.lockFiles.length > 1) {
      recommendations.push(`Multiple lock files detected: ${projectInfo.lockFiles.join(', ')}. Consider using one package manager.`);
    }

    return { projectRoot, projectInfo, recommendations };
  }

  /**
   * Validate if directory is a valid project root
   */
  static async isProjectRoot(directoryPath: string): Promise<boolean> {
    for (const indicator of [...this.ROOT_INDICATORS, ...this.ROOT_DIRS]) {
      const indicatorPath = path.join(directoryPath, indicator);
      if (existsSync(indicatorPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find all potential project roots in given directory
   */
  static async findProjectRoots(searchPath: string, maxDepth: number = 2): Promise<string[]> {
    const roots: string[] = [];
    
    const search = async (currentPath: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return;
      
      if (await this.isProjectRoot(currentPath)) {
        roots.push(currentPath);
        return; // Don't search subdirectories of project roots
      }
      
      try {
        const { readdir } = await import('fs/promises');
        const entries = await readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await search(path.join(currentPath, entry.name), depth + 1);
          }
        }
      } catch (error) {
        // Ignore permission errors or other filesystem issues
      }
    };
    
    await search(searchPath, 0);
    return roots;
  }
}