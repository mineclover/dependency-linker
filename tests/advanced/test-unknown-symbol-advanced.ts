import { GraphDatabase } from "../../dist/database/GraphDatabase.js";
import { UnknownSymbolPerformanceOptimizer } from "../../dist/database/inference/UnknownSymbolPerformanceOptimizer.js";
import { UnknownSymbolAdvancedTester } from "../../dist/database/inference/UnknownSymbolAdvancedTester.js";

interface TestResult {
	name: string;
	success: boolean;
	message?: string;
	duration?: number;
	details?: any;
}

interface TestSuiteResults {
	tests: TestResult[];
	performance: Record<string, any>;
	errors: string[];
}

class UnknownSymbolAdvancedTestSuite {
	private results: TestSuiteResults;
	private db: GraphDatabase;
	private performanceOptimizer: UnknownSymbolPerformanceOptimizer;
	private advancedTester: UnknownSymbolAdvancedTester;

	constructor() {
		this.results = {
			tests: [],
			performance: {},
			errors: [],
		};
		this.db = new GraphDatabase(":memory:");
		this.performanceOptimizer = new UnknownSymbolPerformanceOptimizer(this.db);
		this.advancedTester = new UnknownSymbolAdvancedTester(this.db);
	}

	async setup(): Promise<void> {
		await this.db.initialize();
		// Clear all data by deleting all nodes and relationships
		await this.db.runQuery("DELETE FROM edges");
		await this.db.runQuery("DELETE FROM nodes");
	}

	async teardown(): Promise<void> {
		await this.db.close();
	}

	async run(): Promise<void> {
		console.log("🚀 Unknown Symbol System 고급 기능 테스트 시작\\n");
		await this.setup();

		try {
			await this.testPerformanceOptimization();
			await this.testAdvancedTesting();
			await this.testBatchOperations();
			await this.testIndexOptimization();
			await this.testQueryPerformance();
			await this.testAliasChainScenarios();
			await this.testCrossFileAliasScenarios();
			await this.testEdgeCases();
			await this.testPerformanceBenchmark();

			this.printResults();

			console.log("\\n✅ 모든 테스트가 완료되었습니다. 프로세스를 종료합니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ Unknown Symbol System 테스트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printResults();
			process.exit(1);
		} finally {
			await this.teardown();
		}
	}

	async testPerformanceOptimization(): Promise<void> {
		console.log("📋 1. 성능 최적화 테스트...");

		try {
			const startTime = performance.now();

			// 대량 unknown symbol 생성
			const symbols = [];
			for (let i = 0; i < 1000; i++) {
				symbols.push({
					identifier: `unknown-symbol-${i}`,
					type: "unknown",
					name: `UnknownSymbol${i}`,
					sourceFile: `src/unknown${i}.ts`,
					language: "typescript",
				});
			}

			// 배치로 노드 생성
			const nodeIds = [];
			for (const symbol of symbols) {
				const nodeId = await this.db.upsertNode(symbol);
				nodeIds.push(nodeId);
			}

			// 성능 최적화 실행
			const optimizationResults =
				await this.performanceOptimizer.optimizeUnknownSymbols();

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "performance_optimization",
				success: true,
				message: "성능 최적화 성공",
				duration: duration,
				details: {
					symbolCount: symbols.length,
					optimizationResults: optimizationResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 대량 unknown symbol 생성: 성공");
			console.log("  ✅ 성능 최적화 실행: 성공");
			console.log(`    - 심볼 수: ${symbols.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance_optimization",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testAdvancedTesting(): Promise<void> {
		console.log("📋 2. 고급 테스팅 기능...");

		try {
			const startTime = performance.now();

			// 고급 테스팅 실행
			const testResults = await this.advancedTester.runAdvancedTests({
				includePerformanceTests: true,
				includeStressTests: true,
				includeEdgeCaseTests: true,
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "advanced_testing",
				success: true,
				message: "고급 테스팅 성공",
				duration: duration,
				details: {
					testResults: testResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 고급 테스팅 실행: 성공");
			console.log(`    - 테스트 결과: ${testResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "advanced_testing",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testBatchOperations(): Promise<void> {
		console.log("📋 3. 배치 작업 테스트...");

		try {
			const startTime = performance.now();

			// 배치 작업 실행
			const batchSize = 100;
			const totalOperations = 500;

			const batchResults =
				await this.performanceOptimizer.executeBatchOperations({
					batchSize: batchSize,
					totalOperations: totalOperations,
					operationType: "unknown_symbol_processing",
				});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "batch_operations",
				success: true,
				message: "배치 작업 성공",
				duration: duration,
				details: {
					batchSize: batchSize,
					totalOperations: totalOperations,
					batchResults: batchResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 배치 작업 실행: 성공");
			console.log(`    - 배치 크기: ${batchSize}개`);
			console.log(`    - 총 작업 수: ${totalOperations}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "batch_operations",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testIndexOptimization(): Promise<void> {
		console.log("📋 4. 인덱스 최적화 테스트...");

		try {
			const startTime = performance.now();

			// 인덱스 최적화 실행
			const indexResults = await this.performanceOptimizer.optimizeIndexes({
				includeUnknownSymbolIndexes: true,
				includeRelationshipIndexes: true,
				includeCompositeIndexes: true,
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "index_optimization",
				success: true,
				message: "인덱스 최적화 성공",
				duration: duration,
				details: {
					indexResults: indexResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 인덱스 최적화 실행: 성공");
			console.log(`    - 인덱스 결과: ${indexResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "index_optimization",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testQueryPerformance(): Promise<void> {
		console.log("📋 5. 쿼리 성능 테스트...");

		try {
			const startTime = performance.now();

			// 쿼리 성능 테스트 실행
			const queryResults = await this.advancedTester.testQueryPerformance({
				queryTypes: ["unknown_symbols", "aliases", "relationships"],
				iterations: 10,
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "query_performance",
				success: true,
				message: "쿼리 성능 테스트 성공",
				duration: duration,
				details: {
					queryResults: queryResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 쿼리 성능 테스트 실행: 성공");
			console.log(`    - 쿼리 결과: ${queryResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "query_performance",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testAliasChainScenarios(): Promise<void> {
		console.log("📋 6. 별칭 체인 시나리오 테스트...");

		try {
			const startTime = performance.now();

			// 별칭 체인 시나리오 테스트
			const aliasResults = await this.advancedTester.testAliasChainScenarios({
				chainLength: 5,
				scenarioCount: 10,
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "alias_chain_scenarios",
				success: true,
				message: "별칭 체인 시나리오 성공",
				duration: duration,
				details: {
					aliasResults: aliasResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 별칭 체인 시나리오 테스트: 성공");
			console.log(`    - 별칭 결과: ${aliasResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "alias_chain_scenarios",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testCrossFileAliasScenarios(): Promise<void> {
		console.log("📋 7. 크로스 파일 별칭 시나리오 테스트...");

		try {
			const startTime = performance.now();

			// 크로스 파일 별칭 시나리오 테스트
			const crossFileResults =
				await this.advancedTester.testCrossFileAliasScenarios({
					fileCount: 5,
					aliasCount: 20,
				});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "cross_file_alias_scenarios",
				success: true,
				message: "크로스 파일 별칭 시나리오 성공",
				duration: duration,
				details: {
					crossFileResults: crossFileResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 크로스 파일 별칭 시나리오 테스트: 성공");
			console.log(`    - 크로스 파일 결과: ${crossFileResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "cross_file_alias_scenarios",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testEdgeCases(): Promise<void> {
		console.log("📋 8. 엣지 케이스 테스트...");

		try {
			const startTime = performance.now();

			// 엣지 케이스 테스트
			const edgeCaseResults = await this.advancedTester.testEdgeCases({
				includeCircularReferences: true,
				includeDeepNesting: true,
				includeInvalidSymbols: true,
			});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.tests.push({
				name: "edge_cases",
				success: true,
				message: "엣지 케이스 테스트 성공",
				duration: duration,
				details: {
					edgeCaseResults: edgeCaseResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 엣지 케이스 테스트: 성공");
			console.log(`    - 엣지 케이스 결과: ${edgeCaseResults.length}개`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "edge_cases",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceBenchmark(): Promise<void> {
		console.log("📋 9. 성능 벤치마크...");

		try {
			const startTime = performance.now();

			// 성능 벤치마크 실행
			const benchmarkResults =
				await this.performanceOptimizer.runPerformanceBenchmark({
					iterations: 5,
					includeMemoryTests: true,
					includeCPUTests: true,
				});

			const endTime = performance.now();
			const duration = endTime - startTime;

			this.results.performance = benchmarkResults;

			this.results.tests.push({
				name: "performance_benchmark",
				success: true,
				message: "성능 벤치마크 성공",
				duration: duration,
				details: {
					benchmarkResults: benchmarkResults,
					executionTime: duration,
				},
			});

			console.log("  ✅ 성능 벤치마크 실행: 성공");
			console.log(`    - 벤치마크 결과: ${JSON.stringify(benchmarkResults)}`);
			console.log(`    - 실행 시간: ${duration.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance_benchmark",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	private printResults(): void {
		const successCount = this.results.tests.filter((t) => t.success).length;
		const totalCount = this.results.tests.length;

		console.log(
			"\\n============================================================",
		);
		console.log("📊 Unknown Symbol System 고급 기능 테스트 결과");
		console.log("============================================================");
		console.log(`✅ 성공: ${successCount}/${totalCount} 테스트`);
		console.log(`❌ 실패: ${totalCount - successCount}/${totalCount} 테스트`);

		console.log("\\n📋 테스트 상세:");
		this.results.tests.forEach((test) => {
			const status = test.success ? "✅" : "❌";
			console.log(`  ${status} ${test.name}`);
			if (test.duration) {
				console.log(`    - 실행 시간: ${test.duration.toFixed(2)}ms`);
			}
		});

		if (Object.keys(this.results.performance).length > 0) {
			console.log("\\n📊 성능 지표:");
			console.log(
				`  - 벤치마크 결과: ${JSON.stringify(this.results.performance)}`,
			);
		}

		if (this.results.errors.length > 0) {
			console.log("\\n❌ 에러 목록:");
			this.results.errors.forEach((error) => {
				console.log(`  - ${error}`);
			});
		}

		console.log(
			"============================================================\\n",
		);
	}
}

// 테스트 실행
const testSuite = new UnknownSymbolAdvancedTestSuite();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
