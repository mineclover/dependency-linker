-- 좌표 시스템 스키마
-- Description: workspace root 기준 파일 좌표 관리
-- Version: 1.0.0
-- Created: 2025-09-07

-- 파일 좌표 정보 테이블
CREATE TABLE IF NOT EXISTS coordinates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  relative_path TEXT UNIQUE NOT NULL,
  workspace_root TEXT NOT NULL,
  depth INTEGER NOT NULL,
  segments TEXT NOT NULL, -- JSON array of path segments
  parent_path TEXT,
  filename TEXT NOT NULL,
  extension TEXT,
  coordinate_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 인덱스 생성
  INDEX idx_relative_path (relative_path),
  INDEX idx_depth (depth),
  INDEX idx_extension (extension),
  INDEX idx_coordinate_id (coordinate_id),
  INDEX idx_parent_path (parent_path)
);

-- 좌표 시스템 메타데이터
CREATE TABLE IF NOT EXISTS coordinate_metadata (
  workspace_root TEXT PRIMARY KEY,
  project_name TEXT,
  total_files INTEGER DEFAULT 0,
  max_depth INTEGER DEFAULT 0,
  last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  index_version TEXT DEFAULT '1.0.0'
);

-- 좌표 관계 캐시 (성능 최적화)
CREATE TABLE IF NOT EXISTS coordinate_neighbors (
  coordinate_id TEXT NOT NULL,
  neighbor_id TEXT NOT NULL,
  relationship TEXT NOT NULL, -- 'parent', 'child', 'sibling'
  distance INTEGER NOT NULL, -- Manhattan distance
  
  PRIMARY KEY (coordinate_id, neighbor_id),
  FOREIGN KEY (coordinate_id) REFERENCES coordinates(coordinate_id),
  FOREIGN KEY (neighbor_id) REFERENCES coordinates(coordinate_id),
  INDEX idx_coordinate_neighbors (coordinate_id),
  INDEX idx_relationship (relationship),
  INDEX idx_distance (distance)
);

-- 트리거: 좌표 업데이트시 메타데이터 갱신
CREATE TRIGGER IF NOT EXISTS update_coordinate_metadata
AFTER INSERT ON coordinates
BEGIN
  INSERT OR REPLACE INTO coordinate_metadata (workspace_root, total_files, max_depth, last_indexed)
  VALUES (
    NEW.workspace_root,
    (SELECT COUNT(*) FROM coordinates WHERE workspace_root = NEW.workspace_root),
    (SELECT MAX(depth) FROM coordinates WHERE workspace_root = NEW.workspace_root),
    CURRENT_TIMESTAMP
  );
END;

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER IF NOT EXISTS update_coordinates_timestamp
AFTER UPDATE ON coordinates
BEGIN
  UPDATE coordinates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;