/**
 * Init Commands - 프로젝트 초기화
 * 🚀 deplink init
 */

import { Command } from 'commander';
import { InitializationService } from '../../../services/initializationService.js';
import { getServiceContainer } from '../../../infrastructure/container/serviceRegistration.js';
import type { IConfigurationService } from '../../../domain/interfaces/IConfigurationService.js';

export function createInitCommands(): Command {
  const initCmd = new Command('init')
    .description('프로젝트 초기화 및 설정');

  // deplink init project
  initCmd
    .command('project')
    .description('프로젝트 설정 초기화')
    .option('-f, --force', '기존 설정 덮어쓰기')
    .action(async (options) => {
      const container = getServiceContainer();
      const configService = container.resolve<IConfigurationService>('IConfigurationService');
      const service = new InitializationService(configService);
      const result = await service.initializeProject({
        force: options.force
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data?.projectPath) {
          console.log(`📁 프로젝트 경로: ${result.data.projectPath}`);
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink init workspace
  initCmd
    .command('workspace')
    .description('Notion 워크스페이스 연결')
    .option('--api-key <key>', 'Notion API 키')
    .option('--workspace-url <url>', '워크스페이스 URL')
    .option('--parent-page-id <id>', '부모 페이지 ID')
    .action(async (options) => {
      const service = new InitializationService();
      const result = await service.initializeWorkspace({
        apiKey: options.apiKey,
        workspaceUrl: options.workspaceUrl,
        parentPageId: options.parentPageId
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          console.log(`🔑 API 키: ${result.data.apiKey}`);
          console.log(`📄 부모 페이지 ID: ${result.data.parentPageId}`);
          if (result.data.workspaceUrl) {
            console.log(`🌐 워크스페이스 URL: ${result.data.workspaceUrl}`);
          }
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink init schema
  initCmd
    .command('schema')
    .description('데이터베이스 스키마 설정')
    .option('--template <name>', '스키마 템플릿', 'default')
    .option('--databases <dbs>', '생성할 데이터베이스 (쉼표 구분)')
    .option('-f, --force', '기존 데이터베이스 삭제 후 재생성')
    .action(async (options) => {
      const service = new InitializationService();
      const databases = options.databases?.split(',').map((db: string) => db.trim());
      
      const result = await service.initializeSchema({
        template: options.template,
        databases,
        force: options.force
      });
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data) {
          console.log(`📋 템플릿: ${result.data.template}`);
          console.log(`🗄️  데이터베이스: ${result.data.databases.join(', ')}`);
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink init all - 전체 초기화
  initCmd
    .command('all')
    .description('전체 초기화 (프로젝트 + 워크스페이스 + 스키마)')
    .option('-f, --force', '기존 설정 덮어쓰기')
    .action(async (options) => {
      const service = new InitializationService();
      const result = await service.initializeComplete(
        { force: options.force },
        {},
        {}
      );
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log('🎯 모든 초기화가 완료되었습니다!');
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink init status - 초기화 상태 확인
  initCmd
    .command('status')
    .description('초기화 상태 확인')
    .action(async () => {
      const service = new InitializationService();
      const status = await service.getInitializationStatus();
      
      console.log('📊 초기화 상태:');
      console.log(`   프로젝트 초기화: ${status.projectInitialized ? '✅' : '❌'}`);
      console.log(`   워크스페이스 연결: ${status.workspaceConnected ? '✅' : '❌'}`);
      console.log(`   스키마 설정: ${status.schemaConfigured ? '✅' : '❌'}`);
      
      if (status.configPath) {
        console.log(`   설정 파일: ${status.configPath}`);
      }
      
      if (!status.projectInitialized) {
        console.log('\n💡 다음 명령어로 초기화를 시작하세요:');
        console.log('   deplink init project');
      } else if (!status.workspaceConnected) {
        console.log('\n💡 다음 명령어로 워크스페이스를 연결하세요:');
        console.log('   deplink init workspace');
      } else if (!status.schemaConfigured) {
        console.log('\n💡 다음 명령어로 스키마를 설정하세요:');
        console.log('   deplink init schema');
      } else {
        console.log('\n🎉 모든 초기화가 완료되었습니다!');
      }
    });

  // deplink init update-schema - 스키마 업데이트
  initCmd
    .command('update-schema')
    .description('기존 데이터베이스 스키마 업데이트')
    .action(async () => {
      const service = new InitializationService();
      const result = await service.updateSchemaOnly();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.data?.databases) {
          console.log('🗄️  업데이트된 데이터베이스:');
          for (const [name, id] of Object.entries(result.data.databases)) {
            console.log(`   - ${name}: ${id}`);
          }
        }
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink init check-schema - 스키마 상태 확인
  initCmd
    .command('check-schema')
    .description('데이터베이스 스키마 상태 확인')
    .action(async () => {
      const service = new InitializationService();
      const result = await service.checkSchemaStatus();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log('\n스키마 상태 확인이 완료되었습니다. 자세한 내용은 위의 로그를 참조하세요.');
      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  return initCmd;
}