/**
 * Sync Commands - 동기화 (핵심 기능)
 * 🔄 deplink sync
 */

import { Command } from 'commander';
import { SyncService } from '../../../services/syncService.js';
import { createNotionImportsSyncCommand } from './notion-imports.js';
import { getServiceContainer } from '../../../infrastructure/container/serviceRegistration.js';
import type { IConfigurationService } from '../../../domain/interfaces/IConfigurationService.js';

export function createSyncCommands(): Command {
  const syncCmd = new Command('sync')
    .description('코드베이스와 문서 동기화');

  // deplink sync all
  syncCmd
    .command('all')
    .description('전체 동기화 (코드+문서+의존성)')
    .option('--dry-run', '미리보기만 실행')
    .option('--force', '강제 동기화')
    .option('--include-dependencies', '의존성 분석 포함')
    .option('--max-file-size <size>', '최대 파일 크기 (bytes)', '5000000')
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.syncAll({
        dryRun: options.dryRun,
        force: options.force,
        includeDependencies: options.includeDependencies,
        maxFileSize: parseInt(options.maxFileSize)
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          const data = result.data;
          console.log('📊 동기화 결과:');
          console.log(`   코드: ${data.codeSync.filesUploaded}개 업로드, ${data.codeSync.filesSkipped}개 건너뛰기`);
          if (data.docsSync.docsProcessed > 0) {
            console.log(`   문서: ${data.docsSync.docsUploaded}개 업로드`);
          }
          if (data.dependenciesSync.dependenciesAnalyzed > 0) {
            console.log(`   의존성: ${data.dependenciesSync.dependenciesAnalyzed}개 분석, ${data.dependenciesSync.relationshipsCreated}개 관계 생성`);
          }
        }
        
        // Ensure process exits after successful completion
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink sync code
  syncCmd
    .command('code')
    .description('코드 파일만 동기화')
    .option('--pattern <glob>', '파일 패턴')
    .option('--dry-run', '미리보기만 실행')
    .option('--force', '강제 동기화')
    .option('--include-content', '파일 내용 포함', true)
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.syncCode({
        pattern: options.pattern,
        dryRun: options.dryRun,
        force: options.force,
        includeContent: options.includeContent
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          console.log(`📁 처리됨: ${result.data.filesProcessed}개`);
          console.log(`📤 업로드: ${result.data.filesUploaded}개`);
          console.log(`⏭️  건너뛰기: ${result.data.filesSkipped}개`);
          if (result.data.filesErrored > 0) {
            console.log(`❌ 오류: ${result.data.filesErrored}개`);
          }
        }
        
        // Ensure process exits after successful completion
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink sync docs
  syncCmd
    .command('docs')
    .description('문서만 동기화')
    .option('--docs-path <path>', '문서 디렉토리 경로', './docs')
    .option('--dry-run', '미리보기만 실행')
    .option('--force', '강제 동기화')
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.syncDocs({
        docsPath: options.docsPath,
        dryRun: options.dryRun,
        force: options.force
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          console.log(`📚 처리됨: ${result.data.docsProcessed}개`);
          console.log(`📤 업로드: ${result.data.docsUploaded}개`);
        }
        
        // Ensure process exits after successful completion
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink sync dependencies
  syncCmd
    .command('dependencies')
    .alias('deps')
    .description('의존성 관계만 동기화')
    .option('--analyze-only', '분석만 수행 (동기화하지 않음)')
    .option('--dry-run', '미리보기만 실행')
    .option('--generate-report', '리포트 생성')
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.syncDependencies({
        analyzeOnly: options.analyzeOnly,
        dryRun: options.dryRun,
        generateReport: options.generateReport
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          console.log(`🔍 분석된 의존성: ${result.data.dependenciesAnalyzed}개`);
          console.log(`🔗 생성된 관계: ${result.data.relationshipsCreated}개`);
          
          if (result.data.statistics) {
            const stats = result.data.statistics;
            console.log(`📊 통계:`);
            console.log(`   파일 수: ${stats.totalFiles}개`);
            console.log(`   해결된 의존성: ${stats.resolvedDependencies}개`);
            console.log(`   외부 의존성: ${stats.externalDependencies}개`);
          }
        }
        
        // Ensure process exits after successful completion
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink sync status - 동기화 상태 확인
  syncCmd
    .command('status')
    .description('동기화 상태 확인')
    .action(async () => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.getSyncStatus();
      
      if (result.success && result.data) {
        console.log('📊 동기화 상태:');
        console.log(`   전체 파일: ${result.data.total}개`);
        console.log(`   동기화됨: ${result.data.synced}개`);
        console.log(`   업데이트 필요: ${result.data.needsUpdate}개`);
        console.log(`   미동기화: ${result.data.notSynced}개`);
        if (result.data.errors > 0) {
          console.log(`   오류: ${result.data.errors}개`);
        }
        
        if (result.data.lastSyncTime) {
          console.log(`   마지막 동기화: ${new Date(result.data.lastSyncTime).toLocaleString()}`);
        }
      } else {
        console.error(`❌ ${result.message}`);
      }
    });

  // deplink sync report - 동기화 리포트
  syncCmd
    .command('report')
    .description('동기화 리포트 생성')
    .option('--output <file>', '출력 파일')
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new SyncService(process.cwd(), configService);
      const result = await service.generateSyncReport();
      
      if (result.success && result.data) {
        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, JSON.stringify(result.data, null, 2));
          console.log(`✅ 리포트가 저장되었습니다: ${options.output}`);
        } else {
          console.log('📊 동기화 리포트:');
          console.log(JSON.stringify(result.data, null, 2));
        }
      } else {
        console.error(`❌ ${result.message}`);
      }
    });

  // Notion Imports 전용 동기화
  syncCmd.addCommand(createNotionImportsSyncCommand());

  return syncCmd;
}