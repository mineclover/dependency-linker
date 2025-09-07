/**
 * Language Configuration Manager
 * Single Responsibility: Managing language-specific parser configurations
 */

export interface LanguageConfig {
  name: string;
  extensions: string[];
  parserAvailable: boolean;
  dependencyPatterns: DependencyPattern[];
  commentPatterns: CommentPattern[];
  exportPatterns: ExportPattern[];
  specialFeatures: LanguageFeature[];
}

export interface DependencyPattern {
  type: 'import' | 'require' | 'include' | 'use' | 'package';
  pattern: RegExp;
  extractSource: (match: RegExpMatchArray) => string;
  isLocal: (source: string) => boolean;
  resolver?: (source: string, currentFile: string) => string | null;
}

export interface CommentPattern {
  type: 'line' | 'block';
  pattern: RegExp;
  extractContent: (match: RegExpMatchArray) => string;
}

export interface ExportPattern {
  type: 'default' | 'named' | 'namespace';
  pattern: RegExp;
  extractName: (match: RegExpMatchArray) => string;
}

export interface LanguageFeature {
  name: string;
  enabled: boolean;
  config?: any;
}

/**
 * Language Configuration Manager
 * Manages language-specific parser configurations
 */
export class LanguageConfigManager {
  private languageConfigs: Map<string, LanguageConfig> = new Map();

  constructor() {
    this.initializeLanguageConfigs();
  }

  /**
   * Get configuration for a specific language
   */
  getLanguageConfig(language: string): LanguageConfig | undefined {
    return this.languageConfigs.get(language);
  }

  /**
   * Get configuration by file extension
   */
  getConfigByExtension(extension: string): LanguageConfig | undefined {
    for (const config of this.languageConfigs.values()) {
      if (config.extensions.includes(extension)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.languageConfigs.has(language);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.languageConfigs.keys());
  }

  /**
   * Add or update language configuration
   */
  setLanguageConfig(language: string, config: LanguageConfig): void {
    this.languageConfigs.set(language, config);
  }

  /**
   * Initialize language configurations
   */
  private initializeLanguageConfigs(): void {
    // TypeScript/JavaScript
    this.languageConfigs.set('typescript', {
      name: 'TypeScript',
      extensions: ['.ts', '.tsx'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
          resolver: (source, currentFile) => {
            if (source.startsWith('.')) {
              const path = require('path');
              return path.resolve(path.dirname(currentFile), source);
            }
            return null;
          }
        },
        {
          type: 'require',
          pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.*)$/gm,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([\s\S]*?)\*\//g,
          extractContent: (match) => match[1].trim()
        }
      ],
      exportPatterns: [
        {
          type: 'default',
          pattern: /export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /export\s+(?:class|function|const|let|var)\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'typescript', enabled: true },
        { name: 'jsx', enabled: true }
      ]
    });

    // JavaScript
    this.languageConfigs.set('javascript', {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.mjs'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
        },
        {
          type: 'require',
          pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.*)$/gm,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([\s\S]*?)\*\//g,
          extractContent: (match) => match[1].trim()
        }
      ],
      exportPatterns: [
        {
          type: 'default',
          pattern: /export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /export\s+(?:class|function|const|let|var)\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'es6', enabled: true },
        { name: 'jsx', enabled: true }
      ]
    });

    // Python
    this.languageConfigs.set('python', {
      name: 'Python',
      extensions: ['.py'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /^import\s+([^\s,]+)/gm,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.'),
        },
        {
          type: 'import',
          pattern: /^from\s+([^\s]+)\s+import/gm,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.'),
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /#(.*)$/gm,
          extractContent: (match) => match[1].trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /^def\s+(\w+)/gm,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /^class\s+(\w+)/gm,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'python3', enabled: true }
      ]
    });
  }
}