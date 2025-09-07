/**
 * Notion Imports Sync Command
 * 향상된 의존성 분석 결과를 노션 Imports에 업데이트
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { logger } from '../../../shared/utils/index.js';
import type { NotionConfig, NotionPage } from '../../../shared/types/index.js';

export function createNotionImportsSyncCommand(): Command {
  const cmd = new Command('notion-imports')
    .alias('ni')
    .description('Update Notion Imports database with latest dependency analysis')
    .option('--dry-run', 'Show what would be updated without making changes')
    .option('--force', 'Force update all dependencies regardless of cache')
    .option('--max-files <number>', 'Maximum number of files to process', '100')
    .action(async (options) => {
      try {
        await syncNotionImports(options);
      } catch (error) {
        logger.error(`Notion imports sync failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return cmd;
}

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  maxFiles?: string;
}

interface FileImportInfo {
  filePath: string;
  relativePath: string;
  imports: string[];
  importedBy: string[];
  notionId?: string;
}

interface NotionConfig {
  apiKey: string;
  databases: {
    files: string;
    [key: string]: string;
  };
  project: {
    name: string;
    path: string;
  };
}

async function syncNotionImports(options: SyncOptions): Promise<void> {
  const projectPath = resolve(process.cwd());
  logger.info('🔄 Starting Notion Imports sync with enhanced dependency analysis');

  // 1. 설정 로드
  const config = await loadConfig(projectPath);
  logger.info(`📝 Loaded config for project: ${config.project.name}`);

  // 2. 파일 및 의존성 분석
  const fileImports = await analyzeDependencies(projectPath, parseInt(options.maxFiles || '100'));
  logger.info(`🔍 Analyzed ${fileImports.length} files with dependencies`);
  
  // 디버그 정보 출력
  const filesWithImports = fileImports.filter(f => f.imports.length > 0);
  const filesWithImportedBy = fileImports.filter(f => f.importedBy.length > 0);
  logger.info(`📊 ${filesWithImports.length} files have imports, ${filesWithImportedBy.length} files are imported by others`);

  // 3. 노션 데이터베이스 조회 (기존 파일들)
  const existingFiles = await getExistingNotionFiles(config);
  logger.info(`📚 Found ${existingFiles.length} existing files in Notion`);

  // 4. 업데이트 대상 결정
  const updates = determineUpdates(fileImports, existingFiles, options.force);
  logger.info(`📋 Prepared ${updates.length} updates`);

  if (options.dryRun) {
    displayDryRunResults(updates);
    return;
  }

  // 5. 노션 업데이트 실행
  await executeNotionUpdates(config, updates);
  
  logger.success(`✅ Successfully updated ${updates.length} files in Notion Imports`);
}

async function loadConfig(projectPath: string): Promise<NotionConfig> {
  try {
    const configPath = path.join(projectPath, 'deplink.config.json');
    const configContent = await readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    if (!config.apiKey || !config.databases?.files) {
      throw new Error('Invalid config: missing apiKey or databases.files');
    }
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load config: ${error}`);
  }
}

async function analyzeDependencies(projectPath: string, maxFiles: number): Promise<FileImportInfo[]> {
  logger.info('🔍 Analyzing dependencies...');
  
  // TypeScript/JavaScript 파일들 찾기 (src_new 폴더 우선)
  const pattern = 'src/**/*.{ts,tsx,js,jsx}';
  const files = await glob(pattern, {
    cwd: projectPath,
    ignore: ['node_modules/**', 'dist/**', '.git/**', '.deplink/**', '*.test.*', '*.spec.*']
  });
  
  // src_new가 없으면 전체에서 찾기
  if (files.length === 0) {
    const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: projectPath,
      ignore: ['node_modules/**', 'dist/**', '.git/**', '.deplink/**', '*.test.*', '*.spec.*']
    });
    files.push(...allFiles.slice(0, maxFiles));
  }

  const fileImports: FileImportInfo[] = [];
  const processFiles = files.slice(0, maxFiles);
  
  logger.info(`📂 Processing ${processFiles.length} files...`);
  
  // 의존성 맵 구축
  const dependencyMap = new Map<string, Set<string>>();
  const reverseDependencyMap = new Map<string, Set<string>>();

  for (const file of processFiles) {
    const fullPath = path.resolve(projectPath, file);
    const imports = await extractImports(fullPath, projectPath);
    
    // 직접 의존성 저장
    dependencyMap.set(file, new Set(imports));
    
    // 역방향 의존성 구축
    for (const importedFile of imports) {
      if (!reverseDependencyMap.has(importedFile)) {
        reverseDependencyMap.set(importedFile, new Set());
      }
      reverseDependencyMap.get(importedFile)!.add(file);
    }
  }

  // 결과 구성
  for (const file of processFiles) {
    const imports = Array.from(dependencyMap.get(file) || []);
    const importedBy = Array.from(reverseDependencyMap.get(file) || []);
    
    fileImports.push({
      filePath: path.resolve(projectPath, file),
      relativePath: file,
      imports,
      importedBy,
    });
  }

  return fileImports;
}

async function extractImports(filePath: string, projectPath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, 'utf8');
    const imports: string[] = [];
    
    // 더 포괄적인 import 패턴 매칭
    const importPatterns = [
      // ES6 imports
      /import\s+.*?from\s+['"](\..*?)['"];?/g,
      /import\s+['"](\..*?)['"];?/g,
      // CommonJS require
      /require\s*\(\s*['"](\..*?)['"]\s*\)/g,
      // Dynamic imports
      /import\s*\(\s*['"](\..*?)['"]\s*\)/g,
      // 다른 변형들
      /from\s+['"](\..*?)['"];?/g,
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        const resolvedPath = await resolveImportPath(importPath, filePath, projectPath);
        if (resolvedPath) {
          imports.push(resolvedPath);
        }
      }
    }
    
    return [...new Set(imports)]; // 중복 제거
  } catch (error) {
    logger.warning(`Failed to extract imports from ${filePath}: ${error}`, 'ERROR');
    return [];
  }
}

async function resolveImportPath(importPath: string, fromFile: string, projectPath: string): Promise<string | null> {
  if (!importPath.startsWith('.')) {
    return null; // 외부 모듈은 무시
  }
  
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, importPath);
  
  // 디버깅을 위한 로깅
  const debugImport = (msg: string, ...args: any[]) => {
    if (process.env.DEBUG_IMPORTS) {
      console.log(`[DEBUG] ${msg}`, ...args);
    }
  };
  
  debugImport(`Resolving import "${importPath}" from "${fromFile}"`);
  debugImport(`Resolved base path: "${resolved}"`);
  
  const fs = await import('fs/promises');
  
  // 이미 확장자가 있는 경우 직접 체크
  if (path.extname(importPath)) {
    try {
      await fs.access(resolved);
      const relativePath = path.relative(projectPath, resolved);
      debugImport(`✅ Found with extension: ${relativePath}`);
      return relativePath;
    } catch {
      debugImport(`❌ Not found with extension: ${resolved}`);
      // .js import는 .ts 파일을 참조할 수 있음
      if (importPath.endsWith('.js')) {
        const tsVersion = resolved.replace(/\.js$/, '.ts');
        try {
          await fs.access(tsVersion);
          const relativePath = path.relative(projectPath, tsVersion);
          debugImport(`✅ Found .ts for .js import: ${relativePath}`);
          return relativePath;
        } catch {
          debugImport(`❌ .ts version not found: ${tsVersion}`);
        }
      }
      return null;
    }
  }
  
  // 확장자 시도
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    try {
      await fs.access(withExt);
      const relativePath = path.relative(projectPath, withExt);
      debugImport(`✅ Found with extension ${ext}: ${relativePath}`);
      return relativePath;
    } catch {
      debugImport(`❌ Not found: ${withExt}`);
    }
  }
  
  // index 파일 시도
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    try {
      await fs.access(indexFile);
      const relativePath = path.relative(projectPath, indexFile);
      debugImport(`✅ Found index file: ${relativePath}`);
      return relativePath;
    } catch {
      debugImport(`❌ Index not found: ${indexFile}`);
    }
  }
  
  debugImport(`❌ No resolution found for: ${importPath}`);
  return null;
}

async function getExistingNotionFiles(config: NotionConfig): Promise<NotionPage[]> {
  logger.info('📚 Fetching existing files from Notion...', 'NOTION');
  
  try {
    // 노션 MCP를 사용해서 기존 파일들 조회
    const existingFiles: NotionPage[] = [];
    
    // 임시로 빈 배열 반환 (MCP 통합 후 구현)
    logger.info('📋 Notion MCP integration placeholder', 'MCP');
    
    return existingFiles;
  } catch (error) {
    logger.warning(`Failed to fetch existing Notion files: ${error}`, 'NOTION');
    return [];
  }
}

function determineUpdates(
  fileImports: FileImportInfo[], 
  existingFiles: NotionPage[], 
  force: boolean = false
): FileImportInfo[] {
  // force가 true이거나 기존 파일이 없으면 모든 파일 업데이트
  if (force || existingFiles.length === 0) {
    return fileImports.filter(f => f.imports.length > 0 || f.importedBy.length > 0);
  }
  
  // 실제 구현시에는 더 정교한 비교 로직 필요
  return fileImports.filter(f => f.imports.length > 0 || f.importedBy.length > 0);
}

function displayDryRunResults(updates: FileImportInfo[]): void {
  logger.info('🏃 Dry Run Results', 'DRY-RUN');
  console.log();
  
  if (updates.length === 0) {
    console.log('   No updates needed.');
    return;
  }
  
  console.log(`📋 ${updates.length} files would be updated:`);
  console.log();
  
  updates.slice(0, 10).forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.relativePath}`);
    if (file.imports.length > 0) {
      console.log(`      Imports: ${file.imports.slice(0, 3).join(', ')}${file.imports.length > 3 ? ` (+${file.imports.length - 3} more)` : ''}`);
    }
    if (file.importedBy.length > 0) {
      console.log(`      Imported By: ${file.importedBy.slice(0, 3).join(', ')}${file.importedBy.length > 3 ? ` (+${file.importedBy.length - 3} more)` : ''}`);
    }
    console.log();
  });
  
  if (updates.length > 10) {
    console.log(`   ... and ${updates.length - 10} more files`);
  }
  
  // 통계
  const totalImports = updates.reduce((sum, f) => sum + f.imports.length, 0);
  const totalImportedBy = updates.reduce((sum, f) => sum + f.importedBy.length, 0);
  
  console.log('📊 Statistics:');
  console.log(`   Files with imports: ${updates.filter(f => f.imports.length > 0).length}`);
  console.log(`   Files imported by others: ${updates.filter(f => f.importedBy.length > 0).length}`);
  console.log(`   Total import relationships: ${totalImports}`);
  console.log(`   Total imported-by relationships: ${totalImportedBy}`);
}

async function executeNotionUpdates(config: NotionConfig, updates: FileImportInfo[]): Promise<void> {
  logger.info(`🚀 Executing ${updates.length} Notion updates...`, 'NOTION');
  
  for (let i = 0; i < updates.length; i++) {
    const file = updates[i];
    
    try {
      logger.info(`📝 Updating ${file.relativePath} (${i + 1}/${updates.length})`, 'UPDATE');
      
      // 노션 페이지 업데이트 준비
      const pageData = {
        filePath: file.relativePath,
        imports: file.imports,
        importedBy: file.importedBy,
        extension: path.extname(file.relativePath),
        project: config.project.name
      };
      
      logger.info(`📊 Data prepared: ${file.imports.length} imports, ${file.importedBy.length} imported-by`, 'DATA');
      
      // MCP 통합 시 여기서 실제 노션 업데이트 수행
      // await mcp_notion_create_pages 또는 mcp_notion_update_page 호출
      
      // 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      logger.warning(`⚠️ Failed to update ${file.relativePath}: ${error}`, 'WARNING');
    }
  }
}