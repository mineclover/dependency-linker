/**
 * Ignore Manager - Clean Architecture Implementation
 * Manages file ignore patterns (gitignore, deplinkignore, etc.)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';

export interface IgnorePattern {
  pattern: string;
  isNegation: boolean;
  source: string; // 'gitignore', 'deplinkignore', 'builtin'
}

export class IgnoreManager {
  private patterns: IgnorePattern[] = [];
  private initialized = false;

  constructor(private projectPath: string) {}

  /**
   * Initialize ignore manager by loading all ignore files
   */
  async initialize(): Promise<void> {
    this.patterns = [];

    // Add built-in patterns
    this.addBuiltinPatterns();

    // Load .gitignore
    await this.loadIgnoreFile('.gitignore', 'gitignore');

    // Load .deplinkignore
    await this.loadIgnoreFile('.deplinkignore', 'deplinkignore');

    this.initialized = true;
  }

  /**
   * Check if a file should be ignored
   */
  async shouldIgnore(filePath: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const relativePath = path.relative(this.projectPath, filePath);
    
    // Don't ignore if it's outside project
    if (relativePath.startsWith('..')) {
      return false;
    }

    let ignored = false;

    // Apply patterns in order
    for (const pattern of this.patterns) {
      const matches = this.matchesPattern(relativePath, pattern.pattern);
      
      if (matches) {
        if (pattern.isNegation) {
          ignored = false; // Un-ignore
        } else {
          ignored = true; // Ignore
        }
      }
    }

    return ignored;
  }

  /**
   * Add custom ignore pattern
   */
  addPattern(pattern: string, source: string = 'custom'): void {
    const isNegation = pattern.startsWith('!');
    const cleanPattern = isNegation ? pattern.slice(1) : pattern;

    this.patterns.push({
      pattern: cleanPattern,
      isNegation,
      source
    });
  }

  /**
   * Get all current patterns
   */
  getPatterns(): IgnorePattern[] {
    return [...this.patterns];
  }

  /**
   * Check if path matches pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Normalize paths
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Simple exact match
    if (normalizedPath === normalizedPattern) {
      return true;
    }

    // Directory match (pattern ending with /)
    if (normalizedPattern.endsWith('/')) {
      const dirPattern = normalizedPattern.slice(0, -1);
      return normalizedPath.startsWith(dirPattern + '/') || normalizedPath === dirPattern;
    }

    // Use minimatch for glob patterns
    return minimatch(normalizedPath, normalizedPattern, {
      dot: true, // Match dotfiles
      matchBase: false, // Don't match just basename
      flipNegate: false // Don't flip negation
    });
  }

  /**
   * Load ignore file and parse patterns
   */
  private async loadIgnoreFile(filename: string, source: string): Promise<void> {
    const ignoreFilePath = path.join(this.projectPath, filename);

    try {
      const content = await fs.readFile(ignoreFilePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const isNegation = trimmed.startsWith('!');
        const pattern = isNegation ? trimmed.slice(1) : trimmed;

        this.patterns.push({
          pattern,
          isNegation,
          source
        });
      }
    } catch (error) {
      // File doesn't exist, that's okay
      if ((error as any).code !== 'ENOENT') {
        console.warn(`Warning: Could not read ${filename}: ${error}`);
      }
    }
  }

  /**
   * Add built-in ignore patterns
   */
  private addBuiltinPatterns(): void {
    const builtinPatterns = [
      // Version control
      '.git/**',
      '.svn/**',
      '.hg/**',
      
      // Node.js
      'node_modules/**',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      
      // Build outputs
      'dist/**',
      'build/**',
      'out/**',
      '*.tgz',
      
      // Logs
      'logs/**',
      '*.log',
      
      // Environment files
      '.env',
      '.env.*',
      
      // IDE files
      '.vscode/**',
      '.idea/**',
      '*.swp',
      '*.swo',
      '*~',
      
      // OS files
      '.DS_Store',
      'Thumbs.db',
      
      // Dependency Linker specific
      '.deplink/**',
      '*.db',
      '*.db-shm',
      '*.db-wal',
      'legacy/**',
      
      // Temporary files
      '*.tmp',
      '*.temp',
      '*.cache',
      
      // Test coverage
      'coverage/**',
      '*.lcov'
    ];

    for (const pattern of builtinPatterns) {
      this.patterns.push({
        pattern,
        isNegation: false,
        source: 'builtin'
      });
    }
  }
}