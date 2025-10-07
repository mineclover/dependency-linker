/**
 * RDF Database Integration API
 * RDF 주소 시스템과 데이터베이스 통합 API
 */

import type { NodeType } from "../core/RDFAddress";
import type { RDFSymbolExtractionResult } from "../core/types";
import type {
	RDFAddressSearchResult,
	RDFAddressStoreOptions,
	RDFRelationshipSearchResult,
	RDFRelationshipStoreOptions,
	RDFStatistics,
} from "../database/RDFIntegratedGraphDatabase";
import { RDFIntegratedGraphDatabase } from "../database/RDFIntegratedGraphDatabase";

// ===== RDF DATABASE API =====

/**
 * RDF 통합 데이터베이스 API
 */
export class RDFDatabaseAPI {
	private db: RDFIntegratedGraphDatabase;

	constructor(dbPath: string = "./dependency-linker.db") {
		this.db = new RDFIntegratedGraphDatabase(dbPath);
	}

	/**
	 * 데이터베이스 초기화
	 */
	async initialize(): Promise<void> {
		await this.db.initialize();
	}

	/**
	 * RDF 주소 저장
	 */
	async storeRDFAddress(options: RDFAddressStoreOptions): Promise<void> {
		await this.db.storeRDFAddress(options);
	}

	/**
	 * RDF 심볼 추출 결과를 데이터베이스에 저장
	 */
	async storeRDFSymbolExtractionResult(
		result: RDFSymbolExtractionResult,
		projectName: string,
		filePath: string,
	): Promise<void> {
		const options: RDFAddressStoreOptions = {
			rdfAddress: result.rdfAddress,
			projectName,
			filePath,
			nodeType: result.nodeType,
			symbolName: result.symbolName,
			namespace: result.namespace,
			localName: result.localName,
			lineNumber: result.metadata.lineNumber,
			columnNumber: result.metadata.columnNumber,
			accessModifier: result.metadata.accessModifier,
			isStatic: result.metadata.isStatic,
			isAsync: result.metadata.isAsync,
			isAbstract: result.metadata.isAbstract,
		};

		await this.storeRDFAddress(options);
	}

	/**
	 * RDF 관계 저장
	 */
	async storeRDFRelationship(
		options: RDFRelationshipStoreOptions,
	): Promise<void> {
		await this.db.storeRDFRelationship(options);
	}

	/**
	 * RDF 주소 검색
	 */
	async searchByRDFAddress(
		rdfAddress: string,
	): Promise<RDFAddressSearchResult | null> {
		return await this.db.searchByRDFAddress(rdfAddress);
	}

	/**
	 * RDF 주소 검색 (부분 일치)
	 */
	async searchRDFAddresses(
		query: string,
		options: {
			projectName?: string;
			filePath?: string;
			nodeType?: NodeType;
			symbolName?: string;
			namespace?: string;
			limit?: number;
		} = {},
	): Promise<RDFAddressSearchResult[]> {
		return await this.db.searchRDFAddresses(query, options);
	}

	/**
	 * 프로젝트별 RDF 주소 조회
	 */
	async getRDFAddressesByProject(
		projectName: string,
	): Promise<RDFAddressSearchResult[]> {
		return await this.db.getRDFAddressesByProject(projectName);
	}

	/**
	 * 파일별 RDF 주소 조회
	 */
	async getRDFAddressesByFile(
		filePath: string,
	): Promise<RDFAddressSearchResult[]> {
		return await this.db.getRDFAddressesByFile(filePath);
	}

	/**
	 * NodeType별 RDF 주소 조회
	 */
	async getRDFAddressesByNodeType(
		nodeType: NodeType,
	): Promise<RDFAddressSearchResult[]> {
		return await this.db.getRDFAddressesByNodeType(nodeType);
	}

	/**
	 * 네임스페이스별 RDF 주소 조회
	 */
	async getRDFAddressesByNamespace(
		namespace: string,
	): Promise<RDFAddressSearchResult[]> {
		return await this.db.getRDFAddressesByNamespace(namespace);
	}

	/**
	 * RDF 관계 검색
	 */
	async getRDFRelationships(
		rdfAddress: string,
		options: {
			direction?: "incoming" | "outgoing" | "both";
			relationshipType?: string;
		} = {},
	): Promise<RDFRelationshipSearchResult[]> {
		return await this.db.getRDFRelationships(rdfAddress, options);
	}

	/**
	 * RDF 통계 생성
	 */
	async generateRDFStatistics(): Promise<RDFStatistics> {
		return await this.db.generateRDFStatistics();
	}

	/**
	 * RDF 주소 삭제
	 */
	async deleteRDFAddress(rdfAddress: string): Promise<void> {
		await this.db.deleteRDFAddress(rdfAddress);
	}

	/**
	 * RDF 주소 업데이트
	 */
	async updateRDFAddress(
		rdfAddress: string,
		updates: Partial<RDFAddressStoreOptions>,
	): Promise<void> {
		await this.db.updateRDFAddress(rdfAddress, updates);
	}

	/**
	 * 데이터베이스 연결 종료
	 */
	async close(): Promise<void> {
		await this.db.close();
	}
}

// ===== UTILITY FUNCTIONS =====

/**
 * RDF 주소를 데이터베이스에 저장하는 헬퍼 함수
 */
export async function storeRDFAddressesToDatabase(
	addresses: RDFSymbolExtractionResult[],
	projectName: string,
	filePath: string,
	dbPath: string = "./dependency-linker.db",
): Promise<void> {
	const api = new RDFDatabaseAPI(dbPath);
	await api.initialize();

	try {
		for (const address of addresses) {
			await api.storeRDFSymbolExtractionResult(address, projectName, filePath);
		}
	} finally {
		await api.close();
	}
}

/**
 * RDF 주소 검색 헬퍼 함수
 */
export async function searchRDFAddressesInDatabase(
	query: string,
	options: {
		projectName?: string;
		filePath?: string;
		nodeType?: NodeType;
		symbolName?: string;
		namespace?: string;
		limit?: number;
	} = {},
	dbPath: string = "./dependency-linker.db",
): Promise<RDFAddressSearchResult[]> {
	const api = new RDFDatabaseAPI(dbPath);
	await api.initialize();

	try {
		return await api.searchRDFAddresses(query, options);
	} finally {
		await api.close();
	}
}

/**
 * RDF 통계 생성 헬퍼 함수
 */
export async function generateRDFStatisticsFromDatabase(
	dbPath: string = "./dependency-linker.db",
): Promise<RDFStatistics> {
	const api = new RDFDatabaseAPI(dbPath);
	await api.initialize();

	try {
		return await api.generateRDFStatistics();
	} finally {
		await api.close();
	}
}

/**
 * RDF 관계 저장 헬퍼 함수
 */
export async function storeRDFRelationshipToDatabase(
	options: RDFRelationshipStoreOptions,
	dbPath: string = "./dependency-linker.db",
): Promise<void> {
	const api = new RDFDatabaseAPI(dbPath);
	await api.initialize();

	try {
		await api.storeRDFRelationship(options);
	} finally {
		await api.close();
	}
}
