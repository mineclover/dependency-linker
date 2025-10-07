import { RDFDatabaseAPI } from "../../api/rdf-database-integration";
import { parseRDFAddress } from "../../core/RDFAddress";
import { GraphDatabase } from "../GraphDatabase";

export interface UnknownSymbol {
	id: string;
	name: string;
	type: string;
	sourceFile: string;
	rdfAddress: string;
	isImported: boolean;
	isAlias: boolean;
	originalName?: string;
	importedFrom?: string;
	metadata: {
		lineNumber: number;
		columnNumber: number;
		confidence: number;
	};
}

export interface EquivalenceCandidate {
	unknownSymbol: UnknownSymbol;
	knownSymbol: UnknownSymbol;
	confidence: number;
	matchType: "name" | "type" | "context" | "semantic";
}

export interface EquivalenceRelation {
	id: string;
	unknownId: string;
	knownId: string;
	confidence: number;
	matchType: string;
	createdAt: Date;
}

export class UnknownSymbolManager {
	private database: GraphDatabase;
	private rdfAPI: RDFDatabaseAPI;

	constructor() {
		this.database = new GraphDatabase("dependency-linker.db");
		this.rdfAPI = new RDFDatabaseAPI();
	}

	/**
	 * Unknown Symbol 등록
	 */
	async registerUnknownSymbol(
		symbol: Omit<UnknownSymbol, "id">,
	): Promise<UnknownSymbol> {
		try {
			// 1. Unknown Symbol 생성
			const unknownSymbol: UnknownSymbol = {
				...symbol,
				id: `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			};

			// 2. 데이터베이스에 저장
			await this.database.upsertNode({
				identifier: unknownSymbol.rdfAddress,
				type: "unknown",
				name: unknownSymbol.name,
				sourceFile: unknownSymbol.sourceFile,
				language: "typescript" as any,
				metadata: {
					isImported: unknownSymbol.isImported,
					isAlias: unknownSymbol.isAlias,
					originalName: unknownSymbol.originalName,
					importedFrom: unknownSymbol.importedFrom,
					confidence: unknownSymbol.metadata.confidence,
				},
			});

			// 3. 동등성 후보 검색
			const candidates = await this.findEquivalenceCandidates(unknownSymbol);

			// 4. 관계 정의
			for (const candidate of candidates) {
				await this.createEquivalenceRelation(
					unknownSymbol,
					candidate.knownSymbol,
					candidate.confidence,
					candidate.matchType,
				);
			}

			console.log(`✅ Unknown Symbol 등록 완료: ${unknownSymbol.name}`);
			return unknownSymbol;
		} catch (error) {
			console.error(`❌ Unknown Symbol 등록 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 동등성 후보 검색
	 */
	async findEquivalenceCandidates(
		unknownSymbol: UnknownSymbol,
	): Promise<EquivalenceCandidate[]> {
		try {
			const candidates: EquivalenceCandidate[] = [];

			// 1. 이름 기반 검색
			const nameCandidates = await this.searchByName(unknownSymbol.name);
			for (const candidate of nameCandidates) {
				candidates.push({
					unknownSymbol,
					knownSymbol: candidate,
					confidence: 0.8,
					matchType: "name",
				});
			}

			// 2. 타입 기반 검색
			const typeCandidates = await this.searchByType(unknownSymbol.type);
			for (const candidate of typeCandidates) {
				if (candidate.name === unknownSymbol.name) {
					candidates.push({
						unknownSymbol,
						knownSymbol: candidate,
						confidence: 0.9,
						matchType: "type",
					});
				}
			}

			// 3. 컨텍스트 기반 검색
			const contextCandidates = await this.searchByContext(
				unknownSymbol.sourceFile,
			);
			for (const candidate of contextCandidates) {
				if (this.analyzeContextSimilarity(unknownSymbol, candidate) > 0.7) {
					candidates.push({
						unknownSymbol,
						knownSymbol: candidate,
						confidence: this.analyzeContextSimilarity(unknownSymbol, candidate),
						matchType: "context",
					});
				}
			}

			// 4. 신뢰도 순으로 정렬
			return candidates.sort((a, b) => b.confidence - a.confidence);
		} catch (error) {
			console.error(`❌ 동등성 후보 검색 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 동등성 관계 생성
	 */
	async createEquivalenceRelation(
		unknownSymbol: UnknownSymbol,
		knownSymbol: UnknownSymbol,
		confidence: number,
		matchType: string,
	): Promise<EquivalenceRelation> {
		try {
			const relation: EquivalenceRelation = {
				id: `equiv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				unknownId: unknownSymbol.id,
				knownId: knownSymbol.id,
				confidence,
				matchType,
				createdAt: new Date(),
			};

			// 데이터베이스에 관계 저장
			await this.database.upsertRelationship({
				fromNodeId: parseInt(unknownSymbol.id.replace(/\D/g, ""), 10) || 0,
				toNodeId: parseInt(knownSymbol.id.replace(/\D/g, ""), 10) || 0,
				type: "equivalence",
				label: `${unknownSymbol.name} is equivalent to ${knownSymbol.name}`,
				metadata: {
					confidence,
					matchType,
					createdAt: relation.createdAt,
				},
			});

			console.log(
				`✅ 동등성 관계 생성: ${unknownSymbol.name} ↔ ${knownSymbol.name} (${confidence})`,
			);
			return relation;
		} catch (error) {
			console.error(`❌ 동등성 관계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 이름 기반 검색
	 */
	private async searchByName(name: string): Promise<UnknownSymbol[]> {
		try {
			const results = await this.rdfAPI.searchRDFAddresses(name);
			return results.map((result) => this.convertToUnknownSymbol(result));
		} catch (error) {
			console.error(`❌ 이름 기반 검색 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 타입 기반 검색
	 */
	private async searchByType(type: string): Promise<UnknownSymbol[]> {
		try {
			const results = await this.rdfAPI.searchRDFAddresses(type);
			return results.map((result) => this.convertToUnknownSymbol(result));
		} catch (error) {
			console.error(`❌ 타입 기반 검색 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 컨텍스트 기반 검색
	 */
	private async searchByContext(sourceFile: string): Promise<UnknownSymbol[]> {
		try {
			const results = await this.rdfAPI.searchRDFAddresses(sourceFile);
			return results.map((result) => this.convertToUnknownSymbol(result));
		} catch (error) {
			console.error(`❌ 컨텍스트 기반 검색 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 컨텍스트 유사성 분석
	 */
	private analyzeContextSimilarity(
		unknown: UnknownSymbol,
		known: UnknownSymbol,
	): number {
		let similarity = 0;

		// 파일 경로 유사성
		if (unknown.sourceFile === known.sourceFile) {
			similarity += 0.4;
		} else if (
			unknown.sourceFile.includes(known.sourceFile) ||
			known.sourceFile.includes(unknown.sourceFile)
		) {
			similarity += 0.2;
		}

		// 이름 유사성
		if (unknown.name === known.name) {
			similarity += 0.3;
		} else if (
			unknown.name.toLowerCase().includes(known.name.toLowerCase()) ||
			known.name.toLowerCase().includes(unknown.name.toLowerCase())
		) {
			similarity += 0.2;
		}

		// 타입 유사성
		if (unknown.type === known.type) {
			similarity += 0.3;
		}

		return Math.min(similarity, 1.0);
	}

	/**
	 * RDF 결과를 Unknown Symbol로 변환
	 */
	private convertToUnknownSymbol(result: any): UnknownSymbol {
		const parsed = parseRDFAddress(result.rdfAddress);

		return {
			id: result.id || `unknown_${Date.now()}`,
			name: parsed?.symbolName || "Unknown",
			type: parsed?.nodeType || "Unknown",
			sourceFile: parsed?.filePath || "Unknown",
			rdfAddress: result.rdfAddress,
			isImported: result.metadata?.isImported || false,
			isAlias: result.metadata?.isAlias || false,
			originalName: result.metadata?.originalName,
			importedFrom: result.metadata?.importedFrom,
			metadata: {
				lineNumber: result.metadata?.lineNumber || 0,
				columnNumber: result.metadata?.columnNumber || 0,
				confidence: result.metadata?.confidence || 0.5,
			},
		};
	}

	/**
	 * Unknown Symbol 검색
	 */
	async searchUnknownSymbols(query: string): Promise<UnknownSymbol[]> {
		try {
			const results = await this.rdfAPI.searchRDFAddresses(query);
			return results.map((result) => this.convertToUnknownSymbol(result));
		} catch (error) {
			console.error(`❌ Unknown Symbol 검색 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 동등성 관계 조회
	 */
	async getEquivalenceRelations(
		_unknownId: string,
	): Promise<EquivalenceRelation[]> {
		try {
			// 간단한 구현 - 실제로는 데이터베이스 쿼리 필요
			const relations: EquivalenceRelation[] = [];

			return relations;
		} catch (error) {
			console.error(`❌ 동등성 관계 조회 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 데이터베이스 초기화
	 */
	async initialize(): Promise<void> {
		try {
			await this.database.initialize();
			await this.rdfAPI.initialize();
			console.log("✅ Unknown Symbol Manager 초기화 완료");
		} catch (error) {
			console.error(`❌ 초기화 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 데이터베이스 종료
	 */
	async close(): Promise<void> {
		try {
			await this.database.close();
			await this.rdfAPI.close();
			console.log("✅ Unknown Symbol Manager 종료 완료");
		} catch (error) {
			console.error(`❌ 종료 실패: ${(error as Error).message}`);
			throw error;
		}
	}
}
