/**
 * Document Tracking Flow Test
 * Tests the integration between dependency analysis and document management
 */

import NotionMarkdownConverter from '../../src/utils/notionMarkdownConverter.js';
import { ConfigManager } from '../../src/utils/configManager.js';
import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface DocumentTrackingResult {
  testName: string;
  success: boolean;
  duration: number;
  details: string;
  data?: any;
  error?: string;
}

export class DocumentTrackingTest {
  private notion: Client;
  private converter: NotionMarkdownConverter;
  private config: any;
  private filesDbId: string;
  private docsDbId: string;

  constructor() {
    this.loadConfig();
    this.notion = new Client({ auth: this.config.apiKey });
    this.converter = new NotionMarkdownConverter(this.config.apiKey);
    
    // Use environment-specific database IDs
    const env = this.config.environment || 'development';
    const envConfig = this.config.environments?.[env];
    
    this.filesDbId = envConfig?.databases?.files || this.config.databases?.files;
    this.docsDbId = envConfig?.databases?.docs || this.config.databases?.docs;
    
    console.log(`🔧 Using ${env} environment`);
    console.log(`📂 Files DB: ${this.filesDbId}`);
    console.log(`📚 Docs DB: ${this.docsDbId}`);
  }

  private loadConfig() {
    try {
      const fs = require('fs');
      const configPath = join(process.cwd(), 'deplink.config.json');
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!this.config.apiKey || !this.config.databases?.files || !this.config.databases?.docs) {
        throw new Error('Missing required configuration');
      }
    } catch (error) {
      throw new Error(`Configuration error: ${error}`);
    }
  }

  /**
   * Simple markdown to blocks converter for testing
   */
  private markdownToBlocks(markdown: string): any[] {
    const lines = markdown.split('\n');
    const blocks: any[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Simple paragraph blocks
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: line }
          }]
        }
      });
    }
    
    return blocks;
  }

  /**
   * Run all document tracking tests
   */
  async runAllTests(): Promise<DocumentTrackingResult[]> {
    console.log('🔄 Starting Document Tracking Flow Tests...\n');
    
    const results: DocumentTrackingResult[] = [];

    // Test 1: Single document conversion verification
    results.push(await this.testSingleDocumentConversion());

    // Test 2: Notion data retrieval structure
    results.push(await this.testNotionDataRetrieval());

    // Test 3: Files database query
    results.push(await this.testFilesDbQuery());

    // Test 4: Docs database query  
    results.push(await this.testDocsDbQuery());

    // Test 5: Document-file relationship mapping
    results.push(await this.testDocumentFileMapping());

    // Test 6: Metadata extraction and tracking
    results.push(await this.testMetadataTracking());

    return results;
  }

  /**
   * Test 1: Single document markdown conversion verification
   */
  private async testSingleDocumentConversion(): Promise<DocumentTrackingResult> {
    const testName = 'Single Document Markdown Conversion';
    const startTime = Date.now();

    try {
      console.log('📄 Testing single document conversion...');

      // Create a test markdown document
      const testMarkdown = `# Document Tracking Test

This document tests the **document tracking flow** with dependency analysis.

## Code Dependencies

The following files are related to this document:

- \`src/main.ts\` - Main application entry
- \`src/utils/notionClient.ts\` - Notion API client
- \`src/services/syncWorkflowService.ts\` - Sync workflow

## Features Tested

1. **Markdown to Notion conversion**
2. **Metadata preservation** 
3. **Dependency tracking**
4. **Document retrieval**

### Code Example

\`\`\`typescript
interface DocumentMetadata {
  id: string;
  title: string;
  relatedFiles: string[];
  dependencies: string[];
}
\`\`\`

### Task List

- [x] Create test document
- [x] Convert to Notion
- [ ] Verify conversion
- [ ] Test metadata extraction

> This document is used for testing document tracking workflows.

---

**End of test document**`;

      // Create page in docs database instead of as a regular page
      const newPage = await this.notion.pages.create({
        parent: { database_id: this.docsDbId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: 'Document Tracking Test'
                }
              }
            ]
          }
        },
        children: this.markdownToBlocks(testMarkdown)
      });

      const pageId = newPage.id;
      if (!pageId) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: 'No page ID returned from creation',
        };
      }

      // Wait for Notion to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Convert back to markdown
      const backConversionResult = await this.converter.notionToMarkdown(pageId, {
        includeMetadata: true,
        preserveFormatting: true
      });

      if (!backConversionResult.success || !backConversionResult.content) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: 'Failed to convert back to markdown',
          error: backConversionResult.error
        };
      }

      // Save converted result for inspection
      const outputPath = join(process.cwd(), 'test-conversion-result.md');
      writeFileSync(outputPath, backConversionResult.content, 'utf8');

      // Analyze conversion quality
      const originalLines = testMarkdown.split('\n').length;
      const convertedLines = backConversionResult.content.split('\n').length;
      const originalWords = testMarkdown.split(/\s+/).length;
      const convertedWords = backConversionResult.content.split(/\s+/).length;

      const lineRatio = convertedLines / originalLines;
      const wordRatio = convertedWords / originalWords;

      const success = lineRatio > 0.8 && wordRatio > 0.8;

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: `Conversion ${success ? 'passed' : 'failed'}: ${convertedWords} words (${(wordRatio * 100).toFixed(1)}% of original), ${convertedLines} lines (${(lineRatio * 100).toFixed(1)}% of original)`,
        data: {
          pageId,
          outputPath,
          originalStats: { lines: originalLines, words: originalWords },
          convertedStats: { lines: convertedLines, words: convertedWords },
          ratios: { lines: lineRatio, words: wordRatio }
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Exception during conversion test',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test 2: Notion data retrieval structure verification
   */
  private async testNotionDataRetrieval(): Promise<DocumentTrackingResult> {
    const testName = 'Notion Data Retrieval Structure';
    const startTime = Date.now();

    try {
      console.log('🔍 Testing Notion data retrieval...');

      // Test database connection
      const filesDb = await this.notion.databases.retrieve({
        database_id: this.filesDbId
      });

      const docsDb = await this.notion.databases.retrieve({
        database_id: this.docsDbId
      });

      // Check database properties
      const filesProperties = Object.keys((filesDb as any).properties || {});
      const docsProperties = Object.keys((docsDb as any).properties || {});

      const requiredFilesProps = ['File Path', 'Extension', 'Status'];
      const requiredDocsProps = ['Title', 'Type', 'Related Files'];

      const missingFilesProps = requiredFilesProps.filter(prop => !filesProperties.includes(prop));
      const missingDocsProps = requiredDocsProps.filter(prop => !docsProperties.includes(prop));

      const success = missingFilesProps.length === 0 && missingDocsProps.length === 0;

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: success 
          ? `Database structure verified: files(${filesProperties.length} props), docs(${docsProperties.length} props)`
          : `Missing properties - files: [${missingFilesProps.join(', ')}], docs: [${missingDocsProps.join(', ')}]`,
        data: {
          filesDb: {
            id: this.filesDbId,
            properties: filesProperties
          },
          docsDb: {
            id: this.docsDbId,
            properties: docsProperties
          },
          missingProperties: {
            files: missingFilesProps,
            docs: missingDocsProps
          }
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Failed to retrieve database structure',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test 3: Files database query
   */
  private async testFilesDbQuery(): Promise<DocumentTrackingResult> {
    const testName = 'Files Database Query';
    const startTime = Date.now();

    try {
      console.log('📂 Testing files database query...');

      // Query files database
      const response = await this.notion.dataSources.query({
        data_source_id: this.filesDbId,
        page_size: 10
      });

      const files = response.results;
      const fileCount = files.length;

      if (fileCount === 0) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: 'No files found in database - may need to run sync first'
        };
      }

      // Analyze file properties
      const sampleFile = files[0] as any;
      const properties = sampleFile.properties;
      const propertyNames = Object.keys(properties);

      // Check for essential properties
      const hasFilePath = propertyNames.some(name => name.toLowerCase().includes('path') || name.toLowerCase().includes('title'));
      const hasExtension = propertyNames.some(name => name.toLowerCase().includes('extension'));
      const hasStatus = propertyNames.some(name => name.toLowerCase().includes('status'));

      const success = hasFilePath && hasExtension && hasStatus;

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: `Found ${fileCount} files with ${propertyNames.length} properties. Essential props: ${success ? 'all present' : 'missing some'}`,
        data: {
          fileCount,
          sampleProperties: propertyNames,
          essentialProperties: { hasFilePath, hasExtension, hasStatus },
          sampleFile: {
            id: sampleFile.id,
            properties: Object.keys(properties).reduce((acc, key) => {
              const prop = properties[key];
              acc[key] = prop.type;
              return acc;
            }, {} as any)
          }
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Failed to query files database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test 4: Docs database query
   */
  private async testDocsDbQuery(): Promise<DocumentTrackingResult> {
    const testName = 'Docs Database Query';
    const startTime = Date.now();

    try {
      console.log('📚 Testing docs database query...');

      // Query docs database
      const response = await this.notion.dataSources.query({
        data_source_id: this.docsDbId,
        page_size: 10
      });

      const docs = response.results;
      const docCount = docs.length;

      if (docCount === 0) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: 'No documents found in database - may need to upload docs first'
        };
      }

      // Analyze doc properties
      const sampleDoc = docs[0] as any;
      const properties = sampleDoc.properties;
      const propertyNames = Object.keys(properties);

      // Check for essential properties
      const hasTitle = propertyNames.some(name => name.toLowerCase().includes('title') || name.toLowerCase().includes('name'));
      const hasType = propertyNames.some(name => name.toLowerCase().includes('type'));
      const hasRelatedFiles = propertyNames.some(name => name.toLowerCase().includes('related') && name.toLowerCase().includes('file'));

      const success = hasTitle && hasType;

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: `Found ${docCount} docs with ${propertyNames.length} properties. Has relationships: ${hasRelatedFiles}`,
        data: {
          docCount,
          sampleProperties: propertyNames,
          essentialProperties: { hasTitle, hasType, hasRelatedFiles },
          sampleDoc: {
            id: sampleDoc.id,
            properties: Object.keys(properties).reduce((acc, key) => {
              const prop = properties[key];
              acc[key] = prop.type;
              return acc;
            }, {} as any)
          }
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Failed to query docs database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test 5: Document-file relationship mapping
   */
  private async testDocumentFileMapping(): Promise<DocumentTrackingResult> {
    const testName = 'Document-File Relationship Mapping';
    const startTime = Date.now();

    try {
      console.log('🔗 Testing document-file relationship mapping...');

      // Get sample documents and files
      const [docsResponse, filesResponse] = await Promise.all([
        this.notion.dataSources.query({
          data_source_id: this.docsDbId,
          page_size: 5
        }),
        this.notion.dataSources.query({
          data_source_id: this.filesDbId,
          page_size: 5
        })
      ]);

      const docs = docsResponse.results;
      const files = filesResponse.results;

      if (docs.length === 0 || files.length === 0) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: `Insufficient data for mapping test: ${docs.length} docs, ${files.length} files`
        };
      }

      // Analyze relationships
      let relationshipsFound = 0;
      const mappingData: any[] = [];

      for (const doc of docs.slice(0, 3)) {
        const docProps = (doc as any).properties;
        
        // Look for relation properties
        for (const [propName, propData] of Object.entries(docProps)) {
          if ((propData as any).type === 'relation') {
            const relationData = (propData as any).relation;
            if (relationData && relationData.length > 0) {
              relationshipsFound++;
              mappingData.push({
                docId: doc.id,
                docTitle: this.extractTitle(docProps),
                relationProperty: propName,
                relatedItems: relationData.length
              });
            }
          }
        }
      }

      const success = relationshipsFound > 0;

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: `Found ${relationshipsFound} relationships across ${mappingData.length} documents`,
        data: {
          totalDocs: docs.length,
          totalFiles: files.length,
          relationshipsFound,
          mappingData
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Failed to analyze document-file mapping',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test 6: Metadata extraction and tracking
   */
  private async testMetadataTracking(): Promise<DocumentTrackingResult> {
    const testName = 'Metadata Extraction and Tracking';
    const startTime = Date.now();

    try {
      console.log('🏷️ Testing metadata extraction...');

      // Get a sample document
      const docsResponse = await this.notion.dataSources.query({
        data_source_id: this.docsDbId,
        page_size: 3
      });

      if (docsResponse.results.length === 0) {
        return {
          testName,
          success: false,
          duration: Date.now() - startTime,
          details: 'No documents available for metadata extraction'
        };
      }

      const metadataResults: any[] = [];

      for (const doc of docsResponse.results.slice(0, 2)) {
        const docData = doc as any;
        
        // Extract standard metadata
        const metadata = {
          id: docData.id,
          title: this.extractTitle(docData.properties),
          createdTime: docData.created_time,
          lastEditedTime: docData.last_edited_time,
          url: docData.url,
          properties: {}
        };

        // Extract custom properties
        for (const [propName, propData] of Object.entries(docData.properties)) {
          const prop = propData as any;
          metadata.properties[propName] = {
            type: prop.type,
            value: this.extractPropertyValue(prop)
          };
        }

        metadataResults.push(metadata);
      }

      const success = metadataResults.length > 0 && metadataResults.every(m => m.title && m.id);

      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details: `Extracted metadata from ${metadataResults.length} documents. All have required fields: ${success}`,
        data: {
          extractedCount: metadataResults.length,
          sampleMetadata: metadataResults[0],
          allMetadata: metadataResults
        }
      };

    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details: 'Failed to extract metadata',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper: Extract title from properties
   */
  private extractTitle(properties: any): string {
    for (const [key, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'title') {
        const titleData = (prop as any).title;
        return titleData?.map((t: any) => t.plain_text).join('') || 'Untitled';
      }
    }
    return 'Untitled';
  }

  /**
   * Helper: Extract property value based on type
   */
  private extractPropertyValue(prop: any): any {
    switch (prop.type) {
      case 'title':
        return prop.title?.map((t: any) => t.plain_text).join('') || '';
      case 'rich_text':
        return prop.rich_text?.map((t: any) => t.plain_text).join('') || '';
      case 'select':
        return prop.select?.name || null;
      case 'multi_select':
        return prop.multi_select?.map((s: any) => s.name) || [];
      case 'date':
        return prop.date?.start || null;
      case 'checkbox':
        return prop.checkbox;
      case 'number':
        return prop.number;
      case 'url':
        return prop.url;
      case 'relation':
        return prop.relation?.map((r: any) => r.id) || [];
      default:
        return null;
    }
  }

  /**
   * Print test results
   */
  printResults(results: DocumentTrackingResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 DOCUMENT TRACKING FLOW TEST RESULTS');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const successRate = (passed / total * 100).toFixed(1);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📊 Summary: ${passed}/${total} tests passed (${successRate}%) in ${totalDuration}ms\n`);

    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Status: ${status} (${duration})`);
      console.log(`   Details: ${result.details}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2).substring(0, 200)}${JSON.stringify(result.data).length > 200 ? '...' : ''}`);
      }
      
      console.log('');
    });

    console.log('-'.repeat(60));

    if (passed === total) {
      console.log('🎉 All tests passed! Document tracking flow is ready.');
    } else {
      console.log(`⚠️  ${total - passed} test(s) failed. Check details above.`);
    }

    console.log('='.repeat(60) + '\n');
  }
}

export default DocumentTrackingTest;