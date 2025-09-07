/**
 * CLI Commands Index - Unified Command Registry
 * Standardized exports for all CLI commands with consistent patterns
 */

import { Command } from 'commander';
import { createInitCommand } from './init.js';
import { createValidateCommand } from './validate.js';
import { createConfigValidateCommand } from './config-validate.js';
import { createStandardizedCommand } from '../core/BaseCommand.js';
import { logger } from '../../shared/utils/index.js';

// Import modular database commands
import { program as databaseCommands } from './database/index.js';

/**
 * Sync command using standardized pattern
 */
const syncCommand = createStandardizedCommand(
  'sync',
  'Synchronize project files with Notion workspace',
  { requiresNotion: true, validateConfig: true },
  async (deps, options) => {
    logger.info('Starting synchronization process...');
    
    // Dynamic import to avoid circular dependencies
    const { SyncService } = await import('../../services/syncService.js');
    
    const syncService = new SyncService(deps.config.projectPath);
    
    if (options.all) {
      await syncService.syncAll({
        dryRun: options.dryRun,
        force: options.force,
        includeDependencies: options.dependencies,
        maxFileSize: options.maxFileSize,
        extensions: options.extensions
      });
    } else if (options.code) {
      await syncService.syncCode({
        pattern: options.pattern,
        dryRun: options.dryRun,
        force: options.force,
        includeContent: options.includeContent
      });
    } else if (options.docs) {
      await syncService.syncDocs({
        docsPath: options.docsPath,
        dryRun: options.dryRun,
        force: options.force
      });
    } else if (options.dependencies) {
      await syncService.syncDependencies({
        dryRun: options.dryRun,
        analyzeOnly: options.analyzeOnly,
        generateReport: options.generateReport
      });
    } else {
      // Default: sync all
      await syncService.syncAll({
        dryRun: options.dryRun,
        force: options.force
      });
    }
    
    logger.success('Synchronization completed successfully!');
  }
);

// Add sync command options
syncCommand
  .option('-a, --all', 'Sync all project components (default)')
  .option('-c, --code', 'Sync code files only')
  .option('-d, --docs', 'Sync documentation only')
  .option('--dependencies', 'Sync dependencies only')
  .option('--dry-run', 'Preview changes without making them')
  .option('-f, --force', 'Force overwrite existing entries')
  .option('--pattern <pattern>', 'File pattern to match (for code sync)')
  .option('--docs-path <path>', 'Custom documentation directory')
  .option('--include-content', 'Include file content in sync')
  .option('--analyze-only', 'Only analyze dependencies without uploading')
  .option('--generate-report', 'Generate dependency analysis report')
  .option('--max-file-size <size>', 'Maximum file size to process (bytes)', '1048576')
  .option('--extensions <exts>', 'File extensions to include (comma-separated)');

/**
 * Upload command using standardized pattern
 */
const uploadCommand = createStandardizedCommand(
  'upload',
  'Upload and analyze files to Notion',
  { requiresNotion: true, validateConfig: true },
  async (deps, options) => {
    try {
      logger.info('Starting upload process...');
      
      // Import UploadService and initialize it with proper DI
      const { UploadService } = await import('../../services/uploadService.js');
      const uploadService = new UploadService(deps.configService, deps.notionApiService);
      
      const uploadOptions = {
        maxFunctions: options.maxFunctions,
        maxDependencies: options.maxDependencies,
        maxLibraries: options.maxLibraries,
        includeContent: options.includeContent,
        skipSQLite: options.skipSqlite,
        skipNotion: options.skipNotion
      };
      
      if (options.file) {
        // Upload single file
        const result = await uploadService.uploadFile(options.file, uploadOptions);
        
        if (result.success) {
          logger.success(`File uploaded successfully!`);
          logger.info(`Functions: ${result.functions}, Dependencies: ${result.localDependencies + result.libraryDependencies}`);
          
          if (result.filePageUrl) {
            logger.info(`Notion Page: ${result.filePageUrl}`);
          }
        } else {
          logger.error(`Upload failed: ${result.errors.join(', ')}`);
          process.exit(1);
        }
      } else if (options.batch) {
        // Upload multiple files
        const files = options.batch.split(',').map((f: string) => f.trim());
        const results = await uploadService.uploadBatch(files, uploadOptions);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        logger.info(`Batch upload completed: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          logger.warning('Some uploads failed. Check the logs for details.');
        }
      } else if (options.project) {
        // Upload entire project
        const projectPath = typeof options.project === 'string' ? options.project : process.cwd();
        const result = await uploadService.uploadEntireProject(projectPath, uploadOptions);
        
        logger.info(`Project upload completed: ${result.successful}/${result.totalFiles} files successful`);
        
        if (result.failed > 0) {
          logger.warning(`${result.failed} files failed to upload`);
        }
      } else {
        logger.error('Please specify --file, --batch, or --project option');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Upload process failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    } finally {
      // Cleanup and ensure process termination
      try {
        const { TempFolderManager } = await import('../../shared/utils/tempFolderManager.js');
        const tempManager = TempFolderManager.getInstanceForCLI();
        tempManager.destroy();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Force process exit after a short delay to allow output to flush
      setTimeout(() => {
        process.exit(0);
      }, 100);
    }
  }
);

// Add upload command options
uploadCommand
  .option('-f, --file <path>', 'Upload single file')
  .option('-b, --batch <files>', 'Upload multiple files (comma-separated)')
  .option('-p, --project [path]', 'Upload entire project')
  .option('--max-functions <n>', 'Maximum functions to create', '10')
  .option('--max-dependencies <n>', 'Maximum dependencies to create', '10')
  .option('--max-libraries <n>', 'Maximum libraries to create', '10')
  .option('--include-content', 'Include file content in upload')
  .option('--skip-sqlite', 'Skip SQLite indexing')
  .option('--skip-notion', 'Skip Notion upload (local analysis only)');

/**
 * Status command using standardized pattern
 */
const statusCommand = createStandardizedCommand(
  'status',
  'Show project and synchronization status',
  { requiresNotion: false, validateConfig: false },
  async (deps, options) => {
    logger.info('Checking project status...');
    
    try {
      // Project information
      const { ProjectDetector } = await import('../../shared/utils/index.js');
      const detection = await ProjectDetector.autoDetectProject();
      
      console.log('\n📊 Project Status:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (detection.projectInfo) {
        console.log(`📦 Project: ${detection.projectInfo.name || 'Unknown'}`);
        console.log(`🏗️  Type: ${detection.projectInfo.type}`);
        console.log(`📍 Root: ${detection.projectRoot}`);
        console.log(`🌳 Git: ${detection.projectInfo.hasGit ? 'Yes' : 'No'}`);
      }
      
      // Configuration status
      console.log('\n⚙️ Configuration:');
      
      try {
        const configValidation = await deps.configService.validateConfig(deps.config);
        console.log(`✅ Valid: ${configValidation.isValid ? 'Yes' : 'No'}`);
        
        if (!configValidation.isValid) {
          console.log(`❌ Errors: ${configValidation.errors.length}`);
          configValidation.errors.forEach(error => {
            console.log(`   • ${error}`);
          });
        }
        
        if (configValidation.warnings.length > 0) {
          console.log(`⚠️  Warnings: ${configValidation.warnings.length}`);
          configValidation.warnings.forEach(warning => {
            console.log(`   • ${warning}`);
          });
        }
      } catch (error) {
        console.log(`❌ Configuration Error: ${error}`);
      }
    
    // Notion connection status - using environment variables
    const apiKey = process.env.NOTION_API_KEY;
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
    
    if (apiKey) {
      console.log('\n🔗 Notion Connection:');
      
      try {
        const { NotionClientFactory } = await import('../../infrastructure/notion/core/NotionClientFactory.js');
        const clientInstance = NotionClientFactory.createClient({
          apiKey: apiKey,
          workspaceUrl: undefined,
          parentPageId: parentPageId,
          projectPath: deps.config.projectPath
        });
        
        const isHealthy = await clientInstance.isHealthy();
        console.log(`✅ Connected: ${isHealthy ? 'Yes' : 'No'}`);
        
        if (isHealthy) {
          const workspaceInfo = await clientInstance.getWorkspaceInfo();
          console.log(`👤 User: ${workspaceInfo.user?.name || 'Unknown'}`);
          if (parentPageId) {
            console.log(`📄 Parent Page: ${parentPageId}`);
          }
        }
      } catch (error) {
        console.log(`❌ Connection failed: ${error}`);
      }
    } else {
      console.log('\n🔗 Notion Connection: Not configured (no NOTION_API_KEY in environment)');
    }
    
    // Database status - using databases from config
    if (deps.config.databases && Object.keys(deps.config.databases).length > 0) {
      console.log('\n🗄️  Databases:');
      Object.entries(deps.config.databases).forEach(([name, id]) => {
        console.log(`   ${name}: ${id ? '✅' : '❌'} ${id || 'Not configured'}`);
      });
    } else {
      console.log('\n🗄️  Databases: None configured');
    }
    
    // Analysis statistics
    try {
      const { analysisIndexManager } = await import('../../services/analysis/analysisIndexManager.js');
      const stats = await analysisIndexManager.getStatistics();
      
      console.log('\n📈 Analysis Statistics:');
      console.log(`   Analyzed Files: ${stats.totalFiles?.count || 0}`);
      console.log(`   Dependencies: ${stats.totalDependencies?.count || 0}`);
      console.log(`   Functions: ${stats.totalFunctions?.count || 0}`);
      console.log(`   Classes: ${stats.totalClasses?.count || 0}`);
      console.log(`   Todos: ${stats.totalTodos?.count || 0}`);
      console.log(`   Last Analysis: Never`);
    } catch (error) {
      console.log('\n📈 Analysis Statistics: Not available');
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Recommendations
    if (detection.recommendations && detection.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      detection.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    } catch (error) {
      logger.error('Status check failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    } finally {
      // Cleanup and ensure process termination
      try {
        const { TempFolderManager } = await import('../../shared/utils/tempFolderManager.js');
        const tempManager = TempFolderManager.getInstanceForCLI();
        tempManager.destroy();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Force process exit after a short delay to allow output to flush
      setTimeout(() => {
        process.exit(0);
      }, 100);
    }
  }
);

/**
 * Health check command
 */
const healthCommand = createStandardizedCommand(
  'health',
  'Perform comprehensive system health check',
  { requiresNotion: true, validateConfig: true },
  async (deps, options) => {
    try {
      logger.info('Performing health check...');
      
      const { DiagnosticService } = await import('../../services/validation/DiagnosticService.js');
      const diagnosticService = new DiagnosticService(
        (deps.notionApiService as any).clientInstance.client,
        deps.configService as any
      );
      
      const diagnostics = await diagnosticService.runComprehensiveDiagnostics();
      
      console.log('\n🏥 System Health Report:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const statusEmoji = {
        'healthy': '✅',
        'degraded': '⚠️',
        'unhealthy': '❌',
        'unknown': '❓'
      };
      
      console.log(`${statusEmoji[diagnostics.overview.systemHealth]} Overall Health: ${diagnostics.overview.systemHealth.toUpperCase()}`);
      console.log(`Total Issues: ${diagnostics.overview.totalIssues}`);
      console.log(`Critical Issues: ${diagnostics.overview.criticalIssues}`);
      
      // Component health
      console.log('\n📊 Components:');
      diagnostics.healthChecks.forEach(check => {
        console.log(`   ${statusEmoji[check.status]} ${check.component}: ${check.status.toUpperCase()}`);
        
        if (check.issues.length > 0) {
          check.issues.forEach(issue => {
            console.log(`      • ${issue}`);
          });
        }
      });
      
      // Recommendations
      if (diagnostics.recommendations.immediate.length > 0) {
        console.log('\n💡 Immediate Actions:');
        diagnostics.recommendations.immediate.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
    } catch (error) {
      logger.error('Health check failed: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    } finally {
      // Cleanup and ensure process termination
      try {
        const { TempFolderManager } = await import('../../shared/utils/tempFolderManager.js');
        const tempManager = TempFolderManager.getInstanceForCLI();
        tempManager.destroy();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Force process exit after a short delay to allow output to flush
      setTimeout(() => {
        process.exit(0);
      }, 100);
    }
  }
);

/**
 * Export Markdown command using standardized pattern
 */
const exportMarkdownCommand = createStandardizedCommand(
  'export-markdown',
  'Export dependencies and Notion content to markdown files',
  { requiresNotion: false, validateConfig: false },
  async (deps, options) => {
    logger.info('Starting markdown export...');
    
    // Import the export functionality
    const { exportMarkdownCommand: runExport } = await import('./export-markdown.js');
    
    // Validate required file path
    if (!options.file) {
      logger.error('File path is required. Use --file option.');
      process.exit(1);
    }
    
    // Build options from CLI arguments
    const exportOptions = {
      filePath: options.file,
      outputDir: options.output,
      depth: options.depth ? parseInt(options.depth) : 2,
      includeReverse: !options.noReverse,
      includeSourceCode: !options.noSource,
      includeNotionContent: !options.noNotion,
      createIndex: !options.noIndex,
      fileNameTemplate: options.template,
      autoCleanup: !options.noCleanup,
      retentionMinutes: options.retention ? parseInt(options.retention) : 60,
      notionApiKey: options.notionKey || deps.config?.notion?.apiKey
    };
    
    // Execute export
    const result = await runExport(exportOptions);
    
    if (result.success) {
      console.log('\n📤 Page-Based Export completed successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📁 Output directory: ${result.outputDir}`);
      console.log(`📄 Notion pages generated: ${result.summary.notionPages}`);
      console.log(`📊 Source files analyzed: ${result.summary.totalFiles}`);
      console.log(`📋 Pages with Notion content: ${result.summary.filesWithNotionContent}`);
      console.log(`📏 Total export size: ${(result.summary.totalSize / 1024).toFixed(2)} KB`);
      console.log(`⏱️ Export time: ${result.summary.exportTime}ms`);
      
      if (result.tempFolderId) {
        console.log(`🔑 Temporary folder ID: ${result.tempFolderId}`);
        console.log(`💡 Tip: Files will be automatically cleaned up after ${exportOptions.retentionMinutes} minutes`);
      }
      
      if (result.exportResult?.indexFile) {
        console.log(`📖 Index file: ${result.exportResult.indexFile}`);
      }

      console.log('\n🎯 Export Method: Files grouped by Notion pages');
      console.log('   Each markdown file represents one Notion page with all related source files.');
      
      // Ensure process exits after successful completion
      process.exit(0);
    } else {
      logger.error(`Export failed: ${result.error}`);
      process.exit(1);
    }
  }
);

// Add export-markdown command options
exportMarkdownCommand
  .option('-f, --file <path>', 'Target file path for dependency exploration')
  .option('-o, --output <dir>', 'Output directory (creates temp folder if not specified)')
  .option('-d, --depth <n>', 'Dependency exploration depth', '2')
  .option('--no-reverse', 'Exclude reverse dependencies')
  .option('--no-source', 'Exclude source code content')
  .option('--no-notion', 'Exclude Notion content')
  .option('--no-index', 'Skip index file creation')
  .option('--no-cleanup', 'Disable automatic cleanup of temp folders')
  .option('--template <template>', 'File name template (e.g., "{name}_{type}")')
  .option('--retention <minutes>', 'Temp folder retention time in minutes', '60')
  .option('--notion-key <key>', 'Notion API key (overrides config)');

/**
 * Export all commands
 */
export const commands = {
  init: createInitCommand,
  validate: createValidateCommand,
  configValidate: createConfigValidateCommand,
  sync: syncCommand,
  upload: uploadCommand,
  status: statusCommand,
  health: healthCommand,
  exportMarkdown: exportMarkdownCommand,
  database: databaseCommands
};

export default commands;