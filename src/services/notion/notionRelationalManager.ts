/**
 * Notion 관계형 데이터 관리자
 * Notion Relational Data Manager
 */

import { 
  type LanguageAnalysisResult, 
  type DependencyInfo, 
  type FunctionInfo, 
  type ClassInfo 
} from '../parsers';
import { type IndexedFile } from '../analysis/analysisIndexManager';
import { Client } from '@notionhq/client';

// Notion MCP를 통해 페이지와 데이터베이스 작업을 수행한다고 가정
// 실제 구현에서는 MCP 툴을 사용할 것

export interface NotionDatabase {
  id: string;
  name: string;
  url: string;
  properties: { [key: string]: any };
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  databaseId?: string;
  properties: { [key: string]: any };
  content?: string;
}

export interface FileRelationshipData {
  fileInfo: IndexedFile;
  dependencies: DependencyInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  relatedFiles: string[];
  metrics: any;
}

export class NotionRelationalManager {
  private databaseCache: Map<string, NotionDatabase> = new Map();
  private pageCache: Map<string, NotionPage> = new Map();
  private mockMode: boolean = true; // 기본적으로 Mock 모드
  private client?: Client;
  
  // 데이터베이스 ID 상수들 (설정에서 관리되어야 함)
  private readonly DATABASE_IDS = {
    FILES: process.env.NOTION_FILES_DB_ID || '',
    DEPENDENCIES: process.env.NOTION_DEPENDENCIES_DB_ID || '',
    FUNCTIONS: process.env.NOTION_FUNCTIONS_DB_ID || '',
    CLASSES: process.env.NOTION_CLASSES_DB_ID || '',
    RELATIONSHIPS: process.env.NOTION_RELATIONSHIPS_DB_ID || '',
  };

  constructor() {
    this.validateConfiguration();
  }

  /**
   * Mock 모드 설정
   */
  setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
    console.log(`🔧 Mock mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 설정 검증
   */
  private validateConfiguration(): void {
    const requiredDbs = Object.entries(this.DATABASE_IDS);
    const missing = requiredDbs.filter(([name, id]) => !id);
    
    if (missing.length > 0) {
      console.warn('Missing Notion database IDs:', missing.map(([name]) => name));
    }
  }

  /**
   * 파일 분석 결과를 Notion에 관계형으로 저장
   */
  async storeAnalysisToNotion(
    analysisResult: LanguageAnalysisResult,
    fileData: IndexedFile
  ): Promise<string> {
    try {
      // 1. 파일 페이지 생성/업데이트
      const filePageId = await this.createOrUpdateFilePage(analysisResult, fileData);
      
      // 2. Dependencies 저장
      await this.storeDependenciesToNotion(filePageId, analysisResult.dependencies);
      
      // 3. Functions 저장
      await this.storeFunctionsToNotion(filePageId, analysisResult.functions);
      
      // 4. Classes 저장
      await this.storeClassesToNotion(filePageId, analysisResult.classes);
      
      // 5. 파일 간 관계 생성
      await this.createFileRelationships(filePageId, analysisResult);
      
      return filePageId;
    } catch (error) {
      console.error('Failed to store analysis to Notion:', error);
      throw error;
    }
  }

  /**
   * 파일 페이지 생성/업데이트
   */
  private async createOrUpdateFilePage(
    analysisResult: LanguageAnalysisResult,
    fileData: IndexedFile
  ): Promise<string> {
    const fileContent = this.generateFilePageContent(analysisResult, fileData);
    
    const pageProperties = {
      title: this.getFileName(analysisResult.filePath),
      'File Path': analysisResult.filePath,
      'Language': analysisResult.language,
      'Parser Version': analysisResult.parserVersion,
      'Analysis Time': analysisResult.analysisTime,
      'Lines of Code': analysisResult.metrics.linesOfCode,
      'Complexity': analysisResult.metrics.complexity,
      'Dependencies Count': analysisResult.dependencies.length,
      'Functions Count': analysisResult.functions.length,
      'Classes Count': analysisResult.classes.length,
      'Last Modified': fileData.lastModified ? new Date(fileData.lastModified * 1000).toISOString() : new Date().toISOString(),
      'Status': 'Analyzed'
    };

    // 기존 페이지가 있는지 확인
    if (fileData.notionId) {
      return await this.updateNotionPage(fileData.notionId, pageProperties, fileContent);
    } else {
      return await this.createNotionPage(this.DATABASE_IDS.FILES, pageProperties, fileContent);
    }
  }

  /**
   * Dependencies를 Notion에 저장
   */
  private async storeDependenciesToNotion(filePageId: string, dependencies: DependencyInfo[]): Promise<void> {
    if (!this.DATABASE_IDS.DEPENDENCIES || dependencies.length === 0) return;

    const dependencyPages = dependencies.map(dep => ({
      properties: {
        'title': dep.source,
        'Source File': {
          relation: [{ id: filePageId }]
        },
        'Dependency Type': dep.type,
        'Source Path': dep.source,
        'Is Local': dep.isLocal,
        'Is Dynamic': dep.isDynamic,
        'Location': `${dep.location.line}:${dep.location.column}`,
        'Resolved Path': dep.resolved || '',
        'Version': dep.version || '',
        'Import Type': dep.metadata?.importType || '',
        'Members': dep.metadata?.members ? dep.metadata.members.join(', ') : '',
        'Alias': dep.metadata?.alias || ''
      }
    }));

    await this.batchCreateNotionPages(this.DATABASE_IDS.DEPENDENCIES, dependencyPages);
  }

  /**
   * Functions를 Notion에 저장
   */
  private async storeFunctionsToNotion(filePageId: string, functions: FunctionInfo[]): Promise<void> {
    if (!this.DATABASE_IDS.FUNCTIONS || functions.length === 0) return;

    const functionPages = functions.map(func => ({
      properties: {
        'title': func.name,
        'Source File': {
          relation: [{ id: filePageId }]
        },
        'Function Type': func.type,
        'Return Type': func.returnType || '',
        'Parameters': func.params.map(p => p.name).join(', '),
        'Is Async': func.isAsync,
        'Is Generator': func.isGenerator,
        'Is Exported': func.isExported,
        'Visibility': func.visibility || '',
        'Location': `${func.location.line}:${func.location.column}`,
        'Complexity': func.complexity || 0,
        'Decorators': func.decorators ? func.decorators.join(', ') : ''
      },
      content: this.generateFunctionContent(func)
    }));

    await this.batchCreateNotionPages(this.DATABASE_IDS.FUNCTIONS, functionPages);
  }

  /**
   * Classes를 Notion에 저장
   */
  private async storeClassesToNotion(filePageId: string, classes: ClassInfo[]): Promise<void> {
    if (!this.DATABASE_IDS.CLASSES || classes.length === 0) return;

    const classPages = classes.map(cls => ({
      properties: {
        'title': cls.name,
        'Source File': {
          relation: [{ id: filePageId }]
        },
        'Extends': cls.extends || '',
        'Implements': cls.implements ? cls.implements.join(', ') : '',
        'Is Exported': cls.isExported,
        'Is Abstract': cls.isAbstract,
        'Visibility': cls.visibility || '',
        'Location': `${cls.location.line}:${cls.location.column}`,
        'Methods Count': cls.methods.length,
        'Properties Count': cls.properties.length,
        'Decorators': cls.decorators ? cls.decorators.join(', ') : ''
      },
      content: this.generateClassContent(cls)
    }));

    await this.batchCreateNotionPages(this.DATABASE_IDS.CLASSES, classPages);
  }

  /**
   * 파일 간 관계 생성
   */
  private async createFileRelationships(filePageId: string, analysisResult: LanguageAnalysisResult): Promise<void> {
    if (!this.DATABASE_IDS.RELATIONSHIPS) return;

    // Local dependencies에서 관계 추출
    const localDependencies = analysisResult.dependencies
      .filter(dep => dep.isLocal && dep.resolved)
      .map(dep => dep.resolved!);

    for (const depPath of localDependencies) {
      await this.createRelationship(filePageId, analysisResult.filePath, depPath, 'depends_on');
    }

    // Export relationships도 생성 (다른 파일에서 이 파일을 import하는 경우)
    if (analysisResult.exports.length > 0) {
      await this.createExportRelationships(filePageId, analysisResult);
    }
  }

  /**
   * 관계 생성
   */
  private async createRelationship(
    sourcePageId: string, 
    sourcePath: string, 
    targetPath: string, 
    relationshipType: string
  ): Promise<void> {
    // 대상 파일의 Notion 페이지 ID 찾기
    const targetPageId = await this.findFilePageByPath(targetPath);
    if (!targetPageId) return;

    const relationshipPage = {
      properties: {
        'title': `${this.getFileName(sourcePath)} → ${this.getFileName(targetPath)}`,
        'Source File': {
          relation: [{ id: sourcePageId }]
        },
        'Target File': {
          relation: [{ id: targetPageId }]
        },
        'Relationship Type': relationshipType,
        'Source Path': sourcePath,
        'Target Path': targetPath,
        'Created': new Date().toISOString()
      }
    };

    await this.createNotionPage(this.DATABASE_IDS.RELATIONSHIPS, relationshipPage.properties);
  }

  /**
   * Export 관계 생성
   */
  private async createExportRelationships(filePageId: string, analysisResult: LanguageAnalysisResult): Promise<void> {
    // 이 부분은 전체 프로젝트 분석을 통해 역관계를 찾아야 함
    // 현재는 단일 파일 분석이므로 스킵
  }

  /**
   * 파일 경로로 Notion 페이지 ID 찾기
   */
  private async findFilePageByPath(filePath: string): Promise<string | null> {
    // 실제 구현에서는 Notion search API 또는 database query 사용
    // 여기서는 모의 구현
    return null;
  }

  /**
   * 페이지 콘텐츠 생성
   */
  private generateFilePageContent(analysisResult: LanguageAnalysisResult, fileData: IndexedFile): string {
    const sections = [
      '# File Analysis Report',
      '',
      '## Basic Information',
      `- **File Path**: ${analysisResult.filePath}`,
      `- **Language**: ${analysisResult.language}`,
      `- **Parser Version**: ${analysisResult.parserVersion}`,
      `- **Analysis Time**: ${analysisResult.analysisTime}ms`,
      '',
      '## Metrics',
      `- **Lines of Code**: ${analysisResult.metrics.linesOfCode}`,
      `- **Comment Lines**: ${analysisResult.metrics.commentLines}`,
      `- **Complexity**: ${analysisResult.metrics.complexity}`,
      `- **Maintainability Index**: ${analysisResult.metrics.maintainabilityIndex}`,
      '',
      '## Dependencies',
      ...analysisResult.dependencies.map(dep => `- \`${dep.source}\` (${dep.type})`),
      '',
      '## Functions',
      ...analysisResult.functions.map(func => `- \`${func.name}\` (${func.type})`),
      '',
      '## Classes',
      ...analysisResult.classes.map(cls => `- \`${cls.name}\``),
    ];

    if (analysisResult.todos.length > 0) {
      sections.push(
        '',
        '## TODOs',
        ...analysisResult.todos.map(todo => `- **${todo.type}**: ${todo.content}`)
      );
    }

    return sections.join('\n');
  }

  /**
   * Function 콘텐츠 생성
   */
  private generateFunctionContent(func: FunctionInfo): string {
    const sections = [
      `# Function: ${func.name}`,
      '',
      '## Details',
      `- **Type**: ${func.type}`,
      `- **Parameters**: ${func.params.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}`,
      `- **Return Type**: ${func.returnType || 'void'}`,
      `- **Location**: Line ${func.location.line}:${func.location.column}`,
      '',
      '## Characteristics',
      `- **Async**: ${func.isAsync ? 'Yes' : 'No'}`,
      `- **Generator**: ${func.isGenerator ? 'Yes' : 'No'}`,
      `- **Exported**: ${func.isExported ? 'Yes' : 'No'}`,
      `- **Visibility**: ${func.visibility || 'public'}`
    ];

    if (func.decorators && func.decorators.length > 0) {
      sections.push(
        '',
        '## Decorators',
        ...func.decorators.map(dec => `- ${dec}`)
      );
    }

    return sections.join('\n');
  }

  /**
   * Class 콘텐츠 생성
   */
  private generateClassContent(cls: ClassInfo): string {
    const sections = [
      `# Class: ${cls.name}`,
      '',
      '## Details',
      `- **Location**: Line ${cls.location.line}:${cls.location.column}`,
      `- **Exported**: ${cls.isExported ? 'Yes' : 'No'}`,
      `- **Abstract**: ${cls.isAbstract ? 'Yes' : 'No'}`,
    ];

    if (cls.extends) {
      sections.push(`- **Extends**: ${cls.extends}`);
    }

    if (cls.implements && cls.implements.length > 0) {
      sections.push(`- **Implements**: ${cls.implements.join(', ')}`);
    }

    if (cls.methods.length > 0) {
      sections.push(
        '',
        '## Methods',
        ...cls.methods.map(method => `- \`${method.name}\` (${method.type})`)
      );
    }

    if (cls.properties.length > 0) {
      sections.push(
        '',
        '## Properties',
        ...cls.properties.map(prop => `- \`${prop.name}: ${prop.type || 'any'}\``)
      );
    }

    return sections.join('\n');
  }

  /**
   * 파일명 추출
   */
  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Notion 페이지 생성 (모의 구현 - 실제로는 MCP 툴 사용)
   */
  private async createNotionPage(databaseId: string, properties: any, content?: string): Promise<string> {
    if (this.mockMode) {
      // Mock 모드에서는 시뮬레이션
      console.log('Creating Notion page:', { databaseId, properties, content: content?.substring(0, 100) });
      return 'mock-page-id-' + Date.now();
    }

    // 실제 Notion API 사용
    try {
      if (!databaseId) {
        throw new Error('Database ID is required for page creation');
      }

      const pageData = {
        parent: { database_id: databaseId },
        properties: this.formatPropertiesForNotion(properties),
        children: content ? this.parseContentToBlocks(content) : []
      };

      // Notion Client 초기화 (필요시)
      if (!this.client) {
        this.client = new Client({ auth: process.env.NOTION_API_KEY });
      }

      const response = await this.client.pages.create(pageData as any);
      const pageId = response.id;
      
      console.log(`✅ Created Notion page: ${pageId}`);
      return pageId;
      
    } catch (error) {
      console.error('❌ Failed to create Notion page:', error);
      throw error;
    }
  }

  /**
   * Notion 페이지 업데이트 (모의 구현)
   */
  private async updateNotionPage(pageId: string, properties: any, content?: string): Promise<string> {
    // 실제 구현에서는 mcp__notion__notion-update-page 툴 사용
    console.log('Updating Notion page:', { pageId, properties, content: content?.substring(0, 100) });
    return pageId;
  }

  /**
   * 배치 페이지 생성 (모의 구현)
   */
  private async batchCreateNotionPages(databaseId: string, pages: any[]): Promise<void> {
    console.log(`Batch creating ${pages.length} pages in database ${databaseId}`);
    // 실제로는 여러 개의 create-pages 호출을 배치로 처리
  }

  /**
   * 데이터베이스 정보 캐시
   */
  async cacheNotionDatabases(): Promise<void> {
    // 실제 구현에서는 각 데이터베이스의 스키마 정보를 캐시
    for (const [name, id] of Object.entries(this.DATABASE_IDS)) {
      if (id) {
        // mcp__notion__fetch 툴로 데이터베이스 정보 조회
        console.log(`Caching database info: ${name} (${id})`);
      }
    }
  }

  /**
   * 관계형 데이터 쿼리
   */
  async queryRelationalData(query: {
    type: 'dependencies' | 'functions' | 'classes' | 'relationships';
    filters?: any;
    sorts?: any;
  }): Promise<any[]> {
    // 실제 구현에서는 Notion database query API 사용
    console.log('Querying relational data:', query);
    return [];
  }

  /**
   * Notion API에 맞는 속성 형식으로 변환
   */
  private formatPropertiesForNotion(properties: any): any {
    const formatted: any = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (key === 'title') {
        formatted[key] = {
          title: [{ text: { content: String(value) } }]
        };
      } else if (typeof value === 'string') {
        formatted[key] = {
          rich_text: [{ text: { content: value } }]
        };
      } else if (typeof value === 'number') {
        formatted[key] = {
          number: value
        };
      } else if (value instanceof Date || typeof value === 'string' && value.includes('T')) {
        formatted[key] = {
          date: { start: new Date(value).toISOString() }
        };
      } else {
        // 기본적으로 텍스트로 처리
        formatted[key] = {
          rich_text: [{ text: { content: String(value) } }]
        };
      }
    }
    
    return formatted;
  }

  /**
   * 컨텐츠를 Notion 블록으로 변환
   */
  private parseContentToBlocks(content: string): any[] {
    // 간단한 마크다운 → Notion 블록 변환
    const blocks: any[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: line.replace('# ', '') } }]
          }
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: line.replace('## ', '') } }]
          }
        });
      } else if (line.startsWith('- ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: line.replace('- ', '') } }]
          }
        });
      } else if (line.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: line } }]
          }
        });
      }
    }
    
    return blocks;
  }
}

// 싱글톤 인스턴스
export const notionRelationalManager = new NotionRelationalManager();