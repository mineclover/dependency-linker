/**
 * Data Collection Engine
 * 스키마 기반 규칙에 따라 실제 데이터를 수집하는 엔진
 */

import { readFileSync, statSync } from 'fs';
import path from 'path';
import * as ts from 'typescript';
import matter from 'gray-matter';
import { DataCollectionRulesService, CollectionRule, DatabaseCollectionSchema } from './dataCollectionRulesService';

export interface CollectedData {
  [propertyName: string]: any;
}

export interface FileCollectionResult {
  filePath: string;
  databaseName: string;
  data: CollectedData;
  notionId?: string; // 기존 Notion ID (있다면)
  errors: string[];
}

export class DataCollectionEngine {
  private rulesService: DataCollectionRulesService;
  private initialized: boolean = false;

  constructor(schemaPath?: string) {
    this.rulesService = new DataCollectionRulesService(schemaPath);
  }

  /**
   * Initialize the rules service (called automatically when needed)
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const result = await this.rulesService.initializeCollectionRules();
      if (!result.success) {
        throw new Error(`Failed to initialize collection rules: ${result.message}`);
      }
      this.initialized = true;
    }
  }

  /**
   * 파일에서 데이터 수집
   */
  async collectFromFile(filePath: string, databaseName: string): Promise<FileCollectionResult> {
    const result: FileCollectionResult = {
      filePath,
      databaseName,
      data: {},
      errors: []
    };

    try {
      // Ensure rules service is initialized
      await this.ensureInitialized();
      // 파일 존재 확인
      if (!this.fileExists(filePath)) {
        result.errors.push(`File does not exist: ${filePath}`);
        return result;
      }

      // 해당 파일에 적용할 수집 규칙들 가져오기
      const applicableRules = this.rulesService.getApplicableRules(filePath, databaseName);
      if (applicableRules.length === 0) {
        result.errors.push(`No applicable rules found for ${filePath} in ${databaseName}`);
        return result;
      }

      // 파일 내용 읽기
      const fileContent = readFileSync(filePath, 'utf-8');
      
      // Notion ID 추출
      result.notionId = this.extractNotionId(filePath, fileContent);

      // 각 규칙에 따라 데이터 수집
      for (const rule of applicableRules) {
        try {
          const value = await this.extractDataByRule(filePath, fileContent, rule);
          if (value !== undefined && value !== null) {
            result.data[rule.propertyName] = value;
          }
        } catch (error) {
          result.errors.push(`Error extracting ${rule.propertyName}: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`Error processing file ${filePath}: ${error}`);
    }

    return result;
  }

  /**
   * 규칙에 따라 데이터 추출
   */
  private async extractDataByRule(filePath: string, content: string, rule: CollectionRule): Promise<any> {
    const { extractionRules, transformationRules } = rule;

    let extractedValue: any;

    // Front matter에서 추출
    if (extractionRules.frontMatterKey) {
      const frontMatterValue = this.extractFromFrontMatter(content, extractionRules.frontMatterKey);
      if (frontMatterValue !== undefined) {
        extractedValue = frontMatterValue;
      }
    }

    // 함수 기반 추출
    if (extractionRules.functions && extractionRules.functions.length > 0) {
      for (const functionName of extractionRules.functions) {
        const value = await this.executeExtractionFunction(functionName, filePath, content, rule);
        if (value !== undefined) {
          extractedValue = value;
          break;
        }
      }
    }

    // 패턴 기반 추출
    if (extractionRules.patterns && extractionRules.patterns.length > 0) {
      const value = this.extractByPatterns(content, extractionRules.patterns);
      if (value !== undefined) {
        extractedValue = value;
      }
    }

    // 코드 분석 기반 추출
    if (extractionRules.codeAnalysis) {
      const value = this.extractByCodeAnalysis(filePath, content, extractionRules.codeAnalysis);
      if (value !== undefined) {
        extractedValue = value;
      }
    }

    // 변환 규칙 적용
    if (extractedValue !== undefined && transformationRules) {
      extractedValue = this.applyTransformationRules(extractedValue, transformationRules);
    }

    // 기본값 적용
    if (extractedValue === undefined && transformationRules?.defaultValue) {
      extractedValue = transformationRules.defaultValue;
    }

    return extractedValue;
  }

  /**
   * Front matter에서 값 추출
   */
  private extractFromFrontMatter(content: string, key: string): any {
    try {
      const parsed = matter(content);
      return parsed.data[key];
    } catch {
      return undefined;
    }
  }

  /**
   * 추출 함수 실행
   */
  private async executeExtractionFunction(functionName: string, filePath: string, content: string, rule: CollectionRule): Promise<any> {
    switch (functionName) {
      case 'extractFileName':
        return path.basename(filePath);
      
      case 'extractFilePath':
        return filePath;
      
      case 'extractFileExtension':
        return path.extname(filePath);
      
      case 'extractFileSize':
        try {
          const stats = statSync(filePath);
          return stats.size;
        } catch {
          return undefined;
        }
      
      case 'extractLastModified':
        try {
          const stats = statSync(filePath);
          return stats.mtime.toISOString();
        } catch {
          return undefined;
        }
      
      case 'determineFileStatus':
        return 'Uploaded'; // 기본 상태
      
      case 'extractProjectName':
        // 프로젝트 루트에서 package.json이나 설정 파일로부터 추출
        return 'dependency-linker';
      
      case 'extractDocumentTitle':
        return this.extractDocumentTitle(content, filePath);
      
      case 'determineDocumentType':
        return this.determineDocumentType(filePath, content);
      
      case 'extractContentPreview':
        return this.extractContentPreview(content);
      
      case 'determineDocumentStatus':
        return 'Published'; // 기본 상태
      
      case 'extractPriority':
        return this.extractPriority(content);
      
      case 'extractTags':
        return this.extractTags(content);
      
      case 'analyzeFunctionType':
        return this.analyzeFunctionType(content, filePath);
      
      case 'extractFunctionParameters':
        return this.extractFunctionParameters(content);
      
      case 'extractReturnType':
        return this.extractReturnType(content);
      
      case 'extractFunctionDescription':
        return this.extractFunctionDescription(content);
      
      case 'analyzeComplexity':
        return this.analyzeComplexity(content);
      
      default:
        return undefined;
    }
  }

  /**
   * 패턴으로 추출
   */
  private extractByPatterns(content: string, patterns: RegExp[]): any {
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return matches[1] || matches[0];
      }
    }
    return undefined;
  }

  /**
   * 코드 분석으로 추출
   */
  private extractByCodeAnalysis(filePath: string, content: string, analysis: { type: string; parser: string }): any {
    if (analysis.parser === 'typescript') {
      switch (analysis.type) {
        case 'imports':
          return this.extractImports(content);
        case 'exports':
          return this.extractExports(content);
        case 'functions':
          return this.extractFunctions(content);
        case 'todos':
          return this.extractTodos(content);
        case 'dependencies':
          return this.extractDependencies(content);
        default:
          return undefined;
      }
    }
    return undefined;
  }

  /**
   * 변환 규칙 적용
   */
  private applyTransformationRules(value: any, rules: any): any {
    // 매핑 적용
    if (rules.mappings && typeof value === 'string') {
      const mapped = rules.mappings[value.toLowerCase()];
      if (mapped) {
        value = mapped;
      }
    }

    // 유효성 검사
    if (rules.validation && typeof value === 'string') {
      if (!rules.validation.test(value)) {
        return undefined; // 유효하지 않으면 undefined 반환
      }
    }

    return value;
  }

  /**
   * Notion ID 추출
   */
  private extractNotionId(filePath: string, content: string): string | undefined {
    const ext = path.extname(filePath);
    
    if (ext === '.md') {
      // Markdown: front matter에서 추출
      try {
        const parsed = matter(content);
        return parsed.data.notionId || parsed.data.notion_id;
      } catch {
        return undefined;
      }
    } else {
      // 코드 파일: 주석에서 추출
      const patterns = [
        /\/\*\s*notion-id:\s*([a-f0-9-]+)\s*\*\//i,
        /\/\/\s*notion-id:\s*([a-f0-9-]+)/i,
        /#\s*notion-id:\s*([a-f0-9-]+)/i // Python 등
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  // ===== 구체적인 추출 함수들 =====

  private extractDocumentTitle(content: string, filePath: string): string {
    // 1. Front matter에서 title 확인
    try {
      const parsed = matter(content);
      if (parsed.data.title) {
        return parsed.data.title;
      }
    } catch {}

    // 2. 첫 번째 H1 헤딩 확인
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      return h1Match[1];
    }

    // 3. 파일명 사용
    return path.basename(filePath, path.extname(filePath));
  }

  private determineDocumentType(filePath: string, content: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('readme')) return 'README';
    if (fileName.includes('api')) return 'API Documentation';
    if (fileName.includes('guide')) return 'User Guide';
    if (fileName.includes('spec')) return 'Technical Spec';
    if (fileName.includes('tutorial')) return 'Tutorial';
    if (fileName.includes('changelog') || fileName.includes('changes')) return 'Changelog';
    
    return 'Other';
  }

  private extractContentPreview(content: string): string {
    try {
      const parsed = matter(content);
      const bodyContent = parsed.content;
      
      // HTML 태그 제거 및 텍스트 정리
      const cleanContent = bodyContent
        .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
        .replace(/`[^`]+`/g, '') // 인라인 코드 제거
        .replace(/[#*_~`]/g, '') // 마크다운 문법 제거
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 링크 텍스트만 추출
        .replace(/\s+/g, ' ') // 공백 정리
        .trim();

      // 처음 200자만 반환
      return cleanContent.substring(0, 200);
    } catch {
      return '';
    }
  }

  private extractPriority(content: string): string | undefined {
    try {
      const parsed = matter(content);
      return parsed.data.priority;
    } catch {
      return undefined;
    }
  }

  private extractTags(content: string): string[] {
    try {
      const parsed = matter(content);
      if (Array.isArray(parsed.data.tags)) {
        return parsed.data.tags;
      }
      if (typeof parsed.data.tags === 'string') {
        return parsed.data.tags.split(',').map(tag => tag.trim());
      }
    } catch {}
    
    return [];
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // 중복 제거
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private extractFunctions(content: string): string[] {
    const functions: string[] = [];
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*:\s*[^=]+=|\([^)]*\)\s*{)|class\s+(\w+))/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName) {
        functions.push(functionName);
      }
    }

    return functions;
  }

  private extractTodos(content: string): string[] {
    const todos: string[] = [];
    const todoRegex = /(?:\/\/|#|\*)\s*TODO:?\s*(.+)$/gm;

    let match;
    while ((match = todoRegex.exec(content)) !== null) {
      todos.push(match[1].trim());
    }

    return todos;
  }

  private extractDependencies(content: string): string[] {
    // import문에서 의존성 추출 (상대 경로만)
    const dependencies: string[] = [];
    const relativeImportRegex = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;

    let match;
    while ((match = relativeImportRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  private analyzeFunctionType(content: string, filePath: string): string {
    if (content.includes('class ')) return 'Class';
    if (content.includes('React.') || content.includes('jsx') || content.includes('tsx')) return 'Component';
    if (content.includes('use') && content.includes('Hook')) return 'Hook';
    if (content.includes('Service')) return 'Service';
    if (content.includes('util') || content.includes('helper')) return 'Utility';
    
    return 'Function';
  }

  private extractFunctionParameters(content: string): string {
    const paramRegex = /function\s+\w+\s*\(([^)]*)\)|const\s+\w+\s*=\s*\(([^)]*)\)\s*=>/;
    const match = content.match(paramRegex);
    
    return match ? (match[1] || match[2] || '').trim() : '';
  }

  private extractReturnType(content: string): string {
    const returnTypeRegex = /:\s*([^{=]+)\s*[{=]/;
    const match = content.match(returnTypeRegex);
    
    return match ? match[1].trim() : '';
  }

  private extractFunctionDescription(content: string): string {
    const jsdocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//;
    const match = content.match(jsdocRegex);
    
    if (match && match[1]) {
      return match[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim();
    }
    
    return '';
  }

  private analyzeComplexity(content: string): string {
    // 간단한 복잡도 분석
    const lines = content.split('\n').length;
    const conditions = (content.match(/if|while|for|switch|catch/g) || []).length;
    const functions = (content.match(/function|=>/g) || []).length;

    const complexity = (lines / 10) + (conditions * 2) + functions;

    if (complexity > 50) return 'Complex';
    if (complexity > 20) return 'Medium';
    return 'Simple';
  }

  private fileExists(filePath: string): boolean {
    try {
      statSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
}