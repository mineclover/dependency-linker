/**
 * Factory Functions for TypeScript File Analyzer
 * Simple function-based API for easy adoption
 */

import { TypeScriptAnalyzer } from './TypeScriptAnalyzer';
import { 
  AnalysisOptions, 
  BatchAnalysisOptions,
  DirectoryOptions
} from './types';
import { AnalysisResult } from '../models/AnalysisResult';
import { FileNotFoundError } from './errors';
import * as fs from 'fs';
import * as path from 'path';

// Singleton analyzer instance for factory functions
let sharedAnalyzer: TypeScriptAnalyzer | null = null;

/**
 * Get or create shared analyzer instance
 */
function getAnalyzer(): TypeScriptAnalyzer {
  if (!sharedAnalyzer) {
    sharedAnalyzer = new TypeScriptAnalyzer({
      enableCache: true,
      cacheSize: 1000,
      defaultTimeout: 30000
    });
  }
  return sharedAnalyzer;
}

/**
 * Analyze a single TypeScript file
 * Simple function interface for file analysis
 * 
 * @param filePath Path to the TypeScript file
 * @param options Optional analysis options
 * @returns Promise resolving to analysis result
 * 
 * @example
 * ```typescript
 * const result = await analyzeTypeScriptFile('./src/index.ts');
 * console.log(result.dependencies);
 * ```
 */
export async function analyzeTypeScriptFile(
  filePath: string, 
  options?: AnalysisOptions
): Promise<AnalysisResult> {
  const analyzer = getAnalyzer();
  return analyzer.analyzeFile(filePath, options);
}

/**
 * Extract only dependency names from a TypeScript file
 * Convenience function for quick dependency extraction
 * 
 * @param filePath Path to the TypeScript file
 * @returns Promise resolving to array of dependency names
 * 
 * @example
 * ```typescript
 * const deps = await extractDependencies('./src/index.ts');
 * console.log(deps); // ['react', 'lodash', './utils']
 * ```
 */
export async function extractDependencies(filePath: string): Promise<string[]> {
  const analyzer = getAnalyzer();
  return analyzer.extractDependencies(filePath);
}

/**
 * Analyze multiple TypeScript files in batch
 * Efficiently processes multiple files with concurrency control
 * 
 * @param filePaths Array of file paths to analyze
 * @param options Optional batch analysis options
 * @returns Promise resolving to array of analysis results
 * 
 * @example
 * ```typescript
 * const results = await getBatchAnalysis([
 *   './src/index.ts',
 *   './src/utils.ts'
 * ], { concurrency: 3 });
 * 
 * results.forEach(result => {
 *   if (result.success) {
 *     console.log(`${result.filePath}: ${result.dependencies.length} dependencies`);
 *   }
 * });
 * ```
 */
export async function getBatchAnalysis(
  filePaths: string[], 
  options?: BatchAnalysisOptions
): Promise<AnalysisResult[]> {
  const analyzer = getAnalyzer();
  const batchResult = await analyzer.analyzeFiles(filePaths, options);
  return batchResult.results;
}

/**
 * Analyze all TypeScript files in a directory
 * Recursively scans directory and analyzes all TypeScript files
 * 
 * @param dirPath Directory path to scan
 * @param options Directory scanning and analysis options
 * @returns Promise resolving to array of analysis results
 * 
 * @example
 * ```typescript
 * const results = await analyzeDirectory('./src', {
 *   extensions: ['.ts', '.tsx'],
 *   maxDepth: 3,
 *   ignorePatterns: ['**\/node_modules/**', '**\/*.test.ts']
 * });
 * 
 * console.log(`Analyzed ${results.length} files`);
 * ```
 */
export async function analyzeDirectory(
  dirPath: string,
  options?: DirectoryOptions
): Promise<AnalysisResult[]> {
  const analyzer = getAnalyzer();
  
  // Collect all TypeScript files in directory
  const filePaths = await collectTypeScriptFiles(dirPath, options);
  
  if (filePaths.length === 0) {
    return [];
  }
  
  // Convert directory options to batch options
  const batchOptions: BatchAnalysisOptions = {
    concurrency: 5,
    continueOnError: true
  };
  
  const batchResult = await analyzer.analyzeFiles(filePaths, batchOptions);
  return batchResult.results;
}

/**
 * Collect TypeScript files from directory based on options
 */
async function collectTypeScriptFiles(
  dirPath: string, 
  options?: DirectoryOptions
): Promise<string[]> {
  const {
    extensions = ['.ts', '.tsx', '.d.ts'],
    maxDepth = 10,
    followSymlinks = false,
    ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/coverage/**']
  } = options || {};
  
  const files: string[] = [];
  
  try {
    await collectFilesRecursive(
      dirPath,
      files,
      extensions,
      maxDepth,
      0,
      followSymlinks,
      ignorePatterns
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new FileNotFoundError(dirPath, error);
    }
    throw error;
  }
  
  return files.sort();
}

/**
 * Recursively collect files matching criteria
 */
async function collectFilesRecursive(
  dirPath: string,
  files: string[],
  extensions: string[],
  maxDepth: number,
  currentDepth: number,
  followSymlinks: boolean,
  ignorePatterns: string[]
): Promise<void> {
  if (currentDepth >= maxDepth) {
    return;
  }
  
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    // Skip directories that can't be read
    return;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);
    
    // Check ignore patterns
    if (shouldIgnore(relativePath, ignorePatterns)) {
      continue;
    }
    
    if (entry.isFile()) {
      // Check if file has supported extension
      if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    } else if (entry.isDirectory() || (followSymlinks && entry.isSymbolicLink())) {
      // Recurse into subdirectory
      await collectFilesRecursive(
        fullPath,
        files,
        extensions,
        maxDepth,
        currentDepth + 1,
        followSymlinks,
        ignorePatterns
      );
    }
  }
}

/**
 * Check if path should be ignored based on patterns
 */
function shouldIgnore(filePath: string, ignorePatterns: string[]): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return ignorePatterns.some(pattern => {
    // Simple glob pattern matching
    if (pattern.includes('**')) {
      const regex = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      return new RegExp(`^${regex}$`).test(normalizedPath);
    } else if (pattern.includes('*')) {
      const regex = pattern.replace(/\*/g, '[^/]*');
      return new RegExp(`^${regex}$`).test(normalizedPath);
    } else {
      return normalizedPath.includes(pattern);
    }
  });
}

/**
 * Clear the shared analyzer cache
 * Useful for testing or when memory usage needs to be controlled
 */
export function clearFactoryCache(): void {
  if (sharedAnalyzer) {
    sharedAnalyzer.clearCache();
  }
}

/**
 * Reset the shared analyzer instance
 * Creates a new analyzer instance with default settings
 */
export function resetFactoryAnalyzer(): void {
  sharedAnalyzer = null;
}

/**
 * Get the current shared analyzer instance
 * Mainly for testing and debugging purposes
 */
export function getFactoryAnalyzer(): TypeScriptAnalyzer {
  return getAnalyzer();
}