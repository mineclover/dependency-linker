/**
 * 📄 Document Entity
 * 문서의 핵심 비즈니스 로직을 담당하는 도메인 엔티티
 */

import { DocumentId } from '../value-objects/DocumentId.js';
import { FilePath } from '../value-objects/FilePath.js';
import { NotionId } from '../value-objects/NotionId.js';

/**
 * Front Matter 인터페이스
 */
export interface FrontMatter {
  title?: string;
  description?: string;
  tags?: string[];
  dependencies?: string[];
  notion_id?: string;
  created_at?: Date;
  updated_at?: Date;
  [key: string]: any;
}

/**
 * 문서 상태 열거형
 */
export enum DocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SYNCED = 'synced',
  OUTDATED = 'outdated',
  ERROR = 'error'
}

/**
 * Document 도메인 엔티티
 */
export class Document {
  private constructor(
    private readonly _id: DocumentId,
    private readonly _filePath: FilePath,
    private _content: string,
    private _frontMatter: FrontMatter,
    private _status: DocumentStatus = DocumentStatus.DRAFT,
    private _notionId?: NotionId,
    private _dependencies: DocumentId[] = [],
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {}

  /**
   * 새 Document 생성
   */
  static create(
    filePath: FilePath,
    content: string,
    frontMatter: FrontMatter = {}
  ): Document {
    const id = DocumentId.generate();
    return new Document(id, filePath, content, frontMatter);
  }

  /**
   * 기존 Document 복원
   */
  static restore(
    id: DocumentId,
    filePath: FilePath,
    content: string,
    frontMatter: FrontMatter,
    status: DocumentStatus,
    notionId?: NotionId,
    dependencies: DocumentId[] = [],
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ): Document {
    return new Document(
      id,
      filePath,
      content,
      frontMatter,
      status,
      notionId,
      dependencies,
      createdAt,
      updatedAt
    );
  }

  // Getters
  get id(): DocumentId { return this._id; }
  get filePath(): FilePath { return this._filePath; }
  get content(): string { return this._content; }
  get frontMatter(): FrontMatter { return { ...this._frontMatter }; }
  get status(): DocumentStatus { return this._status; }
  get notionId(): NotionId | undefined { return this._notionId; }
  get dependencies(): DocumentId[] { return [...this._dependencies]; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * 문서 내용 업데이트
   */
  updateContent(content: string): void {
    this._content = content;
    this._updatedAt = new Date();
  }

  /**
   * Front Matter 업데이트
   */
  updateFrontMatter(updates: Partial<FrontMatter>): void {
    this._frontMatter = { 
      ...this._frontMatter, 
      ...updates, 
      updated_at: new Date() 
    };
    this._updatedAt = new Date();
  }

  /**
   * 의존성 추가
   */
  addDependency(documentId: DocumentId): void {
    if (!this._dependencies.some(dep => dep.equals(documentId))) {
      this._dependencies.push(documentId);
      this._updatedAt = new Date();
    }
  }

  /**
   * 의존성 제거
   */
  removeDependency(documentId: DocumentId): void {
    this._dependencies = this._dependencies.filter(dep => !dep.equals(documentId));
    this._updatedAt = new Date();
  }

  /**
   * Notion ID 설정
   */
  setNotionId(notionId: NotionId): void {
    this._notionId = notionId;
    this._frontMatter.notion_id = notionId.value;
    this._updatedAt = new Date();
  }

  /**
   * 상태 변경
   */
  changeStatus(status: DocumentStatus): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  /**
   * Notion과 동기화됨으로 표시
   */
  markAsSynced(): void {
    this.changeStatus(DocumentStatus.SYNCED);
  }

  /**
   * 과거 버전임을 표시
   */
  markAsOutdated(): void {
    this.changeStatus(DocumentStatus.OUTDATED);
  }

  /**
   * 에러 상태로 표시
   */
  markAsError(): void {
    this.changeStatus(DocumentStatus.ERROR);
  }

  /**
   * 동기화 가능 여부 확인
   */
  canSync(): boolean {
    return [
      DocumentStatus.DRAFT,
      DocumentStatus.PUBLISHED,
      DocumentStatus.OUTDATED
    ].includes(this._status);
  }

  /**
   * 의존성 존재 여부 확인
   */
  hasDependency(documentId: DocumentId): boolean {
    return this._dependencies.some(dep => dep.equals(documentId));
  }

  /**
   * 문서 내용에서 링크 추출
   */
  extractLinks(): string[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;
    
    while ((match = linkRegex.exec(this._content)) !== null) {
      links.push(match[2]);
    }
    
    return links;
  }

  /**
   * 완전한 Front Matter 생성 (저장용)
   */
  getCompleteFrontMatter(): FrontMatter {
    return {
      ...this._frontMatter,
      notion_id: this._notionId?.value,
      dependencies: this._dependencies.map(dep => dep.value),
      created_at: this._createdAt,
      updated_at: this._updatedAt
    };
  }

  /**
   * 도메인 규칙 검증
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this._content.trim()) {
      errors.push('문서 내용이 비어있습니다.');
    }

    if (this._frontMatter.title && this._frontMatter.title.length > 200) {
      errors.push('제목이 200자를 초과합니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}