/**
 * Database Restore Command - 아카이브된 데이터베이스 복원 가이드
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';
import { NotionUrlBuilder } from '../../../../shared/utils/notionUrlBuilder.js';

export function createRestoreCommand(): Command {
  return new Command('restore')
    .description('아카이브된 데이터베이스를 복원합니다')
    .option('-d, --database <name>', '특정 데이터베이스만 복원')
    .action(async (options) => {
      console.log('🔧 아카이브된 데이터베이스를 확인하고 복원 가이드를 제공합니다...\n');
      
      try {
        const { config } = await DatabaseCommandFactory.getConfigService();
        const notionService = await DatabaseCommandFactory.createNotionService();
        const urlBuilder = new NotionUrlBuilder(config);
        const databases = options.database ? [options.database] : ['files', 'functions', 'dependencies', 'libraries', 'classes'];
        let archivedDatabases = [];
        
        for (const dbName of databases) {
          const dbId = config.databases[dbName as keyof typeof config.databases];
          if (!dbId) {
            console.log(`⚠️ ${dbName}: 데이터베이스 ID가 설정되지 않았습니다.`);
            continue;
          }

          try {
            const result = await notionService.retrieveDatabase(dbId);
            if (result.success) {
              console.log(`✅ ${dbName}: 정상 상태`);
            } else {
              throw new Error(result.error?.message || 'Database access failed');
            }
          } catch (error: any) {
            if (error.message?.includes("archived") || error.message?.includes("Can't edit block that is archived")) {
              archivedDatabases.push({ name: dbName, id: dbId });
              console.log(`📦 ${dbName}: 아카이브 상태 (복원 필요)`);
            } else {
              console.log(`❌ ${dbName}: 접근 불가 (${error.message})`);
            }
          }
        }
        
        if (archivedDatabases.length > 0) {
          console.log('\n🔧 아카이브된 데이터베이스 복원 방법:');
          console.log('📝 다음 링크들을 클릭하여 Notion에서 각 데이터베이스를 복원하세요:\n');
          
          archivedDatabases.forEach(db => {
            console.log(`🔗 ${db.name}: ${urlBuilder.buildDatabaseUrl(db.id)}`);
          });
          
          console.log('\n💡 복원 절차:');
          console.log('   1. 위 링크를 클릭하여 Notion에서 데이터베이스를 엽니다');
          console.log('   2. "Restore" 버튼을 클릭합니다');
          console.log('   3. 복원이 완료되면 "bun run db:test" 명령으로 확인합니다');
          console.log('\n⚠️ 복원은 Notion 웹 인터페이스에서만 가능합니다.');
        } else {
          console.log('\n✅ 모든 데이터베이스가 정상 상태입니다!');
        }
        
        // Ensure process exits after successful completion
        process.exit(0);
      } catch (error: any) {
        console.error(`💥 복원 확인 실패: ${error.message}`);
        process.exit(1);
      }
    });
}