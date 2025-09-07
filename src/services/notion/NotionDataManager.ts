/**
 * NotionDataManager - 테이블 데이터 CRUD 관리 전용 서비스
 * 
 * 역할:
 * - Notion 데이터베이스에 페이지(행) 생성/수정/삭제
 * - 일괄 데이터 업로드
 * - 데이터 중복 확인 및 처리
 * - 페이지 속성 관리
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';

export interface PageData {
  [propertyName: string]: any;
}

export interface PageCreateOptions {
  properties: PageData;
  children?: any[]; // 페이지 내용 블록들
  icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
  cover?: { type: 'external'; external: { url: string } };
}

export interface PageUpdateOptions {
  properties?: PageData;
  archived?: boolean;
}

export interface BatchUploadOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  skipExisting?: boolean;
  updateExisting?: boolean;
}

export interface UploadResult {
  success: boolean;
  pageId?: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
}

export interface BatchUploadResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  results: UploadResult[];
}

export class NotionDataManager {
  constructor(private readonly notion: Client) {
    // Notion Client 유효성 검증
    if (!this.notion || !this.notion.databases) {
      throw new Error('Invalid Notion client - databases API not available');
    }
  }

  /**
   * databases.query 메서드 유효성 검사
   */
  private validateDatabasesQuery(): void {
    if (typeof this.notion.dataSources.query !== 'function') {
      throw new Error('Notion dataSources.query method is not available - check client version compatibility');
    }
  }

  /**
   * 단일 페이지 생성
   */
  async createPage(
    databaseId: string,
    options: PageCreateOptions
  ): Promise<UploadResult> {
    try {
      logger.debug(`📝 Creating page in database: ${databaseId}`);
      
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: this.formatProperties(options.properties),
        children: options.children || [],
        icon: options.icon,
        cover: options.cover
      });
      
      return {
        success: true,
        pageId: response.id,
        action: 'created'
      };
    } catch (error) {
      logger.error(`❌ Failed to create page: ` + (error instanceof Error ? error.message : String(error)));
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 페이지 업데이트
   */
  async updatePage(
    pageId: string,
    options: PageUpdateOptions
  ): Promise<UploadResult> {
    try {
      logger.debug(`🔄 Updating page: ${pageId}`);
      
      const updateData: any = { page_id: pageId };
      
      if (options.properties) {
        updateData.properties = this.formatProperties(options.properties);
      }
      
      if (options.archived !== undefined) {
        updateData.archived = options.archived;
      }
      
      await this.notion.pages.update(updateData);
      
      return {
        success: true,
        pageId,
        action: 'updated'
      };
    } catch (error) {
      logger.error(`❌ Failed to update page ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
      return {
        success: false,
        pageId,
        action: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 페이지 삭제 (아카이브)
   */
  async deletePage(pageId: string): Promise<UploadResult> {
    return this.updatePage(pageId, { archived: true });
  }

  /**
   * 기존 페이지 확인 (중복 방지용)
   */
  async findExistingPage(
    databaseId: string,
    searchProperty: string,
    searchValue: string
  ): Promise<string | null> {
    try {
      this.validateDatabasesQuery();
      const response = await this.notion.dataSources.query({
        data_source_id: databaseId,
        filter: {
          property: searchProperty,
          rich_text: {
            equals: searchValue
          }
        }
      });
      
      return response.results.length > 0 ? response.results[0].id : null;
    } catch (error) {
      // title 속성인 경우 다른 필터 시도
      try {
        this.validateDatabasesQuery();
      const response = await this.notion.dataSources.query({
          data_source_id: databaseId,
          filter: {
            property: searchProperty,
            title: {
              equals: searchValue
            }
          }
        });
        
        return response.results.length > 0 ? response.results[0].id : null;
      } catch {
        logger.warning(`⚠️ Could not search for existing page: ${searchValue}`);
        return null;
      }
    }
  }

  /**
   * 페이지 생성 또는 업데이트
   */
  async upsertPage(
    databaseId: string,
    uniqueProperty: string,
    uniqueValue: string,
    options: PageCreateOptions
  ): Promise<UploadResult> {
    try {
      // 기존 페이지 확인
      const existingPageId = await this.findExistingPage(
        databaseId, 
        uniqueProperty, 
        uniqueValue
      );
      
      if (existingPageId) {
        // 업데이트
        return await this.updatePage(existingPageId, {
          properties: options.properties
        });
      } else {
        // 생성
        return await this.createPage(databaseId, options);
      }
    } catch (error) {
      logger.error(`❌ Failed to upsert page: ` + (error instanceof Error ? error.message : String(error)));
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 일괄 페이지 업로드
   */
  async batchUpload(
    databaseId: string,
    pages: Array<{
      uniqueProperty?: string;
      uniqueValue?: string;
      data: PageCreateOptions;
    }>,
    options: BatchUploadOptions = {}
  ): Promise<BatchUploadResult> {
    const {
      batchSize = 10,
      delayBetweenBatches = 1000,
      skipExisting = false,
      updateExisting = true
    } = options;
    
    logger.info(`📦 Starting batch upload: ${pages.length} pages`, 'DATA');
    
    const result: BatchUploadResult = {
      total: pages.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      results: []
    };
    
    // 배치별로 처리
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pages.length / batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (page) => {
          if (page.uniqueProperty && page.uniqueValue) {
            // 중복 확인이 필요한 경우
            if (skipExisting) {
              const exists = await this.findExistingPage(
                databaseId, 
                page.uniqueProperty, 
                page.uniqueValue
              );
              if (exists) {
                return { success: true, pageId: exists, action: 'skipped' as const };
              }
            }
            
            if (updateExisting) {
              return await this.upsertPage(
                databaseId, 
                page.uniqueProperty, 
                page.uniqueValue, 
                page.data
              );
            }
          }
          
          // 단순 생성
          return await this.createPage(databaseId, page.data);
        })
      );
      
      // 결과 집계
      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          const uploadResult = batchResult.value;
          result.results.push(uploadResult);
          
          switch (uploadResult.action) {
            case 'created':
              result.created++;
              break;
            case 'updated':
              result.updated++;
              break;
            case 'skipped':
              result.skipped++;
              break;
            case 'error':
              result.failed++;
              if (uploadResult.error) {
                result.errors.push(uploadResult.error);
              }
              break;
          }
        } else {
          result.failed++;
          result.errors.push(batchResult.reason?.message || 'Unknown error');
          result.results.push({
            success: false,
            action: 'error',
            error: batchResult.reason?.message || 'Unknown error'
          });
        }
      });
      
      // 배치 간 지연
      if (i + batchSize < pages.length) {
        await this.delay(delayBetweenBatches);
      }
    }
    
    logger.info(`✅ Batch upload completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`);
    
    return result;
  }

  /**
   * 데이터베이스 모든 페이지 조회
   */
  async getAllPages(databaseId: string): Promise<any[]> {
    try {
      const pages: any[] = [];
      let cursor: string | undefined;
      
      do {
        this.validateDatabasesQuery();
      const response = await this.notion.dataSources.query({
          data_source_id: databaseId,
          start_cursor: cursor
        });
        
        pages.push(...response.results);
        cursor = response.next_cursor || undefined;
      } while (cursor);
      
      return pages;
    } catch (error) {
      logger.error(`❌ Failed to get all pages from database: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 조건에 맞는 페이지 검색
   */
  async queryPages(
    databaseId: string,
    filter?: any,
    sorts?: any[],
    pageSize: number = 100
  ): Promise<any[]> {
    try {
      this.validateDatabasesQuery();
      const response = await this.notion.dataSources.query({
        data_source_id: databaseId,
        filter,
        sorts,
        page_size: pageSize
      });
      
      return response.results;
    } catch (error) {
      logger.error(`❌ Failed to query pages: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 페이지 정보 조회
   */
  async getPage(pageId: string): Promise<any> {
    try {
      return await this.notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
      logger.error(`❌ Failed to get page ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 데이터베이스 통계 조회
   */
  async getDatabaseStats(databaseId: string): Promise<{
    totalPages: number;
    createdToday: number;
    updatedToday: number;
  }> {
    try {
      const pages = await this.getAllPages(databaseId);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        totalPages: pages.length,
        createdToday: pages.filter(page => page.created_time.startsWith(today)).length,
        updatedToday: pages.filter(page => page.last_edited_time.startsWith(today)).length
      };
    } catch (error) {
      logger.error(`❌ Failed to get database stats: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  // === Private Methods ===

  private formatProperties(properties: PageData): any {
    const formatted: any = {};
    
    for (const [key, value] of Object.entries(properties)) {
      formatted[key] = this.formatPropertyValue(value);
    }
    
    return formatted;
  }

  private formatPropertyValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    // 이미 포맷된 Notion 속성인 경우
    if (typeof value === 'object' && value.type) {
      return value;
    }
    
    // 값의 타입에 따라 자동 포맷
    if (typeof value === 'string') {
      // 제목인지 일반 텍스트인지 자동 판단이 어려우므로 rich_text로 처리
      return {
        rich_text: [{ text: { content: value } }]
      };
    } else if (typeof value === 'number') {
      return { number: value };
    } else if (typeof value === 'boolean') {
      return { checkbox: value };
    } else if (value instanceof Date) {
      return { date: { start: value.toISOString().split('T')[0] } };
    } else if (Array.isArray(value)) {
      // 다중 선택으로 처리
      return {
        multi_select: value.map(item => ({ name: String(item) }))
      };
    }
    
    // 기본적으로 텍스트로 처리
    return {
      rich_text: [{ text: { content: String(value) } }]
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}