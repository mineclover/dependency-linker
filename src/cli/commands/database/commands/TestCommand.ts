/**
 * Database Test Command - Notion 연결 테스트
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';

export function createTestCommand(): Command {
  return new Command('test')
    .description('Notion 데이터베이스 연결을 테스트합니다')
    .action(async () => {
      console.log('🔌 Notion 연결을 테스트합니다...');
      
      try {
        const notionService = await DatabaseCommandFactory.createNotionService();
        const connected = await notionService.testConnection();
        
        if (connected) {
          console.log('✅ Notion 연결 성공!');
          
          // 설정된 데이터베이스들 확인
          const databases = ['files', 'functions', 'dependencies', 'libraries', 'classes'];
          let configuredCount = 0;
          
          const { config } = await DatabaseCommandFactory.getConfigService();
          console.log('\n📊 설정된 데이터베이스:');
          
          for (const dbName of databases) {
            const dbId = config.databases[dbName as keyof typeof config.databases];
            if (dbId) {
              try {
                const result = await notionService.retrieveDatabase(dbId);
                if (result.success) {
                  console.log(`   ✅ ${dbName}: ${dbId}`);
                  configuredCount++;
                } else {
                  throw new Error(result.error?.message || 'Database access failed');
                }
              } catch (error: any) {
                if (error.message?.includes("archived") || error.message?.includes("Can't edit block that is archived")) {
                  console.log(`   📦 ${dbName}: ${dbId} (아카이브됨)`);
                  console.log(`      🔗 복구: https://notion.so/${dbId.replace(/-/g, '')}`);
                } else {
                  console.log(`   ❌ ${dbName}: ${dbId} (접근 불가)`);
                }
              }
            } else {
              console.log(`   ⚠️  ${dbName}: 설정되지 않음`);
            }
          }
          
          console.log(`\n🎯 ${configuredCount}/5 데이터베이스가 올바르게 설정되었습니다.`);
          
          // Ensure process exits after successful completion
          process.exit(0);
        } else {
          console.log('❌ Notion 연결 실패');
          process.exit(1);
        }
      } catch (error: any) {
        console.error(`💥 연결 테스트 실패: ${error.message}`);
        process.exit(1);
      }
    });
}