/**
 * File Tracker - Clean Architecture Implementation
 * Tracks file synchronization status with Notion
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Database } from 'bun:sqlite';
import type { FileStatus } from '../../shared/types/index.js';

export interface SyncStats {
  total: number;
  synced: number;
  needsUpdate: number;
  notSynced: number;
  errors: number;
}

export interface CleanupResult {
  removed: number;
  retained: number;
}

export class FileTracker {
  private db: Database | null = null;
  private dbPath: string;

  constructor(private projectPath: string) {
    this.dbPath = path.join(projectPath, '.deplink', 'file-tracker.db');
  }

  /**
   * Initialize the file tracker database
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Open database using bun:sqlite
    this.db = new Database(this.dbPath);

    // Create tables if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        relative_path TEXT NOT NULL,
        size INTEGER,
        last_modified TEXT,
        last_synced TEXT,
        notion_page_id TEXT,
        sync_status TEXT DEFAULT 'new',
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_file_path ON files(file_path);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON files(sync_status);
      CREATE INDEX IF NOT EXISTS idx_notion_page_id ON files(notion_page_id);
    `);
  }

  /**
   * Get file status by path
   */
  async getFileStatus(filePath: string): Promise<FileStatus | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.query('SELECT * FROM files WHERE file_path = ?').get(filePath);

    if (!row) return null;

    return {
      filePath: row.file_path,
      relativePath: row.relative_path,
      size: row.size,
      lastModified: new Date(row.last_modified),
      lastSynced: row.last_synced ? new Date(row.last_synced) : undefined,
      notionPageId: row.notion_page_id,
      syncStatus: row.sync_status as FileStatus['syncStatus'],
      error: row.error
    };
  }

  /**
   * Update file status
   */
  async updateFileStatus(relativePath: string, status: Partial<FileStatus>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const filePath = path.join(this.projectPath, relativePath);
    const existing = await this.getFileStatus(filePath);

    if (existing) {
      // Update existing record
      this.db.query(`
        UPDATE files SET
          size = ?,
          last_modified = ?,
          last_synced = ?,
          notion_page_id = ?,
          sync_status = ?,
          error = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE file_path = ?
      `).run(
        status.size || existing.size,
        status.lastModified?.toISOString() || existing.lastModified.toISOString(),
        status.lastSynced?.toISOString() || existing.lastSynced?.toISOString(),
        status.notionPageId || existing.notionPageId,
        status.syncStatus || existing.syncStatus,
        status.error || null,
        filePath
      );
    } else {
      // Insert new record
      this.db.query(`
        INSERT INTO files (
          file_path, relative_path, size, last_modified,
          last_synced, notion_page_id, sync_status, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        filePath,
        relativePath,
        status.size || 0,
        status.lastModified?.toISOString() || new Date().toISOString(),
        status.lastSynced?.toISOString(),
        status.notionPageId,
        status.syncStatus || 'new',
        status.error
      );
    }
  }

  /**
   * Get all source files
   */
  async getAllSourceFiles(): Promise<FileStatus[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.query('SELECT * FROM files ORDER BY relative_path').all();

    return rows.map(row => ({
      filePath: row.file_path,
      relativePath: row.relative_path,
      size: row.size,
      lastModified: new Date(row.last_modified),
      lastSynced: row.last_synced ? new Date(row.last_synced) : undefined,
      notionPageId: row.notion_page_id,
      syncStatus: row.sync_status as FileStatus['syncStatus'],
      error: row.error
    }));
  }

  /**
   * Get files needing sync
   */
  async getFilesNeedingSync(): Promise<FileStatus[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.query(`
        SELECT * FROM files 
        WHERE sync_status IN ('new', 'modified', 'error')
        ORDER BY relative_path
      `).all();

    return rows.map(row => ({
      filePath: row.file_path,
      relativePath: row.relative_path,
      size: row.size,
      lastModified: new Date(row.last_modified),
      lastSynced: row.last_synced ? new Date(row.last_synced) : undefined,
      notionPageId: row.notion_page_id,
      syncStatus: row.sync_status as FileStatus['syncStatus'],
      error: row.error
    }));
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = this.db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN sync_status = 'modified' THEN 1 ELSE 0 END) as needsUpdate,
        SUM(CASE WHEN sync_status = 'new' THEN 1 ELSE 0 END) as notSynced,
        SUM(CASE WHEN sync_status = 'error' THEN 1 ELSE 0 END) as errors
      FROM files
    `).get();

    return {
      total: stats.total || 0,
      synced: stats.synced || 0,
      needsUpdate: stats.needsUpdate || 0,
      notSynced: stats.notSynced || 0,
      errors: stats.errors || 0
    };
  }

  /**
   * Clean up orphaned entries
   */
  async cleanup(): Promise<CleanupResult> {
    if (!this.db) throw new Error('Database not initialized');

    const allFiles = this.db.query('SELECT file_path FROM files').all();

    let removed = 0;
    let retained = 0;

    for (const row of allFiles) {
      try {
        await fs.access(row.file_path);
        retained++;
      } catch {
        // File doesn't exist, remove from database
        this.db.query('DELETE FROM files WHERE file_path = ?').run(row.file_path);
        removed++;
      }
    }

    return { removed, retained };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}