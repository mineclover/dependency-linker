/**
 * 다중 언어 지원 파서 통합 시스템
 * Multi-Language Parser Integration System
 */

import { TreeSitterDependencyAnalyzer, FileAnalysisResult } from './treeSitterDependencyAnalyzer';
import { DependencyExtractionEngine, ExtractionOptions, ExtractionStats } from './dependencyExtractionEngine';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';

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

export interface FallbackAnalysisResult {
  filePath: string;
  language: string;
  dependencies: Array<{
    source: string;
    type: string;
    line: number;
    isLocal: boolean;
  }>;
  exports: Array<{
    name: string;
    type: string;
    line: number;
  }>;
  functions: Array<{
    name: string;
    line: number;
  }>;
  comments: Array<{
    content: string;
    line: number;
    type: string;
  }>;
  todos: Array<{
    type: string;
    content: string;
    line: number;
  }>;
  notionId?: string;
  parseErrors: string[];
}

export class MultiLanguageParserIntegration {
  private treeSitterAnalyzer: TreeSitterDependencyAnalyzer;
  private extractionEngine: DependencyExtractionEngine;
  private languageConfigs: Map<string, LanguageConfig> = new Map();
  private fallbackParsers: Map<string, (filePath: string) => FallbackAnalysisResult> = new Map();

  constructor(extractionEngine: DependencyExtractionEngine) {
    this.treeSitterAnalyzer = new TreeSitterDependencyAnalyzer();
    this.extractionEngine = extractionEngine;
    this.initializeLanguageConfigs();
    this.initializeFallbackParsers();
  }

  /**
   * 언어별 설정 초기화
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
          resolver: this.resolveTypeScriptModule.bind(this)
        },
        {
          type: 'require',
          pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
          resolver: this.resolveTypeScriptModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'default',
          pattern: /export\s+default\s+(?:function\s+)?(\w+)/g,
          extractName: (match) => match[1] || 'default'
        },
        {
          type: 'named',
          pattern: /export\s+(?:function|class|const|let|var)\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'decorators', enabled: true },
        { name: 'generics', enabled: true },
        { name: 'interfaces', enabled: true }
      ]
    });

    this.languageConfigs.set('javascript', {
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.mjs', '.cjs'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
          resolver: this.resolveJavaScriptModule.bind(this)
        },
        {
          type: 'require',
          pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.') || source.startsWith('/'),
          resolver: this.resolveJavaScriptModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'default',
          pattern: /export\s+default\s+(?:function\s+)?(\w+)/g,
          extractName: (match) => match[1] || 'default'
        },
        {
          type: 'named',
          pattern: /export\s+(?:function|class|const|let|var)\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'jsx', enabled: true },
        { name: 'async_await', enabled: true }
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
          pattern: /^import\s+([^\s#]+)/gm,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.'),
          resolver: this.resolvePythonModule.bind(this)
        },
        {
          type: 'import',
          pattern: /^from\s+([^\s]+)\s+import/gm,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('.'),
          resolver: this.resolvePythonModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /#(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /"""([^"]|"(?!""))*"""/g,
          extractContent: (match) => match[0].replace(/^"""|"""$/g, '').trim()
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
        { name: 'decorators', enabled: true },
        { name: 'async_await', enabled: true }
      ]
    });

    // Go
    this.languageConfigs.set('go', {
      name: 'Go',
      extensions: ['.go'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /import\s+(?:\(\s*)?['"`]([^'"`]+)['"`]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('./') || source.startsWith('../'),
          resolver: this.resolveGoModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /func\s+([A-Z]\w*)/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /type\s+([A-Z]\w*)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'goroutines', enabled: true },
        { name: 'channels', enabled: true }
      ]
    });

    // Rust
    this.languageConfigs.set('rust', {
      name: 'Rust',
      extensions: ['.rs'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'use',
          pattern: /use\s+([^;]+);/g,
          extractSource: (match) => match[1],
          isLocal: (source) => source.startsWith('crate::') || source.startsWith('super::'),
          resolver: this.resolveRustModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /pub\s+fn\s+(\w+)/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /pub\s+struct\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'ownership', enabled: true },
        { name: 'lifetimes', enabled: true }
      ]
    });

    // Java
    this.languageConfigs.set('java', {
      name: 'Java',
      extensions: ['.java'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'import',
          pattern: /import\s+(?:static\s+)?([^;]+);/g,
          extractSource: (match) => match[1],
          isLocal: (source) => false, // Java는 패키지 기반
          resolver: this.resolveJavaModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /public\s+class\s+(\w+)/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /public\s+interface\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'annotations', enabled: true },
        { name: 'generics', enabled: true }
      ]
    });

    // C/C++
    this.languageConfigs.set('c', {
      name: 'C',
      extensions: ['.c', '.h'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'include',
          pattern: /#include\s+[<"]([^>"]+)[>"]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => !source.includes('/') || source.startsWith('./'),
          resolver: this.resolveCModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /(?:extern\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*{/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'preprocessor', enabled: true },
        { name: 'pointers', enabled: true }
      ]
    });

    this.languageConfigs.set('cpp', {
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx', '.hpp'],
      parserAvailable: true,
      dependencyPatterns: [
        {
          type: 'include',
          pattern: /#include\s+[<"]([^>"]+)[>"]/g,
          extractSource: (match) => match[1],
          isLocal: (source) => !source.includes('/') || source.startsWith('./'),
          resolver: this.resolveCppModule.bind(this)
        }
      ],
      commentPatterns: [
        {
          type: 'line',
          pattern: /\/\/(.+)/g,
          extractContent: (match) => match[1].trim()
        },
        {
          type: 'block',
          pattern: /\/\*([^*]|\*(?!\/))*\*\//g,
          extractContent: (match) => match[0].replace(/^\/\*|\*\/$/g, '').trim()
        }
      ],
      exportPatterns: [
        {
          type: 'named',
          pattern: /(?:extern\s+"C"\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*{/g,
          extractName: (match) => match[1]
        },
        {
          type: 'named',
          pattern: /class\s+(\w+)/g,
          extractName: (match) => match[1]
        }
      ],
      specialFeatures: [
        { name: 'templates', enabled: true },
        { name: 'namespaces', enabled: true }
      ]
    });
  }

  /**
   * 폴백 파서들 초기화
   */
  private initializeFallbackParsers(): void {
    // 지원되지 않는 언어들을 위한 간단한 정규식 기반 파서
    this.fallbackParsers.set('php', this.createPhpFallbackParser());
    this.fallbackParsers.set('ruby', this.createRubyFallbackParser());
    this.fallbackParsers.set('kotlin', this.createKotlinFallbackParser());
    this.fallbackParsers.set('swift', this.createSwiftFallbackParser());
    this.fallbackParsers.set('dart', this.createDartFallbackParser());
    this.fallbackParsers.set('scala', this.createScalaFallbackParser());
  }

  /**
   * 파일 분석 (Tree-sitter 또는 폴백 파서 사용)
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult | FallbackAnalysisResult> {
    const ext = extname(filePath).toLowerCase();
    const language = this.detectLanguage(ext);

    if (!language) {
      throw new Error(`Unsupported file extension: ${ext}`);
    }

    const config = this.languageConfigs.get(language);
    
    // Tree-sitter 파서가 사용 가능한 경우
    if (config && config.parserAvailable) {
      try {
        return await this.treeSitterAnalyzer.analyzeFile(filePath);
      } catch (error) {
        console.warn(`Tree-sitter analysis failed for ${filePath}, falling back to regex parser:`, error);
        return this.analyzeFallback(filePath, language);
      }
    }

    // 폴백 파서 사용
    const fallbackParser = this.fallbackParsers.get(language);
    if (fallbackParser) {
      return fallbackParser(filePath);
    }

    // 일반적인 폴백 분석
    return this.analyzeFallback(filePath, language);
  }

  /**
   * 언어 감지
   */
  private detectLanguage(ext: string): string | null {
    for (const [language, config] of this.languageConfigs) {
      if (config.extensions.includes(ext)) {
        return language;
      }
    }

    // 확장자 기반 추가 매핑
    const extensionMap: { [key: string]: string } = {
      '.php': 'php',
      '.rb': 'ruby',
      '.kt': 'kotlin',
      '.kts': 'kotlin',
      '.swift': 'swift',
      '.dart': 'dart',
      '.scala': 'scala',
      '.sc': 'scala'
    };

    return extensionMap[ext] || null;
  }

  /**
   * 폴백 분석 (정규식 기반)
   */
  private analyzeFallback(filePath: string, language: string): FallbackAnalysisResult {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const config = this.languageConfigs.get(language);

    const result: FallbackAnalysisResult = {
      filePath,
      language,
      dependencies: [],
      exports: [],
      functions: [],
      comments: [],
      todos: [],
      parseErrors: []
    };

    // Notion ID 추출
    result.notionId = this.extractNotionId(content);

    if (config) {
      // 종속성 추출
      for (const depPattern of config.dependencyPatterns) {
        let match;
        while ((match = depPattern.pattern.exec(content)) !== null) {
          const source = depPattern.extractSource(match);
          const lineNumber = this.getLineNumber(content, match.index!);
          
          result.dependencies.push({
            source,
            type: depPattern.type,
            line: lineNumber,
            isLocal: depPattern.isLocal(source)
          });
        }
      }

      // Export 추출
      for (const exportPattern of config.exportPatterns) {
        let match;
        while ((match = exportPattern.pattern.exec(content)) !== null) {
          const name = exportPattern.extractName(match);
          const lineNumber = this.getLineNumber(content, match.index!);
          
          result.exports.push({
            name,
            type: exportPattern.type,
            line: lineNumber
          });
        }
      }

      // 주석 추출
      for (const commentPattern of config.commentPatterns) {
        let match;
        while ((match = commentPattern.pattern.exec(content)) !== null) {
          const commentContent = commentPattern.extractContent(match);
          const lineNumber = this.getLineNumber(content, match.index!);
          
          result.comments.push({
            content: commentContent,
            line: lineNumber,
            type: commentPattern.type
          });

          // TODO/FIXME 검출
          const todoMatch = commentContent.match(/(TODO|FIXME|HACK|NOTE|XXX)\s*:?\s*(.+)/i);
          if (todoMatch) {
            result.todos.push({
              type: todoMatch[1].toUpperCase(),
              content: todoMatch[2] || '',
              line: lineNumber
            });
          }
        }
      }
    }

    // 간단한 함수 검출 (언어별 패턴)
    const functionPatterns = this.getFunctionPatterns(language);
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        const lineNumber = this.getLineNumber(content, match.index!);
        
        result.functions.push({
          name,
          line: lineNumber
        });
      }
    }

    return result;
  }

  /**
   * 언어별 함수 패턴
   */
  private getFunctionPatterns(language: string): RegExp[] {
    const patterns: { [key: string]: RegExp[] } = {
      php: [
        /function\s+(\w+)\s*\(/g,
        /(?:public|private|protected)\s+function\s+(\w+)\s*\(/g
      ],
      ruby: [
        /def\s+(\w+)/g,
        /(?:public|private|protected)\s+def\s+(\w+)/g
      ],
      kotlin: [
        /fun\s+(\w+)\s*\(/g,
        /(?:public|private|protected|internal)\s+fun\s+(\w+)\s*\(/g
      ],
      swift: [
        /func\s+(\w+)\s*\(/g,
        /(?:public|private|internal)\s+func\s+(\w+)\s*\(/g
      ],
      dart: [
        /(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/g,
        /(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*=>/g
      ],
      scala: [
        /def\s+(\w+)/g,
        /(?:public|private|protected)\s+def\s+(\w+)/g
      ]
    };

    return patterns[language] || [/(?:function|def|func)\s+(\w+)/g];
  }

  /**
   * 문자 인덱스에서 줄 번호 계산
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Notion ID 추출
   */
  private extractNotionId(content: string): string | undefined {
    const patterns = [
      /notion[-_]?id\s*[:=]\s*([a-f0-9-]{36})/i,
      /notion[-_]?page[-_]?id\s*[:=]\s*([a-f0-9-]{36})/i,
      /@notion\s+([a-f0-9-]{36})/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * 모듈 해결자들
   */
  private resolveTypeScriptModule(source: string, currentFile: string): string | null {
    if (!source.startsWith('.')) return null;

    const currentDir = dirname(currentFile);
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const candidates = [
      resolve(currentDir, source),
      ...extensions.map(ext => resolve(currentDir, source + ext)),
      resolve(currentDir, source, 'index.ts'),
      resolve(currentDir, source, 'index.js')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolveJavaScriptModule(source: string, currentFile: string): string | null {
    if (!source.startsWith('.')) return null;

    const currentDir = dirname(currentFile);
    const extensions = ['.js', '.jsx', '.mjs', '.cjs'];
    const candidates = [
      resolve(currentDir, source),
      ...extensions.map(ext => resolve(currentDir, source + ext)),
      resolve(currentDir, source, 'index.js'),
      resolve(currentDir, source, 'index.mjs')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolvePythonModule(source: string, currentFile: string): string | null {
    if (!source.startsWith('.')) return null;

    const currentDir = dirname(currentFile);
    const pythonPath = source.replace(/\./g, '/');
    const candidates = [
      resolve(currentDir, pythonPath + '.py'),
      resolve(currentDir, pythonPath, '__init__.py')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolveGoModule(source: string, currentFile: string): string | null {
    if (!source.startsWith('./') && !source.startsWith('../')) return null;

    const currentDir = dirname(currentFile);
    const targetPath = resolve(currentDir, source);

    if (existsSync(targetPath + '.go')) {
      return targetPath + '.go';
    }

    return null;
  }

  private resolveRustModule(source: string, currentFile: string): string | null {
    if (!source.startsWith('crate::') && !source.startsWith('super::')) return null;

    const currentDir = dirname(currentFile);
    const modulePath = source.replace(/::/g, '/').replace(/^crate\//, '').replace(/^super\//, '../');
    const candidates = [
      resolve(currentDir, modulePath + '.rs'),
      resolve(currentDir, modulePath, 'mod.rs')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolveJavaModule(source: string, currentFile: string): string | null {
    // Java는 패키지 기반이므로 로컬 해결이 복잡함
    return null;
  }

  private resolveCModule(source: string, currentFile: string): string | null {
    if (source.startsWith('<') || source.includes('/usr/') || source.includes('/usr/local/')) {
      return null; // 시스템 헤더
    }

    const currentDir = dirname(currentFile);
    const candidate = resolve(currentDir, source);

    return existsSync(candidate) ? candidate : null;
  }

  private resolveCppModule(source: string, currentFile: string): string | null {
    return this.resolveCModule(source, currentFile);
  }

  /**
   * 폴백 파서 생성자들
   */
  private createPhpFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'php');
      
      // PHP 특정 패턴 추가
      const content = readFileSync(filePath, 'utf-8');
      
      // Include/require 패턴
      const includePattern = /(?:include|require)(?:_once)?\s*\(?['"`]([^'"`]+)['"`]\)?/g;
      let match;
      while ((match = includePattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source: match[1],
          type: 'include',
          line: lineNumber,
          isLocal: match[1].startsWith('./') || match[1].startsWith('../')
        });
      }

      return result;
    };
  }

  private createRubyFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'ruby');
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Ruby require 패턴
      const requirePattern = /require(?:_relative)?\s+['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = requirePattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source: match[1],
          type: 'require',
          line: lineNumber,
          isLocal: match[0].includes('require_relative') || match[1].startsWith('./')
        });
      }

      return result;
    };
  }

  private createKotlinFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'kotlin');
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Kotlin import 패턴
      const importPattern = /import\s+([^\s\n;]+)/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source: match[1],
          type: 'import',
          line: lineNumber,
          isLocal: false // Kotlin은 주로 패키지 기반
        });
      }

      return result;
    };
  }

  private createSwiftFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'swift');
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Swift import 패턴
      const importPattern = /import\s+(?:@testable\s+)?([^\s\n]+)/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source: match[1],
          type: 'import',
          line: lineNumber,
          isLocal: false // Swift는 주로 모듈 기반
        });
      }

      return result;
    };
  }

  private createDartFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'dart');
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Dart import 패턴
      const importPattern = /import\s+['"`]([^'"`]+)['"`](?:\s+as\s+\w+)?(?:\s+show\s+[^;]+)?(?:\s+hide\s+[^;]+)?;/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const source = match[1];
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source,
          type: 'import',
          line: lineNumber,
          isLocal: source.startsWith('.')
        });
      }

      return result;
    };
  }

  private createScalaFallbackParser() {
    return (filePath: string): FallbackAnalysisResult => {
      const result = this.analyzeFallback(filePath, 'scala');
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Scala import 패턴
      const importPattern = /import\s+([^\s\n{]+)(?:\{[^}]+\})?/g;
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index!);
        result.dependencies.push({
          source: match[1],
          type: 'import',
          line: lineNumber,
          isLocal: false // Scala는 주로 패키지 기반
        });
      }

      return result;
    };
  }

  /**
   * 지원되는 언어 목록 조회
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languageConfigs.values());
  }

  /**
   * 특정 언어 설정 조회
   */
  getLanguageConfig(language: string): LanguageConfig | undefined {
    return this.languageConfigs.get(language);
  }

  /**
   * 언어 설정 업데이트
   */
  updateLanguageConfig(language: string, config: Partial<LanguageConfig>): void {
    const existing = this.languageConfigs.get(language);
    if (existing) {
      this.languageConfigs.set(language, { ...existing, ...config });
    }
  }

  /**
   * 새 언어 추가
   */
  addLanguageSupport(language: string, config: LanguageConfig): void {
    this.languageConfigs.set(language, config);
    
    // 폴백 파서도 추가할 수 있음
    if (!config.parserAvailable && config.dependencyPatterns.length > 0) {
      const fallbackParser = (filePath: string): FallbackAnalysisResult => {
        return this.analyzeFallback(filePath, language);
      };
      this.fallbackParsers.set(language, fallbackParser);
    }
  }

  /**
   * 배치 파일 분석
   */
  async analyzeBatch(filePaths: string[], batchSize: number = 50): Promise<(FileAnalysisResult | FallbackAnalysisResult)[]> {
    const results: (FileAnalysisResult | FallbackAnalysisResult)[] = [];
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (filePath) => {
          try {
            return await this.analyzeFile(filePath);
          } catch (error) {
            console.error(`Failed to analyze ${filePath}:`, error);
            return null;
          }
        })
      );
      
      results.push(...batchResults.filter(r => r !== null) as (FileAnalysisResult | FallbackAnalysisResult)[]);
      
      // 진행 상황 출력
      console.log(`📊 Analyzed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filePaths.length / batchSize)}`);
    }
    
    return results;
  }

  /**
   * 통계 정보
   */
  getStatistics(): {
    supportedLanguages: number;
    treeSitterLanguages: number;
    fallbackLanguages: number;
    totalExtensions: number;
  } {
    const treeSitterCount = Array.from(this.languageConfigs.values())
      .filter(config => config.parserAvailable).length;
    
    const totalExtensions = Array.from(this.languageConfigs.values())
      .reduce((total, config) => total + config.extensions.length, 0);

    return {
      supportedLanguages: this.languageConfigs.size,
      treeSitterLanguages: treeSitterCount,
      fallbackLanguages: this.fallbackParsers.size,
      totalExtensions
    };
  }
}