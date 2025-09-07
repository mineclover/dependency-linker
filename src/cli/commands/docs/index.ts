/**
 * Docs Commands - 문서 관리
 * 📚 deplink docs
 */

import { Command } from 'commander';
import { existsSync, readFileSync, statSync } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger, ProjectDetector } from '../../../shared/utils/index.js';
import { ConfigManager } from '../../../infrastructure/config/configManager.js';

export function createDocsCommands(): Command {
  const docsCmd = new Command('docs')
    .description('문서 관리 및 편집');

  // deplink docs view <file|id>
  docsCmd
    .command('view')
    .description('문서 내용 확인 (Markdown 형태)')
    .argument('<target>', '파일 경로 또는 Notion ID')
    .option('--format <type>', '출력 형식', 'markdown')
    .option('--metadata', '메타데이터 포함')
    .option('--no-color', '색상 없이 출력')
    .action(async (target, options) => {
      await executeDocsView(target, options);
    });

  // deplink docs edit <file|id>
  docsCmd
    .command('edit')
    .description('문서 편집 (로컬 에디터)')
    .argument('<target>', '파일 경로 또는 Notion ID')
    .option('--editor <name>', '사용할 에디터', process.env.EDITOR || 'code')
    .option('--sync-after', '편집 후 자동 동기화')
    .action(async (target, options) => {
      await executeDocsEdit(target, options);
    });

  // deplink docs link <file> <notion-id>
  docsCmd
    .command('link')
    .description('코드 파일과 Notion 문서 연결')
    .argument('<file>', '코드 파일 경로')
    .argument('<notion-id>', 'Notion 페이지 ID')
    .option('--bidirectional', '양방향 연결')
    .option('--update-metadata', '메타데이터 업데이트')
    .action(async (file, notionId, options) => {
      await executeDocsLink(file, notionId, options);
    });

  // deplink docs track
  docsCmd
    .command('track')
    .description('문서 추적 상태 확인')
    .option('--pattern <glob>', '파일 패턴')
    .option('--untracked', '추적되지 않는 파일만')
    .option('--orphaned', '고아 문서만')
    .action(async (options) => {
      await executeDocsTrack(options);
    });

  return docsCmd;
}

/**
 * Execute docs view command
 */
async function executeDocsView(target: string, options: any): Promise<void> {
  try {
    logger.info(`문서 확인 중: ${target}`, '👁️');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    
    // Check if target is a file path or Notion ID
    const isFilePath = target.includes('/') || target.includes('\\') || existsSync(path.resolve(target));
    
    if (isFilePath) {
      await viewLocalFile(target, options, projectPath);
    } else {
      await viewNotionDocument(target, options, projectPath);
    }

  } catch (error) {
    logger.error(`문서 확인 실패: ${error}`);
  }
}

/**
 * View local file
 */
async function viewLocalFile(filePath: string, options: any, projectPath: string): Promise<void> {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    
    if (!existsSync(fullPath)) {
      logger.error(`파일을 찾을 수 없습니다: ${filePath}`);
      return;
    }

    const content = await readFile(fullPath, 'utf-8');
    const stats = statSync(fullPath);
    
    console.log(`\n📄 File: ${path.relative(projectPath, fullPath)}`);
    
    if (options.metadata) {
      console.log(`   Size: ${stats.size} bytes`);
      console.log(`   Modified: ${stats.mtime.toISOString()}`);
      console.log(`   Type: ${path.extname(fullPath) || 'no extension'}`);
      console.log('');
    }

    if (options.format === 'raw') {
      console.log(content);
    } else {
      // Format as markdown with syntax highlighting info
      const extension = path.extname(fullPath).slice(1);
      console.log('```' + extension);
      console.log(content);
      console.log('```');
    }
    
    logger.success('문서 확인 완료');
    
  } catch (error) {
    logger.error(`로컬 파일 확인 실패: ${error}`);
  }
}

/**
 * View Notion document
 */
async function viewNotionDocument(notionId: string, options: any, projectPath: string): Promise<void> {
  try {
    logger.info('Notion 문서 확인 기능은 추후 구현 예정입니다.', 'ℹ️');
    
    // TODO: Implement Notion document viewing
    // This would require:
    // 1. Notion API client initialization
    // 2. Page content retrieval
    // 3. Markdown conversion
    // 4. Formatting and display
    
    console.log(`\n📋 Notion Document ID: ${notionId}`);
    console.log('   Status: 추후 구현 예정');
    
    if (options.metadata) {
      console.log('   Metadata: 사용 불가');
    }
    
    logger.warning('Notion 연동 기능을 사용하려면 전체 시스템 구현이 완료되어야 합니다.');
    
  } catch (error) {
    logger.error(`Notion 문서 확인 실패: ${error}`);
  }
}

/**
 * Execute docs edit command
 */
async function executeDocsEdit(target: string, options: any): Promise<void> {
  try {
    logger.info(`문서 편집 시작: ${target}`, '✏️');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    const isFilePath = target.includes('/') || target.includes('\\') || existsSync(path.resolve(target));
    
    if (isFilePath) {
      await editLocalFile(target, options, projectPath);
    } else {
      await editNotionDocument(target, options, projectPath);
    }

  } catch (error) {
    logger.error(`문서 편집 실패: ${error}`);
  }
}

/**
 * Edit local file
 */
async function editLocalFile(filePath: string, options: any, projectPath: string): Promise<void> {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
    
    if (!existsSync(fullPath)) {
      logger.error(`파일을 찾을 수 없습니다: ${filePath}`);
      return;
    }

    const editor = options.editor;
    const command = `${editor} "${fullPath}"`;
    
    logger.info(`에디터 실행 중: ${editor}`, '🚀');
    
    try {
      execSync(command, { 
        stdio: 'inherit',
        cwd: projectPath 
      });
      
      logger.success('파일 편집 완료');
      
      if (options.syncAfter) {
        logger.info('편집 후 동기화 실행 중...', '🔄');
        // TODO: Implement sync after edit
        logger.info('동기화 기능은 추후 구현 예정입니다.');
      }
      
    } catch (error: any) {
      if (error.status === 0) {
        logger.success('에디터가 정상적으로 종료되었습니다.');
      } else {
        logger.error(`에디터 실행 실패: ${error.message}`);
      }
    }
    
  } catch (error) {
    logger.error(`로컬 파일 편집 실패: ${error}`);
  }
}

/**
 * Edit Notion document
 */
async function editNotionDocument(notionId: string, options: any, projectPath: string): Promise<void> {
  try {
    logger.info('Notion 문서 편집 기능은 추후 구현 예정입니다.', 'ℹ️');
    
    // TODO: Implement Notion document editing
    // This would require:
    // 1. Download Notion content to temporary file
    // 2. Open in local editor
    // 3. Upload changes back to Notion
    // 4. Handle conflict resolution
    
    console.log(`\n✏️ Notion Document Editing: ${notionId}`);
    console.log('   기능 상태: 개발 중');
    console.log('   권장 방법: 로컬 파일을 편집한 후 sync 명령 사용');
    
    logger.warning('현재는 로컬 파일 편집 후 sync 명령을 사용하는 것을 권장합니다.');
    
  } catch (error) {
    logger.error(`Notion 문서 편집 실패: ${error}`);
  }
}

/**
 * Execute docs link command
 */
async function executeDocsLink(file: string, notionId: string, options: any): Promise<void> {
  try {
    logger.info(`문서 연결 중: ${file} ↔ ${notionId}`, '🔗');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);
    
    if (!existsSync(fullPath)) {
      logger.error(`파일을 찾을 수 없습니다: ${file}`);
      return;
    }

    // Validate Notion ID format (basic validation)
    if (!notionId || notionId.length < 32) {
      logger.error('올바르지 않은 Notion ID 형식입니다.');
      return;
    }

    // TODO: Implement actual linking logic
    // This would involve:
    // 1. Store mapping in local database
    // 2. Add metadata to file (if supported)
    // 3. Verify Notion page exists
    // 4. Setup bidirectional link if requested
    
    console.log(`\n🔗 문서 연결 설정:`);
    console.log(`   로컬 파일: ${path.relative(projectPath, fullPath)}`);
    console.log(`   Notion ID: ${notionId}`);
    console.log(`   양방향 연결: ${options.bidirectional ? '예' : '아니오'}`);
    console.log(`   메타데이터 업데이트: ${options.updateMetadata ? '예' : '아니오'}`);
    
    // Simulate linking process
    logger.info('연결 정보를 로컬 데이터베이스에 저장 중...', '💾');
    
    try {
      // Create mapping entry (simulated)
      const mappingFile = path.join(projectPath, '.deplink', 'document-mappings.json');
      let mappings = {};
      
      if (existsSync(mappingFile)) {
        const content = await readFile(mappingFile, 'utf-8');
        mappings = JSON.parse(content);
      }
      
      const relativePath = path.relative(projectPath, fullPath);
      (mappings as any)[relativePath] = {
        notionId: notionId,
        bidirectional: options.bidirectional || false,
        linkedAt: new Date().toISOString(),
        lastSync: null
      };
      
      // Ensure .deplink directory exists
      const deplinkDir = path.join(projectPath, '.deplink');
      if (!existsSync(deplinkDir)) {
        const fs = await import('fs');
        fs.mkdirSync(deplinkDir, { recursive: true });
      }
      
      await writeFile(mappingFile, JSON.stringify(mappings, null, 2));
      
      logger.success('문서 연결 완료');
      
      if (options.updateMetadata) {
        logger.info('메타데이터 업데이트 기능은 추후 구현 예정입니다.', 'ℹ️');
      }
      
    } catch (error) {
      logger.error(`연결 정보 저장 실패: ${error}`);
    }

  } catch (error) {
    logger.error(`문서 연결 실패: ${error}`);
  }
}

/**
 * Execute docs track command
 */
async function executeDocsTrack(options: any): Promise<void> {
  try {
    logger.info('문서 추적 상태 확인 중...', '📊');
    
    const detection = await ProjectDetector.autoDetectProject();
    if (!detection.projectRoot) {
      logger.error('프로젝트 루트를 찾을 수 없습니다.');
      return;
    }

    const projectPath = detection.projectRoot;
    const mappingFile = path.join(projectPath, '.deplink', 'document-mappings.json');
    
    console.log('\n📊 문서 추적 현황:');
    
    if (!existsSync(mappingFile)) {
      console.log('   연결된 문서가 없습니다.');
      logger.info('문서를 연결하려면 "deplink docs link" 명령을 사용하세요.');
      return;
    }

    try {
      const content = await readFile(mappingFile, 'utf-8');
      const mappings = JSON.parse(content);
      const entries = Object.entries(mappings);
      
      if (entries.length === 0) {
        console.log('   연결된 문서가 없습니다.');
        return;
      }
      
      console.log(`   총 연결된 문서: ${entries.length}개\n`);
      
      let trackedCount = 0;
      let orphanedCount = 0;
      let untrackedCount = 0;
      
      for (const [filePath, mapping] of entries) {
        const fullPath = path.join(projectPath, filePath);
        const fileExists = existsSync(fullPath);
        const mappingData = mapping as any;
        
        if (options.untracked && fileExists) {
          continue;
        }
        
        if (options.orphaned && fileExists) {
          continue;
        }
        
        if (fileExists) {
          console.log(`   ✅ ${filePath}`);
          console.log(`      → Notion: ${mappingData.notionId}`);
          console.log(`      → 연결일: ${new Date(mappingData.linkedAt).toLocaleDateString()}`);
          console.log(`      → 마지막 동기화: ${mappingData.lastSync || '없음'}`);
          trackedCount++;
        } else {
          console.log(`   ❌ ${filePath} (파일 없음)`);
          console.log(`      → Notion: ${mappingData.notionId}`);
          orphanedCount++;
        }
        
        console.log('');
      }
      
      console.log('\n📈 통계:');
      console.log(`   추적 중: ${trackedCount}개`);
      console.log(`   고아 문서: ${orphanedCount}개`);
      
      if (options.pattern) {
        logger.info(`패턴 필터링 (${options.pattern})은 추후 구현 예정입니다.`, 'ℹ️');
      }
      
      logger.success('문서 추적 상태 확인 완료');
      
    } catch (error) {
      logger.error(`매핑 파일 읽기 실패: ${error}`);
    }

  } catch (error) {
    logger.error(`문서 추적 실패: ${error}`);
  }
}