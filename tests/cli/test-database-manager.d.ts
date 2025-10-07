import { GraphDatabase } from "../../src/database/GraphDatabase";
export declare class TestDatabaseManager {
	private testDbPath;
	private testDb;
	private isInitialized;
	constructor(testId?: string);
	initialize(): Promise<void>;
	getDatabase(): GraphDatabase;
	getDatabasePath(): string;
	cleanup(): Promise<void>;
	exists(): boolean;
	getSize(): number;
	backup(backupPath: string): Promise<void>;
	restore(backupPath: string): Promise<void>;
	reset(): Promise<void>;
	getStatus(): Promise<{
		exists: boolean;
		size: number;
		nodeCount: number;
		relationshipCount: number;
		fileCount: number;
		projectCount: number;
	}>;
	insertSampleData(): Promise<void>;
	validate(): Promise<{
		isValid: boolean;
		errors: string[];
	}>;
	getStatistics(): Promise<{
		totalNodes: number;
		totalRelationships: number;
		totalFiles: number;
		totalProjects: number;
		nodeTypes: Record<string, number>;
		relationshipTypes: Record<string, number>;
		languages: Record<string, number>;
	}>;
}
//# sourceMappingURL=test-database-manager.d.ts.map
