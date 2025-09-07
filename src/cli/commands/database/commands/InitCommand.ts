/**
 * Database Init Command - JSON 파일 기반 스키마 초기화
 */

import { Command } from 'commander';
import { logger } from '../../../../shared/utils/index.js';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';
import { MigrationOrchestrator } from '../../../../services/notion/MigrationOrchestrator.js';
import { NotionDatabaseCreator } from '../../../../services/notion/NotionDatabaseCreator.js';

export function createInitCommand(): Command {
  return new Command('init')
    .description('JSON 파일의 데이터베이스 스키마를 사용하여 초기화합니다')
    .option('-d, --database <name>', '특정 데이터베이스만 초기화 (files, functions, dependencies, libraries, classes, relationships)')
    .option('-f, --force', '기존 속성을 강제로 덮어씁니다')
    .option('--force-recreate', 'Force 옵션: 데이터베이스를 완전히 재생성합니다 (모든 데이터 삭제 주의!)')
    .action(async (options) => {
      console.log('🏗️ JSON 스키마 기반 데이터베이스 초기화를 시작합니다...');
      
      try {
        const { config } = await DatabaseCommandFactory.getConfigService();
        const schemaManager = await DatabaseCommandFactory.createSchemaManager();
        const schemas = await schemaManager.loadSchemas();
        
        const databases = options.database ? [options.database] : Object.keys(schemas.databases);
        
        for (const dbName of databases) {
          if (!schemas.databases[dbName]) {
            console.log(`❌ JSON 파일에서 ${dbName} 스키마를 찾을 수 없습니다.`);
            continue;
          }

          const dbId = config.databases[dbName as keyof typeof config.databases];
          if (!dbId) {
            console.log(`❌ ${dbName} 데이터베이스 ID가 설정되지 않았습니다.`);
            continue;
          }

          console.log(`🔄 ${dbName} 데이터베이스 스키마를 업데이트 중...`);
          console.log(`📋 JSON 스키마: ${Object.keys(schemas.databases[dbName].initial_data_source?.properties || {}).length}개 속성`);
          
          const notionSchema = await schemaManager.getDatabaseSchema(dbName);
          
          try {
            if (options.forceRecreate) {
              console.log(`🚨 Force 모드: ${dbName} 데이터베이스를 재생성합니다...`);
              await handleForceRecreate(dbName, dbId, schemas.databases[dbName], config);
            } else {
              const notionService = await DatabaseCommandFactory.createNotionService();
              const result = await notionService.updateDatabase(dbId, {
                properties: notionSchema.properties
              });
              
              if (result.success) {
                console.log(`✅ ${dbName} 스키마 업데이트 완료 (${Object.keys(notionSchema.properties).length}개 속성)`);
              } else {
                console.log(`❌ ${dbName} 스키마 업데이트 실패: ${result.error?.message}`);
              }
            }
        // Ensure process exits after successful completion
        process.exit(0);

          } catch (error: any) {
            if (error.message.includes("Can't edit block that is archived")) {
              console.log(`📦 ${dbName} 데이터베이스가 아카이브 상태입니다.`);
              console.log(`🔗 복구하려면 다음 링크를 클릭하여 Notion에서 복원하세요:`);
              console.log(`   https://notion.so/${dbId.replace(/-/g, '')}`);
              console.log(`💡 복원 후 다시 실행해주세요: bun run db:init -d ${dbName}`);
            } else {
              console.log(`❌ ${dbName} 스키마 업데이트 실패: ${error.message}`);
            }
          }
        }
        
        console.log('\n🎉 JSON 스키마 기반 초기화 완료!');
        // Ensure process exits after successful completion
        process.exit(0);

      } catch (error: any) {
        console.error(`💥 초기화 실패: ${error.message}`);
        process.exit(1);
      }
    });
}

/**
 * Force 옵션: 데이터베이스 완전 재생성
 */
async function handleForceRecreate(
  dbName: string, 
  dbId: string, 
  dbSchema: any, 
  config: any
): Promise<void> {
  console.log(`🚨 주의: ${dbName} 데이터베이스의 모든 데이터가 삭제됩니다!`);
  console.log('⏳ 5초 후 진행됩니다. 중단하려면 Ctrl+C를 누르세요...');
  
  // 5초 대기
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    const notionService = await DatabaseCommandFactory.createNotionService();
    const creator = new NotionDatabaseCreator(notionService);
    const orchestrator = new MigrationOrchestrator(notionService, process.cwd());
    
    // 1. 기존 데이터베이스의 모든 페이지 조회
    console.log('🔍 기존 데이터베이스 페이지 조회 중...');
    const pagesResult = await notionService.queryDatabase(dbId, {});
    
    if (pagesResult.success && pagesResult.data.results.length > 0) {
      console.log(`📄 ${pagesResult.data.results.length}개 페이지 발견, 삭제 중...`);
      
      // 2. 모든 페이지 삭제
      for (const page of pagesResult.data.results) {
        try {
          await notionService.updatePage(page.id, { archived: true });
          console.log(`🗑️ 페이지 삭제: ${page.id}`);
        } catch (error) {
          console.log(`⚠️ 페이지 삭제 실패: ${page.id} - ${error}`);
        }
      }
    }
    
    // 3. 데이터베이스 스키마 완전 초기화
    console.log('🔧 데이터베이스 스키마 재생성 중...');
    const result = await creator.createDatabase({
      schema: dbSchema,
      parentPageId: config.parentPageId,
      options: {
        cleanupExisting: true,
        description: `Force recreated ${dbName} database with complete schema`
      }
    });
    
    if (result.success) {
      console.log(`✅ ${dbName} 데이터베이스 재생성 완료`);
      console.log(`🆔 새 데이터베이스 ID: ${result.databaseId}`);
      console.log(`🔗 URL: ${result.databaseUrl}`);
      console.log(`\n💡 새 데이터베이스 ID를 설정 파일에 업데이트하세요:`);
      console.log(`   databases.${dbName}: "${result.databaseId}"`);
    } else {
      console.log(`❌ 데이터베이스 재생성 실패: ${result.message}`);
      if (result.errors) {
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
    }
    
        // Ensure process exits after successful completion
        process.exit(0);

  } catch (error: any) {
    console.error(`💥 Force 재생성 실패: ${error.message}`);
    throw error;
  }
}
