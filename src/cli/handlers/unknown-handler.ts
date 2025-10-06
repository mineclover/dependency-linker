import {
	UnknownSymbolManager,
	UnknownSymbol,
	EquivalenceRelation,
} from "../../database/services/UnknownSymbolManager";
import { EquivalenceInferenceEngine } from "../../database/inference/EquivalenceInferenceEngine";

export class UnknownSymbolHandler {
	private unknownSymbolManager: UnknownSymbolManager;
	private inferenceEngine: EquivalenceInferenceEngine;

	constructor() {
		this.unknownSymbolManager = new UnknownSymbolManager();
		this.inferenceEngine = new EquivalenceInferenceEngine(
			this.unknownSymbolManager,
		);
	}

	/**
	 * Unknown Symbol 등록
	 */
	async registerUnknownSymbol(options: {
		file: string;
		symbol: string;
		type?: string;
		isImported?: boolean;
		isAlias?: boolean;
		originalName?: string;
		importedFrom?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			const unknownSymbol: Omit<UnknownSymbol, "id"> = {
				name: options.symbol,
				type: options.type || "Unknown",
				sourceFile: options.file,
				rdfAddress: `${options.file}#Unknown:${options.symbol}`,
				isImported: options.isImported || false,
				isAlias: options.isAlias || false,
				originalName: options.originalName,
				importedFrom: options.importedFrom,
				metadata: {
					lineNumber: 0,
					columnNumber: 0,
					confidence: 0.5,
				},
			};

			const registered =
				await this.unknownSymbolManager.registerUnknownSymbol(unknownSymbol);

			console.log(`✅ Unknown Symbol 등록 완료:`);
			console.log(`  - ID: ${registered.id}`);
			console.log(`  - 이름: ${registered.name}`);
			console.log(`  - 타입: ${registered.type}`);
			console.log(`  - 파일: ${registered.sourceFile}`);
			console.log(`  - RDF 주소: ${registered.rdfAddress}`);
		} catch (error) {
			console.error(`❌ Unknown Symbol 등록 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * Unknown Symbol 검색
	 */
	async searchUnknownSymbols(options: {
		query: string;
		type?: string;
		file?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			const symbols = await this.unknownSymbolManager.searchUnknownSymbols(
				options.query,
			);

			if (symbols.length === 0) {
				console.log(`🔍 검색 결과가 없습니다: "${options.query}"`);
				return;
			}

			console.log(`🔍 Unknown Symbol 검색 결과 (${symbols.length}개):`);
			symbols.forEach((symbol, index) => {
				console.log(`  ${index + 1}. ${symbol.name} (${symbol.type})`);
				console.log(`     - 파일: ${symbol.sourceFile}`);
				console.log(`     - RDF: ${symbol.rdfAddress}`);
				console.log(`     - Imported: ${symbol.isImported ? "Yes" : "No"}`);
				console.log(`     - Alias: ${symbol.isAlias ? "Yes" : "No"}`);
				if (symbol.originalName) {
					console.log(`     - Original: ${symbol.originalName}`);
				}
				console.log("");
			});
		} catch (error) {
			console.error(`❌ Unknown Symbol 검색 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 동등성 후보 검색
	 */
	async searchEquivalenceCandidates(options: {
		symbol: string;
		type?: string;
		file?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			// Unknown Symbol 검색
			const unknownSymbols =
				await this.unknownSymbolManager.searchUnknownSymbols(options.symbol);

			if (unknownSymbols.length === 0) {
				console.log(
					`❌ Unknown Symbol을 찾을 수 없습니다: "${options.symbol}"`,
				);
				return;
			}

			console.log(`🔍 동등성 후보 검색: ${options.symbol}`);

			for (const unknownSymbol of unknownSymbols) {
				console.log(`\n📋 Unknown Symbol: ${unknownSymbol.name}`);
				console.log(`   - 파일: ${unknownSymbol.sourceFile}`);
				console.log(`   - 타입: ${unknownSymbol.type}`);

				// 동등성 후보 검색
				const candidates =
					await this.unknownSymbolManager.findEquivalenceCandidates(
						unknownSymbol,
					);

				if (candidates.length === 0) {
					console.log(`   ❌ 동등성 후보가 없습니다.`);
					continue;
				}

				console.log(`   ✅ 동등성 후보 (${candidates.length}개):`);
				candidates.forEach((candidate, index) => {
					console.log(
						`     ${index + 1}. ${candidate.knownSymbol.name} (${candidate.knownSymbol.type})`,
					);
					console.log(`        - 파일: ${candidate.knownSymbol.sourceFile}`);
					console.log(
						`        - 신뢰도: ${Math.round(candidate.confidence * 100)}%`,
					);
					console.log(`        - 매칭 타입: ${candidate.matchType}`);
				});
			}
		} catch (error) {
			console.error(`❌ 동등성 후보 검색 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 동등성 관계 생성
	 */
	async createEquivalenceRelation(options: {
		unknownId: string;
		knownId: string;
		confidence?: number;
		matchType?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			// Unknown Symbol 조회
			const unknownSymbols =
				await this.unknownSymbolManager.searchUnknownSymbols("");
			const unknownSymbol = unknownSymbols.find(
				(s) => s.id === options.unknownId,
			);
			const knownSymbol = unknownSymbols.find((s) => s.id === options.knownId);

			if (!unknownSymbol || !knownSymbol) {
				console.log(`❌ Unknown Symbol을 찾을 수 없습니다.`);
				return;
			}

			const relation =
				await this.unknownSymbolManager.createEquivalenceRelation(
					unknownSymbol,
					knownSymbol,
					options.confidence || 0.8,
					options.matchType || "manual",
				);

			console.log(`✅ 동등성 관계 생성 완료:`);
			console.log(`  - 관계 ID: ${relation.id}`);
			console.log(`  - Unknown: ${unknownSymbol.name} (${unknownSymbol.id})`);
			console.log(`  - Known: ${knownSymbol.name} (${knownSymbol.id})`);
			console.log(`  - 신뢰도: ${Math.round(relation.confidence * 100)}%`);
			console.log(`  - 매칭 타입: ${relation.matchType}`);
		} catch (error) {
			console.error(`❌ 동등성 관계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 추론 규칙 적용
	 */
	async applyInferenceRules(options: {
		symbol: string;
		type?: string;
		file?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			// Unknown Symbol 검색
			const unknownSymbols =
				await this.unknownSymbolManager.searchUnknownSymbols(options.symbol);

			if (unknownSymbols.length === 0) {
				console.log(
					`❌ Unknown Symbol을 찾을 수 없습니다: "${options.symbol}"`,
				);
				return;
			}

			console.log(`🔍 추론 규칙 적용: ${options.symbol}`);

			for (const unknownSymbol of unknownSymbols) {
				console.log(`\n📋 Unknown Symbol: ${unknownSymbol.name}`);
				console.log(`   - 파일: ${unknownSymbol.sourceFile}`);
				console.log(`   - 타입: ${unknownSymbol.type}`);

				// 동등성 후보 검색
				const candidates =
					await this.unknownSymbolManager.findEquivalenceCandidates(
						unknownSymbol,
					);

				if (candidates.length === 0) {
					console.log(`   ❌ 동등성 후보가 없습니다.`);
					continue;
				}

				console.log(`   🔍 추론 규칙 적용 중...`);

				for (const candidate of candidates) {
					const result = await this.inferenceEngine.inferEquivalence(
						unknownSymbol,
						candidate.knownSymbol,
					);

					if (result) {
						console.log(`   ✅ 추론 성공: ${result.rule}`);
						console.log(`      - Known Symbol: ${result.knownSymbol.name}`);
						console.log(
							`      - 신뢰도: ${Math.round(result.confidence * 100)}%`,
						);
						console.log(`      - 근거: ${result.reasoning}`);

						// 추론 결과 검증
						const isValid =
							await this.inferenceEngine.validateInferenceResult(result);
						console.log(`      - 검증: ${isValid ? "✅ 유효" : "❌ 무효"}`);
					} else {
						console.log(`   ❌ 추론 실패: ${candidate.knownSymbol.name}`);
					}
				}
			}
		} catch (error) {
			console.error(`❌ 추론 규칙 적용 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 동등성 관계 조회
	 */
	async listEquivalenceRelations(options: {
		symbol?: string;
		type?: string;
		file?: string;
	}): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			const symbols = await this.unknownSymbolManager.searchUnknownSymbols(
				options.symbol || "",
			);

			if (symbols.length === 0) {
				console.log(`🔍 Unknown Symbol이 없습니다.`);
				return;
			}

			console.log(`📋 동등성 관계 조회 (${symbols.length}개 Symbol):`);

			for (const symbol of symbols) {
				const relations =
					await this.unknownSymbolManager.getEquivalenceRelations(symbol.id);

				console.log(`\n📌 ${symbol.name} (${symbol.type}):`);
				console.log(`   - 파일: ${symbol.sourceFile}`);
				console.log(`   - RDF: ${symbol.rdfAddress}`);

				if (relations.length === 0) {
					console.log(`   ❌ 동등성 관계가 없습니다.`);
					continue;
				}

				console.log(`   ✅ 동등성 관계 (${relations.length}개):`);
				relations.forEach((relation, index) => {
					console.log(`     ${index + 1}. 관계 ID: ${relation.id}`);
					console.log(`        - Known ID: ${relation.knownId}`);
					console.log(
						`        - 신뢰도: ${Math.round(relation.confidence * 100)}%`,
					);
					console.log(`        - 매칭 타입: ${relation.matchType}`);
					console.log(`        - 생성일: ${relation.createdAt.toISOString()}`);
				});
			}
		} catch (error) {
			console.error(`❌ 동등성 관계 조회 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 통계 생성
	 */
	async generateStatistics(): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();

			const symbols = await this.unknownSymbolManager.searchUnknownSymbols("");

			console.log(`📊 Unknown Symbol 통계:`);
			console.log(`  - 총 Unknown Symbol: ${symbols.length}개`);

			// 타입별 통계
			const typeStats = new Map<string, number>();
			symbols.forEach((symbol) => {
				typeStats.set(symbol.type, (typeStats.get(symbol.type) || 0) + 1);
			});

			console.log(`  - 타입별 분포:`);
			Array.from(typeStats.entries())
				.sort((a, b) => b[1] - a[1])
				.forEach(([type, count]) => {
					console.log(`    ${type}: ${count}개`);
				});

			// Imported/Alias 통계
			const importedCount = symbols.filter((s) => s.isImported).length;
			const aliasCount = symbols.filter((s) => s.isAlias).length;

			console.log(`  - Imported: ${importedCount}개`);
			console.log(`  - Alias: ${aliasCount}개`);

			// 동등성 관계 통계
			let totalRelations = 0;
			for (const symbol of symbols) {
				const relations =
					await this.unknownSymbolManager.getEquivalenceRelations(symbol.id);
				totalRelations += relations.length;
			}

			console.log(`  - 총 동등성 관계: ${totalRelations}개`);
			console.log(
				`  - 평균 관계 수: ${symbols.length > 0 ? Math.round((totalRelations / symbols.length) * 100) / 100 : 0}개`,
			);
		} catch (error) {
			console.error(`❌ 통계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 데이터베이스 초기화
	 */
	async initialize(): Promise<void> {
		try {
			await this.unknownSymbolManager.initialize();
			console.log("✅ Unknown Symbol Handler 초기화 완료");
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
			await this.unknownSymbolManager.close();
			console.log("✅ Unknown Symbol Handler 종료 완료");
		} catch (error) {
			console.error(`❌ 종료 실패: ${(error as Error).message}`);
			throw error;
		}
	}
}
