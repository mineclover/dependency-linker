/**
 * Dependency Analyzer - Infrastructure Layer
 * Import 구문 수집 및 파일 간 의존성 분석을 담당하는 인프라스트럭처 컴포넌트
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import type { 
  DependencyNode, 
  DependencyGraph, 
  DependencyType, 
  FileId, 
  ProjectPath,
  FileSystemError 
} from '../../shared/types/index.js';
import { logger } from '../../shared/utils/index.js';

export interface ImportStatement {
  type: 'import' | 'require' | 'dynamic';
  source: string;
  specifiers: ImportSpecifier[];
  line: number;
  raw: string;
}

export interface ImportSpecifier {
  type: 'default' | 'named' | 'namespace';
  imported?: string;
  local: string;
}

export interface FileDependency {
  sourceFile: string;
  targetFile: string;
  importType: string;
  specifiers: ImportSpecifier[];
  resolved: boolean;
  line: number;
}

export interface LegacyDependencyGraph {
  files: Map<string, FileNode>;
  dependencies: FileDependency[];
}

export interface FileNode {
  filePath: string;
  imports: ImportStatement[];
  exports: ExportStatement[];
  notionId?: string;
  lastModified: Date;
}

export interface ExportStatement {
  type: 'default' | 'named' | 'namespace';
  name?: string;
  line: number;
  raw: string;
}

/**
 * 의존성 분석기
 */
export class DependencyAnalyzer {
  private projectRoot: ProjectPath;
  private fileExtensions: string[];
  private dependencyGraph: LegacyDependencyGraph;

  constructor(projectRoot: ProjectPath, fileExtensions: string[] = ['.ts', '.tsx', '.js', '.jsx']) {
    this.projectRoot = path.resolve(projectRoot);
    this.fileExtensions = fileExtensions;
    this.dependencyGraph = {
      files: new Map(),
      dependencies: []
    };
  }

  /**
   * 프로젝트 전체 의존성 분석
   */
  async analyzeProject(): Promise<LegacyDependencyGraph> {
    try {
      logger.info('프로젝트 의존성 분석 시작', '🔍');
      
      const files = await this.discoverFiles();
      logger.info(`${files.length}개 파일 발견`);
      
      // 1단계: 모든 파일의 import/export 구문 수집
      for (const filePath of files) {
        await this.analyzeFile(filePath);
      }

      // 2단계: 의존성 관계 해결
      await this.resolveDependencies();

      logger.success(`의존성 분석 완료: ${this.dependencyGraph.files.size}개 파일, ${this.dependencyGraph.dependencies.length}개 의존성`);
      return this.dependencyGraph;
      
    } catch (error) {
      logger.error(`프로젝트 의존성 분석 실패: ${error}`);
      throw new FileSystemError(`프로젝트 의존성 분석 실패: ${error}`);
    }
  }

  /**
   * 단일 파일 분석
   */
  async analyzeFile(filePath: string): Promise<FileNode> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);

      const fileNode: FileNode = {
        filePath,
        imports,
        exports,
        lastModified: stats.mtime
      };

      this.dependencyGraph.files.set(filePath, fileNode);
      
      logger.debug(`파일 분석 완료: ${path.relative(this.projectRoot, filePath)} (${imports.length} imports, ${exports.length} exports)`);
      return fileNode;
      
    } catch (error) {
      logger.error(`파일 분석 실패: ${filePath} - ${error}`);
      throw new FileSystemError(`파일 분석 실패: ${filePath} - ${error}`);
    }
  }

  /**
   * Import 구문 추출
   */
  private extractImports(content: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const lines = content.split('\n');

    // ES6 import 패턴들
    const importPatterns = [
      // import { named } from 'module'
      /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/gm,
      // import defaultName from 'module'  
      /^import\s+(\w+)\s*from\s*['"`]([^'"`]+)['"`]/gm,
      // import * as name from 'module'
      /^import\s*\*\s*as\s+(\w+)\s*from\s*['"`]([^'"`]+)['"`]/gm,
      // import 'module' (side effect)
      /^import\s*['"`]([^'"`]+)['"`]/gm,
      // import defaultName, { named } from 'module'
      /^import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/gm
    ];

    // require() 패턴들
    const requirePatterns = [
      // const name = require('module')
      /const\s+(\w+)\s*=\s*require\(['"`]([^'"`]+)['"`]\)/g,
      // const { named } = require('module')
      /const\s*\{\s*([^}]+)\s*\}\s*=\s*require\(['"`]([^'"`]+)['"`]\)/g
    ];

    // 동적 import 패턴
    const dynamicImportPattern = /import\(['"`]([^'"`]+)['"`]\)/g;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return; // 주석 제외
      }

      // ES6 imports 처리
      this.processImportPatterns(importPatterns, line, lineNumber, 'import', imports);
      
      // CommonJS requires 처리
      this.processImportPatterns(requirePatterns, line, lineNumber, 'require', imports);
      
      // Dynamic imports 처리
      let match;
      while ((match = dynamicImportPattern.exec(line)) !== null) {
        imports.push({
          type: 'dynamic',
          source: match[1],
          specifiers: [],
          line: lineNumber,
          raw: match[0]
        });
      }
    });

    return imports;
  }

  private processImportPatterns(
    patterns: RegExp[], 
    line: string, 
    lineNumber: number, 
    type: 'import' | 'require', 
    imports: ImportStatement[]
  ): void {
    patterns.forEach(pattern => {
      pattern.lastIndex = 0; // reset regex
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const importStatement = this.parseImportMatch(match, type, lineNumber, line);
        if (importStatement) {
          imports.push(importStatement);
        }
      }
    });
  }

  private parseImportMatch(
    match: RegExpExecArray, 
    type: 'import' | 'require', 
    lineNumber: number, 
    rawLine: string
  ): ImportStatement | null {
    const specifiers: ImportSpecifier[] = [];
    let source: string;

    if (match.length === 2) {
      // Side effect import or simple require
      source = match[1];
    } else if (match.length === 3) {
      // Default import, namespace import, or named imports
      const importPart = match[1];
      source = match[2];

      if (importPart.includes(',') || importPart.includes('{')) {
        // Named imports
        const namedImports = importPart.replace(/[{}]/g, '').split(',');
        namedImports.forEach(imp => {
          const [imported, local] = imp.trim().split(' as ');
          specifiers.push({
            type: 'named',
            imported: imported?.trim(),
            local: (local || imported)?.trim()
          });
        });
      } else if (importPart.includes('*')) {
        // Namespace import
        const namespaceMatch = importPart.match(/\*\s*as\s+(\w+)/);
        if (namespaceMatch) {
          specifiers.push({
            type: 'namespace',
            local: namespaceMatch[1]
          });
        }
      } else {
        // Default import
        specifiers.push({
          type: 'default',
          local: importPart.trim()
        });
      }
    } else if (match.length === 4) {
      // Default + named imports
      const defaultName = match[1];
      const namedPart = match[2];
      source = match[3];

      // Default import
      specifiers.push({
        type: 'default',
        local: defaultName.trim()
      });

      // Named imports
      const namedImports = namedPart.split(',');
      namedImports.forEach(imp => {
        const [imported, local] = imp.trim().split(' as ');
        specifiers.push({
          type: 'named',
          imported: imported?.trim(),
          local: (local || imported)?.trim()
        });
      });
    } else {
      return null;
    }

    return {
      type,
      source,
      specifiers,
      line: lineNumber,
      raw: rawLine.trim()
    };
  }

  /**
   * Export 구문 추출
   */
  private extractExports(content: string): ExportStatement[] {
    const exports: ExportStatement[] = [];
    const lines = content.split('\n');

    const exportPatterns = [
      // export default
      /^export\s+default\s+(.+)/,
      // export { named }
      /^export\s*\{\s*([^}]+)\s*\}/,
      // export const/function/class
      /^export\s+(const|function|class|interface|type)\s+(\w+)/,
      // export * from 'module'
      /^export\s*\*\s*from\s*['"`]([^'"`]+)['"`]/
    ];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return;
      }

      exportPatterns.forEach(pattern => {
        const match = pattern.exec(trimmedLine);
        if (match) {
          let type: 'default' | 'named' | 'namespace' = 'named';
          let name: string | undefined;

          if (match[0].includes('default')) {
            type = 'default';
            name = 'default';
          } else if (match[0].includes('*')) {
            type = 'namespace';
            name = '*';
          } else if (match[2]) {
            name = match[2];
          } else if (match[1]) {
            // Named exports in braces
            name = match[1];
          }

          exports.push({
            type,
            name,
            line: lineNumber,
            raw: trimmedLine
          });
        }
      });
    });

    return exports;
  }

  /**
   * 의존성 관계 해결
   */
  private async resolveDependencies(): Promise<void> {
    for (const [filePath, fileNode] of this.dependencyGraph.files) {
      for (const importStmt of fileNode.imports) {
        const resolvedPath = await this.resolveImportPath(filePath, importStmt.source);
        
        if (resolvedPath && this.dependencyGraph.files.has(resolvedPath)) {
          const dependency: FileDependency = {
            sourceFile: filePath,
            targetFile: resolvedPath,
            importType: importStmt.type,
            specifiers: importStmt.specifiers,
            resolved: true,
            line: importStmt.line
          };
          
          this.dependencyGraph.dependencies.push(dependency);
        } else {
          // 외부 모듈이거나 해결되지 않은 경로
          const dependency: FileDependency = {
            sourceFile: filePath,
            targetFile: importStmt.source,
            importType: importStmt.type,
            specifiers: importStmt.specifiers,
            resolved: false,
            line: importStmt.line
          };
          
          this.dependencyGraph.dependencies.push(dependency);
        }
      }
    }
  }

  /**
   * Import 경로 해결
   */
  private async resolveImportPath(fromFile: string, importPath: string): Promise<string | null> {
    // 절대 경로가 아닌 경우 (상대 경로 또는 모듈명)
    if (!importPath.startsWith('.')) {
      // 외부 모듈은 null 반환 (node_modules 등)
      return null;
    }

    const fromDir = path.dirname(fromFile);
    const possiblePaths = [
      path.resolve(fromDir, importPath),
      path.resolve(fromDir, importPath + '.ts'),
      path.resolve(fromDir, importPath + '.tsx'),
      path.resolve(fromDir, importPath + '.js'),
      path.resolve(fromDir, importPath + '.jsx'),
      path.resolve(fromDir, importPath, 'index.ts'),
      path.resolve(fromDir, importPath, 'index.tsx'),
      path.resolve(fromDir, importPath, 'index.js'),
      path.resolve(fromDir, importPath, 'index.jsx')
    ];

    for (const possiblePath of possiblePaths) {
      try {
        const stats = await fs.stat(possiblePath);
        if (stats.isFile()) {
          return possiblePath;
        }
      } catch (error) {
        // 파일이 존재하지 않음, 다음 경로 시도
      }
    }

    return null;
  }

  /**
   * 파일 탐색
   */
  private async discoverFiles(): Promise<string[]> {
    const patterns = this.fileExtensions.map(ext => 
      path.join(this.projectRoot, `**/*${ext}`)
    );

    const files: string[] = [];
    for (const pattern of patterns) {
      try {
        const foundFiles = await glob(pattern, {
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
        });
        files.push(...foundFiles);
      } catch (error) {
        logger.error(`파일 탐색 실패: ${pattern} - ${error}`);
      }
    }

    return [...new Set(files)]; // 중복 제거
  }

  /**
   * 특정 파일의 의존성 트리 생성
   */
  getDependencyTree(filePath: string, depth: number = 10): any {
    const visited = new Set<string>();
    
    const buildTree = (currentFile: string, currentDepth: number): any => {
      if (currentDepth <= 0 || visited.has(currentFile)) {
        return null;
      }

      visited.add(currentFile);
      const fileNode = this.dependencyGraph.files.get(currentFile);
      if (!fileNode) return null;

      const dependencies = this.dependencyGraph.dependencies
        .filter(dep => dep.sourceFile === currentFile && dep.resolved)
        .map(dep => buildTree(dep.targetFile, currentDepth - 1))
        .filter(tree => tree !== null);

      return {
        file: currentFile,
        imports: fileNode.imports.length,
        exports: fileNode.exports.length,
        dependencies
      };
    };

    return buildTree(filePath, depth);
  }

  /**
   * 의존성 통계 생성
   */
  getStatistics(): {
    totalFiles: number;
    totalDependencies: number;
    resolvedDependencies: number;
    externalDependencies: number;
    mostImportedFiles: Array<{ file: string; imports: number }>;
    averageImportsPerFile: string;
  } {
    const totalFiles = this.dependencyGraph.files.size;
    const totalDependencies = this.dependencyGraph.dependencies.length;
    const resolvedDependencies = this.dependencyGraph.dependencies.filter(d => d.resolved).length;
    const externalDependencies = totalDependencies - resolvedDependencies;

    const filesByImportCount = Array.from(this.dependencyGraph.files.values())
      .map(f => ({ 
        file: path.relative(this.projectRoot, f.filePath), 
        imports: f.imports.length 
      }))
      .sort((a, b) => b.imports - a.imports);

    return {
      totalFiles,
      totalDependencies,
      resolvedDependencies,
      externalDependencies,
      mostImportedFiles: filesByImportCount.slice(0, 10),
      averageImportsPerFile: totalFiles > 0 ? (totalDependencies / totalFiles).toFixed(2) : '0'
    };
  }

  /**
   * 새로운 아키텍처 타입으로 변환 (미래 호환성)
   */
  convertToNewFormat(): DependencyGraph {
    const nodes = new Map<FileId, DependencyNode>();
    const edges: Array<{ from: FileId; to: FileId; type: DependencyType }> = [];

    // 파일 노드 변환
    for (const [filePath, fileNode] of this.dependencyGraph.files) {
      const relativePath = path.relative(this.projectRoot, filePath);
      nodes.set(relativePath, {
        id: relativePath,
        path: relativePath,
        type: 'file',
        dependencies: [],
        dependents: []
      });
    }

    // 의존성 엣지 변환
    for (const dep of this.dependencyGraph.dependencies) {
      if (dep.resolved) {
        const fromPath = path.relative(this.projectRoot, dep.sourceFile);
        const toPath = path.relative(this.projectRoot, dep.targetFile);
        
        edges.push({
          from: fromPath,
          to: toPath,
          type: dep.importType as DependencyType
        });

        // 노드 의존성 업데이트
        const fromNode = nodes.get(fromPath);
        const toNode = nodes.get(toPath);
        
        if (fromNode && toNode) {
          if (!fromNode.dependencies.includes(toPath)) {
            fromNode.dependencies.push(toPath);
          }
          if (!toNode.dependents.includes(fromPath)) {
            toNode.dependents.push(fromPath);
          }
        }
      }
    }

    return { nodes, edges };
  }
}

// 레거시 호환성을 위한 함수 export
export function createDependencyAnalyzer(
  projectRoot: string, 
  fileExtensions?: string[]
): DependencyAnalyzer {
  return new DependencyAnalyzer(projectRoot, fileExtensions);
}