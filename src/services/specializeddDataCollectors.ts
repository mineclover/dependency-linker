/**
 * Specialized Data Collectors
 * 특정 데이터를 전문적으로 수집하는 컬렉터들
 */

import { readFileSync } from 'fs';
import path from 'path';
import * as ts from 'typescript';
import matter from 'gray-matter';

export interface DependencyInfo {
  source: string; // import 소스
  type: 'external' | 'internal' | 'relative';
  isDefault: boolean;
  imports: string[]; // 가져온 이름들
  line: number;
}

export interface FunctionInfo {
  name: string;
  type: 'function' | 'method' | 'arrow' | 'class' | 'component' | 'hook';
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  line: number;
  description?: string;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface TodoItem {
  content: string;
  type: 'TODO' | 'FIXME' | 'HACK' | 'NOTE';
  priority?: 'low' | 'medium' | 'high';
  line: number;
  author?: string;
  context: string; // 주변 코드 컨텍스트
}

export interface ClassInfo {
  name: string;
  isExported: boolean;
  extends?: string;
  implements: string[];
  methods: FunctionInfo[];
  properties: string[];
  line: number;
  description?: string;
}

export interface InterfaceInfo {
  name: string;
  isExported: boolean;
  extends: string[];
  properties: string[];
  line: number;
  description?: string;
}

export interface ImportExportInfo {
  imports: DependencyInfo[];
  exports: string[];
  reexports: string[];
}

export class DependencyCollector {
  /**
   * 파일의 모든 의존성 정보 수집
   */
  collectDependencies(filePath: string): DependencyInfo[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const dependencies: DependencyInfo[] = [];
      
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // ES6 import 구문
        const es6ImportMatch = line.match(/import\s+(.+?)\s+from\s+['"](.+?)['"]/);
        if (es6ImportMatch) {
          const [, importClause, source] = es6ImportMatch;
          dependencies.push(this.parseImportClause(importClause, source, lineNumber));
        }
        
        // CommonJS require 구문
        const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"](.+?)['"]\s*\)/);
        if (requireMatch) {
          const [, importClause, source] = requireMatch;
          dependencies.push({
            source,
            type: this.determineDependencyType(source),
            isDefault: true,
            imports: [importClause.trim()],
            line: lineNumber
          });
        }
        
        // Dynamic import
        const dynamicImportMatch = line.match(/import\s*\(\s*['"](.+?)['"]\s*\)/);
        if (dynamicImportMatch) {
          dependencies.push({
            source: dynamicImportMatch[1],
            type: this.determineDependencyType(dynamicImportMatch[1]),
            isDefault: false,
            imports: ['dynamic'],
            line: lineNumber
          });
        }
      }
      
      return dependencies;
    } catch (error) {
      console.warn(`Failed to collect dependencies from ${filePath}:`, error);
      return [];
    }
  }

  private parseImportClause(importClause: string, source: string, line: number): DependencyInfo {
    const imports: string[] = [];
    let isDefault = false;
    
    // Default import 처리
    const defaultMatch = importClause.match(/^([^{,]+)/);
    if (defaultMatch && !defaultMatch[1].includes('{')) {
      imports.push(defaultMatch[1].trim());
      isDefault = true;
    }
    
    // Named imports 처리
    const namedMatch = importClause.match(/\{([^}]+)\}/);
    if (namedMatch) {
      const namedImports = namedMatch[1].split(',').map(item => item.trim());
      imports.push(...namedImports);
    }
    
    // Namespace import 처리
    const namespaceMatch = importClause.match(/\*\s+as\s+(\w+)/);
    if (namespaceMatch) {
      imports.push(namespaceMatch[1]);
    }
    
    return {
      source,
      type: this.determineDependencyType(source),
      isDefault,
      imports,
      line
    };
  }

  private determineDependencyType(source: string): 'external' | 'internal' | 'relative' {
    if (source.startsWith('.') || source.startsWith('/')) {
      return 'relative';
    }
    if (source.startsWith('@/') || source.includes('/src/')) {
      return 'internal';
    }
    return 'external';
  }

  /**
   * 의존성 그래프 구축
   */
  buildDependencyGraph(filePaths: string[]): Map<string, DependencyInfo[]> {
    const graph = new Map<string, DependencyInfo[]>();
    
    for (const filePath of filePaths) {
      const dependencies = this.collectDependencies(filePath);
      graph.set(filePath, dependencies);
    }
    
    return graph;
  }
}

export class FunctionCollector {
  /**
   * 파일의 모든 함수 정보 수집
   */
  collectFunctions(filePath: string): FunctionInfo[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const functions: FunctionInfo[] = [];
      
      const ext = path.extname(filePath);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        return this.collectFromTypeScript(content);
      }
      
      return functions;
    } catch (error) {
      console.warn(`Failed to collect functions from ${filePath}:`, error);
      return [];
    }
  }

  private collectFromTypeScript(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    try {
      const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
      
      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          functions.push(this.extractFunctionInfo(node, content, 'function'));
        } else if (ts.isMethodDeclaration(node) && node.name) {
          functions.push(this.extractFunctionInfo(node, content, 'method'));
        } else if (ts.isArrowFunction(node)) {
          // Arrow function의 경우 상위 변수 선언에서 이름을 찾아야 함
          const parent = node.parent;
          if (ts.isVariableDeclaration(parent) && parent.name && ts.isIdentifier(parent.name)) {
            functions.push(this.extractArrowFunctionInfo(node, parent, content));
          }
        } else if (ts.isClassDeclaration(node) && node.name) {
          functions.push(this.extractClassInfo(node, content));
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
    } catch (error) {
      // TypeScript 파싱 실패 시 정규식으로 fallback
      return this.collectWithRegex(content);
    }
    
    return functions;
  }

  private extractFunctionInfo(node: ts.FunctionLikeDeclaration, content: string, type: 'function' | 'method'): FunctionInfo {
    const name = node.name ? node.name.getText() : 'anonymous';
    const isAsync = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    
    const parameters = node.parameters.map(param => param.getText());
    const returnType = node.type ? node.type.getText() : undefined;
    
    const line = this.getLineNumber(content, node.getStart());
    const description = this.extractJSDocDescription(node);
    const complexity = this.analyzeComplexity(node.getText());
    
    return {
      name,
      type,
      parameters,
      returnType,
      isAsync,
      isExported,
      line,
      description,
      complexity
    };
  }

  private extractArrowFunctionInfo(node: ts.ArrowFunction, parent: ts.VariableDeclaration, content: string): FunctionInfo {
    const name = parent.name.getText();
    const isAsync = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const isExported = parent.parent?.parent && ts.isVariableStatement(parent.parent.parent) &&
      parent.parent.parent.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    
    const parameters = node.parameters.map(param => param.getText());
    const returnType = node.type ? node.type.getText() : undefined;
    
    const line = this.getLineNumber(content, node.getStart());
    const description = this.extractJSDocDescription(parent.parent?.parent || parent);
    const complexity = this.analyzeComplexity(node.getText());
    
    return {
      name,
      type: 'arrow',
      parameters,
      returnType,
      isAsync,
      isExported,
      line,
      description,
      complexity
    };
  }

  private extractClassInfo(node: ts.ClassDeclaration, content: string): FunctionInfo {
    const name = node.name ? node.name.getText() : 'AnonymousClass';
    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    
    const line = this.getLineNumber(content, node.getStart());
    const description = this.extractJSDocDescription(node);
    const complexity = this.analyzeComplexity(node.getText());
    
    return {
      name,
      type: 'class',
      parameters: [],
      isAsync: false,
      isExported,
      line,
      description,
      complexity
    };
  }

  private collectWithRegex(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');
    
    const functionPatterns = [
      /^\s*(?:export\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
      /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^\s*(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^\s*(?:export\s+)?class\s+(\w+)/
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          functions.push({
            name: match[1],
            type: 'function',
            parameters: match[2] ? match[2].split(',').map(p => p.trim()) : [],
            isAsync: line.includes('async'),
            isExported: line.includes('export'),
            line: i + 1,
            complexity: this.analyzeComplexity(line)
          });
        }
      }
    }
    
    return functions;
  }

  private extractJSDocDescription(node: any): string | undefined {
    // JSDoc 주석 추출 로직
    return undefined; // 간소화를 위해 undefined 반환
  }

  private getLineNumber(content: string, position: number): number {
    const beforePosition = content.substring(0, position);
    return beforePosition.split('\n').length;
  }

  private analyzeComplexity(code: string): 'simple' | 'medium' | 'complex' {
    const lines = code.split('\n').length;
    const conditions = (code.match(/if|while|for|switch|catch|\?/g) || []).length;
    const nesting = this.calculateNesting(code);
    
    const score = (lines / 10) + (conditions * 2) + (nesting * 3);
    
    if (score > 20) return 'complex';
    if (score > 10) return 'medium';
    return 'simple';
  }

  private calculateNesting(code: string): number {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === '}') {
        currentNesting--;
      }
    }
    
    return maxNesting;
  }
}

export class TodoCollector {
  /**
   * 파일의 모든 TODO 항목 수집
   */
  collectTodos(filePath: string): TodoItem[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const todos: TodoItem[] = [];
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        const todoPatterns = [
          /(?:\/\/|#|\*|<!--)\s*(TODO|FIXME|HACK|NOTE):?\s*(.+?)(?:-->)?$/i,
          /(?:\/\*)\s*(TODO|FIXME|HACK|NOTE):?\s*([\s\S]*?)\*\//i
        ];
        
        for (const pattern of todoPatterns) {
          const match = line.match(pattern);
          if (match) {
            const [, type, content] = match;
            const todo = this.parseTodoItem(type, content, lineNumber, lines, i);
            todos.push(todo);
            break;
          }
        }
      }
      
      return todos;
    } catch (error) {
      console.warn(`Failed to collect TODOs from ${filePath}:`, error);
      return [];
    }
  }

  private parseTodoItem(type: string, content: string, line: number, allLines: string[], currentIndex: number): TodoItem {
    // 우선순위 추출
    const priorityMatch = content.match(/\[(high|medium|low)\]/i);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() as 'low' | 'medium' | 'high' : undefined;
    
    // 작성자 추출
    const authorMatch = content.match(/@(\w+)/);
    const author = authorMatch ? authorMatch[1] : undefined;
    
    // 컨텍스트 수집 (앞뒤 2줄씩)
    const contextStart = Math.max(0, currentIndex - 2);
    const contextEnd = Math.min(allLines.length - 1, currentIndex + 2);
    const context = allLines.slice(contextStart, contextEnd + 1).join('\n');
    
    // 내용 정리
    const cleanContent = content
      .replace(/\[(high|medium|low)\]/i, '')
      .replace(/@\w+/, '')
      .trim();
    
    return {
      content: cleanContent,
      type: type.toUpperCase() as 'TODO' | 'FIXME' | 'HACK' | 'NOTE',
      priority,
      line,
      author,
      context
    };
  }

  /**
   * TODO 통계 정보
   */
  getTodoStats(todos: TodoItem[]): {
    total: number;
    byType: Map<string, number>;
    byPriority: Map<string, number>;
    byAuthor: Map<string, number>;
  } {
    const stats = {
      total: todos.length,
      byType: new Map<string, number>(),
      byPriority: new Map<string, number>(),
      byAuthor: new Map<string, number>()
    };

    for (const todo of todos) {
      // 타입별 통계
      const typeCount = stats.byType.get(todo.type) || 0;
      stats.byType.set(todo.type, typeCount + 1);
      
      // 우선순위별 통계
      if (todo.priority) {
        const priorityCount = stats.byPriority.get(todo.priority) || 0;
        stats.byPriority.set(todo.priority, priorityCount + 1);
      }
      
      // 작성자별 통계
      if (todo.author) {
        const authorCount = stats.byAuthor.get(todo.author) || 0;
        stats.byAuthor.set(todo.author, authorCount + 1);
      }
    }

    return stats;
  }
}

export class ClassInterfaceCollector {
  /**
   * 클래스와 인터페이스 정보 수집
   */
  collectClassesAndInterfaces(filePath: string): { classes: ClassInfo[]; interfaces: InterfaceInfo[] } {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const classes: ClassInfo[] = [];
      const interfaces: InterfaceInfo[] = [];
      
      const ext = path.extname(filePath);
      if (['.ts', '.tsx'].includes(ext)) {
        return this.collectFromTypeScript(content);
      }
      
      return { classes, interfaces };
    } catch (error) {
      console.warn(`Failed to collect classes/interfaces from ${filePath}:`, error);
      return { classes: [], interfaces: [] };
    }
  }

  private collectFromTypeScript(content: string): { classes: ClassInfo[]; interfaces: InterfaceInfo[] } {
    const classes: ClassInfo[] = [];
    const interfaces: InterfaceInfo[] = [];
    
    try {
      const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest, true);
      
      const visit = (node: ts.Node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          classes.push(this.extractClassDetails(node, content));
        } else if (ts.isInterfaceDeclaration(node)) {
          interfaces.push(this.extractInterfaceDetails(node, content));
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
    } catch (error) {
      console.warn('TypeScript parsing failed, using regex fallback:', error);
    }
    
    return { classes, interfaces };
  }

  private extractClassDetails(node: ts.ClassDeclaration, content: string): ClassInfo {
    const name = node.name!.getText();
    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    
    // 상속 관계
    const extendsClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
    const extends_ = extendsClause?.types[0]?.expression.getText();
    
    // 구현 인터페이스
    const implementsClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ImplementsKeyword);
    const implements_ = implementsClause?.types.map(type => type.expression.getText()) || [];
    
    // 메서드와 속성
    const methods: FunctionInfo[] = [];
    const properties: string[] = [];
    
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        // FunctionCollector 로직 재사용
        methods.push({
          name: member.name.getText(),
          type: 'method',
          parameters: member.parameters.map(p => p.getText()),
          isAsync: member.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false,
          isExported: false,
          line: this.getLineNumber(content, member.getStart()),
          complexity: 'simple' // 간소화
        });
      } else if (ts.isPropertyDeclaration(member) && member.name) {
        properties.push(member.name.getText());
      }
    }
    
    return {
      name,
      isExported,
      extends: extends_,
      implements: implements_,
      methods,
      properties,
      line: this.getLineNumber(content, node.getStart())
    };
  }

  private extractInterfaceDetails(node: ts.InterfaceDeclaration, content: string): InterfaceInfo {
    const name = node.name.getText();
    const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
    
    // 상속 인터페이스
    const extends_ = node.heritageClauses?.[0]?.types.map(type => type.expression.getText()) || [];
    
    // 속성
    const properties = node.members
      .filter(member => ts.isPropertySignature(member) && member.name)
      .map(member => member.name!.getText());
    
    return {
      name,
      isExported,
      extends: extends_,
      properties,
      line: this.getLineNumber(content, node.getStart())
    };
  }

  private getLineNumber(content: string, position: number): number {
    const beforePosition = content.substring(0, position);
    return beforePosition.split('\n').length;
  }
}