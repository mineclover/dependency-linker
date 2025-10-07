import { createRDFAddress } from "../../core/RDFAddress.js";
import { GraphDatabase } from "../../database/GraphDatabase.js";

export interface SymbolMetadata {
	type: string;
	file: string;
	line: number;
	column: number;
	scope: string;
	description: string;
	tags: string[];
	complexity: string;
	lastModified: string;
	author: string;
	version: string;
}

export interface NearestNode {
	id: string;
	type: string;
	name: string;
	file: string;
	relationship: string;
	distance: number;
	metadata: {
		line: number;
		description: string;
		tags: string[];
	};
}

export interface GraphStats {
	totalNodes: number;
	directConnections: number;
	indirectConnections: number;
	avgDistance: number;
	complexityScore: number;
	centralityScore: number;
}

export interface SymbolAnalysisResult {
	targetSymbol: string;
	metadata: SymbolMetadata;
	nearestNodes: NearestNode[];
	graphStats: GraphStats;
}

export class DependencyAnalysisHandler {
	private database: GraphDatabase;

	constructor(databasePath?: string) {
		this.database = new GraphDatabase(databasePath || "dependency-linker.db");
	}

	async initialize(): Promise<void> {
		await this.database.initialize();
	}

	async close(): Promise<void> {
		await this.database.close();
	}

	/**
	 * 심볼 중심 의존성 분석
	 */
	async analyzeSymbolDependencies(
		symbolName: string,
		filePath?: string,
		depth: number = 2,
		includeExternal: boolean = true,
		includeInternal: boolean = true,
	): Promise<SymbolAnalysisResult> {
		try {
			// 1. 타겟 심볼 메타데이터 조회
			const symbolMetadata = await this.getSymbolMetadata(symbolName, filePath);

			// 2. RDF 주소 생성 (실제 DB 형식에 맞춤)
			const rdfAddress = createRDFAddress({
				projectName: "test-project", // 실제 DB의 프로젝트명 사용
				filePath: symbolMetadata.file,
				nodeType: symbolMetadata.type as any, // 타입 변환
				symbolName: symbolName,
			});

			// 3. 최근점 노드들 조회
			const nearestNodes = await this.getNearestNodes(
				rdfAddress,
				depth,
				includeExternal,
				includeInternal,
			);

			// 4. 그래프 통계 계산
			const graphStats = await this.calculateGraphStats(nearestNodes);

			return {
				targetSymbol: symbolName,
				metadata: symbolMetadata,
				nearestNodes,
				graphStats,
			};
		} catch (error) {
			console.error("Error analyzing symbol dependencies:", error);
			throw error;
		}
	}

	/**
	 * 심볼 메타데이터 조회
	 */
	private async getSymbolMetadata(
		symbolName: string,
		filePath?: string,
	): Promise<SymbolMetadata> {
		// Graph DB에서 심볼 정보 조회 (실제 스키마 사용)
		const symbolQuery = `
			SELECT * FROM rdf_addresses 
			WHERE symbol_name = ? AND node_type IN ('Class', 'Function', 'Interface', 'Variable', 'Method')
			${filePath ? "AND file_path = ?" : ""}
			ORDER BY created_at DESC
			LIMIT 1
		`;

		const params = filePath ? [symbolName, filePath] : [symbolName];
		const result = await this.database.runQuery(symbolQuery, params);

		if (result.length === 0) {
			// 기본 메타데이터 반환 (실제로는 에러 처리)
			return {
				type: "unknown",
				file: filePath || "unknown",
				line: 0,
				column: 0,
				scope: "unknown",
				description: `Symbol '${symbolName}' not found in database`,
				tags: ["unknown"],
				complexity: "unknown",
				lastModified: new Date().toISOString(),
				author: "unknown",
				version: "unknown",
			};
		}

		const symbol = result[0];
		return {
			type: symbol.node_type || "unknown",
			file: symbol.file_path || filePath || "unknown",
			line: symbol.line_number || 0,
			column: symbol.column_number || 0,
			scope: symbol.access_modifier || "unknown",
			description: `Symbol '${symbolName}' (${symbol.node_type})`,
			tags: [symbol.node_type, symbol.namespace].filter(Boolean),
			complexity: symbol.is_abstract ? "high" : "medium",
			lastModified:
				symbol.updated_at || symbol.created_at || new Date().toISOString(),
			author: "system",
			version: "1.0.0",
		};
	}

	/**
	 * 최근점 노드들 조회
	 */
	private async getNearestNodes(
		rdfAddress: string,
		depth: number,
		includeExternal: boolean,
		includeInternal: boolean,
	): Promise<NearestNode[]> {
		// Graph DB에서 관계 조회 (실제 스키마 사용)
		const relationshipQuery = `
			WITH RECURSIVE node_relationships AS (
				-- 직접 연결된 노드들
				SELECT 
					r.target_rdf_address,
					ra2.symbol_name as target_name,
					ra2.node_type as target_type,
					ra2.file_path as target_file,
					r.relationship_type,
					1 as distance
				FROM rdf_relationships r
				JOIN rdf_addresses ra1 ON r.source_rdf_address = ra1.rdf_address
				JOIN rdf_addresses ra2 ON r.target_rdf_address = ra2.rdf_address
				WHERE ra1.rdf_address = ?
				
				UNION ALL
				
				-- 간접 연결된 노드들 (depth > 1인 경우)
				SELECT 
					r.target_rdf_address,
					ra2.symbol_name as target_name,
					ra2.node_type as target_type,
					ra2.file_path as target_file,
					r.relationship_type,
					nr.distance + 1
				FROM rdf_relationships r
				JOIN rdf_addresses ra2 ON r.target_rdf_address = ra2.rdf_address
				JOIN node_relationships nr ON r.source_rdf_address = nr.target_rdf_address
				WHERE nr.distance < ?
			)
			SELECT DISTINCT
				target_rdf_address as id,
				target_name as name,
				target_type as type,
				target_file as file,
				relationship_type as relationship,
				MIN(distance) as distance
			FROM node_relationships
			GROUP BY target_rdf_address, target_name, target_type, target_file, relationship_type
			ORDER BY distance, target_name
			LIMIT 20
		`;

		const result = await this.database.runQuery(relationshipQuery, [
			rdfAddress,
			depth,
		]);

		// 결과를 NearestNode 형태로 변환
		const nearestNodes: NearestNode[] = [];

		for (const row of result) {
			// 외부/내부 필터링
			const isExternal =
				row.file.includes("node_modules") || row.file.includes("@types");
			if (!includeExternal && isExternal) continue;
			if (!includeInternal && !isExternal) continue;

			// 노드 메타데이터 조회
			const nodeMetadata = await this.getNodeMetadata(row.id);

			nearestNodes.push({
				id: row.id,
				type: row.type,
				name: row.name,
				file: row.file,
				relationship: row.relationship,
				distance: row.distance,
				metadata: nodeMetadata,
			});
		}

		return nearestNodes;
	}

	/**
	 * 노드 메타데이터 조회
	 */
	private async getNodeMetadata(nodeId: string): Promise<{
		line: number;
		description: string;
		tags: string[];
	}> {
		const metadataQuery = `
			SELECT line_number, node_type, namespace 
			FROM rdf_addresses 
			WHERE rdf_address = ?
		`;

		const result = await this.database.runQuery(metadataQuery, [nodeId]);

		if (result.length === 0) {
			return {
				line: 0,
				description: "No description available",
				tags: [],
			};
		}

		const node = result[0];
		return {
			line: node.line_number || 0,
			description: `${node.node_type} ${node.namespace ? `(${node.namespace})` : ""}`,
			tags: [node.node_type, node.namespace].filter(Boolean),
		};
	}

	/**
	 * 그래프 통계 계산
	 */
	private async calculateGraphStats(
		nearestNodes: NearestNode[],
	): Promise<GraphStats> {
		const directConnections = nearestNodes.filter(
			(node) => node.distance === 1,
		).length;
		const indirectConnections = nearestNodes.filter(
			(node) => node.distance > 1,
		).length;
		const totalNodes = nearestNodes.length;

		const avgDistance =
			nearestNodes.length > 0
				? nearestNodes.reduce((sum, node) => sum + node.distance, 0) /
					nearestNodes.length
				: 0;

		// 복잡도 점수 계산 (연결 수와 거리 기반)
		const complexityScore = Math.min(10, totalNodes * 0.5 + avgDistance * 2);

		// 중심성 점수 계산 (직접 연결 비율)
		const centralityScore = totalNodes > 0 ? directConnections / totalNodes : 0;

		return {
			totalNodes,
			directConnections,
			indirectConnections,
			avgDistance: Math.round(avgDistance * 100) / 100,
			complexityScore: Math.round(complexityScore * 10) / 10,
			centralityScore: Math.round(centralityScore * 100) / 100,
		};
	}

	/**
	 * 파일 내 심볼 리스트만 조회
	 */
	async getFileSymbols(filePath: string): Promise<{
		filePath: string;
		symbols: Array<{
			name: string;
			type: string;
			line: number;
			column: number;
			description: string;
		}>;
		totalCount: number;
	}> {
		try {
			// 파일에서 심볼들만 추출 (분석 없이)
			const symbolsQuery = `
				SELECT DISTINCT 
					symbol_name, 
					node_type, 
					line_number, 
					column_number,
					file_path
				FROM rdf_addresses 
				WHERE (file_path = ? OR file_path LIKE ? OR file_path LIKE ?)
				AND node_type IN ('Class', 'Function', 'Interface', 'Variable', 'Method')
				ORDER BY line_number
			`;

			const symbols = await this.database.runQuery(symbolsQuery, [
				filePath,
				`%/${filePath}`,
				`%${filePath}%`,
			]);

			const symbolList = symbols.map((symbol) => ({
				name: symbol.symbol_name,
				type: symbol.node_type,
				line: symbol.line_number || 0,
				column: symbol.column_number || 0,
				description: `${symbol.node_type} ${symbol.symbol_name}`,
			}));

			return {
				filePath: filePath,
				symbols: symbolList,
				totalCount: symbolList.length,
			};
		} catch (error) {
			console.error("Error getting file symbols:", error);
			throw error;
		}
	}

	/**
	 * 파일에서 심볼 추출 및 분석
	 */
	async analyzeFileSymbols(filePath: string): Promise<SymbolAnalysisResult[]> {
		try {
			// 실제 파일 분석 수행
			const fs = await import("node:fs");
			if (!fs.existsSync(filePath)) {
				console.log(`❌ File not found: ${filePath}`);
				return [];
			}

			const sourceCode = fs.readFileSync(filePath, "utf-8");
			console.log(`📝 Analyzing file: ${filePath}`);
			console.log(`📝 File size: ${sourceCode.length} characters`);

			// 파일에서 심볼들 추출 (실제 스키마 사용)
			// 파일 경로 매칭을 더 유연하게 처리
			const symbolsQuery = `
				SELECT DISTINCT symbol_name, node_type, line_number, column_number, file_path
				FROM rdf_addresses 
				WHERE (file_path = ? OR file_path LIKE ? OR file_path LIKE ?)
				AND node_type IN ('Class', 'Function', 'Interface', 'Variable', 'Method')
				ORDER BY line_number
			`;

			// 다양한 경로 패턴으로 검색
			const searchPatterns = [
				filePath, // 정확한 경로
				`%/${filePath}`, // 하위 경로
				`%${filePath}%`, // 부분 매칭
			];

			const symbols = await this.database.runQuery(
				symbolsQuery,
				searchPatterns,
			);
			const results: SymbolAnalysisResult[] = [];

			// 각 심볼에 대해 의존성 분석
			for (const symbol of symbols) {
				const analysis = await this.analyzeSymbolDependencies(
					symbol.symbol_name,
					filePath,
				);
				results.push(analysis);
			}

			return results;
		} catch (error) {
			console.error("Error analyzing file symbols:", error);
			throw error;
		}
	}
}
