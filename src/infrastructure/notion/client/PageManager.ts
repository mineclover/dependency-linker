import { Client } from '@notionhq/client';
import type { ProjectFile, UploadResult } from '../../../shared/types/index.js';
import { NotionApiClient } from './ApiClient.js';
import * as crypto from 'crypto';

/**
 * Notion page management with CRUD operations
 * Handles page creation, updates, content management, and tracking
 */
export class NotionPageManager {
  private apiClient: NotionApiClient;

  constructor(apiClient: NotionApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Upload a document to Notion database
   */
  async uploadDoc(doc: {
    name: string;
    content: string;
    documentType: string;
    filePath?: string;
    wordCount?: number;
    readingTime?: number;
    relatedFileIds?: string[];
  }, docsDbId: string, existingDocs?: Record<string, string>): Promise<UploadResult> {
    try {
      // Check if document already exists
      if (existingDocs && existingDocs[doc.name]) {
        console.log(`⏭️  Skipping existing document: ${doc.name}`);
        return {
          file: {} as ProjectFile,
          notionId: existingDocs[doc.name],
          success: true,
          skipped: true,
        };
      }

      console.log(`📄 Uploading documentation: ${doc.name}`);

      // Get property mapping (simplified for now)
      const propertyMapping = {
        name: 'Name',
        type: 'Type', 
        lastupdated: 'Last Updated',
        status: 'Status',
        filepath: 'File Path',
        wordcount: 'Word Count',
        readingtime: 'Reading Time'
      };

      const properties: any = {
        [propertyMapping.name]: {
          title: [
            {
              type: 'text',
              text: {
                content: doc.name,
              },
            },
          ],
        },
        [propertyMapping.type]: {
          select: {
            name: doc.documentType,
          },
        },
        [propertyMapping.lastupdated]: {
          date: {
            start: new Date().toISOString(),
          },
        },
        [propertyMapping.status]: {
          select: {
            name: 'Published',
          },
        },
      };

      // Add file path if available
      if (doc.filePath) {
        properties[propertyMapping.filepath] = {
          rich_text: [
            {
              type: 'text',
              text: {
                content: doc.filePath,
              },
            },
          ],
        };
      }

      // Add word count if available
      if (doc.wordCount) {
        properties[propertyMapping.wordcount] = {
          number: doc.wordCount,
        };
      }

      // Add reading time if available
      if (doc.readingTime) {
        properties[propertyMapping.readingtime] = {
          number: doc.readingTime,
        };
      }

      // Add related files if specified
      if (doc.relatedFileIds && doc.relatedFileIds.length > 0) {
        properties['Related Files'] = {
          relation: doc.relatedFileIds.map(id => ({ id })),
        };
      }

      const response = await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.create({
          parent: {
            database_id: docsDbId,
          },
          properties,
        })
      );

      return {
        file: {} as ProjectFile, // Placeholder
        notionId: response.id,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Failed to upload documentation ${doc.name}:`, error);
      
      return {
        file: {} as ProjectFile,
        notionId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload a file to Notion database
   */
  async uploadFile(file: ProjectFile, databaseId: string, dependencyGraph?: any): Promise<UploadResult> {
    try {
      console.log(`📁 Processing file: ${file.name}`);

      const properties: any = {
        'Name': {
          title: [
            {
              type: 'text',
              text: {
                content: file.name,
              },
            },
          ],
        },
        'File Path': {
          rich_text: [
            {
              type: 'text',
              text: {
                content: file.path,
              },
            },
          ],
        },
        'Extension': {
          select: {
            name: file.extension || 'Other',
          },
        },
        'Size (bytes)': {
          number: file.size || 0,
        },
        'Last Modified': {
          date: {
            start: file.lastModified || new Date().toISOString(),
          },
        },
        'Status': {
          select: {
            name: 'Uploaded',
          },
        },
        'Project': {
          select: {
            name: 'dependency-linker',
          },
        },
      };

      const response = await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.create({
          parent: {
            database_id: databaseId,
          },
          properties,
        })
      );

      console.log(`✅ Created page: ${file.name} (${response.id})`);

      // Add dependency information if available
      if (dependencyGraph && file.dependencies) {
        await this.addDependencyInformation(file, response.id);
      }

      return {
        file,
        notionId: response.id,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Failed to upload file ${file.name}:`, error);
      return {
        file,
        notionId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing file in Notion
   */
  async updateFile(file: ProjectFile, notionPageId: string): Promise<UploadResult> {
    try {
      console.log(`🔄 Updating file: ${file.name}`);

      const properties: any = {
        'Name': {
          title: [
            {
              type: 'text',
              text: {
                content: file.name,
              },
            },
          ],
        },
        'File Path': {
          rich_text: [
            {
              type: 'text',
              text: {
                content: file.path,
              },
            },
          ],
        },
        'Extension': {
          select: {
            name: file.extension || 'Other',
          },
        },
        'Size (bytes)': {
          number: file.size || 0,
        },
        'Last Modified': {
          date: {
            start: file.lastModified || new Date().toISOString(),
          },
        },
        'Status': {
          select: {
            name: 'Updated',
          },
        },
      };

      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.update({
          page_id: notionPageId,
          properties,
        })
      );

      console.log(`✅ Updated page: ${file.name} (${notionPageId})`);

      return {
        file,
        notionId: notionPageId,
        success: true,
      };
    } catch (error) {
      console.error(`❌ Failed to update file ${file.name}:`, error);
      return {
        file,
        notionId: notionPageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Append content to a Notion page
   */
  async appendToPage(pageId: string, content: string): Promise<void> {
    try {
      // Split content into blocks (2000 char limit per block)
      const blocks = this.chunkContent(content, 2000);
      
      for (const block of blocks) {
        await this.apiClient.getApiQueue().add(async () => {
          await this.apiClient.getClient().blocks.children.append({
            block_id: pageId,
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: {
                        content: block,
                      },
                    },
                  ],
                },
              },
            ],
          });
        });
      }

      console.log(`✅ Content appended to page: ${pageId}`);
    } catch (error) {
      console.error('❌ Failed to append content to page:', error);
      throw error;
    }
  }

  /**
   * Process Notion IDs for files
   */
  async processNotionIds(files: ProjectFile[]): Promise<ProjectFile[]> {
    return files.map(file => {
      if (!file.notionId) {
        file.notionId = this.generateTemporaryId(file.path);
      }
      return file;
    });
  }

  /**
   * Generate content hash for change detection
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate temporary ID for files without Notion pages
   */
  private generateTemporaryId(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.css': 'css',
      '.html': 'html',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
    };
    return languageMap[extension] || 'plain text';
  }

  /**
   * Chunk content into blocks respecting size limits
   */
  private chunkContent(content: string, maxSize: number = 2000): string[] {
    if (content.length <= maxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = content.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          // Line is too long, split it
          chunks.push(line.substring(0, maxSize));
          currentChunk = line.substring(maxSize);
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Add dependency information to a file page
   */
  private async addDependencyInformation(file: ProjectFile, pageId: string): Promise<void> {
    if (!file.dependencies || file.dependencies.length === 0) {
      return;
    }

    try {
      const dependencyText = `Dependencies:\n${file.dependencies.join('\n')}`;
      await this.appendToPage(pageId, dependencyText);
    } catch (error) {
      console.warn(`⚠️ Failed to add dependency information for ${file.name}:`, error);
    }
  }
}