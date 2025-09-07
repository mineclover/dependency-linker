/**
 * Workspace Sync Service - Native Clean Architecture Implementation
 * 
 * This service replaces the legacy SyncWorkflowService with a clean architecture
 * implementation using dependency injection and proper separation of concerns.
 */

import { SyncService } from '../syncService.js';
import { FileDiscoveryService } from '../workflow/FileDiscovery.js';
import { GitHookManager } from '../../infrastructure/git/GitHookManager.js';
import { ConfigManager } from '../../infrastructure/config/configManager.js';
import { NotionClient } from '../../infrastructure/notion/NotionClient.js';
import { FileTracker } from '../../infrastructure/filesystem/FileTracker.js';
import { IgnoreManager } from '../../infrastructure/filesystem/IgnoreManager.js';
import { logger } from '../../shared/utils/index.js';
import type { 
  FileStatus, 
  WorkspaceConfig, 
  SyncResult,
  ProjectFile 
} from '../../shared/types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkspaceSyncOptions {
  dryRun?: boolean;
  force?: boolean;
  autoCommit?: boolean;
  updateIndex?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  target?: 'notion' | 'local';
}

export interface WorkspaceSyncResult {
  success: boolean;
  processed: number;
  uploaded: number;
  updated: number;
  skipped: number;
  errors: string[];
  newNotionPages: Array<{
    file: string;
    notionPageId: string;
  }>;
  duration: number;
}

export class WorkspaceSyncService {
  private syncService: SyncService;
  private fileDiscovery: FileDiscoveryService;
  private gitManager: GitHookManager;
  private configManager: ConfigManager;
  private notionClient: NotionClient | null = null;
  private fileTracker: FileTracker;
  private ignoreManager: IgnoreManager;
  private config: WorkspaceConfig | null = null;

  constructor(private projectPath: string) {
    // Initialize all services with dependency injection
    this.configManager = ConfigManager.getInstance();
    this.gitManager = new GitHookManager(this.projectPath);
    this.fileTracker = new FileTracker(this.projectPath);
    this.ignoreManager = new IgnoreManager(this.projectPath);
    
    // FileDiscoveryService depends on fileTracker and ignoreManager
    this.fileDiscovery = new FileDiscoveryService(
      this.projectPath,
      this.fileTracker,
      this.ignoreManager
    );
  }

  /**
   * Initialize the sync service
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration
      this.config = await this.configManager.loadConfig(this.projectPath);
      
      // Initialize Notion client if API key is available
      if (this.config.apiKey) {
        // Create NotionConfig from the loaded configuration
        const notionConfig = {
          apiKey: this.config.apiKey,
          databases: this.config.databases || {},
          parentPageId: this.config.parentPageId,
          schemaVersion: this.config.schemaVersion || '1.0',
          environment: this.config.environment || 'development'
        };
        
        this.notionClient = NotionClient.create(notionConfig);
      }
      
      // Initialize file tracker
      await this.fileTracker.initialize();
      
      // Initialize ignore manager
      await this.ignoreManager.initialize();
      
      logger.info('워크스페이스 동기화 서비스 초기화 완료', '✅');
    } catch (error) {
      logger.error(`초기화 실패: ${error}`);
      throw error;
    }
  }

  /**
   * Execute complete sync workflow
   */
  async executeSync(options: WorkspaceSyncOptions = {}): Promise<WorkspaceSyncResult> {
    const startTime = Date.now();
    
    if (!this.config || !this.notionClient) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const result: WorkspaceSyncResult = {
      success: true,
      processed: 0,
      uploaded: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      newNotionPages: [],
      duration: 0
    };

    try {
      logger.info('워크스페이스 동기화 시작...', '🚀');
      
      // Display target workspace
      this.displayTargetWorkspace();

      // Step 1: Discover files
      logger.info('파일 탐색 중...', '📁');
      const discoveredFiles = await this.discoverFiles(options);
      logger.info(`${discoveredFiles.length}개 파일 발견`, '📊');

      // Step 2: Filter files
      const filteredFiles = await this.filterFiles(discoveredFiles, options);
      logger.info(`${filteredFiles.length}개 파일 필터링 완료`, '🔍');

      // Step 3: Identify files needing sync
      const filesToSync = await this.identifyFilesToSync(filteredFiles, options);
      logger.info(`${filesToSync.length}개 파일 동기화 필요`, '📝');

      if (options.dryRun) {
        this.displayDryRunResults(filesToSync);
        result.duration = Date.now() - startTime;
        return result;
      }

      // Step 4: Sync to target
      if (options.target === 'notion') {
        await this.syncToNotion(filesToSync, result, options);
      } else if (options.target === 'local') {
        await this.syncToLocal(filesToSync, result, options);
      }

      // Step 5: Cleanup
      await this.performCleanup();

      // Step 6: Generate summary
      this.displaySummary(result);

      result.duration = Date.now() - startTime;
      return result;

    } catch (error) {
      logger.error(`동기화 실패: ${error}`);
      result.success = false;
      result.errors.push(`Workflow error: ${error}`);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Setup Git integration for automatic sync
   */
  async setupGitIntegration(options: { autoSync?: boolean } = {}): Promise<void> {
    logger.info('Git 통합 설정 중...', '🔧');
    
    await this.gitManager.installPreCommitHook();
    
    if (options.autoSync) {
      await this.gitManager.installPostCommitHook(true);
      logger.info('자동 동기화 활성화', '🚀');
    }
    
    logger.success('Git 통합 설정 완료');
  }

  /**
   * Remove Git integration
   */
  async removeGitIntegration(): Promise<void> {
    logger.info('Git 통합 제거 중...', '🗑️');
    await this.gitManager.removeHooks();
    logger.success('Git 통합 제거 완료');
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    files: any;
    git: any;
    config: {
      hasConfig: boolean;
      databases: string[];
    };
  }> {
    const [files, git] = await Promise.all([
      this.fileTracker.getSyncStats(),
      this.gitManager.checkGitStatus()
    ]);

    return {
      files,
      git,
      config: {
        hasConfig: !!this.config,
        databases: this.config ? Object.keys(this.config.databases || {}) : []
      }
    };
  }

  /**
   * Quick status check
   */
  async quickStatus(): Promise<void> {
    const status = await this.getSystemStatus();
    
    console.log('🔍 Dependency Linker Status');
    console.log('===========================');
    console.log(`📁 Files: ${status.files.total} total, ${status.files.synced} synced`);
    console.log(`🔧 Config: ${status.config.hasConfig ? '✅ Loaded' : '❌ Missing'}`);
    console.log(`📊 Databases: ${status.config.databases.join(', ')}`);
    console.log(`🎯 Git: ${status.git.staged.length} staged, ${status.git.modified.length} modified`);
  }

  // Private helper methods

  private displayTargetWorkspace(): void {
    if (!this.config) return;
    
    console.log('\n🌐 Target Notion Workspace:');
    if (this.config.parentPageId) {
      console.log(`   Root Page: ${this.config.parentPageId}`);
      console.log(`   → https://notion.so/${this.config.parentPageId.replace(/[^a-f0-9]/g, '')}`);
    }
    if (this.config.databases?.files) {
      console.log(`   Files Database: ${this.config.databases.files}`);
      console.log(`   → https://notion.so/${this.config.databases.files.replace(/[^a-f0-9]/g, '')}`);
    }
    console.log('');
  }

  private async discoverFiles(options: WorkspaceSyncOptions): Promise<string[]> {
    // Use the actual method available in FileDiscoveryService
    const discoveryResult = await this.fileDiscovery.discoverSourceFiles();
    return discoveryResult.filteredFiles;
  }

  private async filterFiles(files: string[], options: WorkspaceSyncOptions): Promise<string[]> {
    const filtered: string[] = [];
    
    for (const filePath of files) {
      const shouldIgnore = await this.ignoreManager.shouldIgnore(filePath);
      if (!shouldIgnore) {
        filtered.push(filePath);
      }
    }
    
    return filtered;
  }

  private async identifyFilesToSync(
    files: string[], 
    options: WorkspaceSyncOptions
  ): Promise<FileStatus[]> {
    const needsSync: FileStatus[] = [];
    
    if (options.force) {
      // Force sync all files
      for (const filePath of files) {
        const stats = await fs.stat(filePath);
        needsSync.push({
          filePath,
          relativePath: path.relative(this.projectPath, filePath),
          size: stats.size,
          lastModified: stats.mtime,
          syncStatus: 'modified'
        });
      }
    } else {
      // Check which files need sync
      for (const filePath of files) {
        const fileStatus = await this.fileTracker.getFileStatus(filePath);
        if (fileStatus && fileStatus.syncStatus !== 'synced') {
          needsSync.push(fileStatus);
        }
      }
    }
    
    return needsSync;
  }

  private displayDryRunResults(files: FileStatus[]): void {
    console.log('🧪 DRY RUN - Would process:');
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.relativePath} (${file.syncStatus})`);
    });
  }

  private async syncToNotion(
    files: FileStatus[], 
    result: WorkspaceSyncResult,
    options: WorkspaceSyncOptions
  ): Promise<void> {
    if (!this.notionClient || !this.config) return;

    logger.info('Notion으로 동기화 중...', '⬆️');
    
    // Get or create database ID
    let databaseId = this.config.databases?.files;
    if (!databaseId) {
      logger.info('새 데이터베이스 생성 중...', '🗄️');
      databaseId = await this.notionClient.createDatabase('Project Files', 'files');
      
      // Update config with new database ID
      if (this.config.databases) {
        this.config.databases.files = databaseId;
      } else {
        this.config.databases = { files: databaseId };
      }
      
      await this.configManager.saveConfig(this.config, 'project', this.projectPath);
    }

    // Sync each file
    for (const fileStatus of files) {
      try {
        result.processed++;
        
        // Read file content
        const content = await fs.readFile(fileStatus.filePath, 'utf-8');
        
        const projectFile: ProjectFile = {
          path: fileStatus.filePath,
          relativePath: fileStatus.relativePath,
          size: content.length,
          extension: path.extname(fileStatus.filePath),
          lastModified: fileStatus.lastModified,
          content
        };

        // Upload or update in Notion
        let notionPageId: string;
        
        if (fileStatus.notionPageId) {
          // Update existing page
          const updateResult = await this.notionClient.updateFile(
            projectFile, 
            fileStatus.notionPageId
          );
          notionPageId = updateResult.notionId;
          result.updated++;
          logger.info(`✅ Updated: ${fileStatus.relativePath}`);
        } else {
          // Create new page
          const uploadResult = await this.notionClient.uploadFile(
            projectFile, 
            databaseId
          );
          notionPageId = uploadResult.notionId;
          result.uploaded++;
          result.newNotionPages.push({
            file: fileStatus.relativePath,
            notionPageId
          });
          logger.info(`🆕 Created: ${fileStatus.relativePath}`);
        }

        // Update local tracking
        await this.fileTracker.updateFileStatus(fileStatus.relativePath, {
          ...fileStatus,
          notionPageId,
          lastSynced: new Date(),
          syncStatus: 'synced'
        });

      } catch (error) {
        logger.error(`❌ Failed to sync ${fileStatus.relativePath}: ${error}`);
        result.errors.push(`${fileStatus.relativePath}: ${error}`);
        result.success = false;
      }
    }
  }

  private async syncToLocal(
    files: FileStatus[], 
    result: WorkspaceSyncResult,
    options: WorkspaceSyncOptions
  ): Promise<void> {
    logger.info('로컬 동기화는 아직 구현되지 않았습니다.', '🏠');
    // TODO: Implement local sync
  }

  private async performCleanup(): Promise<void> {
    logger.info('인덱스 정리 중...', '🧹');
    const cleanupResult = await this.fileTracker.cleanup();
    if (cleanupResult.removed > 0) {
      logger.info(`${cleanupResult.removed}개 오래된 항목 제거`);
    }
  }

  private displaySummary(result: WorkspaceSyncResult): void {
    console.log('\n📈 Sync Results:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  New uploads: ${result.uploaded}`);
    console.log(`  Updates: ${result.updated}`);
    console.log(`  Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (result.newNotionPages.length > 0) {
      console.log('\n🆕 New pages created:');
      result.newNotionPages.forEach(page => {
        console.log(`   ${page.file} → ${page.notionPageId}`);
      });
    }
    
    console.log(`\n⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log('\n🎉 Sync workflow completed!');
  }
}