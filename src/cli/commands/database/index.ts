#!/usr/bin/env node

/**
 * 데이터베이스 스키마 관리 CLI 명령 - 리팩토링된 버전
 * Database Schema Management CLI Commands - Refactored Version
 */

import { Command } from 'commander';
import { createInitCommand } from './commands/InitCommand.js';
import { createCheckCommand } from './commands/CheckCommand.js';
import { createAddPropertyCommand } from './commands/AddPropertyCommand.js';
import { createTestCommand } from './commands/TestCommand.js';
import { createRestoreCommand } from './commands/RestoreCommand.js';
import { createResetCommand } from './commands/ResetCommand.js';
import { createValidateCommand } from './commands/ValidateCommand.js';
import { createCreateWithSchemaCommand } from './commands/CreateWithSchemaCommand.js';

const program = new Command();

program
  .name('deplink-db')
  .description('데이터베이스 스키마 관리 도구')
  .version('1.0.0');

// 모듈화된 명령어 등록
program.addCommand(createInitCommand());
program.addCommand(createCheckCommand());
program.addCommand(createAddPropertyCommand());
program.addCommand(createTestCommand());
program.addCommand(createRestoreCommand());
program.addCommand(createResetCommand());
program.addCommand(createValidateCommand());
program.addCommand(createCreateWithSchemaCommand());

export { program };

// CLI 스크립트로 직접 실행될 때
if (import.meta.main) {
  program.parse();
}