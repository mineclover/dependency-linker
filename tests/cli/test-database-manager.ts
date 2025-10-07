/**
 * 테스트용 데이터베이스 관리자
 * 테스트 간 데이터베이스 격리 및 관리를 담당
 */

import { GraphDatabase } from "../../src/database/GraphDatabase";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export class TestDatabaseManager {
	private testDbPath: string;
	private testDb: GraphDatabase | null = null;
	private isInitialized = false;

	constructor(testId?: string) {
		const id = testId || uuidv4().substring(0, 8);
		this.testDbPath = `test-dependency-linker-${id}.db`;
	}

	/**
	 * 테스트용 데이터베이스 초기화
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		// 기존 테스트 데이터베이스가 있다면 삭제
		await this.cleanup();

		// 새로운 테스트 데이터베이스 생성
		this.testDb = new GraphDatabase(this.testDbPath);
		await this.testDb.initialize();

		this.isInitialized = true;
	}

	/**
	 * 테스트용 데이터베이스 인스턴스 반환
	 */
	getDatabase(): GraphDatabase {
		if (!this.testDb) {
			throw new Error("Database not initialized. Call initialize() first.");
		}
		return this.testDb;
	}

	/**
	 * 테스트용 데이터베이스 경로 반환
	 */
	getDatabasePath(): string {
		return this.testDbPath;
	}

	/**
	 * 테스트용 데이터베이스 정리
	 */
	async cleanup(): Promise<void> {
		if (this.testDb) {
			await this.testDb.close();
			this.testDb = null;
		}

		if (fs.existsSync(this.testDbPath)) {
			fs.unlinkSync(this.testDbPath);
		}

		this.isInitialized = false;
	}

	/**
	 * 테스트용 데이터베이스가 존재하는지 확인
	 */
	exists(): boolean {
		return fs.existsSync(this.testDbPath);
	}

	/**
	 * 테스트용 데이터베이스 크기 반환
	 */
	getSize(): number {
		if (!this.exists()) {
			return 0;
		}
		return fs.statSync(this.testDbPath).size;
	}

	/**
	 * 테스트용 데이터베이스 백업
	 */
	async backup(backupPath: string): Promise<void> {
		if (!this.exists()) {
			throw new Error("Database does not exist");
		}

		fs.copyFileSync(this.testDbPath, backupPath);
	}

	/**
	 * 테스트용 데이터베이스 복원
	 */
	async restore(backupPath: string): Promise<void> {
		if (!fs.existsSync(backupPath)) {
			throw new Error("Backup file does not exist");
		}

		await this.cleanup();
		fs.copyFileSync(backupPath, this.testDbPath);
		await this.initialize();
	}

	/**
	 * 테스트용 데이터베이스 초기화 (데이터만 삭제)
	 */
	async reset(): Promise<void> {
		if (!this.testDb) {
			throw new Error("Database not initialized");
		}

		// 모든 테이블 데이터 삭제
		await this.testDb.executeQuery("DELETE FROM relationships");
		await this.testDb.executeQuery("DELETE FROM nodes");
		await this.testDb.executeQuery("DELETE FROM files");
		await this.testDb.executeQuery("DELETE FROM projects");
	}

	/**
	 * 테스트용 데이터베이스 상태 확인
	 */
	async getStatus(): Promise<{
		exists: boolean;
		size: number;
		nodeCount: number;
		relationshipCount: number;
		fileCount: number;
		projectCount: number;
	}> {
		const exists = this.exists();
		const size = this.getSize();

		let nodeCount = 0;
		let relationshipCount = 0;
		let fileCount = 0;
		let projectCount = 0;

		if (exists && this.testDb) {
			try {
				const nodes = await this.testDb.executeQuery(
					"SELECT COUNT(*) as count FROM nodes",
				);
				nodeCount = nodes[0]?.count || 0;

				const relationships = await this.testDb.executeQuery(
					"SELECT COUNT(*) as count FROM relationships",
				);
				relationshipCount = relationships[0]?.count || 0;

				const files = await this.testDb.executeQuery(
					"SELECT COUNT(*) as count FROM files",
				);
				fileCount = files[0]?.count || 0;

				const projects = await this.testDb.executeQuery(
					"SELECT COUNT(*) as count FROM projects",
				);
				projectCount = projects[0]?.count || 0;
			} catch (error) {
				// 테이블이 아직 생성되지 않은 경우
			}
		}

		return {
			exists,
			size,
			nodeCount,
			relationshipCount,
			fileCount,
			projectCount,
		};
	}

	/**
	 * 테스트용 데이터베이스에 샘플 데이터 삽입
	 */
	async insertSampleData(): Promise<void> {
		if (!this.testDb) {
			throw new Error("Database not initialized");
		}

		// 샘플 프로젝트 데이터
		await this.testDb.executeQuery(`
      INSERT INTO projects (name, description, root_path, created_at, updated_at)
      VALUES ('test-project', 'Test Project', '/test', datetime('now'), datetime('now'))
    `);

		// 샘플 파일 데이터
		await this.testDb.executeQuery(`
      INSERT INTO files (project_id, path, language, size, created_at, updated_at)
      VALUES (1, 'src/UserService.ts', 'typescript', 1024, datetime('now'), datetime('now'))
    `);

		// 샘플 노드 데이터
		await this.testDb.executeQuery(`
      INSERT INTO nodes (identifier, type, name, source_file, language, semantic_tags, metadata, start_line, start_column, end_line, end_column, created_at, updated_at)
      VALUES ('UserService', 'class', 'UserService', 'src/UserService.ts', 'typescript', '["service-layer", "auth-domain"]', '{}', 1, 1, 10, 1, datetime('now'), datetime('now'))
    `);

		// 샘플 관계 데이터
		await this.testDb.executeQuery(`
      INSERT INTO relationships (from_node_id, to_node_id, type, weight, metadata, created_at, updated_at)
      VALUES (1, 1, 'contains', 1.0, '{}', datetime('now'), datetime('now'))
    `);
	}

	/**
	 * 테스트용 데이터베이스 검증
	 */
	async validate(): Promise<{
		isValid: boolean;
		errors: string[];
	}> {
		const errors: string[] = [];

		if (!this.exists()) {
			errors.push("Database file does not exist");
			return { isValid: false, errors };
		}

		if (!this.testDb) {
			errors.push("Database instance is null");
			return { isValid: false, errors };
		}

		try {
			// 데이터베이스 연결 테스트
			await this.testDb.executeQuery("SELECT 1");
		} catch (error) {
			errors.push(`Database connection failed: ${error}`);
		}

		try {
			// 테이블 존재 확인
			const tables = await this.testDb.executeQuery(`
        SELECT name FROM sqlite_master WHERE type='table' AND name IN ('nodes', 'relationships', 'files', 'projects')
      `);

			const expectedTables = ["nodes", "relationships", "files", "projects"];
			const existingTables = tables.map((row: any) => row.name);

			for (const table of expectedTables) {
				if (!existingTables.includes(table)) {
					errors.push(`Table '${table}' does not exist`);
				}
			}
		} catch (error) {
			errors.push(`Table validation failed: ${error}`);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * 테스트용 데이터베이스 통계
	 */
	async getStatistics(): Promise<{
		totalNodes: number;
		totalRelationships: number;
		totalFiles: number;
		totalProjects: number;
		nodeTypes: Record<string, number>;
		relationshipTypes: Record<string, number>;
		languages: Record<string, number>;
	}> {
		if (!this.testDb) {
			throw new Error("Database not initialized");
		}

		const stats = {
			totalNodes: 0,
			totalRelationships: 0,
			totalFiles: 0,
			totalProjects: 0,
			nodeTypes: {} as Record<string, number>,
			relationshipTypes: {} as Record<string, number>,
			languages: {} as Record<string, number>,
		};

		try {
			// 기본 통계
			const nodeCount = await this.testDb.executeQuery(
				"SELECT COUNT(*) as count FROM nodes",
			);
			stats.totalNodes = nodeCount[0]?.count || 0;

			const relationshipCount = await this.testDb.executeQuery(
				"SELECT COUNT(*) as count FROM relationships",
			);
			stats.totalRelationships = relationshipCount[0]?.count || 0;

			const fileCount = await this.testDb.executeQuery(
				"SELECT COUNT(*) as count FROM files",
			);
			stats.totalFiles = fileCount[0]?.count || 0;

			const projectCount = await this.testDb.executeQuery(
				"SELECT COUNT(*) as count FROM projects",
			);
			stats.totalProjects = projectCount[0]?.count || 0;

			// 노드 타입별 통계
			const nodeTypes = await this.testDb.executeQuery(
				"SELECT type, COUNT(*) as count FROM nodes GROUP BY type",
			);
			for (const row of nodeTypes) {
				stats.nodeTypes[row.type] = row.count;
			}

			// 관계 타입별 통계
			const relationshipTypes = await this.testDb.executeQuery(
				"SELECT type, COUNT(*) as count FROM relationships GROUP BY type",
			);
			for (const row of relationshipTypes) {
				stats.relationshipTypes[row.type] = row.count;
			}

			// 언어별 통계
			const languages = await this.testDb.executeQuery(
				"SELECT language, COUNT(*) as count FROM nodes GROUP BY language",
			);
			for (const row of languages) {
				stats.languages[row.language] = row.count;
			}
		} catch (error) {
			// 테이블이 아직 생성되지 않은 경우
		}

		return stats;
	}
}
