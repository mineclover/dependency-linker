import {
	EquivalenceCandidate,
	EquivalenceRelation,
	type UnknownSymbol,
	type UnknownSymbolManager,
} from "../services/UnknownSymbolManager";

export interface EquivalenceRule {
	name: string;
	description: string;
	priority: number;
	matches(unknown: UnknownSymbol, known: UnknownSymbol): Promise<boolean>;
	calculateConfidence(
		unknown: UnknownSymbol,
		known: UnknownSymbol,
	): Promise<number>;
}

export interface EquivalenceInferenceResult {
	unknownSymbol: UnknownSymbol;
	knownSymbol: UnknownSymbol;
	confidence: number;
	rule: string;
	reasoning: string;
	createdAt: Date;
}

export class EquivalenceInferenceEngine {
	private unknownSymbolManager: UnknownSymbolManager;
	private rules: EquivalenceRule[];

	constructor(unknownSymbolManager: UnknownSymbolManager) {
		this.unknownSymbolManager = unknownSymbolManager;
		this.rules = this.initializeRules();
	}

	/**
	 * 동등성 추론 실행
	 */
	async inferEquivalence(
		unknownSymbol: UnknownSymbol,
		knownSymbol: UnknownSymbol,
	): Promise<EquivalenceInferenceResult | null> {
		try {
			console.log(
				`🔍 동등성 추론 시작: ${unknownSymbol.name} ↔ ${knownSymbol.name}`,
			);

			// 1. 규칙 적용
			for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
				if (await rule.matches(unknownSymbol, knownSymbol)) {
					const confidence = await rule.calculateConfidence(
						unknownSymbol,
						knownSymbol,
					);

					if (confidence > 0.5) {
						const result: EquivalenceInferenceResult = {
							unknownSymbol,
							knownSymbol,
							confidence,
							rule: rule.name,
							reasoning: this.generateReasoning(
								unknownSymbol,
								knownSymbol,
								rule,
								confidence,
							),
							createdAt: new Date(),
						};

						console.log(`✅ 동등성 추론 성공: ${rule.name} (${confidence})`);
						return result;
					}
				}
			}

			console.log(
				`❌ 동등성 추론 실패: ${unknownSymbol.name} ↔ ${knownSymbol.name}`,
			);
			return null;
		} catch (error) {
			console.error(`❌ 동등성 추론 실패: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 배치 동등성 추론
	 */
	async batchInferEquivalence(
		unknownSymbols: UnknownSymbol[],
		knownSymbols: UnknownSymbol[],
	): Promise<EquivalenceInferenceResult[]> {
		try {
			const results: EquivalenceInferenceResult[] = [];

			console.log(
				`🔍 배치 동등성 추론 시작: ${unknownSymbols.length}개 Unknown, ${knownSymbols.length}개 Known`,
			);

			for (const unknown of unknownSymbols) {
				for (const known of knownSymbols) {
					const result = await this.inferEquivalence(unknown, known);
					if (result) {
						results.push(result);
					}
				}
			}

			console.log(`✅ 배치 동등성 추론 완료: ${results.length}개 결과`);
			return results;
		} catch (error) {
			console.error(`❌ 배치 동등성 추론 실패: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * 추론 규칙 초기화
	 */
	private initializeRules(): EquivalenceRule[] {
		return [
			// 1. 정확한 이름 매칭 규칙
			{
				name: "exact_name_match",
				description: "정확한 이름 매칭",
				priority: 10,
				matches: async (unknown, known) => {
					return unknown.name === known.name;
				},
				calculateConfidence: async (unknown, known) => {
					return 0.95;
				},
			},

			// 2. 타입 기반 매칭 규칙
			{
				name: "type_based_match",
				description: "타입 기반 매칭",
				priority: 8,
				matches: async (unknown, known) => {
					return (
						unknown.type === known.type &&
						unknown.name.toLowerCase() === known.name.toLowerCase()
					);
				},
				calculateConfidence: async (unknown, known) => {
					return 0.85;
				},
			},

			// 3. 컨텍스트 기반 매칭 규칙
			{
				name: "context_based_match",
				description: "컨텍스트 기반 매칭",
				priority: 6,
				matches: async (unknown, known) => {
					return this.analyzeContextSimilarity(unknown, known) > 0.7;
				},
				calculateConfidence: async (unknown, known) => {
					return this.analyzeContextSimilarity(unknown, known);
				},
			},

			// 4. 시맨틱 매칭 규칙
			{
				name: "semantic_match",
				description: "시맨틱 매칭",
				priority: 4,
				matches: async (unknown, known) => {
					return this.analyzeSemanticSimilarity(unknown, known) > 0.6;
				},
				calculateConfidence: async (unknown, known) => {
					return this.analyzeSemanticSimilarity(unknown, known);
				},
			},

			// 5. 부분 매칭 규칙
			{
				name: "partial_match",
				description: "부분 매칭",
				priority: 2,
				matches: async (unknown, known) => {
					return this.analyzePartialSimilarity(unknown, known) > 0.5;
				},
				calculateConfidence: async (unknown, known) => {
					return this.analyzePartialSimilarity(unknown, known);
				},
			},
		];
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
			this.calculatePathSimilarity(unknown.sourceFile, known.sourceFile) > 0.5
		) {
			similarity += 0.2;
		}

		// 이름 유사성
		if (unknown.name === known.name) {
			similarity += 0.3;
		} else if (this.calculateNameSimilarity(unknown.name, known.name) > 0.7) {
			similarity += 0.2;
		}

		// 타입 유사성
		if (unknown.type === known.type) {
			similarity += 0.3;
		}

		return Math.min(similarity, 1.0);
	}

	/**
	 * 시맨틱 유사성 분석
	 */
	private analyzeSemanticSimilarity(
		unknown: UnknownSymbol,
		known: UnknownSymbol,
	): number {
		let similarity = 0;

		// 이름 시맨틱 유사성
		const nameSimilarity = this.calculateSemanticSimilarity(
			unknown.name,
			known.name,
		);
		similarity += nameSimilarity * 0.6;

		// 타입 시맨틱 유사성
		const typeSimilarity = this.calculateSemanticSimilarity(
			unknown.type,
			known.type,
		);
		similarity += typeSimilarity * 0.4;

		return Math.min(similarity, 1.0);
	}

	/**
	 * 부분 유사성 분석
	 */
	private analyzePartialSimilarity(
		unknown: UnknownSymbol,
		known: UnknownSymbol,
	): number {
		let similarity = 0;

		// 이름 부분 매칭
		if (
			unknown.name.includes(known.name) ||
			known.name.includes(unknown.name)
		) {
			similarity += 0.4;
		}

		// 타입 부분 매칭
		if (
			unknown.type.includes(known.type) ||
			known.type.includes(unknown.type)
		) {
			similarity += 0.3;
		}

		// 파일 경로 부분 매칭
		if (
			unknown.sourceFile.includes(known.sourceFile) ||
			known.sourceFile.includes(unknown.sourceFile)
		) {
			similarity += 0.3;
		}

		return Math.min(similarity, 1.0);
	}

	/**
	 * 경로 유사성 계산
	 */
	private calculatePathSimilarity(path1: string, path2: string): number {
		const parts1 = path1.split("/");
		const parts2 = path2.split("/");

		let commonParts = 0;
		const minLength = Math.min(parts1.length, parts2.length);

		for (let i = 0; i < minLength; i++) {
			if (parts1[i] === parts2[i]) {
				commonParts++;
			} else {
				break;
			}
		}

		return commonParts / Math.max(parts1.length, parts2.length);
	}

	/**
	 * 이름 유사성 계산
	 */
	private calculateNameSimilarity(name1: string, name2: string): number {
		const lower1 = name1.toLowerCase();
		const lower2 = name2.toLowerCase();

		if (lower1 === lower2) return 1.0;
		if (lower1.includes(lower2) || lower2.includes(lower1)) return 0.8;

		// Levenshtein 거리 기반 유사성
		const distance = this.levenshteinDistance(lower1, lower2);
		const maxLength = Math.max(lower1.length, lower2.length);

		return 1 - distance / maxLength;
	}

	/**
	 * 시맨틱 유사성 계산
	 */
	private calculateSemanticSimilarity(text1: string, text2: string): number {
		// 간단한 시맨틱 유사성 계산 (실제로는 더 정교한 NLP 기법 사용)
		const words1 = text1.toLowerCase().split(/\W+/);
		const words2 = text2.toLowerCase().split(/\W+/);

		const commonWords = words1.filter((word) => words2.includes(word));
		const totalWords = new Set([...words1, ...words2]).size;

		return commonWords.length / totalWords;
	}

	/**
	 * Levenshtein 거리 계산
	 */
	private levenshteinDistance(str1: string, str2: string): number {
		const matrix = Array(str2.length + 1)
			.fill(null)
			.map(() => Array(str1.length + 1).fill(null));

		for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

		for (let j = 1; j <= str2.length; j++) {
			for (let i = 1; i <= str1.length; i++) {
				const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(
					matrix[j][i - 1] + 1,
					matrix[j - 1][i] + 1,
					matrix[j - 1][i - 1] + cost,
				);
			}
		}

		return matrix[str2.length][str1.length];
	}

	/**
	 * 추론 근거 생성
	 */
	private generateReasoning(
		unknown: UnknownSymbol,
		known: UnknownSymbol,
		rule: EquivalenceRule,
		confidence: number,
	): string {
		const reasons = [];

		if (unknown.name === known.name) {
			reasons.push(`이름이 정확히 일치합니다: "${unknown.name}"`);
		}

		if (unknown.type === known.type) {
			reasons.push(`타입이 일치합니다: "${unknown.type}"`);
		}

		if (unknown.sourceFile === known.sourceFile) {
			reasons.push(`같은 파일에 정의되어 있습니다: "${unknown.sourceFile}"`);
		}

		const contextSimilarity = this.analyzeContextSimilarity(unknown, known);
		if (contextSimilarity > 0.7) {
			reasons.push(
				`컨텍스트가 유사합니다 (${Math.round(contextSimilarity * 100)}%)`,
			);
		}

		return (
			reasons.join(", ") ||
			`규칙 "${rule.name}"에 의해 추론됨 (${Math.round(confidence * 100)}%)`
		);
	}

	/**
	 * 추론 결과 검증
	 */
	async validateInferenceResult(
		result: EquivalenceInferenceResult,
	): Promise<boolean> {
		try {
			// 1. 기본 검증
			if (!result.unknownSymbol || !result.knownSymbol) {
				return false;
			}

			// 2. 신뢰도 검증
			if (result.confidence < 0.5) {
				return false;
			}

			// 3. 규칙 재검증
			const rule = this.rules.find((r) => r.name === result.rule);
			if (!rule) {
				return false;
			}

			const stillMatches = await rule.matches(
				result.unknownSymbol,
				result.knownSymbol,
			);
			if (!stillMatches) {
				return false;
			}

			return true;
		} catch (error) {
			console.error(`❌ 추론 결과 검증 실패: ${(error as Error).message}`);
			return false;
		}
	}
}
