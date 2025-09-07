/**
 * Core sync orchestration service
 * Handles the main sync workflow logic and coordination
 */

import fs from 'fs/promises';
import path from 'path';
import type { INotionUploader, IFileTracker, FileStatus } from '../../domain/interfaces/index.js';
import type { ProjectFile, NotionConfig } from '../../shared/types/index.js';
import type { 
  SyncWorkflowOptions,
  SyncWorkflowResult,
  FileProcessResult,
  CleanupResult,
  StepProgress,
  WorkspaceDisplayInfo
} from './WorkflowTypes.js';

export class SyncOrchestrator {
  private projectPath: string;
  private config: NotionConfig;
  private notionClient: INotionUploader;
  private fileTracker: IFileTracker;

  constructor(
    projectPath: string,
    config: NotionConfig,
    notionClient: INotionUploader,
    fileTracker: IFileTracker
  ) {
    this.projectPath = projectPath;
    this.config = config;
    this.notionClient = notionClient;
    this.fileTracker = fileTracker;
  }

  /**
   * Execute the core synchronization process
   */
  async executeSyncProcess(
    filesToSync: FileStatus[],
    options: SyncWorkflowOptions
  ): Promise<SyncWorkflowResult> {
    const result: SyncWorkflowResult = {
      success: true,
      processed: 0,
      uploaded: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      newNotionPages: []
    };

    if (options.dryRun) {
      return this.handleDryRun(filesToSync, result);
    }

    console.log('⬆️ Syncing to Notion...');
    
    // Display workspace info
    this.displayWorkspaceInfo();

    // Get or create database ID
    const databaseId = await this.ensureDatabase();
    
    // Process files in batches to respect rate limits
    const batchSize = 5; // Process 5 files at a time
    for (let i = 0; i < filesToSync.length; i += batchSize) {
      const batch = filesToSync.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (fileItem) => {
          const fileResult = await this.processFile(fileItem, databaseId);
          this.updateResult(result, fileResult);
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < filesToSync.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Cleanup and generate summary
    await this.performCleanup();
    await this.generateSummary(result);

    return result;
  }

  /**
   * Handle dry run execution
   */
  private handleDryRun(filesToSync: FileStatus[], result: SyncWorkflowResult): SyncWorkflowResult {
    console.log('🧪 DRY RUN - Would process:');
    filesToSync.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.relativePath} (${file.syncStatus})`);
    });
    return result;
  }

  /**
   * Display workspace information before sync
   */
  private displayWorkspaceInfo(): void {
    console.log('\n🌐 Target Notion Workspace:');
    console.log(`   Workspace: ${this.config.workspaceInfo?.workspaceUrl || 'https://www.notion.so'}`);
    
    if (this.config.databases?.files) {
      console.log(`   Files Database: ${this.config.databases.files}`);
      console.log(`   → https://notion.so/${this.config.databases.files.replace(/[^a-f0-9]/g, '')}`);
    }
    
    if (this.config.databases?.functions) {
      console.log(`   Functions Database: ${this.config.databases.functions}`);
      console.log(`   → https://notion.so/${this.config.databases.functions.replace(/[^a-f0-9]/g, '')}`);
    }
    
    if (this.config.databases?.docs) {
      console.log(`   Docs Database: ${this.config.databases.docs}`);
      console.log(`   → https://notion.so/${this.config.databases.docs.replace(/[^a-f0-9]/g, '')}`);
    }
    
    if (this.config.parentPageId) {
      console.log(`   Root Page: ${this.config.parentPageId}`);
      console.log(`   → https://notion.so/${this.config.parentPageId.replace(/[^a-f0-9]/g, '')}`);
    }
    
    console.log('');
  }

  /**
   * Ensure database exists or create it
   */
  private async ensureDatabase(): Promise<string> {
    let databaseId = this.config?.databases?.files;
    
    if (!databaseId) {
      console.log('🗄️ Creating new database...');
      databaseId = await this.notionClient.createDatabase('Project Files');
      
      // Update config with new database ID
      if (this.config) {
        this.config.databases = { ...this.config.databases, files: databaseId };
      }
    }
    
    return databaseId;
  }

  /**
   * Process a single file for synchronization
   */
  private async processFile(fileItem: FileStatus, databaseId: string): Promise<FileProcessResult> {
    const filePath = fileItem.path;
    const relativePath = fileItem.relativePath;
    
    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      const projectFile: ProjectFile = {
        path: filePath,
        relativePath,
        size: content.length,
        extension: path.extname(filePath),
        lastModified: new Date(),
        content,
        notionPageId: Array.isArray(fileItem) ? undefined : fileItem.notionPageId
      };

      // Upload or update in Notion
      let notionPageId: string;
      let action: 'created' | 'updated';
      
      if (projectFile.notionPageId) {
        // Update existing page
        const updateResult = await this.notionClient.updateFile(projectFile, projectFile.notionPageId);
        notionPageId = updateResult.notionId;
        action = 'updated';
        console.log(`✅ Updated: ${relativePath} -> ${notionPageId}`);
      } else {
        // Create new page
        const uploadResult = await this.notionClient.uploadFile(projectFile, databaseId);
        notionPageId = uploadResult.notionId;
        action = 'created';
        console.log(`🆕 Created: ${relativePath} -> ${notionPageId}`);
      }

      // Update local index
      await this.fileTracker.markFileSynced(relativePath, notionPageId);

      return {
        success: true,
        filePath: relativePath,
        notionPageId,
        action
      };

    } catch (error) {
      const errorMessage = `${relativePath}: ${error}`;
      console.error(`❌ Failed to sync ${relativePath}: ${error}`);
      
      return {
        success: false,
        filePath: relativePath,
        action: 'skipped',
        error: errorMessage
      };
    }
  }

  /**
   * Update result with file processing outcome
   */
  private updateResult(result: SyncWorkflowResult, fileResult: FileProcessResult): void {
    result.processed++;
    
    if (fileResult.success) {
      if (fileResult.action === 'created') {
        result.uploaded++;
        result.newNotionPages.push({
          file: fileResult.filePath,
          notionPageId: fileResult.notionPageId!
        });
      } else if (fileResult.action === 'updated') {
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      result.success = false;
      if (fileResult.error) {
        result.errors.push(fileResult.error);
      }
    }
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(): Promise<CleanupResult> {
    console.log('🧹 Cleaning up index...');
    
    // Simple cleanup - this would typically be more sophisticated
    const cleanupResult: CleanupResult = {
      removed: 0,
      errors: []
    };
    
    return cleanupResult;
  }

  /**
   * Generate and display sync summary
   */
  private async generateSummary(result: SyncWorkflowResult): Promise<void> {
    console.log('📊 Generating summary...');
    
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
  }

  /**
   * Get sync progress information
   */
  async getSyncProgress(): Promise<StepProgress[]> {
    const steps: StepProgress[] = [
      { step: 'discover_files', status: 'completed', message: 'Files discovered' },
      { step: 'identify_sync', status: 'completed', message: 'Sync candidates identified' },
      { step: 'sync_notion', status: 'in_progress', message: 'Syncing to Notion' },
      { step: 'update_index', status: 'pending', message: 'Updating local index' },
      { step: 'cleanup', status: 'pending', message: 'Cleaning up' },
      { step: 'generate_summary', status: 'pending', message: 'Generating summary' }
    ];

    return steps;
  }

  /**
   * Estimate sync time based on file count and sizes
   */
  async estimateSyncTime(files: FileStatus[]): Promise<{
    estimatedMinutes: number;
    factors: {
      fileCount: number;
      averageSize: number;
      networkLatency: number;
    };
  }> {
    const fileCount = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = fileCount > 0 ? totalSize / fileCount : 0;
    
    // Rough estimation: 2 seconds per file + size factor
    const baseTime = fileCount * 2; // seconds
    const sizeTime = totalSize / 1024 / 10; // 10KB per second assumption
    const networkLatency = fileCount * 0.5; // 500ms per request
    
    const totalSeconds = baseTime + sizeTime + networkLatency;
    const estimatedMinutes = Math.ceil(totalSeconds / 60);

    return {
      estimatedMinutes: Math.max(1, estimatedMinutes),
      factors: {
        fileCount,
        averageSize: Math.round(averageSize),
        networkLatency: Math.round(networkLatency)
      }
    };
  }

  /**
   * Validate sync prerequisites
   */
  async validateSyncPrerequisites(): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check Notion client
    if (!this.notionClient) {
      issues.push('Notion client not initialized');
    }

    // Check configuration
    if (!this.config) {
      issues.push('Configuration not loaded');
    }

    // Check API key
    if (this.config && !this.config.apiKey) {
      issues.push('Notion API key not configured');
    }

    // Check file tracker
    if (!this.fileTracker) {
      issues.push('File tracker not initialized');
    }

    // Check project path
    try {
      await fs.access(this.projectPath);
    } catch {
      issues.push(`Project path not accessible: ${this.projectPath}`);
    }

    // Warnings
    if (this.config && !this.config.parentPageId) {
      warnings.push('No parent page ID configured - will create top-level pages');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }
}