-- Migration: Add Documentation System
-- Version: 1.0.0
-- Date: 2025-09-07
-- Description: Glob 패턴 기반 문서 매칭 및 동기화 시스템 추가

BEGIN TRANSACTION;

-- 스키마 버전 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  rollback_sql TEXT
);

-- 기존 migration 기록 (필요한 경우)
INSERT OR IGNORE INTO schema_migrations (version, applied_at, description) 
VALUES ('001', '2025-09-07 02:00:00', 'Initial core setup');

-- 문서화 시스템 스키마 실행
-- (documentation.sql의 내용이 여기에 포함됨)

-- 문서 기본 정보
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notion_page_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  
  -- 로컬 파일 정보
  local_path TEXT,
  content_hash TEXT,
  sync_status TEXT DEFAULT 'synced',
  
  -- 메타데이터
  author TEXT,
  version TEXT DEFAULT '1.0.0',
  language TEXT DEFAULT 'ko',
  description TEXT,
  tags TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_synced TIMESTAMP,
  
  -- 인덱스
  UNIQUE(notion_page_id),
  INDEX idx_documents_title (title),
  INDEX idx_documents_type (type),
  INDEX idx_documents_status (status),
  INDEX idx_documents_sync_status (sync_status)
);

-- Glob 패턴 범위 정의
CREATE TABLE IF NOT EXISTS document_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  glob_pattern TEXT NOT NULL,
  apply_to TEXT NOT NULL,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  
  pattern_type TEXT DEFAULT 'glob',
  case_sensitive BOOLEAN DEFAULT FALSE,
  include_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_document_scopes_glob_pattern (glob_pattern),
  INDEX idx_document_scopes_priority (priority)
);

-- 파일-문서 매칭 캐시
CREATE TABLE IF NOT EXISTS file_document_matches (
  file_path TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  match_priority INTEGER NOT NULL,
  matched_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL,
  
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (file_path, document_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_file_document_matches_file_path (file_path),
  INDEX idx_file_document_matches_priority (match_priority)
);

-- 문서 사용 통계
CREATE TABLE IF NOT EXISTS document_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  access_type TEXT NOT NULL,
  access_count INTEGER DEFAULT 1,
  
  first_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(document_id, file_path, access_type),
  INDEX idx_document_usage_document (document_id),
  INDEX idx_document_usage_count (access_count DESC)
);

-- 기본 문서 타입 설정용 더미 데이터 (추후 실제 데이터로 대체)
INSERT OR IGNORE INTO documents (notion_page_id, title, type, description, status) VALUES
('doc-react-components-001', 'React Component Guidelines', 'convention', 'React 컴포넌트 작성 가이드라인', 'active'),
('doc-api-standards-002', 'API Development Standards', 'convention', 'API 개발 표준 및 컨벤션', 'active'), 
('doc-testing-guide-003', 'Testing Conventions', 'guide', '테스팅 컨벤션 및 모범 사례', 'active'),
('doc-general-coding-004', 'General Coding Standards', 'convention', '일반적인 코딩 표준', 'active');

-- 기본 Glob 패턴 설정
INSERT OR IGNORE INTO document_scopes (document_id, glob_pattern, apply_to, priority, description) VALUES
((SELECT id FROM documents WHERE title = 'React Component Guidelines'), 'src/components/**/*.{tsx,jsx}', 'files', 10, 'React 컴포넌트 파일'),
((SELECT id FROM documents WHERE title = 'React Component Guidelines'), 'src/ui/**/*.{tsx,jsx}', 'files', 20, 'UI 컴포넌트 파일'),
((SELECT id FROM documents WHERE title = 'API Development Standards'), 'src/api/**/*.ts', 'files', 10, 'API 라우트 파일'),
((SELECT id FROM documents WHERE title = 'API Development Standards'), 'src/server/**/*.ts', 'files', 20, '서버 로직 파일'),
((SELECT id FROM documents WHERE title = 'Testing Conventions'), '**/*.{test,spec}.{ts,js,tsx,jsx}', 'files', 10, '테스트 파일'),
((SELECT id FROM documents WHERE title = 'General Coding Standards'), '**/*', 'files', 1000, '모든 파일');

-- 트리거 생성
CREATE TRIGGER IF NOT EXISTS update_documents_timestamp
AFTER UPDATE ON documents
BEGIN
  UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 마이그레이션 기록
INSERT INTO schema_migrations (version, description, rollback_sql) VALUES (
  '002', 
  'Add Documentation System with Glob pattern matching',
  'DROP TABLE IF EXISTS document_usage; DROP TABLE IF EXISTS file_document_matches; DROP TABLE IF EXISTS document_scopes; DROP TABLE IF EXISTS documents;'
);

-- 데이터베이스 최적화
PRAGMA optimize;
ANALYZE;

COMMIT;