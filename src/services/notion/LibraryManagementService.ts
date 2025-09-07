/**
 * Library Management Service - Application Layer
 * 라이브러리 의존성을 체계적으로 Notion에서 관리하는 서비스
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import type { DependencyInfo } from '../parsers/common/parserInterfaces.js';

export interface LibraryInfo {
  name: string;
  version?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  packageType: 'npm' | 'yarn' | 'pnpm' | 'python' | 'maven' | 'nuget' | 'gem' | 'go' | 'unknown';
  isDevDependency?: boolean;
  size?: number;
  lastUpdated?: string;
  vulnerability?: {
    level: 'none' | 'low' | 'moderate' | 'high' | 'critical';
    count: number;
    details?: string[];
  };
}

export interface LibraryPageResult {
  success: boolean;
  pageId?: string;
  pageUrl?: string;
  isNewPage: boolean;
  error?: string;
}

export interface LibraryManagementResult {
  success: boolean;
  processedLibraries: number;
  createdPages: number;
  updatedPages: number;
  linkedDependencies: number;
  libraryPages: Map<string, string>; // library name -> page ID
  error?: string;
}

export class LibraryManagementService {
  private notionClient: Client;
  private databaseIds: {
    libraries?: string;
    dependencies?: string;
    files?: string;
  };
  private libraryCache = new Map<string, string>(); // library name -> page ID

  constructor(notionClient: Client, databaseIds: any) {
    this.notionClient = notionClient;
    this.databaseIds = databaseIds;
  }

  /**
   * 파일의 라이브러리 의존성을 체계적으로 관리
   */
  async manageLibraryDependencies(
    dependencies: DependencyInfo[],
    filePageId: string,
    filePath: string
  ): Promise<LibraryManagementResult> {
    logger.info(`📚 Starting library dependency management for: ${filePath}`);

    try {
      // 1. 외부 라이브러리만 필터링
      const externalLibraries = dependencies.filter(dep => !dep.isLocalFile);
      
      if (externalLibraries.length === 0) {
        logger.info('📚 No external library dependencies found');
        return {
          success: true,
          processedLibraries: 0,
          createdPages: 0,
          updatedPages: 0,
          linkedDependencies: 0,
          libraryPages: new Map()
        };
      }

      // 2. 라이브러리 정보 수집 및 정규화
      const libraryInfos = await this.collectLibraryInformation(externalLibraries);
      
      // 3. Notion에서 라이브러리 페이지 생성/업데이트
      const libraryPages = await this.ensureLibraryPages(libraryInfos);
      
      // 4. 파일과 라이브러리 간 의존성 관계 생성
      const linkedDependencies = await this.createLibraryDependencyRelations(
        externalLibraries,
        libraryPages,
        filePageId
      );

      const createdPages = Array.from(libraryPages.values()).filter(result => result.isNewPage).length;
      const updatedPages = libraryPages.size - createdPages;

      logger.info(`✅ Library management completed: ${createdPages} created, ${updatedPages} updated, ${linkedDependencies} dependencies linked`);

      return {
        success: true,
        processedLibraries: externalLibraries.length,
        createdPages,
        updatedPages,
        linkedDependencies,
        libraryPages: new Map(Array.from(libraryPages.entries()).map(([name, result]) => [name, result.pageId!]))
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Library management failed: ${errorMessage}`);

      return {
        success: false,
        processedLibraries: 0,
        createdPages: 0,
        updatedPages: 0,
        linkedDependencies: 0,
        libraryPages: new Map(),
        error: errorMessage
      };
    }
  }

  /**
   * 라이브러리 정보 수집 및 정규화
   */
  private async collectLibraryInformation(dependencies: DependencyInfo[]): Promise<Map<string, LibraryInfo>> {
    const libraryInfos = new Map<string, LibraryInfo>();

    for (const dep of dependencies) {
      const libraryName = this.extractLibraryName(dep.source);
      
      if (libraryInfos.has(libraryName)) {
        continue; // 이미 처리된 라이브러리
      }

      const libraryInfo: LibraryInfo = {
        name: libraryName,
        version: dep.version,
        packageType: this.detectPackageType(dep.source),
        isDevDependency: dep.isDev,
        description: await this.fetchLibraryDescription(libraryName),
        homepage: await this.fetchLibraryHomepage(libraryName),
        repository: await this.fetchLibraryRepository(libraryName),
        license: await this.fetchLibraryLicense(libraryName),
        size: await this.fetchLibrarySize(libraryName),
        lastUpdated: await this.fetchLastUpdated(libraryName),
        vulnerability: await this.checkVulnerabilities(libraryName, dep.version)
      };

      libraryInfos.set(libraryName, libraryInfo);
      logger.debug(`📋 Collected info for library: ${libraryName}`);
    }

    return libraryInfos;
  }

  /**
   * 라이브러리 페이지들을 Notion에서 보장 (생성/업데이트)
   */
  private async ensureLibraryPages(libraryInfos: Map<string, LibraryInfo>): Promise<Map<string, LibraryPageResult>> {
    const results = new Map<string, LibraryPageResult>();

    if (!this.databaseIds.libraries) {
      logger.warning('Libraries database ID not configured');
      return results;
    }

    for (const [libraryName, libraryInfo] of libraryInfos) {
      try {
        // 기존 페이지 검색
        const existingPage = await this.findExistingLibraryPage(libraryName);
        
        if (existingPage) {
          // 기존 페이지 업데이트
          const updateResult = await this.updateLibraryPage(existingPage.id, libraryInfo);
          results.set(libraryName, {
            success: updateResult,
            pageId: existingPage.id,
            pageUrl: existingPage.url,
            isNewPage: false
          });
        } else {
          // 새 페이지 생성
          const createResult = await this.createLibraryPage(libraryInfo);
          results.set(libraryName, createResult);
        }

        // 캐시 업데이트
        const result = results.get(libraryName);
        if (result?.success && result.pageId) {
          this.libraryCache.set(libraryName, result.pageId);
        }

      } catch (error) {
        logger.error(`❌ Failed to process library page for ${libraryName}: ` + (error instanceof Error ? error.message : String(error)));
        results.set(libraryName, {
          success: false,
          isNewPage: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * 새 라이브러리 페이지 생성
   */
  private async createLibraryPage(libraryInfo: LibraryInfo): Promise<LibraryPageResult> {
    try {
      const properties = {
        "Name": { title: [{ text: { content: libraryInfo.name } }] },
        "Version": { rich_text: [{ text: { content: libraryInfo.version || 'unknown' } }] },
        "Description": { rich_text: [{ text: { content: libraryInfo.description || '' } }] },
        "Homepage": { url: libraryInfo.homepage || null },
        "Repository": { url: libraryInfo.repository || null },
        "License": { rich_text: [{ text: { content: libraryInfo.license || 'unknown' } }] },
        "Is Dev Dependency": { checkbox: libraryInfo.isDevDependency || false },
        "Bundle Size": { rich_text: [{ text: { content: libraryInfo.size ? `${libraryInfo.size}KB` : 'unknown' } }] },
        "Last Updated": { date: libraryInfo.lastUpdated ? { start: libraryInfo.lastUpdated } : null },
        "Package Manager": { select: { name: libraryInfo.packageManager || 'npm' } },
        "Category": { select: { name: libraryInfo.category || 'dependency' } },
        "Registry URL": { url: libraryInfo.registryUrl || null },
        "Usage Count": { number: libraryInfo.usageCount || 0 }
      };

      const response = await this.notionClient.pages.create({
        parent: { database_id: this.databaseIds.libraries },
        properties
      });

      logger.debug(`✅ Created library page: ${libraryInfo.name}`);

      return {
        success: true,
        pageId: response.id,
        pageUrl: `https://notion.so/${response.id.replace(/-/g, '')}`,
        isNewPage: true
      };

    } catch (error) {
      logger.error(`❌ Failed to create library page for ${libraryInfo.name}: ` + (error instanceof Error ? error.message : String(error)));
      return {
        success: false,
        isNewPage: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 기존 라이브러리 페이지 업데이트
   */
  private async updateLibraryPage(pageId: string, libraryInfo: LibraryInfo): Promise<boolean> {
    try {
      const properties = {
        "Version": { rich_text: [{ text: { content: libraryInfo.version || 'unknown' } }] },
        "Description": { rich_text: [{ text: { content: libraryInfo.description || '' } }] },
        "Bundle Size": { rich_text: [{ text: { content: libraryInfo.size ? `${libraryInfo.size}KB` : 'unknown' } }] },
        "Last Updated": { date: libraryInfo.lastUpdated ? { start: libraryInfo.lastUpdated } : null },
        "License": { rich_text: [{ text: { content: libraryInfo.license || 'unknown' } }] },
        "Homepage": { url: libraryInfo.homepage || null },
        "Repository": { url: libraryInfo.repository || null }
      };

      await this.notionClient.pages.update({
        page_id: pageId,
        properties
      });

      logger.debug(`✅ Updated library page: ${libraryInfo.name}`);
      return true;

    } catch (error) {
      logger.error(`❌ Failed to update library page for ${libraryInfo.name}: ` + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  /**
   * 기존 라이브러리 페이지 검색
   */
  private async findExistingLibraryPage(libraryName: string): Promise<{ id: string; url: string } | null> {
    // 캐시 확인
    if (this.libraryCache.has(libraryName)) {
      const pageId = this.libraryCache.get(libraryName)!;
      return {
        id: pageId,
        url: `https://notion.so/${pageId.replace(/-/g, '')}`
      };
    }

    // Notion 검색
    try {
      const response = await this.notionClient.dataSources.query({
        data_source_id: this.databaseIds.libraries,
        filter: {
          property: "Name",
          title: {
            equals: libraryName
          }
        }
      });

      if (response.results.length > 0) {
        const page = response.results[0];
        this.libraryCache.set(libraryName, page.id);
        return {
          id: page.id,
          url: page.url || `https://notion.so/${page.id.replace(/-/g, '')}`
        };
      }

      return null;

    } catch (error) {
      logger.error(`❌ Failed to search for library page ${libraryName}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 파일과 라이브러리 간 의존성 관계 생성
   */
  private async createLibraryDependencyRelations(
    dependencies: DependencyInfo[],
    libraryPages: Map<string, LibraryPageResult>,
    filePageId: string
  ): Promise<number> {
    if (!this.databaseIds.dependencies) {
      logger.warning('Dependencies database ID not configured');
      return 0;
    }

    let linkedCount = 0;

    for (const dep of dependencies) {
      const libraryName = this.extractLibraryName(dep.source);
      const libraryPageResult = libraryPages.get(libraryName);

      if (!libraryPageResult?.success || !libraryPageResult.pageId) {
        continue;
      }

      try {
        const properties = {
          "Name": { title: [{ text: { content: `${dep.source} → ${libraryName}` } }] },
          "Type": { select: { name: dep.type || 'Import' } },
          "Source": { rich_text: [{ text: { content: dep.source || '' } }] },
          "Target": { rich_text: [{ text: { content: libraryName } }] },
          "Is Local": { checkbox: false }, // Library dependencies are not local
          "Is Dev Dependency": { checkbox: dep.isDev || false },
          "Line Number": { number: dep.lineNumber || 0 },
          "Resolved Path": { rich_text: [{ text: { content: '' } }] }, // Not applicable for libraries
          "Module Specifier": { rich_text: [{ text: { content: dep.importName || '' } }] }
        };

        await this.notionClient.pages.create({
          parent: { database_id: this.databaseIds.dependencies },
          properties
        });

        linkedCount++;
        logger.debug(`🔗 Linked dependency: ${libraryName}`);

      } catch (error) {
        logger.error(`❌ Failed to create dependency relation for ${libraryName}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }

    return linkedCount;
  }

  // Helper methods for library information fetching
  private extractLibraryName(source: string): string {
    if (source.startsWith('@')) {
      const parts = source.split('/');
      return parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    return source.split('/')[0];
  }

  private detectPackageType(source: string): LibraryInfo['packageType'] {
    // 간단한 패키지 타입 추론 로직
    if (source.includes('node_modules') || source.startsWith('@')) return 'npm';
    // 추가적인 패키지 타입 감지 로직을 여기에 구현
    return 'npm'; // 기본값
  }

  // 실제 구현에서는 npm API, GitHub API 등을 사용
  private async fetchLibraryDescription(libraryName: string): Promise<string | undefined> {
    // TODO: npm API나 package.json 파싱을 통해 실제 description 조회
    return undefined;
  }

  private async fetchLibraryHomepage(libraryName: string): Promise<string | undefined> {
    // TODO: npm API를 통해 homepage 조회
    return undefined;
  }

  private async fetchLibraryRepository(libraryName: string): Promise<string | undefined> {
    // TODO: npm API를 통해 repository 조회
    return undefined;
  }

  private async fetchLibraryLicense(libraryName: string): Promise<string | undefined> {
    // TODO: npm API를 통해 license 조회
    return undefined;
  }

  private async fetchLibrarySize(libraryName: string): Promise<number | undefined> {
    // TODO: bundlephobia API 등을 통해 패키지 사이즈 조회
    return undefined;
  }

  private async fetchLastUpdated(libraryName: string): Promise<string | undefined> {
    // TODO: npm API를 통해 마지막 업데이트 일자 조회
    return undefined;
  }

  private async checkVulnerabilities(libraryName: string, version?: string): Promise<LibraryInfo['vulnerability']> {
    // TODO: npm audit API나 Snyk API를 통해 취약점 조회
    return {
      level: 'none',
      count: 0
    };
  }
}