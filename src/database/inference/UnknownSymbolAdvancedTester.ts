import { performance } from "node:perf_hooks";
import type { GraphDatabase } from "../GraphDatabase";

export interface AliasChainTestConfig {
	maxDepth?: number;
	enableCircularDetection?: boolean;
	enablePerformanceTracking?: boolean;
}

export interface CrossFileAliasTestConfig {
	enableUsageTracking?: boolean;
	enableConflictDetection?: boolean;
	enablePerformanceMetrics?: boolean;
}

export interface TestResult {
	success: boolean;
	executionTime: number;
	error?: string;
	metrics?: {
		nodesProcessed: number;
		relationshipsProcessed: number;
		queriesExecuted: number;
		memoryUsage: {
			rss: number;
			heapUsed: number;
			heapTotal: number;
		};
	};
}

export interface AliasChainResult {
	chain: string[];
	depth: number;
	isCircular: boolean;
	executionTime: number;
}

export interface CrossFileAliasResult {
	originalName: string;
	usageMap: Map<
		string,
		Array<{
			aliasName: string;
			originalName: string;
			sourceFile: string;
			confidence: number;
		}>
	>;
	conflicts: Array<{
		file1: string;
		file2: string;
		aliasName: string;
		originalName: string;
	}>;
	executionTime: number;
}

export class UnknownSymbolAdvancedTester {
	private database: GraphDatabase;
	private config: Required<AliasChainTestConfig> &
		Required<CrossFileAliasTestConfig>;
	// private performanceMetrics: Map<string, number> = new Map();

	constructor(
		database: GraphDatabase,
		config?: Partial<AliasChainTestConfig & CrossFileAliasTestConfig>,
	) {
		this.database = database;
		this.config = {
			// Alias chain config
			maxDepth: config?.maxDepth ?? 10,
			enableCircularDetection: config?.enableCircularDetection ?? true,
			enablePerformanceTracking: config?.enablePerformanceTracking ?? true,
			// Cross-file alias config
			enableUsageTracking: config?.enableUsageTracking ?? true,
			enableConflictDetection: config?.enableConflictDetection ?? true,
			enablePerformanceMetrics: config?.enablePerformanceMetrics ?? true,
		};
	}

	/**
	 * Alias Chain 테스트 - 단순 체인
	 */
	async testSimpleAliasChain(): Promise<TestResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		try {
			// 테스트 데이터 생성: A → B → C
			await this.createTestAliasChain(["A", "B", "C"]);

			// Alias chain 추적
			const chainResult = await this.findAliasChain("C", "test.ts");

			const expectedChain = ["C", "B", "A"];
			const success = this.compareChains(chainResult.chain, expectedChain);

			const endTime = performance.now();
			const endMemory = process.memoryUsage();

			return {
				success,
				executionTime: endTime - startTime,
				metrics: {
					nodesProcessed: 3,
					relationshipsProcessed: 2,
					queriesExecuted: 5,
					memoryUsage: {
						rss: endMemory.rss - startMemory.rss,
						heapUsed: endMemory.heapUsed - startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				executionTime: performance.now() - startTime,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Alias Chain 테스트 - 깊은 체인
	 */
	async testDeepAliasChain(): Promise<TestResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		try {
			// 깊은 체인 생성: A → B → C → D → E
			const deepChain = ["A", "B", "C", "D", "E"];
			await this.createTestAliasChain(deepChain);

			// Alias chain 추적
			const chainResult = await this.findAliasChain("E", "test.ts");

			const success =
				chainResult.chain.length === 5 &&
				chainResult.chain[chainResult.chain.length - 1] === "A" &&
				!chainResult.isCircular;

			const endTime = performance.now();
			const endMemory = process.memoryUsage();

			return {
				success,
				executionTime: endTime - startTime,
				metrics: {
					nodesProcessed: 5,
					relationshipsProcessed: 4,
					queriesExecuted: 8,
					memoryUsage: {
						rss: endMemory.rss - startMemory.rss,
						heapUsed: endMemory.heapUsed - startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				executionTime: performance.now() - startTime,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Alias Chain 테스트 - 순환 참조
	 */
	async testCircularAliasChain(): Promise<TestResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		try {
			// 순환 체인 생성: A → B → C → A
			await this.createCircularAliasChain(["A", "B", "C"]);

			// Alias chain 추적
			const chainResult = await this.findAliasChain("A", "test.ts");

			const success =
				chainResult.isCircular &&
				chainResult.chain.length <= this.config.maxDepth;

			const endTime = performance.now();
			const endMemory = process.memoryUsage();

			return {
				success,
				executionTime: endTime - startTime,
				metrics: {
					nodesProcessed: 3,
					relationshipsProcessed: 3,
					queriesExecuted: 6,
					memoryUsage: {
						rss: endMemory.rss - startMemory.rss,
						heapUsed: endMemory.heapUsed - startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				executionTime: performance.now() - startTime,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Cross-File Alias 테스트
	 */
	async testCrossFileAlias(): Promise<TestResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		try {
			// 여러 파일에서 같은 심볼 import 시뮬레이션
			await this.createCrossFileAliasScenario();

			// Cross-file alias 추적
			const aliasResult = await this.trackCrossFileAliases("User");

			const success =
				aliasResult.usageMap.has("App.tsx") &&
				aliasResult.usageMap.has("Admin.tsx") &&
				aliasResult.usageMap
					.get("App.tsx")
					?.some((usage) => usage.aliasName === "UserType") &&
				aliasResult.usageMap
					.get("Admin.tsx")
					?.some((usage) => usage.aliasName === "UserModel");

			const endTime = performance.now();
			const endMemory = process.memoryUsage();

			return {
				success: success || false,
				executionTime: endTime - startTime,
				metrics: {
					nodesProcessed: 6,
					relationshipsProcessed: 4,
					queriesExecuted: 10,
					memoryUsage: {
						rss: endMemory.rss - startMemory.rss,
						heapUsed: endMemory.heapUsed - startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				executionTime: performance.now() - startTime,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * Edge Cases 테스트
	 */
	async testEdgeCases(): Promise<TestResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage();

		try {
			let successCount = 0;
			const totalTests = 5;

			// 1. 빈 체인 테스트
			const emptyChain = await this.findAliasChain("NonExistent", "test.ts");
			if (emptyChain.chain.length === 0) successCount++;

			// 2. 자기 자신을 참조하는 alias
			await this.createSelfReferenceAlias("SelfRef");
			const selfRefChain = await this.findAliasChain("SelfRef", "test.ts");
			if (selfRefChain.isCircular) successCount++;

			// 3. 동일한 이름의 다른 심볼
			await this.createDuplicateNameScenario();
			const duplicateResult = await this.trackCrossFileAliases("Duplicate");
			if (duplicateResult.conflicts.length > 0) successCount++;

			// 4. 매우 긴 체인 (maxDepth 초과)
			await this.createVeryLongChain(20);
			const longChain = await this.findAliasChain("Z", "test.ts");
			if (longChain.chain.length <= this.config.maxDepth) successCount++;

			// 5. 메타데이터 손상 시나리오
			await this.createCorruptedMetadataScenario();
			const corruptedResult = await this.findAliasChain("Corrupted", "test.ts");
			if (corruptedResult.chain.length === 0) successCount++;

			const success = successCount === totalTests;

			const endTime = performance.now();
			const endMemory = process.memoryUsage();

			return {
				success,
				executionTime: endTime - startTime,
				metrics: {
					nodesProcessed: 30,
					relationshipsProcessed: 25,
					queriesExecuted: 50,
					memoryUsage: {
						rss: endMemory.rss - startMemory.rss,
						heapUsed: endMemory.heapUsed - startMemory.heapUsed,
						heapTotal: endMemory.heapTotal - startMemory.heapTotal,
					},
				},
			};
		} catch (error) {
			return {
				success: false,
				executionTime: performance.now() - startTime,
				error: (error as Error).message,
			};
		}
	}

	/**
	 * 성능 벤치마크 테스트
	 */
	async runPerformanceBenchmark(): Promise<{
		overallScore: number;
		detailedResults: Map<string, TestResult>;
		recommendations: string[];
	}> {
		// const startTime = performance.now();
		const detailedResults = new Map<string, TestResult>();
		const recommendations: string[] = [];

		// 모든 테스트 실행
		const tests = [
			{ name: "simple_alias_chain", test: () => this.testSimpleAliasChain() },
			{ name: "deep_alias_chain", test: () => this.testDeepAliasChain() },
			{
				name: "circular_alias_chain",
				test: () => this.testCircularAliasChain(),
			},
			{ name: "cross_file_alias", test: () => this.testCrossFileAlias() },
			{ name: "edge_cases", test: () => this.testEdgeCases() },
		];

		let successCount = 0;
		let totalExecutionTime = 0;

		for (const test of tests) {
			const result = await test.test();
			detailedResults.set(test.name, result);

			if (result.success) successCount++;
			totalExecutionTime += result.executionTime;

			// 성능 권장사항 생성
			if (result.executionTime > 1000) {
				recommendations.push(
					`Test '${test.name}' is slow (${result.executionTime.toFixed(2)}ms). Consider optimization.`,
				);
			}
		}

		// const endTime = performance.now();
		const overallScore = Math.round((successCount / tests.length) * 100);

		// 전체 성능 권장사항
		if (totalExecutionTime > 5000) {
			recommendations.push(
				"Overall test execution is slow. Consider parallel execution or optimization.",
			);
		}

		return {
			overallScore,
			detailedResults,
			recommendations,
		};
	}

	// Private helper methods
	private async findAliasChain(
		symbolName: string,
		sourceFile: string,
	): Promise<AliasChainResult> {
		const startTime = performance.now();
		const chain: string[] = [];
		const visited = new Set<string>();
		let isCircular = false;

		let currentSymbol = symbolName;
		let depth = 0;

		while (currentSymbol && depth < this.config.maxDepth) {
			if (visited.has(currentSymbol)) {
				isCircular = true;
				break;
			}

			visited.add(currentSymbol);
			chain.push(currentSymbol);

			// 다음 alias 찾기
			const nextAlias = await this.findNextAlias(currentSymbol, sourceFile);
			if (!nextAlias) break;

			currentSymbol = nextAlias;
			depth++;
		}

		return {
			chain,
			depth,
			isCircular,
			executionTime: performance.now() - startTime,
		};
	}

	private async trackCrossFileAliases(
		originalName: string,
	): Promise<CrossFileAliasResult> {
		const startTime = performance.now();
		const usageMap = new Map<
			string,
			Array<{
				aliasName: string;
				originalName: string;
				sourceFile: string;
				confidence: number;
			}>
		>();
		const conflicts: Array<{
			file1: string;
			file2: string;
			aliasName: string;
			originalName: string;
		}> = [];

		// 모든 파일에서 해당 심볼의 사용법 추적
		const usages = await this.database.runQuery(
			`
			SELECT n.name, n.source_file, n.metadata
			FROM nodes n
			WHERE json_extract(n.metadata, '$.originalName') = ?
			AND n.type = 'unknown'
		`,
			[originalName],
		);

		for (const usage of usages) {
			const sourceFile = usage.source_file;
			const aliasName = usage.name;
			const metadata = JSON.parse(usage.metadata || "{}");

			if (!usageMap.has(sourceFile)) {
				usageMap.set(sourceFile, []);
			}

			usageMap.get(sourceFile)?.push({
				aliasName,
				originalName,
				sourceFile,
				confidence: metadata.confidence || 1.0,
			});
		}

		// 충돌 감지
		const aliasNames = new Map<string, string>();
		for (const [file, usages] of usageMap) {
			for (const usage of usages) {
				if (aliasNames.has(usage.aliasName)) {
					const existingFile = aliasNames.get(usage.aliasName);
					if (existingFile) {
						conflicts.push({
							file1: existingFile,
							file2: file,
							aliasName: usage.aliasName,
							originalName,
						});
					}
				} else {
					aliasNames.set(usage.aliasName, file);
				}
			}
		}

		return {
			originalName,
			usageMap,
			conflicts,
			executionTime: performance.now() - startTime,
		};
	}

	private async findNextAlias(
		symbolName: string,
		sourceFile: string,
	): Promise<string | null> {
		const result = await this.database.runQuery(
			`
			SELECT json_extract(metadata, '$.originalName') as original_name
			FROM nodes
			WHERE name = ? AND source_file = ? AND type = 'unknown'
		`,
			[symbolName, sourceFile],
		);

		return result[0]?.original_name || null;
	}

	private async createTestAliasChain(chain: string[]): Promise<void> {
		// 체인 노드들 생성
		for (let i = 0; i < chain.length; i++) {
			const node = await this.database.upsertNode({
				identifier: `test-project/src/test.ts#Unknown:${chain[i]}`,
				type: "unknown",
				name: chain[i],
				sourceFile: "src/test.ts",
				language: "typescript",
				metadata: {
					isAlias: i > 0,
					originalName: i > 0 ? chain[i - 1] : null,
				},
			});

			// Alias 관계 생성
			if (i > 0) {
				const prevNode = await this.database.findNodes({
					sourceFiles: ["src/test.ts"],
				});
				const filteredPrevNode = prevNode.filter(
					(n) => n.name === chain[i - 1],
				);

				if (filteredPrevNode.length > 0 && filteredPrevNode[0].id) {
					await this.database.upsertRelationship({
						fromNodeId: node,
						toNodeId: filteredPrevNode[0].id,
						type: "aliasOf",
						metadata: { aliasName: chain[i] },
					});
				}
			}
		}
	}

	private async createCircularAliasChain(chain: string[]): Promise<void> {
		await this.createTestAliasChain(chain);

		// 순환 관계 생성 (마지막 → 첫 번째)
		const firstNode = await this.database.findNodes({
			sourceFiles: ["src/test.ts"],
		});
		const filteredFirstNode = firstNode.filter((n) => n.name === chain[0]);

		const lastNode = await this.database.findNodes({
			sourceFiles: ["src/test.ts"],
		});
		const filteredLastNode = lastNode.filter(
			(n) => n.name === chain[chain.length - 1],
		);

		if (
			filteredFirstNode.length > 0 &&
			filteredLastNode.length > 0 &&
			filteredFirstNode[0].id &&
			filteredLastNode[0].id
		) {
			await this.database.upsertRelationship({
				fromNodeId: filteredLastNode[0].id,
				toNodeId: filteredFirstNode[0].id,
				type: "aliasOf",
				metadata: { aliasName: chain[chain.length - 1] },
			});
		}
	}

	private async createCrossFileAliasScenario(): Promise<void> {
		// types.ts에서 User 클래스 export
		await this.database.upsertNode({
			identifier: "test-project/src/types.ts#Class:User",
			type: "class",
			name: "User",
			sourceFile: "src/types.ts",
			language: "typescript",
		});

		// App.tsx에서 User as UserType import
		await this.database.upsertNode({
			identifier: "test-project/src/App.tsx#Unknown:UserType",
			type: "unknown",
			name: "UserType",
			sourceFile: "src/App.tsx",
			language: "typescript",
			metadata: {
				isAlias: true,
				originalName: "User",
				importedFrom: "src/types.ts",
			},
		});

		// Admin.tsx에서 User as UserModel import
		await this.database.upsertNode({
			identifier: "test-project/src/Admin.tsx#Unknown:UserModel",
			type: "unknown",
			name: "UserModel",
			sourceFile: "src/Admin.tsx",
			language: "typescript",
			metadata: {
				isAlias: true,
				originalName: "User",
				importedFrom: "src/types.ts",
			},
		});
	}

	private async createSelfReferenceAlias(symbolName: string): Promise<void> {
		await this.database.upsertNode({
			identifier: `test-project/src/test.ts#Unknown:${symbolName}`,
			type: "unknown",
			name: symbolName,
			sourceFile: "src/test.ts",
			language: "typescript",
			metadata: {
				isAlias: true,
				originalName: symbolName, // 자기 자신을 참조
			},
		});
	}

	private async createDuplicateNameScenario(): Promise<void> {
		// 동일한 이름의 다른 심볼들 생성
		await this.database.upsertNode({
			identifier: "test-project/src/file1.ts#Unknown:Duplicate",
			type: "unknown",
			name: "Duplicate",
			sourceFile: "src/file1.ts",
			language: "typescript",
			metadata: { originalName: "Original1" },
		});

		await this.database.upsertNode({
			identifier: "test-project/src/file2.ts#Unknown:Duplicate",
			type: "unknown",
			name: "Duplicate",
			sourceFile: "src/file2.ts",
			language: "typescript",
			metadata: { originalName: "Original2" },
		});
	}

	private async createVeryLongChain(length: number): Promise<void> {
		const chain = Array.from({ length }, (_, i) => String.fromCharCode(65 + i));
		await this.createTestAliasChain(chain);
	}

	private async createCorruptedMetadataScenario(): Promise<void> {
		await this.database.upsertNode({
			identifier: "test-project/src/test.ts#Unknown:Corrupted",
			type: "unknown",
			name: "Corrupted",
			sourceFile: "src/test.ts",
			language: "typescript",
			metadata: undefined, // 손상된 메타데이터
		});
	}

	private compareChains(chain1: string[], chain2: string[]): boolean {
		if (chain1.length !== chain2.length) return false;
		return chain1.every((item, index) => item === chain2[index]);
	}
}
