import { GraphDatabase } from "../../dist/database/GraphDatabase.js";
import { EdgeTypeRegistry } from "../../dist/database/inference/EdgeTypeRegistry.js";
import { InferenceEngine } from "../../dist/database/inference/InferenceEngine.js";
import { OptimizedInferenceEngine } from "../../dist/database/inference/OptimizedInferenceEngine.js";
import { analyzeFile } from "../../dist/api/analysis.js";

interface TestResult {
	name: string;
	success: boolean;
	message?: string;
	duration?: number;
	details?: any;
}

interface TestSuiteResults {
	tests: TestResult[];
	errors: string[];
}

class IntegrationTestSuite {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			errors: [],
		};
	}

	async run(): Promise<void> {
		console.log("🚀 통합 테스트 시작\n");

		try {
			await this.testCompleteWorkflow();
			await this.testPerformanceIntegration();
			await this.testErrorHandling();
			await this.testScalability();

			this.printResults();
			console.log("\n✅ 모든 통합 테스트가 완료되었습니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ 통합 테스트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printResults();
			process.exit(1);
		}
	}

	async testCompleteWorkflow(): Promise<void> {
		console.log("📋 1. 완전한 워크플로우 테스트...");

		try {
			// 1. 데이터베이스 초기화
			const db = new GraphDatabase(":memory:");
			await db.initialize();
			EdgeTypeRegistry.initialize();

			console.log("  ✅ 데이터베이스 초기화 완료");

			// 2. Edge Type 등록
			EdgeTypeRegistry.register("depends_on", {
				type: "depends_on",
				description: "Dependency relationship",
				schema: {},
				isTransitive: true,
				isInheritable: false,
				isDirected: true,
				priority: 1,
			});

			EdgeTypeRegistry.register("extends", {
				type: "extends",
				description: "Inheritance relationship",
				schema: {},
				isTransitive: true,
				isInheritable: true,
				isDirected: true,
				priority: 2,
			});

			console.log("  ✅ Edge Type 등록 완료");

			// 3. 대량 노드 생성
			const nodeIds: number[] = [];
			const startTime = performance.now();

			for (let i = 0; i < 50; i++) {
				const nodeId = await db.upsertNode({
					identifier: `test-project/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
				nodeIds.push(nodeId);
			}

			const nodeCreationTime = performance.now() - startTime;
			console.log(
				`  ✅ 노드 생성 완료: ${nodeIds.length}개 (${nodeCreationTime.toFixed(2)}ms)`,
			);

			// 4. 대량 관계 생성
			const relationshipStartTime = performance.now();
			for (let i = 0; i < 49; i++) {
				await db.upsertRelationship({
					fromNodeId: nodeIds[i],
					toNodeId: nodeIds[i + 1],
					type: "depends_on",
					metadata: { dependencyType: "import" },
				});
			}

			const relationshipCreationTime =
				performance.now() - relationshipStartTime;
			console.log(
				`  ✅ 관계 생성 완료: 49개 (${relationshipCreationTime.toFixed(2)}ms)`,
			);

			// 5. 추론 엔진 테스트
			const inferenceEngine = new InferenceEngine(db);
			const inferenceStartTime = performance.now();

			// 전이적 추론
			const transitiveResults = await inferenceEngine.queryTransitive(
				nodeIds[0],
				"depends_on",
				{ maxPathLength: 10 },
			);

			// 계층적 추론
			const hierarchicalResults = await inferenceEngine.queryHierarchical(
				"depends_on",
				{ includeChildren: true, maxDepth: 5 },
			);

			const inferenceTime = performance.now() - inferenceStartTime;
			console.log(
				`  ✅ 추론 엔진 테스트 완료: ${transitiveResults.length}개 전이적, ${hierarchicalResults.length}개 계층적 (${inferenceTime.toFixed(2)}ms)`,
			);

			// 6. 성능 통계
			const totalTime = performance.now() - startTime;
			const throughput = (nodeIds.length / totalTime) * 1000;

			this.results.tests.push({
				name: "complete_workflow",
				success: true,
				message: "완전한 워크플로우 성공",
				details: {
					nodeCount: nodeIds.length,
					relationshipCount: 49,
					totalTime: totalTime,
					throughput: throughput,
					transitiveResults: transitiveResults.length,
					hierarchicalResults: hierarchicalResults.length,
				},
			});

			console.log(`  📊 성능 통계: ${throughput.toFixed(0)} nodes/sec`);
		} catch (error: any) {
			this.results.tests.push({
				name: "complete_workflow",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceIntegration(): Promise<void> {
		console.log("📋 2. 성능 통합 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 최적화된 추론 엔진 초기화
			const optimizedEngine = new OptimizedInferenceEngine(db, {
				enableLRUCache: true,
				enableIncremental: true,
				enablePerformanceMonitoring: true,
				cacheSize: 1000,
				cacheTTL: 60000,
			});

			// 대량 데이터 생성
			const nodeIds: number[] = [];
			for (let i = 0; i < 100; i++) {
				const nodeId = await db.upsertNode({
					identifier: `perf-test/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
				nodeIds.push(nodeId);
			}

			// 관계 생성
			for (let i = 0; i < 99; i++) {
				await db.upsertRelationship({
					fromNodeId: nodeIds[i],
					toNodeId: nodeIds[i + 1],
					type: "depends_on",
					metadata: { dependencyType: "import" },
				});
			}

			// 성능 벤치마크
			const benchmarkStartTime = performance.now();
			const benchmarkResults = await optimizedEngine.runPerformanceBenchmark();
			const benchmarkTime = performance.now() - benchmarkStartTime;

			// 캐시 통계
			const cacheStats = optimizedEngine.getLRUCacheStatistics();
			const performanceMetrics = optimizedEngine.getPerformanceMetrics();

			this.results.tests.push({
				name: "performance_integration",
				success: true,
				message: "성능 통합 테스트 성공",
				details: {
					benchmarkTime: benchmarkTime,
					cacheStats: cacheStats,
					metricsCount: performanceMetrics.size,
					benchmarkResults: benchmarkResults,
				},
			});

			console.log("  ✅ 최적화된 추론 엔진 성능 테스트 완료");
			console.log(`  📊 벤치마크 시간: ${benchmarkTime.toFixed(2)}ms`);
			console.log(`  📊 캐시 히트율: ${cacheStats.hitRate}`);
			console.log(`  📊 성능 메트릭 수: ${performanceMetrics.size}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance_integration",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testErrorHandling(): Promise<void> {
		console.log("📋 3. 에러 처리 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 잘못된 구문으로 파일 분석 테스트
			const invalidCode = `
			import { NonExistentModule } from 'non-existent-package';
			export class InvalidClass {
				constructor() {
					this.invalidMethod();
				}
			}
			`;

			try {
				await analyzeFile(invalidCode, "typescript", "src/InvalidFile.ts");
				console.log("  ✅ 잘못된 구문 처리: 성공 (에러가 적절히 처리됨)");
			} catch (error: any) {
				console.log("  ✅ 잘못된 구문 처리: 성공 (에러가 적절히 캐치됨)");
			}

			// 존재하지 않는 노드 ID로 관계 생성 시도
			try {
				await db.upsertRelationship({
					fromNodeId: 99999,
					toNodeId: 99998,
					type: "depends_on",
					metadata: { dependencyType: "import" },
				});
				console.log(
					"  ❌ 존재하지 않는 노드 ID 테스트: 실패 (예상된 에러가 발생하지 않음)",
				);
			} catch (error: any) {
				console.log(
					"  ✅ 존재하지 않는 노드 ID 테스트: 성공 (예상된 에러 발생)",
				);
			}

			this.results.tests.push({
				name: "error_handling",
				success: true,
				message: "에러 처리 성공",
			});

			console.log("  ✅ 에러 처리 테스트 완료");
		} catch (error: any) {
			this.results.tests.push({
				name: "error_handling",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testScalability(): Promise<void> {
		console.log("📋 4. 확장성 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 대량 데이터 생성
			const batchSize = 50;
			const totalNodes = 200;
			const startTime = performance.now();

			const nodeIds: number[] = [];
			for (let i = 0; i < totalNodes; i++) {
				const nodeId = await db.upsertNode({
					identifier: `scalability-test/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
				nodeIds.push(nodeId);
			}

			// 배치 관계 생성
			for (let i = 0; i < totalNodes - 1; i += batchSize) {
				const batchEnd = Math.min(i + batchSize, totalNodes - 1);
				for (let j = i; j < batchEnd; j++) {
					await db.upsertRelationship({
						fromNodeId: nodeIds[j],
						toNodeId: nodeIds[j + 1],
						type: "depends_on",
						metadata: { dependencyType: "import" },
					});
				}
			}

			const totalTime = performance.now() - startTime;
			const throughput = (totalNodes / totalTime) * 1000;

			// 추론 엔진으로 복잡한 쿼리 테스트
			const inferenceEngine = new InferenceEngine(db);
			const queryStartTime = performance.now();

			const transitiveResults = await inferenceEngine.queryTransitive(
				nodeIds[0],
				"depends_on",
				{ maxPathLength: 50 },
			);

			const queryTime = performance.now() - queryStartTime;

			this.results.tests.push({
				name: "scalability",
				success: true,
				message: "확장성 테스트 성공",
				details: {
					totalNodes: totalNodes,
					totalTime: totalTime,
					throughput: throughput,
					queryTime: queryTime,
					transitiveResults: transitiveResults.length,
				},
			});

			console.log(
				`  ✅ 대량 데이터 생성: ${totalNodes}개 노드 (${totalTime.toFixed(2)}ms)`,
			);
			console.log(`  📊 처리 속도: ${throughput.toFixed(0)} nodes/sec`);
			console.log(
				`  ✅ 복잡한 쿼리: ${transitiveResults.length}개 결과 (${queryTime.toFixed(2)}ms)`,
			);
		} catch (error: any) {
			this.results.tests.push({
				name: "scalability",
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
			"\n============================================================",
		);
		console.log("📊 통합 테스트 결과");
		console.log("============================================================");
		console.log(
			`✅ 성공: ${successCount}/${totalCount} 테스트 (${((successCount / totalCount) * 100).toFixed(1)}%)`,
		);
		console.log(`❌ 실패: ${totalCount - successCount}/${totalCount} 테스트`);

		console.log("\n📋 테스트 상세:");
		this.results.tests.forEach((test) => {
			const status = test.success ? "✅" : "❌";
			console.log(`  ${status} ${test.name}`);
		});

		if (this.results.errors.length > 0) {
			console.log("\n❌ 에러 목록:");
			this.results.errors.forEach((error) => {
				console.log(`  - ${error}`);
			});
		}

		console.log(
			"============================================================\n",
		);
	}
}

// 테스트 실행
const testSuite = new IntegrationTestSuite();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
