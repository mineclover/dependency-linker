/**
 * 📄 IDocumentRepository Interface
 * 문서 저장소 인터페이스 - Repository Pattern
 */

import { Document, DocumentStatus } from '../entities/Document.js';
import { DocumentId } from '../value-objects/DocumentId.js';
import { FilePath } from '../value-objects/FilePath.js';
import { NotionId } from '../value-objects/NotionId.js';

/**
 * 문서 조회 필터
 */
export interface DocumentFilter {
  status?: DocumentStatus;
  tags?: string[];
  hasNotionId?: boolean;
  hasDependencies?: boolean;
  createdAfter?: Date;
  updatedAfter?: Date;
}

/**
 * 페이지네이션 옵션
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * 문서 저장소 인터페이스
 */
export interface IDocumentRepository {
  /**
   * 문서 저장
   */
  save(document: Document): Promise<void>;

  /**
   * ID로 문서 조회
   */
  findById(id: DocumentId): Promise<Document | null>;

  /**
   * 파일 경로로 문서 조회
   */
  findByFilePath(filePath: FilePath): Promise<Document | null>;

  /**
   * Notion ID로 문서 조회
   */
  findByNotionId(notionId: NotionId): Promise<Document | null>;

  /**
   * 조건에 따른 문서 목록 조회
   */
  findAll(filter?: DocumentFilter): Promise<Document[]>;

  /**
   * 페이지네이션과 함께 문서 목록 조회
   */
  findWithPagination(
    filter?: DocumentFilter,
    pagination?: PaginationOptions
  ): Promise<{ documents: Document[]; total: number }>;

  /**
   * 의존성을 가진 문서 조회
   */
  findByDependency(documentId: DocumentId): Promise<Document[]>;

  /**
   * 태그로 문서 조회
   */
  findByTags(tags: string[]): Promise<Document[]>;

  /**
   * 상태별 문서 개수 조회
   */
  countByStatus(): Promise<Record<DocumentStatus, number>>;

  /**
   * 문서 삭제
   */
  delete(id: DocumentId): Promise<void>;

  /**
   * 문서 존재 여부 확인
   */
  exists(id: DocumentId): Promise<boolean>;

  /**
   * 파일 경로로 문서 존재 여부 확인
   */
  existsByFilePath(filePath: FilePath): Promise<boolean>;

  /**
   * 최근 업데이트된 문서 조회
   */
  findRecentlyUpdated(limit?: number): Promise<Document[]>;

  /**
   * 동기화가 필요한 문서 조회
   */
  findNeedingSync(): Promise<Document[]>;

  /**
   * 에러 상태의 문서 조회
   */
  findWithErrors(): Promise<Document[]>;

  /**
   * 고아 문서 조회 (의존성이 깨진 문서)
   */
  findOrphanedDocuments(): Promise<Document[]>;

  /**
   * 벌크 저장
   */
  saveMany(documents: Document[]): Promise<void>;

  /**
   * 벌크 삭제
   */
  deleteMany(ids: DocumentId[]): Promise<void>;

  /**
   * 전체 문서 개수
   */
  count(filter?: DocumentFilter): Promise<number>;

  /**
   * 저장소 초기화
   */
  clear(): Promise<void>;
}