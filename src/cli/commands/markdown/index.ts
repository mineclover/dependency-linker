/**
 * Markdown Commands - Notion-Markdown 변환
 * 📝 deplink markdown
 */

import { Command } from 'commander';
import { NotionMarkdownConverter } from '../../../infrastructure/notion/markdownConverter.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../../../shared/utils/index.js';
import { glob } from 'glob';

export function createMarkdownCommands(): Command {
  const markdownCmd = new Command('markdown')
    .alias('md')
    .description('Notion-Markdown 변환 및 동기화');

  // deplink markdown upload <file> --database <id>
  markdownCmd
    .command('upload <file>')
    .description('Markdown 파일을 Notion 데이터베이스에 업로드')
    .option('--database <id>', 'Target Notion database ID')
    .option('--api-key <key>', 'Notion API key')
    .option('--config <path>', 'Config file path')
    .option('--batch', 'Process all markdown files in directory')
    .action(async (file, options) => {
      try {
        logger.info('📤 Starting Markdown upload to Notion...');

        // Load configuration
        let apiKey = options.apiKey;
        let databaseId = options.database;

        if (!apiKey || !databaseId) {
          if (options.config) {
            try {
              const configContent = await readFile(options.config, 'utf-8');
              const config = JSON.parse(configContent);
              apiKey = apiKey || config.apiKey;
              databaseId = databaseId || config.docsDatabase || config.databaseId;
            } catch (error) {
              logger.error(`Failed to load config file ${options.config}: ${error}`);
            }
          }
        }

        if (!apiKey) {
          logger.error('❌ API key is required. Use --api-key or --config option');
          process.exit(1);
        }

        if (!databaseId) {
          logger.error('❌ Database ID is required. Use --database or --config option');
          process.exit(1);
        }

        const converter = new NotionMarkdownConverter(apiKey);

        if (options.batch) {
          // Batch upload all markdown files
          const pattern = path.join(file, '**/*.md');
          const files = await glob(pattern);
          
          logger.info(`📂 Found ${files.length} markdown files to upload`);
          
          let successCount = 0;
          let failCount = 0;
          
          for (const mdFile of files) {
            try {
              const content = await readFile(mdFile, 'utf-8');
              const fileName = path.basename(mdFile, '.md');
              const relativePath = path.relative(file, mdFile);
              
              logger.info(`📄 Uploading: ${relativePath}`);
              
              const result = await converter.markdownToDatabaseEntry(
                content,
                databaseId,
                fileName,
                { preserveFormatting: true },
                relativePath
              );
              
              if (result.success) {
                successCount++;
                logger.success(`✅ Uploaded: ${fileName} → ${result.metadata?.pageId}`);
              } else {
                failCount++;
                logger.error(`❌ Failed: ${fileName} - ${result.error}`);
              }
              
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
              
            } catch (error) {
              failCount++;
              logger.error(`❌ Error processing ${mdFile}: ${error}`);
            }
          }
          
          logger.info(`\n📊 Upload Summary:`);
          logger.info(`   ✅ Success: ${successCount}`);
          logger.info(`   ❌ Failed: ${failCount}`);
          logger.info(`   📝 Total: ${files.length}`);
          
        } else {
          // Single file upload
          if (!existsSync(file)) {
            logger.error(`❌ File not found: ${file}`);
            process.exit(1);
          }

          const content = await readFile(file, 'utf-8');
          const fileName = path.basename(file, '.md');
          
          const result = await converter.markdownToDatabaseEntry(
            content,
            databaseId,
            fileName,
            { preserveFormatting: true },
            file
          );

          if (result.success) {
            logger.success(`✅ Successfully uploaded to Notion!`);
            logger.info(`   Page ID: ${result.metadata?.pageId}`);
            logger.info(`   URL: https://notion.so/${result.metadata?.pageId?.replace(/-/g, '')}`);
          } else {
            logger.error(`❌ Upload failed: ${result.error}`);
            process.exit(1);
          }
        }

      } catch (error) {
        logger.error(`❌ Upload failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // deplink markdown download <pageId> --output <file>
  markdownCmd
    .command('download <pageId>')
    .description('Notion 페이지를 Markdown으로 다운로드')
    .option('--output <file>', 'Output file path', './downloaded.md')
    .option('--api-key <key>', 'Notion API key')
    .option('--config <path>', 'Config file path')
    .option('--metadata', 'Include page metadata')
    .action(async (pageId, options) => {
      try {
        logger.info('📥 Starting Notion page download...');

        // Load configuration
        let apiKey = options.apiKey;

        if (!apiKey && options.config) {
          try {
            const configContent = await readFile(options.config, 'utf-8');
            const config = JSON.parse(configContent);
            apiKey = apiKey || config.apiKey;
          } catch (error) {
            logger.error(`Failed to load config file ${options.config}: ${error}`);
          }
        }

        if (!apiKey) {
          logger.error('❌ API key is required. Use --api-key or --config option');
          process.exit(1);
        }

        const converter = new NotionMarkdownConverter(apiKey);
        
        const result = await converter.notionToMarkdown(pageId, {
          preserveFormatting: true,
          includeMetadata: true // Always include metadata for rich front-matter
        });

        if (result.success && result.content) {
          // Content already includes rich front-matter from converter
          await writeFile(options.output, result.content, 'utf-8');
          
          logger.success(`✅ Successfully downloaded to: ${options.output}`);
          if (result.metadata) {
            logger.info(`   Title: ${result.metadata.title}`);
            logger.info(`   Created: ${result.metadata.createdTime}`);
            logger.info(`   Last Edited: ${result.metadata.lastEditedTime}`);
          }
        } else {
          logger.error(`❌ Download failed: ${result.error}`);
          process.exit(1);
        }

      } catch (error) {
        logger.error(`❌ Download failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // deplink markdown convert <source> --to <format>
  markdownCmd
    .command('convert <source>')
    .description('파일 형식 변환 (Markdown ↔ Notion)')
    .option('--to <format>', 'Target format (notion|markdown)', 'notion')
    .option('--parent <id>', 'Parent page ID for Notion conversion')
    .option('--output <path>', 'Output path')
    .option('--api-key <key>', 'Notion API key')
    .option('--config <path>', 'Config file path')
    .action(async (source, options) => {
      try {
        logger.info('🔄 Starting format conversion...');

        // Load configuration
        let apiKey = options.apiKey;
        let parentId = options.parent;

        if (!apiKey && options.config) {
          try {
            const configContent = await readFile(options.config, 'utf-8');
            const config = JSON.parse(configContent);
            apiKey = apiKey || config.apiKey;
            parentId = parentId || config.parentPageId;
          } catch (error) {
            logger.error(`Failed to load config file ${options.config}: ${error}`);
          }
        }

        if (!apiKey) {
          logger.error('❌ API key is required. Use --api-key or --config option');
          process.exit(1);
        }

        const converter = new NotionMarkdownConverter(apiKey);

        if (options.to === 'notion') {
          // Markdown to Notion
          if (!parentId) {
            logger.error('❌ Parent ID is required for Notion conversion. Use --parent option');
            process.exit(1);
          }

          if (!existsSync(source)) {
            logger.error(`❌ Source file not found: ${source}`);
            process.exit(1);
          }

          const content = await readFile(source, 'utf-8');
          const fileName = path.basename(source, '.md');
          
          const result = await converter.markdownToNotion(
            content,
            parentId,
            fileName,
            { preserveFormatting: true }
          );

          if (result.success) {
            logger.success(`✅ Successfully converted to Notion!`);
            logger.info(`   Page ID: ${result.metadata?.pageId}`);
            logger.info(`   URL: https://notion.so/${result.metadata?.pageId?.replace(/-/g, '')}`);
          } else {
            logger.error(`❌ Conversion failed: ${result.error}`);
            process.exit(1);
          }

        } else if (options.to === 'markdown') {
          // Notion to Markdown
          const result = await converter.notionToMarkdown(source, {
            preserveFormatting: true,
            includeMetadata: true
          });

          if (result.success && result.content) {
            const outputPath = options.output || './converted.md';
            await writeFile(outputPath, result.content, 'utf-8');
            
            logger.success(`✅ Successfully converted to Markdown!`);
            logger.info(`   Output: ${outputPath}`);
          } else {
            logger.error(`❌ Conversion failed: ${result.error}`);
            process.exit(1);
          }

        } else {
          logger.error(`❌ Invalid format: ${options.to}. Use 'notion' or 'markdown'`);
          process.exit(1);
        }

      } catch (error) {
        logger.error(`❌ Conversion failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // deplink markdown sync <directory> --database <id>
  markdownCmd
    .command('sync <directory>')
    .description('디렉토리의 모든 Markdown 파일을 Notion과 동기화')
    .option('--database <id>', 'Target Notion database ID')
    .option('--api-key <key>', 'Notion API key')
    .option('--config <path>', 'Config file path')
    .option('--watch', 'Watch for changes and auto-sync')
    .option('--interval <ms>', 'Watch interval in milliseconds', '5000')
    .action(async (directory, options) => {
      try {
        logger.info('🔄 Starting Markdown sync...');

        // Load configuration
        let apiKey = options.apiKey;
        let databaseId = options.database;

        if (!apiKey || !databaseId) {
          if (options.config) {
            try {
              const configContent = await readFile(options.config, 'utf-8');
              const config = JSON.parse(configContent);
              apiKey = apiKey || config.apiKey;
              databaseId = databaseId || config.docsDatabase || config.databaseId;
            } catch (error) {
              logger.error(`Failed to load config file ${options.config}: ${error}`);
            }
          }
        }

        if (!apiKey || !databaseId) {
          logger.error('❌ API key and database ID are required');
          process.exit(1);
        }

        const converter = new NotionMarkdownConverter(apiKey);

        const syncDirectory = async () => {
          const pattern = path.join(directory, '**/*.md');
          const files = await glob(pattern);
          
          logger.info(`📂 Syncing ${files.length} markdown files...`);
          
          for (const file of files) {
            try {
              const content = await readFile(file, 'utf-8');
              const fileName = path.basename(file, '.md');
              const relativePath = path.relative(directory, file);
              
              const result = await converter.markdownToDatabaseEntry(
                content,
                databaseId,
                fileName,
                { preserveFormatting: true },
                relativePath
              );
              
              if (result.success) {
                logger.success(`✅ Synced: ${relativePath}`);
              } else {
                logger.error(`❌ Failed: ${relativePath} - ${result.error}`);
              }
              
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
              
            } catch (error) {
              logger.error(`❌ Error syncing ${file}: ${error}`);
            }
          }
        };

        // Initial sync
        await syncDirectory();

        if (options.watch) {
          logger.info(`👀 Watching for changes (interval: ${options.interval}ms)...`);
          
          // Simple polling approach
          setInterval(async () => {
            logger.info('🔄 Checking for changes...');
            await syncDirectory();
          }, parseInt(options.interval));
          
          // Keep process running
          process.stdin.resume();
        }

      } catch (error) {
        logger.error(`❌ Sync failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return markdownCmd;
}