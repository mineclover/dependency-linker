/**
 * Initialization Service - Service Layer
 * 프로젝트 초기화 서비스
 */

import { FileSystemExplorer } from '../infrastructure/filesystem/explorer.js';
import type { WorkspaceConfig, CommandResult } from '../shared/types/index.js';
import type { IConfigurationService } from '../domain/interfaces/IConfigurationService.js';
import { logger } from '../shared/utils/index.js';
import prompts from 'prompts';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { Client } from '@notionhq/client';
import type { PropertyConfigurationRequest } from '@notionhq/client/build/src/api-endpoints';
import { SchemaUpdateService } from './schemaUpdateService.js';

export interface ProjectInitOptions {
  force?: boolean;
  projectPath?: string;
}

export interface WorkspaceInitOptions {
  apiKey?: string;
  workspaceUrl?: string;
  parentPageId?: string;
}

export interface SchemaInitOptions {
  template?: string;
  databases?: string[];
  force?: boolean;
}

/**
 * 초기화 서비스
 */
export class InitializationService {
  private configService: IConfigurationService;
  private fileExplorer: FileSystemExplorer;
  private projectPath: string;

  constructor(configService: IConfigurationService, projectPath: string = process.cwd()) {
    this.projectPath = path.resolve(projectPath);
    this.configService = configService;
    this.fileExplorer = new FileSystemExplorer(this.projectPath);
  }

  /**
   * 프로젝트 초기화
   */
  async initializeProject(options: ProjectInitOptions = {}): Promise<CommandResult> {
    try {
      logger.info('프로젝트 초기화 시작', '🚀');

      // 기존 설정 확인
      const existingConfig = await this.configService.loadAndProcessConfig(this.projectPath);
      if (existingConfig && !options.force) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: '기존 설정이 발견되었습니다. 덮어쓰시겠습니까?',
          initial: false
        });

        if (!overwrite) {
          return {
            success: false,
            message: '초기화가 취소되었습니다.'
          };
        }
      }

      // 프로젝트 정보 수집
      const projectInfo = await this.collectProjectInfo();
      
      // 기본 설정 생성
      const config: WorkspaceConfig = {
        apiKey: '', // 워크스페이스 연결 시 설정
        databases: {},
        projectPath: this.projectPath,
        environment: 'development'
      };

      // 설정 저장
      await this.configService.saveConfig(config, this.projectPath);

      // 프로젝트 디렉토리 구조 확인
      await this.ensureProjectStructure();

      logger.success('프로젝트 초기화 완료');
      return {
        success: true,
        message: '프로젝트가 성공적으로 초기화되었습니다.',
        data: { projectPath: this.projectPath, config }
      };

    } catch (error) {
      logger.error(`프로젝트 초기화 실패: ${error}`);
      return {
        success: false,
        message: `프로젝트 초기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 워크스페이스 초기화
   */
  async initializeWorkspace(options: WorkspaceInitOptions = {}): Promise<CommandResult> {
    try {
      logger.info('Notion 워크스페이스 연결 시작', '🌐');

      // API 키 확인/수집 - 환경변수 우선 확인
      let apiKey = options.apiKey || process.env.NOTION_API_KEY;
      if (!apiKey) {
        const response = await prompts({
          type: 'password',
          name: 'apiKey',
          message: 'Notion API 키를 입력하세요:',
          validate: (value) => value.length > 0 || 'API 키는 필수입니다.'
        });
        apiKey = response.apiKey;
      }

      if (!apiKey) {
        return {
          success: false,
          message: 'API 키가 필요합니다. 환경변수 NOTION_API_KEY를 설정하거나 --api-key 옵션을 사용하세요.'
        };
      }

      // 워크스페이스 URL 수집 - 환경변수에서 우선 확인
      let workspaceUrl = options.workspaceUrl || process.env.NOTION_WORKSPACE_URL;
      if (!workspaceUrl) {
        const response = await prompts({
          type: 'text',
          name: 'workspaceUrl',
          message: '워크스페이스 URL을 입력하세요 (선택사항):',
        });
        workspaceUrl = response.workspaceUrl;
      }

      // 부모 페이지 ID 수집 - 환경변수나 기존 설정에서 우선 확인
      let parentPageId = options.parentPageId || process.env.NOTION_PARENT_PAGE_ID;
      
      // 기존 설정에서 확인
      if (!parentPageId) {
        try {
          const existingConfig = await this.configService.loadAndProcessConfig(this.projectPath);
          parentPageId = existingConfig.parentPageId;
        } catch {}
      }
      
      if (!parentPageId) {
        const response = await prompts({
          type: 'text',
          name: 'parentPageId',
          message: '데이터베이스를 생성할 부모 페이지 ID를 입력하세요:',
          validate: (value) => value.length > 0 || '부모 페이지 ID는 필수입니다.'
        });
        parentPageId = response.parentPageId;
      }

      // 기존 설정 로드 또는 새 설정 생성
      let config: WorkspaceConfig;
      try {
        config = await this.configService.loadAndProcessConfig(this.projectPath);
      } catch {
        config = {
          apiKey: '',
          databases: {},
          projectPath: this.projectPath,
          environment: 'development'
        };
      }

      // 워크스페이스 정보 업데이트
      config.apiKey = apiKey;
      config.parentPageId = parentPageId;
      if (workspaceUrl) {
        // workspaceUrl을 임시로 저장 (타입 호환성을 위해)
        (config as any).workspaceUrl = workspaceUrl;
      }

      // 설정 저장
      await this.configService.saveConfig(config, this.projectPath);

      // Notion 연결 테스트 및 클라이언트 초기화
      try {
        // NotionClient는 현재 Clean Architecture에서 접근 불가하므로
        // 기본 연결 테스트만 수행
        const testClient = new (await import('@notionhq/client')).Client({
          auth: apiKey
        });
        
        // 부모 페이지 존재 확인
        await testClient.pages.retrieve({ page_id: parentPageId });
        logger.success('Notion 연결 테스트 성공');
      } catch (error) {
        logger.warning(`Notion 연결 테스트 실패: ${error}`);
        // 연결 테스트 실패해도 계속 진행 (API 키가 유효할 수 있음)
      }

      logger.success('워크스페이스 연결 완료');
      return {
        success: true,
        message: 'Notion 워크스페이스가 성공적으로 연결되었습니다.',
        data: { apiKey: apiKey.substring(0, 10) + '...', parentPageId, workspaceUrl }
      };

    } catch (error) {
      logger.error(`워크스페이스 초기화 실패: ${error}`);
      return {
        success: false,
        message: `워크스페이스 초기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 스키마 초기화
   */
  async initializeSchema(options: SchemaInitOptions = {}): Promise<CommandResult> {
    try {
      logger.info('데이터베이스 스키마 설정 시작', '📋');

      const template = options.template || 'default';
      
      // 스키마 템플릿 선택
      let selectedDatabases = options.databases;
      if (!selectedDatabases) {
        const { databases } = await prompts({
          type: 'multiselect',
          name: 'databases',
          message: '생성할 데이터베이스를 선택하세요:',
          choices: [
            { title: 'Files - 파일 추적', value: 'files', selected: true },
            { title: 'Documents - 문서 관리', value: 'docs', selected: true },
            { title: 'Functions - 함수/API 추적', value: 'functions', selected: false },
            { title: 'Dependencies - 의존성 그래프', value: 'dependencies', selected: false }
          ]
        });
        selectedDatabases = databases;
      }

      if (!selectedDatabases || selectedDatabases.length === 0) {
        return {
          success: false,
          message: '최소 하나의 데이터베이스를 선택해야 합니다.'
        };
      }

      // 기존 설정 로드 - 환경변수에서도 확인
      let config: WorkspaceConfig;
      try {
        config = await this.configService.loadAndProcessConfig(this.projectPath);
      } catch {
        // 설정 파일이 없는 경우 환경변수에서 로드 시도
        const apiKey = process.env.NOTION_API_KEY;
        const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
        
        if (apiKey && parentPageId) {
          config = {
            apiKey,
            parentPageId,
            databases: {},
            projectPath: this.projectPath,
            environment: 'development'
          };
          logger.info('환경변수에서 설정 로드', '🔐');
        } else {
          return {
            success: false,
            message: '워크스페이스가 먼저 설정되어야 합니다. deplink init workspace를 실행하세요.'
          };
        }
      }

      // 실제 Notion 데이터베이스 생성 (전체 스키마 포함)
      const createdDatabases = await this.createNotionDatabases(config.apiKey!, config.parentPageId!, selectedDatabases);
      
      // Force 모드인 경우 기존 ID를 새로운 ID로 오버라이드
      if (options.force && Object.keys(config.databases).length > 0) {
        logger.info('Force 모드: 새로 생성된 데이터베이스 ID로 설정 오버라이드', '🔄');
        for (const [dbType, newId] of Object.entries(createdDatabases)) {
          if (config.databases[dbType]) {
            logger.info(`${dbType} 데이터베이스 ID 업데이트: ${config.databases[dbType]} → ${newId}`);
          }
        }
      }
      
      // 스키마 설정 업데이트
      config.databases = createdDatabases;

      // 설정 저장
      await this.configService.saveConfig(config, this.projectPath);

      logger.success(`스키마 초기화 완료: ${selectedDatabases.join(', ')}`);
      return {
        success: true,
        message: `데이터베이스 스키마가 설정되었습니다: ${selectedDatabases.join(', ')}`,
        data: { databases: selectedDatabases, template }
      };

    } catch (error) {
      logger.error(`스키마 초기화 실패: ${error}`);
      return {
        success: false,
        message: `스키마 초기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 전체 초기화 (모든 단계)
   */
  async initializeComplete(
    projectOptions: ProjectInitOptions = {},
    workspaceOptions: WorkspaceInitOptions = {},
    schemaOptions: SchemaInitOptions = {}
  ): Promise<CommandResult> {
    try {
      logger.info('전체 초기화 시작', '🎯');

      // 1. 프로젝트 초기화
      const projectResult = await this.initializeProject(projectOptions);
      if (!projectResult.success) {
        return projectResult;
      }

      // 2. 워크스페이스 초기화
      const workspaceResult = await this.initializeWorkspace(workspaceOptions);
      if (!workspaceResult.success) {
        return workspaceResult;
      }

      // 3. 스키마 초기화
      const schemaResult = await this.initializeSchema(schemaOptions);
      if (!schemaResult.success) {
        return schemaResult;
      }

      logger.success('전체 초기화 완료');
      return {
        success: true,
        message: '프로젝트가 완전히 초기화되었습니다.',
        data: {
          project: projectResult.data,
          workspace: workspaceResult.data,
          schema: schemaResult.data
        }
      };

    } catch (error) {
      logger.error(`전체 초기화 실패: ${error}`);
      return {
        success: false,
        message: `전체 초기화 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 프로젝트 정보 수집
   */
  private async collectProjectInfo(): Promise<{
    name: string;
    description?: string;
  }> {
    // package.json에서 정보 시도
    try {
      const packagePath = path.join(this.projectPath, 'package.json');
      const fs = await import('fs/promises');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.name) {
        return {
          name: packageJson.name,
          description: packageJson.description
        };
      }
    } catch {
      // package.json이 없거나 파싱 실패
    }

    // 디렉토리 이름 사용
    const projectName = path.basename(this.projectPath);
    
    return {
      name: projectName,
      description: `${projectName} project managed by dependency-linker`
    };
  }

  /**
   * 프로젝트 디렉토리 구조 확인
   */
  private async ensureProjectStructure(): Promise<void> {
    const fs = await import('fs/promises');
    const requiredDirs = [
      '.deplink'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectPath, dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`디렉토리 생성: ${dir}`);
      } catch (error) {
        logger.warning(`디렉토리 생성 실패: ${dir} - ${error}`);
      }
    }
  }

  /**
   * 스키마 설정 생성
   */
  private generateSchemaConfig(databases: string[], template: string): Record<string, string> {
    const config: Record<string, string> = {};
    
    // 임시 ID 생성 (실제로는 Notion에서 데이터베이스 생성 후 받아옴)
    for (const db of databases) {
      config[db] = `temp-${db}-${Date.now()}`;
    }

    return config;
  }

  /**
   * 현재 설정 상태 확인
   */
  async getInitializationStatus(): Promise<{
    projectInitialized: boolean;
    workspaceConnected: boolean;
    schemaConfigured: boolean;
    configPath?: string;
  }> {
    try {
      const config = await this.configService.loadAndProcessConfig(this.projectPath);
      
      return {
        projectInitialized: true,
        workspaceConnected: !!(config.apiKey && config.parentPageId),
        schemaConfigured: Object.keys(config.databases).length > 0,
        configPath: path.join(this.projectPath, 'deplink.config.json')
      };
    } catch {
      return {
        projectInitialized: false,
        workspaceConnected: false,
        schemaConfigured: false
      };
    }
  }


  /**
   * 실제 Notion 데이터베이스 생성
   */
  private async createNotionDatabases(
    apiKey: string, 
    parentPageId: string, 
    selectedDatabases: string[]
  ): Promise<Record<string, string>> {
    const { Client } = await import('@notionhq/client');
    const notion = new Client({ auth: apiKey });
    const createdDatabases: Record<string, string> = {};

    logger.info('Notion 데이터베이스 생성 시작', '🏗️');

    for (const dbType of selectedDatabases) {
      try {
        const schema = await this.getDatabaseSchema(dbType);
        logger.info(`데이터베이스 생성 중: ${schema.title[0].text.content}`, '📊');

        const response = await notion.databases.create({
          parent: { 
            type: 'page_id',
            page_id: parentPageId 
          },
          title: schema.title,
          initial_data_source: {
            properties: schema.properties
          }
        });

        createdDatabases[dbType] = response.id;
        logger.success(`데이터베이스 생성 완료: ${schema.title[0].text.content} (${response.id})`);

      } catch (error) {
        logger.error(`데이터베이스 생성 실패: ${dbType} - ${error}`);
        throw new Error(`데이터베이스 생성 실패: ${dbType}`);
      }
    }

    return createdDatabases;
  }

  /**
   * 스키마 JSON 파일에서 데이터베이스 스키마 로드
   */
  private async loadSchemaFromJson(): Promise<any> {
    try {
      // 여러 위치에서 스키마 파일 찾기
      const possiblePaths = [
        path.join(this.projectPath, 'src', 'infrastructure', 'database', 'schemas', 'database-schemas.json'),
        path.join(this.projectPath, 'schemas', 'database-schemas.json'),
        path.join(this.projectPath, 'src', 'schemas', 'database-schemas.json')
      ];

      for (const schemaPath of possiblePaths) {
        try {
          const schemaContent = await readFile(schemaPath, 'utf-8');
          logger.info(`스키마 파일 로드 성공: ${schemaPath}`, '📋');
          return JSON.parse(schemaContent);
        } catch {
          // 다음 경로 시도
        }
      }

      throw new Error('스키마 파일을 찾을 수 없음');
    } catch (error) {
      logger.warning(`스키마 JSON 파일 로드 실패, 기본 스키마 사용: ${error}`);
      return null;
    }
  }

  /**
   * 데이터베이스 스키마 정의 (JSON 스키마 기반)
   */
  private async getDatabaseSchema(dbType: string): Promise<{
    title: Array<{ text: { content: string } }>;
    properties: Record<string, PropertyConfigurationRequest>;
  }> {
    // 먼저 JSON 스키마 파일에서 로드 시도
    const jsonSchema = await this.loadSchemaFromJson();
    
    if (jsonSchema && jsonSchema.databases && jsonSchema.databases[dbType]) {
      const dbConfig = jsonSchema.databases[dbType];
      
      // JSON 스키마를 Notion API 형식으로 변환
      return {
        title: [{ text: { content: dbConfig.title } }],
        properties: this.convertJsonSchemaToNotionProperties(dbConfig.properties)
      };
    }

    // JSON 스키마가 없는 경우 기본 스키마 사용
    logger.warning(`JSON 스키마에서 ${dbType}을 찾을 수 없음, 기본 스키마 사용`);
    const schemas = {
      files: {
        title: [{ text: { content: '📁 Project Files' } }],
        properties: {
          'File Path': { title: {} },
          'Extension': {
            select: {
              options: [
                { name: '.ts', color: 'blue' },
                { name: '.js', color: 'yellow' },
                { name: '.tsx', color: 'purple' },
                { name: '.jsx', color: 'orange' },
                { name: '.json', color: 'green' },
                { name: '.md', color: 'gray' }
              ]
            }
          },
          'Size (bytes)': { number: {} },
          'Last Modified': { date: {} },
          'Status': {
            select: {
              options: [
                { name: 'Uploaded', color: 'green' },
                { name: 'Modified', color: 'yellow' },
                { name: 'Deleted', color: 'red' },
                { name: 'New', color: 'blue' }
              ]
            }
          },
          'Project': { 
            select: {
              options: [
                { name: 'dependency-linker', color: 'default' }
              ]
            }
          },
          'Lines': { number: {} },
          'Content': { rich_text: {} }
        }
      },
      docs: {
        title: [{ text: { content: '📖 Project Documents' } }],
        properties: {
          'Document Title': { title: {} },
          'File Path': { rich_text: {} },
          'Document Type': {
            select: {
              options: [
                { name: 'README', color: 'blue' },
                { name: 'API Documentation', color: 'green' },
                { name: 'Guide', color: 'yellow' },
                { name: 'Specification', color: 'purple' },
                { name: 'Other', color: 'gray' }
              ]
            }
          },
          'Last Updated': { date: {} },
          'Status': {
            select: {
              options: [
                { name: 'Published', color: 'green' },
                { name: 'Draft', color: 'yellow' },
                { name: 'Review', color: 'orange' },
                { name: 'Archived', color: 'red' }
              ]
            }
          },
          'Word Count': { number: {} },
          'Related Files': { rich_text: {} }
        }
      },
      functions: {
        title: [{ text: { content: '⚙️ Functions & APIs' } }],
        properties: {
          'Function Name': { title: {} },
          'File Path': { rich_text: {} },
          'Function Type': {
            select: {
              options: [
                { name: 'Function', color: 'blue' },
                { name: 'Method', color: 'green' },
                { name: 'Class', color: 'purple' },
                { name: 'Interface', color: 'yellow' },
                { name: 'Type', color: 'gray' }
              ]
            }
          },
          'Parameters': { rich_text: {} },
          'Return Type': { rich_text: {} },
          'Description': { rich_text: {} },
          'Complexity': {
            select: {
              options: [
                { name: 'Low', color: 'green' },
                { name: 'Medium', color: 'yellow' },
                { name: 'High', color: 'red' }
              ]
            }
          }
        }
      },
      dependencies: {
        title: [{ text: { content: '🔗 Dependencies Graph' } }],
        properties: {
          'Dependency Name': { title: {} },
          'Source File': { rich_text: {} },
          'Target File': { rich_text: {} },
          'Import Type': {
            select: {
              options: [
                { name: 'default', color: 'blue' },
                { name: 'named', color: 'green' },
                { name: 'namespace', color: 'purple' },
                { name: 'dynamic', color: 'orange' }
              ]
            }
          },
          'Relationship': {
            select: {
              options: [
                { name: 'imports', color: 'blue' },
                { name: 'exports', color: 'green' },
                { name: 'calls', color: 'yellow' },
                { name: 'extends', color: 'purple' }
              ]
            }
          },
          'Line Number': { number: {} }
        }
      }
    };

    return schemas[dbType as keyof typeof schemas] || schemas.files;
  }

  /**
   * 생성된 데이터베이스에 스키마 업데이트 적용
   */
  private async applyDatabaseSchemas(
    apiKey: string, 
    databases: Record<string, string>
  ): Promise<void> {
    logger.info('데이터베이스 스키마 업데이트 적용 시작', '🔧');

    try {
      const { Client } = await import('@notionhq/client');
      const notion = new Client({ auth: apiKey });
      
      // SchemaUpdateService 인스턴스 생성
      const schemaUpdateService = new SchemaUpdateService(notion);

      // 모든 데이터베이스 스키마 업데이트
      await schemaUpdateService.updateAllDatabaseSchemas(databases, this.projectPath);

      // 관계형 속성 업데이트 (다른 데이터베이스 참조가 있는 경우)
      await schemaUpdateService.updateRelationProperties(databases, this.projectPath);

      logger.success('데이터베이스 스키마 업데이트 완료', '✅');

    } catch (error) {
      logger.error(`스키마 업데이트 실패: ${error}`);
      throw new Error(`스키마 업데이트 실패: ${error}`);
    }
  }

  /**
   * 데이터베이스 스키마 상태 확인
   */
  async checkSchemaStatus(): Promise<CommandResult> {
    try {
      const config = await this.configService.loadAndProcessConfig(this.projectPath);
      
      if (!config.apiKey || Object.keys(config.databases).length === 0) {
        return {
          success: false,
          message: '설정된 데이터베이스가 없습니다.'
        };
      }

      const { Client } = await import('@notionhq/client');
      const notion = new Client({ auth: config.apiKey });
      const schemaUpdateService = new SchemaUpdateService(notion);

      // 현재 데이터베이스 속성 확인
      await schemaUpdateService.checkDatabaseProperties(config.databases);

      return {
        success: true,
        message: '데이터베이스 스키마 상태 확인 완료',
        data: { databases: config.databases }
      };

    } catch (error) {
      logger.error(`스키마 상태 확인 실패: ${error}`);
      return {
        success: false,
        message: `스키마 상태 확인 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 스키마만 별도로 업데이트
   */
  async updateSchemaOnly(): Promise<CommandResult> {
    try {
      const config = await this.configService.loadAndProcessConfig(this.projectPath);
      
      if (!config.apiKey || Object.keys(config.databases).length === 0) {
        return {
          success: false,
          message: '설정된 데이터베이스가 없습니다. 먼저 초기화를 수행하세요.'
        };
      }

      logger.info('데이터베이스 스키마 업데이트 시작', '🔄');

      // 스키마 업데이트 적용
      await this.applyDatabaseSchemas(config.apiKey, config.databases);

      return {
        success: true,
        message: '데이터베이스 스키마 업데이트 완료',
        data: { databases: config.databases }
      };

    } catch (error) {
      logger.error(`스키마 업데이트 실패: ${error}`);
      return {
        success: false,
        message: `스키마 업데이트 실패: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * JSON 스키마를 Notion 속성으로 변환
   */
  private convertJsonSchemaToNotionProperties(jsonProperties: Record<string, any>): Record<string, PropertyConfigurationRequest> {
    const notionProperties: Record<string, PropertyConfigurationRequest> = {};

    for (const [propName, propConfig] of Object.entries(jsonProperties)) {
      const config = propConfig as any;

      switch (config.type) {
        case 'title':
          notionProperties[propName] = { 
            type: 'title',
            title: {} 
          };
          break;

        case 'rich_text':
          notionProperties[propName] = { 
            type: 'rich_text',
            rich_text: {} 
          };
          break;

        case 'number':
          notionProperties[propName] = { 
            type: 'number',
            number: { 
              format: config.format || 'number' 
            } 
          };
          break;

        case 'date':
          notionProperties[propName] = { 
            type: 'date',
            date: {} 
          };
          break;

        case 'select':
          notionProperties[propName] = {
            type: 'select',
            select: {
              options: config.options || []
            }
          };
          break;

        case 'multi_select':
          notionProperties[propName] = {
            type: 'multi_select',
            multi_select: {
              options: config.options || []
            }
          };
          break;

        case 'relation':
          // 관계 속성은 initial_data_source 생성 시점에서 설정 불가
          // 데이터베이스 생성 후 별도로 업데이트해야 함
          logger.info(`관계 속성 ${propName}는 데이터베이스 생성 후 추가됩니다`);
          // 일단 건너뛰기
          break;

        case 'checkbox':
          notionProperties[propName] = { 
            type: 'checkbox',
            checkbox: {} 
          };
          break;

        case 'url':
          notionProperties[propName] = { 
            type: 'url',
            url: {} 
          };
          break;

        case 'email':
          notionProperties[propName] = { 
            type: 'email',
            email: {} 
          };
          break;

        case 'phone_number':
          notionProperties[propName] = { 
            type: 'phone_number',
            phone_number: {} 
          };
          break;

        case 'files':
          notionProperties[propName] = { 
            type: 'files',
            files: {} 
          };
          break;

        default:
          logger.warning(`알 수 없는 속성 타입: ${config.type}, rich_text로 대체`);
          notionProperties[propName] = { 
            type: 'rich_text',
            rich_text: {} 
          };
      }
    }

    return notionProperties;
  }
}