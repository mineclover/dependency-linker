/**
 * 분석 결과 인덱스 관리자
 * Analysis Results Index Manager
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import { 
  LanguageAnalysisResult, 
  DependencyInfo, 
  FunctionInfo, 
  ClassInfo, 
  VariableInfo,
  ExportInfo,
  CommentInfo,
  TodoInfo
} from '../parsers';
import type { 
  FileRecord, 
  DependencyRecord, 
  ReverseDependencyRecord, 
  FunctionRecord,
  DocumentRecord,
  MetricsRecord,
  TodoRecord,
  FileInfo,
  ConflictRecord,
  SqliteParameters
} from '../../shared/types/database.js';

export interface IndexedFile {
  id: number;
  filePath: string;
  language: string;
  notionId?: string;
  lastModified: number;
  analysisTime: number;
  parserVersion: string;
  contentHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface IndexedDependency {
  id: number;
  fileId: number;
  source: string;
  type: string;
  location: string; // JSON string
  resolved?: string;
  version?: string;
  isLocal: boolean;
  isDynamic: boolean;
  metadata?: string; // JSON string
}

export interface IndexedFunction {
  id: number;
  fileId: number;
  name: string;
  type: string;
  params: string; // JSON string
  returnType?: string;
  location: string; // JSON string
  isAsync: boolean;
  isGenerator: boolean;
  isExported: boolean;
  visibility?: string;
  decorators?: string; // JSON string
  complexity?: number;
}

export interface IndexedClass {
  id: number;
  fileId: number;
  name: string;
  extends?: string;
  implements?: string; // JSON string
  location: string; // JSON string
  isExported: boolean;
  isAbstract: boolean;
  decorators?: string; // JSON string
  visibility?: string;
}

export class AnalysisIndexManager {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = './analysis-index.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  initializeDatabase(): void {
    // 데이터베이스가 닫혀있으면 다시 열기
    try {
      if (!this.db) {
        this.db = new Database(this.dbPath, { create: true });
      } else {
        // 테스트 쿼리로 데이터베이스가 활성화되어 있는지 확인
        this.db.exec('PRAGMA user_version');
      }
    } catch (error) {
      // 데이터베이스가 닫혀있으면 새로 생성
      this.db = new Database(this.dbPath, { create: true });
    }
    
    // WAL 모드 활성화
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('PRAGMA cache_size = 10000');
    this.db.exec('PRAGMA temp_store = memory');

    // Files 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        language TEXT NOT NULL,
        notion_id TEXT,
        last_modified INTEGER NOT NULL,
        analysis_time INTEGER NOT NULL,
        parser_version TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Dependencies 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        resolved TEXT,
        version TEXT,
        is_local BOOLEAN NOT NULL,
        is_dynamic BOOLEAN NOT NULL,
        metadata TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Functions 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS functions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        params TEXT NOT NULL,
        return_type TEXT,
        location TEXT NOT NULL,
        is_async BOOLEAN NOT NULL,
        is_generator BOOLEAN NOT NULL,
        is_exported BOOLEAN NOT NULL,
        visibility TEXT,
        decorators TEXT,
        complexity INTEGER,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Classes 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        extends TEXT,
        implements TEXT,
        location TEXT NOT NULL,
        is_exported BOOLEAN NOT NULL,
        is_abstract BOOLEAN NOT NULL,
        decorators TEXT,
        visibility TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Variables 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        kind TEXT NOT NULL,
        is_exported BOOLEAN NOT NULL,
        location TEXT NOT NULL,
        default_value TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Exports 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT,
        location TEXT NOT NULL,
        alias TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // Comments 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        location TEXT NOT NULL,
        tags TEXT,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // TODOs 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        date TEXT,
        priority INTEGER,
        location TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // File metrics 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        lines_of_code INTEGER NOT NULL,
        comment_lines INTEGER NOT NULL,
        blank_lines INTEGER NOT NULL,
        complexity INTEGER NOT NULL,
        dependencies_count INTEGER NOT NULL,
        exports_count INTEGER NOT NULL,
        functions_count INTEGER NOT NULL,
        classes_count INTEGER NOT NULL,
        maintainability_index REAL NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
      )
    `);

    // 인덱스 생성
    this.createIndexes();
  }

  /**
   * 인덱스 생성
   */
  private createIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path)',
      'CREATE INDEX IF NOT EXISTS idx_files_language ON files(language)',
      'CREATE INDEX IF NOT EXISTS idx_files_notion_id ON files(notion_id)',
      'CREATE INDEX IF NOT EXISTS idx_files_modified ON files(last_modified)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_file ON dependencies(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source)',
      'CREATE INDEX IF NOT EXISTS idx_dependencies_type ON dependencies(type)',
      'CREATE INDEX IF NOT EXISTS idx_functions_file ON functions(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name)',
      'CREATE INDEX IF NOT EXISTS idx_functions_exported ON functions(is_exported)',
      'CREATE INDEX IF NOT EXISTS idx_classes_file ON classes(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name)',
      'CREATE INDEX IF NOT EXISTS idx_variables_file ON variables(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_variables_name ON variables(name)',
      'CREATE INDEX IF NOT EXISTS idx_exports_file ON exports(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_todos_file ON todos(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_todos_resolved ON todos(resolved)',
    ];

    for (const indexSql of indexes) {
      this.db.exec(indexSql);
    }
  }

  /**
   * 분석 결과 저장
   */
  async storeAnalysisResult(result: LanguageAnalysisResult, contentHash: string): Promise<number> {
    const transaction = this.db.transaction(() => {
      // 1. 파일 정보 저장/업데이트
      const fileId = this.upsertFile(result, contentHash);

      // 2. 기존 분석 데이터 삭제
      this.clearFileAnalysisData(fileId);

      // 3. 새로운 분석 데이터 저장
      this.storeDependencies(fileId, result.dependencies);
      this.storeFunctions(fileId, result.functions);
      this.storeClasses(fileId, result.classes);
      this.storeVariables(fileId, result.variables);
      this.storeExports(fileId, result.exports);
      this.storeComments(fileId, result.comments);
      this.storeTodos(fileId, result.todos);
      this.storeMetrics(fileId, result.metrics);

      return fileId;
    });

    return transaction();
  }

  /**
   * 파일 정보 upsert
   */
  private upsertFile(result: LanguageAnalysisResult, contentHash: string): number {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT INTO files (
        file_path, language, notion_id, last_modified, 
        analysis_time, parser_version, content_hash, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        language = excluded.language,
        notion_id = excluded.notion_id,
        last_modified = excluded.last_modified,
        analysis_time = excluded.analysis_time,
        parser_version = excluded.parser_version,
        content_hash = excluded.content_hash,
        updated_at = excluded.updated_at
    `);

    const info = stmt.run(
      result.filePath,
      result.language,
      result.notionId || null,
      now,
      result.analysisTime,
      result.parserVersion,
      contentHash,
      now
    );

    // 파일 ID 조회
    if (info.changes > 0) {
      const selectStmt = this.db.prepare('SELECT id FROM files WHERE file_path = ?');
      const row = selectStmt.get(result.filePath) as { id: number };
      return row.id;
    }
    
    return info.lastInsertRowid as number;
  }

  /**
   * 파일의 기존 분석 데이터 삭제
   */
  private clearFileAnalysisData(fileId: number): void {
    const tables = [
      'dependencies', 'functions', 'classes', 'variables', 
      'exports', 'comments', 'todos', 'file_metrics'
    ];
    
    for (const table of tables) {
      this.db.prepare(`DELETE FROM ${table} WHERE file_id = ?`).run(fileId);
    }
  }

  /**
   * Dependencies 저장
   */
  private storeDependencies(fileId: number, dependencies: DependencyInfo[]): void {
    if (dependencies.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO dependencies (
        file_id, source, type, location, resolved, version, 
        is_local, is_dynamic, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dep of dependencies) {
      stmt.run(
        fileId,
        dep.source,
        dep.type,
        JSON.stringify(dep.location),
        dep.resolved || null,
        dep.version || null,
        dep.isLocal ? 1 : 0,
        dep.isDynamic ? 1 : 0,
        dep.metadata ? JSON.stringify(dep.metadata) : null
      );
    }
  }

  /**
   * Functions 저장
   */
  private storeFunctions(fileId: number, functions: FunctionInfo[]): void {
    if (functions.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO functions (
        file_id, name, type, params, return_type, location,
        is_async, is_generator, is_exported, visibility, decorators, complexity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const func of functions) {
      stmt.run(
        fileId,
        func.name,
        func.type,
        JSON.stringify(func.params),
        func.returnType || null,
        JSON.stringify(func.location),
        func.isAsync ? 1 : 0,
        func.isGenerator ? 1 : 0,
        func.isExported ? 1 : 0,
        func.visibility || null,
        func.decorators ? JSON.stringify(func.decorators) : null,
        func.complexity || null
      );
    }
  }

  /**
   * Classes 저장
   */
  private storeClasses(fileId: number, classes: ClassInfo[]): void {
    if (classes.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO classes (
        file_id, name, extends, implements, location,
        is_exported, is_abstract, decorators, visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const cls of classes) {
      stmt.run(
        fileId,
        cls.name,
        cls.extends || null,
        cls.implements ? JSON.stringify(cls.implements) : null,
        JSON.stringify(cls.location),
        cls.isExported ? 1 : 0,
        cls.isAbstract ? 1 : 0,
        cls.decorators ? JSON.stringify(cls.decorators) : null,
        cls.visibility || null
      );
    }
  }

  /**
   * Variables 저장
   */
  private storeVariables(fileId: number, variables: VariableInfo[]): void {
    if (variables.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO variables (
        file_id, name, type, kind, is_exported, location, default_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const variable of variables) {
      stmt.run(
        fileId,
        variable.name,
        variable.type || null,
        variable.kind,
        variable.isExported ? 1 : 0,
        JSON.stringify(variable.location),
        variable.defaultValue || null
      );
    }
  }

  /**
   * Exports 저장
   */
  private storeExports(fileId: number, exports: ExportInfo[]): void {
    if (exports.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO exports (
        file_id, name, type, source, location, alias
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const exp of exports) {
      stmt.run(
        fileId,
        exp.name,
        exp.type,
        exp.source || null,
        JSON.stringify(exp.location),
        exp.alias || null
      );
    }
  }

  /**
   * Comments 저장
   */
  private storeComments(fileId: number, comments: CommentInfo[]): void {
    if (comments.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO comments (
        file_id, type, content, location, tags
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const comment of comments) {
      stmt.run(
        fileId,
        comment.type,
        comment.content,
        JSON.stringify(comment.location),
        comment.tags ? JSON.stringify(comment.tags) : null
      );
    }
  }

  /**
   * TODOs 저장
   */
  private storeTodos(fileId: number, todos: TodoInfo[]): void {
    if (todos.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO todos (
        file_id, type, content, author, date, priority, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const todo of todos) {
      stmt.run(
        fileId,
        todo.type,
        todo.content,
        todo.author || null,
        todo.date || null,
        todo.priority || null,
        JSON.stringify(todo.location)
      );
    }
  }

  /**
   * Metrics 저장
   */
  private storeMetrics(fileId: number, metrics: Partial<MetricsRecord>): void {
    const stmt = this.db.prepare(`
      INSERT INTO file_metrics (
        file_id, lines_of_code, comment_lines, blank_lines, complexity,
        dependencies_count, exports_count, functions_count, classes_count,
        maintainability_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fileId,
      metrics.linesOfCode,
      metrics.commentLines,
      metrics.blankLines,
      metrics.complexity,
      metrics.dependencies,
      metrics.exports,
      metrics.functions,
      metrics.classes,
      metrics.maintainabilityIndex
    );
  }

  /**
   * 파일 조회
   */
  getFile(filePath: string): IndexedFile | null {
    const stmt = this.db.prepare('SELECT * FROM files WHERE file_path = ?');
    return stmt.get(filePath) as IndexedFile | null;
  }

  /**
   * 파일 정보 조회 (별칭)
   */
  getFileByPath(filePath: string): FileInfo | null {
    if (!this.db) {
      throw new Error('Database is not available');
    }
    
    try {
      const stmt = this.db.prepare('SELECT * FROM files WHERE file_path = ?');
      const file = stmt.get(filePath) as FileRecord | undefined;
      if (!file) return null;
      
      return {
        id: file.id,
        path: file.file_path,
        relative_path: file.relative_path || file.file_path,
        language: file.language,
        notion_id: file.notion_id
      };
    } catch (error) {
      console.error(`Failed to get file by path ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 파일 ID로 파일 정보 조회
   */
  getFile(fileId: number): FileRecord | null {
    if (!this.db) {
      throw new Error('Database is not available');
    }
    
    try {
      const stmt = this.db.prepare('SELECT * FROM files WHERE id = ?');
      return stmt.get(fileId) as FileRecord | undefined;
    } catch (error) {
      console.error(`Failed to get file by ID ${fileId}:`, error);
      return null;
    }
  }

  /**
   * 파일의 dependencies 조회
   */
  getFileDependencies(fileId: number): IndexedDependency[] {
    if (!this.db) {
      throw new Error('Database is not available');
    }
    
    try {
      const stmt = this.db.prepare('SELECT * FROM dependencies WHERE file_id = ?');
      return stmt.all(fileId) as IndexedDependency[];
    } catch (error) {
      console.error(`Failed to get dependencies for file ID ${fileId}:`, error);
      return [];
    }
  }

  /**
   * 파일의 역방향 의존성 조회 (해당 파일을 import하는 파일들)
   */
  getFileReverseDependencies(fileId: number): ReverseDependencyRecord[] {
    if (!this.db) {
      throw new Error('Database is not available');
    }
    
    try {
      // 해당 파일의 경로를 먼저 찾고
      const file = this.db.prepare('SELECT file_path FROM files WHERE id = ?').get(fileId) as any;
      if (!file) return [];

      // 그 경로를 import하는 다른 파일들을 찾음
      const stmt = this.db.prepare(`
        SELECT f.file_path as source_path, d.* 
        FROM dependencies d 
        JOIN files f ON d.file_id = f.id 
        WHERE d.source LIKE ? OR d.resolved = ?
      `);
      
      return stmt.all(`%${file.file_path}%`, file.file_path) as any[];
    } catch (error) {
      console.error(`Failed to get reverse dependencies for file ID ${fileId}:`, error);
      return [];
    }
  }

  /**
   * 파일의 functions 조회
   */
  getFileFunctions(fileId: number): IndexedFunction[] {
    const stmt = this.db.prepare('SELECT * FROM functions WHERE file_id = ?');
    return stmt.all(fileId) as IndexedFunction[];
  }

  /**
   * 테스트용 파일 직접 추가
   */
  addTestFile(filePath: string, language: string = 'TypeScript'): number {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO files (
        file_path, language, last_modified, 
        analysis_time, parser_version, content_hash, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      filePath,
      language,
      now,
      now,
      '1.0.0',
      'test-hash',
      now
    );

    // 파일 ID 조회
    const fileStmt = this.db.prepare('SELECT id FROM files WHERE file_path = ?');
    const result = fileStmt.get(filePath) as any;
    return result?.id || 0;
  }

  /**
   * 언어별 파일 목록 조회
   */
  getFilesByLanguage(language: string): IndexedFile[] {
    const stmt = this.db.prepare('SELECT * FROM files WHERE language = ? ORDER BY updated_at DESC');
    return stmt.all(language) as IndexedFile[];
  }

  /**
   * Notion ID로 파일 조회
   */
  getFileByNotionId(notionId: string): IndexedFile | null {
    const stmt = this.db.prepare('SELECT * FROM files WHERE notion_id = ?');
    return stmt.get(notionId) as IndexedFile | null;
  }

  /**
   * 미해결 TODO 목록 조회
   */
  getUnresolvedTodos(): TodoRecord[] {
    const stmt = this.db.prepare(`
      SELECT t.*, f.file_path, f.language 
      FROM todos t 
      JOIN files f ON t.file_id = f.id 
      WHERE t.resolved = FALSE 
      ORDER BY t.priority DESC, t.type
    `);
    return stmt.all();
  }

  /**
   * 통계 정보 조회
   */
  getStatistics() {
    if (!this.db) {
      throw new Error('Database is not available or has been closed');
    }
    
    try {
    
    const stats = {
      totalFiles: this.db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number },
      filesByLanguage: this.db.prepare(`
        SELECT language, COUNT(*) as count 
        FROM files 
        GROUP BY language 
        ORDER BY count DESC
      `).all(),
      totalDependencies: this.db.prepare('SELECT COUNT(*) as count FROM dependencies').get() as { count: number },
      totalFunctions: this.db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number },
      totalClasses: this.db.prepare('SELECT COUNT(*) as count FROM classes').get() as { count: number },
      totalTodos: this.db.prepare('SELECT COUNT(*) as count FROM todos WHERE resolved = FALSE').get() as { count: number }
    };

    return stats;
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * 분석 결과 저장
   */
  saveAnalysisResult(result: LanguageAnalysisResult): void {
    if (!this.db) {
      throw new Error('Database is not available or has been closed');
    }

    try {
      // 트랜잭션 시작
      this.db.exec('BEGIN TRANSACTION');

      // 파일 정보 저장
      const fileStmt = this.db.prepare(`
        INSERT OR REPLACE INTO files (
          file_path, language, notion_id, last_modified, analysis_time,
          parser_version, content_hash, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `);

      const fileInfo = fileStmt.run(
        result.filePath,
        result.language,
        null, // notion_id는 별도로 설정
        Math.floor(Date.now() / 1000),
        result.analysisTime,
        '1.0.0', // parser version
        'unknown' // content hash
      );

      const fileId = fileInfo.lastInsertRowid as number;

      // 기존 관련 데이터 삭제
      this.db.prepare('DELETE FROM dependencies WHERE file_id = ?').run(fileId);
      this.db.prepare('DELETE FROM functions WHERE file_id = ?').run(fileId);
      this.db.prepare('DELETE FROM classes WHERE file_id = ?').run(fileId);
      this.db.prepare('DELETE FROM variables WHERE file_id = ?').run(fileId);
      this.db.prepare('DELETE FROM exports WHERE file_id = ?').run(fileId);

      // 의존성 저장
      const depStmt = this.db.prepare(`
        INSERT INTO dependencies (
          file_id, source, type, location, resolved, is_local, is_dynamic
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const dep of result.dependencies) {
        depStmt.run(
          fileId,
          dep.source,
          dep.type,
          JSON.stringify(dep.location),
          dep.resolved || null,
          dep.isLocal,
          dep.isDynamic || false
        );
      }

      // 함수 저장
      const funcStmt = this.db.prepare(`
        INSERT INTO functions (
          file_id, name, type, params, return_type, location,
          is_async, is_generator, is_exported
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const func of result.functions) {
        funcStmt.run(
          fileId,
          func.name,
          func.type || 'function',
          JSON.stringify(func.params),
          func.returnType || null,
          JSON.stringify(func.location),
          func.isAsync || false,
          func.isGenerator || false,
          func.isExported || false
        );
      }

      // 클래스 저장
      const classStmt = this.db.prepare(`
        INSERT INTO classes (
          file_id, name, extends, implements, location, is_exported, is_abstract
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const cls of result.classes) {
        classStmt.run(
          fileId,
          cls.name,
          cls.extends || null,
          cls.implements ? JSON.stringify(cls.implements) : null,
          JSON.stringify(cls.location),
          cls.isExported || false,
          cls.isAbstract || false
        );
      }

      // 변수 저장
      const varStmt = this.db.prepare(`
        INSERT INTO variables (
          file_id, name, type, kind, is_exported, location
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const variable of result.variables) {
        varStmt.run(
          fileId,
          variable.name,
          variable.type || null,
          variable.kind,
          variable.isExported || false,
          JSON.stringify(variable.location)
        );
      }

      // 트랜잭션 커밋
      this.db.exec('COMMIT');

    } catch (error) {
      // 트랜잭션 롤백
      this.db.exec('ROLLBACK');
      throw new Error(`Failed to save analysis result: ${error.message}`);
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  close(): void {
    this.db.close();
  }

  /**
   * 데이터베이스 백업
   */
  backup(backupPath: string): void {
    this.db.exec(`VACUUM INTO '${backupPath}'`);
  }
}

// 싱글톤 인스턴스
export const analysisIndexManager = new AnalysisIndexManager();