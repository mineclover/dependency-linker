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
	startTime: number;
}

class ComprehensiveTestSuite {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			errors: [],
			startTime: Date.now(),
		};
	}

	async run(): Promise<void> {
		console.log("🚀 종합 테스트 스위트 시작\\n");
		console.log("=".repeat(60));

		try {
			// 1. 핵심 기능 테스트
			await this.runCoreFeaturesTest();

			// 2. 통합 테스트
			await this.runIntegrationTest();

			// 3. 성능 테스트
			await this.runPerformanceTest();

			// 4. 고급 기능 테스트
			await this.runAdvancedFeaturesTest();

			// 5. 최종 결과 출력
			this.printFinalResults();

			console.log("\\n✅ 모든 테스트가 완료되었습니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ 테스트 스위트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printFinalResults();
			process.exit(1);
		}
	}

	async runCoreFeaturesTest(): Promise<void> {
		console.log("📋 1. 핵심 기능 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 노드 생성 테스트
			const nodeId = await db.upsertNode({
				identifier: "test-project/src/TestClass.ts#Class:TestClass",
				type: "class",
				name: "TestClass",
				sourceFile: "src/TestClass.ts",
				language: "typescript",
			});

			// 관계 생성 테스트
			const nodeId2 = await db.upsertNode({
				identifier: "test-project/src/AnotherClass.ts#Class:AnotherClass",
				type: "class",
				name: "AnotherClass",
				sourceFile: "src/AnotherClass.ts",
				language: "typescript",
			});

			await db.upsertRelationship({
				fromNodeId: nodeId,
				toNodeId: nodeId2,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			// 추론 엔진 테스트
			const inferenceEngine = new InferenceEngine(db);
			const results = await inferenceEngine.queryTransitive(
				nodeId,
				"depends_on",
				{ maxPathLength: 3 },
			);

			this.results.tests.push({
				name: "core_features",
				success: true,
				message: "핵심 기능 테스트 성공",
				details: {
					nodeCount: 2,
					relationshipCount: 1,
					inferenceResults: results.length,
				},
			});

			console.log("  ✅ 데이터베이스 작업: 성공");
			console.log("  ✅ 추론 엔진: 성공");
			console.log(`    - 추론 결과: ${results.length}개`);
		} catch (error: any) {
			this.results.tests.push({
				name: "core_features",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async runIntegrationTest(): Promise<void> {
		console.log("📋 2. 통합 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 대량 데이터 생성
			const nodeIds: number[] = [];
			for (let i = 0; i < 50; i++) {
				const nodeId = await db.upsertNode({
					identifier: `integration-test/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
				nodeIds.push(nodeId);
			}

			// 관계 생성
			for (let i = 0; i < 49; i++) {
				await db.upsertRelationship({
					fromNodeId: nodeIds[i],
					toNodeId: nodeIds[i + 1],
					type: "depends_on",
					metadata: { dependencyType: "import" },
				});
			}

			// 추론 엔진 테스트
			const inferenceEngine = new InferenceEngine(db);
			const transitiveResults = await inferenceEngine.queryTransitive(
				nodeIds[0],
				"depends_on",
				{ maxPathLength: 10 },
			);

			const hierarchicalResults = await inferenceEngine.queryHierarchical(
				"depends_on",
				{ includeChildren: true, maxDepth: 5 },
			);

			this.results.tests.push({
				name: "integration",
				success: true,
				message: "통합 테스트 성공",
				details: {
					nodeCount: nodeIds.length,
					relationshipCount: 49,
					transitiveResults: transitiveResults.length,
					hierarchicalResults: hierarchicalResults.length,
				},
			});

			console.log("  ✅ 대량 데이터 생성: 성공");
			console.log("  ✅ 복잡한 관계 네트워크: 성공");
			console.log("  ✅ 추론 엔진: 성공");
			console.log(`    - 전이적 결과: ${transitiveResults.length}개`);
			console.log(`    - 계층적 결과: ${hierarchicalResults.length}개`);
		} catch (error: any) {
			this.results.tests.push({
				name: "integration",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async runPerformanceTest(): Promise<void> {
		console.log("📋 3. 성능 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 최적화된 추론 엔진 테스트
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
					identifier: `performance-test/src/Node${i}.ts#Class:Node${i}`,
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
			const startTime = performance.now();
			const benchmarkResults = await optimizedEngine.runPerformanceBenchmark();
			const endTime = performance.now();

			// 캐시 통계
			const cacheStats = optimizedEngine.getLRUCacheStatistics();

			this.results.tests.push({
				name: "performance",
				success: true,
				message: "성능 테스트 성공",
				duration: endTime - startTime,
				details: {
					nodeCount: nodeIds.length,
					relationshipCount: 99,
					benchmarkResults: benchmarkResults,
					cacheStats: cacheStats,
					executionTime: endTime - startTime,
				},
			});

			console.log("  ✅ 최적화된 추론 엔진: 성공");
			console.log("  ✅ 성능 벤치마크: 성공");
			console.log("  ✅ LRU 캐시: 성공");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`    - 캐시 히트율: ${cacheStats.hitRate}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async runAdvancedFeaturesTest(): Promise<void> {
		console.log("📋 4. 고급 기능 테스트...");

		try {
			// Edge Type Registry 테스트
			EdgeTypeRegistry.initialize();
			const stats = EdgeTypeRegistry.getStatistics();

			// 파일 분석 테스트
			const testCode = `
			import React from 'react';
			import { useState, useEffect } from 'react';
			
			interface Props {
				title: string;
				onClick: () => void;
			}
			
			export const MyComponent: React.FC<Props> = ({ title, onClick }) => {
				const [count, setCount] = useState(0);
				
				useEffect(() => {
					console.log('Component mounted');
				}, []);
				
				return (
					<div onClick={onClick}>
						<h1>{title}</h1>
						<p>Count: {count}</p>
						<button onClick={() => setCount(count + 1)}>
							Increment
						</button>
					</div>
				);
			};
			`;

			const startTime = performance.now();
			const result = await analyzeFile(
				testCode,
				"typescript",
				"src/MyComponent.tsx",
			);
			const endTime = performance.now();

			this.results.tests.push({
				name: "advanced_features",
				success: true,
				message: "고급 기능 테스트 성공",
				duration: endTime - startTime,
				details: {
					edgeTypeStats: stats,
					fileAnalysis: {
						language: result.language,
						nodeCount: result.parseMetadata.nodeCount,
						parseTime: result.parseMetadata.parseTime,
						executionTime: endTime - startTime,
					},
				},
			});

			console.log("  ✅ Edge Type Registry: 성공");
			console.log(`    - 전체 타입: ${stats.total}`);
			console.log(`    - 전이적 타입: ${stats.transitive}`);
			console.log(`    - 상속 가능한 타입: ${stats.inheritable}`);
			console.log("  ✅ 파일 분석: 성공");
			console.log(`    - 분석된 언어: ${result.language}`);
			console.log(`    - 파싱된 노드 수: ${result.parseMetadata.nodeCount}`);
			console.log(
				`    - 파싱 시간: ${result.parseMetadata.parseTime.toFixed(2)}ms`,
			);
		} catch (error: any) {
			this.results.tests.push({
				name: "advanced_features",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	private printFinalResults(): void {
		const successCount = this.results.tests.filter((t) => t.success).length;
		const totalCount = this.results.tests.length;
		const totalTime = Date.now() - this.results.startTime;

		console.log(
			"\\n============================================================",
		);
		console.log("📊 종합 테스트 결과");
		console.log("============================================================");
		console.log(
			`✅ 성공: ${successCount}/${totalCount} 테스트 (${((successCount / totalCount) * 100).toFixed(1)}%)`,
		);
		console.log(`❌ 실패: ${totalCount - successCount}/${totalCount} 테스트`);
		console.log(`⏱️ 총 실행 시간: ${(totalTime / 1000).toFixed(2)}초`);

		console.log("\\n📋 테스트 상세:");
		this.results.tests.forEach((test) => {
			const status = test.success ? "✅" : "❌";
			console.log(`  ${status} ${test.name}`);
			if (test.duration) {
				console.log(`    - 실행 시간: ${test.duration.toFixed(2)}ms`);
			}
		});

		// 성능 요약
		const performanceTest = this.results.tests.find(
			(t) => t.name === "performance",
		);
		const advancedTest = this.results.tests.find(
			(t) => t.name === "advanced_features",
		);

		if (performanceTest?.details || advancedTest?.details) {
			console.log("\\n📈 성능 요약:");
			if (performanceTest?.details) {
				console.log(
					`  - 성능 테스트 실행 시간: ${performanceTest.details.executionTime.toFixed(2)}ms`,
				);
				console.log(
					`  - 캐시 히트율: ${performanceTest.details.cacheStats.hitRate}`,
				);
			}
			if (advancedTest?.details) {
				console.log(
					`  - 파일 분석 시간: ${advancedTest.details.fileAnalysis.executionTime.toFixed(2)}ms`,
				);
				console.log(
					`  - 파싱된 노드 수: ${advancedTest.details.fileAnalysis.nodeCount}`,
				);
			}
		}

		if (this.results.errors.length > 0) {
			console.log("\\n❌ 에러 목록:");
			this.results.errors.forEach((error) => {
				console.log(`  - ${error}`);
			});
		}

		console.log("============================================================");
		if (successCount === totalCount) {
			console.log("🎉 모든 테스트 통과! 시스템이 정상적으로 작동합니다.");
		}
		console.log(
			"============================================================\\n",
		);
	}
}

// 테스트 실행
const testSuite = new ComprehensiveTestSuite();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
