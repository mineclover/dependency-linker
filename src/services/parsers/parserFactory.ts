/**
 * 파서 팩토리 - 언어별 파서 관리
 * Parser Factory - Language-specific Parser Management
 */

import path from 'path';
import { LanguageParser, LanguageAnalysisResult } from './common/parserInterfaces';
import { TypeScriptParser, JavaScriptParser } from './typescript/typescriptParser';
import { PythonParser } from './python/pythonParser';
import { GoParser } from './go/goParser';
import { RustParser } from './rust/rustParser';

export class ParserFactory {
  private static instance: ParserFactory;
  private parsers: Map<string, LanguageParser> = new Map();
  private extensionMap: Map<string, string> = new Map();
  
  private constructor() {
    this.initializeParsers();
    this.buildExtensionMap();
  }
  
  /**
   * 파서 팩토리 인스턴스 가져오기
   */
  static getInstance(): ParserFactory {
    if (!ParserFactory.instance) {
      ParserFactory.instance = new ParserFactory();
    }
    return ParserFactory.instance;
  }
  
  /**
   * 파서 초기화
   */
  private initializeParsers(): void {
    const parserClasses = [
      TypeScriptParser,
      JavaScriptParser,
      PythonParser,
      GoParser,
      RustParser
    ];
    
    for (const ParserClass of parserClasses) {
      try {
        const parser = new ParserClass();
        this.parsers.set(parser.language, parser);
        console.log(`✅ ${parser.language} parser initialized`);
      } catch (error: any) {
        console.warn(`⚠️ Failed to initialize ${ParserClass.name}: ${error.message}`);
        // Continue with other parsers
      }
    }
    
    console.log(`🔧 Initialized ${this.parsers.size} parsers: ${Array.from(this.parsers.keys()).join(', ')}`);
  }
  
  /**
   * 확장자별 언어 매핑 구축
   */
  private buildExtensionMap(): void {
    for (const [language, parser] of this.parsers) {
      for (const extension of parser.extensions) {
        this.extensionMap.set(extension, language);
      }
    }
  }
  
  /**
   * 파일 확장자로 언어 감지
   */
  public detectLanguage(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensionMap.get(ext) || null;
  }
  
  /**
   * 언어별 파서 가져오기
   */
  public getParser(language: string): LanguageParser | null {
    return this.parsers.get(language) || null;
  }
  
  /**
   * 파일 경로로 파서 가져오기
   */
  public getParserByFilePath(filePath: string): LanguageParser | null {
    const language = this.detectLanguage(filePath);
    return language ? this.getParser(language) : null;
  }
  
  /**
   * 지원하는 모든 언어 목록
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }
  
  /**
   * 지원하는 모든 확장자 목록
   */
  public getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }
  
  /**
   * 파일 분석
   */
  public async analyzeFile(filePath: string): Promise<LanguageAnalysisResult | null> {
    const parser = this.getParserByFilePath(filePath);
    if (!parser) {
      console.warn(`⚠️ No parser available for file: ${filePath}, using fallback`);
      return this.fallbackAnalyzer(filePath);
    }
    
    try {
      return await parser.analyzeFile(filePath);
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      console.warn(`⚠️ Parser failed, using fallback for: ${filePath}`);
      return this.fallbackAnalyzer(filePath);
    }
  }
  
  /**
   * 간단한 정규식 기반 폴백 분석기
   */
  private async fallbackAnalyzer(filePath: string): Promise<LanguageAnalysisResult> {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath) || 'unknown';
    
    const lines = content.split('\n');
    const result: LanguageAnalysisResult = {
      filePath,
      language,
      dependencies: [],
      functions: [],
      classes: [],
      variables: [],
      exports: [],
      comments: [],
      todos: [],
      analysisTime: 0,
      parseErrors: [],
      metrics: {
        linesOfCode: lines.filter(line => line.trim() && !line.trim().startsWith('//')).length,
        commentLines: lines.filter(line => line.trim().startsWith('//')).length,
        blankLines: lines.filter(line => !line.trim()).length,
        complexity: 1, // Default complexity
        dependencies: 0, // Will be updated after analysis
        exports: 0, // Will be updated after analysis
        functions: 0, // Will be updated after analysis
        classes: 0, // Will be updated after analysis
        maintainabilityIndex: 85 // Default good maintainability
      },
      parserVersion: 'fallback-1.0.0'
    };
    
    const startTime = Date.now();
    
    // 간단한 임포트 감지 (TypeScript/JavaScript)
    if (language === 'typescript' || language === 'javascript') {
      const importRegex = /^import\s+(?:{[^}]+}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"];?/gm;
      const requireRegex = /(?:const|let|var)\s+\w+\s*=\s*require\(['"]([^'"]+)['"]\)/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        result.dependencies.push({
          source: match[1],
          type: 'import',
          location: { line: 0, column: 0, endLine: 0, endColumn: 0 },
          isLocal: match[1].startsWith('.'),
          isDynamic: false
        });
      }
      
      while ((match = requireRegex.exec(content)) !== null) {
        result.dependencies.push({
          source: match[1],
          type: 'require',
          location: { line: 0, column: 0, endLine: 0, endColumn: 0 },
          isLocal: match[1].startsWith('.'),
          isDynamic: false
        });
      }
      
      // 간단한 함수 감지
      const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
      while ((match = functionRegex.exec(content)) !== null) {
        result.functions.push({
          name: match[1] || match[2],
          type: 'function',
          params: [],
          location: { line: 0, column: 0, endLine: 0, endColumn: 0 },
          isAsync: false,
          isGenerator: false,
          isExported: false
        });
      }
      
      // 간단한 TODO 감지
      const todoRegex = /\/\/\s*(TODO|FIXME|HACK|NOTE):?\s*(.+)/gi;
      while ((match = todoRegex.exec(content)) !== null) {
        result.todos.push({
          type: match[1].toUpperCase(),
          content: match[2].trim(),
          location: { line: 0, column: 0, endLine: 0, endColumn: 0 },
          priority: 'medium'
        });
      }
    }
    
    // Update metrics after analysis
    result.metrics.dependencies = result.dependencies.length;
    result.metrics.functions = result.functions.length;
    result.metrics.classes = result.classes.length;
    result.metrics.exports = result.exports.length;
    
    result.analysisTime = Date.now() - startTime;
    console.log(`📝 Fallback analysis completed for ${filePath}: ${result.dependencies.length} deps, ${result.functions.length} funcs, ${result.todos.length} todos`);
    return result;
  }
  
  /**
   * 텍스트 직접 분석
   */
  public async analyzeText(
    content: string,
    language: string,
    filePath?: string
  ): Promise<LanguageAnalysisResult | null> {
    const parser = this.getParser(language);
    if (!parser) {
      return null;
    }
    
    try {
      return await parser.analyzeText(content, filePath);
    } catch (error) {
      console.error(`Error analyzing text for language ${language}:`, error);
      return null;
    }
  }
  
  /**
   * 파서 정보 가져오기
   */
  public getParserInfo(): ParserInfo[] {
    const info: ParserInfo[] = [];
    
    for (const [language, parser] of this.parsers) {
      info.push({
        language,
        extensions: [...parser.extensions],
        version: parser.parserVersion
      });
    }
    
    return info;
  }
  
  /**
   * 언어별 파일 필터링
   */
  public filterFilesByLanguage(filePaths: string[], language: string): string[] {
    const parser = this.getParser(language);
    if (!parser) {
      return [];
    }
    
    return filePaths.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return parser.extensions.includes(ext);
    });
  }
  
  /**
   * 파일 경로 배치 분석
   */
  public async analyzeBatch(filePaths: string[]): Promise<BatchAnalysisResult> {
    const results: LanguageAnalysisResult[] = [];
    const errors: AnalysisError[] = [];
    
    const languageGroups = this.groupFilesByLanguage(filePaths);
    
    for (const [language, files] of languageGroups) {
      const parser = this.getParser(language);
      if (!parser) {
        errors.push({
          filePath: files.join(', '),
          language,
          error: `No parser available for language: ${language}`
        });
        continue;
      }
      
      for (const filePath of files) {
        try {
          const result = await parser.analyzeFile(filePath);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          errors.push({
            filePath,
            language,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    return {
      results,
      errors,
      totalFiles: filePaths.length,
      successfulFiles: results.length,
      failedFiles: errors.length
    };
  }
  
  /**
   * 파일을 언어별로 그룹화
   */
  private groupFilesByLanguage(filePaths: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    
    for (const filePath of filePaths) {
      const language = this.detectLanguage(filePath);
      if (language) {
        if (!groups.has(language)) {
          groups.set(language, []);
        }
        groups.get(language)!.push(filePath);
      }
    }
    
    return groups;
  }
  
  /**
   * 통계 정보 수집
   */
  public getParserStatistics(): ParserStatistics {
    const stats: ParserStatistics = {
      totalParsers: this.parsers.size,
      totalExtensions: this.extensionMap.size,
      parsersByCategory: {
        webDevelopment: ['typescript', 'javascript'].filter(lang => this.parsers.has(lang)).length,
        systemsProgramming: ['rust', 'go'].filter(lang => this.parsers.has(lang)).length,
        scriptingLanguages: ['python'].filter(lang => this.parsers.has(lang)).length,
        other: 0
      }
    };
    
    stats.parsersByCategory.other = stats.totalParsers - 
      stats.parsersByCategory.webDevelopment - 
      stats.parsersByCategory.systemsProgramming - 
      stats.parsersByCategory.scriptingLanguages;
    
    return stats;
  }
}

/**
 * 타입 정의
 */
export interface ParserInfo {
  language: string;
  extensions: string[];
  version: string;
}

export interface AnalysisError {
  filePath: string;
  language: string;
  error: string;
}

export interface BatchAnalysisResult {
  results: LanguageAnalysisResult[];
  errors: AnalysisError[];
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
}

export interface ParserStatistics {
  totalParsers: number;
  totalExtensions: number;
  parsersByCategory: {
    webDevelopment: number;
    systemsProgramming: number;
    scriptingLanguages: number;
    other: number;
  };
}

/**
 * 싱글톤 인스턴스
 */
export const parserFactory = ParserFactory.getInstance();