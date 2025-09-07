/**
 * Shared Constants - 공통 상수 정의
 * 전체 시스템에서 사용되는 상수값들
 */

// 파일 및 경로 관련 상수
export const FILE_PATTERNS = {
  CODE: '**/*.{ts,tsx,js,jsx}',
  DOCS: '**/*.{md,mdx}',
  CONFIG: '**/*.{json,yaml,yml}',
  ALL: '**/*',
} as const;

export const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '.git/**',
  '*.log',
  '.DS_Store',
  'temp/**',
  'tmp/**',
] as const;

// 노션 관련 상수
export const NOTION = {
  API_VERSION: '2022-06-28',
  MAX_PAGE_SIZE: 100,
  RATE_LIMIT_DELAY: 334, // ~3 requests per second
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // 30 seconds
} as const;

export const DATABASE_TYPES = {
  FILES: 'files',
  DOCS: 'docs', 
  FUNCTIONS: 'functions',
} as const;

// 동기화 관련 상수
export const SYNC = {
  DEFAULT_BATCH_SIZE: 10,
  MAX_CONCURRENT_UPLOADS: 3,
  SYNC_TIMEOUT: 300000, // 5 minutes
  RETRY_DELAY: 1000, // 1 second
} as const;

// 의존성 분석 관련 상수
export const DEPENDENCY_ANALYSIS = {
  MAX_DEPTH: 10,
  DEFAULT_DEPTH: 3,
  CIRCULAR_DEPENDENCY_LIMIT: 100,
  SUPPORTED_EXTENSIONS: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
} as const;

// 문서 관련 상수
export const DOCUMENT = {
  READING_SPEED_WPM: 200, // words per minute
  MAX_TITLE_LENGTH: 100,
  MAX_EXCERPT_LENGTH: 500,
  ID_REGEX: /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i,
} as const;

// CLI 관련 상수
export const CLI = {
  NAME: 'deplink',
  VERSION: '2.0.0',
  DESCRIPTION: '코드베이스와 문서 간의 의존성 관리 및 탐색 시스템',
  DEFAULT_CONFIG_FILE: 'deplink.config.json',
  LOG_LEVELS: ['error', 'warn', 'info', 'debug'] as const,
} as const;

// 상태 코드
export const STATUS_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NETWORK_ERROR: 3,
  FILE_ERROR: 4,
  CONFIG_ERROR: 5,
} as const;

// 색상 코드 (콘솔 출력용)
export const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
} as const;

// 이모지 상수
export const EMOJIS = {
  ROCKET: '🚀',
  SYNC: '🔄', 
  EXPLORE: '🗺️',
  DOCS: '📚',
  WORKSPACE: '🏢',
  DEV: '🛠️',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  PROGRESS: '🔄',
  SEARCH: '🔍',
  LINK: '🔗',
  FILE: '📄',
  FOLDER: '📁',
} as const;