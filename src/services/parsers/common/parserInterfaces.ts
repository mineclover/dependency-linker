/**
 * 공통 파서 인터페이스 정의
 * Common Parser Interfaces
 */

import Parser from 'tree-sitter';

export interface DependencyInfo {
  source: string;
  type: DependencyType;
  location: CodeLocation;
  resolved?: string;
  version?: string;
  isLocal: boolean;
  isDynamic: boolean;
  metadata?: DependencyMetadata;
}

export type DependencyType = 
  | 'import'           // ES6 import
  | 'require'          // CommonJS require
  | 'export'           // ES6 export
  | 'dynamic_import'   // Dynamic import()
  | 'include'          // C/C++ include
  | 'use'              // Rust use
  | 'package'          // Java package
  | 'from_import'      // Python from...import
  | 'import_package';  // Go import

export interface DependencyMetadata {
  alias?: string;
  members?: string[];
  isDefault?: boolean;
  isNamespace?: boolean;
  importType?: 'named' | 'default' | 'namespace' | 'side-effect';
}

export interface CodeLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface FunctionInfo {
  name: string;
  type: 'function' | 'method' | 'arrow' | 'constructor' | 'getter' | 'setter' | 'async' | 'generator';
  params: ParameterInfo[];
  returnType?: string;
  location: CodeLocation;
  visibility?: 'public' | 'private' | 'protected';
  decorators?: string[];
  isAsync: boolean;
  isGenerator: boolean;
  isExported: boolean;
  complexity?: number;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
  isRest: boolean;
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  location: CodeLocation;
  isExported: boolean;
  isAbstract: boolean;
  decorators?: string[];
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  visibility?: 'public' | 'private' | 'protected';
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility?: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  defaultValue?: string;
  decorators?: string[];
}

export interface VariableInfo {
  name: string;
  type?: string;
  kind: 'const' | 'let' | 'var' | 'global' | 'static';
  isExported: boolean;
  location: CodeLocation;
  defaultValue?: string;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'namespace' | 'all' | 're-export';
  source?: string;
  location: CodeLocation;
  alias?: string;
}

export interface CommentInfo {
  type: 'line' | 'block' | 'jsdoc' | 'docstring';
  content: string;
  location: CodeLocation;
  tags?: { [key: string]: string };
}

export interface TodoInfo {
  type: 'TODO' | 'FIXME' | 'HACK' | 'NOTE' | 'XXX' | 'BUG';
  content: string;
  author?: string;
  date?: string;
  priority?: number;
  location: CodeLocation;
}

export interface ParseError {
  message: string;
  location: CodeLocation;
  severity: 'error' | 'warning' | 'info';
}

export interface FileMetrics {
  linesOfCode: number;
  commentLines: number;
  blankLines: number;
  complexity: number;
  dependencies: number;
  exports: number;
  functions: number;
  classes: number;
  maintainabilityIndex: number;
}

export interface LanguageAnalysisResult {
  filePath: string;
  language: string;
  version?: string;
  dependencies: DependencyInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  exports: ExportInfo[];
  comments: CommentInfo[];
  todos: TodoInfo[];
  notionId?: string;
  parseErrors: ParseError[];
  metrics: FileMetrics;
  analysisTime: number;
  parserVersion: string;
  // 고도화된 의존성 분석 결과
  classifiedDependencies?: any[]; // ClassifiedDependency[] - 순환 참조 방지를 위해 any 사용
  dependencyStats?: {
    total: number;
    local: number;
    libraries: number;
    byPackageManager: Record<string, number>;
    byCategory: Record<string, number>;
    devDependencies: number;
  };
}

/**
 * 언어별 파서 인터페이스
 */
export interface LanguageParser {
  readonly language: string;
  readonly extensions: string[];
  readonly parserVersion: string;
  
  /**
   * 파일 분석
   */
  analyzeFile(filePath: string): Promise<LanguageAnalysisResult>;
  
  /**
   * 텍스트 직접 분석
   */
  analyzeText(content: string, filePath?: string): Promise<LanguageAnalysisResult>;
  
  /**
   * AST 노드 방문 및 분석
   */
  visitNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void;
  
  /**
   * 종속성 추출
   */
  extractDependencies(node: Parser.SyntaxNode, content: string): DependencyInfo[];
  
  /**
   * 함수 추출
   */
  extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[];
  
  /**
   * 클래스 추출
   */
  extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[];
  
  /**
   * 변수 추출
   */
  extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[];
  
  /**
   * Export 추출
   */
  extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[];
  
  /**
   * 주석 추출
   */
  extractComments(node: Parser.SyntaxNode, content: string): CommentInfo[];
  
  /**
   * 메트릭 계산
   */
  calculateMetrics(content: string, result: LanguageAnalysisResult): FileMetrics;
  
  /**
   * 언어별 특수 처리
   */
  processLanguageSpecificFeatures?(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void;
}

/**
 * 추상 기본 파서 클래스
 */
export abstract class BaseLanguageParser implements LanguageParser {
  protected parser: Parser;
  
  abstract readonly language: string;
  abstract readonly extensions: string[];
  abstract readonly parserVersion: string;
  
  constructor(parserLanguage: any) {
    this.parser = new Parser();
    try {
      this.parser.setLanguage(parserLanguage);
    } catch (error: any) {
      if (error.message.includes('readonly property')) {
        // Tree-sitter language module has readonly property issue
        console.warn(`⚠️ Tree-sitter language setup failed for ${this.language}: ${error.message}`);
        throw new Error(`Parser initialization failed for ${this.language}. This parser will be disabled.`);
      }
      throw error;
    }
  }
  
  /**
   * 파일 분석 구현
   */
  async analyzeFile(filePath: string): Promise<LanguageAnalysisResult> {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.analyzeText(content, filePath);
  }
  
  /**
   * 텍스트 분석 구현
   */
  async analyzeText(content: string, filePath?: string): Promise<LanguageAnalysisResult> {
    const startTime = Date.now();
    
    const result: LanguageAnalysisResult = {
      filePath: filePath || 'unknown',
      language: this.language,
      parserVersion: this.parserVersion,
      dependencies: [],
      functions: [],
      classes: [],
      variables: [],
      exports: [],
      comments: [],
      todos: [],
      parseErrors: [],
      metrics: {
        linesOfCode: 0,
        commentLines: 0,
        blankLines: 0,
        complexity: 0,
        dependencies: 0,
        exports: 0,
        functions: 0,
        classes: 0,
        maintainabilityIndex: 0
      },
      analysisTime: 0,
      classifiedDependencies: [],
      dependencyStats: {
        total: 0,
        local: 0,
        libraries: 0,
        byPackageManager: {},
        byCategory: {},
        devDependencies: 0
      }
    };
    
    try {
      // Tree-sitter 파싱
      const tree = this.parser.parse(content);
      
      // Notion ID 추출
      result.notionId = this.extractNotionId(content);
      
      // AST 순회 및 분석
      this.visitNode(tree.rootNode, content, result);
      
      // 메트릭 계산
      result.metrics = this.calculateMetrics(content, result);
      
      // 파싱 에러 수집
      if (tree.rootNode.hasError) {
        this.collectParseErrors(tree.rootNode, result);
      }
      
      // 언어별 특수 처리
      if (this.processLanguageSpecificFeatures) {
        this.processLanguageSpecificFeatures(tree.rootNode, content, result);
      }

      // 의존성 분류 (고도화된 분석)
      console.log(`🔄 Starting dependency classification for ${result.dependencies.length} dependencies...`);
      await this.classifyDependencies(result, filePath);
      console.log(`✅ Dependency classification completed`);
      
    } catch (error) {
      console.error(`💥 Error during analysis: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`   Stack:`, error);
      result.parseErrors.push({
        message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
        location: { line: 1, column: 1, endLine: 1, endColumn: 1 },
        severity: 'error'
      });
    }
    
    result.analysisTime = Date.now() - startTime;
    return result;
  }
  
  /**
   * 기본 노드 방문 구현
   */
  visitNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void {
    // 현재 노드 처리
    this.processNode(node, content, result);
    
    // 자식 노드 순회
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.visitNode(child, content, result);
      }
    }
  }
  
  /**
   * 개별 노드 처리 (언어별 구현 필요)
   */
  protected abstract processNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void;
  
  /**
   * 기본 메트릭 계산
   */
  calculateMetrics(content: string, result: LanguageAnalysisResult): FileMetrics {
    const lines = content.split('\n');
    const blankLines = lines.filter(line => line.trim() === '').length;
    const commentLines = result.comments.length;
    const linesOfCode = lines.length - blankLines - commentLines;
    
    // 순환 복잡도 계산 (간단한 버전)
    let complexity = 1;
    const complexityKeywords = this.getComplexityKeywords();
    for (const line of lines) {
      for (const keyword of complexityKeywords) {
        const matches = line.match(new RegExp(`\\b${keyword}\\b`, 'g'));
        if (matches) {
          complexity += matches.length;
        }
      }
    }
    
    // 유지보수성 지수 계산 (간단한 버전)
    const maintainabilityIndex = Math.max(0, 100 - complexity * 2 - (linesOfCode / 10));
    
    return {
      linesOfCode,
      commentLines,
      blankLines,
      complexity,
      dependencies: result.dependencies.length,
      exports: result.exports.length,
      functions: result.functions.length,
      classes: result.classes.length,
      maintainabilityIndex
    };
  }
  
  /**
   * 복잡도 키워드 (언어별 오버라이드 가능)
   */
  protected getComplexityKeywords(): string[] {
    return ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
  }
  
  /**
   * Notion ID 추출
   */
  protected extractNotionId(content: string): string | undefined {
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
   * 파싱 에러 수집
   */
  protected collectParseErrors(node: Parser.SyntaxNode, result: LanguageAnalysisResult): void {
    if (node.hasError) {
      if (node.isMissing) {
        result.parseErrors.push({
          message: `Missing node: ${node.type}`,
          location: {
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            endLine: node.endPosition.row + 1,
            endColumn: node.endPosition.column + 1
          },
          severity: 'error'
        });
      } else if (node.isError) {
        result.parseErrors.push({
          message: `Parse error in ${node.type}`,
          location: {
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            endLine: node.endPosition.row + 1,
            endColumn: node.endPosition.column + 1
          },
          severity: 'error'
        });
      }
    }
    
    // 자식 노드도 확인
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.collectParseErrors(child, result);
      }
    }
  }
  
  /**
   * 줄 번호 계산
   */
  protected getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
  
  /**
   * 노드 위치를 CodeLocation으로 변환
   */
  protected nodeToLocation(node: Parser.SyntaxNode): CodeLocation {
    return {
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1
    };
  }
  
  /**
   * TODO/FIXME 추출
   */
  protected extractTodosFromComment(comment: CommentInfo): TodoInfo[] {
    const todos: TodoInfo[] = [];
    const todoPatterns = [
      { type: 'TODO' as const, pattern: /TODO\s*:?\s*(.+)/i },
      { type: 'FIXME' as const, pattern: /FIXME\s*:?\s*(.+)/i },
      { type: 'HACK' as const, pattern: /HACK\s*:?\s*(.+)/i },
      { type: 'NOTE' as const, pattern: /NOTE\s*:?\s*(.+)/i },
      { type: 'XXX' as const, pattern: /XXX\s*:?\s*(.+)/i },
      { type: 'BUG' as const, pattern: /BUG\s*:?\s*(.+)/i }
    ];

    for (const { type, pattern } of todoPatterns) {
      const match = comment.content.match(pattern);
      if (match) {
        todos.push({
          type,
          content: match[1] || '',
          location: comment.location
        });
      }
    }

    return todos;
  }
  
  /**
   * 의존성 분류 (라이브러리 vs 로컬)
   */
  protected async classifyDependencies(result: LanguageAnalysisResult, filePath?: string): Promise<void> {
    try {
      const { DependencyClassifier } = await import('./dependencyClassifier');
      
      const projectPath = filePath ? require('path').dirname(filePath) : process.cwd();
      const classifier = new DependencyClassifier(projectPath);
      
      // 의존성 분류
      result.classifiedDependencies = classifier.classifyDependencies(result.dependencies);
      
      // 통계 정보 생성
      result.dependencyStats = classifier.getClassificationStats(result.classifiedDependencies);
      
      console.log(`🔍 Classification completed: ${result.classifiedDependencies.length} classified, ${result.dependencyStats.local} local, ${result.dependencyStats.libraries} libraries`);
      
    } catch (error) {
      console.warn('Failed to classify dependencies:', error);
      // 분류 실패시 기본값 설정
      result.classifiedDependencies = result.dependencies.map(dep => ({
        ...dep,
        classification: 'unknown' as any
      }));
      result.dependencyStats = {
        total: result.dependencies.length,
        local: 0,
        libraries: 0,
        byPackageManager: {},
        byCategory: {},
        devDependencies: 0
      };
    }
  }

  // 추상 메서드들 - 각 언어별 파서에서 구현
  abstract extractDependencies(node: Parser.SyntaxNode, content: string): DependencyInfo[];
  abstract extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[];
  abstract extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[];
  abstract extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[];
  abstract extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[];
  abstract extractComments(node: Parser.SyntaxNode, content: string): CommentInfo[];
}