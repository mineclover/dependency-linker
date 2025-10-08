/**
 * 데이터베이스 설정 통일
 * 모든 CLI 명령어가 같은 데이터베이스를 사용하도록 설정
 */

export const DATABASE_CONFIG = {
	// 기본 데이터베이스 경로
	DEFAULT_DATABASE_PATH: "./dependency-graph.db",

	// 환경변수에서 데이터베이스 경로 가져오기
	getDatabasePath(): string {
		return process.env.DEPENDENCY_LINKER_DB_PATH || this.DEFAULT_DATABASE_PATH;
	},

	// 데이터베이스 경로 설정
	setDatabasePath(path: string): void {
		process.env.DEPENDENCY_LINKER_DB_PATH = path;
	},

	// 데이터베이스 경로 검증
	validateDatabasePath(path: string): boolean {
		return path.endsWith(".db") && path.length > 0;
	},
};

/**
 * 통일된 데이터베이스 인스턴스 생성
 */
export function createUnifiedDatabase() {
	const {
		RDFIntegratedGraphDatabase,
	} = require("../../database/RDFIntegratedGraphDatabase.js");
	const dbPath = DATABASE_CONFIG.getDatabasePath();
	return new RDFIntegratedGraphDatabase(dbPath);
}

/**
 * 데이터베이스 초기화
 */
export async function initializeUnifiedDatabase() {
	const database = createUnifiedDatabase();
	await database.initialize();
	return database;
}
