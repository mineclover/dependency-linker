/**
 * Database Validate Command - 데이터베이스 권한 및 접근성 검증
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';
import { getServiceContainer } from '../../../../infrastructure/container/ServiceContainer.js';
import { DatabaseAccessValidationService } from '../../../../services/validation/DatabaseAccessValidationService.js';

export function createValidateCommand(): Command {
  return new Command('validate')
    .description('데이터베이스 권한과 접근성을 검증합니다')
    .option('-d, --database <name>', '특정 데이터베이스만 검증')
    .option('--fix', '발견된 문제들을 자동으로 수정합니다')
    .action(async (options) => {
      console.log('🔍 데이터베이스 권한 및 접근성을 검증합니다...\n');
      
      try {
        const container = getServiceContainer();
        const validationService = container.resolve<DatabaseAccessValidationService>('databaseAccessValidationService');
        
        // 검증 실행
        const validationResults = await validationService.validateDatabaseAccess(options.database);
        
        // 검증 결과 출력
        console.log('📊 검증 결과:');
        console.log(`   총 검사 항목: ${validationResults.length}개\n`);
        
        let passedCount = 0;
        let failedCount = 0;
        let warningCount = 0;
        
        validationResults.forEach(result => {
          switch (result.status) {
            case 'passed':
              console.log(`✅ ${result.category}: ${result.message}`);
              passedCount++;
              break;
            case 'failed':
              console.log(`❌ ${result.category}: ${result.message}`);
              if (result.details) {
                result.details.forEach(detail => {
                  console.log(`   └─ ${detail}`);
                });
              }
              failedCount++;
              break;
            case 'warning':
              console.log(`⚠️ ${result.category}: ${result.message}`);
              if (result.details) {
                result.details.forEach(detail => {
                  console.log(`   └─ ${detail}`);
                });
              }
              warningCount++;
              break;
          }
        });
        
        console.log('\n📈 검증 요약:');
        console.log(`   통과: ${passedCount}개`);
        console.log(`   경고: ${warningCount}개`);
        console.log(`   실패: ${failedCount}개`);
        
        // 자동 수정 실행
        if (options.fix && (failedCount > 0 || warningCount > 0)) {
          console.log('\n🔧 문제 자동 수정을 시작합니다...');
          const remediationResult = await validationService.executeAutoRemediation(false);
          
          console.log('\n📊 자동 복구 결과:');
          console.log(`   시도: ${remediationResult.attempted}개`);
          console.log(`   성공: ${remediationResult.successful}개`);
          console.log(`   실패: ${remediationResult.failed}개`);
          
          if (remediationResult.details.length > 0) {
            console.log('\n상세 내역:');
            remediationResult.details.forEach(detail => {
              console.log(`   ${detail}`);
            });
          }
          
          if (remediationResult.successful > 0) {
            console.log('\n✅ 일부 문제가 자동으로 해결되었습니다.');
            console.log('🔍 변경사항을 확인하려면 다시 검증해보세요: bun run db:validate');
          }
        } else if (!options.database) {
          // 시뮬레이션 실행
          const remediationResult = await validationService.executeAutoRemediation(true);
          
          if (remediationResult.attempted > 0) {
            console.log('\n🔍 자동 복구 시뮬레이션:');
            console.log(`   수정 가능한 항목: ${remediationResult.attempted}개`);
            console.log('💡 실제 수정을 하려면 --fix 플래그를 사용하세요.');
          }
        }
        
        console.log('\n🎉 데이터베이스 권한 검증 완료!');
        
        // Ensure process exits after successful completion
        process.exit(0);
      } catch (error: any) {
        console.error(`💥 검증 실패: ${error.message}`);
        process.exit(1);
      }
    });
}