/**
 * Database Types - 데이터베이스 관련 타입 정의
 * any 타입을 구체적인 타입으로 대체하기 위한 인터페이스들
 */

export interface FileRecord {
  id: number;
  file_path: string;
  relative_path: string;
  language: string;
  notion_id?: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  last_analyzed?: string;
  hash?: string;
}

export interface DependencyRecord {
  id: number;
  source_file_id: number;
  target_file_id?: number;
  source: string;
  resolved?: string;
  is_local: boolean;
  type: 'import' | 'require' | 'dynamic' | 'export';
  line_number?: number;
  column_number?: number;
  created_at?: string;
}

export interface ReverseDependencyRecord {
  source_file_id: number;
  source_path: string;
  target_file_id: number;
  dependency_type: string;
}

export interface FunctionRecord {
  id: number;
  file_id: number;
  name: string;
  type: 'function' | 'method' | 'arrow' | 'async';
  start_line: number;
  end_line: number;
  parameters?: string;
  return_type?: string;
  is_exported: boolean;
  description?: string;
  created_at?: string;
}

export interface DocumentRecord {
  id: number;
  file_path: string;
  title?: string;
  content?: string;
  frontmatter?: string;
  notion_id?: string;
  word_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MetricsRecord {
  id: number;
  file_id: number;
  complexity?: number;
  lines_of_code?: number;
  comment_ratio?: number;
  test_coverage?: number;
  maintainability_index?: number;
  created_at?: string;
}

export interface TodoRecord {
  id: number;
  file_id: number;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  line_number?: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
  resolved_at?: string;
}

// Query Result Types
export interface QueryResult {
  changes?: number;
  lastInsertRowid?: number;
}

export interface FileInfo {
  id: number;
  path: string;
  relative_path: string;
  language: string;
  notion_id?: string;
}

export interface ConflictRecord {
  id: number;
  source_type: 'local' | 'remote';
  target_type: 'local' | 'remote';
  conflict_type: 'content' | 'metadata' | 'structure';
  file_path: string;
  created_at: string;
  resolved_at?: string;
  resolution?: 'local' | 'remote' | 'merge';
}

// SQL Statement parameter types
export type SqliteValue = string | number | boolean | null | Buffer;
export type SqliteParameters = Record<string, SqliteValue> | SqliteValue[];