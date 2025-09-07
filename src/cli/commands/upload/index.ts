/**
 * Upload Command - 데이터 업로드 명령어
 */

import { Command } from 'commander';
import { NotionWorkflowService } from '../../../services/notionWorkflowService.js';
import { logger } from '../../../shared/utils/index.js';

export function createUploadCommand(): Command {
  const upload = new Command('upload')
    .description('인덱싱된 데이터를 Notion 데이터베이스에 업로드');

  // 전체 워크플로우 실행
  upload
    .command('all')
    .description('전체 워크플로우 실행: 데이터베이스 생성 + 데이터 업로드')
    .option('--databases <databases>', '생성할 데이터베이스 목록 (쉼표로 구분)', 'files,docs,functions')
    .option('--force', '기존 데이터베이스 강제 재생성')
    .option('--skip-upload', '데이터 업로드 스킵 (데이터베이스만 생성)')
    .option('--dry-run', '실제 업로드 없이 시뮬레이션만 실행')
    .action(async (options) => {
      try {
        logger.info('🚀 전체 워크플로우 시작');
        
        const workflowService = new NotionWorkflowService();
        
        const databases = options.databases ? 
          options.databases.split(',').map((db: string) => db.trim()) : 
          ['files', 'docs', 'functions'];

        const result = await workflowService.executeFullWorkflow({
          databases,
          force: options.force,
          skipUpload: options.skipUpload,
          dryRun: options.dryRun
        });

        if (result.success) {
          logger.success('✅ 전체 워크플로우 완료');
          
          if (result.data) {
            console.log('\n📊 결과 요약:');
            console.log(`데이터베이스: ${Object.keys(result.data.databases).join(', ')}`);
            
            if (!options.skipUpload && !options.dryRun) {
              const { files, documents } = result.data.uploadStats;
              console.log(`\n📁 파일: ${files.uploaded}개 신규, ${files.updated}개 업데이트, ${files.skipped}개 스킵`);
              console.log(`📖 문서: ${documents.uploaded}개 신규, ${documents.updated}개 업데이트, ${documents.skipped}개 스킵`);
              
              if (files.errors + documents.errors > 0) {
                console.log(`⚠️  오류: ${files.errors + documents.errors}개`);
              }
            }
          }
          
          // Ensure process exits after successful completion
          process.exit(0);
        } else {
          logger.error(`❌ 워크플로우 실패: ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => logger.error(`   ${error}`));
          }
          process.exit(1);
        }

      } catch (error) {
        logger.error(`전체 워크플로우 실행 실패: ${error}`);
        process.exit(1);
      }
    });

  // 데이터베이스만 생성
  upload
    .command('databases')
    .alias('db')
    .description('데이터베이스만 생성 (데이터 업로드 없이)')
    .option('--databases <databases>', '생성할 데이터베이스 목록 (쉼표로 구분)', 'files,docs,functions')
    .option('--force', '기존 데이터베이스 강제 재생성')
    .action(async (options) => {
      try {
        logger.info('📊 데이터베이스 생성 시작');
        
        const workflowService = new NotionWorkflowService();
        
        const databases = options.databases ? 
          options.databases.split(',').map((db: string) => db.trim()) : 
          ['files', 'docs', 'functions'];

        const result = await workflowService.createDatabases({
          databases,
          force: options.force
        });

        if (result.success) {
          logger.success('✅ 데이터베이스 생성 완료');
          
          if (result.data) {
            console.log('\n📊 생성된 데이터베이스:');
            Object.entries(result.data.databases).forEach(([name, id]) => {
              console.log(`   ${name}: ${id}`);
              const cleanId = id.replace(/-/g, '');
              console.log(`   🌐 ${name} URL: https://www.notion.so/${cleanId}`);
            });
          }
          
          // Ensure process exits after successful completion
          process.exit(0);
        } else {
          logger.error(`❌ 데이터베이스 생성 실패: ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => logger.error(`   ${error}`));
          }
          process.exit(1);
        }

      } catch (error) {
        logger.error(`데이터베이스 생성 실패: ${error}`);
        process.exit(1);
      }
    });

  // 데이터만 업로드
  upload
    .command('data')
    .description('데이터만 업로드 (데이터베이스는 이미 존재한다고 가정)')
    .option('--dry-run', '실제 업로드 없이 시뮬레이션만 실행')
    .action(async (options) => {
      try {
        logger.info('📤 데이터 업로드 시작');
        
        const workflowService = new NotionWorkflowService();
        
        const result = await workflowService.uploadDataOnly({
          dryRun: options.dryRun
        });

        if (result.success) {
          logger.success('✅ 데이터 업로드 완료');
          
          if (result.data) {
            const { files, documents } = result.data.uploadStats;
            console.log('\n📊 업로드 결과:');
            console.log(`📁 파일: ${files.uploaded}개 신규, ${files.updated}개 업데이트, ${files.skipped}개 스킵`);
            console.log(`📖 문서: ${documents.uploaded}개 신규, ${documents.updated}개 업데이트, ${documents.skipped}개 스킵`);
            
            if (files.errors + documents.errors > 0) {
              console.log(`⚠️  오류: ${files.errors + documents.errors}개`);
            }
          }
          
          // Ensure process exits after successful completion
          process.exit(0);
        } else {
          logger.error(`❌ 데이터 업로드 실패: ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => logger.error(`   ${error}`));
          }
          process.exit(1);
        }

      } catch (error) {
        logger.error(`데이터 업로드 실패: ${error}`);
        process.exit(1);
      }
    });

  // 상태 확인
  upload
    .command('status')
    .description('워크플로우 상태 확인')
    .action(async () => {
      try {
        logger.info('📊 워크플로우 상태 확인');
        
        const workflowService = new NotionWorkflowService();
        const status = await workflowService.checkWorkflowStatus();

        console.log('\n🔧 설정 상태:');
        console.log(`   설정 완료: ${status.configured ? '✅' : '❌'}`);

        console.log('\n📊 데이터베이스 상태:');
        if (Object.keys(status.databases).length === 0) {
          console.log('   설정된 데이터베이스 없음');
        } else {
          Object.entries(status.databases).forEach(([name, info]) => {
            const statusIcon = info.exists && info.accessible ? '✅' : '❌';
            console.log(`   ${name}: ${statusIcon} ${info.id}`);
          });
        }

        console.log('\n📁 인덱스 데이터:');
        console.log(`   파일: ${status.indexData.files}개`);
        console.log(`   문서: ${status.indexData.documents}개`);

        if (!status.configured) {
          console.log('\n💡 설정이 완료되지 않았습니다. 다음을 실행하세요:');
          console.log('   deplink init workspace  # 워크스페이스 연결');
          console.log('   deplink upload all      # 전체 워크플로우 실행');
        } else if (Object.keys(status.databases).length === 0) {
          console.log('\n💡 데이터베이스가 설정되지 않았습니다:');
          console.log('   deplink upload databases  # 데이터베이스 생성');
        } else if (status.indexData.files + status.indexData.documents === 0) {
          console.log('\n💡 인덱싱된 데이터가 없습니다. 먼저 인덱싱을 실행하세요:');
          console.log('   deplink index            # 프로젝트 인덱싱');
        }

        // Ensure process exits after successful completion
        process.exit(0);
      } catch (error) {
        logger.error(`상태 확인 실패: ${error}`);
        process.exit(1);
      }
    });

  return upload;
}