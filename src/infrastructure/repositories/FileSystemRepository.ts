/**
 * File System Repository - Infrastructure Layer
 * Implements file system access for project exploration
 */

import { FileSystemExplorer } from '../filesystem/explorer.js';
import { FileStatusTracker } from '../filesystem/statusTracker.js';
import type { 
  IFileSystemRepository, 
  RawFileInfo, 
  RawDirectoryInfo, 
  ExploreProjectOptions 
} from '../../domain/interfaces/IFileSystemRepository.js';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * File System Repository
 * Handles all file system operations for project exploration
 */
export class FileSystemRepository implements IFileSystemRepository {
  private fileExplorer: FileSystemExplorer;
  private statusTracker: FileStatusTracker;

  constructor(private projectPath: string) {
    this.fileExplorer = new FileSystemExplorer(projectPath);
    this.statusTracker = new FileStatusTracker(projectPath);
  }

  /**
   * Explore project structure
   */
  async exploreProject(options: ExploreProjectOptions): Promise<{
    files: RawFileInfo[];
    directories: RawDirectoryInfo[];
  }> {
    await this.statusTracker.initialize();

    const exploreOptions = {
      pattern: options.pattern,
      includeIgnored: options.includeIgnored || false,
      maxDepth: options.maxDepth
    };

    const projectStructure = await this.fileExplorer.exploreProject(exploreOptions);
    
    // Transform to repository interface format
    const files: RawFileInfo[] = projectStructure.files.map(file => ({
      name: path.basename(file.path),
      path: file.path,
      relativePath: path.relative(this.projectPath, file.path),
      extension: path.extname(file.path)
    }));

    const directories: RawDirectoryInfo[] = projectStructure.directories?.map(dir => ({
      name: path.basename(dir),
      path: dir,
      relativePath: path.relative(this.projectPath, dir)
    })) || [];

    return { files, directories };
  }

  /**
   * Read file content with optional line limit
   */
  async readFileContent(filePath: string, maxLines?: number): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    if (maxLines) {
      const lines = content.split('\n');
      if (lines.length > maxLines) {
        return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} more lines)`;
      }
    }
    
    return content;
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<{ size: number; lastModified: Date }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      lastModified: stats.mtime
    };
  }
}