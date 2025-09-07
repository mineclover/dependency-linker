/**
 * Enhanced Upload Service with Standardized Infrastructure
 * Clean Architecture implementation with dependency injection
 */

import { parserFactory } from './parsers';
import { analysisIndexManager } from './analysis/analysisIndexManager';
import type { LanguageAnalysisResult } from './parsers/common/parserInterfaces';
import { DependencyUploadService } from './notion/DependencyUploadService.js';
import { logger } from '../shared/utils/index.js';
import type { IConfigurationService } from '../domain/interfaces/IConfigurationService.js';
import type { INotionApiService } from '../domain/interfaces/INotionApiService.js';
import type { 
  FileUploadOptions, 
  FileUploadResult, 
  DependencyUploadResult,
  IUploadService 
} from '../shared/types/upload.js';
import type { NotionConfig } from '../shared/types/notion.js';
import { NotionUrlBuilder } from '../shared/utils/notionUrlBuilder.js';

// Legacy types are now replaced by unified types from ../shared/types/upload.js
// Export unified types for backward compatibility
export type UploadOptions = FileUploadOptions;
export type UploadResult = FileUploadResult;

/**
 * Enhanced Upload Service with Clean Architecture
 */
export class UploadService implements IUploadService {
  private static instance: UploadService;
  private configService: IConfigurationService;
  private notionApiService: INotionApiService | null = null;

  constructor(
    configService: IConfigurationService,
    notionApiService?: INotionApiService
  ) {
    this.configService = configService;
    this.notionApiService = notionApiService || null;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UploadService {
    if (!UploadService.instance) {
      // Create a temporary instance with null services for backward compatibility
      // In practice, this should be initialized with proper DI
      throw new Error('UploadService must be initialized with proper dependency injection. Use constructor directly.');
    }
    return UploadService.instance;
  }

  /**
   * Initialize singleton with dependencies
   */
  static initialize(configService: IConfigurationService, notionApiService?: INotionApiService): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService(configService, notionApiService);
    }
    return UploadService.instance;
  }

  /**
   * Set Notion API service (for dependency injection)
   */
  setNotionApiService(notionApiService: INotionApiService): void {
    this.notionApiService = notionApiService;
  }

  /**
   * Get Notion API service
   */
  private getNotionApiService(): INotionApiService {
    if (!this.notionApiService) {
      throw new Error('Notion API service not initialized. Call setNotionApiService() first.');
    }
    return this.notionApiService;
  }

  /**
   * 파일 분석 및 업로드
   */
  async uploadFile(filePath: string, options: FileUploadOptions = {}): Promise<FileUploadResult> {
    const result: FileUploadResult = {
      success: false,
      localDependencies: 0,
      libraryDependencies: 0,
      functions: 0,
      classes: 0,
      analysisTime: 0,
      errors: [],
      warnings: []
    };

    try {
      // 설정 검증 스킵 (이미 CLI에서 검증됨)

      // 1. 파일 분석
      console.log(`🔍 Analyzing: ${filePath}`);
      const analysisResult = await parserFactory.analyzeFile(filePath);
      if (!analysisResult) {
        result.errors = result.errors || [];
        result.errors.push('File analysis failed');
        return result;
      }

      result.analysisTime = analysisResult.analysisTime;
      console.log(`✅ Analysis completed: ${analysisResult.dependencies.length} deps, ${analysisResult.functions.length} funcs`);

      // 분류된 의존성 정보
      if (analysisResult.dependencyStats) {
        console.log(`📊 Dependencies: ${analysisResult.dependencyStats.local} local, ${analysisResult.dependencyStats.libraries} libraries`);
        result.dependencyStats = analysisResult.dependencyStats;
      }

      // 2. SQLite 저장
      if (!options.skipSQLite) {
        const contentHash = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        result.sqliteFileId = await analysisIndexManager.storeAnalysisResult(analysisResult, contentHash);
        console.log(`💾 SQLite Storage: File ID ${result.sqliteFileId}`);
      }

      // 3. Notion 업로드
      if (!options.skipNotion) {
        const uploadResult = await this.uploadToNotion(analysisResult, options);
        Object.assign(result, uploadResult);
      }

      result.success = true;
      result.localDependencies = analysisResult.classifiedDependencies?.filter(d => d.classification === 'local').length || 0;
      result.libraryDependencies = analysisResult.classifiedDependencies?.filter(d => d.classification === 'library').length || 0;
      result.functions = analysisResult.functions.length;
      result.classes = analysisResult.classes.length;

    } catch (error: any) {
      console.error(`❌ Upload failed: ${error.message}`);
      result.errors = result.errors || [];
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Upload to Notion using standardized infrastructure
   */
  private async uploadToNotion(
    analysisResult: LanguageAnalysisResult,
    options: UploadOptions
  ): Promise<Partial<UploadResult>> {
    const notionService = this.getNotionApiService();
    
    // Config 로드
    const config = await this.configService.loadAndProcessConfig(process.cwd());
    const classifiedDeps = analysisResult.classifiedDependencies || [];
    const localDeps = classifiedDeps.filter(dep => dep.classification === 'local');
    const libraryDeps = classifiedDeps.filter(dep => dep.classification === 'library');

    const createdPages = {
      libraries: [] as Array<{ id: string; source: string }>,
      localDeps: [] as Array<{ id: string; source: string }>,
      functions: [] as Array<{ id: string; name: string }>,
      classes: [] as Array<{ id: string; name: string }>
    };

    // 1. Library Dependencies 생성
    if (libraryDeps.length > 0) {
      const libsToProcess = libraryDeps.slice(0, options.maxLibraries || 10);
      console.log(`📚 Creating ${libsToProcess.length} library pages...`);
      
      for (const dep of libsToProcess) {
        try {
          const libraryDbId = config.databases.libraries;
          if (!libraryDbId) {
            throw new Error('Libraries database ID not configured');
          }

          const result = await notionService.createPageAdvanced({
            parent: { database_id: libraryDbId },
            properties: {
              "Name": { title: [{ text: { content: dep.source } }] },
              "Version": { rich_text: [{ text: { content: dep.libraryInfo?.version || 'unknown' } }] },
              "Package Manager": { select: { name: dep.libraryInfo?.packageManager || 'npm' } },
              "Category": { select: { name: dep.libraryInfo?.category || 'Library' } },
              "Description": { rich_text: [{ text: { content: dep.libraryInfo?.description || '' } }] },
              "Is Dev Dependency": { checkbox: dep.libraryInfo?.isDevDependency || false }
            }
          });
          
          if (result.success && result.data) {
            createdPages.libraries.push({ id: result.data.id, source: dep.source });
            logger.info(`✅ Created library page: ${dep.source}`);
          } else {
            logger.warning(`Failed to create library page: ${dep.source} - ${result.error?.message}`);
          }
        } catch (error: any) {
          logger.warning(`Failed to create library page: ${dep.source} - ${error.message}`);
        }
      }
    }

    // 2. Local Dependencies 생성
    if (localDeps.length > 0) {
      const localToProcess = localDeps.slice(0, options.maxDependencies || 10);
      console.log(`📦 Creating ${localToProcess.length} local dependency pages...`);
      
      for (const dep of localToProcess) {
        try {
          const dependenciesDbId = config.databases.dependencies;
          if (!dependenciesDbId) {
            throw new Error('Dependencies database ID not configured');
          }

          const result = await notionService.createPageAdvanced({
            parent: { database_id: dependenciesDbId },
            properties: {
              "Name": { title: [{ text: { content: dep.source } }] },
              "Type": { select: { name: dep.type } },
              "Resolved Path": { rich_text: [{ text: { content: dep.resolved || dep.source } }] },
              "Is Local": { checkbox: true },
              "Line Number": { number: dep.location?.line || 0 }
            }
          });
          
          if (result.success && result.data) {
            createdPages.localDeps.push({ id: result.data.id, source: dep.source });
            logger.info(`✅ Created dependency page: ${dep.source}`);
          } else {
            logger.warning(`Failed to create dependency page: ${dep.source} - ${result.error?.message}`);
          }
        } catch (error: any) {
          logger.warning(`Failed to create dependency page: ${dep.source} - ${error.message}`);
        }
      }
    }

    // 3. Functions 생성
    if (analysisResult.functions.length > 0) {
      const funcsToProcess = analysisResult.functions.slice(0, options.maxFunctions || 10);
      console.log(`⚡ Creating ${funcsToProcess.length} function pages...`);
      
      for (const func of funcsToProcess) {
        try {
          const functionsDbId = config.databases.functions;
          if (!functionsDbId) {
            throw new Error('Functions database ID not configured');
          }

          const result = await notionService.createPageAdvanced({
            parent: { database_id: functionsDbId },
            properties: {
              "Name": { title: [{ text: { content: `${func.name}()` } }] },
              "File Path": { rich_text: [{ text: { content: analysisResult.filePath } }] },
              "Line Number": { number: func.location?.line || 0 },
              "Parameters": { rich_text: [{ text: { content: func.params?.join(', ') || '' } }] },
              "Return Type": { rich_text: [{ text: { content: func.returnType || 'unknown' } }] },
              "Is Async": { checkbox: func.isAsync || false },
              "Is Exported": { checkbox: func.isExported || false },
              "Visibility": { select: { name: func.visibility || 'Public' } }
            }
          });
          
          if (result.success && result.data) {
            createdPages.functions.push({ id: result.data.id, name: func.name });
            logger.info(`✅ Created function page: ${func.name}()`);
          } else {
            logger.warning(`Failed to create function page: ${func.name} - ${result.error?.message}`);
          }
        } catch (error: any) {
          logger.warning(`Failed to create function page: ${func.name} - ${error.message}`);
        }
      }
    }

    // 4. Classes 생성
    if (analysisResult.classes.length > 0) {
      const classesToProcess = analysisResult.classes.slice(0, 10);
      console.log(`🏗️ Creating ${classesToProcess.length} class pages...`);
      
      for (const cls of classesToProcess) {
        try {
          const classesDbId = config.databases.classes;
          if (!classesDbId) {
            throw new Error('Classes database ID not configured');
          }

          const result = await notionService.createPageAdvanced({
            parent: { database_id: classesDbId },
            properties: {
              "Name": { title: [{ text: { content: cls.name } }] },
              "Methods Count": { number: cls.methods?.length || 0 },
              "Properties Count": { number: cls.properties?.length || 0 },
              "Is Exported": { checkbox: cls.isExported || false },
              "Is Abstract": { checkbox: cls.isAbstract || false },
              "Extends": { rich_text: [{ text: { content: cls.extends || '' } }] }
            }
          });
          
          if (result.success && result.data) {
            createdPages.classes.push({ id: result.data.id, name: cls.name });
            logger.info(`✅ Created class page: ${cls.name}`);
          } else {
            logger.warning(`Failed to create class page: ${cls.name} - ${result.error?.message}`);
          }
        } catch (error: any) {
          logger.warning(`Failed to create class page: ${cls.name} - ${error.message}`);
        }
      }
    }

    // 5. File 페이지 생성 (관계 연결)
    console.log(`📄 Creating file page with relations...`);
    const fileName = analysisResult.filePath.split('/').pop() || 'Unknown';
    
    const fileProperties: any = {
      "Name": { title: [{ text: { content: fileName } }] },
      "File Path": { rich_text: [{ text: { content: analysisResult.filePath } }] },
      "Language": { select: { name: analysisResult.language } },
      "Extension": { select: { name: analysisResult.filePath.split('.').pop() || 'unknown' } },
      "Dependencies Count": { number: analysisResult.dependencies.length },
      "Functions Count": { number: analysisResult.functions.length },
      "Classes Count": { number: analysisResult.classes.length },
      "Status": { select: { name: "Analyzed" } }
    };

    // No relation properties available in Files database schema

    const filesDbId = config.databases.files;
    if (!filesDbId) {
      throw new Error('Files database ID not configured');
    }

    const fileResult = await notionService.createPage({
      parent: { database_id: filesDbId },
      properties: fileProperties
    });

    if (!fileResult.success || !fileResult.data) {
      throw new Error(`Failed to create file page: ${fileResult.error?.message}`);
    }

    logger.info('✅ File page created successfully!');

    // 6. Enhanced Dependency Upload
    let dependencyUploadResult: DependencyUploadResult | undefined;
    if (options.uploadDependencies !== false && analysisResult.dependencies.length > 0) {
      logger.info('🔗 Starting enhanced dependency upload...');
      
      try {
        const dependencyUploadService = new DependencyUploadService(
          await notionService.getClient(),
          config.databases
        );
        
        dependencyUploadResult = await dependencyUploadService.uploadDependencyAnalysis(
          analysisResult,
          fileResult.data.id
        );
        
        if (dependencyUploadResult.success) {
          logger.info(`✅ Dependency upload completed: ${dependencyUploadResult.uploadedDependencies} nodes, ${dependencyUploadResult.createdRelations} relations`);
          logger.info(`📊 Summary: ${dependencyUploadResult.summary.localDependencies} local, ${dependencyUploadResult.summary.externalLibraries} external`);
        } else {
          logger.warning(`⚠️ Dependency upload partially failed: ${dependencyUploadResult.error}`);
        }
      } catch (error) {
        logger.error(`❌ Dependency upload failed: ${error}`);
        dependencyUploadResult = {
          success: false,
          uploadedDependencies: 0,
          createdRelations: 0,
          summary: {
            localDependencies: 0,
            externalLibraries: 0,
            internalModules: 0,
            circularDependencies: 0,
            totalRelations: 0,
            librariesCreated: 0,
            librariesUpdated: 0
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // URL 생성 with workspace URL
    const urlBuilder = new NotionUrlBuilder(config);
    
    return {
      filePageId: fileResult.data.id,
      filePageUrl: fileResult.data.url || urlBuilder.buildPageUrl(fileResult.data.id),
      dependencyUploadResult
    };
  }

  /**
   * 배치 업로드
   */
  async uploadBatch(files: string[], options: FileUploadOptions = {}): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    
    // IUploadService 인터페이스를 만족하기 위한 배치 업로드 구현
    return this.uploadBatchInternal(files, options);
  }

  private async uploadBatchInternal(filePaths: string[], options: FileUploadOptions = {}): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    
    for (const filePath of filePaths) {
      console.log(`\n📦 Processing ${filePath}...`);
      const result = await this.uploadFile(filePath, options);
      results.push(result);
      
      // 속도 제한 고려
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * 프로젝트 전체 업로드
   */
  async uploadProject(projectPath: string, options: FileUploadOptions = {}): Promise<FileUploadResult> {
    // IUploadService 인터페이스와 일치하도록 단일 파일 업로드로 처리
    // 프로젝트 전체 업로드가 필요하면 uploadBatch를 사용
    return this.uploadFile(projectPath, options);
  }

  // 기존 프로젝트 업로드 기능은 별도 메서드로 분리
  async uploadEntireProject(projectPath?: string, options: FileUploadOptions = {}): Promise<{
    totalFiles: number;
    successful: number;
    failed: number;
    results: FileUploadResult[];
  }> {
    const path = projectPath || process.cwd();
    
    // 파일 검색
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    const ignorePatterns = ['node_modules/**', 'dist/**', 'build/**'];
    
    console.log(`🔍 Scanning project: ${path}`);
    console.log(`   Extensions: ${extensions.join(', ')}`);
    console.log(`   Ignoring: ${ignorePatterns.join(', ')}`);
    
    // 실제 파일 검색 로직 (glob 사용)
    const { glob } = await import('glob');
    const files: string[] = [];
    
    for (const ext of extensions) {
      const pattern = `${path}/**/*${ext}`;
      const matches = await glob(pattern, { 
        ignore: ignorePatterns.map(p => `${path}/${p}`)
      });
      files.push(...matches);
    }
    
    console.log(`📁 Found ${files.length} files to upload`);
    
    const results = await this.uploadBatch(files, options);
    
    return {
      totalFiles: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

/**
 * 싱글톤 인스턴스 export (lazily initialized)
 */
let _uploadService: UploadService | null = null;

export const uploadService = {
  getInstance(): UploadService {
    if (!_uploadService) {
      throw new Error('UploadService not initialized. Please bootstrap the application first.');
    }
    return _uploadService;
  },
  
  initialize(configService: IConfigurationService, notionApiService?: INotionApiService): UploadService {
    if (!_uploadService) {
      _uploadService = new UploadService(configService, notionApiService);
    }
    return _uploadService;
  }
};

/**
 * 편의 함수들
 */
export async function uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
  return uploadService.getInstance().uploadFile(filePath, options);
}

export async function uploadBatch(filePaths: string[], options?: UploadOptions): Promise<UploadResult[]> {
  return uploadService.getInstance().uploadBatch(filePaths, options);
}

export async function uploadProject(projectPath?: string, options?: UploadOptions) {
  return uploadService.getInstance().uploadProject(projectPath, options);
}