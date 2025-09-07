/**
 * Code Upload Service - 코드 파싱 및 업로드 서비스
 * 소스코드를 분석하고 Notion 데이터베이스에 업로드
 */

import { readFileSync, statSync } from 'fs';
import { basename, extname, relative } from 'path';
import { Client } from '@notionhq/client';
import { logger, stringUtils, pathUtils } from '../../shared/utils/index.js';
import { AliasResolver } from '../../shared/utils/aliasResolver.js';
import { ConfigManager } from '../infrastructure/config/configManager.js';

export interface CodeFile {
  /** 파일 경로 */
  filePath: string;
  /** 파일 내용 */
  content: string;
  /** 파일 정보 */
  stats: {
    size: number;
    lastModified: Date;
    lines: number;
  };
  /** 파싱된 정보 */
  parsed: {
    imports: ImportInfo[];
    exports: ExportInfo[];
    functions: FunctionInfo[];
    classes: ClassInfo[];
    types: TypeInfo[];
  };
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  type: 'default' | 'named' | 'namespace';
  line: number;
  resolved?: string;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named';
  line: number;
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  line: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  line: number;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  line: number;
}

export interface TypeInfo {
  name: string;
  type: 'interface' | 'type' | 'enum';
  line: number;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
  stats: {
    filesUploaded: number;
    functionsFound: number;
    importsFound: number;
    errors: number;
  };
}

export interface CodeUploadOptions {
  /** 업로드할 파일 패턴 */
  patterns: string[];
  /** 제외할 패턴 */
  excludePatterns: string[];
  /** 최대 파일 크기 */
  maxFileSize: number;
  /** 콘텐츠 포함 여부 */
  includeContent: boolean;
  /** 의존성 해결 여부 */
  resolveDependencies: boolean;
}

/**
 * 코드 업로드 서비스
 */
export class CodeUploadService {
  private notion: Client;
  private configManager: ConfigManager;
  private aliasResolver: AliasResolver;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.configManager = ConfigManager.getInstance();
    this.aliasResolver = new AliasResolver({ projectRoot: projectPath });
    
    // Notion 클라이언트 초기화는 나중에 설정 로드 후
    this.notion = new Client({ auth: '' });
  }

  /**
   * 초기화 - 설정 로드 및 Notion 클라이언트 설정
   */
  async initialize(): Promise<void> {
    try {
      const config = await this.configManager.loadConfig(this.projectPath);
      
      if (!config.apiKey) {
        throw new Error('Notion API 키가 설정되지 않았습니다.');
      }

      this.notion = new Client({ auth: config.apiKey });
      logger.success('CodeUploadService 초기화 완료');
      
    } catch (error) {
      logger.error(`초기화 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 코드 파일 업로드
   */
  async uploadCodeFiles(
    filePaths: string[],
    options: Partial<CodeUploadOptions> = {}
  ): Promise<UploadResult> {
    const defaultOptions: CodeUploadOptions = {
      patterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      excludePatterns: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      includeContent: true,
      resolveDependencies: true
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const stats = {
      filesUploaded: 0,
      functionsFound: 0,
      importsFound: 0,
      errors: 0
    };

    logger.info(`코드 파일 업로드 시작: ${filePaths.length}개 파일`, '🚀');

    try {
      const config = await this.configManager.loadConfig(this.projectPath);
      const filesDbId = config.databases?.files;

      if (!filesDbId) {
        throw new Error('Files 데이터베이스가 설정되지 않았습니다. init schema를 먼저 실행하세요.');
      }

      for (const filePath of filePaths) {
        try {
          // 파일 필터링
          if (!this.shouldProcessFile(filePath, mergedOptions)) {
            continue;
          }

          // 파일 파싱
          const codeFile = await this.parseCodeFile(filePath, mergedOptions);
          
          // Notion 페이지 생성
          const pageId = await this.createNotionPage(filesDbId, codeFile);
          
          stats.filesUploaded++;
          stats.functionsFound += codeFile.parsed.functions.length;
          stats.importsFound += codeFile.parsed.imports.length;
          
          logger.info(`업로드 완료: ${relative(this.projectPath, filePath)}`, '✅');

        } catch (error) {
          stats.errors++;
          logger.error(`파일 업로드 실패: ${filePath} - ${error}`);
        }
      }

      logger.success(`코드 파일 업로드 완료: ${stats.filesUploaded}/${filePaths.length}개 성공`);

      return {
        success: stats.errors === 0,
        stats
      };

    } catch (error) {
      logger.error(`업로드 프로세스 실패: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stats
      };
    }
  }

  /**
   * 코드 파일 파싱
   */
  private async parseCodeFile(
    filePath: string,
    options: CodeUploadOptions
  ): Promise<CodeFile> {
    const content = readFileSync(filePath, 'utf8');
    const stats = statSync(filePath);
    
    const codeFile: CodeFile = {
      filePath,
      content,
      stats: {
        size: stats.size,
        lastModified: stats.mtime,
        lines: content.split('\n').length
      },
      parsed: {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        types: []
      }
    };

    // 파싱 수행
    await this.parseImports(codeFile, options);
    await this.parseExports(codeFile);
    await this.parseFunctions(codeFile);
    await this.parseClasses(codeFile);
    await this.parseTypes(codeFile);

    return codeFile;
  }

  /**
   * Import 구문 파싱
   */
  private async parseImports(codeFile: CodeFile, options: CodeUploadOptions): Promise<void> {
    const lines = codeFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // import 문 매칭
      const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        const [, importPart, source] = importMatch;
        const specifiers = this.parseImportSpecifiers(importPart);
        
        const importInfo: ImportInfo = {
          source,
          specifiers,
          type: this.determineImportType(importPart),
          line: i + 1
        };

        // 의존성 해결
        if (options.resolveDependencies) {
          try {
            const resolved = await this.aliasResolver.resolveModule(source, codeFile.filePath);
            if (resolved) {
              importInfo.resolved = resolved.resolvedPath;
            }
          } catch {
            // 해결 실패는 무시
          }
        }

        codeFile.parsed.imports.push(importInfo);
      }

      // require 문 매칭
      const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"`]([^'"`]+)['"`]\)/);
      if (requireMatch) {
        const [, importPart, source] = requireMatch;
        
        codeFile.parsed.imports.push({
          source,
          specifiers: [importPart.trim()],
          type: 'default',
          line: i + 1
        });
      }
    }
  }

  /**
   * Export 구문 파싱
   */
  private async parseExports(codeFile: CodeFile): Promise<void> {
    const lines = codeFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // export default
      const defaultExportMatch = line.match(/^export\s+default\s+(.+)/);
      if (defaultExportMatch) {
        codeFile.parsed.exports.push({
          name: 'default',
          type: 'default',
          line: i + 1
        });
      }

      // export named
      const namedExportMatch = line.match(/^export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/);
      if (namedExportMatch) {
        codeFile.parsed.exports.push({
          name: namedExportMatch[1],
          type: 'named',
          line: i + 1
        });
      }

      // export { }
      const exportListMatch = line.match(/^export\s*\{\s*([^}]+)\s*\}/);
      if (exportListMatch) {
        const exports = exportListMatch[1].split(',').map(exp => exp.trim());
        exports.forEach(exportName => {
          codeFile.parsed.exports.push({
            name: exportName,
            type: 'named',
            line: i + 1
          });
        });
      }
    }
  }

  /**
   * 함수 파싱
   */
  private async parseFunctions(codeFile: CodeFile): Promise<void> {
    const lines = codeFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // function 선언
      const functionMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/);
      if (functionMatch) {
        const [, name, params, returnType] = functionMatch;
        
        codeFile.parsed.functions.push({
          name,
          parameters: this.parseParameters(params),
          returnType: returnType?.trim(),
          line: i + 1,
          complexity: this.calculateComplexity(lines, i)
        });
      }

      // arrow function
      const arrowMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
      if (arrowMatch) {
        const [, name] = arrowMatch;
        
        codeFile.parsed.functions.push({
          name,
          parameters: [],
          line: i + 1,
          complexity: this.calculateComplexity(lines, i)
        });
      }
    }
  }

  /**
   * 클래스 파싱
   */
  private async parseClasses(codeFile: CodeFile): Promise<void> {
    const lines = codeFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(/^(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
      if (classMatch) {
        const [, name, extendsClass, implementsInterfaces] = classMatch;
        
        codeFile.parsed.classes.push({
          name,
          extends: extendsClass,
          implements: implementsInterfaces?.split(',').map(i => i.trim()),
          methods: [],
          properties: [],
          line: i + 1
        });
      }
    }
  }

  /**
   * 타입 파싱
   */
  private async parseTypes(codeFile: CodeFile): Promise<void> {
    const lines = codeFile.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // interface
      const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        codeFile.parsed.types.push({
          name: interfaceMatch[1],
          type: 'interface',
          line: i + 1
        });
      }

      // type
      const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        codeFile.parsed.types.push({
          name: typeMatch[1],
          type: 'type',
          line: i + 1
        });
      }

      // enum
      const enumMatch = line.match(/^(?:export\s+)?enum\s+(\w+)/);
      if (enumMatch) {
        codeFile.parsed.types.push({
          name: enumMatch[1],
          type: 'enum',
          line: i + 1
        });
      }
    }
  }

  /**
   * Notion 페이지 생성
   */
  private async createNotionPage(
    databaseId: string,
    codeFile: CodeFile
  ): Promise<string> {
    const relativePath = relative(this.projectPath, codeFile.filePath);
    const extension = extname(codeFile.filePath);
    
    const properties: any = {
      'File Path': {
        title: [{ text: { content: relativePath } }]
      },
      'Extension': {
        select: { name: extension || '.unknown' }
      },
      'Size (bytes)': {
        number: codeFile.stats.size
      },
      'Last Modified': {
        date: { start: codeFile.stats.lastModified.toISOString().split('T')[0] }
      },
      'Status': {
        select: { name: 'Uploaded' }
      },
      'Project': {
        select: { name: 'dependency-linker' }
      },
      'Lines': {
        number: codeFile.stats.lines
      }
    };

    // 콘텐츠 추가 (요약된 형태)
    const contentSummary = this.generateContentSummary(codeFile);
    properties['Content'] = {
      rich_text: [{ text: { content: stringUtils.truncate(contentSummary, 2000) } }]
    };

    const response = await this.notion.pages.create({
      parent: { database_id: databaseId },
      properties
    });

    return response.id;
  }

  /**
   * 파일 처리 여부 확인
   */
  private shouldProcessFile(filePath: string, options: CodeUploadOptions): boolean {
    const stats = statSync(filePath);
    
    // 파일 크기 확인
    if (stats.size > options.maxFileSize) {
      logger.warning(`파일 크기 초과: ${filePath} (${stats.size} bytes)`);
      return false;
    }

    // 확장자 확인
    const extension = extname(filePath);
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    
    if (!supportedExtensions.includes(extension)) {
      return false;
    }

    // 제외 패턴 확인
    for (const pattern of options.excludePatterns) {
      if (filePath.includes(pattern.replace('**/', '').replace('/*', ''))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Import 스펙 파싱
   */
  private parseImportSpecifiers(importPart: string): string[] {
    // 간단한 파싱 (실제로는 더 복잡한 로직 필요)
    if (importPart.includes('{')) {
      const namedImports = importPart.match(/\{([^}]+)\}/)?.[1];
      if (namedImports) {
        return namedImports.split(',').map(imp => imp.trim());
      }
    }
    
    return [importPart.trim()];
  }

  /**
   * Import 타입 결정
   */
  private determineImportType(importPart: string): 'default' | 'named' | 'namespace' {
    if (importPart.includes('*')) return 'namespace';
    if (importPart.includes('{')) return 'named';
    return 'default';
  }

  /**
   * 매개변수 파싱
   */
  private parseParameters(paramsStr: string): ParameterInfo[] {
    if (!paramsStr.trim()) return [];
    
    return paramsStr.split(',').map(param => {
      const trimmed = param.trim();
      const optional = trimmed.includes('?');
      const [name, type] = trimmed.split(':').map(s => s.trim());
      
      return {
        name: name.replace('?', ''),
        type: type,
        optional
      };
    });
  }

  /**
   * 복잡도 계산
   */
  private calculateComplexity(lines: string[], startLine: number): 'low' | 'medium' | 'high' {
    let complexity = 0;
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startLine; i < lines.length && i < startLine + 50; i++) {
      const line = lines[i];
      
      if (line.includes('{')) {
        braceCount++;
        if (!inFunction) inFunction = true;
      }
      if (line.includes('}')) {
        braceCount--;
        if (braceCount === 0 && inFunction) break;
      }
      
      if (inFunction) {
        if (line.includes('if') || line.includes('for') || line.includes('while')) complexity++;
        if (line.includes('switch') || line.includes('case')) complexity++;
        if (line.includes('try') || line.includes('catch')) complexity++;
      }
    }
    
    if (complexity < 3) return 'low';
    if (complexity < 8) return 'medium';
    return 'high';
  }

  /**
   * 콘텐츠 요약 생성
   */
  private generateContentSummary(codeFile: CodeFile): string {
    const summary = [];
    
    if (codeFile.parsed.imports.length > 0) {
      summary.push(`Imports: ${codeFile.parsed.imports.map(imp => imp.source).join(', ')}`);
    }
    
    if (codeFile.parsed.exports.length > 0) {
      summary.push(`Exports: ${codeFile.parsed.exports.map(exp => exp.name).join(', ')}`);
    }
    
    if (codeFile.parsed.functions.length > 0) {
      summary.push(`Functions: ${codeFile.parsed.functions.map(fn => fn.name).join(', ')}`);
    }
    
    if (codeFile.parsed.classes.length > 0) {
      summary.push(`Classes: ${codeFile.parsed.classes.map(cls => cls.name).join(', ')}`);
    }
    
    return summary.join('\n');
  }
}

export default CodeUploadService;