import { AdvancedInferenceSystem } from "../../dist/database/inference/AdvancedInferenceSystem.js";
import { CustomInferenceRuleEngine } from "../../dist/database/inference/CustomInferenceRules.js";
import { RealTimeInferenceSystem } from "../../dist/database/inference/RealTimeInference.js";
import { GraphDatabase } from "../../dist/database/GraphDatabase.js";

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

/**
 * 고급 추론 시스템 테스트
 * Custom Rules, Real-Time Inference, Advanced Inference System 테스트
 */
class AdvancedInferenceSystemTest {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			performance: {},
			errors: [],
		};
	}

	async run(): Promise<void> {
		console.log("🚀 고급 추론 시스템 테스트 시작\\n");

		try {
			// 1. 사용자 정의 규칙 테스트
			await this.testCustomInferenceRules();

			// 2. 실시간 추론 시스템 테스트
			await this.testRealTimeInferenceSystem();

			// 3. 고급 추론 시스템 통합 테스트
			await this.testAdvancedInferenceSystem();

			// 4. 성능 벤치마크
			await this.testPerformanceBenchmarks();

			// 5. 배치 처리 테스트
			await this.testBatchProcessing();

			// 결과 출력
			this.printResults();

			// 테스트 완료 후 프로세스 종료
			console.log("\\n✅ 모든 테스트가 완료되었습니다. 프로세스를 종료합니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ 고급 추론 시스템 테스트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printResults();
			process.exit(1);
		}
	}

	async testCustomInferenceRules(): Promise<void> {
		console.log("📋 1. 사용자 정의 추론 규칙 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 테스트 데이터 생성
			const nodeA = await db.upsertNode({
				identifier: "test-project/src/A.ts#Class:A",
				type: "class",
				name: "A",
				sourceFile: "src/A.ts",
				language: "typescript",
			});

			const nodeB = await db.upsertNode({
				identifier: "test-project/src/B.ts#Class:B",
				type: "class",
				name: "B",
				sourceFile: "src/B.ts",
				language: "typescript",
			});

			const nodeC = await db.upsertNode({
				identifier: "test-project/src/C.ts#Class:C",
				type: "class",
				name: "C",
				sourceFile: "src/C.ts",
				language: "typescript",
			});

			// 관계 생성
			await db.upsertRelationship({
				fromNodeId: nodeA,
				toNodeId: nodeB,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			await db.upsertRelationship({
				fromNodeId: nodeB,
				toNodeId: nodeC,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			// 사용자 정의 규칙 엔진 초기화
			const customEngine = new CustomInferenceRuleEngine(db);

			// 사용자 정의 규칙 등록
			customEngine.addRule({
				id: "custom_rule_1",
				name: "Custom Dependency Rule",
				description: "Custom rule for dependency inference",
				condition: {
					type: "relationship_exists",
					relationshipType: "depends_on",
				},
				action: {
					type: "create_relationship",
					relationshipType: "custom_dependency",
					metadata: { source: "custom_rule" },
				},
			});

			// 규칙 실행
			const startTime = performance.now();
			const results = await customEngine.executeRules();
			const endTime = performance.now();

			this.results.tests.push({
				name: "custom_inference_rules",
				success: true,
				message: "사용자 정의 추론 규칙 성공",
				duration: endTime - startTime,
				details: {
					ruleCount: 1,
					executionTime: endTime - startTime,
					resultsCount: results.length,
				},
			});

			console.log("  ✅ 사용자 정의 규칙 등록: 성공");
			console.log("  ✅ 규칙 실행: 성공");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`    - 결과 수: ${results.length}개`);
		} catch (error: any) {
			this.results.tests.push({
				name: "custom_inference_rules",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testRealTimeInferenceSystem(): Promise<void> {
		console.log("📋 2. 실시간 추론 시스템 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 실시간 추론 시스템 초기화
			const realTimeSystem = new RealTimeInferenceSystem(db);

			// 이벤트 리스너 등록
			let eventCount = 0;
			realTimeSystem.on("inference_completed", (data) => {
				eventCount++;
				console.log(`  📡 실시간 이벤트 수신: ${data.type}`);
			});

			// 테스트 데이터 생성
			const nodeA = await db.upsertNode({
				identifier: "realtime-test/src/A.ts#Class:A",
				type: "class",
				name: "A",
				sourceFile: "src/A.ts",
				language: "typescript",
			});

			const nodeB = await db.upsertNode({
				identifier: "realtime-test/src/B.ts#Class:B",
				type: "class",
				name: "B",
				sourceFile: "src/B.ts",
				language: "typescript",
			});

			// 관계 생성 (실시간 추론 트리거)
			await db.upsertRelationship({
				fromNodeId: nodeA,
				toNodeId: nodeB,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			// 실시간 추론 실행
			const startTime = performance.now();
			await realTimeSystem.processChange({
				type: "relationship_added",
				nodeId: nodeA,
				relationshipType: "depends_on",
			});
			const endTime = performance.now();

			// 잠시 대기하여 이벤트 처리 완료
			await new Promise((resolve) => setTimeout(resolve, 100));

			this.results.tests.push({
				name: "real_time_inference",
				success: true,
				message: "실시간 추론 시스템 성공",
				duration: endTime - startTime,
				details: {
					eventCount: eventCount,
					executionTime: endTime - startTime,
				},
			});

			console.log("  ✅ 실시간 추론 시스템 초기화: 성공");
			console.log("  ✅ 이벤트 리스너 등록: 성공");
			console.log("  ✅ 실시간 추론 실행: 성공");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`    - 수신된 이벤트: ${eventCount}개`);
		} catch (error: any) {
			this.results.tests.push({
				name: "real_time_inference",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testAdvancedInferenceSystem(): Promise<void> {
		console.log("📋 3. 고급 추론 시스템 통합 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 고급 추론 시스템 초기화
			const advancedSystem = new AdvancedInferenceSystem(db, {
				enableCustomRules: true,
				enableRealTimeInference: true,
				enablePerformanceMonitoring: true,
			});

			// 대량 테스트 데이터 생성
			const nodeIds: number[] = [];
			for (let i = 0; i < 20; i++) {
				const nodeId = await db.upsertNode({
					identifier: `advanced-test/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
				nodeIds.push(nodeId);
			}

			// 복잡한 관계 네트워크 생성
			for (let i = 0; i < 19; i++) {
				await db.upsertRelationship({
					fromNodeId: nodeIds[i],
					toNodeId: nodeIds[i + 1],
					type: "depends_on",
					metadata: { dependencyType: "import" },
				});
			}

			// 고급 추론 실행
			const startTime = performance.now();
			const results = await advancedSystem.executeAdvancedInference({
				includeTransitive: true,
				includeHierarchical: true,
				includeCustomRules: true,
				maxDepth: 10,
			});
			const endTime = performance.now();

			this.results.tests.push({
				name: "advanced_inference_system",
				success: true,
				message: "고급 추론 시스템 성공",
				duration: endTime - startTime,
				details: {
					nodeCount: nodeIds.length,
					relationshipCount: 19,
					resultsCount: results.length,
					executionTime: endTime - startTime,
				},
			});

			console.log("  ✅ 고급 추론 시스템 초기화: 성공");
			console.log("  ✅ 복잡한 관계 네트워크 생성: 성공");
			console.log("  ✅ 고급 추론 실행: 성공");
			console.log(`    - 노드 수: ${nodeIds.length}개`);
			console.log(`    - 관계 수: 19개`);
			console.log(`    - 추론 결과: ${results.length}개`);
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "advanced_inference_system",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceBenchmarks(): Promise<void> {
		console.log("📋 4. 성능 벤치마크...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			const advancedSystem = new AdvancedInferenceSystem(db, {
				enablePerformanceMonitoring: true,
			});

			// 성능 벤치마크 실행
			const benchmarkResults = await advancedSystem.runPerformanceBenchmark({
				iterations: 5,
				includeWarmup: true,
			});

			this.results.performance = benchmarkResults;

			this.results.tests.push({
				name: "performance_benchmarks",
				success: true,
				message: "성능 벤치마크 성공",
				details: benchmarkResults,
			});

			console.log("  ✅ 성능 벤치마크 실행: 성공");
			console.log(
				`  📊 평균 실행 시간: ${benchmarkResults.averageTime.toFixed(2)}ms`,
			);
			console.log(
				`  📊 처리량: ${benchmarkResults.throughput.toFixed(2)} ops/sec`,
			);
			console.log(`  📊 최소 시간: ${benchmarkResults.minTime.toFixed(2)}ms`);
			console.log(`  📊 최대 시간: ${benchmarkResults.maxTime.toFixed(2)}ms`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance_benchmarks",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testBatchProcessing(): Promise<void> {
		console.log("📋 5. 배치 처리 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			const advancedSystem = new AdvancedInferenceSystem(db);

			// 대량 데이터 생성
			const batchSize = 100;
			const totalNodes = 500;

			const startTime = performance.now();

			// 배치로 노드 생성
			const nodeIds: number[] = [];
			for (let i = 0; i < totalNodes; i += batchSize) {
				const batch = [];
				for (let j = i; j < Math.min(i + batchSize, totalNodes); j++) {
					batch.push({
						identifier: `batch-test/src/Node${j}.ts#Class:Node${j}`,
						type: "class",
						name: `Node${j}`,
						sourceFile: `src/Node${j}.ts`,
						language: "typescript",
					});
				}

				const batchResults = await Promise.all(
					batch.map((nodeData) => db.upsertNode(nodeData)),
				);
				nodeIds.push(...batchResults);
			}

			// 배치로 관계 생성
			for (let i = 0; i < totalNodes - 1; i += batchSize) {
				const batch = [];
				for (let j = i; j < Math.min(i + batchSize, totalNodes - 1); j++) {
					batch.push(
						db.upsertRelationship({
							fromNodeId: nodeIds[j],
							toNodeId: nodeIds[j + 1],
							type: "depends_on",
							metadata: { dependencyType: "import" },
						}),
					);
				}
				await Promise.all(batch);
			}

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const throughput = (totalNodes / totalTime) * 1000;

			this.results.tests.push({
				name: "batch_processing",
				success: true,
				message: "배치 처리 성공",
				duration: totalTime,
				details: {
					totalNodes: totalNodes,
					batchSize: batchSize,
					totalTime: totalTime,
					throughput: throughput,
				},
			});

			console.log("  ✅ 배치 노드 생성: 성공");
			console.log("  ✅ 배치 관계 생성: 성공");
			console.log(`    - 총 노드 수: ${totalNodes}개`);
			console.log(`    - 배치 크기: ${batchSize}개`);
			console.log(`    - 총 실행 시간: ${totalTime.toFixed(2)}ms`);
			console.log(`    - 처리량: ${throughput.toFixed(0)} nodes/sec`);
		} catch (error: any) {
			this.results.tests.push({
				name: "batch_processing",
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
		console.log("📊 고급 추론 시스템 테스트 결과");
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
				`  - 평균 실행 시간: ${this.results.performance.averageTime?.toFixed(2)}ms`,
			);
			console.log(
				`  - 처리량: ${this.results.performance.throughput?.toFixed(2)} ops/sec`,
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
const testSuite = new AdvancedInferenceSystemTest();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
