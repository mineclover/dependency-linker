/**
 * 고도화된 의존성 분류 시스템
 * Enhanced Dependency Classification System
 */

import { DependencyInfo, DependencyMetadata } from './parserInterfaces';
import * as path from 'path';
import * as fs from 'fs';

export interface LibraryInfo {
  name: string;
  version?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'cargo' | 'go mod' | 'unknown';
  registryUrl?: string;
  description?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  category: 'Framework' | 'Library' | 'Utility' | 'Tool' | 'Type Definition' | 'Testing' | 'Build Tool';
  isDevDependency: boolean;
  bundleSize?: string;
}

export interface ClassifiedDependency extends DependencyInfo {
  classification: 'local' | 'library';
  libraryInfo?: LibraryInfo;
  resolvedPath?: string;
}

export interface PackageJsonInfo {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface CargoTomlInfo {
  dependencies?: Record<string, any>;
  'dev-dependencies'?: Record<string, any>;
  'build-dependencies'?: Record<string, any>;
}

export interface RequirementsTxtInfo {
  packages: Array<{
    name: string;
    version?: string;
    extras?: string[];
  }>;
}

export class DependencyClassifier {
  private packageInfo: PackageJsonInfo | null = null;
  private cargoInfo: CargoTomlInfo | null = null;
  private requirementsInfo: RequirementsTxtInfo | null = null;
  private projectRoot: string;

  constructor(projectPath?: string) {
    this.projectRoot = projectPath || process.cwd();
    this.loadPackageManifests();
  }

  /**
   * 패키지 매니페스트 파일들 로드
   */
  private loadPackageManifests(): void {
    try {
      // package.json 로드
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        this.packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      }

      // Cargo.toml 로드
      const cargoTomlPath = path.join(this.projectRoot, 'Cargo.toml');
      if (fs.existsSync(cargoTomlPath)) {
        // 간단한 TOML 파싱 (실제로는 toml 라이브러리 필요)
        const cargoContent = fs.readFileSync(cargoTomlPath, 'utf-8');
        this.parseCargoToml(cargoContent);
      }

      // requirements.txt 로드
      const requirementsPath = path.join(this.projectRoot, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirementsContent = fs.readFileSync(requirementsPath, 'utf-8');
        this.parseRequirementsTxt(requirementsContent);
      }

    } catch (error) {
      console.warn('Failed to load package manifests:', error);
    }
  }

  /**
   * Cargo.toml 간단 파싱
   */
  private parseCargoToml(content: string): void {
    try {
      // 간단한 정규식 기반 파싱 (실제로는 TOML 파서 사용 권장)
      const dependenciesMatch = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
      const devDependenciesMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?:\[|$)/);
      
      this.cargoInfo = {};
      
      if (dependenciesMatch) {
        this.cargoInfo.dependencies = this.parseTomlSection(dependenciesMatch[1]);
      }
      
      if (devDependenciesMatch) {
        this.cargoInfo['dev-dependencies'] = this.parseTomlSection(devDependenciesMatch[1]);
      }
    } catch (error) {
      console.warn('Failed to parse Cargo.toml:', error);
    }
  }

  /**
   * TOML 섹션 파싱 (간단 버전)
   */
  private parseTomlSection(section: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = section.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^(\w+)\s*=\s*"([^"]+)"/);
        if (match) {
          result[match[1]] = match[2];
        }
      }
    }
    
    return result;
  }

  /**
   * requirements.txt 파싱
   */
  private parseRequirementsTxt(content: string): void {
    try {
      const packages = content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
          const match = line.match(/^([a-zA-Z0-9\-_.]+)(?:([><=!~]+)([^;\s]+))?(?:\[([^\]]+)\])?/);
          if (match) {
            return {
              name: match[1],
              version: match[3],
              extras: match[4] ? match[4].split(',').map(e => e.trim()) : undefined
            };
          }
          return null;
        })
        .filter(Boolean);

      this.requirementsInfo = { packages: packages as any };
    } catch (error) {
      console.warn('Failed to parse requirements.txt:', error);
    }
  }

  /**
   * 의존성 분류 메인 함수
   */
  classifyDependencies(dependencies: DependencyInfo[]): ClassifiedDependency[] {
    return dependencies.map(dep => this.classifyDependency(dep));
  }

  /**
   * 개별 의존성 분류
   */
  private classifyDependency(dependency: DependencyInfo): ClassifiedDependency {
    const isLocal = this.isLocalDependency(dependency.source);
    
    if (isLocal) {
      return {
        ...dependency,
        classification: 'local',
        resolvedPath: this.resolveLocalPath(dependency.source)
      };
    } else {
      const libraryInfo = this.extractLibraryInfo(dependency.source);
      return {
        ...dependency,
        classification: 'library',
        libraryInfo
      };
    }
  }

  /**
   * 로컬 의존성 여부 판단
   */
  private isLocalDependency(source: string): boolean {
    // 상대경로로 시작하는 경우
    if (source.startsWith('./') || source.startsWith('../')) {
      return true;
    }

    // 절대경로로 시작하는 경우
    if (source.startsWith('/')) {
      return true;
    }

    // 파일 확장자가 있는 경우 (일반적으로 로컬 파일)
    if (source.includes('.') && (source.endsWith('.ts') || source.endsWith('.js') || 
        source.endsWith('.py') || source.endsWith('.rs') || source.endsWith('.go'))) {
      return true;
    }

    // 프로젝트 내부 모듈 패턴 감지
    const projectPatterns = [
      /^src\//,
      /^lib\//,
      /^components\//,
      /^utils\//,
      /^services\//,
      /^@\//, // Vue/Nuxt alias
      /^~\//, // 홈 디렉토리 alias
      /^\$lib/, // SvelteKit alias
    ];

    return projectPatterns.some(pattern => pattern.test(source));
  }

  /**
   * 로컬 경로 해결
   */
  private resolveLocalPath(source: string): string {
    try {
      if (path.isAbsolute(source)) {
        return source;
      }
      return path.resolve(this.projectRoot, source);
    } catch (error) {
      return source;
    }
  }

  /**
   * 라이브러리 정보 추출
   */
  private extractLibraryInfo(source: string): LibraryInfo {
    const packageName = this.extractPackageName(source);
    const packageManager = this.detectPackageManager();
    
    // package.json에서 정보 추출
    let version: string | undefined;
    let isDevDependency = false;
    
    if (this.packageInfo) {
      version = this.packageInfo.dependencies?.[packageName] ||
               this.packageInfo.devDependencies?.[packageName] ||
               this.packageInfo.peerDependencies?.[packageName];
      
      isDevDependency = !!this.packageInfo.devDependencies?.[packageName];
    }

    // Cargo.toml에서 정보 추출
    if (this.cargoInfo && !version) {
      version = this.cargoInfo.dependencies?.[packageName] ||
               this.cargoInfo['dev-dependencies']?.[packageName];
      
      isDevDependency = !!this.cargoInfo['dev-dependencies']?.[packageName];
    }

    // requirements.txt에서 정보 추출
    if (this.requirementsInfo && !version) {
      const pkg = this.requirementsInfo.packages.find(p => p.name === packageName);
      if (pkg) {
        version = pkg.version;
      }
    }

    const category = this.categorizeLibrary(packageName);
    const registryUrl = this.getRegistryUrl(packageName, packageManager);

    return {
      name: packageName,
      version,
      packageManager,
      registryUrl,
      category,
      isDevDependency
    };
  }

  /**
   * 패키지명 추출
   */
  private extractPackageName(source: string): string {
    // 스코프 패키지 처리 (@org/package)
    const scopeMatch = source.match(/^@[^/]+\/[^/]+/);
    if (scopeMatch) {
      return scopeMatch[0];
    }

    // 일반 패키지명 추출
    const parts = source.split('/');
    return parts[0];
  }

  /**
   * 패키지 매니저 감지
   */
  private detectPackageManager(): LibraryInfo['packageManager'] {
    if (fs.existsSync(path.join(this.projectRoot, 'bun.lockb'))) return 'bun';
    if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.projectRoot, 'package-lock.json'))) return 'npm';
    if (fs.existsSync(path.join(this.projectRoot, 'Cargo.lock'))) return 'cargo';
    if (fs.existsSync(path.join(this.projectRoot, 'go.mod'))) return 'go mod';
    if (fs.existsSync(path.join(this.projectRoot, 'requirements.txt'))) return 'pip';
    
    return 'unknown';
  }

  /**
   * 라이브러리 카테고리 분류
   */
  private categorizeLibrary(packageName: string): LibraryInfo['category'] {
    // 프레임워크
    const frameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby', 'express', 'fastapi', 'django', 'flask'];
    if (frameworks.some(fw => packageName.includes(fw))) {
      return 'Framework';
    }

    // 타입 정의
    if (packageName.startsWith('@types/')) {
      return 'Type Definition';
    }

    // 테스팅
    const testingTools = ['jest', 'mocha', 'chai', 'cypress', 'playwright', 'vitest', 'pytest', 'unittest'];
    if (testingTools.some(tool => packageName.includes(tool))) {
      return 'Testing';
    }

    // 빌드 도구
    const buildTools = ['webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'babel', 'tsc', 'cargo'];
    if (buildTools.some(tool => packageName.includes(tool))) {
      return 'Build Tool';
    }

    // 유틸리티
    const utilities = ['lodash', 'axios', 'moment', 'uuid', 'chalk', 'commander'];
    if (utilities.some(util => packageName.includes(util))) {
      return 'Utility';
    }

    // 도구
    const tools = ['eslint', 'prettier', 'husky', 'lint-staged', 'nodemon'];
    if (tools.some(tool => packageName.includes(tool))) {
      return 'Tool';
    }

    return 'Library';
  }

  /**
   * 레지스트리 URL 생성
   */
  private getRegistryUrl(packageName: string, packageManager: LibraryInfo['packageManager']): string | undefined {
    switch (packageManager) {
      case 'npm':
      case 'yarn':
      case 'pnpm':
      case 'bun':
        return `https://www.npmjs.com/package/${packageName}`;
      case 'pip':
        return `https://pypi.org/project/${packageName}`;
      case 'cargo':
        return `https://crates.io/crates/${packageName}`;
      case 'go mod':
        return `https://pkg.go.dev/${packageName}`;
      default:
        return undefined;
    }
  }

  /**
   * 통계 정보 생성
   */
  getClassificationStats(classifiedDeps: ClassifiedDependency[]): {
    total: number;
    local: number;
    libraries: number;
    byPackageManager: Record<string, number>;
    byCategory: Record<string, number>;
    devDependencies: number;
  } {
    const stats = {
      total: classifiedDeps.length,
      local: 0,
      libraries: 0,
      byPackageManager: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      devDependencies: 0
    };

    for (const dep of classifiedDeps) {
      if (dep.classification === 'local') {
        stats.local++;
      } else {
        stats.libraries++;
        
        if (dep.libraryInfo) {
          const pm = dep.libraryInfo.packageManager;
          stats.byPackageManager[pm] = (stats.byPackageManager[pm] || 0) + 1;
          
          const category = dep.libraryInfo.category;
          stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
          
          if (dep.libraryInfo.isDevDependency) {
            stats.devDependencies++;
          }
        }
      }
    }

    return stats;
  }
}

/**
 * 편의 함수: 의존성 분류
 */
export function classifyDependencies(
  dependencies: DependencyInfo[], 
  projectPath?: string
): ClassifiedDependency[] {
  const classifier = new DependencyClassifier(projectPath);
  return classifier.classifyDependencies(dependencies);
}

/**
 * 편의 함수: 분류 통계
 */
export function getClassificationStats(
  classifiedDeps: ClassifiedDependency[]
): ReturnType<DependencyClassifier['getClassificationStats']> {
  const classifier = new DependencyClassifier();
  return classifier.getClassificationStats(classifiedDeps);
}