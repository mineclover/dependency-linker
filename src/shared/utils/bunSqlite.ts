/**
 * Universal SQLite Database Wrapper - Clean Architecture Shared Layer
 * Uses Bun SQLite in Bun environment, better-sqlite3 in Node environment
 */

import { logger } from './index.js';
import type { SqliteParameters, SqliteValue } from '../types/database.js';

// Detect runtime environment and import appropriate database
const isBun = typeof Bun !== 'undefined';
let DatabaseImpl: any;

try {
  if (isBun) {
    // Use dynamic import for Bun environment
    DatabaseImpl = require('bun:sqlite').Database;
  } else {
    // Use better-sqlite3 for Node environment
    DatabaseImpl = require('better-sqlite3');
  }
} catch (error) {
  logger.warning(`Failed to import ${isBun ? 'bun:sqlite' : 'better-sqlite3'}: ${error}`);
  
  // Fallback to the other implementation
  try {
    if (isBun) {
      DatabaseImpl = require('better-sqlite3');
    } else {
      // If we're in Node and both fail, create a mock for testing
      logger.error('No SQLite implementation available, creating mock for testing');
      DatabaseImpl = class MockDatabase {
        constructor() {
          logger.warning('Using mock SQLite database for testing');
        }
        exec() { return this; }
        prepare() { 
          return {
            get: () => undefined,
            all: () => [],
            run: () => ({ changes: 0, lastInsertRowid: 0 })
          };
        }
        close() {}
        get open() { return true; }
        get name() { return ':memory:'; }
        get inTransaction() { return false; }
      };
    }
  } catch (fallbackError) {
    logger.error(`Fallback also failed: ${fallbackError}`);
    throw new Error('No SQLite implementation available');
  }
}

export interface QueryResult {
  changes: number;
  lastInsertRowid: number;
}

export interface DatabaseOptions {
  readonly?: boolean;
  create?: boolean;
  strict?: boolean;
}

/**
 * Universal SQLite Database Wrapper
 * Provides compatibility with both Bun SQLite and better-sqlite3 APIs
 */
export class Database {
  private db: any;
  private isOpen: boolean = false;
  private filepath: string;
  private usingBun: boolean = isBun;

  constructor(filepath: string, options?: DatabaseOptions) {
    this.filepath = filepath;
    
    try {
      if (this.usingBun && DatabaseImpl) {
        // Bun SQLite constructor
        this.db = new DatabaseImpl(filepath, {
          readonly: options?.readonly || false,
          create: options?.create !== false, // Default to true
          strict: options?.strict || false
        });
      } else {
        // better-sqlite3 constructor
        this.db = new DatabaseImpl(filepath, {
          readonly: options?.readonly || false,
          fileMustExist: !(options?.create !== false)
        });
      }
      
      this.isOpen = true;
      
      // Enable WAL mode for better concurrency
      if (!options?.readonly) {
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA synchronous = NORMAL;');
        this.db.exec('PRAGMA cache_size = 1000;');
        this.db.exec('PRAGMA temp_store = memory;');
        this.db.exec('PRAGMA mmap_size = 268435456;'); // 256MB
      }
      
      logger.debug(`SQLite database opened: ${filepath}`);
    } catch (error) {
      logger.error(`Failed to open SQLite database: ${error}`);
      throw error;
    }
  }

  /**
   * Execute a SQL statement (for INSERT, UPDATE, DELETE)
   */
  exec(sql: string): Database {
    this.checkOpen();
    try {
      this.db.exec(sql);
      return this;
    } catch (error) {
      logger.error(`SQL exec failed: ${error}`);
      throw error;
    }
  }

  /**
   * Prepare a SQL statement
   */
  prepare<T = any>(sql: string): PreparedStatement<T> {
    this.checkOpen();
    try {
      const stmt = this.db.prepare(sql);
      return new PreparedStatement<T>(stmt, sql, this.usingBun);
    } catch (error) {
      logger.error(`SQL prepare failed: ${error}`);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  transaction<T extends (...args: unknown[]) => unknown>(fn: T): T {
    this.checkOpen();
    return this.db.transaction(fn) as T;
  }

  /**
   * Close the database
   */
  close(): void {
    if (this.isOpen) {
      this.db.close();
      this.isOpen = false;
      logger.debug(`SQLite database closed: ${this.filepath}`);
    }
  }

  /**
   * Check if database is open
   */
  get open(): boolean {
    return this.isOpen;
  }

  /**
   * Get database filename
   */
  get name(): string {
    return this.filepath;
  }

  /**
   * Get database in WAL mode status
   */
  get inTransaction(): boolean {
    return this.db.inTransaction;
  }

  /**
   * Checkpoint WAL file
   */
  checkpoint(mode?: 'passive' | 'full' | 'restart' | 'truncate'): void {
    this.checkOpen();
    const sql = mode ? `PRAGMA wal_checkpoint(${mode});` : 'PRAGMA wal_checkpoint;';
    this.db.exec(sql);
  }

  /**
   * Analyze database for query optimization
   */
  analyze(table?: string): void {
    this.checkOpen();
    const sql = table ? `ANALYZE ${table};` : 'ANALYZE;';
    this.db.exec(sql);
  }

  /**
   * Vacuum database (optimize storage)
   */
  vacuum(): void {
    this.checkOpen();
    this.db.exec('VACUUM;');
  }

  /**
   * Get database size statistics
   */
  getDatabaseInfo(): {
    pageCount: number;
    pageSize: number;
    totalSize: number;
    freePages: number;
  } {
    this.checkOpen();
    
    const pageCount = this.db.prepare('PRAGMA page_count;').get() as { page_count: number };
    const pageSize = this.db.prepare('PRAGMA page_size;').get() as { page_size: number };
    const freelist = this.db.prepare('PRAGMA freelist_count;').get() as { freelist_count: number };
    
    return {
      pageCount: pageCount.page_count,
      pageSize: pageSize.page_size,
      totalSize: pageCount.page_count * pageSize.page_size,
      freePages: freelist.freelist_count
    };
  }

  private checkOpen(): void {
    if (!this.isOpen) {
      throw new Error('Database is not open');
    }
  }
}

/**
 * Prepared Statement Wrapper
 * Provides compatibility between Bun SQLite and better-sqlite3 APIs
 */
export class PreparedStatement<T = any> {
  private stmt: any;
  private sql: string;
  private usingBun: boolean;

  constructor(stmt: any, sql: string, usingBun: boolean = false) {
    this.stmt = stmt;
    this.sql = sql;
    this.usingBun = usingBun;
  }

  /**
   * Execute statement and return first row
   */
  get(params?: SqliteParameters): T | undefined {
    try {
      return params ? this.stmt.get(params) : this.stmt.get();
    } catch (error) {
      logger.error(`SQL get failed: ${error}`);
      throw error;
    }
  }

  /**
   * Execute statement and return all rows
   */
  all(params?: SqliteParameters): T[] {
    try {
      return params ? this.stmt.all(params) : this.stmt.all();
    } catch (error) {
      logger.error(`SQL all failed: ${error}`);
      throw error;
    }
  }

  /**
   * Execute statement (for INSERT, UPDATE, DELETE)
   */
  run(params?: SqliteParameters): QueryResult {
    try {
      const result = params ? this.stmt.run(params) : this.stmt.run();
      
      // Handle different return types between Bun and better-sqlite3
      if (this.usingBun) {
        return {
          changes: result.changes || 0,
          lastInsertRowid: result.lastInsertRowid || 0
        };
      } else {
        // better-sqlite3 format
        return {
          changes: result.changes || 0,
          lastInsertRowid: result.lastInsertRowid || result.lastInsertId || 0
        };
      }
    } catch (error) {
      logger.error(`SQL run failed: ${error}`);
      throw error;
    }
  }

  /**
   * Bind parameters to statement (returns new instance)
   */
  bind(...params: SqliteValue[]): PreparedStatement<T> {
    try {
      const boundStmt = this.stmt.bind(...params);
      return new PreparedStatement<T>(boundStmt, this.sql, this.usingBun);
    } catch (error) {
      logger.error(`SQL bind failed: ${error}`);
      throw error;
    }
  }

  /**
   * Finalize the statement (cleanup)
   */
  finalize(): void {
    // Bun SQLite automatically manages statement lifecycle
    // This method exists for compatibility
  }

  /**
   * Get the SQL source
   */
  get source(): string {
    return this.sql;
  }
}

/**
 * Database Factory
 * Creates database instances with common configurations
 */
export class DatabaseFactory {
  /**
   * Create a new database with default configuration
   */
  static create(filepath: string, options?: DatabaseOptions): Database {
    return new Database(filepath, {
      create: true,
      strict: false,
      ...options
    });
  }

  /**
   * Create a read-only database
   */
  static createReadOnly(filepath: string): Database {
    return new Database(filepath, {
      readonly: true,
      create: false
    });
  }

  /**
   * Create an in-memory database
   */
  static createInMemory(): Database {
    return new Database(':memory:');
  }

  /**
   * Create a temporary database
   */
  static createTemp(): Database {
    return new Database('');
  }
}

// Export default Database class for better-sqlite3 compatibility
export default Database;