#!/usr/bin/env npx tsx

/**
 * Dependency Analyzer
 * 특정 파일을 시작점으로 의존성이 있는 모든 파일들을 추적하고 리스트업
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface DependencyInfo {
  filePath: string;
  relativePath: string;
  dependencies: string[];
  dependents: string[];
  depth: number;
  type: 'import' | 'type-import' | 'require' | 'dynamic-import';
}

interface AnalysisResult {
  rootFile: string;
  totalFiles: number;
  maxDepth: number;
  dependencies: Map<string, DependencyInfo>;
  dependencyTree: string[];
  circularDependencies: string[][];
}

class DependencyAnalyzer {
  private projectRoot: string;
  private visited = new Set<string>();
  private analyzing = new Set<string>();
  private dependencies = new Map<string, DependencyInfo>();

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * 특정 파일의 모든 의존성을 분석
   */
  async analyzeDependencies(startFile: string): Promise<AnalysisResult> {
    console.log(`🔍 분석 시작: ${startFile}`);

    const resolvedStartFile = path.resolve(this.projectRoot, startFile);

    if (!fs.existsSync(resolvedStartFile)) {
      throw new Error(`파일을 찾을 수 없습니다: ${startFile}`);
    }

    // 초기화
    this.visited.clear();
    this.analyzing.clear();
    this.dependencies.clear();

    // 의존성 추적 시작
    await this.traceFile(resolvedStartFile, 0);

    // 역의존성 계산
    this.calculateReverseDependencies();

    // 순환 의존성 검사
    const circularDependencies = this.findCircularDependencies();

    // 의존성 트리 생성
    const dependencyTree = this.buildDependencyTree(resolvedStartFile);

    return {
      rootFile: startFile,
      totalFiles: this.dependencies.size,
      maxDepth: Math.max(...Array.from(this.dependencies.values()).map(d => d.depth)),
      dependencies: this.dependencies,
      dependencyTree,
      circularDependencies
    };
  }

  /**
   * 파일의 의존성을 추적
   */
  private async traceFile(filePath: string, depth: number): Promise<void> {
    const relativePath = path.relative(this.projectRoot, filePath);

    if (this.visited.has(filePath)) {
      return;
    }

    if (this.analyzing.has(filePath)) {
      // 순환 의존성 감지
      console.warn(`⚠️  순환 의존성 감지: ${relativePath}`);
      return;
    }

    this.analyzing.add(filePath);

    console.log(`${'  '.repeat(depth)}📁 분석 중: ${relativePath}`);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const imports = this.extractImports(content, filePath);

      const dependencyInfo: DependencyInfo = {
        filePath,
        relativePath,
        dependencies: [],
        dependents: [],
        depth,
        type: 'import'
      };

      // Import된 파일들을 재귀적으로 분석
      for (const importPath of imports) {
        try {
          const resolvedImport = await this.resolveImport(importPath, filePath);
          if (resolvedImport && this.isProjectFile(resolvedImport)) {
            dependencyInfo.dependencies.push(resolvedImport);
            await this.traceFile(resolvedImport, depth + 1);
          }
        } catch (error) {
          console.warn(`⚠️  의존성 해석 실패: ${importPath} in ${relativePath}`);
        }
      }

      this.dependencies.set(filePath, dependencyInfo);
      this.visited.add(filePath);

    } catch (error) {
      console.error(`❌ 파일 읽기 실패: ${relativePath}`, error);
    } finally {
      this.analyzing.delete(filePath);
    }
  }

  /**
   * Import 구문 추출
   */
  private extractImports(content: string, filePath: string): string[] {
    const imports: string[] = [];

    // ES6 import 구문
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g;

    // CommonJS require 구문
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    // Dynamic import
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    // Type-only import
    const typeImportRegex = /import\s+type\s+(?:\{[^}]*\}|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;

    let match;

    // ES6 imports
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS requires
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Dynamic imports
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Type imports
    while ((match = typeImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // 중복 제거
  }

  /**
   * Import 경로를 실제 파일 경로로 해석
   */
  private async resolveImport(importPath: string, fromFile: string): Promise<string | null> {
    // 절대 경로나 node_modules는 무시
    if (importPath.startsWith('node:') || !importPath.startsWith('.')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'];

    // 상대 경로 해석
    let resolvedPath = path.resolve(fromDir, importPath);

    // 확장자가 없는 경우 시도
    if (!path.extname(resolvedPath)) {
      for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // index 파일 확인
      for (const ext of extensions) {
        const indexFile = path.join(resolvedPath, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    } else if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    return null;
  }

  /**
   * 프로젝트 내 파일인지 확인
   */
  private isProjectFile(filePath: string): boolean {
    const relative = path.relative(this.projectRoot, filePath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * 역의존성 계산
   */
  private calculateReverseDependencies(): void {
    for (const [filePath, info] of this.dependencies) {
      for (const dep of info.dependencies) {
        const depInfo = this.dependencies.get(dep);
        if (depInfo) {
          depInfo.dependents.push(filePath);
        }
      }
    }
  }

  /**
   * 순환 의존성 찾기
   */
  private findCircularDependencies(): string[][] {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (filePath: string, path: string[]): void => {
      if (stack.has(filePath)) {
        // 순환 의존성 발견
        const cycleStart = path.indexOf(filePath);
        cycles.push(path.slice(cycleStart).concat(filePath));
        return;
      }

      if (visited.has(filePath)) {
        return;
      }

      visited.add(filePath);
      stack.add(filePath);

      const info = this.dependencies.get(filePath);
      if (info) {
        for (const dep of info.dependencies) {
          dfs(dep, [...path, filePath]);
        }
      }

      stack.delete(filePath);
    };

    for (const filePath of this.dependencies.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    return cycles;
  }

  /**
   * 의존성 트리 구조 생성
   */
  private buildDependencyTree(startFile: string): string[] {
    const tree: string[] = [];
    const visited = new Set<string>();

    const buildTree = (filePath: string, depth: number): void => {
      if (visited.has(filePath)) {
        return;
      }
      visited.add(filePath);

      const relativePath = path.relative(this.projectRoot, filePath);
      const indent = '  '.repeat(depth);
      const info = this.dependencies.get(filePath);

      tree.push(`${indent}📄 ${relativePath} (의존성: ${info?.dependencies.length || 0}개)`);

      if (info) {
        for (const dep of info.dependencies) {
          buildTree(dep, depth + 1);
        }
      }
    };

    buildTree(startFile, 0);
    return tree;
  }

  /**
   * 결과를 보기 좋게 출력
   */
  printResults(result: AnalysisResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 의존성 분석 결과: ${result.rootFile}`);
    console.log('='.repeat(60));
    console.log(`📁 총 파일 수: ${result.totalFiles}개`);
    console.log(`📈 최대 깊이: ${result.maxDepth}`);
    console.log(`🔄 순환 의존성: ${result.circularDependencies.length}개`);

    console.log('\n📋 의존성 트리:');
    console.log('-'.repeat(40));
    result.dependencyTree.forEach(line => console.log(line));

    if (result.circularDependencies.length > 0) {
      console.log('\n⚠️  순환 의존성:');
      console.log('-'.repeat(40));
      result.circularDependencies.forEach((cycle, i) => {
        console.log(`${i + 1}. ${cycle.map(f => path.relative(this.projectRoot, f)).join(' → ')}`);
      });
    }

    console.log('\n📊 파일별 상세 정보:');
    console.log('-'.repeat(40));

    // 의존성 수 기준으로 정렬
    const sortedFiles = Array.from(result.dependencies.values())
      .sort((a, b) => b.dependencies.length - a.dependencies.length);

    sortedFiles.forEach(info => {
      console.log(`📄 ${info.relativePath}`);
      console.log(`  📤 의존하는 파일: ${info.dependencies.length}개`);
      console.log(`  📥 의존받는 파일: ${info.dependents.length}개`);
      console.log(`  📊 깊이: ${info.depth}`);

      if (info.dependencies.length > 0) {
        console.log(`  └─ 의존성: ${info.dependencies.map(d => path.relative(this.projectRoot, d)).join(', ')}`);
      }

      if (info.dependents.length > 0) {
        console.log(`  └─ 의존받음: ${info.dependents.map(d => path.relative(this.projectRoot, d)).join(', ')}`);
      }
      console.log('');
    });
  }

  /**
   * JSON으로 결과 저장
   */
  async saveResultsToFile(result: AnalysisResult, outputFile: string): Promise<void> {
    const jsonResult = {
      rootFile: result.rootFile,
      totalFiles: result.totalFiles,
      maxDepth: result.maxDepth,
      dependencies: Object.fromEntries(
        Array.from(result.dependencies.entries()).map(([key, value]) => [
          path.relative(this.projectRoot, key),
          {
            ...value,
            filePath: path.relative(this.projectRoot, value.filePath),
            dependencies: value.dependencies.map(d => path.relative(this.projectRoot, d)),
            dependents: value.dependents.map(d => path.relative(this.projectRoot, d))
          }
        ])
      ),
      dependencyTree: result.dependencyTree,
      circularDependencies: result.circularDependencies.map(cycle =>
        cycle.map(f => path.relative(this.projectRoot, f))
      )
    };

    await fs.promises.writeFile(outputFile, JSON.stringify(jsonResult, null, 2));
    console.log(`💾 결과가 저장되었습니다: ${outputFile}`);
  }
}

// 실행 부분
async function main() {
  const analyzer = new DependencyAnalyzer();

  // 분석할 파일 (AnalysisEngine을 예시로)
  const targetFile = 'src/services/AnalysisEngine.ts';

  try {
    console.log('🚀 의존성 분석 시작...\n');

    const result = await analyzer.analyzeDependencies(targetFile);

    analyzer.printResults(result);

    // JSON 파일로 저장
    await analyzer.saveResultsToFile(result, 'dependency-analysis-result.json');

  } catch (error) {
    console.error('❌ 분석 실패:', error);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main();
}

export { DependencyAnalyzer, type AnalysisResult, type DependencyInfo };