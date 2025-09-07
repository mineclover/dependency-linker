#!/usr/bin/env node

/**
 * Dependency Linker CLI - Main Entry Point
 * 코드베이스와 문서 간의 의존성 관리 및 탐색 시스템
 */

import { Command } from 'commander';
import { createInitCommands } from './commands/init/index.js';
import { createSyncCommands } from './commands/sync/index.js';
import { createExploreCommands } from './commands/explore/index.js';
import { createDocsCommands } from './commands/docs/index.js';
import { createWorkspaceCommands } from './commands/workspace/index.js';
import { createDevCommands } from './commands/dev/index.js';
import { createMarkdownCommands } from './commands/markdown/index.js';
import { createUploadCommand } from './commands/upload/index.js';

/**
 * 메인 CLI 애플리케이션 설정
 */
async function createCLI(): Promise<Command> {
  const program = new Command();
  
  program
    .name('deplink')
    .description('코드베이스와 문서 간의 의존성 관리 및 탐색 시스템')
    .version('2.0.0');

  // 📋 핵심 명령어 그룹 추가
  program.addCommand(createInitCommands());      // 🚀 프로젝트 초기화
  program.addCommand(createSyncCommands());      // 🔄 동기화 (핵심)
  program.addCommand(createExploreCommands());   // 🗺️ 의존성 탐색 (핵심)
  program.addCommand(createUploadCommand());     // 📤 데이터 업로드 (핵심)
  program.addCommand(createDocsCommands());      // 📚 문서 관리
  program.addCommand(createWorkspaceCommands()); // 🏢 워크스페이스 관리
  program.addCommand(createMarkdownCommands());  // 📝 Markdown 변환
  program.addCommand(createDevCommands());       // 🛠️ 개발자 도구

  return program;
}

/**
 * CLI 애플리케이션 실행
 */
async function main(): Promise<void> {
  try {
    const program = await createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('❌ CLI Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// 스크립트로 직접 실행될 때만 main 함수 호출
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { createCLI };