/**
 * Dependency Exploration Service - Application Layer
 * 의존성 탐색 및 관련 문서 수집 서비스
 */

import { readFileSync, statSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { logger } from '../../shared/utils/index.js';
import { analysisIndexManager } from '../analysis/analysisIndexManager.js';

export interface DependencyExplorationOptions {
  depth?: number; // 탐색 깊이 (기본: 2)
  includeReverse?: boolean; // 역방향 의존성 포함 (기본: true)
  fileTypes?: string[]; // 포함할 파일 타입들
  excludePatterns?: string[]; // 제외할 패턴들
}

export interface ExploredFile {
  id: number;
  path: string;
  relativePath: string;
  language: string;
  notionId?: string;
  dependencyType: 'direct' | 'indirect' | 'reverse';
  depth: number;
  size: number;
  lastModified: Date;
}

export interface DependencyGraph {
  rootFile: ExploredFile;
  dependencies: ExploredFile[];
  reverseDependencies: ExploredFile[];
  totalFiles: number;
  explorationDepth: number;
}

export class DependencyExplorationService {
  private indexManager = analysisIndexManager;

  /**
   * 특정 파일의 의존성 그래프 탐색
   */
  async exploreFileDependencies(
    filePath: string, 
    options: DependencyExplorationOptions = {}
  ): Promise<DependencyGraph> {
    const {
      depth = 2,
      includeReverse = true,
      fileTypes = [],
      excludePatterns = ['/node_modules/', '/.git/', '/dist/', '/build/']
    } = options;

    logger.info(`🔍 Exploring dependencies for: ${filePath}`);

    // 루트 파일 정보 가져오기
    const rootFile = await this.getFileInfo(filePath);
    if (!rootFile) {
      throw new Error(`File not found in index: ${filePath}`);
    }

    // 직접 의존성 탐색
    const dependencies = await this.exploreDependencies(
      rootFile.id, 
      depth, 
      fileTypes, 
      excludePatterns
    );

    // 역방향 의존성 탐색
    const reverseDependencies = includeReverse 
      ? await this.exploreReverseDependencies(
          rootFile.id, 
          depth, 
          fileTypes, 
          excludePatterns
        )
      : [];

    return {
      rootFile,
      dependencies,
      reverseDependencies,
      totalFiles: 1 + dependencies.length + reverseDependencies.length,
      explorationDepth: depth
    };
  }

  /**
   * 파일 정보 조회
   */
  private async getFileInfo(filePath: string): Promise<ExploredFile | null> {
    try {
      const fileInfo = this.indexManager.getFileByPath(filePath);
      if (!fileInfo) return null;

      const stats = this.getFileStats(filePath);
      
      return {
        id: fileInfo.id,
        path: fileInfo.path,
        relativePath: fileInfo.relative_path,
        language: fileInfo.language,
        notionId: fileInfo.notion_id || undefined,
        dependencyType: 'direct',
        depth: 0,
        size: stats.size,
        lastModified: new Date(stats.lastModified)
      };
    } catch (error) {
      logger.error(`Failed to get file info for ${filePath}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 직접 의존성 탐색 (재귀적)
   */
  private async exploreDependencies(
    fileId: number, 
    maxDepth: number, 
    fileTypes: string[], 
    excludePatterns: string[],
    visited: Set<number> = new Set(),
    currentDepth: number = 0
  ): Promise<ExploredFile[]> {
    if (currentDepth >= maxDepth || visited.has(fileId)) {
      return [];
    }

    visited.add(fileId);
    const dependencies: ExploredFile[] = [];

    try {
      // 직접 의존성 조회
      const directDeps = this.indexManager.getFileDependencies(fileId);
      
      for (const dep of directDeps) {
        // dep.source는 의존성 소스명이므로 실제 파일 경로로 변환 필요
        let targetPath = dep.source;
        
        // 상대 경로를 절대 경로로 변환 시도
        if (dep.resolved) {
          targetPath = dep.resolved;
        } else if (dep.is_local && (dep.source.startsWith('./') || dep.source.startsWith('../'))) {
          // 상대 경로 해결 로직 추가
          const currentFile = this.indexManager.getFile(fileId);
          if (currentFile) {
            const currentDir = dirname(currentFile.file_path);
            targetPath = resolve(currentDir, dep.source);
          }
        }
        
        if (this.shouldExcludeFile(targetPath, excludePatterns, fileTypes)) {
          continue;
        }

        let depFile = this.indexManager.getFileByPath(targetPath);
        
        // 파일을 찾지 못한 경우 다른 방법들을 시도
        if (!depFile && dep.is_local) {
          // .js 확장자를 .ts로 변경하여 시도
          if (targetPath.endsWith('.js')) {
            const tsPath = targetPath.replace(/\.js$/, '.ts');
            depFile = this.indexManager.getFileByPath(tsPath);
          }
          
          // 확장자가 없는 경우 .ts를 추가하여 시도
          if (!depFile && !targetPath.includes('.')) {
            depFile = this.indexManager.getFileByPath(targetPath + '.ts');
          }
          
          // index 파일로 시도
          if (!depFile && !basename(targetPath).includes('.')) {
            depFile = this.indexManager.getFileByPath(join(targetPath, 'index.ts'));
          }
        }
        
        if (!depFile) {
          if (dep.is_local) {
            logger.debug(`Could not find file for dependency: ${dep.source} -> ${targetPath}`);
          }
          continue;
        }

        const stats = this.getFileStats(targetPath);
        
        const exploredFile: ExploredFile = {
          id: depFile.id,
          path: depFile.path,
          relativePath: depFile.relative_path,
          language: depFile.language,
          notionId: depFile.notion_id || undefined,
          dependencyType: currentDepth === 0 ? 'direct' : 'indirect',
          depth: currentDepth + 1,
          size: stats.size,
          lastModified: new Date(stats.lastModified)
        };

        dependencies.push(exploredFile);

        // 재귀적으로 의존성 탐색
        const nestedDeps = await this.exploreDependencies(
          depFile.id, 
          maxDepth, 
          fileTypes, 
          excludePatterns, 
          visited, 
          currentDepth + 1
        );
        dependencies.push(...nestedDeps);
      }
    } catch (error) {
      logger.error(`Failed to explore dependencies for file ID ${fileId}: ` + (error instanceof Error ? error.message : String(error)));
      // 에러 발생 시 빈 배열 반환하여 탐색 계속 진행
    }

    return dependencies;
  }

  /**
   * 역방향 의존성 탐색
   */
  private async exploreReverseDependencies(
    fileId: number, 
    maxDepth: number, 
    fileTypes: string[], 
    excludePatterns: string[],
    visited: Set<number> = new Set(),
    currentDepth: number = 0
  ): Promise<ExploredFile[]> {
    if (currentDepth >= maxDepth || visited.has(fileId)) {
      return [];
    }

    visited.add(fileId);
    const reverseDependencies: ExploredFile[] = [];

    try {
      // 해당 파일을 의존하는 파일들 조회
      const reverseDeps = this.indexManager.getFileReverseDependencies(fileId);
      
      for (const dep of reverseDeps) {
        const sourcePath = dep.source_path;
        
        if (this.shouldExcludeFile(sourcePath, excludePatterns, fileTypes)) {
          continue;
        }

        const depFile = this.indexManager.getFileByPath(sourcePath);
        if (!depFile) {
          logger.debug(`Could not find file for reverse dependency: ${sourcePath}`);
          continue;
        }

        const stats = this.getFileStats(sourcePath);
        
        const exploredFile: ExploredFile = {
          id: depFile.id,
          path: depFile.path,
          relativePath: depFile.relative_path,
          language: depFile.language,
          notionId: depFile.notion_id || undefined,
          dependencyType: 'reverse',
          depth: currentDepth + 1,
          size: stats.size,
          lastModified: new Date(stats.lastModified)
        };

        reverseDependencies.push(exploredFile);

        // 재귀적으로 역방향 의존성 탐색
        const nestedDeps = await this.exploreReverseDependencies(
          depFile.id, 
          maxDepth, 
          fileTypes, 
          excludePatterns, 
          visited, 
          currentDepth + 1
        );
        reverseDependencies.push(...nestedDeps);
      }
    } catch (error) {
      logger.error(`Failed to explore reverse dependencies for file ID ${fileId}: ` + (error instanceof Error ? error.message : String(error)));
      // 에러 발생 시 빈 배열 반환하여 탐색 계속 진행
    }

    return reverseDependencies;
  }

  /**
   * 파일 제외 여부 확인
   */
  private shouldExcludeFile(
    filePath: string, 
    excludePatterns: string[], 
    fileTypes: string[]
  ): boolean {
    // 제외 패턴 확인
    for (const pattern of excludePatterns) {
      if (filePath.includes(pattern)) {
        return true;
      }
    }

    // 파일 타입 필터
    if (fileTypes.length > 0) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (!ext || !fileTypes.includes(ext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 파일 통계 정보 조회
   */
  private getFileStats(filePath: string): { size: number; lastModified: number } {
    try {
      const stats = statSync(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime.getTime()
      };
    } catch (error) {
      logger.debug(`Could not get file stats for ${filePath}:`, error);
      return { size: 0, lastModified: Date.now() };
    }
  }

  /**
   * 의존성 그래프 요약 정보
   */
  generateGraphSummary(graph: DependencyGraph): {
    summary: string;
    statistics: Record<string, number>;
    filesByType: Record<string, number>;
  } {
    const allFiles = [graph.rootFile, ...graph.dependencies, ...graph.reverseDependencies];
    
    // 언어별 파일 수 집계
    const filesByType = allFiles.reduce((acc, file) => {
      acc[file.language] = (acc[file.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 의존성 타입별 통계
    const statistics = {
      totalFiles: graph.totalFiles,
      directDependencies: graph.dependencies.filter(f => f.dependencyType === 'direct').length,
      indirectDependencies: graph.dependencies.filter(f => f.dependencyType === 'indirect').length,
      reverseDependencies: graph.reverseDependencies.length,
      explorationDepth: graph.explorationDepth,
      totalSize: allFiles.reduce((sum, f) => sum + f.size, 0)
    };

    const summary = `
🔍 Dependency Analysis Summary for: ${graph.rootFile.relativePath}

📊 Statistics:
- Total files explored: ${statistics.totalFiles}
- Direct dependencies: ${statistics.directDependencies}
- Indirect dependencies: ${statistics.indirectDependencies}
- Reverse dependencies: ${statistics.reverseDependencies}
- Exploration depth: ${statistics.explorationDepth}
- Total size: ${(statistics.totalSize / 1024).toFixed(2)} KB

📁 Files by language:
${Object.entries(filesByType).map(([lang, count]) => `- ${lang}: ${count} files`).join('\n')}
    `.trim();

    return { summary, statistics, filesByType };
  }
}

export const dependencyExplorationService = new DependencyExplorationService();