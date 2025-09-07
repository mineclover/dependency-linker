/**
 * File System Repository Interface
 * Domain interface for file system operations
 */

export interface RawFileInfo {
  name: string;
  path: string;
  relativePath: string;
  extension: string;
}

export interface RawDirectoryInfo {
  name: string;
  path: string;
  relativePath: string;
}

export interface ExploreProjectOptions {
  pattern?: string;
  includeIgnored?: boolean;
  maxDepth?: number;
  showDependencies?: boolean;
}

export interface IFileSystemRepository {
  exploreProject(options: ExploreProjectOptions): Promise<{
    files: RawFileInfo[];
    directories: RawDirectoryInfo[];
  }>;
  readFileContent(filePath: string, maxLines?: number): Promise<string>;
  getFileStats(filePath: string): Promise<{ size: number; lastModified: Date }>;
}