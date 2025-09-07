-- 문서화 시스템 스키마
-- Description: Glob 패턴 기반 컨벤션 문서 관리 및 동기화
-- Version: 1.0.0
-- Created: 2025-09-07

-- 문서 기본 정보
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notion_page_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'convention', 'guide', 'api', 'readme', 'changelog'
  status TEXT DEFAULT 'active', -- 'active', 'draft', 'archived', 'deprecated'
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  
  -- 로컬 파일 정보
  local_path TEXT,
  content_hash TEXT, -- 파일 내용 해시값
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'local_modified', 'notion_modified', 'conflict'
  
  -- 메타데이터
  author TEXT,
  version TEXT DEFAULT '1.0.0',
  language TEXT DEFAULT 'ko',
  description TEXT,
  tags TEXT, -- JSON array of tags
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_synced TIMESTAMP,
  
  -- 인덱스
  UNIQUE(notion_page_id),
  INDEX idx_documents_title (title),
  INDEX idx_documents_type (type),
  INDEX idx_documents_status (status),
  INDEX idx_documents_priority (priority),
  INDEX idx_documents_sync_status (sync_status),
  INDEX idx_documents_local_path (local_path)
);

-- Glob 패턴 범위 정의
CREATE TABLE IF NOT EXISTS document_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  glob_pattern TEXT NOT NULL,
  apply_to TEXT NOT NULL, -- 'files', 'directories', 'project'
  priority INTEGER DEFAULT 100, -- 낮을수록 높은 우선순위
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  
  -- 패턴 메타데이터
  pattern_type TEXT DEFAULT 'glob', -- 'glob', 'regex', 'exact'
  case_sensitive BOOLEAN DEFAULT FALSE,
  include_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_document_scopes_glob_pattern (glob_pattern),
  INDEX idx_document_scopes_apply_to (apply_to),
  INDEX idx_document_scopes_priority (priority),
  INDEX idx_document_scopes_is_active (is_active)
);

-- 파일-문서 매칭 캐시 (성능 최적화)
CREATE TABLE IF NOT EXISTS file_document_matches (
  file_path TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  match_priority INTEGER NOT NULL,
  matched_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL, -- 'direct', 'parent', 'global'
  
  -- 캐시 메타데이터
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (file_path, document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_file_document_matches_file_path (file_path),
  INDEX idx_file_document_matches_priority (match_priority),
  INDEX idx_file_document_matches_type (match_type),
  INDEX idx_file_document_matches_valid (is_valid)
);

-- 문서 사용 통계
CREATE TABLE IF NOT EXISTS document_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  access_type TEXT NOT NULL, -- 'view', 'reference', 'auto_suggest'
  access_count INTEGER DEFAULT 1,
  
  first_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(document_id, file_path, access_type),
  INDEX idx_document_usage_document (document_id),
  INDEX idx_document_usage_file (file_path),
  INDEX idx_document_usage_count (access_count DESC),
  INDEX idx_document_usage_last (last_accessed DESC)
);

-- 문서 관계 (계층 구조)
CREATE TABLE IF NOT EXISTS document_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_document_id INTEGER NOT NULL,
  child_document_id INTEGER NOT NULL,
  relationship_type TEXT DEFAULT 'parent_child', -- 'parent_child', 'related', 'supersedes', 'references'
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (child_document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(parent_document_id, child_document_id),
  INDEX idx_document_relationships_parent (parent_document_id),
  INDEX idx_document_relationships_child (child_document_id),
  INDEX idx_document_relationships_type (relationship_type)
);

-- 동기화 충돌 로그
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  conflict_type TEXT NOT NULL, -- 'content', 'metadata', 'deletion'
  
  -- 충돌 데이터
  local_content_hash TEXT,
  notion_content_hash TEXT,
  local_modified_at TIMESTAMP,
  notion_modified_at TIMESTAMP,
  
  -- 해결 상태
  status TEXT DEFAULT 'pending', -- 'pending', 'resolved_local', 'resolved_notion', 'resolved_manual'
  resolution_strategy TEXT, -- 'local_wins', 'notion_wins', 'manual_merge', 'backup_both'
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_sync_conflicts_document (document_id),
  INDEX idx_sync_conflicts_status (status),
  INDEX idx_sync_conflicts_type (conflict_type)
);

-- 문서 변경 히스토리 
CREATE TABLE IF NOT EXISTS document_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'synced', 'conflict_resolved'
  
  -- 변경 내용
  old_content_hash TEXT,
  new_content_hash TEXT,
  changed_fields TEXT, -- JSON array of changed field names
  change_summary TEXT,
  
  -- 변경 주체
  changed_by TEXT, -- 'system', 'user', 'sync'
  change_source TEXT, -- 'local', 'notion', 'cli'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_document_history_document (document_id),
  INDEX idx_document_history_type (change_type),
  INDEX idx_document_history_created (created_at DESC)
);

-- 뷰: 파일별 적용 가능한 문서
CREATE VIEW IF NOT EXISTS applicable_documents AS
SELECT 
  fdm.file_path,
  d.id as document_id,
  d.title,
  d.type,
  d.priority,
  d.local_path,
  fdm.matched_pattern,
  fdm.match_type,
  fdm.match_priority,
  du.access_count,
  du.last_accessed
FROM file_document_matches fdm
JOIN documents d ON fdm.document_id = d.id
LEFT JOIN document_usage du ON fdm.document_id = du.document_id 
  AND fdm.file_path = du.file_path 
  AND du.access_type = 'view'
WHERE fdm.is_valid = TRUE 
  AND d.status = 'active'
ORDER BY fdm.file_path, fdm.match_priority DESC, du.access_count DESC;

-- 뷰: 문서 동기화 상태 요약
CREATE VIEW IF NOT EXISTS document_sync_summary AS
SELECT 
  d.type,
  COUNT(*) as total_documents,
  SUM(CASE WHEN d.sync_status = 'synced' THEN 1 ELSE 0 END) as synced_count,
  SUM(CASE WHEN d.sync_status = 'conflict' THEN 1 ELSE 0 END) as conflict_count,
  SUM(CASE WHEN d.sync_status LIKE '%modified' THEN 1 ELSE 0 END) as modified_count,
  AVG(CASE WHEN d.last_synced IS NOT NULL THEN 
    (julianday('now') - julianday(d.last_synced)) * 24 * 60 
    ELSE NULL END) as avg_minutes_since_sync
FROM documents d
WHERE d.status != 'archived'
GROUP BY d.type;

-- 뷰: 가장 많이 사용되는 문서
CREATE VIEW IF NOT EXISTS popular_documents AS
SELECT 
  d.id,
  d.title,
  d.type,
  d.local_path,
  COUNT(DISTINCT du.file_path) as unique_files_count,
  SUM(du.access_count) as total_access_count,
  AVG(du.access_count) as avg_access_per_file,
  MAX(du.last_accessed) as most_recent_access
FROM documents d
JOIN document_usage du ON d.id = du.document_id
WHERE d.status = 'active'
GROUP BY d.id, d.title, d.type, d.local_path
ORDER BY total_access_count DESC, unique_files_count DESC;

-- 트리거: 문서 업데이트시 updated_at 갱신
CREATE TRIGGER IF NOT EXISTS update_documents_timestamp
AFTER UPDATE ON documents
BEGIN
  UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 트리거: 문서 변경시 히스토리 기록
CREATE TRIGGER IF NOT EXISTS log_document_changes
AFTER UPDATE ON documents
WHEN OLD.content_hash != NEW.content_hash OR OLD.sync_status != NEW.sync_status
BEGIN
  INSERT INTO document_history (
    document_id, 
    change_type, 
    old_content_hash, 
    new_content_hash,
    change_summary,
    changed_by,
    change_source
  ) VALUES (
    NEW.id,
    CASE 
      WHEN OLD.sync_status != NEW.sync_status THEN 'synced'
      ELSE 'updated' 
    END,
    OLD.content_hash,
    NEW.content_hash,
    'Content or sync status changed',
    'system',
    'local'
  );
END;

-- 트리거: 사용 통계 자동 업데이트
CREATE TRIGGER IF NOT EXISTS update_document_usage_stats
AFTER INSERT ON document_usage
BEGIN
  UPDATE document_usage 
  SET access_count = access_count + 1, 
      last_accessed = CURRENT_TIMESTAMP
  WHERE document_id = NEW.document_id 
    AND file_path = NEW.file_path 
    AND access_type = NEW.access_type
    AND id != NEW.id;
    
  DELETE FROM document_usage WHERE id = NEW.id AND access_count = 1;
END;