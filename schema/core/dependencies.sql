-- 의존성 관계 스키마
-- Description: 파일 간 import/export 의존성 관계 관리
-- Version: 1.1.0
-- Created: 2025-09-07

-- 파일 간 의존성 관계
CREATE TABLE IF NOT EXISTS dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  import_type TEXT NOT NULL, -- 'import', 'require', 'dynamic_import'
  import_statement TEXT, -- 원본 import 구문
  imported_items TEXT, -- JSON array of imported items
  is_external BOOLEAN DEFAULT FALSE, -- 외부 라이브러리 여부
  resolved_path TEXT, -- alias 해석된 실제 경로
  
  -- 메타데이터
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_valid BOOLEAN DEFAULT TRUE,
  
  -- 중복 방지 및 인덱스
  UNIQUE(source_path, target_path, import_type),
  INDEX idx_source_path (source_path),
  INDEX idx_target_path (target_path),
  INDEX idx_import_type (import_type),
  INDEX idx_is_external (is_external),
  INDEX idx_is_valid (is_valid)
);

-- 외부 의존성 정보
CREATE TABLE IF NOT EXISTS external_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  version TEXT,
  import_count INTEGER DEFAULT 1,
  first_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  package_type TEXT, -- 'npm', 'built-in', 'workspace'
  
  UNIQUE(package_name),
  INDEX idx_package_name (package_name),
  INDEX idx_import_count (import_count DESC)
);

-- 의존성 그래프 통계
CREATE TABLE IF NOT EXISTS dependency_stats (
  file_path TEXT PRIMARY KEY,
  dependencies_count INTEGER DEFAULT 0, -- 이 파일이 의존하는 파일 수
  dependents_count INTEGER DEFAULT 0,   -- 이 파일을 의존하는 파일 수
  external_deps_count INTEGER DEFAULT 0, -- 외부 의존성 수
  depth_score INTEGER DEFAULT 0,        -- 의존성 깊이 점수
  centrality_score REAL DEFAULT 0.0,    -- 중요도 점수
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 순환 의존성 감지
CREATE TABLE IF NOT EXISTS circular_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_hash TEXT UNIQUE NOT NULL, -- 순환 고리 해시
  involved_files TEXT NOT NULL,    -- JSON array of file paths in cycle
  cycle_length INTEGER NOT NULL,
  severity TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  
  INDEX idx_cycle_hash (cycle_hash),
  INDEX idx_cycle_length (cycle_length),
  INDEX idx_severity (severity)
);

-- Alias 경로 매핑
CREATE TABLE IF NOT EXISTS path_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias_pattern TEXT NOT NULL,     -- '@/*', '~/*'
  resolved_pattern TEXT NOT NULL,  -- 'src/*'
  workspace_root TEXT NOT NULL,
  priority INTEGER DEFAULT 100,    -- 낮을수록 높은 우선순위
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_alias_pattern (alias_pattern),
  INDEX idx_workspace_root (workspace_root),
  INDEX idx_priority (priority)
);

-- 뷰: 양방향 의존성 관계
CREATE VIEW IF NOT EXISTS bidirectional_dependencies AS
SELECT 
  d.source_path,
  d.target_path,
  d.import_type,
  'dependency' as relationship_type,
  d.is_external,
  d.is_valid
FROM dependencies d
WHERE d.is_valid = TRUE

UNION ALL

SELECT 
  d.target_path as source_path,
  d.source_path as target_path,
  d.import_type,
  'dependent' as relationship_type,
  d.is_external,
  d.is_valid
FROM dependencies d  
WHERE d.is_valid = TRUE AND d.is_external = FALSE;

-- 트리거: 의존성 추가시 통계 업데이트
CREATE TRIGGER IF NOT EXISTS update_dependency_stats_on_insert
AFTER INSERT ON dependencies
WHEN NEW.is_valid = TRUE
BEGIN
  -- source 파일의 dependencies_count 증가
  INSERT OR REPLACE INTO dependency_stats (file_path, dependencies_count, last_calculated)
  VALUES (
    NEW.source_path, 
    COALESCE((SELECT dependencies_count FROM dependency_stats WHERE file_path = NEW.source_path), 0) + 1,
    CURRENT_TIMESTAMP
  );
  
  -- target 파일의 dependents_count 증가 (외부 의존성이 아닌 경우만)
  UPDATE dependency_stats 
  SET dependents_count = dependents_count + 1, last_calculated = CURRENT_TIMESTAMP
  WHERE file_path = NEW.target_path AND NEW.is_external = FALSE;
  
  -- 새 target 파일인 경우 레코드 생성
  INSERT OR IGNORE INTO dependency_stats (file_path, dependents_count, last_calculated)
  SELECT NEW.target_path, 1, CURRENT_TIMESTAMP
  WHERE NEW.is_external = FALSE;
END;

-- 트리거: 외부 의존성 사용 횟수 업데이트
CREATE TRIGGER IF NOT EXISTS update_external_deps_usage
AFTER INSERT ON dependencies
WHEN NEW.is_external = TRUE
BEGIN
  INSERT OR REPLACE INTO external_dependencies (
    package_name, 
    import_count, 
    first_used,
    last_used
  ) VALUES (
    NEW.target_path,
    COALESCE((SELECT import_count FROM external_dependencies WHERE package_name = NEW.target_path), 0) + 1,
    COALESCE((SELECT first_used FROM external_dependencies WHERE package_name = NEW.target_path), CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
  );
END;