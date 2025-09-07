/**
 * File discovery and filtering service
 * Handles file system scanning, filtering, and pattern matching
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import type { IFileTracker, IIgnoreManager } from '../../domain/interfaces/index.js';
import { FileSystemExplorer } from '../../infrastructure/filesystem/explorer.js';

import type { FileStatus } from '../../shared/types/index.js';
import type { 
  DocumentFile, 
  DOC_PATTERNS,
  SyncWorkflowOptions 
} from './WorkflowTypes.js';

export class FileDiscoveryService {
  private projectPath: string;
  private fileTracker: IFileTracker;
  private ignoreManager: IIgnoreManager;
  private fileExplorer: FileSystemExplorer;

  constructor(
    projectPath: string, 
    fileTracker: IFileTracker, 
    ignoreManager: IIgnoreManager
  ) {
    this.projectPath = projectPath;
    this.fileTracker = fileTracker;
    this.ignoreManager = ignoreManager;
    this.fileExplorer = new FileSystemExplorer(projectPath);
  }

  /**
   * Discover all source files in the project
   */
  async discoverSourceFiles(): Promise<{
    allFiles: FileStatus[];
    filteredFiles: string[];
    stats: {
      total: number;
      filtered: number;
      ignored: number;
    };
  }> {
    console.log('📁 Discovering source files...');
    
    // Step 1: Scan filesystem for source files
    const sourceFiles = await this.fileExplorer.getSourceFiles([
      'src/**/*.{ts,js,tsx,jsx}',
      '**/*.{ts,js,tsx,jsx}' // Include root level files too
    ]);
    console.log(`Found ${sourceFiles.length} source files in filesystem`);

    // Step 2: Update FileTracker with discovered files
    const allFiles: FileStatus[] = [];
    
    for (const filePath of sourceFiles) {
      try {
        // Get or create file status in tracker
        let fileStatus = await this.fileTracker.getFileStatus(filePath);
        
        if (!fileStatus) {
          // File not in tracker yet, create new status
          const stats = await fs.stat(filePath);
          const relativePath = path.relative(this.projectPath, filePath);
          
          const newFileStatus: FileStatus = {
            filePath,
            relativePath,
            size: stats.size,
            lastModified: stats.mtime,
            syncStatus: 'new'
          };
          
          // Add to tracker
          await this.fileTracker.updateFileStatus(relativePath, newFileStatus);
          fileStatus = newFileStatus;
        }
        
        allFiles.push(fileStatus);
      } catch (error) {
        console.warn(`Failed to process file ${filePath}: ${error}`);
      }
    }

    console.log(`Processed ${allFiles.length} files in tracker`);

    // Step 3: Filter files based on ignore patterns
    const filteredFiles = await this.filterFiles(allFiles.map(f => f.filePath));
    console.log(`${filteredFiles.length} files after filtering`);

    return {
      allFiles,
      filteredFiles,
      stats: {
        total: allFiles.length,
        filtered: filteredFiles.length,
        ignored: allFiles.length - filteredFiles.length
      }
    };
  }

  /**
   * Identify files that need synchronization
   */
  async identifyFilesNeedingSync(
    filteredFiles: string[], 
    options: SyncWorkflowOptions
  ): Promise<FileStatus[]> {
    console.log('🔍 Identifying files needing sync...');
    
    let needsSyncFiles: FileStatus[];
    
    if (options.force) {
      // Force sync all filtered files
      needsSyncFiles = [];
      for (const filePath of filteredFiles) {
        const fileStatus = await this.fileTracker.getFileStatus(filePath);
        if (fileStatus) {
          needsSyncFiles.push(fileStatus);
        } else {
          // Create minimal FileStatus for new files
          const stats = await fs.stat(filePath);
          needsSyncFiles.push({
            filePath: filePath,
            relativePath: path.relative(this.projectPath, filePath),
            size: stats.size,
            lastModified: stats.mtime,
            syncStatus: 'new'
          });
        }
      }
    } else {
      // Only sync files that actually need it
      needsSyncFiles = (await this.fileTracker.getFilesNeedingSync()).filter(f => 
        filteredFiles.some(ff => ff.includes(f.relativePath))
      );
    }

    console.log(`${needsSyncFiles.length} files need synchronization`);
    return needsSyncFiles;
  }

  /**
   * Find documentation files in the project
   */
  async findDocumentationFiles(): Promise<DocumentFile[]> {
    const files: DocumentFile[] = [];
    
    for (const pattern of DOC_PATTERNS) {
      try {
        const matches = await glob(pattern, { 
          cwd: this.projectPath,
          ignore: ['node_modules/**', '.git/**'] 
        });
        
        for (const match of matches) {
          const fullPath = path.join(this.projectPath, match);
          const name = path.basename(match);
          const relativePath = path.relative(this.projectPath, fullPath);
          
          // Avoid duplicates
          if (!files.some(f => f.path === fullPath)) {
            files.push({ 
              name, 
              path: fullPath,
              relativePath 
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to search pattern ${pattern}:`, error);
      }
    }

    return files;
  }

  /**
   * Filter files based on ignore patterns
   */
  async filterFiles(files: string[]): Promise<string[]> {
    const filteredFiles: string[] = [];
    
    for (const filePath of files) {
      const shouldIgnore = await this.ignoreManager.shouldIgnore(filePath);
      if (!shouldIgnore) {
        filteredFiles.push(filePath);
      }
    }
    
    return filteredFiles;
  }

  /**
   * Check if files exist and are accessible
   */
  async validateFiles(filePaths: string[]): Promise<{
    valid: string[];
    invalid: Array<{ path: string; error: string }>;
  }> {
    const valid: string[] = [];
    const invalid: Array<{ path: string; error: string }> = [];

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          valid.push(filePath);
        } else {
          invalid.push({ path: filePath, error: 'Not a file' });
        }
      } catch (error) {
        invalid.push({ 
          path: filePath, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Get file content safely
   */
  async getFileContent(filePath: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch read multiple files
   */
  async batchReadFiles(filePaths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        const result = await this.getFileContent(filePath);
        if (result.success && result.content) {
          results.set(filePath, result.content);
        }
      })
    );
    
    return results;
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePaths: string[]): Promise<{
    totalSize: number;
    averageSize: number;
    largestFile: { path: string; size: number } | null;
    fileTypes: Map<string, number>;
  }> {
    let totalSize = 0;
    let largestFile: { path: string; size: number } | null = null;
    const fileTypes = new Map<string, number>();

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const size = stats.size;
        const ext = path.extname(filePath);
        
        totalSize += size;
        
        if (!largestFile || size > largestFile.size) {
          largestFile = { path: filePath, size };
        }
        
        fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
      } catch (error) {
        // Skip files with errors
      }
    }

    return {
      totalSize,
      averageSize: filePaths.length > 0 ? totalSize / filePaths.length : 0,
      largestFile,
      fileTypes
    };
  }

  /**
   * Search for files by pattern
   */
  async searchFiles(patterns: string[], options: {
    ignoreCase?: boolean;
    includeHidden?: boolean;
  } = {}): Promise<string[]> {
    const allMatches: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.projectPath,
          ignore: options.includeHidden ? ['node_modules/**'] : ['node_modules/**', '.*/**'],
          nocase: options.ignoreCase
        });
        
        allMatches.push(...matches.map(match => path.join(this.projectPath, match)));
      } catch (error) {
        console.warn(`Failed to search pattern ${pattern}:`, error);
      }
    }
    
    // Remove duplicates and return
    return [...new Set(allMatches)];
  }
}