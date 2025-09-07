/**
 * Notion Data Upload Service
 * 인덱싱된 데이터를 Notion 데이터베이스에 업로드하는 서비스
 */

import { Client } from '@notionhq/client';
import { logger } from '../shared/utils/index.js';
import { ConfigManager } from '../infrastructure/config/configManager.js';
import type { WorkspaceConfig } from '../shared/types/index.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileIndexData {
  [filePath: string]: {
    notionPageId?: string;
    lastModified: string;
    hash: string;
    size?: number;
    lines?: number;
    extension?: string;
    content?: string;
  };
}

export interface DocumentIndexData {
  [filePath: string]: {
    notionPageId?: string;
    title: string;
    type: string;
    lastModified: string;
    wordCount?: number;
    content?: string;
  };
}

export interface UploadResult {
  success: boolean;
  uploaded: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Notion 데이터 업로드 서비스
 */
export class NotionDataUploadService {
  private notion: Client;
  private config: WorkspaceConfig;
  private projectPath: string;

  constructor(apiKey: string, config: WorkspaceConfig, projectPath: string = process.cwd()) {
    this.notion = new Client({ auth: apiKey });
    this.config = config;
    this.projectPath = path.resolve(projectPath);
  }

  /**
   * 파일 데이터를 Files 데이터베이스에 업로드
   */
  async uploadFileData(): Promise<UploadResult> {
    logger.info('파일 데이터 업로드 시작', '📁');

    const result: UploadResult = {
      success: false,
      uploaded: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      // 1. 인덱스 데이터 로드
      const indexData = await this.loadFileIndexData();
      if (!indexData || Object.keys(indexData).length === 0) {
        logger.warning('인덱싱된 파일 데이터가 없습니다');
        return { ...result, success: true };
      }

      // 2. Files 데이터베이스 ID 확인
      const filesDbId = this.config.databases.files;
      if (!filesDbId) {
        throw new Error('Files 데이터베이스가 설정되지 않았습니다');
      }

      logger.info(`${Object.keys(indexData).length}개 파일 데이터 업로드 중...`);

      // 3. 각 파일을 Notion 페이지로 생성
      for (const [filePath, fileData] of Object.entries(indexData)) {
        try {
          const pageData = await this.createOrUpdateFilePage(filesDbId, filePath, fileData);
          
          if (pageData.created) {
            result.uploaded++;
            logger.success(`파일 업로드: ${filePath}`);
          } else if (pageData.updated) {
            result.updated++;
            logger.info(`파일 업데이트: ${filePath}`);
          } else {
            result.skipped++;
            logger.debug(`파일 스킵: ${filePath}`);
          }

        } catch (error) {
          const errorMsg = `파일 업로드 실패: ${filePath} - ${error}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      result.success = true;
      logger.success(`파일 업로드 완료: ${result.uploaded}개 생성, ${result.updated}개 업데이트`);

    } catch (error) {
      const errorMsg = `파일 데이터 업로드 실패: ${error}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * 문서 데이터를 Docs 데이터베이스에 업로드
   */
  async uploadDocumentData(): Promise<UploadResult> {
    logger.info('문서 데이터 업로드 시작', '📖');

    const result: UploadResult = {
      success: false,
      uploaded: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      // 1. 문서 인덱스 데이터 로드
      const indexData = await this.loadDocumentIndexData();
      if (!indexData || Object.keys(indexData).length === 0) {
        logger.warning('인덱싱된 문서 데이터가 없습니다');
        return { ...result, success: true };
      }

      // 2. Docs 데이터베이스 ID 확인
      const docsDbId = this.config.databases.docs;
      if (!docsDbId) {
        throw new Error('Docs 데이터베이스가 설정되지 않았습니다');
      }

      logger.info(`${Object.keys(indexData).length}개 문서 데이터 업로드 중...`);

      // 3. 각 문서를 Notion 페이지로 생성
      for (const [filePath, docData] of Object.entries(indexData)) {
        try {
          const pageData = await this.createOrUpdateDocumentPage(docsDbId, filePath, docData);
          
          if (pageData.created) {
            result.uploaded++;
            logger.success(`문서 업로드: ${filePath}`);
          } else if (pageData.updated) {
            result.updated++;
            logger.info(`문서 업데이트: ${filePath}`);
          } else {
            result.skipped++;
            logger.debug(`문서 스킵: ${filePath}`);
          }

        } catch (error) {
          const errorMsg = `문서 업로드 실패: ${filePath} - ${error}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      result.success = true;
      logger.success(`문서 업로드 완료: ${result.uploaded}개 생성, ${result.updated}개 업데이트`);

    } catch (error) {
      const errorMsg = `문서 데이터 업로드 실패: ${error}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * 파일 인덱스 데이터 로드
   */
  private async loadFileIndexData(): Promise<FileIndexData | null> {
    try {
      const indexPath = path.join(this.projectPath, '.deplink-db.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return data.files || null;
    } catch (error) {
      logger.warning(`파일 인덱스 데이터 로드 실패: ${error}`);
      return null;
    }
  }

  /**
   * 문서 인덱스 데이터 로드
   */
  private async loadDocumentIndexData(): Promise<DocumentIndexData | null> {
    try {
      const indexPath = path.join(this.projectPath, '.deplink-document-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      logger.warning(`문서 인덱스 데이터 로드 실패: ${error}`);
      return null;
    }
  }

  /**
   * 파일 페이지 생성 또는 업데이트
   */
  private async createOrUpdateFilePage(
    databaseId: string,
    filePath: string,
    fileData: FileIndexData[string]
  ): Promise<{ created: boolean; updated: boolean; pageId: string }> {
    
    // 파일 확장자 추출
    const extension = path.extname(filePath) || 'Other';
    
    // 파일 크기 계산 (실제 파일에서)
    let fileSize = fileData.size || 0;
    let lineCount = fileData.lines || 0;
    
    try {
      const fullPath = path.join(this.projectPath, filePath);
      const stats = await fs.stat(fullPath);
      fileSize = stats.size;
      
      // 텍스트 파일인 경우 라인 수 계산
      if (['.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.py', '.css', '.html'].includes(extension)) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          lineCount = content.split('\n').length;
        } catch {}
      }
    } catch {}

    // 기존 페이지 확인
    if (fileData.notionPageId) {
      try {
        await this.notion.pages.retrieve({ page_id: fileData.notionPageId });
        // 페이지가 존재하고 수정이 필요한 경우 업데이트
        const needsUpdate = await this.checkIfFileNeedsUpdate(fileData.notionPageId, fileData);
        if (needsUpdate) {
          await this.updateFilePage(fileData.notionPageId, filePath, fileData, fileSize, lineCount, extension);
          return { created: false, updated: true, pageId: fileData.notionPageId };
        }
        return { created: false, updated: false, pageId: fileData.notionPageId };
      } catch {
        // 페이지가 없으면 새로 생성
      }
    }

    // 새 페이지 생성
    const response = await this.notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Name': {
          title: [{ text: { content: path.basename(filePath) } }]
        },
        'File Path': {
          rich_text: [{ text: { content: filePath } }]
        },
        'Extension': {
          select: { name: extension }
        },
        'Size (bytes)': {
          number: fileSize
        },
        'Last Modified': {
          date: { start: new Date(fileData.lastModified).toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Uploaded' }
        },
        'Project': {
          select: { name: 'dependency-linker' }
        }
      }
    });

    // 인덱스 데이터 업데이트
    await this.updateFileIndexWithPageId(filePath, response.id);

    return { created: true, updated: false, pageId: response.id };
  }

  /**
   * 문서 페이지 생성 또는 업데이트
   */
  private async createOrUpdateDocumentPage(
    databaseId: string,
    filePath: string,
    docData: DocumentIndexData[string]
  ): Promise<{ created: boolean; updated: boolean; pageId: string }> {

    // 기존 페이지 확인
    if (docData.notionPageId) {
      try {
        await this.notion.pages.retrieve({ page_id: docData.notionPageId });
        // 페이지가 존재하고 수정이 필요한 경우 업데이트
        const needsUpdate = await this.checkIfDocumentNeedsUpdate(docData.notionPageId, docData);
        if (needsUpdate) {
          await this.updateDocumentPage(docData.notionPageId, filePath, docData);
          return { created: false, updated: true, pageId: docData.notionPageId };
        }
        return { created: false, updated: false, pageId: docData.notionPageId };
      } catch {
        // 페이지가 없으면 새로 생성
      }
    }

    // 새 페이지 생성
    const response = await this.notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Name': {
          title: [{ text: { content: docData.title } }]
        },
        'Document Type': {
          select: { name: docData.type || 'Other' }
        },
        'Content': {
          rich_text: [{ text: { content: (docData.content || '').substring(0, 2000) } }]
        },
        'Last Updated': {
          date: { start: new Date(docData.lastModified).toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Published' }
        },
        'Word Count': {
          number: docData.wordCount || 0
        },
        'Related Files': {
          rich_text: [{ text: { content: filePath } }]
        }
      }
    });

    // 인덱스 데이터 업데이트
    await this.updateDocumentIndexWithPageId(filePath, response.id);

    return { created: true, updated: false, pageId: response.id };
  }

  /**
   * 파일 업데이트 필요성 체크
   */
  private async checkIfFileNeedsUpdate(pageId: string, fileData: FileIndexData[string]): Promise<boolean> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const properties = (page as any).properties;
      
      // Last Modified 비교
      const notionDate = properties['Last Modified']?.date?.start;
      const fileDate = new Date(fileData.lastModified).toISOString().split('T')[0];
      
      return notionDate !== fileDate;
    } catch {
      return true; // 에러 발생시 업데이트 수행
    }
  }

  /**
   * 문서 업데이트 필요성 체크
   */
  private async checkIfDocumentNeedsUpdate(pageId: string, docData: DocumentIndexData[string]): Promise<boolean> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const properties = (page as any).properties;
      
      // Last Updated 비교
      const notionDate = properties['Last Updated']?.date?.start;
      const docDate = new Date(docData.lastModified).toISOString().split('T')[0];
      
      return notionDate !== docDate;
    } catch {
      return true; // 에러 발생시 업데이트 수행
    }
  }

  /**
   * 파일 페이지 업데이트
   */
  private async updateFilePage(
    pageId: string,
    filePath: string,
    fileData: FileIndexData[string],
    fileSize: number,
    lineCount: number,
    extension: string
  ): Promise<void> {
    await this.notion.pages.update({
      page_id: pageId,
      properties: {
        'Size (bytes)': {
          number: fileSize
        },
        'Last Modified': {
          date: { start: new Date(fileData.lastModified).toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Updated' }
        }
      }
    });
  }

  /**
   * 문서 페이지 업데이트
   */
  private async updateDocumentPage(
    pageId: string,
    filePath: string,
    docData: DocumentIndexData[string]
  ): Promise<void> {
    await this.notion.pages.update({
      page_id: pageId,
      properties: {
        'Content': {
          rich_text: [{ text: { content: (docData.content || '').substring(0, 2000) } }]
        },
        'Last Updated': {
          date: { start: new Date(docData.lastModified).toISOString().split('T')[0] }
        },
        'Status': {
          select: { name: 'Published' }
        },
        'Word Count': {
          number: docData.wordCount || 0
        }
      }
    });
  }

  /**
   * 파일 인덱스에 페이지 ID 업데이트
   */
  private async updateFileIndexWithPageId(filePath: string, pageId: string): Promise<void> {
    try {
      const indexPath = path.join(this.projectPath, '.deplink-db.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.files && data.files[filePath]) {
        data.files[filePath].notionPageId = pageId;
        await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
        logger.debug(`파일 인덱스 업데이트: ${filePath} -> ${pageId}`);
      }
    } catch (error) {
      logger.warning(`파일 인덱스 업데이트 실패: ${error}`);
    }
  }

  /**
   * 문서 인덱스에 페이지 ID 업데이트
   */
  private async updateDocumentIndexWithPageId(filePath: string, pageId: string): Promise<void> {
    try {
      const indexPath = path.join(this.projectPath, '.deplink-document-index.json');
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data[filePath]) {
        data[filePath].notionPageId = pageId;
        await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
        logger.debug(`문서 인덱스 업데이트: ${filePath} -> ${pageId}`);
      }
    } catch (error) {
      logger.warning(`문서 인덱스 업데이트 실패: ${error}`);
    }
  }

  /**
   * 전체 데이터 업로드 (파일 + 문서)
   */
  async uploadAllData(): Promise<{
    fileResult: UploadResult;
    documentResult: UploadResult;
    success: boolean;
  }> {
    logger.info('전체 데이터 업로드 시작', '🚀');

    const fileResult = await this.uploadFileData();
    const documentResult = await this.uploadDocumentData();

    const success = fileResult.success && documentResult.success;

    logger.info(`전체 업로드 완료: 파일 ${fileResult.uploaded + fileResult.updated}개, 문서 ${documentResult.uploaded + documentResult.updated}개`);

    return {
      fileResult,
      documentResult,
      success
    };
  }
}