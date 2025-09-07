/**
 * Check the current status of files uploaded to Notion database
 */

import { Client } from '@notionhq/client';
import { NotionClientFactory } from './src/infrastructure/notion/core/NotionClientFactory.js';
import { logger } from './src/shared/utils/index.js';

async function checkFilesUploadStatus() {
  console.log('🔍 Checking Files Database Upload Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Get environment variables
    const apiKey = process.env.NOTION_API_KEY;
    const filesDbId = 'b39a1619-780c-489d-a23a-952d709d65c8'; // From status output
    
    if (!apiKey) {
      console.error('❌ NOTION_API_KEY not found in environment');
      return;
    }

    // Create Notion client
    const client = new Client({ auth: apiKey });

    console.log('\n📊 Files Database Analysis:');
    console.log(`Database ID: ${filesDbId}`);

    // Query the files database
    const response = await client.dataSources.query({
      data_source_id: filesDbId,
      sorts: [
        {
          property: 'Last Modified',
          direction: 'descending'
        }
      ],
      page_size: 10
    });

    console.log(`\n📄 Current uploaded files: ${response.results.length} (showing latest 10)`);

    if (response.results.length === 0) {
      console.log('❌ No files found in the database!');
      return;
    }

    // Display uploaded files
    console.log('\n📁 Recently uploaded files:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    response.results.forEach((page: any, index) => {
      const properties = page.properties;
      const fileName = properties.Name?.title?.[0]?.text?.content || 'Unknown';
      const filePath = properties['File Path']?.rich_text?.[0]?.text?.content || 'Unknown';
      const language = properties.Language?.select?.name || 'Unknown';
      const lastModified = properties['Last Modified']?.date?.start || 'Unknown';
      const dependencyCount = properties['Dependency Count']?.number || 0;
      const functionCount = properties['Function Count']?.number || 0;

      console.log(`${index + 1}. 📄 ${fileName}`);
      console.log(`   Path: ${filePath}`);
      console.log(`   Language: ${language}`);
      console.log(`   Dependencies: ${dependencyCount}`);
      console.log(`   Functions: ${functionCount}`);
      console.log(`   Last Modified: ${lastModified}`);
      console.log('');
    });

    // Get total count
    const totalResponse = await client.dataSources.query({
      data_source_id: filesDbId,
      page_size: 1
    });

    console.log(`📊 Upload Statistics:`);
    console.log(`   Files in Notion DB: ${response.results.length}+ (limited query)`);
    console.log(`   Files in Local Analysis: 228`);
    console.log(`   Upload Coverage: ${((response.results.length / 228) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Failed to check files database:', error);
  }
}

checkFilesUploadStatus().catch(console.error);