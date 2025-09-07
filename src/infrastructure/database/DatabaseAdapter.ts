/**
 * 🔧 Database Adapter Interface
 * bun:sqlite 전용 데이터베이스 어댑터
 */

import { Database } from 'bun:sqlite';

/**
 * 테이블 정보 인터페이스
 */
export interface TableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: any;
  pk: boolean;
}

/**
 * 데이터베이스 어댑터 인터페이스
 * bun:sqlite 최적화된 인터페이스
 */
export interface IDatabaseAdapter {
  /**
   * SQL 쿼리 실행 (결과 반환)
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * SQL 쿼리 실행 (단일 결과)
   */
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  /**
   * SQL 실행 (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid?: number }>;

  /**
   * 트랜잭션 실행 (비동기)
   */
  transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;

  /**
   * 트랜잭션 실행 (동기)
   */
  transactionSync<T>(fn: (adapter: IDatabaseAdapter) => T): T;

  /**
   * 데이터베이스 연결 종료
   */
  close(): void;

  /**
   * 스키마 정보 조회
   */
  getTableInfo(tableName: string): Promise<TableInfo[]>;

  /**
   * 테이블 존재 여부 확인
   */
  tableExists(tableName: string): Promise<boolean>;

  /**
   * 데이터베이스 백업
   */
  backup(destinationPath: string): Promise<void>;
}

/**
 * Bun SQLite 어댑터 구현체
 * bun:sqlite 전용 최적화된 구현
 */
export class BunSqliteAdapter implements IDatabaseAdapter {
  private db: Database;

  constructor(databasePath: string = ':memory:', options?: { 
    create?: boolean;
    readwrite?: boolean;
    readonly?: boolean;
  }) {
    this.db = new Database(databasePath, options);
    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기 설정
   */
  private initializeDatabase(): void {
    // WAL 모드 활성화로 성능 향상
    this.db.exec('PRAGMA journal_mode = WAL');
    
    // 외래 키 제약 조건 활성화
    this.db.exec('PRAGMA foreign_keys = ON');
    
    // 동기화 모드 최적화 (성능 vs 안정성)
    this.db.exec('PRAGMA synchronous = NORMAL');
    
    // 캐시 크기 최적화 (10MB)
    this.db.exec('PRAGMA cache_size = -10240');
    
    // 임시 저장소를 메모리에 저장
    this.db.exec('PRAGMA temp_store = MEMORY');
    
    // 자동 VACUUM 활성화
    this.db.exec('PRAGMA auto_vacuum = INCREMENTAL');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.query(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      throw new Error(`Query failed: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
    }
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const stmt = this.db.query(sql);
      const result = stmt.get(...params) as T | undefined;
      return result || null;
    } catch (error) {
      throw new Error(`QueryOne failed: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid?: number }> {
    try {
      const stmt = this.db.query(sql);
      const result = stmt.run(...params);
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowID
      };
    } catch (error) {
      throw new Error(`Execute failed: ${error.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
    }
  }

  async transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(async () => {
      return await fn(this);
    });
    return transaction();
  }

  transactionSync<T>(fn: (adapter: IDatabaseAdapter) => T): T {
    const transaction = this.db.transaction(() => {
      return fn(this);
    });
    return transaction();
  }

  close(): void {
    this.db.close();
  }

  async getTableInfo(tableName: string): Promise<TableInfo[]> {
    const sql = `PRAGMA table_info(${tableName})`;
    return this.query<TableInfo>(sql);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const sql = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=? 
      LIMIT 1
    `;
    const result = await this.queryOne(sql, [tableName]);
    return result !== null;
  }

  async backup(destinationPath: string): Promise<void> {
    try {
      // Bun의 파일 시스템을 사용한 백업
      const fs = await import('fs/promises');
      await fs.copyFile(this.db.filename, destinationPath);
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Bun SQLite 특화 메서드들
   */
  
  /**
   * PRAGMA 실행
   */
  pragma(statement: string): any {
    const stmt = this.db.query(`PRAGMA ${statement}`);
    return stmt.get();
  }

  /**
   * SQL 실행 (빠른 실행용)
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * 데이터베이스 파일명
   */
  get filename(): string {
    return this.db.filename;
  }

  /**
   * WAL 모드 체크포인트
   */
  checkpoint(): void {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  /**
   * 데이터베이스 통계
   */
  getStats(): {
    pageCount: number;
    pageSize: number;
    cacheSize: number;
    walSize: number;
  } {
    const pageCount = this.pragma('page_count');
    const pageSize = this.pragma('page_size');
    const cacheSize = this.pragma('cache_size');
    
    let walSize = 0;
    try {
      const walInfo = this.pragma('wal_checkpoint');
      walSize = walInfo ? walInfo.wal_size || 0 : 0;
    } catch {
      // WAL 모드가 아닌 경우 무시
    }

    return {
      pageCount: pageCount?.page_count || 0,
      pageSize: pageSize?.page_size || 4096,
      cacheSize: Math.abs(cacheSize?.cache_size || 0),
      walSize
    };
  }

  /**
   * 데이터베이스 최적화
   */
  optimize(): void {
    // VACUUM으로 데이터베이스 최적화
    this.db.exec('PRAGMA incremental_vacuum');
    
    // 통계 정보 업데이트
    this.db.exec('ANALYZE');
    
    // WAL 체크포인트
    this.checkpoint();
  }
}

/**
 * 데이터베이스 어댑터 팩토리
 */
export class DatabaseAdapterFactory {
  /**
   * 기본 bun:sqlite 어댑터 생성
   */
  static create(databasePath: string, options?: {
    create?: boolean;
    readwrite?: boolean;
    readonly?: boolean;
  }): IDatabaseAdapter {
    return new BunSqliteAdapter(databasePath, {
      create: true,
      readwrite: true,
      ...options
    });
  }

  /**
   * 메모리 데이터베이스 생성 (테스트용)
   */
  static createInMemory(): IDatabaseAdapter {
    return new BunSqliteAdapter(':memory:', {
      create: true,
      readwrite: true
    });
  }

  /**
   * 읽기 전용 데이터베이스
   */
  static createReadOnly(databasePath: string): IDatabaseAdapter {
    return new BunSqliteAdapter(databasePath, {
      readonly: true
    });
  }
}