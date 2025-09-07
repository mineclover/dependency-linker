/**
 * Database Reset Command - 데이터베이스 리셋
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';

export function createResetCommand(): Command {
  return new Command('reset')
    .description('데이터베이스의 모든 항목을 삭제합니다 (주의!)')
    .requiredOption('-d, --database <name>', '데이터베이스 이름')
    .option('--confirm', '삭제를 확인합니다 (필수)')
    .action(async (options) => {
      if (!options.confirm) {
        console.log('🚨 이 명령은 데이터베이스의 모든 항목을 삭제합니다!');
        console.log('💡 계속하려면 --confirm 플래그를 추가하세요:');
        console.log(`   bun run db:reset -d ${options.database} --confirm`);
        process.exit(1);
      }

      console.log(`🚨 ${options.database} 데이터베이스의 모든 항목을 삭제합니다...`);
      console.log('⚠️ 이 작업은 되돌릴 수 없습니다!\n');
      
      try {
        const { config } = await DatabaseCommandFactory.getConfigService();
        const notionService = await DatabaseCommandFactory.createNotionService();
        const dbId = config.databases[options.database as keyof typeof config.databases];
        
        if (!dbId) {
          console.log(`❌ ${options.database} 데이터베이스 ID가 설정되지 않았습니다.`);
          process.exit(1);
        }

        // 데이터베이스의 모든 페이지 조회
        console.log('🔍 데이터베이스 항목들을 조회하는 중...');
        const queryResult = await notionService.queryDatabase(dbId, {});
        
        if (!queryResult.success) {
          console.log(`❌ 데이터베이스 조회 실패: ${queryResult.error?.message}`);
          process.exit(1);
        }

        const pages = queryResult.data.results;
        console.log(`📄 ${pages.length}개 항목을 발견했습니다.`);

        if (pages.length === 0) {
          console.log('✅ 데이터베이스가 이미 비어있습니다.');
          return;
        }

        // 5초 대기
        console.log('⏳ 5초 후 삭제를 시작합니다. 중단하려면 Ctrl+C를 누르세요...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 모든 페이지 삭제
        let deletedCount = 0;
        let errorCount = 0;

        for (const page of pages) {
          try {
            const result = await notionService.updatePage(page.id, { archived: true });
            if (result.success) {
              deletedCount++;
              console.log(`🗑️ 삭제됨: ${page.id} (${deletedCount}/${pages.length})`);
            } else {
              errorCount++;
              console.log(`❌ 삭제 실패: ${page.id} - ${result.error?.message}`);
            }
        // Ensure process exits after successful completion
        process.exit(0);

          } catch (error: any) {
            errorCount++;
            console.log(`❌ 삭제 실패: ${page.id} - ${error.message}`);
          }
        }

        console.log('\n📊 삭제 결과:');
        console.log(`   삭제됨: ${deletedCount}개`);
        console.log(`   실패: ${errorCount}개`);
        
        if (deletedCount > 0) {
          console.log(`\n✅ ${options.database} 데이터베이스 리셋 완료!`);
          console.log('💡 새로운 데이터를 업로드할 수 있습니다.');
        }

        // Ensure process exits after successful completion
        process.exit(0);

      } catch (error: any) {
        console.error(`💥 리셋 실패: ${error.message}`);
        process.exit(1);
      }
    });
}
