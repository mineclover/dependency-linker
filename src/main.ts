#!/usr/bin/env node

/**
 * Main CLI Entry Point - New Clean Architecture
 * 새로운 아키텍처 기반의 CLI 진입점
 */

// Initialize environment variables before anything else
import dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Command } from 'commander';
import { logger } from './shared/utils/index.js';
import { commands } from './cli/commands/index.js';

// Legacy command imports (to be migrated)
import { createCircuitBreakerCommand } from './cli/commands/circuit-breaker.js';
import { createConfigSyncCommand } from './cli/commands/config-sync.js';

// Database command imports
import { program as databaseCommands } from './cli/commands/database/index.js';

const program = new Command();

async function main() {
  try {
    // CLI 프로그램 설정
    program
      .name('deplink')
      .description('Dependency Linker - Clean Architecture Implementation')
      .version('2.0.0-alpha');

    // 표준화된 명령어 등록
    program.addCommand(commands.init());
    program.addCommand(commands.validate());
    program.addCommand(commands.configValidate());
    program.addCommand(commands.sync);
    program.addCommand(commands.upload);
    program.addCommand(commands.status);
    program.addCommand(commands.health);
    program.addCommand(commands.exportMarkdown);

    // Database 명령어들
    databaseCommands.commands.forEach(cmd => {
      program.addCommand(cmd.name('db:' + cmd.name()));
    });
    
    // 레거시 명령어 (마이그레이션 예정)
    program.addCommand(createCircuitBreakerCommand());
    program.addCommand(createConfigSyncCommand());
    
    // 전역 옵션
    program
      .option('-v, --verbose', 'Verbose output')
      .option('-q, --quiet', 'Quiet mode')
      .option('--no-color', 'Disable colored output');

    // 도움말 개선
    program.on('--help', () => {
      console.log('');
      console.log('Examples:');
      console.log('  $ deplink init                       # Initialize new project');
      console.log('  $ deplink status                     # Show project status');
      console.log('  $ deplink sync                       # Sync project with Notion');
      console.log('  $ deplink upload --file app.ts       # Upload single file');
      console.log('  $ deplink upload --project           # Upload entire project');
      console.log('  $ deplink validate --system          # Validate entire system');
      console.log('  $ deplink health                     # System health check');
      console.log('  $ deplink export-markdown --file src/main.ts  # Export dependencies to markdown');
      console.log('');
      console.log('Core Features:');
      console.log('  • Clean Architecture implementation');
      console.log('  • Standardized dependency injection');
      console.log('  • Comprehensive error handling');
      console.log('  • Real-time validation and monitoring');
      console.log('  • Dependency exploration and markdown export');
      console.log('');
    });

    // 전역 에러 핸들링
    program.exitOverride();

    try {
      await program.parseAsync(process.argv);
    } catch (error: any) {
      if (error.code === 'commander.help' || error.code === 'commander.version') {
        // 정상적인 도움말/버전 출력
        process.exit(0);
      }
      throw error;
    }

  } catch (error) {
    logger.error(`CLI 실행 실패: ${error}`);
    process.exit(1);
  }
}

// CLI 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export default program;