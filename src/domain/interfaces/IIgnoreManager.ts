/**
 * Ignore Manager Interface - Domain Layer
 * 파일 무시 패턴 관리를 위한 도메인 인터페이스
 */

export interface IgnorePattern {
  pattern: string;
  type: 'glob' | 'regex' | 'exact';
  description?: string;
}

export interface IIgnoreManager {
  /**
   * Check if a file should be ignored
   */
  shouldIgnore(filePath: string): Promise<boolean>;
  
  /**
   * Add ignore pattern
   */
  addIgnorePattern(pattern: IgnorePattern): Promise<void>;
  
  /**
   * Remove ignore pattern
   */
  removeIgnorePattern(pattern: string): Promise<void>;
  
  /**
   * Get all ignore patterns
   */
  getIgnorePatterns(): Promise<IgnorePattern[]>;
  
  /**
   * Load patterns from .gitignore and custom files
   */
  loadIgnoreFiles(filePaths: string[]): Promise<void>;
  
  /**
   * Test pattern against file path
   */
  testPattern(pattern: string, filePath: string): boolean;
}