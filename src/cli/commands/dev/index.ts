/**
 * Dev Commands - 개발자 도구
 * 🛠️ deplink dev
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger, ProjectDetector } from '../../../shared/utils/index.js';
import { ConfigManager } from '../../../infrastructure/config/configManager.js';

export function createDevCommands(): Command {
  const devCmd = new Command('dev')
    .description('개발자 도구 및 유틸리티');

  // deplink dev test
  devCmd
    .command('test')
    .description('테스트 실행')
    .option('--unit', '단위 테스트만')
    .option('--integration', '통합 테스트만')
    .option('--e2e', 'E2E 테스트만')
    .option('--coverage', '커버리지 포함')
    .action(async (options) => {
      await executeDevTest(options);
    });

  // deplink dev debug
  devCmd
    .command('debug')
    .description('디버깅 도구')
    .option('--logs', '로그 확인')
    .option('--connections', '연결 상태 확인')
    .option('--performance', '성능 분석')
    .action(async (options) => {
      await executeDevDebug(options);
    });

  // deplink dev export
  devCmd
    .command('export')
    .description('데이터 내보내기')
    .option('--format <type>', '내보내기 형식', 'json')
    .option('--output <file>', '출력 파일')
    .option('--filter <pattern>', '필터 패턴')
    .action(async (options) => {
      await executeDevExport(options);
    });

  // deplink dev demo
  devCmd
    .command('demo')
    .description('데모 실행')
    .argument('[demo-name]', '실행할 데모', 'basic')
    .action(async (demoName, options) => {
      await executeDevDemo(demoName, options);
    });

  return devCmd;
}

/**
 * Execute dev test command
 */
async function executeDevTest(options: any): Promise<void> {
  try {
    logger.info('테스트 실행 중...', '🧪');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      logger.error('package.json을 찾을 수 없습니다.');
      return;
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const scripts = packageJson.scripts || {};

    let testCommand = 'npm test';
    
    // Determine test command based on options
    if (options.unit && scripts['test:unit']) {
      testCommand = 'npm run test:unit';
    } else if (options.integration && scripts['test:integration']) {
      testCommand = 'npm run test:integration';
    } else if (options.e2e && scripts['test:e2e']) {
      testCommand = 'npm run test:e2e';
    } else if (scripts.test) {
      testCommand = 'npm test';
    } else {
      logger.warning('테스트 스크립트를 찾을 수 없습니다.');
      logger.info('사용 가능한 스크립트:', Object.keys(scripts).join(', '));
      return;
    }

    if (options.coverage) {
      if (scripts['test:coverage']) {
        testCommand = 'npm run test:coverage';
      } else {
        logger.info('Coverage 옵션을 테스트 명령어에 추가합니다.');
        testCommand += ' -- --coverage';
      }
    }

    logger.info(`실행 중: ${testCommand}`, '🚀');
    
    try {
      const output = execSync(testCommand, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      console.log(output);
      logger.success('테스트 완료');
    } catch (error: any) {
      console.log(error.stdout || '');
      console.error(error.stderr || '');
      logger.error(`테스트 실패: ${error.message}`);
    }

  } catch (error) {
    logger.error(`테스트 실행 실패: ${error}`);
  }
}

/**
 * Execute dev debug command
 */
async function executeDevDebug(options: any): Promise<void> {
  try {
    logger.info('디버깅 모드 시작...', '🔍');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;

    if (options.logs) {
      await showLogs(projectPath);
    }
    
    if (options.connections) {
      await checkConnections(projectPath);
    }
    
    if (options.performance) {
      await analyzePerformance(projectPath);
    }

    if (!options.logs && !options.connections && !options.performance) {
      // Show general debug info
      console.log('\n🔍 Debug Information:');
      console.log(`  Project: ${detection.projectInfo?.name || 'Unknown'}`);
      console.log(`  Path: ${projectPath}`);
      console.log(`  Node.js: ${process.version}`);
      console.log(`  Platform: ${process.platform}`);
      console.log(`  Working Directory: ${process.cwd()}`);
      
      await showLogs(projectPath);
      await checkConnections(projectPath);
    }

  } catch (error) {
    logger.error(`디버깅 실패: ${error}`);
  }
}

/**
 * Show application logs
 */
async function showLogs(projectPath: string): Promise<void> {
  console.log('\n📋 Recent Logs:');
  
  const logPaths = [
    path.join(projectPath, '.deplink', 'debug.log'),
    path.join(projectPath, '.deplink', 'sync.log'),
    path.join(projectPath, 'deplink.log')
  ];

  for (const logPath of logPaths) {
    if (existsSync(logPath)) {
      try {
        const content = await readFile(logPath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        const recentLines = lines.slice(-10); // Show last 10 lines
        
        console.log(`\n  ${path.basename(logPath)}:`);
        recentLines.forEach(line => {
          console.log(`    ${line}`);
        });
      } catch (error) {
        console.log(`    Failed to read ${logPath}: ${error}`);
      }
    }
  }
}

/**
 * Check connections status
 */
async function checkConnections(projectPath: string): Promise<void> {
  console.log('\n🔗 Connection Status:');
  
  const configManager = ConfigManager.getInstance();
  
  try {
    const config = await configManager.loadConfig(projectPath);
    
    // Test Notion connection
    if (config.apiKey) {
      try {
        const { Client } = await import('@notionhq/client');
        const notion = new Client({ auth: config.apiKey });
        await notion.users.me({});
        console.log('  ✅ Notion API: Connected');
      } catch (error) {
        console.log(`  ❌ Notion API: Failed (${error})`);
      }
    } else {
      console.log('  ⚠️  Notion API: No API key configured');
    }

    // Test database connections
    if (Object.keys(config.databases).length > 0) {
      console.log('  📊 Databases:');
      for (const [name, dbId] of Object.entries(config.databases)) {
        try {
          const { Client } = await import('@notionhq/client');
          const notion = new Client({ auth: config.apiKey });
          await notion.databases.retrieve({ database_id: dbId });
          console.log(`    ✅ ${name}: ${dbId}`);
        } catch (error) {
          console.log(`    ❌ ${name}: ${dbId} (${error})`);
        }
      }
    }

  } catch {
    console.log('  ⚠️  Configuration not found');
  }
}

/**
 * Analyze performance
 */
async function analyzePerformance(projectPath: string): Promise<void> {
  console.log('\n⚡ Performance Analysis:');
  
  const startTime = Date.now();
  
  // Memory usage
  const memUsage = process.memoryUsage();
  console.log('  Memory Usage:');
  console.log(`    RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.log(`    Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`    External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  
  // File system
  try {
    const fs = await import('fs/promises');
    const files = await fs.readdir(projectPath);
    console.log(`  File Count: ${files.length}`);
  } catch (error) {
    console.log(`  File System: Error reading directory`);
  }
  
  const endTime = Date.now();
  console.log(`  Analysis Time: ${endTime - startTime}ms`);
}

/**
 * Execute dev export command
 */
async function executeDevExport(options: any): Promise<void> {
  try {
    logger.info('데이터 내보내기 시작...', '📤');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    const configManager = ConfigManager.getInstance();
    
    try {
      const config = await configManager.loadConfig(projectPath);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        project: {
          name: detection.projectInfo?.name || 'Unknown',
          path: projectPath
        },
        configuration: {
          databases: config.databases,
          environment: config.environment
        },
        metadata: {
          version: '2.0.0',
          exportFormat: options.format
        }
      };

      const filename = options.output || `deplink-export-${Date.now()}.${options.format}`;
      const outputPath = path.isAbsolute(filename) ? filename : path.join(projectPath, filename);
      
      let content: string;
      
      switch (options.format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          break;
        case 'yaml':
          // Simple YAML export (would use yaml library in real implementation)
          content = Object.entries(exportData).map(([key, value]) => 
            `${key}: ${JSON.stringify(value, null, 2)}`
          ).join('\n');
          break;
        default:
          content = JSON.stringify(exportData, null, 2);
      }
      
      await writeFile(outputPath, content, 'utf-8');
      logger.success(`데이터 내보내기 완료: ${outputPath}`);
      
    } catch (error) {
      logger.error(`설정을 불러올 수 없습니다: ${error}`);
    }

  } catch (error) {
    logger.error(`내보내기 실패: ${error}`);
  }
}

/**
 * Execute dev demo command  
 */
async function executeDevDemo(demoName: string, options: any): Promise<void> {
  try {
    logger.info(`${demoName} 데모 실행 중...`, '🎮');
    
    const demos = {
      basic: () => basicDemo(),
      sync: () => syncDemo(),
      analyze: () => analyzeDemo()
    };

    const demoFunction = demos[demoName as keyof typeof demos];
    
    if (!demoFunction) {
      logger.error(`알 수 없는 데모: ${demoName}`);
      logger.info('사용 가능한 데모:', Object.keys(demos).join(', '));
      return;
    }

    await demoFunction();
    
  } catch (error) {
    logger.error(`데모 실행 실패: ${error}`);
  }
}

/**
 * Basic demo
 */
async function basicDemo(): Promise<void> {
  console.log('\n🎮 Basic Demo - Dependency Linker');
  console.log('  1. Project detection...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('  ✅ Project detected');
  
  console.log('  2. Configuration check...');
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('  ✅ Configuration ready');
  
  console.log('  3. Demo complete!');
  console.log('\n  Next steps:');
  console.log('    - Run: deplink init');
  console.log('    - Configure: Add API key and parent page ID');
  console.log('    - Sync: deplink sync');
}

/**
 * Sync demo
 */
async function syncDemo(): Promise<void> {
  console.log('\n🔄 Sync Demo - File Synchronization');
  console.log('  Simulating file sync process...');
  
  const steps = [
    'Discovering files',
    'Analyzing dependencies', 
    'Uploading to Notion',
    'Updating local index'
  ];

  for (const step of steps) {
    console.log(`  🔄 ${step}...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log(`  ✅ ${step} complete`);
  }
  
  console.log('\n  📊 Demo Results:');
  console.log('    Files processed: 5');
  console.log('    Files uploaded: 3');
  console.log('    Files updated: 2');
}

/**
 * Analyze demo
 */
async function analyzeDemo(): Promise<void> {
  console.log('\n🔍 Analyze Demo - Dependency Analysis');
  console.log('  Simulating dependency analysis...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n  📈 Analysis Results:');
  console.log('    Total files: 12');
  console.log('    Dependencies: 8');
  console.log('    Imports: 15');
  console.log('    Exports: 7');
  console.log('    Circular dependencies: 0');
  
  console.log('\n  🎯 Recommendations:');
  console.log('    • All dependencies are healthy');
  console.log('    • Consider adding more documentation');
  console.log('    • Good code organization detected');
}