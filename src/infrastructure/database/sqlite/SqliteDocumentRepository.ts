/**
 * 🗃️ SQLite Document Repository Implementation  
 * bun:sqlite를 사용한 문서 저장소 구현체
 */
import { Document, DocumentStatus, FrontMatter } from '../../../domain/entities/Document.js';
import { DocumentId } from '../../../domain/value-objects/DocumentId.js';
import { FilePath } from '../../../domain/value-objects/FilePath.js';
import { NotionId } from '../../../domain/value-objects/NotionId.js';
import { 
  IDocumentRepository, 
  DocumentFilter, 
  PaginationOptions 
} from '../../../domain/repositories/IDocumentRepository.js';
import { IDatabaseAdapter, DatabaseAdapterFactory } from '../DatabaseAdapter.js';

/**
 * 데이터베이스 스키마 인터페이스
 */
interface DocumentRow {
  id: string;
  file_path: string;
  content: string;
  front_matter: string;
  status: string;
  notion_id?: string;
  dependencies: string;
  created_at: string;
  updated_at: string;
}

/**
 * SQLite 문서 저장소 구현체
 * bun:sqlite를 사용한 고성능 구현
 */
export class SqliteDocumentRepository implements IDocumentRepository {
  private dbAdapter: IDatabaseAdapter;

  constructor(databasePath: string) {
    this.dbAdapter = DatabaseAdapterFactory.create(databasePath);
    this.initializeSchema();
  }

  /**
   * 기존 어댑터로부터 생성 (의존성 주입)
   */
  static fromAdapter(adapter: IDatabaseAdapter): SqliteDocumentRepository {
    const repo = Object.create(SqliteDocumentRepository.prototype);
    repo.dbAdapter = adapter;
    repo.initializeSchema();
    return repo;
  }

  /**
   * 데이터베이스 스키마 초기화
   */
  private async initializeSchema(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        file_path TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        front_matter TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft',
        notion_id TEXT,
        dependencies TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        -- 제약 조건
        UNIQUE(file_path),
        CHECK(status IN ('draft', 'published', 'synced', 'outdated', 'error')),
        CHECK(json_valid(front_matter)),
        CHECK(json_valid(dependencies))
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path)',
      'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_notion_id ON documents(notion_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC)',
      // 복합 인덱스로 성능 최적화
      'CREATE INDEX IF NOT EXISTS idx_documents_status_updated ON documents(status, updated_at DESC)'
    ];

    await this.dbAdapter.execute(createTableQuery);
    
    for (const indexQuery of createIndexes) {
      await this.dbAdapter.execute(indexQuery);
    }
  }

  /**
   * Document 엔티티를 데이터베이스 Row로 변환
   */
  private documentToRow(document: Document): Omit<DocumentRow, 'id'> & { id: string } {
    return {
      id: document.id.value,
      file_path: document.filePath.value,
      content: document.content,
      front_matter: JSON.stringify(document.frontMatter),
      status: document.status,
      notion_id: document.notionId?.value,
      dependencies: JSON.stringify(document.dependencies.map(dep => dep.value)),
      created_at: document.createdAt.toISOString(),
      updated_at: document.updatedAt.toISOString()
    };
  }

  /**
   * 데이터베이스 Row를 Document 엔티티로 변환
   */
  private rowToDocument(row: DocumentRow): Document {
    const frontMatter: FrontMatter = JSON.parse(row.front_matter);
    const dependencyIds = (JSON.parse(row.dependencies) as string[])
      .map(id => DocumentId.fromString(id));

    return Document.restore(
      DocumentId.fromString(row.id),
      FilePath.fromString(row.file_path),
      row.content,
      frontMatter,
      row.status as DocumentStatus,
      row.notion_id ? NotionId.fromString(row.notion_id) : undefined,
      dependencyIds,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }

  /**
   * 필터를 SQL WHERE 절로 변환
   */
  private buildWhereClause(filter?: DocumentFilter): { where: string; params: any[] } {
    if (!filter) {
      return { where: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter.hasNotionId !== undefined) {
      conditions.push(filter.hasNotionId ? 'notion_id IS NOT NULL' : 'notion_id IS NULL');
    }

    if (filter.createdAfter) {
      conditions.push('created_at > ?');
      params.push(filter.createdAfter.toISOString());
    }

    if (filter.updatedAfter) {
      conditions.push('updated_at > ?');
      params.push(filter.updatedAfter.toISOString());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }

  // IDocumentRepository 구현

  async save(document: Document): Promise<void> {
    const row = this.documentToRow(document);
    
    const query = `
      INSERT OR REPLACE INTO documents 
      (id, file_path, content, front_matter, status, notion_id, dependencies, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.dbAdapter.execute(query, [
      row.id,
      row.file_path,
      row.content,
      row.front_matter,
      row.status,
      row.notion_id,
      row.dependencies,
      row.created_at,
      row.updated_at
    ]);
  }

  async findById(id: DocumentId): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE id = ?';
    const row = await this.dbAdapter.queryOne<DocumentRow>(query, [id.value]);
    
    return row ? this.rowToDocument(row) : null;
  }

  async findByFilePath(filePath: FilePath): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE file_path = ?';
    const row = await this.dbAdapter.queryOne<DocumentRow>(query, [filePath.value]);
    
    return row ? this.rowToDocument(row) : null;
  }

  async findByNotionId(notionId: NotionId): Promise<Document | null> {
    const query = 'SELECT * FROM documents WHERE notion_id = ?';
    const row = await this.dbAdapter.queryOne<DocumentRow>(query, [notionId.value]);
    
    return row ? this.rowToDocument(row) : null;
  }

  async findAll(filter?: DocumentFilter): Promise<Document[]> {
    const { where, params } = this.buildWhereClause(filter);
    const query = `SELECT * FROM documents ${where} ORDER BY updated_at DESC`;
    
    const rows = await this.dbAdapter.query<DocumentRow>(query, params);
    return rows.map(row => this.rowToDocument(row));
  }

  async findWithPagination(
    filter?: DocumentFilter,
    pagination?: PaginationOptions
  ): Promise<{ documents: Document[]; total: number }> {
    const { where, params } = this.buildWhereClause(filter);
    
    // 전체 개수 조회
    const countQuery = `SELECT COUNT(*) as count FROM documents ${where}`;
    const countResult = await this.dbAdapter.queryOne<{ count: number }>(countQuery, params);
    
    // 페이지네이션 적용한 데이터 조회
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT * FROM documents ${where} 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const rows = await this.dbAdapter.query<DocumentRow>(dataQuery, [...params, limit, offset]);
    const documents = rows.map(row => this.rowToDocument(row));
    
    return {
      documents,
      total: countResult?.count || 0
    };
  }

  async findByDependency(documentId: DocumentId): Promise<Document[]> {
    const query = `
      SELECT * FROM documents 
      WHERE dependencies LIKE ? 
      ORDER BY updated_at DESC
    `;
    
    const rows = await this.dbAdapter.query<DocumentRow>(query, [`%"${documentId.value}"%`]);
    return rows.map(row => this.rowToDocument(row));
  }

  async findByTags(tags: string[]): Promise<Document[]> {
    if (tags.length === 0) return [];
    
    const conditions = tags.map(() => 'front_matter LIKE ?').join(' OR ');
    const query = `SELECT * FROM documents WHERE ${conditions} ORDER BY updated_at DESC`;
    const params = tags.map(tag => `%"${tag}"%`);
    
    const rows = await this.dbAdapter.query<DocumentRow>(query, params);
    return rows.map(row => this.rowToDocument(row));
  }

  async countByStatus(): Promise<Record<DocumentStatus, number>> {
    const query = 'SELECT status, COUNT(*) as count FROM documents GROUP BY status';
    const rows = await this.dbAdapter.query<{ status: string; count: number }>(query);
    
    const result: Record<DocumentStatus, number> = {
      [DocumentStatus.DRAFT]: 0,
      [DocumentStatus.PUBLISHED]: 0,
      [DocumentStatus.SYNCED]: 0,
      [DocumentStatus.OUTDATED]: 0,
      [DocumentStatus.ERROR]: 0
    };
    
    rows.forEach(row => {
      result[row.status as DocumentStatus] = row.count;
    });
    
    return result;
  }

  async delete(id: DocumentId): Promise<void> {
    const query = 'DELETE FROM documents WHERE id = ?';
    await this.dbAdapter.execute(query, [id.value]);
  }

  async exists(id: DocumentId): Promise<boolean> {
    const query = 'SELECT 1 FROM documents WHERE id = ? LIMIT 1';
    const result = await this.dbAdapter.queryOne(query, [id.value]);
    return result !== null;
  }

  async existsByFilePath(filePath: FilePath): Promise<boolean> {
    const query = 'SELECT 1 FROM documents WHERE file_path = ? LIMIT 1';
    const result = await this.dbAdapter.queryOne(query, [filePath.value]);
    return result !== null;
  }

  async findRecentlyUpdated(limit: number = 10): Promise<Document[]> {
    const query = 'SELECT * FROM documents ORDER BY updated_at DESC LIMIT ?';
    const rows = await this.dbAdapter.query<DocumentRow>(query, [limit]);
    return rows.map(row => this.rowToDocument(row));
  }

  async findNeedingSync(): Promise<Document[]> {
    const query = `
      SELECT * FROM documents 
      WHERE status IN ('draft', 'published', 'outdated') 
      ORDER BY updated_at ASC
    `;
    const rows = await this.dbAdapter.query<DocumentRow>(query);
    return rows.map(row => this.rowToDocument(row));
  }

  async findWithErrors(): Promise<Document[]> {
    const query = `SELECT * FROM documents WHERE status = 'error' ORDER BY updated_at DESC`;
    const rows = await this.dbAdapter.query<DocumentRow>(query);
    return rows.map(row => this.rowToDocument(row));
  }

  async findOrphanedDocuments(): Promise<Document[]> {
    // 의존성은 있지만 해당 문서가 존재하지 않는 경우
    const query = `
      SELECT d.* FROM documents d
      WHERE d.dependencies != '[]'
      AND EXISTS (
        SELECT 1 FROM json_each(d.dependencies) je
        WHERE je.value NOT IN (SELECT id FROM documents)
      )
    `;
    const rows = await this.dbAdapter.query<DocumentRow>(query);
    return rows.map(row => this.rowToDocument(row));
  }

  async saveMany(documents: Document[]): Promise<void> {
    await this.dbAdapter.transaction(async (adapter) => {
      for (const doc of documents) {
        const row = this.documentToRow(doc);
        const query = `
          INSERT OR REPLACE INTO documents 
          (id, file_path, content, front_matter, status, notion_id, dependencies, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await adapter.execute(query, [
          row.id, row.file_path, row.content, row.front_matter, 
          row.status, row.notion_id, row.dependencies, 
          row.created_at, row.updated_at
        ]);
      }
    });
  }

  async deleteMany(ids: DocumentId[]): Promise<void> {
    if (ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM documents WHERE id IN (${placeholders})`;
    const values = ids.map(id => id.value);
    
    await this.dbAdapter.execute(query, values);
  }

  async count(filter?: DocumentFilter): Promise<number> {
    const { where, params } = this.buildWhereClause(filter);
    const query = `SELECT COUNT(*) as count FROM documents ${where}`;
    const result = await this.dbAdapter.queryOne<{ count: number }>(query, params);
    return result?.count || 0;
  }

  async clear(): Promise<void> {
    await this.dbAdapter.execute('DELETE FROM documents');
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    this.dbAdapter.close();
  }
}