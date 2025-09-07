/**
 * Database Check Command - 데이터베이스 연결 상태 및 스키마 확인
 */

import { Command } from 'commander';
import { DatabaseSchemaManager } from '../../../../infrastructure/notion/DatabaseSchemaManager.js';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';
import { NotionUrlBuilder } from '../../../../shared/utils/notionUrlBuilder.js';

export function createCheckCommand(): Command {
  return new Command('check')
    .description('데이터베이스 연결 상태, 스키마 및 Notion 링크를 확인합니다')
    .option('-d, --database <name>', '특정 데이터베이스만 확인')
    .option('--links-only', '링크만 출력 (상세 정보 제외)')
    .action(async (options) => {
      if (options.linksOnly) {
        console.log('🔗 Notion 데이터베이스 링크:\n');
      } else {
        console.log('📊 데이터베이스 연결 상태 및 스키마 확인:\n');
      }
      
      try {
        // 설정을 먼저 로드
        const { config } = await DatabaseCommandFactory.getConfigService();
        // Notion 서비스도 한 번만 로드
        const notionService = await DatabaseCommandFactory.createNotionService();
        const urlBuilder = new NotionUrlBuilder(config);
        
        const allDatabases = [
          { name: 'files', title: 'FILES (Project Files)', icon: '📁' },
          { name: 'functions', title: 'FUNCTIONS (dependency-linker - Functions)', icon: '⚙️' },
          { name: 'dependencies', title: 'DEPENDENCIES (Dependency Tracker - Dependencies)', icon: '📦' },
          { name: 'libraries', title: 'LIBRARIES (Dependency Tracker - Libraries)', icon: '📚' },
          { name: 'classes', title: 'CLASSES (Dependency Tracker - Classes)', icon: '🏗️' },
          { name: 'relationships', title: 'RELATIONSHIPS (Dependency Tracker - Relationships)', icon: '🔄' }
        ];
        
        const databases = options.database 
          ? allDatabases.filter(db => db.name === options.database)
          : allDatabases;
        
        if (databases.length === 0) {
          console.log(`❌ 데이터베이스 '${options.database}'를 찾을 수 없습니다.`);
          process.exit(0);
        }
        
        for (const db of databases) {
          const dbId = config.databases[db.name as keyof typeof config.databases];
          
          if (!dbId) {
            console.log(`⚪ ${db.icon} ${db.title}`);
            console.log('   상태: 설정되지 않음');
            console.log('');
            continue;
          }

          try {
            const result = await notionService.retrieveDatabase(dbId);
            
            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to retrieve database');
            }
            
            const database = result.data;
            
            if (options.linksOnly) {
              console.log(`${urlBuilder.buildDatabaseUrl(dbId)}`);
            } else {
              console.log(`✅ ${db.icon} ${db.title}`);
              console.log(`   링크: ${urlBuilder.buildDatabaseUrl(dbId)}`);
              console.log(`   제목: ${'title' in database ? database.title?.[0]?.plain_text || 'Untitled' : 'Untitled'}`);
              console.log(`   상태: 연결됨`);
              
              // 속성 정보는 data sources API를 통해 가져오기 (2025-09-03 스펙)
              try {
                let properties: string[] = [];
                
                // 새로운 API 스펙: data_sources 배열을 확인
                if ('data_sources' in database && database.data_sources && database.data_sources.length > 0) {
                  console.log(`   Data Sources: ${database.data_sources.length}개`);
                  
                  // 첫 번째 data source의 정보 출력
                  const dataSource = database.data_sources[0];
                  console.log(`   Data Source: ${dataSource.name || dataSource.id}`);
                  
                  // 기존 스키마 관리자를 사용해서 스키마 조회
                  try {
                    const schemaManager = new DatabaseSchemaManager('.');
                    const databaseSchema = await schemaManager.getDatabaseSchema(db.name);
                    
                    if (databaseSchema && databaseSchema.properties) {
                      properties = Object.keys(databaseSchema.properties);
                      const otherProperties = properties.filter(key => key !== 'Name');
                      console.log(`   속성 수: ${properties.length} (스키마 파일에서)`);
                      
                      if (otherProperties.length > 0) {
                        console.log('   속성 목록:');
                        otherProperties.slice(0, 5).forEach(prop => {
                          console.log(`     - ${prop}`);
                        });
                        if (otherProperties.length > 5) {
                          console.log(`     ... 및 ${otherProperties.length - 5}개 더`);
                        }
                      } else {
                        console.log('   속성: Name만 있음');
                      }
                    } else {
                      console.log('   속성: 스키마 정의 없음');
                    }
                  } catch (schemaError: any) {
                    console.log(`   속성: 스키마 조회 실패 (${schemaError.message})`);
                  }
                } 
                // 이전 API 스펙 호환성: properties를 직접 확인
                else if ('properties' in database && database.properties) {
                  properties = Object.keys(database.properties);
                  const otherProperties = properties.filter(key => key !== 'Name');
                  console.log(`   속성 수: ${properties.length} (이전 API 스펙)`);
                  
                  if (otherProperties.length > 0) {
                    console.log('   속성 목록:');
                    otherProperties.slice(0, 5).forEach(prop => {
                      console.log(`     - ${prop}`);
                    });
                    if (otherProperties.length > 5) {
                      console.log(`     ... 및 ${otherProperties.length - 5}개 더`);
                    }
                  } else {
                    console.log('   속성: Name만 있음');
                  }
                } else {
                  console.log('   속성: 스키마 정보 없음');
                }
              } catch (schemaError: any) {
                console.log(`   속성: 스키마 조회 실패 (${schemaError.message})`);
              }
              
              console.log('');
            }
            
          } catch (error: any) {
            if (options.linksOnly) {
              console.log(`${urlBuilder.buildDatabaseUrl(dbId)} # 오류: ${error.message}`);
            } else {
              if (error.message.includes("archived") || error.message.includes("Can't edit block that is archived")) {
                console.log(`📦 ${db.icon} ${db.title} (아카이브됨)`);
                console.log(`   링크: ${urlBuilder.buildDatabaseUrl(dbId)}`);
                console.log(`   상태: 아카이브됨 - 복원 필요`);
                console.log(`   💡 링크에서 "Restore" 버튼 클릭하여 복원하세요`);
              } else {
                console.log(`❌ ${db.icon} ${db.title}`);
                console.log(`   링크: ${urlBuilder.buildDatabaseUrl(dbId)}`);
                console.log(`   오류: ${error.message}`);
              }
              console.log('');
            }
          }
        }
        
        // 부모 페이지 링크 (links-only가 아닌 경우에만)
        if (!options.linksOnly && config.parentPageId) {
          console.log(`🏠 Parent Page (All Databases Container):`);
          console.log(`   ${urlBuilder.buildUrl(config.parentPageId)}`);
          console.log('');
        }
        
        if (!options.linksOnly) {
          console.log('💡 각 링크를 클릭하면 해당 데이터베이스로 직접 이동할 수 있습니다.');
          console.log('💡 --links-only 옵션으로 링크만 간단히 출력할 수 있습니다.');
        } else if (config.parentPageId) {
          console.log(`${urlBuilder.buildUrl(config.parentPageId)}`);
        }
        
        // 성공적으로 완료되면 프로세스 종료
        process.exit(0);
        
      } catch (error: any) {
        console.error(`💥 확인 실패: ${error.message}`);
        process.exit(1);
      }
    });
}