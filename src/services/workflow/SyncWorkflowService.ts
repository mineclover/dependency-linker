/**
 * Main sync workflow service facade
 * Coordinates all workflow components and provides unified interface
 */

import type { INotionUploader, IFileTracker, IGitIntegration, IConfigManager, IIgnoreManager } from '../../domain/interfaces/index.js';
import type { NotionConfig, ProjectFile, UploadResult } from '../../shared/types/index.js';

import { FileDiscoveryService } from './FileDiscovery.js';
import { SyncOrchestrator } from './SyncOrchestrator.js';
import { GitIntegrationService } from './GitIntegration.js';
import { DocumentationProcessor } from './DocumentationProcessor.js';

import type {
  SyncWorkflowOptions,
  SyncWorkflowResult,
  SystemStatus,
  GitIntegrationOptions,
  DocumentUploadOptions,
  DocumentUploadResult,
  DocumentSetupResult,
  DatabaseFixResult
} from './WorkflowTypes.js';

export class SyncWorkflowService {
  private projectPath: string;
  private config: NotionConfig | null = null;
  private notionClient: INotionUploader | null = null;
  
  // Core services
  private fileTracker: IFileTracker;
  private gitHookManager: IGitIntegration;
  private ignoreManager: IIgnoreManager;
  
  // Workflow components
  private fileDiscovery: FileDiscoveryService | null = null;
  private syncOrchestrator: SyncOrchestrator | null = null;
  private gitIntegration: GitIntegrationService;
  private docProcessor: DocumentationProcessor | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.fileTracker = new FileStatusTracker(projectPath);
    this.gitHookManager = new GitHookManager(projectPath);
    this.ignoreManager = new IgnoreManager(projectPath);
    this.gitIntegration = new GitIntegrationService(projectPath, this.gitHookManager);
  }

  /**
   * Initialize the service and all components
   */
  async initialize(): Promise<void> {
    // Load configuration
    const configManager = ConfigManager.getInstance();
    this.config = await configManager.loadConfig(this.projectPath);
    
    // Initialize Notion client
    this.notionClient = new NotionUploader(this.config.apiKey, this.projectPath);
    
    // Set parent page ID if available
    if (this.config.parentPageId) {
      this.notionClient.setParentPageId(this.config.parentPageId);
    }
    
    // Initialize core services
    await this.fileTracker.initialize();
    await this.ignoreManager.initialize();
    
    // Initialize workflow components
    this.fileDiscovery = new FileDiscoveryService(
      this.projectPath, 
      this.fileTracker, 
      this.ignoreManager
    );
    
    this.syncOrchestrator = new SyncOrchestrator(
      this.projectPath,
      this.config,
      this.notionClient,
      this.fileTracker
    );
    
    this.docProcessor = new DocumentationProcessor(
      this.projectPath,
      this.config,
      this.notionClient,
      this.fileTracker
    );
  }

  /**
   * Execute complete sync workflow
   */
  async executeSync(options: SyncWorkflowOptions = {}): Promise<SyncWorkflowResult> {
    this.ensureInitialized();

    try {
      console.log('🚀 Starting sync workflow...');
      
      // Step 1: Discover and filter files
      console.log('📁 Step 1: Discovering files...');
      const discovery = await this.fileDiscovery!.discoverSourceFiles();
      
      // Step 2: Identify files needing sync
      console.log('🔍 Step 2: Identifying files needing sync...');
      const filesToSync = await this.fileDiscovery!.identifyFilesNeedingSync(
        discovery.filteredFiles, 
        options
      );

      // Step 3-6: Execute sync process
      const result = await this.syncOrchestrator!.executeSyncProcess(filesToSync, options);
      
      if (result.newNotionPages.length > 0 && options.updateIndex) {
        console.log('\n🔄 Updating file indexer...');
        // Additional indexing operations could be performed here
      }

      console.log('\n🎉 Sync workflow completed!');
      return result;

    } catch (error) {
      console.error('💥 Sync workflow failed:', error);
      return {
        success: false,
        processed: 0,
        uploaded: 0,
        updated: 0,
        skipped: 0,
        errors: [`Workflow error: ${error}`],
        newNotionPages: []
      };
    }
  }

  /**
   * Setup Git integration
   */
  async setupGitIntegration(options: GitIntegrationOptions = {}): Promise<void> {
    const result = await this.gitIntegration.setupGitIntegration(options);
    
    if (!result.success) {
      throw new Error(`Git integration setup failed: ${result.error}`);
    }
  }

  /**
   * Remove Git integration
   */
  async removeGitIntegration(): Promise<void> {
    const result = await this.gitIntegration.removeGitIntegration();
    
    if (!result.success) {
      throw new Error(`Git integration removal failed: ${result.error}`);
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    this.ensureInitialized();

    const [filesStats, gitStatus] = await Promise.all([
      this.fileTracker.getSyncStats(),
      this.gitIntegration.checkGitStatus()
    ]);

    return {
      files: {
        total: filesStats.total,
        synced: filesStats.synced,
        needsUpdate: filesStats.needsUpdate,
        notSynced: filesStats.notSynced
      },
      git: {
        staged: gitStatus.staged,
        modified: gitStatus.modified,
        needsSync: gitStatus.needsSync
      },
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
    console.log(`📁 Files: ${status.files.total} total, ${status.files.synced} synced, ${status.files.needsUpdate} need updates`);
    console.log(`🔧 Config: ${status.config.hasConfig ? '✅ Loaded' : '❌ Missing'}`);
    console.log(`📊 Databases: ${status.config.databases.join(', ')}`);
    console.log(`🎯 Git: ${status.git.staged.length} staged, ${status.git.modified.length} modified`);
    
    if (status.git.needsSync.length > 0) {
      console.log(`🔄 ${status.git.needsSync.length} files need Notion sync`);
    } else {
      console.log('✅ All files synchronized');
    }
  }

  /**
   * Setup documentation database
   */
  async setupDocsDatabase(): Promise<DocumentSetupResult> {
    this.ensureInitialized();
    return this.docProcessor!.setupDocsDatabase();
  }

  /**
   * Upload documentation files
   */
  async uploadDocumentation(options: DocumentUploadOptions = {}): Promise<DocumentUploadResult> {
    this.ensureInitialized();
    
    // Find documentation files
    const docFiles = await this.fileDiscovery!.findDocumentationFiles();
    
    return this.docProcessor!.uploadDocumentation(docFiles, options);
  }

  /**
   * Fix docs database
   */
  async fixDocsDatabase(): Promise<DatabaseFixResult> {
    this.ensureInitialized();
    return this.docProcessor!.fixDocsDatabase();
  }

  /**
   * Get sync recommendations
   */
  async getSyncRecommendations(): Promise<{
    recommendations: Array<{
      type: 'sync' | 'config' | 'git' | 'docs';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      action: string;
    }>;
  }> {
    const status = await this.getSystemStatus();
    const gitRecommendations = await this.gitIntegration.getIntegrationRecommendations();
    const recommendations = [...gitRecommendations.recommendations];

    if (status.files.needsUpdate > 0) {
      recommendations.push({
        type: 'sync',
        priority: 'high',
        title: 'Sync Pending Files',
        description: `${status.files.needsUpdate} files need syncing to Notion`,
        action: 'Run executeSync() to upload pending changes'
      });
    }

    if (!status.config.hasConfig) {
      recommendations.push({
        type: 'config',
        priority: 'high',
        title: 'Configure Notion Integration',
        description: 'Notion configuration is missing or incomplete',
        action: 'Run configuration setup to connect to Notion workspace'
      });
    }

    if (!status.config.databases.includes('docs')) {
      recommendations.push({
        type: 'docs',
        priority: 'medium',
        title: 'Setup Documentation Database',
        description: 'Documentation database not configured',
        action: 'Run setupDocsDatabase() to create documentation tracking'
      });
    }

    return { recommendations };
  }

  /**
   * Validate service setup
   */
  private ensureInitialized(): void {
    if (!this.config || !this.notionClient || !this.fileDiscovery || !this.syncOrchestrator || !this.docProcessor) {
      throw new Error('Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    components: {
      config: boolean;
      notionClient: boolean;
      fileTracker: boolean;
      gitIntegration: boolean;
    };
  }> {
    const issues: string[] = [];
    const components = {
      config: !!this.config,
      notionClient: !!this.notionClient,
      fileTracker: !!this.fileTracker,
      gitIntegration: true // Git integration is optional
    };

    if (!this.config) {
      issues.push('Configuration not loaded');
    }

    if (!this.notionClient) {
      issues.push('Notion client not initialized');
    }

    // Test file tracker
    try {
      await this.fileTracker.getSyncStats();
    } catch (error) {
      issues.push('File tracker not functioning');
      components.fileTracker = false;
    }

    // Test git integration (optional)
    try {
      await this.gitIntegration.checkGitStatus();
    } catch (error) {
      components.gitIntegration = false;
      // Git issues are not critical
    }

    return {
      healthy: issues.length === 0,
      issues,
      components
    };
  }
}

// Re-export types for convenience
export type {
  SyncWorkflowOptions,
  SyncWorkflowResult,
  SystemStatus,
  GitIntegrationOptions,
  DocumentUploadOptions,
  DocumentUploadResult,
  DocumentSetupResult,
  DatabaseFixResult
} from './WorkflowTypes.js';

export default SyncWorkflowService;