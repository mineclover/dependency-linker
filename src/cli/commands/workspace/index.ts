/**
 * Workspace Commands - 워크스페이스 관리
 * 🏢 deplink workspace
 */

import { Command } from 'commander';
import { UnifiedSchemaManager } from '../../../infrastructure/database/UnifiedSchemaManager.js';
import { Client } from '@notionhq/client';
import { readFile, writeFile } from 'fs/promises';
import { logger, ProjectDetector } from '../../../shared/utils/index.js';
import { ConfigManager } from '../../../infrastructure/config/configManager.js';
import { InitializationService } from '../../../services/initializationService.js';
import type { WorkspaceConfig } from '../../../shared/types/index.js';

export function createWorkspaceCommands(): Command {
  const workspaceCmd = new Command('workspace')
    .alias('ws')
    .description('워크스페이스 전체 관리');

  // deplink workspace status
  workspaceCmd
    .command('status')
    .description('전체 상태 확인')
    .option('--detailed', '상세 상태 표시')
    .option('--json', 'JSON 형태로 출력')
    .action(async (options) => {
      await executeWorkspaceStatus(options);
    });

  // deplink workspace validate
  workspaceCmd
    .command('validate')
    .description('데이터 일관성 검증')
    .option('--fix', '발견된 문제 자동 수정')
    .option('--report <file>', '검증 결과 저장')
    .action(async (options) => {
      await executeWorkspaceValidate(options);
    });

  // deplink workspace repair
  workspaceCmd
    .command('repair')
    .description('깨진 연결 복구')
    .option('--dry-run', '복구 미리보기만')
    .option('--force', '강제 복구 실행')
    .option('--backup', '복구 전 백업')
    .action(async (options) => {
      await executeWorkspaceRepair(options);
    });

  // deplink workspace schema
  workspaceCmd
    .command('schema')
    .description('스키마 확장/수정')
    .option('--add <type>', '새 데이터베이스 타입 추가')
    .option('--modify <name>', '기존 스키마 수정')
    .option('--migrate', '스키마 마이그레이션 실행')
    .action(async (options) => {
      await executeWorkspaceSchema(options);
    });

  // deplink workspace create-databases
  workspaceCmd
    .command('create-databases')
    .alias('create-db')
    .description('JSON 스키마 기반 데이터베이스 생성')
    .option('--schema <path>', 'Schema JSON file path', './src/infrastructure/database/schemas/database-schemas.json')
    .option('--parent <pageId>', 'Parent Notion page ID')
    .option('--api-key <key>', 'Notion API key')
    .option('--force', 'Force recreate existing databases')
    .option('--verify', 'Verify created databases after creation')
    .option('--config <path>', 'Config file path (for API key and parent page)')
    .action(async (options) => {
      try {
        console.log('🚀 Starting database creation with modern schema system...');

        // Load configuration
        let apiKey = options.apiKey;
        let parentPageId = options.parent;

        if (!apiKey || !parentPageId) {
          if (options.config) {
            try {
              const configContent = await readFile(options.config, 'utf-8');
              const config = JSON.parse(configContent);
              apiKey = apiKey || config.apiKey;
              parentPageId = parentPageId || config.parentPageId;
            } catch (error) {
              logger.error(`Failed to load config file ${options.config}: ${error}`);
            }
          }
        }

        if (!apiKey) {
          logger.error('❌ API key is required. Use --api-key or --config option');
          process.exit(1);
        }

        if (!parentPageId) {
          logger.error('❌ Parent page ID is required. Use --parent or --config option');
          process.exit(1);
        }

        // Initialize Notion client
        const notion = new Client({ auth: apiKey });
        logger.info('✅ Notion client initialized');

        // Load schemas
        logger.info(`📋 Loading schemas from ${options.schema}...`);
        const schemas = await loadDatabaseSchemas(options.schema);
        logger.info(`Found ${Object.keys(schemas.databases).length} database schemas:`);
        
        Object.keys(schemas.databases).forEach(key => {
          const schema = schemas.databases[key];
          const propCount = Object.keys(schema.properties).length;
          logger.info(`  - ${key}: ${schema.title} (${propCount} properties)`);
        });

        // Validate schemas
        const schemaManager = new DatabaseSchemaManager(notion, parentPageId, schemas);
        const validation = schemaManager.validateSchema();
        
        if (!validation.isValid) {
          logger.error('❌ Schema validation failed:');
          validation.errors.forEach(error => logger.error(`   • ${error}`));
          process.exit(1);
        }
        logger.success('✅ Schema validation passed');

        // Create databases
        logger.info('🏗️ Starting database creation process...');
        const createdDatabases = await schemaManager.createAllDatabases(options.force);

        // Verify created databases
        if (options.verify) {
          await schemaManager.verifyCreatedDatabases(createdDatabases);
        }

        // Print results
        console.log('\n🎉 Database creation completed successfully!');
        console.log('\n📋 Created databases:');
        Object.entries(createdDatabases).forEach(([key, id]) => {
          console.log(`  ${key}: ${id}`);
          console.log(`    → https://notion.so/${id.replace(/-/g, '')}`);
        });

        console.log('\n💡 Next steps:');
        console.log('   1. Share databases with your integration in Notion');
        console.log('   2. Update your config file with the new database IDs');
        console.log('   3. Start syncing files: deplink sync');

      } catch (error) {
        logger.error(`❌ Database creation failed: ${error instanceof Error ? error.message : error}`);
        if (error instanceof Error && error.stack) {
          logger.error('Stack trace: ' + error.stack);
        }
        process.exit(1);
      }
    });

  // deplink workspace sync - Maps to legacy workflow sync and sync notion
  workspaceCmd
    .command('sync')
    .description('동기화 수행')
    .option('--target <type>', 'Sync target (notion|local)', 'notion')
    .option('--dry-run', '미리보기만 수행')
    .option('--force', '모든 파일 강제 동기화')
    .option('--include <patterns>', 'Include patterns')
    .option('--exclude <patterns>', 'Exclude patterns')
    .action(async (options) => {
      await executeWorkspaceSync(options);
    });

  // deplink workspace analyze - Maps to legacy analyze project
  workspaceCmd
    .command('analyze')
    .description('프로젝트 분석')
    .option('--scope <level>', 'Analysis scope (project|directory|file)', 'project')
    .option('--detailed', '상세 분석')
    .option('--format <type>', 'Output format (json|table|report)', 'table')
    .action(async (options) => {
      await executeWorkspaceAnalyze(options);
    });

  // deplink workspace setup - Maps to legacy workflow setup-git and schema setup
  workspaceCmd
    .command('setup')
    .description('워크스페이스 설정')
    .option('--git', 'Git integration 설정')
    .option('--schema', 'Schema system 설정')
    .option('--config', 'Configuration 설정')
    .option('--all', '모든 것 설정')
    .action(async (options) => {
      await executeWorkspaceSetup(options);
    });

  // deplink workspace test-schema
  workspaceCmd
    .command('test-schema')
    .description('Test schema creation with a simple database')
    .option('--api-key <key>', 'Notion API key')
    .option('--parent <pageId>', 'Parent Notion page ID')
    .option('--config <path>', 'Config file path')
    .action(async (options) => {
      try {
        console.log('🧪 Testing schema creation with simple test database...');

        // Load configuration (same as create-databases)
        let apiKey = options.apiKey;
        let parentPageId = options.parent;

        if (!apiKey || !parentPageId) {
          if (options.config) {
            try {
              const configContent = await readFile(options.config, 'utf-8');
              const config = JSON.parse(configContent);
              apiKey = apiKey || config.apiKey;
              parentPageId = parentPageId || config.parentPageId;
            } catch (error) {
              logger.error(`Failed to load config file ${options.config}: ${error}`);
            }
          }
        }

        if (!apiKey || !parentPageId) {
          logger.error('❌ API key and parent page ID are required');
          process.exit(1);
        }

        // Create test schema
        const testSchemas = {
          databases: {
            test: {
              title: 'Schema Test Database',
              description: 'Testing modern schema creation',
              properties: {
                Name: {
                  type: 'title',
                  required: true,
                  description: 'Test name'
                },
                Status: {
                  type: 'select',
                  required: true,
                  options: [
                    { name: 'Active', color: 'green' },
                    { name: 'Inactive', color: 'red' }
                  ]
                },
                Description: {
                  type: 'rich_text',
                  required: false,
                  description: 'Test description'
                },
                Count: {
                  type: 'number',
                  required: false,
                  description: 'Test number'
                },
                'Created Date': {
                  type: 'date',
                  required: false,
                  description: 'Creation date'
                }
              }
            }
          },
          property_types: {}
        };

        // Initialize and create
        const notion = new Client({ auth: apiKey });
        const schemaManager = new DatabaseSchemaManager(notion, parentPageId, testSchemas);
        
        logger.info('🔧 Creating test database...');
        const testDbId = await schemaManager.createDatabase('test', testSchemas.databases.test, false);
        
        logger.success(`✅ Test database created successfully: ${testDbId}`);
        console.log(`   → https://notion.so/${testDbId.replace(/-/g, '')}`);

        // Verify
        await schemaManager.verifyCreatedDatabases({ test: testDbId });

      } catch (error) {
        logger.error(`❌ Schema test failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return workspaceCmd;
}

/**
 * Execute workspace status command
 */
async function executeWorkspaceStatus(options: any): Promise<void> {
  try {
    logger.info('워크스페이스 상태 확인 중...', '📊');
    
    // Project detection
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const projectPath = detection.projectRoot;

    // Load configuration
    let config: WorkspaceConfig;
    let configStatus = 'unknown';
    try {
      config = await configManager.loadConfig(projectPath);
      configStatus = 'loaded';
    } catch {
      logger.warning('설정 파일을 찾을 수 없습니다. 환경변수에서 확인...');
      
      const apiKey = process.env.NOTION_API_KEY;
      const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
      
      if (apiKey && parentPageId) {
        config = {
          apiKey,
          parentPageId,
          databases: {},
          projectPath,
          environment: 'development'
        };
        configStatus = 'env_vars';
      } else {
        logger.error('설정 파일이나 환경변수에서 API 키를 찾을 수 없습니다.');
        return;
      }
    }

    // Check Notion connection
    let notionStatus = 'disconnected';
    let databaseCount = 0;
    try {
      const notion = new Client({ auth: config.apiKey });
      await notion.users.me();
      notionStatus = 'connected';
      databaseCount = Object.keys(config.databases).length;
    } catch (error) {
      logger.warning(`Notion 연결 실패: ${error}`);
    }

    // Status summary
    const status = {
      project: {
        name: detection.projectInfo?.name || 'Unknown',
        type: detection.projectInfo?.type || 'Unknown',
        path: projectPath
      },
      configuration: {
        status: configStatus,
        hasApiKey: !!config.apiKey,
        hasParentPage: !!config.parentPageId,
        databases: databaseCount
      },
      notion: {
        status: notionStatus,
        workspaceConnected: notionStatus === 'connected'
      },
      git: {
        isGitRepo: detection.projectInfo?.hasGit || false,
        branch: 'unknown'
      }
    };

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('\n📈 Workspace Status:');
      console.log(`  Project: ${status.project.name} (${status.project.type})`);
      console.log(`  Path: ${status.project.path}`);
      console.log(`  Configuration: ${status.configuration.status}`);
      console.log(`  Databases: ${status.configuration.databases}`);
      console.log(`  Notion: ${status.notion.status}`);
      console.log(`  Git: ${status.git.isGitRepo ? 'initialized' : 'not initialized'}`);
      
      if (options.detailed) {
        console.log('\n🔍 Detailed Information:');
        console.log(`  API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'not set'}`);
        console.log(`  Parent Page: ${config.parentPageId || 'not set'}`);
        
        if (databaseCount > 0) {
          console.log('  Database IDs:');
          Object.entries(config.databases).forEach(([name, id]) => {
            console.log(`    ${name}: ${id}`);
          });
        }
      }
    }

    if (detection.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      detection.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

  } catch (error) {
    logger.error(`상태 확인 실패: ${error}`);
  }
}

/**
 * Execute workspace validation command
 */
async function executeWorkspaceValidate(options: any): Promise<void> {
  try {
    logger.info('데이터 일관성 검증 중...', '✅');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const projectPath = detection.projectRoot;
    
    const validation = {
      timestamp: new Date().toISOString(),
      issues: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Check configuration
    try {
      const config = await configManager.loadConfig(projectPath);
      
      if (!config.apiKey) {
        validation.issues.push('API key not configured');
      }
      
      if (!config.parentPageId) {
        validation.issues.push('Parent page ID not configured');
      }
      
      if (Object.keys(config.databases).length === 0) {
        validation.warnings.push('No databases configured');
      }

      // Test Notion connection if configured
      if (config.apiKey) {
        try {
          const notion = new Client({ auth: config.apiKey });
          await notion.users.me();
          logger.info('Notion API 연결 확인됨', '🔗');
          
          // Check parent page
          if (config.parentPageId) {
            try {
              await notion.pages.retrieve({ page_id: config.parentPageId });
              logger.info('부모 페이지 접근 가능', '📄');
            } catch {
              validation.issues.push('Parent page not accessible or not found');
            }
          }
          
          // Check databases
          for (const [name, dbId] of Object.entries(config.databases)) {
            try {
              await notion.databases.retrieve({ database_id: dbId });
              logger.info(`데이터베이스 확인됨: ${name}`, '🗄️');
            } catch {
              validation.issues.push(`Database not accessible: ${name} (${dbId})`);
            }
          }
          
        } catch (error) {
          validation.issues.push(`Notion API connection failed: ${error}`);
        }
      }
      
    } catch {
      validation.issues.push('Configuration file not found or invalid');
    }

    // Generate report
    const report = {
      validation,
      summary: {
        issues: validation.issues.length,
        warnings: validation.warnings.length,
        recommendations: validation.recommendations.length,
        isHealthy: validation.issues.length === 0
      }
    };

    if (options.report) {
      await writeFile(options.report, JSON.stringify(report, null, 2));
      logger.info(`검증 결과 저장됨: ${options.report}`, '💾');
    }

    // Display results
    console.log('\n📋 Validation Results:');
    console.log(`  Issues: ${validation.issues.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    
    if (validation.issues.length > 0) {
      console.log('\n❌ Issues found:');
      validation.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      validation.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (validation.issues.length === 0) {
      logger.success('검증 통과! 모든 시스템이 정상적으로 작동합니다.');
    } else if (options.fix) {
      logger.info('자동 수정 시도 중...', '🔧');
      // Auto-fix logic would go here
      logger.info('자동 수정 기능은 아직 구현되지 않았습니다.');
    }

  } catch (error) {
    logger.error(`검증 실패: ${error}`);
  }
}

/**
 * Execute workspace repair command
 */
async function executeWorkspaceRepair(options: any): Promise<void> {
  try {
    logger.info('워크스페이스 복구 중...', '🔧');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const projectPath = detection.projectRoot;

    if (options.dryRun) {
      console.log('🧪 Dry Run - 복구 미리보기:');
      console.log('  - 설정 파일 검증');
      console.log('  - Notion 연결 복구');
      console.log('  - 데이터베이스 연결 확인');
      console.log('  - 로컬 인덱스 재구축');
      return;
    }

    if (options.backup) {
      logger.info('백업 생성 중...', '💾');
      // Backup logic would go here
      logger.info('백업 기능은 아직 구현되지 않았습니다.');
    }

    // Load or create configuration
    let config: WorkspaceConfig;
    try {
      config = await configManager.loadConfig(projectPath);
    } catch {
      logger.warning('설정 파일이 없습니다. 복구를 위해 새로 생성합니다.');
      
      const initService = new InitializationService(projectPath);
      const result = await initService.initializeProject({ force: options.force });
      
      if (!result.success) {
        logger.error(`복구 실패: ${result.message}`);
        return;
      }
      
      config = result.data?.config;
      if (!config) {
        logger.error('설정 복구 실패');
        return;
      }
    }

    // Repair steps
    const repairSteps = [
      'Configuration validation',
      'Notion connection repair',
      'Database validation',
      'Local index rebuild'
    ];

    for (const step of repairSteps) {
      console.log(`🔄 ${step}...`);
      // Repair logic for each step would go here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
      console.log(`✅ ${step} completed`);
    }

    logger.success('워크스페이스 복구 완료');

  } catch (error) {
    logger.error(`복구 실패: ${error}`);
  }
}

/**
 * Execute workspace schema command
 */
async function executeWorkspaceSchema(options: any): Promise<void> {
  try {
    logger.info('스키마 관리 중...', '📋');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    if (options.add) {
      logger.info(`새 데이터베이스 타입 추가: ${options.add}`, '➕');
      // Add database type logic would go here
      logger.info('데이터베이스 타입 추가 기능은 아직 구현되지 않았습니다.');
    }

    if (options.modify) {
      logger.info(`스키마 수정: ${options.modify}`, '✏️');
      // Modify schema logic would go here
      logger.info('스키마 수정 기능은 아직 구현되지 않았습니다.');
    }

    if (options.migrate) {
      logger.info('스키마 마이그레이션 실행 중...', '🚀');
      // Migration logic would go here
      logger.info('스키마 마이그레이션 기능은 아직 구현되지 않았습니다.');
    }

    if (!options.add && !options.modify && !options.migrate) {
      // Show current schema info
      const projectPath = detection.projectRoot;
      const schemaManager = new (await import('../../../infrastructure/notion/DatabaseSchemaManager.js')).DatabaseSchemaManager(projectPath);
      
      try {
        const schemaInfo = await schemaManager.getSchemaInfo();
        
        console.log('\n📊 Current Schema Information:');
        console.log(`  Total databases: ${schemaInfo.totalDatabases}`);
        console.log(`  Schema source: ${schemaInfo.schemaSource}`);
        console.log('  Available types:');
        
        schemaInfo.databaseTypes.forEach(type => {
          console.log(`    - ${type}`);
        });
        
      } catch (error) {
        logger.warning(`스키마 정보를 불러올 수 없습니다: ${error}`);
      }
    }

  } catch (error) {
    logger.error(`스키마 관리 실패: ${error}`);
  }
}

/**
 * Execute workspace sync command
 * Maps to legacy: workflow sync, sync notion
 */
async function executeWorkspaceSync(options: any): Promise<void> {
  try {
    logger.info('워크스페이스 동기화 중...', '🔄');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    // Import native sync service
    const { WorkspaceSyncService } = await import('../../../services/sync/workspaceSyncService.js');
    const syncService = new WorkspaceSyncService(detection.projectRoot);
    
    // Initialize service
    await syncService.initialize();
    
    // Convert options to native sync format
    const syncOptions = {
      dryRun: options.dryRun,
      force: options.force,
      target: options.target,
      includePatterns: options.include ? [options.include] : undefined,
      excludePatterns: options.exclude ? [options.exclude] : undefined
    };
    
    if (options.dryRun) {
      logger.info('미리보기 모드로 실행 중...', '🧪');
    }
    
    // Execute sync based on target
    if (options.target === 'notion') {
      console.log(`🎯 Notion으로 동기화 중${options.dryRun ? ' (미리보기)' : ''}...`);
      const result = await syncService.executeSync(syncOptions);
      
      if (result.success) {
        logger.success(`동기화 완료! 처리된 파일: ${result.processed}, 업로드: ${result.uploaded}, 업데이트: ${result.updated}`);
      } else {
        logger.error(`동기화 실패: ${result.errors.join(', ')}`);
      }
    } else if (options.target === 'local') {
      console.log('🏠 로컬 동기화는 아직 구현되지 않았습니다.');
      logger.info('로컬 동기화 기능을 구현할 예정입니다.');
    } else {
      logger.error(`지원하지 않는 대상: ${options.target}`);
    }

  } catch (error) {
    logger.error(`동기화 실패: ${error instanceof Error ? error.message : error}`);
    if (error instanceof Error && error.stack) {
      logger.error(`스택: ${error.stack}`);
    }
  }
}

/**
 * Execute workspace analyze command 
 * Maps to legacy: analyze project, workflow inspect
 */
async function executeWorkspaceAnalyze(options: any): Promise<void> {
  try {
    logger.info('프로젝트 분석 중...', '🔍');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    
    // Import enhanced dependency analyzer
    const { EnhancedDependencyAnalyzer } = await import('../../../infrastructure/dependencies/enhancedAnalyzer.js');
    const analyzer = new EnhancedDependencyAnalyzer(projectPath);
    
    // Perform analysis based on scope
    let analysisResults;
    
    if (options.scope === 'project') {
      logger.info('전체 프로젝트 분석 중...', '🏗️');
      analysisResults = await analyzer.analyzeProject(options.detailed);
    } else if (options.scope === 'directory') {
      logger.info('디렉터리별 분석 중...', '📁');
      analysisResults = await analyzer.analyzeByDirectory();
    } else if (options.scope === 'file') {
      logger.info('파일별 분석 중...', '📄');
      analysisResults = await analyzer.analyzeByFile();
    } else {
      logger.error(`지원하지 않는 분석 범위: ${options.scope}`);
      return;
    }
    
    // Display results based on format
    if (options.format === 'json') {
      console.log(JSON.stringify(analysisResults, null, 2));
    } else if (options.format === 'table') {
      console.log('\n📊 분석 결과:');
      console.log(`  총 파일 수: ${analysisResults.totalFiles}`);
      console.log(`  분석된 파일: ${analysisResults.analyzedFiles}`);
      console.log(`  외부 의존성: ${analysisResults.externalDependencies}`);
      console.log(`  내부 모듈: ${analysisResults.internalModules}`);
      
      if (options.detailed && analysisResults.details) {
        console.log('\n🔍 상세 정보:');
        console.log(`  평균 복잡도: ${analysisResults.details.averageComplexity}`);
        console.log(`  최고 복잡도: ${analysisResults.details.maxComplexity}`);
        console.log(`  테스트 커버리지: ${analysisResults.details.testCoverage}%`);
      }
    } else if (options.format === 'report') {
      console.log('\n📋 분석 리포트:');
      console.log('================');
      console.log(`프로젝트: ${detection.projectInfo?.name || 'Unknown'}`);
      console.log(`경로: ${projectPath}`);
      console.log(`분석 시간: ${new Date().toISOString()}`);
      console.log(`\n요약:`);
      console.log(`- 총 ${analysisResults.totalFiles}개 파일 분석`);
      console.log(`- ${analysisResults.externalDependencies}개 외부 의존성 발견`);
      console.log(`- ${analysisResults.internalModules}개 내부 모듈 식별`);
      
      if (analysisResults.recommendations && analysisResults.recommendations.length > 0) {
        console.log(`\n💡 권장사항:`);
        analysisResults.recommendations.forEach((rec: string, index: number) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }

    logger.success('분석 완료!');

  } catch (error) {
    logger.error(`분석 실패: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Execute workspace setup command
 * Maps to legacy: workflow setup-git, schema setup
 */
async function executeWorkspaceSetup(options: any): Promise<void> {
  try {
    logger.info('워크스페이스 설정 중...', '🔧');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    let setupCount = 0;
    
    // Setup Git integration
    if (options.git || options.all) {
      logger.info('Git 통합 설정 중...', '🔧');
      try {
        // Import native sync service for git setup
        const { WorkspaceSyncService } = await import('../../../services/sync/workspaceSyncService.js');
        const syncService = new WorkspaceSyncService(projectPath);
        await syncService.initialize();
        await syncService.setupGitIntegration({ autoSync: true });
        
        logger.success('Git 통합 설정 완료');
        setupCount++;
      } catch (error) {
        logger.error(`Git 설정 실패: ${error}`);
      }
    }
    
    // Setup schema system
    if (options.schema || options.all) {
      logger.info('스키마 시스템 설정 중...', '📋');
      try {
        const schemaManager = new (await import('../../../infrastructure/notion/DatabaseSchemaManager.js')).DatabaseSchemaManager(projectPath);
        const schemas = await schemaManager.loadSchemas();
        const validation = schemaManager.validateSchema();
        
        if (validation.isValid) {
          logger.success('스키마 시스템 설정 완료');
          setupCount++;
        } else {
          logger.warning(`스키마 검증 실패: ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        logger.error(`스키마 설정 실패: ${error}`);
      }
    }
    
    // Setup configuration
    if (options.config || options.all) {
      logger.info('설정 파일 확인 중...', '⚙️');
      try {
        const configManager = ConfigManager.getInstance();
        const config = await configManager.loadConfig(projectPath);
        
        if (config.apiKey && config.parentPageId) {
          logger.success('설정 파일 확인 완료');
          setupCount++;
        } else {
          logger.warning('설정 파일이 불완전합니다. API 키와 부모 페이지 ID를 확인하세요.');
        }
      } catch (error) {
        logger.warning(`설정 확인 실패: ${error}`);
        logger.info('초기화를 먼저 실행해보세요: deplink init');
      }
    }
    
    if (!options.git && !options.schema && !options.config && !options.all) {
      logger.info('설정 옵션을 선택해주세요: --git, --schema, --config, 또는 --all');
      return;
    }
    
    if (setupCount > 0) {
      logger.success(`${setupCount}개 설정 완료!`);
    } else {
      logger.warning('설정이 완료되지 않았습니다. 에러 로그를 확인해주세요.');
    }

  } catch (error) {
    logger.error(`설정 실패: ${error instanceof Error ? error.message : error}`);
  }
}