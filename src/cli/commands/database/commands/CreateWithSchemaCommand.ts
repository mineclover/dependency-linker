/**
 * Database Create With Schema Command - JSON 스키마 기반 데이터베이스 생성
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';
import { NotionDatabaseCreator } from '../../../../services/notion/NotionDatabaseCreator.js';

export function createCreateWithSchemaCommand(): Command {
  return new Command('create-with-schema')
    .description('JSON 스키마 기반으로 완전한 데이터베이스를 생성합니다')
    .requiredOption('-t, --type <type>', '데이터베이스 타입 (files, dependencies, libraries, functions, classes, relationships)')
    .option('--replace', '기존 데이터베이스를 교체합니다')
    .option('--dry-run', '실제 작업 없이 시뮬레이션만 실행')
    .action(async (options) => {
      console.log(`🏗️ JSON 스키마 기반으로 ${options.type} 데이터베이스를 생성합니다...\n`);
      
      try {
        // 설정 로드
        const { config } = await DatabaseCommandFactory.getConfigService();
        const schemaManager = await DatabaseCommandFactory.createSchemaManager();
        
        if (!config.parentPageId) {
          console.log('❌ Parent Page ID가 설정되지 않았습니다.');
          process.exit(1);
        }

        // 스키마 로드
        const schemas = await schemaManager.loadSchemas();
        const dbSchema = schemas.databases[options.type];
        
        if (!dbSchema) {
          console.log(`❌ "${options.type}" 타입에 대한 스키마를 찾을 수 없습니다.`);
          console.log('📋 사용 가능한 타입:', Object.keys(schemas.databases).join(', '));
          process.exit(1);
        }

        if (options.dryRun) {
          console.log(`🔍 [DRY RUN] ${options.type} 데이터베이스 생성 시뮬레이션`);
          console.log(`📋 데이터베이스 정보:`);
          console.log(`   제목: ${dbSchema.title || options.type} Database`);
          console.log(`   설명: JSON 스키마 기반 데이터베이스`);
          
          const properties = dbSchema.initial_data_source?.properties || {};
          console.log(`\n📊 속성들 (${Object.keys(properties).length}개):`);
          Object.keys(properties).forEach(prop => {
            console.log(`   - ${prop}`);
          });
          
          console.log('\n💡 실제 작업을 수행하려면 --dry-run 플래그를 제거하고 다시 실행하세요.');
          return;
        }

        // 기존 데이터베이스 백업 정보 표시
        if (options.replace && config.databases[options.type as keyof typeof config.databases]) {
          const existingDbId = config.databases[options.type as keyof typeof config.databases];
          console.log(`📦 기존 ${options.type} 데이터베이스: ${existingDbId}`);
          console.log(`🔗 백업 링크: https://notion.so/${existingDbId.replace(/-/g, '')}`);
        }

        // 완전한 데이터베이스 생성
        const notionService = await DatabaseCommandFactory.createNotionService();
        const creator = new NotionDatabaseCreator(notionService);
        
        const result = await creator.createDatabase({
          schema: dbSchema,
          parentPageId: config.parentPageId,
          options: {
            cleanupExisting: options.replace,
            description: `JSON schema-based ${options.type} database`
          }
        });
        
        if (result.success) {
          console.log(`\n✅ 완전한 ${options.type} 데이터베이스 생성 성공!`);
          console.log(`🆔 새 Database ID: ${result.databaseId}`);
          console.log(`🔗 새 DB 링크: ${result.databaseUrl}`);

          // 설정 파일 업데이트 안내
          if (options.replace) {
            console.log('\n💡 설정 파일 업데이트가 필요합니다:');
            console.log(`   databases.${options.type}: "${result.databaseId}"`);
          } else {
            console.log(`\n💡 --replace 옵션을 사용하면 설정 파일의 ${options.type} DB ID를 자동으로 업데이트할 수 있습니다.`);
          }

          console.log(`\n🎉 완전한 ${options.type} 데이터베이스 생성 완료!`);
          console.log(`📊 JSON 스키마 기반 생성으로 모든 속성과 관계가 포함되었습니다.`);
          console.log(`🔍 'bun run db:check' 명령으로 상태를 확인하세요.`);
        } else {
          console.log(`❌ 데이터베이스 생성 실패: ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`   - ${error}`));
          }
          process.exit(1);
        }

        // Ensure process exits after successful completion
        process.exit(0);

      } catch (error: any) {
        console.error(`💥 ${options.type} DB 생성 실패: ${error.message}`);
        if (error.body) {
          console.error('상세 오류:', JSON.stringify(error.body, null, 2));
        }
        process.exit(1);
      }
    });
}
