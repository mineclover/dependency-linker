/**
 * Documentation processing service
 * Handles documentation-specific operations, metadata, and content analysis
 */

import fs from 'fs/promises';
import matter from 'gray-matter';
import type { INotionUploader, IFileTracker } from '../../domain/interfaces/index.js';
import type { NotionConfig, NotionPage } from '../../shared/types/index.js';
import type { 
  DocumentUploadOptions,
  DocumentUploadResult,
  DocumentSetupResult,
  DatabaseFixResult,
  DocumentFile,
  DocumentMetadata,
  FrontMatterData
} from './WorkflowTypes.js';
import { DocumentAnalyzer } from './DocumentAnalyzer.js';

export class DocumentationProcessor {
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
   * Setup documentation database with proper schema
   */
  async setupDocsDatabase(): Promise<DocumentSetupResult> {
    try {
      console.log('📚 Setting up docs database...');
      
      // Display target workspace
      this.displayWorkspaceInfo();

      // Create docs database
      const docsDbId = await this.notionClient.createDatabase('Project Documentation', 'docs');
      
      // Get files database ID for relationship
      const filesDbId = this.config.databases?.files;
      if (!filesDbId) {
        throw new Error('Files database not found. Run sync first.');
      }

      // Add relationship between docs and files
      await this.notionClient.addDocsToFilesRelation(docsDbId, filesDbId);

      // Update config
      if (!this.config.databases) {
        this.config.databases = {};
      }
      this.config.databases.docs = docsDbId;

      console.log(`✅ Docs database created: ${docsDbId}`);

      return {
        success: true,
        docsDbId,
      };
    } catch (error) {
      console.error('❌ Failed to setup docs database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload documentation files to Notion
   */
  async uploadDocumentation(
    documentFiles: DocumentFile[],
    options: DocumentUploadOptions = {}
  ): Promise<DocumentUploadResult> {
    const result: DocumentUploadResult = {
      success: true,
      docsUploaded: 0,
      docsSkipped: 0,
      relationships: 0,
      errors: []
    };

    try {
      console.log('📚 Uploading documentation...');
      
      // Display target workspace
      this.displayWorkspaceInfo();

      // Get docs database ID
      const docsDbId = this.config.databases?.docs;
      if (!docsDbId) {
        throw new Error('Docs database not found. Run setup-docs first.');
      }

      console.log(`📄 Found ${documentFiles.length} documentation files`);

      // Check existing documents to prevent duplicates
      const existingDocs = await this.notionClient.queryExistingDocs(docsDbId);

      // Get related file IDs if specified
      let relatedFileIds: string[] = [];
      if (options.relateTo && options.relateTo.length > 0) {
        relatedFileIds = await this.getFileNotionIds(options.relateTo);
        result.relationships = relatedFileIds.length;
      }

      // Upload each documentation file
      for (const docFile of documentFiles) {
        const fileResult = await this.processDocumentFile(
          docFile, 
          docsDbId, 
          existingDocs, 
          relatedFileIds, 
          options
        );
        
        this.updateDocResult(result, fileResult);
      }

      console.log(`📊 Upload Summary: ${result.docsUploaded} docs uploaded, ${result.docsSkipped} skipped, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      console.error('❌ Failed to upload documentation:', error);
      result.errors.push(`Upload failed: ${error}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Fix docs database by removing problematic properties
   */
  async fixDocsDatabase(): Promise<DatabaseFixResult> {
    try {
      console.log('🔧 Fixing docs database...');
      
      // Display target database
      console.log('\n🌐 Target Notion Database:');
      if (this.config.databases?.docs) {
        console.log(`   Docs Database: ${this.config.databases.docs}`);
        console.log(`   → https://notion.so/${this.config.databases.docs.replace(/[^a-f0-9]/g, '')}`);
      }
      console.log('');

      // Get docs database ID
      const docsDbId = this.config.databases?.docs;
      if (!docsDbId) {
        throw new Error('Docs database not found. Run setup-docs first.');
      }

      // Remove Content property
      await this.notionClient.removeContentProperty(docsDbId);

      console.log('✅ Docs database fixed successfully');

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to fix docs database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a single document file
   */
  private async processDocumentFile(
    docFile: DocumentFile,
    docsDbId: string,
    existingDocs: NotionPage[],
    relatedFileIds: string[],
    options: DocumentUploadOptions
  ): Promise<{
    success: boolean;
    skipped: boolean;
    error?: string;
    notionId?: string;
  }> {
    try {
      const content = await fs.readFile(docFile.path, 'utf-8');

      const documentMetadata: DocumentMetadata = {
        name: docFile.name,
        content: content,
        documentType: options.type || DocumentAnalyzer.inferDocumentType(docFile.name),
        filePath: docFile.relativePath || `./${docFile.name}`,
        wordCount: DocumentAnalyzer.countWords(content),
        readingTime: DocumentAnalyzer.calculateReadingTime(content),
        relatedFileIds: relatedFileIds,
      };

      const uploadResult = await this.notionClient.uploadDoc(documentMetadata, docsDbId, existingDocs);
      
      if (uploadResult.success) {
        if (uploadResult.skipped) {
          console.log(`⏭️ Skipped existing: ${docFile.name}`);
          return { success: true, skipped: true };
        } else {
          console.log(`✅ Uploaded: ${docFile.name} -> ${uploadResult.notionId}`);
          
          // Update front-matter with new Notion page ID
          try {
            await this.updateDocumentFrontMatter(docFile.path, {
              notion_page_id: uploadResult.notionId,
              notion_database_id: docsDbId,
              last_synced: new Date().toISOString(),
              category: 'docs',
              auto_generated: true
            });
            console.log(`📝 Updated front-matter for: ${docFile.name}`);
          } catch (fmError) {
            console.warn(`⚠️ Failed to update front-matter for ${docFile.name}: ${fmError}`);
          }
          
          return { success: true, skipped: false, notionId: uploadResult.notionId };
        }
      } else {
        return { success: false, skipped: false, error: uploadResult.error };
      }
    } catch (error) {
      return { 
        success: false, 
        skipped: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update documentation upload result
   */
  private updateDocResult(
    result: DocumentUploadResult, 
    fileResult: { success: boolean; skipped: boolean; error?: string }
  ): void {
    if (fileResult.success) {
      if (fileResult.skipped) {
        result.docsSkipped++;
      } else {
        result.docsUploaded++;
      }
    } else {
      result.success = false;
      if (fileResult.error) {
        result.errors.push(fileResult.error);
      }
    }
  }

  /**
   * Display workspace information
   */
  private displayWorkspaceInfo(): void {
    console.log('\n🌐 Target Notion Workspace:');
    console.log(`   Workspace: ${this.config.workspaceInfo?.workspaceUrl || 'https://www.notion.so'}`);
    
    if (this.config.databases?.docs) {
      console.log(`   Docs Database: ${this.config.databases.docs}`);
      console.log(`   → https://notion.so/${this.config.databases.docs.replace(/[^a-f0-9]/g, '')}`);
    }
    
    if (this.config.databases?.files) {
      console.log(`   Files Database: ${this.config.databases.files}`);
      console.log(`   → https://notion.so/${this.config.databases.files.replace(/[^a-f0-9]/g, '')}`);
    }
    
    console.log('');
  }


  /**
   * Get Notion IDs for file paths
   */
  private async getFileNotionIds(filePaths: string[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        const fileInfo = await this.fileTracker.getFileInfo(filePath);
        if (fileInfo?.notionPageId) {
          ids.push(fileInfo.notionPageId);
        }
      } catch (error) {
        console.warn(`Could not find Notion ID for file: ${filePath}`);
      }
    }
    
    return ids;
  }

  /**
   * Update document front-matter with Notion metadata
   */
  private async updateDocumentFrontMatter(
    filePath: string, 
    frontMatterData: FrontMatterData
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(content);
      
      // Update front-matter with new data
      Object.assign(parsed.data, frontMatterData);
      
      // Regenerate file with updated front-matter
      const updatedContent = matter.stringify(parsed.content, parsed.data);
      await fs.writeFile(filePath, updatedContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to update front-matter for ${filePath}: ${error}`);
    }
  }

}