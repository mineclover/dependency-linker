/**
 * Enhanced Alias Resolver
 * TypeScript path mapping and module resolution with tsconfig.json support
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve, dirname, extname, isAbsolute, relative } from 'path';
import { logger } from './index.js';

export interface TsConfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export interface TsConfig {
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
    rootDirs?: string[];
    moduleResolution?: string;
    allowSyntheticDefaultImports?: boolean;
    esModuleInterop?: boolean;
  };
  include?: string[];
  exclude?: string[];
  extends?: string;
}

export interface ResolvedModule {
  /** 해결된 파일 경로 */
  resolvedPath: string;
  /** 원본 import 경로 */
  originalPath: string;
  /** 해결 방법 */
  resolveMethod: 'relative' | 'absolute' | 'tsconfig-paths' | 'node-modules' | 'builtin';
  /** 사용된 확장자 */
  extension?: string;
  /** tsconfig 별칭 매핑 정보 */
  aliasMatch?: {
    pattern: string;
    replacement: string;
  };
}

export interface ResolverOptions {
  /** 지원할 파일 확장자들 */
  extensions?: string[];
  /** 프로젝트 루트 디렉토리 */
  projectRoot?: string;
  /** tsconfig.json 파일 경로 */
  tsconfigPath?: string;
  /** Node.js 모듈 해결 활성화 */
  enableNodeResolution?: boolean;
  /** 캐싱 활성화 */
  enableCaching?: boolean;
}

/**
 * 향상된 별칭 해결기
 * TypeScript 경로 매핑과 모듈 해결을 지원
 */
export class AliasResolver {
  private readonly extensions: string[];
  private readonly projectRoot: string;
  private readonly tsconfigPath?: string;
  private readonly enableNodeResolution: boolean;
  private readonly enableCaching: boolean;

  private tsConfig?: TsConfig;
  private pathMappings: Map<string, string[]> = new Map();
  private baseUrl?: string;
  private cache: Map<string, ResolvedModule | null> = new Map();

  constructor(options: ResolverOptions = {}) {
    this.extensions = options.extensions || ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
    this.projectRoot = options.projectRoot || process.cwd();
    this.tsconfigPath = options.tsconfigPath;
    this.enableNodeResolution = options.enableNodeResolution !== false;
    this.enableCaching = options.enableCaching !== false;

    this.initialize();
  }

  /**
   * 초기화 - tsconfig.json 로드 및 파싱
   */
  private initialize(): void {
    const tsconfigPath = this.findTsConfig();
    if (tsconfigPath) {
      this.loadTsConfig(tsconfigPath);
      logger.debug(`tsconfig.json 로드됨: ${tsconfigPath}`);
    } else {
      logger.debug('tsconfig.json을 찾을 수 없음, 기본 해결 방식 사용');
    }
  }

  /**
   * tsconfig.json 파일 찾기
   */
  private findTsConfig(): string | null {
    // 명시적으로 지정된 경우
    if (this.tsconfigPath && existsSync(this.tsconfigPath)) {
      return this.tsconfigPath;
    }

    // 프로젝트 루트에서 찾기
    const candidates = [
      join(this.projectRoot, 'tsconfig.json'),
      join(this.projectRoot, 'jsconfig.json'),
      join(this.projectRoot, 'tsconfig.base.json')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * tsconfig.json 로드 및 파싱
   */
  private loadTsConfig(configPath: string): void {
    try {
      const configContent = readFileSync(configPath, 'utf8');
      // JSON with Comments 지원 (간단한 주석 제거)
      const cleanContent = configContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      this.tsConfig = JSON.parse(cleanContent);

      // extends 처리
      if (this.tsConfig?.extends) {
        this.handleExtends(this.tsConfig.extends, dirname(configPath));
      }

      this.setupPathMappings();
    } catch (error) {
      logger.error(`tsconfig.json 파싱 오류: ${error}`);
    }
  }

  /**
   * extends 설정 처리
   */
  private handleExtends(extendsPath: string, configDir: string): void {
    let basePath: string;

    if (extendsPath.startsWith('.')) {
      // 상대 경로
      basePath = resolve(configDir, extendsPath);
    } else {
      // 모듈명 (예: @typescript-eslint/parser)
      try {
        basePath = require.resolve(extendsPath, { paths: [configDir] });
      } catch {
        logger.warning(`확장 설정을 찾을 수 없음: ${extendsPath}`);
        return;
      }
    }

    // .json 확장자 추가 (없는 경우)
    if (!basePath.endsWith('.json')) {
      basePath += '.json';
    }

    if (existsSync(basePath)) {
      const baseConfig = JSON.parse(readFileSync(basePath, 'utf8'));
      
      // 기본 설정과 현재 설정 병합
      this.tsConfig = this.mergeConfigs(baseConfig, this.tsConfig!);
    }
  }

  /**
   * 설정 병합
   */
  private mergeConfigs(base: TsConfig, override: TsConfig): TsConfig {
    return {
      ...base,
      ...override,
      compilerOptions: {
        ...base.compilerOptions,
        ...override.compilerOptions,
        paths: {
          ...base.compilerOptions?.paths,
          ...override.compilerOptions?.paths
        }
      }
    };
  }

  /**
   * 경로 매핑 설정
   */
  private setupPathMappings(): void {
    const compilerOptions = this.tsConfig?.compilerOptions;
    if (!compilerOptions) return;

    // baseUrl 설정
    if (compilerOptions.baseUrl) {
      this.baseUrl = resolve(this.projectRoot, compilerOptions.baseUrl);
    }

    // paths 매핑 설정
    if (compilerOptions.paths) {
      for (const [pattern, mappings] of Object.entries(compilerOptions.paths)) {
        this.pathMappings.set(pattern, mappings);
      }
    }
  }

  /**
   * 모듈 경로 해결
   */
  async resolveModule(importPath: string, fromFile: string): Promise<ResolvedModule | null> {
    const cacheKey = `${importPath}:${fromFile}`;
    
    // 캐시 확인
    if (this.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    let result: ResolvedModule | null = null;

    try {
      // 1. 상대 경로 해결
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        result = await this.resolveRelativePath(importPath, fromFile);
      }
      // 2. 절대 경로 해결
      else if (isAbsolute(importPath)) {
        result = await this.resolveAbsolutePath(importPath);
      }
      // 3. TypeScript 경로 매핑 해결
      else if (this.pathMappings.size > 0) {
        result = await this.resolveTsConfigPaths(importPath, fromFile);
      }

      // 4. Node.js 모듈 해결 (node_modules)
      if (!result && this.enableNodeResolution && !this.isBuiltinModule(importPath)) {
        result = await this.resolveNodeModule(importPath, fromFile);
      }

      // 5. 내장 모듈 확인
      if (!result && this.isBuiltinModule(importPath)) {
        result = {
          resolvedPath: importPath,
          originalPath: importPath,
          resolveMethod: 'builtin'
        };
      }

      // 캐시 저장
      if (this.enableCaching) {
        this.cache.set(cacheKey, result);
      }

    } catch (error) {
      logger.debug(`모듈 해결 실패: ${importPath} from ${fromFile} - ${error}`);
    }

    return result;
  }

  /**
   * 상대 경로 해결
   */
  private async resolveRelativePath(importPath: string, fromFile: string): Promise<ResolvedModule | null> {
    const fromDir = dirname(fromFile);
    const basePath = resolve(fromDir, importPath);

    const resolvedPath = await this.tryExtensions(basePath);
    if (resolvedPath) {
      return {
        resolvedPath,
        originalPath: importPath,
        resolveMethod: 'relative',
        extension: extname(resolvedPath)
      };
    }

    return null;
  }

  /**
   * 절대 경로 해결
   */
  private async resolveAbsolutePath(importPath: string): Promise<ResolvedModule | null> {
    const resolvedPath = await this.tryExtensions(importPath);
    if (resolvedPath) {
      return {
        resolvedPath,
        originalPath: importPath,
        resolveMethod: 'absolute',
        extension: extname(resolvedPath)
      };
    }

    return null;
  }

  /**
   * TypeScript 경로 매핑 해결
   */
  private async resolveTsConfigPaths(importPath: string, fromFile: string): Promise<ResolvedModule | null> {
    for (const [pattern, mappings] of this.pathMappings) {
      const regex = this.createPatternRegex(pattern);
      const match = importPath.match(regex);

      if (match) {
        for (const mapping of mappings) {
          const resolvedMapping = this.substitutePattern(mapping, match);
          const fullPath = this.baseUrl 
            ? resolve(this.baseUrl, resolvedMapping)
            : resolve(this.projectRoot, resolvedMapping);

          const resolvedPath = await this.tryExtensions(fullPath);
          if (resolvedPath) {
            return {
              resolvedPath,
              originalPath: importPath,
              resolveMethod: 'tsconfig-paths',
              extension: extname(resolvedPath),
              aliasMatch: {
                pattern,
                replacement: mapping
              }
            };
          }
        }
      }
    }

    // baseUrl만 있는 경우
    if (this.baseUrl && !importPath.includes('/')) {
      const basePath = resolve(this.baseUrl, importPath);
      const resolvedPath = await this.tryExtensions(basePath);
      if (resolvedPath) {
        return {
          resolvedPath,
          originalPath: importPath,
          resolveMethod: 'tsconfig-paths',
          extension: extname(resolvedPath)
        };
      }
    }

    return null;
  }

  /**
   * Node.js 모듈 해결
   */
  private async resolveNodeModule(importPath: string, fromFile: string): Promise<ResolvedModule | null> {
    const nodeModulesDirs = this.getNodeModulesDirs(dirname(fromFile));

    for (const nodeModulesDir of nodeModulesDirs) {
      const modulePath = join(nodeModulesDir, importPath);

      // package.json 확인
      const packageJsonPath = join(modulePath, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          const mainField = packageJson.main || packageJson.module || 'index.js';
          const mainPath = join(modulePath, mainField);

          const resolvedPath = await this.tryExtensions(mainPath);
          if (resolvedPath) {
            return {
              resolvedPath,
              originalPath: importPath,
              resolveMethod: 'node-modules',
              extension: extname(resolvedPath)
            };
          }
        } catch {
          // package.json 파싱 실패 시 계속 진행
        }
      }

      // 직접 파일 확인
      const resolvedPath = await this.tryExtensions(modulePath);
      if (resolvedPath) {
        return {
          resolvedPath,
          originalPath: importPath,
          resolveMethod: 'node-modules',
          extension: extname(resolvedPath)
        };
      }

      // index 파일 확인
      const indexPath = join(modulePath, 'index');
      const indexResolved = await this.tryExtensions(indexPath);
      if (indexResolved) {
        return {
          resolvedPath: indexResolved,
          originalPath: importPath,
          resolveMethod: 'node-modules',
          extension: extname(indexResolved)
        };
      }
    }

    return null;
  }

  /**
   * node_modules 디렉토리 목록 생성
   */
  private getNodeModulesDirs(fromDir: string): string[] {
    const dirs: string[] = [];
    let currentDir = fromDir;

    while (currentDir !== dirname(currentDir)) {
      dirs.push(join(currentDir, 'node_modules'));
      currentDir = dirname(currentDir);
    }

    return dirs;
  }

  /**
   * 패턴을 정규식으로 변환
   */
  private createPatternRegex(pattern: string): RegExp {
    // TypeScript 경로 패턴을 정규식으로 변환
    // 예: "utils/*" -> "^utils/(.*)$"
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '(.*)');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * 패턴 치환
   */
  private substitutePattern(mapping: string, matches: RegExpMatchArray): string {
    let result = mapping;
    
    // * 치환
    for (let i = 1; i < matches.length; i++) {
      result = result.replace('*', matches[i]);
    }

    return result;
  }

  /**
   * 확장자 시도
   */
  private async tryExtensions(basePath: string): Promise<string | null> {
    // 이미 확장자가 있는 경우
    if (extname(basePath) && existsSync(basePath)) {
      return basePath;
    }

    // 확장자 추가해서 시도
    for (const ext of this.extensions) {
      const pathWithExt = basePath + ext;
      if (existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }

    // index 파일 시도
    if (existsSync(basePath) && require('fs').statSync(basePath).isDirectory()) {
      for (const ext of this.extensions) {
        const indexPath = join(basePath, `index${ext}`);
        if (existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return null;
  }

  /**
   * 내장 모듈 확인
   */
  private isBuiltinModule(moduleName: string): boolean {
    const builtinModules = [
      'fs', 'path', 'http', 'https', 'url', 'querystring', 'crypto', 'stream',
      'util', 'events', 'buffer', 'process', 'os', 'child_process', 'cluster',
      'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'tty', 'zlib',
      'assert', 'constants', 'module', 'punycode', 'string_decoder', 'sys',
      'timers', 'vm', 'worker_threads', 'perf_hooks'
    ];

    return builtinModules.includes(moduleName) || moduleName.startsWith('node:');
  }

  /**
   * 프로젝트 내부 파일인지 확인
   */
  isInternalModule(resolvedModule: ResolvedModule): boolean {
    if (!resolvedModule) return false;

    const resolvedPath = resolve(resolvedModule.resolvedPath);
    const projectRoot = resolve(this.projectRoot);

    return resolvedPath.startsWith(projectRoot) && 
           !resolvedPath.includes('node_modules') &&
           resolvedModule.resolveMethod !== 'builtin';
  }

  /**
   * 상대 경로로 변환
   */
  getRelativePath(from: string, to: string): string {
    return relative(dirname(from), to);
  }

  /**
   * 별칭 매핑 정보 조회
   */
  getPathMappings(): Map<string, string[]> {
    return new Map(this.pathMappings);
  }

  /**
   * 설정 정보 조회
   */
  getConfig() {
    return {
      projectRoot: this.projectRoot,
      baseUrl: this.baseUrl,
      extensions: this.extensions,
      pathMappings: Object.fromEntries(this.pathMappings),
      tsconfigFound: !!this.tsConfig
    };
  }

  /**
   * 캐시 지우기
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.enableCaching
    };
  }
}

export default AliasResolver;