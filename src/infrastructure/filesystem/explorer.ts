/**
 * File System Explorer - Infrastructure Layer
 * 파일 시스템 탐색 및 프로젝트 구조 분석을 담당하는 인프라스트럭처 컴포넌트
 */

import { glob } from 'glob';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import type { 
  DependencyNode, 
  DependencyGraph, 
  FileId, 
  RelativePath, 
  ProjectPath,
  FileSystemError 
} from '../../shared/types/index.js';
import { logger } from '../../shared/utils/index.js';

// 기본 무시 패턴
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.nyc_output/**',
  '**/tmp/**',
  '**/temp/**',
  '**/*.log',
  '**/.DS_Store',
  '**/Thumbs.db'
];

// 지원되는 파일 확장자
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.vue', '.svelte',
  '.py', '.java', '.go', '.rs',
  '.php', '.rb', '.cpp', '.c', '.h',
  '.css', '.scss', '.sass', '.less',
  '.html', '.xml', '.json', '.yaml', '.yml',
  '.md', '.txt', '.sql'
];

// 텍스트 파일 확장자
const TEXT_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  '.py', '.java', '.go', '.rs', '.php', '.rb',
  '.cpp', '.c', '.h', '.css', '.scss', '.sass',
  '.less', '.html', '.xml', '.json', '.yaml',
  '.yml', '.md', '.txt', '.sql'
];

// 레거시 호환성을 위한 타입
interface LegacyProjectFile {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: Date;
  content?: string;
  existingNotionId?: string;
  notionId?: string;
  trackingId?: string;
}

interface LegacyProjectStructure {
  rootPath: string;
  files: LegacyProjectFile[];
  dependencies: Record<string, any>;
  packageJson?: any;
  tsConfig?: any;
}

interface ExploreOptions {
  includeDependencies?: boolean;
  maxFileSize?: number;
  customIgnorePatterns?: string[];
  extensions?: string[];
  ignorePatterns?: string[];
}

/**
 * 파일 시스템 탐색기
 */
export class FileSystemExplorer {
  private rootPath: ProjectPath;
  private idTracker?: any; // 레거시 의존성

  constructor(rootPath: ProjectPath) {
    this.rootPath = rootPath;
    this.initializeLegacyTracker();
  }

  /**
   * 레거시 의존성 초기화
   */
  private async initializeLegacyTracker(): Promise<void> {
    try {
      // Legacy tracker disabled for Clean Architecture compliance
      // DependencyNotionIdTracker functionality will be replaced by modern tracking system
      logger.info('Using modern file tracking system instead of legacy tracker', '🏗️');
      this.idTracker = null; // Using modern architecture patterns
    } catch (error) {
      logger.warning(`레거시 ID 트래커 로딩 실패: ${error}`);
    }
  }

  /**
   * 프로젝트 탐색
   */
  async exploreProject(options: ExploreOptions = {}): Promise<LegacyProjectStructure> {
    const {
      includeDependencies = false,
      maxFileSize = 1024 * 1024, // 1MB 기본값
      customIgnorePatterns = [],
      extensions = ['.ts', '.js', '.tsx', '.jsx'],
      ignorePatterns = []
    } = options;

    logger.info(`프로젝트 탐색 시작: ${this.rootPath}`, '🔍');

    // 무시 패턴 생성
    const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...customIgnorePatterns, ...ignorePatterns];
    
    // 모든 파일 검색
    const pattern = '**/*';
    const files = await glob(pattern, {
      cwd: this.rootPath,
      ignore: allIgnorePatterns,
      nodir: true
    });

    logger.info(`${files.length}개 파일 발견`, '📁');

    // 파일 처리
    const projectFiles: LegacyProjectFile[] = [];
    
    for (const file of files) {
      const fullPath = path.join(this.rootPath, file);
      const ext = path.extname(file);
      
      // 지원되지 않는 파일 형식 건너뛰기
      if (!extensions.includes(ext)) {
        continue;
      }

      try {
        const stats = await stat(fullPath);
        
        // 너무 큰 파일 건너뛰기
        if (stats.size > maxFileSize) {
          logger.warning(`큰 파일 건너뛰기: ${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          continue;
        }

        const projectFile: LegacyProjectFile = {
          path: fullPath,
          relativePath: file,
          size: stats.size,
          extension: ext,
          lastModified: stats.mtime
        };

        // 텍스트 파일의 내용 읽기
        if (this.isTextFile(ext)) {
          try {
            projectFile.content = await readFile(fullPath, 'utf-8');
          } catch (error) {
            logger.warning(`파일 읽기 실패: ${file}`);
          }
        }

        projectFiles.push(projectFile);
      } catch (error) {
        logger.warning(`파일 처리 오류: ${file} - ${error}`);
      }
    }

    logger.success(`${projectFiles.length}개 파일 처리 완료`);

    // package.json 로드
    let packageJson;
    try {
      const packagePath = path.join(this.rootPath, 'package.json');
      const packageContent = await readFile(packagePath, 'utf-8');
      packageJson = JSON.parse(packageContent);
    } catch {
      // package.json이 없거나 유효하지 않음
    }

    // tsconfig.json 로드
    let tsConfig;
    try {
      const tsconfigPath = path.join(this.rootPath, 'tsconfig.json');
      const tsconfigContent = await readFile(tsconfigPath, 'utf-8');
      tsConfig = JSON.parse(tsconfigContent);
    } catch {
      // tsconfig.json이 없거나 유효하지 않음
    }

    // 의존성 분석 (요청된 경우)
    let dependencies: Record<string, any> = {};
    if (includeDependencies) {
      logger.info('의존성 분석 중...', '🔗');
      dependencies = await this.analyzeDependencies(projectFiles);
    }

    return {
      rootPath: this.rootPath,
      files: projectFiles,
      dependencies,
      packageJson,
      tsConfig
    };
  }

  /**
   * 텍스트 파일 여부 확인
   */
  private isTextFile(extension: string): boolean {
    return TEXT_EXTENSIONS.includes(extension);
  }

  /**
   * 의존성 분석
   */
  private async analyzeDependencies(files: LegacyProjectFile[]): Promise<Record<string, any>> {
    const graph: Record<string, any> = {};

    for (const file of files) {
      if (!file.content) continue;

      const analysis = this.analyzeFileImports(file.content, file.extension);
      if (analysis.imports.length > 0 || analysis.exports.length > 0) {
        graph[file.relativePath] = {
          ...analysis,
          importedBy: [], // 아래에서 채워짐
          notionIds: [] // Notion ID가 있을 때 채워짐
        };
      }
    }

    // 역방향 의존성 매핑 구축 (누가 이 파일을 import하는지)
    for (const [filePath, deps] of Object.entries(graph)) {
      for (const importPath of deps.imports) {
        // 상대 import를 실제 파일 경로로 해결
        const resolvedPath = this.resolveImportPath(importPath, filePath, files);
        if (resolvedPath && graph[resolvedPath]) {
          graph[resolvedPath].importedBy.push(filePath);
        }
      }
    }

    return graph;
  }

  /**
   * 파일 import 분석
   */
  private analyzeFileImports(content: string, extension: string): {
    imports: string[];
    exports: string[];
    dependencies: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
      // JavaScript/TypeScript import 패턴
      const importRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      const exportRegex = /export\s+(?:\*\s+from\s+['"]([^'"]+)['"]|(?:default\s+)?(?:class|function|const|let|var)\s+([^=\s]+))/g;
      
      let match;
      
      // import 찾기
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      // export 찾기
      while ((match = exportRegex.exec(content)) !== null) {
        if (match[1]) exports.push(match[1]); // export from
        if (match[2]) exports.push(match[2]); // named export
      }
    }

    // 외부 의존성과 로컬 파일 필터링
    const dependencies = imports.filter(imp => 
      !imp.startsWith('.') && !imp.startsWith('/')
    );

    return {
      imports,
      exports,
      dependencies
    };
  }

  /**
   * import 경로 해결
   */
  private resolveImportPath(importPath: string, fromFile: string, files: LegacyProjectFile[]): string | null {
    // 외부 의존성 건너뛰기 (./ 또는 ../ 없는 것들)
    if (!importPath.startsWith('.')) {
      return null;
    }

    try {
      const fromDir = path.dirname(fromFile);
      const resolvedPath = path.resolve(fromDir, importPath);
      const relativePath = path.relative(this.rootPath, resolvedPath);

      // 정확한 매치 먼저 시도
      const exactMatch = files.find(f => f.relativePath === relativePath);
      if (exactMatch) return exactMatch.relativePath;

      // 일반적인 확장자로 시도
      const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
      for (const ext of extensions) {
        const withExt = relativePath + ext;
        const match = files.find(f => f.relativePath === withExt);
        if (match) return match.relativePath;
      }

      // index 파일 시도
      for (const ext of extensions) {
        const indexFile = path.join(relativePath, `index${ext}`);
        const match = files.find(f => f.relativePath === indexFile);
        if (match) return match.relativePath;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 모든 Notion ID 추출 (유틸리티 메서드)
   */
  extractAllNotionIds(files: LegacyProjectFile[]): Map<string, LegacyProjectFile> {
    const notionIdMap = new Map<string, LegacyProjectFile>();

    for (const file of files) {
      if (file.existingNotionId) {
        notionIdMap.set(file.existingNotionId, file);
      }
      
      if (file.content && this.idTracker) {
        const ids = this.idTracker.getAllTrackingIds(file.content);
        for (const id of ids) {
          if (!notionIdMap.has(id)) {
            notionIdMap.set(id, file);
          }
        }
      }
    }

    return notionIdMap;
  }

  /**
   * 소스 파일 패턴 검색
   */
  async getSourceFiles(patterns: string[] = ['src/**/*.{ts,js,tsx,jsx}']): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.rootPath,
          absolute: true,
          nodir: true
        });
        allFiles.push(...matches);
      } catch (error) {
        logger.error(`패턴 매칭 실패: ${pattern} - ${error}`);
      }
    }

    // 중복 제거
    const uniqueFiles = [...new Set(allFiles)];
    
    logger.info(`${uniqueFiles.length}개 소스 파일 발견`);
    return uniqueFiles;
  }

  /**
   * 단일 파일 정보 가져오기
   */
  async getFileInfo(filePath: string): Promise<{
    path: string;
    relativePath: string;
    size: number;
    extension: string;
    lastModified: Date;
  }> {
    try {
      const stats = await stat(filePath);
      const relativePath = path.relative(this.rootPath, filePath);
      const extension = path.extname(filePath);

      return {
        path: filePath,
        relativePath,
        size: stats.size,
        extension,
        lastModified: stats.mtime
      };
    } catch (error) {
      throw new FileSystemError(`파일 정보 가져오기 실패: ${filePath} - ${error}`);
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 파일 내용 읽기 (텍스트 파일만)
   */
  async readFileContent(filePath: string): Promise<string | null> {
    try {
      const extension = path.extname(filePath);
      if (!this.isTextFile(extension)) {
        return null;
      }
      
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`파일 읽기 실패: ${filePath} - ${error}`);
      return null;
    }
  }
}

// 레거시 호환성을 위한 export
export class FileExplorer extends FileSystemExplorer {
  constructor(rootPath: string) {
    super(rootPath);
  }
}

// 레거시 호환성을 위한 함수 export
export function createFileExplorer(rootPath: string): FileSystemExplorer {
  return new FileSystemExplorer(rootPath);
}