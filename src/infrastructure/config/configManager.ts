/**
 * Configuration Manager - Infrastructure Layer
 * 프로젝트 설정 로딩 및 관리를 담당하는 인프라스트럭처 컴포넌트
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { WorkspaceConfig, FileSystemError } from '../../shared/types/index.js';
import { logger, ProjectDetector } from '../../shared/utils/index.js';
import { CLI } from '../../shared/constants/index.js';
import { ConfigNormalizer, type NormalizedConfig, type ConfigSource } from './configNormalizer.js';

// 레거시 NotionConfig 타입 호환성을 위한 임시 타입
interface LegacyNotionConfig extends WorkspaceConfig {
  // 레거시 필드들 추가 지원
  databases: Record<string, string>;
  parentPageId?: string;
  git?: {
    enabled: boolean;
    autoSync: boolean;
    watchBranches: string[];
    ignorePatterns: string[];
  };
  [key: string]: unknown; // 기타 레거시 필드
}

/**
 * 설정 관리자 - 싱글톤 패턴
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: LegacyNotionConfig | null = null;
  private normalizedConfig: NormalizedConfig | null = null;
  private configNormalizer: ConfigNormalizer;
  private ajv: Ajv;
  private configSchema: any;
  
  private readonly CONFIG_PATH = path.join(homedir(), '.deplink-config.json');
  private readonly PROJECT_CONFIG_PATH = CLI.DEFAULT_CONFIG_FILE;
  private readonly ENV_PREFIX = 'DEPLINK_';
  private readonly CONFIG_SCHEMA_PATH = path.join(__dirname, 'deplink.config.schema.json');

  constructor() {
    this.configNormalizer = new ConfigNormalizer();
    
    // JSON Schema 검증기 초기화
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      strictSchema: false,
      strictNumbers: false,
      strictTypes: false,
      strictTuples: false,
      strictRequired: false,
      useDefaults: true,
      removeAdditional: false
    });
    
    addFormats(this.ajv);
    this.loadConfigSchema();
  }

  /**
   * JSON Schema 로드
   */
  private loadConfigSchema(): void {
    try {
      if (existsSync(this.CONFIG_SCHEMA_PATH)) {
        const schemaContent = readFileSync(this.CONFIG_SCHEMA_PATH, 'utf8');
        this.configSchema = JSON.parse(schemaContent);
        this.ajv.addSchema(this.configSchema, 'deplink-config');
        logger.debug('✅ Configuration schema loaded and compiled');
      } else {
        logger.warning(`Configuration schema not found at: ${this.CONFIG_SCHEMA_PATH}`);
        // Schema가 없어도 계속 진행 (backward compatibility)
      }
    } catch (error) {
      logger.warning('Failed to load configuration schema:', error);
      // Schema 로드 실패해도 계속 진행 (backward compatibility)
    }
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Enhanced configuration loading with proper database ID mapping and validation
   */
  async loadConfigEnhanced(
    projectPath?: string,
    options: {
      validateIds?: boolean;
      autoDiscover?: boolean;
      updateMissingIds?: boolean;
    } = {}
  ): Promise<NormalizedConfig> {
    const finalProjectPath = projectPath || await ProjectDetector.detectProjectRoot() || process.cwd();
    
    try {
      const sources: ConfigSource[] = [];

      // 1. Environment variables (highest priority)
      const envConfig = this.loadFromEnvironmentVars();
      if (envConfig.apiKey || Object.keys(envConfig.databases || {}).length > 0) {
        sources.push({
          type: 'env',
          data: envConfig,
          priority: 3
        });
      }

      // 2. .env file
      const envFileConfig = await this.loadFromEnvFile(finalProjectPath);
      if (envFileConfig) {
        sources.push({
          type: 'env',
          data: envFileConfig,
          priority: 2
        });
      }

      // 3. Project configuration file
      const projectConfig = await this.loadFromProjectConfig(finalProjectPath);
      if (projectConfig) {
        sources.push({
          type: 'project',
          data: projectConfig,
          priority: 1
        });
      }

      // 4. Global configuration (lowest priority)
      const globalConfig = await this.loadFromGlobalConfig();
      if (globalConfig) {
        sources.push({
          type: 'global',
          data: globalConfig,
          priority: 0
        });
      }

      if (sources.length === 0) {
        throw new FileSystemError('No valid configuration sources found');
      }

      // Normalize configuration using the new normalizer
      this.normalizedConfig = await this.configNormalizer.normalizeConfig(sources, options);

      // Convert to legacy format for backward compatibility
      this.config = this.convertToLegacyFormat(this.normalizedConfig);

      logger.info(`✅ Enhanced configuration loaded from ${sources.length} source(s)`);
      
      return this.normalizedConfig;

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Enhanced configuration loading failed: ${message}`);
      throw new FileSystemError(`Configuration loading failed: ${message}`);
    }
  }

  /**
   * Legacy configuration loading method (maintains backward compatibility)
   */
  async loadConfig(projectPath?: string): Promise<LegacyNotionConfig> {
    // Auto-detect project root if not provided
    let detectedProjectPath = projectPath;
    if (!detectedProjectPath) {
      logger.info('Auto-detecting project root...', '📍');
      const detection = await ProjectDetector.autoDetectProject();
      if (detection.projectRoot) {
        detectedProjectPath = detection.projectRoot;
        logger.success(`Using detected project root: ${detectedProjectPath}`);
        
        // Display project info and recommendations
        if (detection.projectInfo) {
          const info = detection.projectInfo;
          logger.info(`Project: ${info.name || 'Unknown'} (${info.type})`, '📦');
          if (info.version) logger.info(`Version: ${info.version}`, '📌');
        }
        
        if (detection.recommendations.length > 0) {
          logger.info('Recommendations:', '💡');
          detection.recommendations.forEach(rec => logger.info(`   ${rec}`));
        }
      } else {
        logger.warning('Could not detect project root. Using current directory.');
        detectedProjectPath = process.cwd();
      }
    }

    let config: LegacyNotionConfig | null = null;
    const finalProjectPath = detectedProjectPath;

    try {
      // 1. .env 파일에서 로딩
      if (finalProjectPath) {
        config = await this.loadFromEnvFile(finalProjectPath);
      }

      // 2. 프로젝트 설정 파일에서 로딩 (병합)
      if (finalProjectPath) {
        const projectConfig = await this.loadFromProjectConfig(finalProjectPath);
        if (projectConfig) {
          config = config ? { ...projectConfig, ...config } : projectConfig;
        }
      }

      // 3. 글로벌 설정에서 로딩 (병합)
      const globalConfig = await this.loadFromGlobalConfig();
      if (globalConfig) {
        config = config ? { ...globalConfig, ...config } : globalConfig;
      }

      // 4. 환경 변수에서 로딩 (최종 오버라이드)
      const envConfig = this.loadFromEnvironmentVars();
      if (envConfig.apiKey) {
        config = config ? { ...config, ...envConfig } : envConfig;
      }

      if (!config) {
        throw new FileSystemError('No valid configuration found');
      }

      // 설정 검증
      this.validateConfig(config);
      this.config = config;
      
      return config;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`설정 로딩 실패: ${message}`);
      throw new FileSystemError(`Configuration loading failed: ${message}`);
    }
  }

  /**
   * .env 파일에서 설정 로딩
   */
  private async loadFromEnvFile(projectPath: string): Promise<LegacyNotionConfig | null> {
    const envPath = path.join(projectPath, '.env');
    
    if (!existsSync(envPath)) {
      return null;
    }

    try {
      const content = await readFile(envPath, 'utf-8');
      const envConfig = dotenv.parse(content);
      const config = this.loadFromEnvironmentObject(envConfig);
      
      if (config.apiKey) {
        logger.info(`설정을 .env 파일에서 로딩했습니다: ${envPath}`, '🔐');
      }
      
      return config;
    } catch (error) {
      logger.warning(`⚠️ .env 파일 로딩 실패: ${error}`);
      return null;
    }
  }

  /**
   * 프로젝트 설정 파일에서 로딩
   */
  private async loadFromProjectConfig(projectPath: string): Promise<LegacyNotionConfig | null> {
    const configPath = path.join(projectPath, this.PROJECT_CONFIG_PATH);
    
    if (!existsSync(configPath)) {
      return null;
    }

    try {
      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as LegacyNotionConfig;
      
      logger.info(`설정을 프로젝트 파일에서 로딩했습니다: ${configPath}`, '📁');
      return config;
    } catch (error) {
      logger.warning(`⚠️ 프로젝트 설정 파일 파싱 실패: ${error}`);
      return null;
    }
  }

  /**
   * 글로벌 설정에서 로딩
   */
  private async loadFromGlobalConfig(): Promise<LegacyNotionConfig | null> {
    if (!existsSync(this.CONFIG_PATH)) {
      return null;
    }

    try {
      const content = await readFile(this.CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content) as LegacyNotionConfig;
      
      logger.info(`글로벌 설정 로딩: ${this.CONFIG_PATH}`, '🌍');
      return config;
    } catch (error) {
      logger.warning(`⚠️ 글로벌 설정 파일 파싱 실패: ${error}`);
      return null;
    }
  }

  /**
   * 환경 변수에서 로딩
   */
  private loadFromEnvironmentVars(): Partial<LegacyNotionConfig> {
    return this.loadFromEnvironmentObject(process.env);
  }

  /**
   * 환경 변수 객체에서 설정 추출
   */
  private loadFromEnvironmentObject(env: Record<string, string | undefined>): LegacyNotionConfig {
    const config: Partial<LegacyNotionConfig> = {};

    // API 키 추출
    if (env.NOTION_API_KEY || env[`${this.ENV_PREFIX}API_KEY`]) {
      config.apiKey = env.NOTION_API_KEY || env[`${this.ENV_PREFIX}API_KEY`]!;
    }

    // 데이터베이스 ID들 추출
    const databases: Record<string, string> = {};
    if (env.NOTION_DATABASE_FILES || env[`${this.ENV_PREFIX}DATABASE_FILES`]) {
      databases.files = env.NOTION_DATABASE_FILES || env[`${this.ENV_PREFIX}DATABASE_FILES`]!;
    }
    if (env.NOTION_DATABASE_DOCS || env[`${this.ENV_PREFIX}DATABASE_DOCS`]) {
      databases.docs = env.NOTION_DATABASE_DOCS || env[`${this.ENV_PREFIX}DATABASE_DOCS`]!;
    }
    if (env.NOTION_DATABASE_FUNCTIONS || env[`${this.ENV_PREFIX}DATABASE_FUNCTIONS`]) {
      databases.functions = env.NOTION_DATABASE_FUNCTIONS || env[`${this.ENV_PREFIX}DATABASE_FUNCTIONS`]!;
    }

    if (Object.keys(databases).length > 0) {
      config.databases = databases;
    }

    // 부모 페이지 ID
    if (env.NOTION_PARENT_PAGE_ID || env[`${this.ENV_PREFIX}PARENT_PAGE_ID`]) {
      config.parentPageId = env.NOTION_PARENT_PAGE_ID || env[`${this.ENV_PREFIX}PARENT_PAGE_ID`];
    }

    // 환경 설정
    config.environment = (env.NODE_ENV as any) || 'development';
    
    // 프로젝트 경로
    config.projectPath = env.PWD || process.cwd();

    return config as LegacyNotionConfig;
  }

  /**
   * 설정 검증
   */
  /**
   * Convert normalized config to legacy format for backward compatibility
   */
  private convertToLegacyFormat(normalizedConfig: NormalizedConfig): LegacyNotionConfig {
    return {
      apiKey: normalizedConfig.apiKey,
      databases: normalizedConfig.databases,
      parentPageId: normalizedConfig.parentPageId,
      projectPath: normalizedConfig.projectPath,
      environment: normalizedConfig.environment as any
    };
  }

  /**
   * Get normalized configuration (preferred method)
   */
  getNormalizedConfig(): NormalizedConfig | null {
    return this.normalizedConfig;
  }

  /**
   * Get configuration synchronization report
   */
  async getConfigSyncReport(): Promise<any> {
    if (!this.normalizedConfig) {
      throw new Error('Configuration not loaded. Call loadConfigEnhanced() first.');
    }
    
    return await this.configNormalizer.generateSyncReport(this.normalizedConfig);
  }

  /**
   * Auto-discover and update database configuration
   */
  async autoDiscoverDatabases(options: {
    updateConfig?: boolean;
    saveToFile?: boolean;
  } = {}): Promise<Record<string, string>> {
    if (!this.normalizedConfig) {
      throw new Error('Configuration not loaded. Call loadConfigEnhanced() first.');
    }

    // Re-normalize with auto-discovery enabled
    const sources: ConfigSource[] = [{
      type: 'project',
      data: this.config,
      priority: 1
    }];

    const discoveredConfig = await this.configNormalizer.normalizeConfig(sources, {
      validateIds: true,
      autoDiscover: true,
      updateMissingIds: true
    });

    if (options.updateConfig) {
      this.normalizedConfig = discoveredConfig;
      this.config = this.convertToLegacyFormat(discoveredConfig);
    }

    if (options.saveToFile) {
      await this.saveProjectConfig(discoveredConfig);
    }

    return discoveredConfig.databases;
  }

  /**
   * Save discovered configuration to project file
   */
  private async saveProjectConfig(config: NormalizedConfig): Promise<void> {
    const projectPath = config.projectPath;
    const configPath = path.join(projectPath, this.PROJECT_CONFIG_PATH);
    
    try {
      // Read existing config
      let existingConfig: any = {};
      if (existsSync(configPath)) {
        const content = await readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(content);
      }

      // Update databases section while preserving other settings
      if (!existingConfig.notion) {
        existingConfig.notion = {};
      }
      
      existingConfig.notion.databases = config.databases;
      
      if (config.parentPageId) {
        existingConfig.notion.parentPageId = config.parentPageId;
      }

      // Write updated config
      await writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
      logger.info(`✅ Updated project configuration: ${configPath}`);

    } catch (error) {
      logger.error(`Failed to save project configuration: ${error}`);
      throw new FileSystemError(`Failed to save configuration: ${error}`);
    }
  }

  private validateConfig(config: LegacyNotionConfig): void {
    if (!config.apiKey) {
      throw new FileSystemError('API key is required');
    }

    if (!config.databases || Object.keys(config.databases).length === 0) {
      throw new FileSystemError('At least one database configuration is required');
    }

    // API 키 형식 검증
    if (!config.apiKey.startsWith('ntn_') && !config.apiKey.startsWith('secret_')) {
      logger.warning('⚠️ API 키 형식이 일반적이지 않습니다');
    }
  }

  /**
   * 설정 저장
   */
  async saveConfig(config: LegacyNotionConfig, projectPath?: string): Promise<void> {
    try {
      const configPath = projectPath 
        ? path.join(projectPath, this.PROJECT_CONFIG_PATH)
        : this.CONFIG_PATH;

      // 환경별 설정 분리
      const { apiKey, ...publicConfig } = config;
      
      if (projectPath) {
        // 프로젝트 설정에는 API 키 제외하고 저장
        await writeFile(configPath, JSON.stringify(publicConfig, null, 2));
        logger.success(`프로젝트 설정 저장: ${configPath}`);
      } else {
        // 글로벌 설정에는 전체 저장
        await writeFile(configPath, JSON.stringify(config, null, 2));
        logger.success(`글로벌 설정 저장: ${configPath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new FileSystemError(`Configuration save failed: ${message}`);
    }
  }

  /**
   * 캐시된 설정 반환
   */
  getCachedConfig(): LegacyNotionConfig | null {
    return this.config;
  }

  /**
   * Notion 설정 반환 (레거시 호환성)
   */
  getNotionConfig(): LegacyNotionConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Notion API 키 반환
   */
  getNotionApiKey(): string | undefined {
    return this.config?.apiKey;
  }

  /**
   * 데이터베이스 ID 반환 (CLI 호환성)
   */
  getDatabaseId(databaseName: string): string | undefined {
    if (!this.config?.databases) {
      return undefined;
    }
    return this.config.databases[databaseName];
  }

  /**
   * Notion URL 생성 (CLI 호환성)
   */
  createNotionUrl(databaseId: string): string {
    const cleanId = databaseId.replace(/-/g, '');
    // 기본 Notion URL 패턴
    return `https://notion.so/${cleanId}`;
  }

  /**
   * 설정 업데이트 (CLI 호환성)
   */
  async updateConfig(updates: Partial<LegacyNotionConfig>): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    // 기존 설정과 업데이트를 병합
    this.config = { ...this.config, ...updates };

    // 프로젝트 설정 파일에 저장
    await this.saveConfig(this.config);
    
    logger.info('✅ Configuration updated successfully');
  }

  /**
   * 설정 캐시 클리어
   */
  clearCache(): void {
    this.config = null;
  }

  /**
   * 환경별 설정 반환
   */
  getEnvironmentConfig(environment: string): LegacyNotionConfig | null {
    if (!this.config?.environments) {
      return null;
    }
    return this.config.environments[environment] as LegacyNotionConfig || null;
  }

  /**
   * JSON Schema 기반 구성 검증
   */
  validateConfigWithSchema(config: any): {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    if (!this.configSchema) {
      return {
        valid: true,
        warnings: ['Configuration schema not available, skipping validation']
      };
    }

    const validate = this.ajv.getSchema('deplink-config');
    if (!validate) {
      return {
        valid: false,
        errors: ['Configuration schema validator not found']
      };
    }

    const valid = validate(config);
    
    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath || 'root'}: ${err.message} ${err.params ? `(${JSON.stringify(err.params)})` : ''}`
      ) || ['Unknown validation error'];
      
      return {
        valid: false,
        errors
      };
    }

    // 경고 생성
    const warnings: string[] = [];
    
    // Notion 설정이 있지만 API 키가 없는 경우
    if (config.notion && !config.notion.apiKey && !process.env.NOTION_API_KEY) {
      warnings.push('Notion integration configured but API key not provided');
    }

    // 프로덕션 환경에서 디버그 로깅이 활성화된 경우
    if (config.project?.environment === 'production' && config.logging?.level === 'debug') {
      warnings.push('Debug logging enabled in production environment');
    }

    // 실시간 동기화가 활성화되었지만 필요한 설정이 없는 경우
    if (config.features?.realTimeSync && !config.features?.watchMode) {
      warnings.push('Real-time sync enabled but watch mode is disabled');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 구성 파일 로드 및 스키마 검증
   */
  async loadAndValidateConfig(projectPath?: string): Promise<LegacyNotionConfig> {
    // 기존 로직으로 config 로드
    const config = await this.loadConfig(projectPath);
    
    // Schema 검증
    if (this.configSchema) {
      const validationResult = this.validateConfigWithSchema(config);
      
      if (!validationResult.valid) {
        logger.error('Configuration validation failed:');
        validationResult.errors?.forEach(error => logger.error(`  - ${error}`));
        throw new Error(`Configuration validation failed: ${validationResult.errors?.join(', ')}`);
      }

      if (validationResult.warnings) {
        logger.warning('Configuration warnings:');
        validationResult.warnings.forEach(warning => logger.warning(`  - ${warning}`));
      }

      logger.info('✅ Configuration validated successfully');
    }

    return config;
  }

  /**
   * 구성 통계 정보
   */
  getConfigStats(): {
    schemaVersion: string;
    totalSections: number;
    enabledFeatures: string[];
    databaseCount: number;
    supportedExtensions: number;
    ignorePatterns: number;
    hasSchema: boolean;
  } {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const config = this.config;
    
    return {
      schemaVersion: config.schemaVersion || '2.0',
      totalSections: Object.keys(config).length,
      enabledFeatures: Object.entries(config.features || {})
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature),
      databaseCount: Object.keys(config.databases || {}).length,
      supportedExtensions: config.parser?.extensions?.length || 0,
      ignorePatterns: config.parser?.ignorePatterns?.length || 0,
      hasSchema: !!this.configSchema
    };
  }

  /**
   * JSON Schema 기반 기본 구성 생성
   */
  createSchemaBasedConfig(projectName: string, projectPath: string): any {
    const baseConfig = {
      project: {
        name: projectName,
        path: projectPath,
        environment: 'development'
      },
      database: {
        sqlitePath: './file-index.db',
        walMode: true
      },
      parser: {
        maxFileSize: 5000000,
        extensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs'],
        ignorePatterns: [
          'node_modules/**',
          'dist/**',
          '.git/**',
          '**/*.log',
          '**/*.tmp',
          '**/*.test.*',
          '**/*.spec.*'
        ]
      },
      features: {
        autoClassification: true,
        sqliteIndexing: true,
        notionUpload: true,
        realTimeSync: false
      },
      logging: {
        level: 'info',
        format: 'text'
      },
      sync: {
        batchSize: 100,
        concurrency: 3,
        retryFailed: true,
        dryRun: false
      }
    };

    // Schema 검증 적용 (기본값 자동 채우기)
    if (this.configSchema) {
      const validationResult = this.validateConfigWithSchema(baseConfig);
      if (validationResult.valid) {
        logger.info('✅ Schema-based default configuration created');
      }
    }

    return baseConfig;
  }
}

// 레거시 호환성을 위한 함수 export
export async function loadConfig(projectPath?: string): Promise<LegacyNotionConfig> {
  const manager = ConfigManager.getInstance();
  return manager.loadConfig(projectPath);
}

export async function saveConfig(config: LegacyNotionConfig, projectPath?: string): Promise<void> {
  const manager = ConfigManager.getInstance();
  return manager.saveConfig(config, projectPath);
}

// configManager 인스턴스 export
export const configManager = ConfigManager.getInstance();