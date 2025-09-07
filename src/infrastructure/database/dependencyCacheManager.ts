/**
 * Dependency Cache Manager
 * 의존성 분석 결과를 SQLite에 캐싱하고 관리
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { Database } from '../../shared/utils/index.js';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { logger } from '../../shared/utils/index.js';

export interface FileMetadata {
  id?: number;
  filePath: string;
  relativePath: string;
  fileHash: string;
  fileSize: number;
  lastModified: number;
  extension: string;
  projectPath: string;
  notionId?: string;
  syncStatus?: string;
}

export interface DirectDependency {
  id?: number;
  sourceFileId: number;
  targetFileId: number;
  dependencyType: 'import' | 'require' | 'dynamic_import';
  importStatement: string;
  specifiers: string;
  lineNumber: number;
  isResolved: boolean;
}

export interface PatternReference {
  id?: number;
  pattern: string;
  patternType: 'glob' | 'regex' | 'prefix' | 'suffix';
  scopeType: 'documentation' | 'configuration' | 'test' | 'build';
  ownerFileId?: number;
  description?: string;
}

export interface PatternMatch {
  id?: number;
  patternId: number;
  matchedFileId: number;
  matchConfidence: number;
  matchReason: string;
  isActive: boolean;
}

export interface DocumentCodeLink {
  id?: number;
  documentFileId: number;
  codeFileId?: number;
  patternId?: number;
  linkType: 'direct' | 'pattern' | 'mention' | 'example';
  linkContext?: string;
  lineNumber?: number;
}

export class DependencyCacheManager {
  private db: Database.Database;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const dbPath = path.join(projectPath, '.deplink', 'dependencies.db');
    
    // 디렉토리 생성 확인
    const dbDir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  private initializeDatabase(): void {
    try {
      // 직접 스키마 생성 (schema.sql 파일 의존성 제거)
      const schema = `
        -- Files table
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          relative_path TEXT NOT NULL,
          file_hash TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          last_modified REAL NOT NULL,
          extension TEXT,
          project_path TEXT NOT NULL,
          notion_id TEXT,
          sync_status TEXT DEFAULT 'pending',
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path);
        CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
        CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_path);

        -- Direct dependencies table
        CREATE TABLE IF NOT EXISTS direct_dependencies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_file_id INTEGER NOT NULL,
          target_file_id INTEGER NOT NULL,
          dependency_type TEXT NOT NULL CHECK (dependency_type IN ('import', 'require', 'dynamic_import')),
          import_statement TEXT NOT NULL,
          specifiers TEXT,
          line_number INTEGER,
          is_resolved BOOLEAN DEFAULT FALSE,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (source_file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (target_file_id) REFERENCES files(id) ON DELETE CASCADE,
          UNIQUE(source_file_id, target_file_id, import_statement)
        );

        CREATE INDEX IF NOT EXISTS idx_deps_source ON direct_dependencies(source_file_id);
        CREATE INDEX IF NOT EXISTS idx_deps_target ON direct_dependencies(target_file_id);

        -- Pattern references table
        CREATE TABLE IF NOT EXISTS pattern_references (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT NOT NULL,
          pattern_type TEXT NOT NULL CHECK (pattern_type IN ('glob', 'regex', 'prefix', 'suffix')),
          scope_type TEXT NOT NULL CHECK (scope_type IN ('documentation', 'configuration', 'test', 'build')),
          owner_file_id INTEGER,
          description TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (owner_file_id) REFERENCES files(id) ON DELETE SET NULL,
          UNIQUE(pattern, pattern_type, owner_file_id)
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_type ON pattern_references(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_patterns_scope ON pattern_references(scope_type);

        -- Pattern matching results table
        CREATE TABLE IF NOT EXISTS pattern_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern_id INTEGER NOT NULL,
          matched_file_id INTEGER NOT NULL,
          match_confidence REAL DEFAULT 0.0,
          match_reason TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (pattern_id) REFERENCES pattern_references(id) ON DELETE CASCADE,
          FOREIGN KEY (matched_file_id) REFERENCES files(id) ON DELETE CASCADE,
          UNIQUE(pattern_id, matched_file_id)
        );

        CREATE INDEX IF NOT EXISTS idx_matches_pattern ON pattern_matches(pattern_id);
        CREATE INDEX IF NOT EXISTS idx_matches_file ON pattern_matches(matched_file_id);
        CREATE INDEX IF NOT EXISTS idx_matches_active ON pattern_matches(is_active);

        -- Document-code links table
        CREATE TABLE IF NOT EXISTS document_code_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_file_id INTEGER NOT NULL,
          code_file_id INTEGER,
          pattern_id INTEGER,
          link_type TEXT NOT NULL CHECK (link_type IN ('direct', 'pattern', 'mention', 'example')),
          link_context TEXT,
          line_number INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (document_file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (code_file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (pattern_id) REFERENCES pattern_references(id) ON DELETE CASCADE,
          CHECK ((code_file_id IS NOT NULL) OR (pattern_id IS NOT NULL))
        );

        CREATE INDEX IF NOT EXISTS idx_doc_links_doc ON document_code_links(document_file_id);
        CREATE INDEX IF NOT EXISTS idx_doc_links_code ON document_code_links(code_file_id);

        -- Analysis cache table
        CREATE TABLE IF NOT EXISTS analysis_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER NOT NULL,
          cache_key TEXT NOT NULL,
          cache_data TEXT,
          expires_at INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          UNIQUE(file_id, cache_key)
        );

        CREATE INDEX IF NOT EXISTS idx_cache_file ON analysis_cache(file_id);
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON analysis_cache(expires_at);

        -- Circular dependencies table
        CREATE TABLE IF NOT EXISTS circular_dependencies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle_path TEXT NOT NULL,
          cycle_length INTEGER NOT NULL,
          severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
          detected_at INTEGER DEFAULT (strftime('%s', 'now')),
          UNIQUE(cycle_path)
        );

        CREATE INDEX IF NOT EXISTS idx_circular_severity ON circular_dependencies(severity);
      `;
      
      this.db.exec(schema);
      logger.info('의존성 캐시 데이터베이스 초기화 완료');
    } catch (error) {
      logger.error(`데이터베이스 초기화 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 파일 메타데이터 저장/업데이트
   */
  async upsertFile(fileMetadata: FileMetadata): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO files (
        file_path, relative_path, file_hash, file_size, 
        last_modified, extension, project_path, notion_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        relative_path = excluded.relative_path,
        file_hash = excluded.file_hash,
        file_size = excluded.file_size,
        last_modified = excluded.last_modified,
        extension = excluded.extension,
        notion_id = excluded.notion_id,
        sync_status = excluded.sync_status,
        updated_at = strftime('%s', 'now')
    `);

    const result = stmt.run(
      fileMetadata.filePath,
      fileMetadata.relativePath,
      fileMetadata.fileHash,
      fileMetadata.fileSize,
      fileMetadata.lastModified,
      fileMetadata.extension,
      fileMetadata.projectPath,
      fileMetadata.notionId,
      fileMetadata.syncStatus || 'pending'
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 파일 해시 계산
   */
  async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
  }

  /**
   * 직접 의존성 저장
   */
  async saveDependency(dependency: DirectDependency): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO direct_dependencies (
        source_file_id, target_file_id, dependency_type,
        import_statement, specifiers, line_number, is_resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dependency.sourceFileId,
      dependency.targetFileId,
      dependency.dependencyType,
      dependency.importStatement,
      dependency.specifiers,
      dependency.lineNumber,
      dependency.isResolved
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 패턴 참조 저장
   */
  async savePatternReference(pattern: PatternReference): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pattern_references (
        pattern, pattern_type, scope_type, owner_file_id, description
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pattern.pattern,
      pattern.patternType,
      pattern.scopeType,
      pattern.ownerFileId,
      pattern.description
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 패턴 매칭 수행 및 캐시
   */
  async performPatternMatching(patternId: number): Promise<PatternMatch[]> {
    const pattern = this.getPatternReference(patternId);
    if (!pattern) return [];

    const allFiles = this.getAllFiles();
    const matches: PatternMatch[] = [];

    for (const file of allFiles) {
      const matchResult = this.evaluatePatternMatch(pattern, file);
      if (matchResult.isMatch) {
        const match: PatternMatch = {
          patternId,
          matchedFileId: file.id!,
          matchConfidence: matchResult.confidence,
          matchReason: matchResult.reason,
          isActive: true
        };

        const matchId = await this.savePatternMatch(match);
        matches.push({ ...match, id: matchId });
      }
    }

    return matches;
  }

  /**
   * 패턴 매칭 평가 로직
   */
  private evaluatePatternMatch(pattern: PatternReference, file: FileMetadata): {
    isMatch: boolean;
    confidence: number;
    reason: string;
  } {
    let isMatch = false;
    let confidence = 0;
    let reason = '';

    switch (pattern.patternType) {
      case 'glob':
        isMatch = minimatch(file.relativePath, pattern.pattern);
        confidence = isMatch ? 1.0 : 0;
        reason = `glob pattern match: ${pattern.pattern}`;
        break;

      case 'regex':
        try {
          const regex = new RegExp(pattern.pattern);
          isMatch = regex.test(file.relativePath);
          confidence = isMatch ? 0.9 : 0;
          reason = `regex pattern match: ${pattern.pattern}`;
        } catch (error) {
          isMatch = false;
          confidence = 0;
          reason = `invalid regex pattern: ${pattern.pattern}`;
        }
        break;

      case 'prefix':
        isMatch = file.relativePath.startsWith(pattern.pattern);
        confidence = isMatch ? 0.8 : 0;
        reason = `prefix match: ${pattern.pattern}`;
        break;

      case 'suffix':
        isMatch = file.relativePath.endsWith(pattern.pattern);
        confidence = isMatch ? 0.7 : 0;
        reason = `suffix match: ${pattern.pattern}`;
        break;
    }

    // 스코프 타입에 따른 신뢰도 조정
    if (isMatch) {
      switch (pattern.scopeType) {
        case 'documentation':
          if (file.extension === '.md') confidence *= 1.2;
          break;
        case 'test':
          if (file.relativePath.includes('test') || file.relativePath.includes('spec')) {
            confidence *= 1.1;
          }
          break;
        case 'configuration':
          if (['.json', '.yaml', '.yml', '.toml', '.ini'].includes(file.extension)) {
            confidence *= 1.1;
          }
          break;
      }
    }

    return {
      isMatch,
      confidence: Math.min(confidence, 1.0),
      reason
    };
  }

  /**
   * 패턴 매칭 결과 저장
   */
  async savePatternMatch(match: PatternMatch): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pattern_matches (
        pattern_id, matched_file_id, match_confidence, match_reason, is_active
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      match.patternId,
      match.matchedFileId,
      match.matchConfidence,
      match.matchReason,
      match.isActive
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 문서-코드 링크 저장
   */
  async saveDocumentCodeLink(link: DocumentCodeLink): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO document_code_links (
        document_file_id, code_file_id, pattern_id, link_type, link_context, line_number
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      link.documentFileId,
      link.codeFileId,
      link.patternId,
      link.linkType,
      link.linkContext,
      link.lineNumber
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 파일의 직접 의존성 조회
   */
  getFileDependencies(fileId: number): DirectDependency[] {
    const stmt = this.db.prepare(`
      SELECT dd.*, tf.file_path as target_path
      FROM direct_dependencies dd
      JOIN files tf ON dd.target_file_id = tf.id
      WHERE dd.source_file_id = ?
    `);
    return stmt.all(fileId);
  }

  /**
   * 파일을 의존하는 파일들 조회
   */
  getFileDependents(fileId: number): DirectDependency[] {
    const stmt = this.db.prepare(`
      SELECT dd.*, sf.file_path as source_path
      FROM direct_dependencies dd
      JOIN files sf ON dd.source_file_id = sf.id
      WHERE dd.target_file_id = ?
    `);
    return stmt.all(fileId);
  }

  /**
   * 패턴으로 연결된 파일들 조회
   */
  getPatternMatches(patternId: number): PatternMatch[] {
    const stmt = this.db.prepare(`
      SELECT pm.*, f.file_path, f.relative_path
      FROM pattern_matches pm
      JOIN files f ON pm.matched_file_id = f.id
      WHERE pm.pattern_id = ? AND pm.is_active = 1
      ORDER BY pm.match_confidence DESC
    `);
    return stmt.all(patternId);
  }

  /**
   * 문서의 코드 연결 조회
   */
  getDocumentCodeLinks(documentFileId: number): DocumentCodeLink[] {
    const stmt = this.db.prepare(`
      SELECT dcl.*, 
             cf.file_path as code_file_path,
             pr.pattern as pattern_text
      FROM document_code_links dcl
      LEFT JOIN files cf ON dcl.code_file_id = cf.id
      LEFT JOIN pattern_references pr ON dcl.pattern_id = pr.id
      WHERE dcl.document_file_id = ?
    `);
    return stmt.all(documentFileId);
  }

  /**
   * 순환 의존성 감지 및 저장
   */
  detectAndSaveCircularDependencies(): void {
    const cycles = this.findCircularDependencies();
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO circular_dependencies (cycle_path, cycle_length, severity)
      VALUES (?, ?, ?)
    `);

    for (const cycle of cycles) {
      const severity = cycle.length > 5 ? 'error' : cycle.length > 3 ? 'warning' : 'info';
      stmt.run(JSON.stringify(cycle), cycle.length, severity);
    }
  }

  /**
   * 순환 의존성 탐지 알고리즘 (DFS 기반)
   */
  private findCircularDependencies(): number[][] {
    const graph = this.buildDependencyGraph();
    const visited = new Set<number>();
    const recStack = new Set<number>();
    const cycles: number[][] = [];

    const dfs = (node: number, path: number[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycles.push(cycle);
        }
      }

      recStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * 의존성 그래프 구성
   */
  private buildDependencyGraph(): Map<number, number[]> {
    const stmt = this.db.prepare(`
      SELECT source_file_id, target_file_id FROM direct_dependencies
    `);
    const dependencies = stmt.all() as { source_file_id: number; target_file_id: number }[];

    const graph = new Map<number, number[]>();
    for (const dep of dependencies) {
      if (!graph.has(dep.source_file_id)) {
        graph.set(dep.source_file_id, []);
      }
      graph.get(dep.source_file_id)!.push(dep.target_file_id);
    }

    return graph;
  }

  /**
   * 캐시 무효화 (파일 변경 시)
   */
  async invalidateFileCache(fileId: number): Promise<void> {
    const transaction = this.db.transaction(() => {
      // 직접 의존성 삭제
      this.db.prepare('DELETE FROM direct_dependencies WHERE source_file_id = ?').run(fileId);
      
      // 패턴 매칭 비활성화 (재매칭 필요)
      this.db.prepare(`
        UPDATE pattern_matches SET is_active = 0 
        WHERE matched_file_id = ?
      `).run(fileId);
      
      // 문서 링크 제거
      this.db.prepare('DELETE FROM document_code_links WHERE code_file_id = ?').run(fileId);
    });

    transaction();
  }

  /**
   * 통계 조회
   */
  getStatistics(): any {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_files,
        (SELECT COUNT(*) FROM direct_dependencies) as direct_dependencies,
        (SELECT COUNT(*) FROM pattern_references) as pattern_references,
        (SELECT COUNT(*) FROM pattern_matches WHERE is_active = 1) as active_pattern_matches,
        (SELECT COUNT(*) FROM document_code_links) as document_code_links,
        (SELECT COUNT(*) FROM circular_dependencies) as circular_dependencies
      FROM files
    `).get();

    return stats;
  }

  /**
   * 리소스 정리
   */
  close(): void {
    this.db.close();
  }

  /**
   * 파일 경로로 파일 메타데이터 조회
   */
  getFileByPath(filePath: string): FileMetadata | null {
    const stmt = this.db.prepare('SELECT * FROM files WHERE file_path = ?');
    return stmt.get(filePath) as FileMetadata || null;
  }

  /**
   * 파일 ID로 파일 메타데이터 조회
   */
  getFileById(fileId: number): FileMetadata | null {
    const stmt = this.db.prepare('SELECT * FROM files WHERE id = ?');
    return stmt.get(fileId) as FileMetadata || null;
  }

  /**
   * 패턴 ID로 패턴 참조 조회
   */
  getPatternById(patternId: number): PatternReference | null {
    const stmt = this.db.prepare('SELECT * FROM pattern_references WHERE id = ?');
    return stmt.get(patternId) as PatternReference || null;
  }

  /**
   * 순환 의존성 조회
   */
  getCircularDependencies(): any[] {
    const stmt = this.db.prepare('SELECT * FROM circular_dependencies ORDER BY cycle_length ASC');
    return stmt.all();
  }

  /**
   * 파일 해시로 기존 파일 조회
   */
  getFileByHash(fileHash: string): FileMetadata | null {
    const stmt = this.db.prepare('SELECT * FROM files WHERE file_hash = ?');
    return stmt.get(fileHash) as FileMetadata || null;
  }

  /**
   * 프로젝트 경로로 모든 파일 조회
   */
  getAllFilesByProject(projectPath: string): FileMetadata[] {
    const stmt = this.db.prepare('SELECT * FROM files WHERE project_path = ?');
    return stmt.all(projectPath) as FileMetadata[];
  }

  // 헬퍼 메서드들
  private getPatternReference(patternId: number): PatternReference | null {
    const stmt = this.db.prepare('SELECT * FROM pattern_references WHERE id = ?');
    return stmt.get(patternId) as PatternReference || null;
  }

  private getAllFiles(): FileMetadata[] {
    const stmt = this.db.prepare('SELECT * FROM files');
    return stmt.all() as FileMetadata[];
  }
}