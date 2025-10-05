/**
 * Error Handler
 *
 * 표준화된 에러 처리 시스템
 * CONVENTIONS.md 기준에 따른 에러 관리
 */

export class DependencyLinkerError extends Error {
	public readonly code: string;
	public readonly context?: Record<string, any>;
	public readonly timestamp: Date;

	constructor(message: string, code: string, context?: Record<string, any>) {
		super(message);
		this.name = "DependencyLinkerError";
		this.code = code;
		this.context = context;
		this.timestamp = new Date();

		// 스택 트레이스 보존
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, DependencyLinkerError);
		}
	}

	/**
	 * 에러를 JSON 형태로 직렬화
	 */
	toJSON(): Record<string, any> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
			timestamp: this.timestamp.toISOString(),
			stack: this.stack,
		};
	}
}

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
	// 데이터베이스 관련
	DATABASE_CONNECTION_FAILED: "DATABASE_CONNECTION_FAILED",
	DATABASE_QUERY_FAILED: "DATABASE_QUERY_FAILED",
	DATABASE_TRANSACTION_FAILED: "DATABASE_TRANSACTION_FAILED",

	// 추론 엔진 관련
	INFERENCE_ENGINE_INITIALIZATION_FAILED:
		"INFERENCE_ENGINE_INITIALIZATION_FAILED",
	INFERENCE_QUERY_FAILED: "INFERENCE_QUERY_FAILED",
	INFERENCE_CACHE_FAILED: "INFERENCE_CACHE_FAILED",

	// Edge Type 관련
	EDGE_TYPE_NOT_FOUND: "EDGE_TYPE_NOT_FOUND",
	EDGE_TYPE_NOT_TRANSITIVE: "EDGE_TYPE_NOT_TRANSITIVE",
	EDGE_TYPE_NOT_INHERITABLE: "EDGE_TYPE_NOT_INHERITABLE",

	// 노드 관련
	NODE_NOT_FOUND: "NODE_NOT_FOUND",
	NODE_CREATION_FAILED: "NODE_CREATION_FAILED",
	NODE_UPDATE_FAILED: "NODE_UPDATE_FAILED",

	// 관계 관련
	RELATIONSHIP_CREATION_FAILED: "RELATIONSHIP_CREATION_FAILED",
	RELATIONSHIP_NOT_FOUND: "RELATIONSHIP_NOT_FOUND",
	RELATIONSHIP_DELETION_FAILED: "RELATIONSHIP_DELETION_FAILED",

	// 성능 관련
	PERFORMANCE_MONITORING_FAILED: "PERFORMANCE_MONITORING_FAILED",
	CACHE_OPERATION_FAILED: "CACHE_OPERATION_FAILED",

	// 일반적인 오류
	INVALID_INPUT: "INVALID_INPUT",
	OPERATION_FAILED: "OPERATION_FAILED",
	TIMEOUT: "TIMEOUT",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * 표준화된 에러 핸들러
 */
export class ErrorHandler {
	/**
	 * 에러를 처리하고 적절한 DependencyLinkerError로 변환
	 */
	static handle(error: unknown, context: string, code?: ErrorCode): never {
		// 이미 DependencyLinkerError인 경우
		if (error instanceof DependencyLinkerError) {
			throw error;
		}

		// Error 객체인 경우
		if (error instanceof Error) {
			throw new DependencyLinkerError(
				`Operation failed in ${context}: ${error.message}`,
				code || ERROR_CODES.OPERATION_FAILED,
				{
					originalError: error.message,
					context,
					stack: error.stack,
				},
			);
		}

		// 알 수 없는 에러 타입
		throw new DependencyLinkerError(
			`Unknown error in ${context}: ${String(error)}`,
			code || ERROR_CODES.UNKNOWN_ERROR,
			{
				originalError: error,
				context,
				errorType: typeof error,
			},
		);
	}

	/**
	 * 비동기 작업을 안전하게 실행
	 */
	static async safeExecute<T>(
		operation: () => Promise<T>,
		context: string,
		code?: ErrorCode,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			ErrorHandler.handle(error, context, code);
		}
	}

	/**
	 * 동기 작업을 안전하게 실행
	 */
	static safeExecuteSync<T>(
		operation: () => T,
		context: string,
		code?: ErrorCode,
	): T {
		try {
			return operation();
		} catch (error) {
			ErrorHandler.handle(error, context, code);
		}
	}

	/**
	 * 에러 로깅
	 */
	static logError(
		error: DependencyLinkerError,
		additionalContext?: Record<string, any>,
	): void {
		const logData = {
			...error.toJSON(),
			additionalContext,
			severity: "error",
		};

		// 콘솔 로깅 (개발 환경)
		if (process.env.NODE_ENV === "development") {
			console.error("🚨 DependencyLinker Error:", logData);
		}

		// TODO: 실제 로깅 시스템과 연동
		// Logger.error(logData);
	}

	/**
	 * 에러 복구 시도
	 */
	static async retry<T>(
		operation: () => Promise<T>,
		context: string,
		maxRetries: number = 3,
		delay: number = 1000,
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;

				if (attempt === maxRetries) {
					ErrorHandler.handle(lastError, context);
				}

				// 지연 후 재시도
				await new Promise((resolve) => setTimeout(resolve, delay * attempt));
			}
		}

		// 이 지점에 도달하면 안 됨 (TypeScript 타입 안전성)
		throw new DependencyLinkerError(
			"Retry logic failed",
			ERROR_CODES.OPERATION_FAILED,
			{ context, maxRetries },
		);
	}
}

/**
 * 에러 타입 가드
 */
export function isDependencyLinkerError(
	error: unknown,
): error is DependencyLinkerError {
	return error instanceof DependencyLinkerError;
}

/**
 * 에러 코드 확인
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
	return isDependencyLinkerError(error) && error.code === code;
}

/**
 * 에러 메시지 생성 헬퍼
 */
export function createErrorMessage(
	operation: string,
	details: string,
	context?: Record<string, any>,
): string {
	const contextStr = context ? ` (${JSON.stringify(context)})` : "";
	return `${operation} failed: ${details}${contextStr}`;
}
