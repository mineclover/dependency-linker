-- ID 추적 시스템 스키마
-- Description: Notion 페이지 ID와 로컬 파일 연결 추적
-- Version: 1.0.0
-- Created: 2025-09-07

-- 파일별 Notion ID 추적
CREATE TABLE IF NOT EXISTS file_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  notion_page_id TEXT UNIQUE,
  tracking_id TEXT UNIQUE, -- DL-xxx 형태의 식별자
  injection_status TEXT DEFAULT 'pending', -- 'pending', 'injected', 'failed', 'removed'
  injection_line INTEGER, -- 주입된 라인 번호
  
  -- 파일 정보
  file_size INTEGER,
  file_hash TEXT, -- 파일 내용 해시
  last_modified TIMESTAMP,
  
  -- Notion 정보
  notion_status TEXT, -- 'uploaded', 'updated', 'synced', 'error'
  notion_title TEXT,
  notion_url TEXT,
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  
  -- 인덱스
  INDEX idx_file_path (file_path),
  INDEX idx_notion_page_id (notion_page_id),
  INDEX idx_tracking_id (tracking_id),
  INDEX idx_injection_status (injection_status),
  INDEX idx_notion_status (notion_status)
);

-- 함수별 ID 추적 (Phase 2)
CREATE TABLE IF NOT EXISTS function_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  function_name TEXT NOT NULL,
  function_type TEXT NOT NULL, -- 'function', 'class', 'method', 'component', 'hook'
  notion_page_id TEXT UNIQUE,
  tracking_id TEXT UNIQUE, -- FN-xxx 형태의 식별자
  injection_status TEXT DEFAULT 'pending',
  injection_line INTEGER,
  
  -- 함수 정보
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  parameters TEXT, -- JSON array
  return_type TEXT,
  visibility TEXT, -- 'public', 'private', 'protected', 'internal'
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(file_path, function_name, start_line),
  FOREIGN KEY (file_path) REFERENCES file_tracking(file_path),
  INDEX idx_function_file (file_path),
  INDEX idx_function_name (function_name),
  INDEX idx_function_type (function_type),
  INDEX idx_tracking_id_fn (tracking_id)
);

-- ID 생성 시퀀스 관리
CREATE TABLE IF NOT EXISTS id_sequences (
  prefix TEXT PRIMARY KEY, -- 'DL', 'FN', 'DOC'
  current_number INTEGER DEFAULT 0,
  format_pattern TEXT NOT NULL, -- 'DL-{type}-{number}' 등
  description TEXT
);

-- 기본 시퀀스 데이터 추가
INSERT OR IGNORE INTO id_sequences (prefix, current_number, format_pattern, description) VALUES
('DL', 0, 'DL-{type}-{number}', 'File tracking IDs'),
('FN', 0, 'FN-{type}-{number}', 'Function tracking IDs'), 
('DOC', 0, 'DOC-{type}-{number}', 'Documentation IDs');

-- Notion 동기화 로그
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'file', 'function', 'document'
  entity_id TEXT NOT NULL,   -- tracking_id 또는 file_path
  action TEXT NOT NULL,      -- 'create', 'update', 'delete', 'sync'
  status TEXT NOT NULL,      -- 'success', 'error', 'partial'
  
  -- 요청/응답 정보
  request_data TEXT,  -- JSON 형태의 요청 데이터
  response_data TEXT, -- JSON 형태의 응답 데이터
  error_message TEXT,
  
  -- 성능 정보
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  -- 타임스탬프
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_action (action),
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
);

-- API 제한 및 큐잉 정보
CREATE TABLE IF NOT EXISTS api_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL, -- 'create_page', 'update_page', 'query_database'
  priority INTEGER DEFAULT 100, -- 낮을수록 높은 우선순위
  payload TEXT NOT NULL,        -- JSON 형태의 요청 데이터
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- 재시도 정보
  max_retries INTEGER DEFAULT 3,
  current_retries INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_next_retry_at (next_retry_at)
);

-- 뷰: 동기화 상태 요약
CREATE VIEW IF NOT EXISTS sync_status_summary AS
SELECT 
  'file' as entity_type,
  COUNT(*) as total_count,
  SUM(CASE WHEN notion_page_id IS NOT NULL THEN 1 ELSE 0 END) as synced_count,
  SUM(CASE WHEN injection_status = 'injected' THEN 1 ELSE 0 END) as injected_count,
  SUM(CASE WHEN notion_status = 'error' THEN 1 ELSE 0 END) as error_count
FROM file_tracking

UNION ALL

SELECT 
  'function' as entity_type,
  COUNT(*) as total_count,
  SUM(CASE WHEN notion_page_id IS NOT NULL THEN 1 ELSE 0 END) as synced_count,
  SUM(CASE WHEN injection_status = 'injected' THEN 1 ELSE 0 END) as injected_count,
  0 as error_count
FROM function_tracking;

-- 함수: 새 tracking ID 생성
-- 사용법: SELECT generate_tracking_id('DL', 'file');
CREATE OR REPLACE FUNCTION generate_tracking_id(prefix TEXT, type TEXT) 
RETURNS TEXT
AS $$
DECLARE
  next_num INTEGER;
  format_str TEXT;
  new_id TEXT;
BEGIN
  -- 다음 번호 가져오기 및 증가
  UPDATE id_sequences 
  SET current_number = current_number + 1 
  WHERE prefix = $1
  RETURNING current_number, format_pattern INTO next_num, format_str;
  
  -- ID 생성
  new_id := REPLACE(REPLACE(format_str, '{type}', $2), '{number}', next_num::TEXT);
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- SQLite용 트리거: tracking ID 자동 생성
CREATE TRIGGER IF NOT EXISTS auto_generate_file_tracking_id
AFTER INSERT ON file_tracking
WHEN NEW.tracking_id IS NULL
BEGIN
  UPDATE id_sequences SET current_number = current_number + 1 WHERE prefix = 'DL';
  
  UPDATE file_tracking 
  SET tracking_id = 'DL-file-' || (SELECT current_number FROM id_sequences WHERE prefix = 'DL')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS auto_generate_function_tracking_id  
AFTER INSERT ON function_tracking
WHEN NEW.tracking_id IS NULL
BEGIN
  UPDATE id_sequences SET current_number = current_number + 1 WHERE prefix = 'FN';
  
  UPDATE function_tracking 
  SET tracking_id = 'FN-' || NEW.function_type || '-' || (SELECT current_number FROM id_sequences WHERE prefix = 'FN')
  WHERE id = NEW.id;
END;

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER IF NOT EXISTS update_file_tracking_timestamp
AFTER UPDATE ON file_tracking
BEGIN
  UPDATE file_tracking SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_function_tracking_timestamp
AFTER UPDATE ON function_tracking  
BEGIN
  UPDATE function_tracking SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;