/**
 * RDF Integrated Graph Database
 * RDF 주소 시스템과 통합된 GraphDatabase 확장
 */

import { Database } from "sqlite3";
import type { NodeType } from "../core/RDFAddress";
import type {
	RDFNodeIdentifier,
	RDFSymbolExtractionResult,
} from "../core/types";
import { GraphDatabase } from "./GraphDatabase";

// ===== RDF DATABASE TYPES =====

/**
 * RDF 주소 저장 옵션
 */
export interface RDFAddressStoreOptions {
	rdfAddress: string;
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	namespace?: string;
	localName?: string;
	lineNumber?: number;
	columnNumber?: number;
	accessModifier?: "public" | "private" | "protected";
	isStatic?: boolean;
	isAsync?: boolean;
	isAbstract?: boolean;
}

/**
 * RDF 관계 저장 옵션
 */
export interface RDFRelationshipStoreOptions {
	sourceRdfAddress: string;
	targetRdfAddress: string;
	relationshipType: string;
	metadata?: Record<string, any>;
}

/**
 * RDF 주소 검색 결과
 */
export interface RDFAddressSearchResult {
	rdfAddress: string;
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	namespace?: string;
	localName?: string;
	lineNumber?: number;
	columnNumber?: number;
	accessModifier?: string;
	isStatic: boolean;
	isAsync: boolean;
	isAbstract: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * RDF 관계 검색 결과
 */
export interface RDFRelationshipSearchResult {
	id: number;
	sourceRdfAddress: string;
	targetRdfAddress: string;
	relationshipType: string;
	metadata: Record<string, any>;
	createdAt: string;
}

/**
 * RDF 통계 결과
 */
export interface RDFStatistics {
	totalAddresses: number;
	totalRelationships: number;
	projectCount: number;
	fileCount: number;
	nodeTypeCount: Record<NodeType, number>;
	namespaceCount: Record<string, number>;
	relationshipTypeCount: Record<string, number>;
	invalidAddresses: number;
}

// ===== RDF INTEGRATED GRAPH DATABASE =====

/**
 * RDF 통합 GraphDatabase
 */
export class RDFIntegratedGraphDatabase extends GraphDatabase {
	constructor(dbPath: string) {
		super(dbPath);
	}

	// ===== RDF ADDRESS MANAGEMENT =====

	/**
	 * RDF 주소 저장
	 */
	async storeRDFAddress(options: RDFAddressStoreOptions): Promise<void> {
		const {
			rdfAddress,
			projectName,
			filePath,
			nodeType,
			symbolName,
			namespace,
			localName,
			lineNumber,
			columnNumber,
			accessModifier,
			isStatic = false,
			isAsync = false,
			isAbstract = false,
		} = options;

		const query = `
			INSERT OR REPLACE INTO rdf_addresses (
				rdf_address, project_name, file_path, node_type, symbol_name,
				namespace, local_name, line_number, column_number, access_modifier,
				is_static, is_async, is_abstract
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;

		await new Promise<void>((resolve, reject) => {
			(this as any).db.run(
				query,
				[
					rdfAddress,
					projectName,
					filePath,
					nodeType,
					symbolName,
					namespace || null,
					localName || null,
					lineNumber || null,
					columnNumber || null,
					accessModifier || null,
					isStatic,
					isAsync,
					isAbstract,
				],
				(err: any) => {
					if (err) reject(err);
					else resolve();
				},
			);
		});
	}

	/**
	 * RDF 주소 검색
	 */
	async searchByRDFAddress(
		rdfAddress: string,
	): Promise<RDFAddressSearchResult | null> {
		const query = `
			SELECT * FROM rdf_addresses WHERE rdf_address = ?
		`;

		const result = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(query, [rdfAddress], (err: any, row: any) => {
				if (err) reject(err);
				else resolve(row);
			});
		});
		return result ? this.mapRDFAddressResult(result) : null;
	}

	/**
	 * 프로젝트별 RDF 주소 조회
	 */
	async getRDFAddressesByProject(
		projectName: string,
	): Promise<RDFAddressSearchResult[]> {
		const query = `
			SELECT * FROM rdf_addresses WHERE project_name = ?
			ORDER BY file_path, symbol_name
		`;

		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(query, [projectName], (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFAddressResult);
	}

	/**
	 * 파일별 RDF 주소 조회
	 */
	async getRDFAddressesByFile(
		filePath: string,
	): Promise<RDFAddressSearchResult[]> {
		const query = `
			SELECT * FROM rdf_addresses WHERE file_path = ?
			ORDER BY symbol_name
		`;

		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(query, [filePath], (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFAddressResult);
	}

	/**
	 * NodeType별 RDF 주소 조회
	 */
	async getRDFAddressesByNodeType(
		nodeType: NodeType,
	): Promise<RDFAddressSearchResult[]> {
		const query = `
			SELECT * FROM rdf_addresses WHERE node_type = ?
			ORDER BY project_name, file_path, symbol_name
		`;

		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(query, [nodeType], (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFAddressResult);
	}

	/**
	 * 네임스페이스별 RDF 주소 조회
	 */
	async getRDFAddressesByNamespace(
		namespace: string,
	): Promise<RDFAddressSearchResult[]> {
		const query = `
			SELECT * FROM rdf_addresses WHERE namespace = ?
			ORDER BY project_name, file_path, symbol_name
		`;

		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(query, [namespace], (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFAddressResult);
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
		const {
			projectName,
			filePath,
			nodeType,
			symbolName,
			namespace,
			limit = 100,
		} = options;

		const whereConditions: string[] = [];
		const params: any[] = [];

		// 기본 검색 쿼리
		if (query) {
			whereConditions.push(
				"(rdf_address LIKE ? OR symbol_name LIKE ? OR file_path LIKE ?)",
			);
			params.push(`%${query}%`, `%${query}%`, `%${query}%`);
		}

		// 필터 조건
		if (projectName) {
			whereConditions.push("project_name = ?");
			params.push(projectName);
		}
		if (filePath) {
			whereConditions.push("file_path LIKE ?");
			params.push(`%${filePath}%`);
		}
		if (nodeType) {
			whereConditions.push("node_type = ?");
			params.push(nodeType);
		}
		if (symbolName) {
			whereConditions.push("symbol_name LIKE ?");
			params.push(`%${symbolName}%`);
		}
		if (namespace) {
			whereConditions.push("namespace = ?");
			params.push(namespace);
		}

		const whereClause =
			whereConditions.length > 0
				? `WHERE ${whereConditions.join(" AND ")}`
				: "";
		const sql = `
			SELECT * FROM rdf_addresses ${whereClause}
			ORDER BY project_name, file_path, symbol_name
			LIMIT ?
		`;

		params.push(limit);
		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(sql, params, (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFAddressResult);
	}

	// ===== RDF RELATIONSHIP MANAGEMENT =====

	/**
	 * RDF 관계 저장
	 */
	async storeRDFRelationship(
		options: RDFRelationshipStoreOptions,
	): Promise<void> {
		const {
			sourceRdfAddress,
			targetRdfAddress,
			relationshipType,
			metadata = {},
		} = options;

		const query = `
			INSERT OR REPLACE INTO rdf_relationships (
				source_rdf_address, target_rdf_address, relationship_type, metadata
			) VALUES (?, ?, ?, ?)
		`;

		await new Promise<void>((resolve, reject) => {
			(this as any).db.run(
				query,
				[
					sourceRdfAddress,
					targetRdfAddress,
					relationshipType,
					JSON.stringify(metadata),
				],
				(err: any) => {
					if (err) reject(err);
					else resolve();
				},
			);
		});
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
		const { direction = "both", relationshipType } = options;

		const whereConditions: string[] = [];
		const params: any[] = [];

		if (direction === "incoming" || direction === "both") {
			whereConditions.push("target_rdf_address = ?");
			params.push(rdfAddress);
		}
		if (direction === "outgoing" || direction === "both") {
			whereConditions.push("source_rdf_address = ?");
			params.push(rdfAddress);
		}
		if (relationshipType) {
			whereConditions.push("relationship_type = ?");
			params.push(relationshipType);
		}

		const whereClause =
			whereConditions.length > 0 ? `WHERE ${whereConditions.join(" OR ")}` : "";
		const sql = `
			SELECT * FROM rdf_relationships ${whereClause}
			ORDER BY created_at DESC
		`;

		const results = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(sql, params, (err: any, rows: any) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		return results.map(this.mapRDFRelationshipResult);
	}

	// ===== RDF STATISTICS =====

	/**
	 * RDF 통계 생성
	 */
	async generateRDFStatistics(): Promise<RDFStatistics> {
		// 기본 통계
		const totalAddresses = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(
				"SELECT COUNT(*) as count FROM rdf_addresses",
				(err: any, row: any) => {
					if (err) reject(err);
					else resolve(row);
				},
			);
		});
		const totalRelationships = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(
				"SELECT COUNT(*) as count FROM rdf_relationships",
				(err: any, row: any) => {
					if (err) reject(err);
					else resolve(row);
				},
			);
		});

		// 프로젝트 수
		const projectCount = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(
				"SELECT COUNT(DISTINCT project_name) as count FROM rdf_addresses",
				(err: any, row: any) => {
					if (err) reject(err);
					else resolve(row);
				},
			);
		});

		// 파일 수
		const fileCount = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(
				"SELECT COUNT(DISTINCT file_path) as count FROM rdf_addresses",
				(err: any, row: any) => {
					if (err) reject(err);
					else resolve(row);
				},
			);
		});

		// NodeType별 통계
		const nodeTypeStats = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(
				`
				SELECT node_type, COUNT(*) as count 
				FROM rdf_addresses 
				GROUP BY node_type
			`,
				(err: any, rows: any) => {
					if (err) reject(err);
					else resolve(rows);
				},
			);
		});

		// 네임스페이스별 통계
		const namespaceStats = await new Promise<any[]>((resolve, reject) => {
			(this as any).db.all(
				`
				SELECT namespace, COUNT(*) as count 
				FROM rdf_addresses 
				WHERE namespace IS NOT NULL 
				GROUP BY namespace
			`,
				(err: any, rows: any) => {
					if (err) reject(err);
					else resolve(rows);
				},
			);
		});

		// 관계 타입별 통계
		const relationshipTypeStats = await new Promise<any[]>(
			(resolve, reject) => {
				(this as any).db.all(
					`
				SELECT relationship_type, COUNT(*) as count 
				FROM rdf_relationships 
				GROUP BY relationship_type
			`,
					(err: any, rows: any) => {
						if (err) reject(err);
						else resolve(rows);
					},
				);
			},
		);

		// 유효하지 않은 주소 수 (파싱 실패)
		const invalidAddresses = await new Promise<any>((resolve, reject) => {
			(this as any).db.get(
				`
				SELECT COUNT(*) as count FROM rdf_addresses 
				WHERE rdf_address NOT LIKE '%#%' OR rdf_address NOT LIKE '%:%'
			`,
				(err: any, row: any) => {
					if (err) reject(err);
					else resolve(row);
				},
			);
		});

		return {
			totalAddresses: totalAddresses?.count || 0,
			totalRelationships: totalRelationships?.count || 0,
			projectCount: projectCount?.count || 0,
			fileCount: fileCount?.count || 0,
			nodeTypeCount: nodeTypeStats.reduce(
				(acc, stat) => {
					acc[stat.node_type as NodeType] = stat.count;
					return acc;
				},
				{} as Record<NodeType, number>,
			),
			namespaceCount: namespaceStats.reduce(
				(acc, stat) => {
					acc[stat.namespace] = stat.count;
					return acc;
				},
				{} as Record<string, number>,
			),
			relationshipTypeCount: relationshipTypeStats.reduce(
				(acc, stat) => {
					acc[stat.relationship_type] = stat.count;
					return acc;
				},
				{} as Record<string, number>,
			),
			invalidAddresses: invalidAddresses?.count || 0,
		};
	}

	// ===== UTILITY METHODS =====

	/**
	 * RDF 주소 결과 매핑
	 */
	private mapRDFAddressResult(row: any): RDFAddressSearchResult {
		return {
			rdfAddress: row.rdf_address,
			projectName: row.project_name,
			filePath: row.file_path,
			nodeType: row.node_type,
			symbolName: row.symbol_name,
			namespace: row.namespace,
			localName: row.local_name,
			lineNumber: row.line_number,
			columnNumber: row.column_number,
			accessModifier: row.access_modifier,
			isStatic: Boolean(row.is_static),
			isAsync: Boolean(row.is_async),
			isAbstract: Boolean(row.is_abstract),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	/**
	 * RDF 관계 결과 매핑
	 */
	private mapRDFRelationshipResult(row: any): RDFRelationshipSearchResult {
		return {
			id: row.id,
			sourceRdfAddress: row.source_rdf_address,
			targetRdfAddress: row.target_rdf_address,
			relationshipType: row.relationship_type,
			metadata: JSON.parse(row.metadata || "{}"),
			createdAt: row.created_at,
		};
	}

	/**
	 * RDF 주소 삭제
	 */
	async deleteRDFAddress(rdfAddress: string): Promise<void> {
		// 관련 관계도 삭제
		await new Promise<void>((resolve, reject) => {
			(this as any).db.run(
				"DELETE FROM rdf_relationships WHERE source_rdf_address = ? OR target_rdf_address = ?",
				[rdfAddress, rdfAddress],
				(err: any) => {
					if (err) reject(err);
					else resolve();
				},
			);
		});

		// RDF 주소 삭제
		await new Promise<void>((resolve, reject) => {
			(this as any).db.run(
				"DELETE FROM rdf_addresses WHERE rdf_address = ?",
				[rdfAddress],
				(err: any) => {
					if (err) reject(err);
					else resolve();
				},
			);
		});
	}

	/**
	 * RDF 주소 업데이트
	 */
	async updateRDFAddress(
		rdfAddress: string,
		updates: Partial<RDFAddressStoreOptions>,
	): Promise<void> {
		const setClause: string[] = [];
		const params: any[] = [];

		Object.entries(updates).forEach(([key, value]) => {
			if (value !== undefined) {
				const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
				setClause.push(`${dbKey} = ?`);
				params.push(value);
			}
		});

		if (setClause.length === 0) return;

		params.push(rdfAddress);
		const query = `UPDATE rdf_addresses SET ${setClause.join(", ")} WHERE rdf_address = ?`;

		await new Promise<void>((resolve, reject) => {
			(this as any).db.run(query, params, (err: any) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
