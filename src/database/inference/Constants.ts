/**
 * Constants
 *
 * 추론 엔진 관련 상수 정의
 * CONVENTIONS.md 기준에 따른 네이밍 컨벤션 적용
 */

/**
 * 캐시 관련 상수
 */
export const CACHE_CONSTANTS = {
	/** 기본 캐시 크기 */
	DEFAULT_CACHE_SIZE: 1000,

	/** 최대 캐시 크기 */
	MAX_CACHE_SIZE: 10000,

	/** 기본 TTL (밀리초) */
	DEFAULT_TTL: 300000, // 5분

	/** 최대 TTL (밀리초) */
	MAX_TTL: 3600000, // 1시간

	/** 캐시 정리 간격 (밀리초) */
	CLEANUP_INTERVAL: 60000, // 1분
} as const;

/**
 * 성능 관련 상수
 */
export const PERFORMANCE_CONSTANTS = {
	/** 기본 최대 경로 길이 */
	DEFAULT_MAX_PATH_LENGTH: 10,

	/** 최대 경로 길이 */
	MAX_PATH_LENGTH: 100,

	/** 기본 최대 계층 깊이 */
	DEFAULT_MAX_HIERARCHY_DEPTH: Infinity,

	/** 최대 계층 깊이 */
	MAX_HIERARCHY_DEPTH: 50,

	/** 기본 배치 크기 */
	DEFAULT_BATCH_SIZE: 50,

	/** 최대 배치 크기 */
	MAX_BATCH_SIZE: 1000,

	/** 기본 타임아웃 (밀리초) */
	DEFAULT_TIMEOUT: 30000, // 30초

	/** 최대 타임아웃 (밀리초) */
	MAX_TIMEOUT: 300000, // 5분
} as const;

/**
 * 데이터베이스 관련 상수
 */
export const DATABASE_CONSTANTS = {
	/** 기본 페이지 크기 */
	DEFAULT_PAGE_SIZE: 100,

	/** 최대 페이지 크기 */
	MAX_PAGE_SIZE: 1000,

	/** 기본 연결 타임아웃 (밀리초) */
	DEFAULT_CONNECTION_TIMEOUT: 10000, // 10초

	/** 최대 연결 타임아웃 (밀리초) */
	MAX_CONNECTION_TIMEOUT: 60000, // 1분
} as const;

/**
 * Edge Type 관련 상수
 */
export const EDGE_TYPE_CONSTANTS = {
	/** 기본 우선순위 */
	DEFAULT_PRIORITY: 0,

	/** 최고 우선순위 */
	HIGHEST_PRIORITY: -100,

	/** 최저 우선순위 */
	LOWEST_PRIORITY: 100,

	/** 최대 우선순위 범위 */
	MAX_PRIORITY_RANGE: 200,
} as const;

/**
 * 추론 관련 상수
 */
export const INFERENCE_CONSTANTS = {
	/** 기본 추론 깊이 */
	DEFAULT_INFERENCE_DEPTH: 3,

	/** 최대 추론 깊이 */
	MAX_INFERENCE_DEPTH: 10,

	/** 기본 순환 탐지 임계값 */
	DEFAULT_CYCLE_DETECTION_THRESHOLD: 100,

	/** 최대 순환 탐지 임계값 */
	MAX_CYCLE_DETECTION_THRESHOLD: 1000,
} as const;

/**
 * 모니터링 관련 상수
 */
export const MONITORING_CONSTANTS = {
	/** 기본 모니터링 간격 (밀리초) */
	DEFAULT_MONITORING_INTERVAL: 60000, // 1분

	/** 최소 모니터링 간격 (밀리초) */
	MIN_MONITORING_INTERVAL: 10000, // 10초

	/** 최대 모니터링 간격 (밀리초) */
	MAX_MONITORING_INTERVAL: 300000, // 5분

	/** 기본 메트릭 보관 기간 (일) */
	DEFAULT_METRICS_RETENTION_DAYS: 7,

	/** 최대 메트릭 보관 기간 (일) */
	MAX_METRICS_RETENTION_DAYS: 30,
} as const;

/**
 * 쿼리 관련 상수
 */
export const QUERY_CONSTANTS = {
	/** 기본 쿼리 제한 */
	DEFAULT_QUERY_LIMIT: 1000,

	/** 최대 쿼리 제한 */
	MAX_QUERY_LIMIT: 10000,

	/** 기본 쿼리 오프셋 */
	DEFAULT_QUERY_OFFSET: 0,

	/** 최대 쿼리 오프셋 */
	MAX_QUERY_OFFSET: 100000,
} as const;

/**
 * 로깅 관련 상수
 */
export const LOGGING_CONSTANTS = {
	/** 로그 레벨 */
	LOG_LEVELS: {
		ERROR: "error",
		WARN: "warn",
		INFO: "info",
		DEBUG: "debug",
		TRACE: "trace",
	} as const,

	/** 기본 로그 레벨 */
	DEFAULT_LOG_LEVEL: "info",

	/** 최대 로그 파일 크기 (바이트) */
	MAX_LOG_FILE_SIZE: 10 * 1024 * 1024, // 10MB

	/** 최대 로그 파일 개수 */
	MAX_LOG_FILES: 5,
} as const;

/**
 * 검증 관련 상수
 */
export const VALIDATION_CONSTANTS = {
	/** 최소 노드 ID */
	MIN_NODE_ID: 1,

	/** 최대 노드 ID */
	MAX_NODE_ID: Number.MAX_SAFE_INTEGER,

	/** 최소 관계 ID */
	MIN_RELATIONSHIP_ID: 1,

	/** 최대 관계 ID */
	MAX_RELATIONSHIP_ID: Number.MAX_SAFE_INTEGER,

	/** 최소 문자열 길이 */
	MIN_STRING_LENGTH: 1,

	/** 최대 문자열 길이 */
	MAX_STRING_LENGTH: 1000,

	/** 최소 숫자 값 */
	MIN_NUMBER_VALUE: Number.MIN_SAFE_INTEGER,

	/** 최대 숫자 값 */
	MAX_NUMBER_VALUE: Number.MAX_SAFE_INTEGER,
} as const;

/**
 * 환경 관련 상수
 */
export const ENVIRONMENT_CONSTANTS = {
	/** 개발 환경 */
	DEVELOPMENT: "development",

	/** 프로덕션 환경 */
	PRODUCTION: "production",

	/** 테스트 환경 */
	TEST: "test",

	/** 스테이징 환경 */
	STAGING: "staging",
} as const;

/**
 * 파일 관련 상수
 */
export const FILE_CONSTANTS = {
	/** 지원되는 파일 확장자 */
	SUPPORTED_EXTENSIONS: [
		".ts",
		".tsx",
		".js",
		".jsx",
		".py",
		".java",
		".go",
		".md",
		".json",
		".yaml",
		".yml",
	] as const,

	/** 최대 파일 크기 (바이트) */
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

	/** 최소 파일 크기 (바이트) */
	MIN_FILE_SIZE: 1,

	/** 기본 인코딩 */
	DEFAULT_ENCODING: "utf8",
} as const;

/**
 * API 관련 상수
 */
export const API_CONSTANTS = {
	/** 기본 API 버전 */
	DEFAULT_API_VERSION: "v1",

	/** 지원되는 API 버전 */
	SUPPORTED_API_VERSIONS: ["v1", "v2"] as const,

	/** 기본 응답 형식 */
	DEFAULT_RESPONSE_FORMAT: "json",

	/** 지원되는 응답 형식 */
	SUPPORTED_RESPONSE_FORMATS: ["json", "xml", "yaml"] as const,
} as const;

/**
 * 타입 가드 헬퍼
 */
export const TypeGuards = {
	/**
	 * 문자열이 유효한 길이인지 확인
	 */
	isValidStringLength(
		value: string,
		min: number = VALIDATION_CONSTANTS.MIN_STRING_LENGTH,
		max: number = VALIDATION_CONSTANTS.MAX_STRING_LENGTH,
	): boolean {
		return value.length >= min && value.length <= max;
	},

	/**
	 * 숫자가 유효한 범위인지 확인
	 */
	isValidNumber(
		value: number,
		min: number = VALIDATION_CONSTANTS.MIN_NUMBER_VALUE,
		max: number = VALIDATION_CONSTANTS.MAX_NUMBER_VALUE,
	): boolean {
		return value >= min && value <= max && Number.isFinite(value);
	},

	/**
	 * ID가 유효한지 확인
	 */
	isValidId(
		id: number,
		min: number = VALIDATION_CONSTANTS.MIN_NODE_ID,
		max: number = VALIDATION_CONSTANTS.MAX_NODE_ID,
	): boolean {
		return Number.isInteger(id) && id >= min && id <= max;
	},

	/**
	 * 파일 확장자가 지원되는지 확인
	 */
	isSupportedFileExtension(filename: string): boolean {
		const extension = filename
			.toLowerCase()
			.substring(filename.lastIndexOf("."));
		return FILE_CONSTANTS.SUPPORTED_EXTENSIONS.includes(extension as any);
	},
} as const;

/**
 * 설정 검증 헬퍼
 */
export const ConfigValidators = {
	/**
	 * 캐시 설정 검증
	 */
	validateCacheConfig(config: { size?: number; ttl?: number }): void {
		if (config.size !== undefined) {
			if (
				!TypeGuards.isValidNumber(
					config.size,
					1,
					CACHE_CONSTANTS.MAX_CACHE_SIZE,
				)
			) {
				throw new Error(
					`Invalid cache size: ${config.size}. Must be between 1 and ${CACHE_CONSTANTS.MAX_CACHE_SIZE}`,
				);
			}
		}

		if (config.ttl !== undefined) {
			if (
				!TypeGuards.isValidNumber(config.ttl, 1000, CACHE_CONSTANTS.MAX_TTL)
			) {
				throw new Error(
					`Invalid cache TTL: ${config.ttl}. Must be between 1000 and ${CACHE_CONSTANTS.MAX_TTL} milliseconds`,
				);
			}
		}
	},

	/**
	 * 성능 설정 검증
	 */
	validatePerformanceConfig(config: {
		maxPathLength?: number;
		maxHierarchyDepth?: number;
	}): void {
		if (config.maxPathLength !== undefined) {
			if (
				!TypeGuards.isValidNumber(
					config.maxPathLength,
					1,
					PERFORMANCE_CONSTANTS.MAX_PATH_LENGTH,
				)
			) {
				throw new Error(
					`Invalid max path length: ${config.maxPathLength}. Must be between 1 and ${PERFORMANCE_CONSTANTS.MAX_PATH_LENGTH}`,
				);
			}
		}

		if (config.maxHierarchyDepth !== undefined) {
			if (
				!TypeGuards.isValidNumber(
					config.maxHierarchyDepth,
					1,
					PERFORMANCE_CONSTANTS.MAX_HIERARCHY_DEPTH,
				)
			) {
				throw new Error(
					`Invalid max hierarchy depth: ${config.maxHierarchyDepth}. Must be between 1 and ${PERFORMANCE_CONSTANTS.MAX_HIERARCHY_DEPTH}`,
				);
			}
		}
	},
} as const;
