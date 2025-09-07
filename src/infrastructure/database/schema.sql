-- 의존성 분석 캐싱을 위한 SQLite 스키마
-- 직접 참조(import)와 간접 참조(glob 패턴) 모두 지원

-- 1. 파일 메타데이터 테이블
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    relative_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,  -- 파일 내용 변경 감지용
    file_size INTEGER,
    last_modified INTEGER,
    extension TEXT,
    project_path TEXT,
    notion_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 2. 직접 의존성 (Import/Require)
CREATE TABLE IF NOT EXISTS direct_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file_id INTEGER NOT NULL,
    target_file_id INTEGER NOT NULL,
    dependency_type TEXT NOT NULL, -- 'import', 'require', 'dynamic_import'
    import_statement TEXT,  -- 원본 import 구문
    specifiers TEXT,  -- JSON: imported names/symbols
    line_number INTEGER,
    is_resolved BOOLEAN DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (source_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (target_file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(source_file_id, target_file_id, line_number)
);

-- 3. 패턴 기반 간접 참조 (Glob/Regex)
CREATE TABLE IF NOT EXISTS pattern_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,  -- glob 또는 regex 패턴
    pattern_type TEXT NOT NULL,  -- 'glob', 'regex', 'prefix', 'suffix'
    scope_type TEXT NOT NULL,  -- 'documentation', 'configuration', 'test', 'build'
    owner_file_id INTEGER,  -- 패턴을 정의한 파일 (예: README.md)
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (owner_file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 4. 패턴 매칭 결과 캐시
CREATE TABLE IF NOT EXISTS pattern_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id INTEGER NOT NULL,
    matched_file_id INTEGER NOT NULL,
    match_confidence REAL DEFAULT 1.0,  -- 0.0 ~ 1.0
    match_reason TEXT,  -- 매칭 이유/컨텍스트
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (pattern_id) REFERENCES pattern_references(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(pattern_id, matched_file_id)
);

-- 5. 문서-코드 연결 테이블
CREATE TABLE IF NOT EXISTS document_code_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_file_id INTEGER NOT NULL,
    code_file_id INTEGER,
    pattern_id INTEGER,  -- 패턴으로 연결된 경우
    link_type TEXT NOT NULL,  -- 'direct', 'pattern', 'mention', 'example'
    link_context TEXT,  -- 링크 주변 텍스트
    line_number INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (document_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (code_file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_id) REFERENCES pattern_references(id) ON DELETE SET NULL
);

-- 6. 의존성 분석 캐시 메타데이터
CREATE TABLE IF NOT EXISTS analysis_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_type TEXT NOT NULL,  -- 'full', 'incremental', 'pattern'
    file_count INTEGER,
    dependency_count INTEGER,
    pattern_count INTEGER,
    analysis_duration_ms INTEGER,
    cache_key TEXT UNIQUE,  -- 분석 설정 해시
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 7. 순환 의존성 감지
CREATE TABLE IF NOT EXISTS circular_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_path TEXT NOT NULL,  -- JSON array of file IDs
    cycle_length INTEGER,
    severity TEXT DEFAULT 'warning',  -- 'info', 'warning', 'error'
    detected_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
CREATE INDEX IF NOT EXISTS idx_direct_deps_source ON direct_dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_direct_deps_target ON direct_dependencies(target_file_id);
CREATE INDEX IF NOT EXISTS idx_pattern_matches ON pattern_matches(pattern_id, matched_file_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_doc ON document_code_links(document_file_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_code ON document_code_links(code_file_id);

-- 뷰: 파일별 의존성 요약
CREATE VIEW IF NOT EXISTS file_dependency_summary AS
SELECT 
    f.id,
    f.file_path,
    f.relative_path,
    COUNT(DISTINCT dd_out.target_file_id) as direct_dependencies_count,
    COUNT(DISTINCT dd_in.source_file_id) as direct_dependents_count,
    COUNT(DISTINCT pm.pattern_id) as pattern_matches_count,
    COUNT(DISTINCT dcl.id) as document_links_count
FROM files f
LEFT JOIN direct_dependencies dd_out ON f.id = dd_out.source_file_id
LEFT JOIN direct_dependencies dd_in ON f.id = dd_in.target_file_id
LEFT JOIN pattern_matches pm ON f.id = pm.matched_file_id
LEFT JOIN document_code_links dcl ON f.id = dcl.code_file_id
GROUP BY f.id;

-- 뷰: 패턴별 매칭 통계
CREATE VIEW IF NOT EXISTS pattern_match_statistics AS
SELECT 
    pr.id,
    pr.pattern,
    pr.pattern_type,
    pr.scope_type,
    COUNT(pm.matched_file_id) as matched_files_count,
    AVG(pm.match_confidence) as avg_confidence,
    pr.updated_at
FROM pattern_references pr
LEFT JOIN pattern_matches pm ON pr.id = pm.pattern_id
WHERE pm.is_active = 1
GROUP BY pr.id;