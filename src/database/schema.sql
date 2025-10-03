-- Dependency Graph Database Schema
-- SQLite schema for storing flexible graph data with nodes and edges

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ===== CORE GRAPH TABLES =====

-- Nodes: Represents any entity in the codebase (files, classes, methods, variables, etc.)
CREATE TABLE IF NOT EXISTS nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Unique identifier: file_path::type::name format for guaranteed uniqueness
  -- Examples:
  --   '/src/App.tsx::file::App.tsx'
  --   '/src/utils/helpers.ts::export::calculate'
  --   '/src/User.ts::class::User'
  --   '/src/User.ts::method::User.login'
  identifier TEXT NOT NULL UNIQUE,
  -- Type of node (file, class, method, function, variable, import, export, etc.)
  type TEXT NOT NULL,
  -- Display name (e.g., method name, class name, file name)
  name TEXT NOT NULL,
  -- Source file path (absolute path from project root)
  source_file TEXT NOT NULL,
  -- Programming language
  language TEXT NOT NULL,
  -- Semantic tags for categorization (JSON array of strings)
  semantic_tags TEXT DEFAULT '[]',
  -- JSON metadata specific to node type
  metadata TEXT DEFAULT '{}',
  -- Source location information
  start_line INTEGER,
  start_column INTEGER,
  end_line INTEGER,
  end_column INTEGER,
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups on nodes table
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes (type);
CREATE INDEX IF NOT EXISTS idx_nodes_source_file ON nodes (source_file);
CREATE INDEX IF NOT EXISTS idx_nodes_language ON nodes (language);
CREATE INDEX IF NOT EXISTS idx_nodes_identifier ON nodes (identifier);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes (name);

-- Edges: Represents all relationships between nodes
CREATE TABLE IF NOT EXISTS edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Source node
  start_node_id INTEGER NOT NULL,
  -- Target node
  end_node_id INTEGER NOT NULL,
  -- Type of relationship
  type TEXT NOT NULL,
  -- Optional label or description
  label TEXT,
  -- JSON metadata for relationship-specific data
  metadata TEXT DEFAULT '{}',
  -- Weight/strength of relationship (default 1.0)
  weight REAL DEFAULT 1.0,
  -- Source file path (for analyzer-specific cleanup)
  -- This allows each analyzer to clean up only its own relationships
  -- Optional: Some relationships may not have a specific source file
  source_file TEXT,
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (start_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (end_node_id) REFERENCES nodes(id) ON DELETE CASCADE,

  -- Prevent duplicate relationships
  UNIQUE(start_node_id, end_node_id, type)
);

-- Indexes for fast graph traversal on edges table
CREATE INDEX IF NOT EXISTS idx_edges_start ON edges (start_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_end ON edges (end_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges (type);
CREATE INDEX IF NOT EXISTS idx_edges_start_type ON edges (start_node_id, type);
CREATE INDEX IF NOT EXISTS idx_edges_end_type ON edges (end_node_id, type);
-- Index for analyzer-specific cleanup by source_file and type
CREATE INDEX IF NOT EXISTS idx_edges_source_file_type ON edges (source_file, type);

-- ===== PROJECT METADATA =====

-- Projects: Root container for analysis sessions
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  description TEXT,
  -- Project metadata
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Sessions: Track different analysis runs
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT,
  -- Configuration used for analysis
  config TEXT DEFAULT '{}',
  -- Analysis statistics
  stats TEXT DEFAULT '{}',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index for analysis sessions
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project ON analysis_sessions (project_id);

-- ===== EDGE TYPE DEFINITIONS =====

-- Edge Types: Define valid edge types and their hierarchical relationships
CREATE TABLE IF NOT EXISTS edge_types (
  type TEXT PRIMARY KEY,
  description TEXT,
  -- JSON schema for metadata validation
  schema TEXT DEFAULT '{}',
  -- Whether relationship is directed (default true)
  is_directed BOOLEAN DEFAULT TRUE,
  -- Parent edge type for hierarchical inference (nullable)
  parent_type TEXT,
  -- Transitive property: if A->B and B->C, then A->C (default false)
  is_transitive BOOLEAN DEFAULT FALSE,
  -- Inheritance property: if parent(A,B) and relation(B,C), then relation(A,C) (default false)
  is_inheritable BOOLEAN DEFAULT FALSE,
  -- Priority for inference rules (higher values take precedence)
  priority INTEGER DEFAULT 0,
  -- JSON metadata for inference rules, validation rules, etc.
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_type) REFERENCES edge_types(type) ON DELETE SET NULL
);

-- Index for edge types
CREATE INDEX IF NOT EXISTS idx_edge_types_parent ON edge_types (parent_type);

-- ===== PERFORMANCE OPTIMIZATION TABLES =====

-- Edge Inference Cache: For fast hierarchical and transitive relationship queries
CREATE TABLE IF NOT EXISTS edge_inference_cache (
  start_node_id INTEGER NOT NULL,
  end_node_id INTEGER NOT NULL,
  inferred_type TEXT NOT NULL,
  -- Path of direct edges that led to this inference
  edge_path TEXT NOT NULL,
  -- Depth of inference (1 = direct, >1 = inferred)
  depth INTEGER NOT NULL DEFAULT 1,
  -- Last computed timestamp
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (start_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (end_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (inferred_type) REFERENCES edge_types(type) ON DELETE CASCADE,

  PRIMARY KEY (start_node_id, end_node_id, inferred_type)
);

-- Indexes for edge inference cache
CREATE INDEX IF NOT EXISTS idx_inference_start ON edge_inference_cache (start_node_id);
CREATE INDEX IF NOT EXISTS idx_inference_end ON edge_inference_cache (end_node_id);
CREATE INDEX IF NOT EXISTS idx_inference_type ON edge_inference_cache (inferred_type);
CREATE INDEX IF NOT EXISTS idx_inference_depth ON edge_inference_cache (depth);

-- Graph Statistics: Pre-computed metrics for performance
CREATE TABLE IF NOT EXISTS graph_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  node_type TEXT,
  relationship_type TEXT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE
);

-- Indexes for graph stats
CREATE INDEX IF NOT EXISTS idx_stats_session ON graph_stats (session_id);
CREATE INDEX IF NOT EXISTS idx_stats_metric ON graph_stats (metric_name);

-- ===== PREDEFINED EDGE TYPES =====

INSERT OR IGNORE INTO edge_types (type, description, schema, is_directed, parent_type, is_transitive, is_inheritable) VALUES
  -- Basic structural relationships
  ('contains', 'Contains relationship (A contains B)', '{}', TRUE, NULL, TRUE, TRUE),
  ('declares', 'Declaration relationship (A declares B)', '{}', TRUE, 'contains', FALSE, TRUE),
  ('belongs_to', 'Ownership relationship (A belongs to B)', '{}', TRUE, NULL, TRUE, FALSE),

  -- Code relationships
  ('imports', 'File imports another file', '{"importPath": "string", "isNamespace": "boolean"}', TRUE, 'depends_on', FALSE, FALSE),
  ('exports_to', 'File exports to another file', '{"exportName": "string", "isDefault": "boolean"}', TRUE, NULL, FALSE, FALSE),
  ('calls', 'Method calls another method', '{"callType": "string", "isAsync": "boolean"}', TRUE, 'depends_on', FALSE, FALSE),
  ('references', 'Code references another element', '{"referenceType": "string"}', TRUE, 'depends_on', FALSE, FALSE),
  ('extends', 'Class extends another class', '{}', TRUE, 'depends_on', FALSE, TRUE),
  ('implements', 'Class implements interface', '{}', TRUE, 'depends_on', FALSE, TRUE),

  -- Dependency relationships (transitive)
  ('depends_on', 'General dependency relationship', '{"dependencyType": "string"}', TRUE, NULL, TRUE, FALSE),
  ('uses', 'Uses another component', '{"usageType": "string"}', TRUE, 'depends_on', FALSE, FALSE),
  ('instantiates', 'Creates instance of class', '{}', TRUE, 'depends_on', FALSE, FALSE),

  -- Type relationships
  ('has_type', 'Variable/parameter has type', '{}', TRUE, NULL, FALSE, FALSE),
  ('returns', 'Function returns type', '{}', TRUE, NULL, FALSE, FALSE),
  ('throws', 'Function throws exception type', '{}', TRUE, NULL, FALSE, FALSE),

  -- Assignment and access
  ('assigns_to', 'Assignment to variable/property', '{"operator": "string"}', TRUE, NULL, FALSE, FALSE),
  ('accesses', 'Accesses property/variable', '{"accessType": "string"}', TRUE, 'depends_on', FALSE, FALSE),

  -- Inheritance and override
  ('overrides', 'Method overrides parent method', '{}', TRUE, NULL, FALSE, FALSE),
  ('shadows', 'Variable shadows outer scope variable', '{}', TRUE, NULL, FALSE, FALSE),
  ('annotated_with', 'Decorated/annotated with', '{"annotation": "string"}', TRUE, NULL, FALSE, FALSE);

-- ===== USEFUL VIEWS =====

-- Direct edges with type information
CREATE VIEW IF NOT EXISTS edges_with_types AS
SELECT
  e.id,
  e.start_node_id,
  e.end_node_id,
  e.type,
  e.label,
  e.metadata,
  e.weight,
  et.is_directed,
  et.parent_type,
  et.is_transitive,
  et.is_inheritable
FROM edges e
JOIN edge_types et ON e.type = et.type;

-- All relationships (direct + inferred)
CREATE VIEW IF NOT EXISTS all_relationships AS
SELECT
  start_node_id,
  end_node_id,
  type,
  1 as depth,
  'direct' as source,
  id as edge_id
FROM edges

UNION ALL

SELECT
  start_node_id,
  end_node_id,
  inferred_type as type,
  depth,
  'inferred' as source,
  NULL as edge_id
FROM edge_inference_cache;

-- File dependencies (direct and inferred)
CREATE VIEW IF NOT EXISTS file_dependencies AS
SELECT
  n1.identifier as from_file,
  n2.identifier as to_file,
  ar.type as dependency_type,
  ar.depth,
  ar.source as relationship_source
FROM all_relationships ar
JOIN nodes n1 ON ar.start_node_id = n1.id
JOIN nodes n2 ON ar.end_node_id = n2.id
WHERE n1.type = 'file' AND n2.type = 'file'
  AND ar.type IN ('imports', 'depends_on');

-- Method calls with context
CREATE VIEW IF NOT EXISTS method_calls AS
SELECT
  m1.identifier as caller,
  m2.identifier as callee,
  m1.source_file as caller_file,
  m2.source_file as callee_file,
  e.metadata,
  e.weight
FROM edges e
JOIN nodes m1 ON e.start_node_id = m1.id
JOIN nodes m2 ON e.end_node_id = m2.id
WHERE e.type = 'calls'
  AND m1.type IN ('method', 'function')
  AND m2.type IN ('method', 'function');

-- Containment hierarchy (files -> classes -> methods)
CREATE VIEW IF NOT EXISTS containment_hierarchy AS
SELECT
  parent.identifier as parent,
  child.identifier as child,
  parent.type as parent_type,
  child.type as child_type,
  ar.depth,
  ar.source as relationship_source
FROM all_relationships ar
JOIN nodes parent ON ar.start_node_id = parent.id
JOIN nodes child ON ar.end_node_id = child.id
WHERE ar.type IN ('contains', 'declares');

-- Node statistics
CREATE VIEW IF NOT EXISTS node_stats AS
SELECT
  type,
  language,
  COUNT(*) as count,
  COUNT(DISTINCT source_file) as files_count
FROM nodes
GROUP BY type, language;

-- Edge statistics
CREATE VIEW IF NOT EXISTS edge_stats AS
SELECT
  type,
  COUNT(*) as count,
  AVG(weight) as avg_weight
FROM edges
GROUP BY type;

-- ===== TRIGGERS FOR MAINTENANCE =====

-- Update timestamps on node changes
CREATE TRIGGER IF NOT EXISTS update_node_timestamp
AFTER UPDATE ON nodes
BEGIN
  UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update timestamps on edge changes
CREATE TRIGGER IF NOT EXISTS update_edge_timestamp
AFTER UPDATE ON edges
BEGIN
  UPDATE edges SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Maintain edge inference cache for transitive relationships
CREATE TRIGGER IF NOT EXISTS maintain_edge_inference_insert
AFTER INSERT ON edges
BEGIN
  -- Clear existing inference cache for affected nodes
  DELETE FROM edge_inference_cache
  WHERE start_node_id = NEW.start_node_id OR end_node_id = NEW.end_node_id;

  -- Note: Complex inference computation will be handled in application code
  -- due to SQLite's limitations with recursive operations
END;

-- Clean up inference cache on edge deletion
CREATE TRIGGER IF NOT EXISTS maintain_edge_inference_delete
AFTER DELETE ON edges
BEGIN
  -- Clear inference cache that might have depended on this edge
  DELETE FROM edge_inference_cache
  WHERE start_node_id = OLD.start_node_id OR end_node_id = OLD.end_node_id;
END;

-- Invalidate inference cache when edge types change
CREATE TRIGGER IF NOT EXISTS invalidate_inference_on_type_change
AFTER UPDATE ON edge_types
WHEN OLD.is_transitive != NEW.is_transitive
  OR OLD.is_inheritable != NEW.is_inheritable
  OR OLD.parent_type != NEW.parent_type
BEGIN
  -- Clear all inference cache as type semantics changed
  DELETE FROM edge_inference_cache;
END;