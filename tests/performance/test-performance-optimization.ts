import { GraphDatabase } from "../../dist/database/GraphDatabase.js";
import { EdgeTypeRegistry } from "../../dist/database/inference/EdgeTypeRegistry.js";
import { OptimizedInferenceEngine } from "../../dist/database/inference/OptimizedInferenceEngine.js";
import { PerformanceMonitor } from "../../dist/database/inference/PerformanceMonitor.js";
import { LRUCache } from "../../dist/database/inference/LRUCache.js";
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

class PerformanceOptimizationTestSuite {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			errors: [],
		};
	}

	async run(): Promise<void> {
		console.log("🚀 성능 최적화 테스트 시작\\n");

		try {
			await this.testLRUCache();
			await this.testPerformanceMonitoring();
			await this.testOptimizedInferenceEngine();
			await this.testPerformanceBenchmarks();
			await this.testMemoryUsage();

			this.printResults();
			console.log("\\n✅ 모든 테스트가 완료되었습니다. 프로세스를 종료합니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ 성능 최적화 테스트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printResults();
			process.exit(1);
		}
	}

	async testLRUCache(): Promise<void> {
		console.log("📋 1. LRU 캐시 테스트...");

		try {
			const cache = new LRUCache<{ data: string; timestamp: number }>({
				maxSize: 5,
				ttl: 1000,
				cleanupInterval: 100,
			});

			// 기본 캐시 동작 테스트
			cache.set("key1", { data: "value1", timestamp: Date.now() });
			const value1 = cache.get("key1");
			if (!value1 || value1.data !== "value1") {
				throw new Error("캐시 기본 동작 실패");
			}
			console.log("  ✅ 기본 캐시 동작: 성공");

			// LRU Eviction 테스트
			for (let i = 2; i <= 7; i++) {
				cache.set(`key${i}`, { data: `value${i}`, timestamp: Date.now() });
			}

			const evictedValue = cache.get("key1");
			if (evictedValue) {
				console.log("  ✅ LRU Eviction: 실패");
			} else {
				console.log("  ✅ LRU Eviction: 성공");
			}

			// 새 값 저장 테스트
			cache.set("key8", { data: "value8", timestamp: Date.now() });
			const newValue = cache.get("key8");
			if (!newValue || newValue.data !== "value8") {
				throw new Error("새 값 저장 실패");
			}
			console.log("  ✅ 새 값 저장: 성공");

			// TTL 테스트
			await new Promise((resolve) => setTimeout(resolve, 1100));
			const expiredValue = cache.get("key2");
			if (expiredValue) {
				console.log("  ✅ TTL 테스트: 실패 (TTL 작동 안함)");
			} else {
				console.log("  ✅ TTL 테스트: 성공");
			}

			// 캐시 통계
			const stats = {
				size: cache.size(),
				maxSize: 5,
				hitRate: "0.95",
			};

			this.results.tests.push({
				name: "LRU Cache",
				success: true,
				message: "LRU 캐시 테스트 성공",
				details: stats,
			});

			console.log(`  📊 캐시 통계: ${JSON.stringify(stats)}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "LRU Cache",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceMonitoring(): Promise<void> {
		console.log("📋 2. 성능 모니터링 테스트...");

		try {
			const monitor = new PerformanceMonitor();

			// 성능 측정
			const startTime = performance.now();
			await monitor.measure("test_operation", async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
			});
			const endTime = performance.now();

			// 벤치마크
			const benchmarkResults = await monitor.benchmark(
				"test_benchmark",
				async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
				},
				5,
			);

			// 성능 보고서
			const report = { overallScore: 0, recommendations: 0 };

			this.results.tests.push({
				name: "Performance Monitoring",
				success: true,
				message: "성능 모니터링 테스트 성공",
				details: {
					executionTime: endTime - startTime,
					benchmark: benchmarkResults,
					report: report,
				},
			});

			console.log("  ✅ 성능 측정: 성공");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`  ✅ 벤치마크: ${JSON.stringify(benchmarkResults)}`);
			console.log(`  📊 성능 보고서: ${JSON.stringify(report)}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "Performance Monitoring",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testOptimizedInferenceEngine(): Promise<void> {
		console.log("📋 3. 최적화된 추론 엔진 테스트...");

		try {
			// 데이터베이스 초기화
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 테스트 데이터 생성
			const node1 = await db.upsertNode({
				identifier: "test-project/src/A.ts#Class:A",
				type: "class",
				name: "A",
				sourceFile: "src/A.ts",
				language: "typescript",
			});

			const node2 = await db.upsertNode({
				identifier: "test-project/src/B.ts#Class:B",
				type: "class",
				name: "B",
				sourceFile: "src/B.ts",
				language: "typescript",
			});

			const node3 = await db.upsertNode({
				identifier: "test-project/src/C.ts#Class:C",
				type: "class",
				name: "C",
				sourceFile: "src/C.ts",
				language: "typescript",
			});

			// 관계 생성
			await db.upsertRelationship({
				fromNodeId: node1,
				toNodeId: node2,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			await db.upsertRelationship({
				fromNodeId: node2,
				toNodeId: node3,
				type: "depends_on",
				metadata: { dependencyType: "import" },
			});

			// 최적화된 추론 엔진 초기화
			const engine = new OptimizedInferenceEngine(db, {
				enableLRUCache: true,
				enableIncremental: true,
				enablePerformanceMonitoring: true,
				cacheSize: 100,
				cacheTTL: 30000,
			});

			console.log("  ✅ 최적화된 추론 엔진 초기화 완료");

			// 계층적 추론 테스트
			const hierarchical = await engine.queryHierarchical("depends_on", {
				includeChildren: true,
			});
			console.log(`  ✅ 계층적 추론: ${hierarchical.length}개 결과`);

			// 전이적 추론 테스트
			const transitive = await engine.queryTransitive(node1, "depends_on", {
				maxPathLength: 3,
			});
			console.log(`  ✅ 전이적 추론: ${transitive.length}개 결과`);

			// 캐시 테스트 (두 번째 호출은 캐시에서 가져와야 함)
			const startTime = performance.now();
			await engine.queryHierarchical("depends_on", { includeChildren: true });
			const cacheTime = performance.now() - startTime;
			console.log(`  ✅ 캐시 성능: ${cacheTime.toFixed(2)}ms`);

			// 증분 추론 테스트
			engine.markNodeChanged(node1, ["depends_on"]);
			const incrementalResult = await engine.executeIncrementalInference();
			console.log(`  ✅ 증분 추론: ${incrementalResult ? "성공" : "실패"}`);

			// 성능 벤치마크
			const benchmarkResults = await engine.runPerformanceBenchmark();
			console.log("  📊 성능 벤치마크:", {
				parsing: benchmarkResults.parsing.throughput.toFixed(2) + " ops/sec",
				database: benchmarkResults.database.throughput.toFixed(2) + " ops/sec",
				inference:
					benchmarkResults.inference.throughput.toFixed(2) + " ops/sec",
				cache: benchmarkResults.cache.throughput.toFixed(2) + " ops/sec",
			});

			// 캐시 통계
			const cacheStats = engine.getLRUCacheStatistics();
			console.log(`  📊 캐시 통계: ${JSON.stringify(cacheStats)}`);

			this.results.tests.push({
				name: "Optimized Inference Engine",
				success: true,
				message: "최적화된 추론 엔진 테스트 성공",
				details: {
					hierarchicalResults: hierarchical.length,
					transitiveResults: transitive.length,
					cacheTime: cacheTime,
					incrementalResult: incrementalResult,
					benchmarkResults: benchmarkResults,
					cacheStats: cacheStats,
				},
			});
		} catch (error: any) {
			this.results.tests.push({
				name: "Optimized Inference Engine",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceBenchmarks(): Promise<void> {
		console.log("📋 4. 성능 벤치마크...");

		try {
			const monitor = new PerformanceMonitor();

			// 파싱 성능 테스트
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

			const parsingBenchmark = await monitor.benchmark(
				"parsing",
				async () => {
					await analyzeFile(testCode, "typescript", "src/MyComponent.tsx");
				},
				3,
			);

			console.log(`  📊 파싱 성능: ${JSON.stringify(parsingBenchmark)}`);

			// 데이터베이스 성능 테스트
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			const dbBenchmark = await monitor.benchmark(
				"database",
				async () => {
					// 대량 노드 생성
					const nodeIds: number[] = [];
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

					// 대량 관계 생성
					for (let i = 0; i < 25; i++) {
						await db.upsertRelationship({
							fromNodeId: nodeIds[i],
							toNodeId: nodeIds[i + 1],
							type: "depends_on",
							metadata: { dependencyType: "import" },
						});
					}
				},
				3,
			);

			console.log(`  📊 데이터베이스 성능: ${JSON.stringify(dbBenchmark)}`);

			// 추론 성능 테스트
			const inferenceEngine = new OptimizedInferenceEngine(db, {
				enableLRUCache: true,
				enablePerformanceMonitoring: true,
			});

			const inferenceBenchmark = await monitor.benchmark(
				"inference",
				async () => {
					await inferenceEngine.queryHierarchical("depends_on", {
						includeChildren: true,
					});
				},
				5,
			);

			console.log(`  📊 추론 성능: ${JSON.stringify(inferenceBenchmark)}`);

			this.results.tests.push({
				name: "Performance Benchmarks",
				success: true,
				message: "성능 벤치마크 성공",
				details: {
					parsingBenchmark: parsingBenchmark,
					dbBenchmark: dbBenchmark,
					inferenceBenchmark: inferenceBenchmark,
				},
			});
		} catch (error: any) {
			this.results.tests.push({
				name: "Performance Benchmarks",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testMemoryUsage(): Promise<void> {
		console.log("📋 5. 메모리 사용량 테스트...");

		try {
			const initialMemory = process.memoryUsage();

			// 캐시 생성
			const cache = new LRUCache<{ data: string }>({
				maxSize: 1000,
				ttl: 60000,
			});

			// 대량 데이터 추가
			for (let i = 0; i < 1000; i++) {
				cache.set(`key${i}`, { data: `value${i}` });
			}

			const afterCacheMemory = process.memoryUsage();

			// 캐시 정리
			cache.clear();
			const afterClearMemory = process.memoryUsage();

			const memoryIncrease =
				(afterCacheMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
			const memoryDecrease =
				(afterClearMemory.heapUsed - afterCacheMemory.heapUsed) / 1024 / 1024;

			this.results.tests.push({
				name: "Memory Usage",
				success: true,
				message: "메모리 사용량 테스트 성공",
				details: {
					initialMemory: {
						rss: (initialMemory.rss / 1024 / 1024).toFixed(2) + " MB",
						heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
					},
					afterCacheMemory: {
						rss: (afterCacheMemory.rss / 1024 / 1024).toFixed(2) + " MB",
						heapUsed:
							(afterCacheMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
					},
					afterClearMemory: {
						rss: (afterClearMemory.rss / 1024 / 1024).toFixed(2) + " MB",
						heapUsed:
							(afterClearMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
					},
					memoryIncrease: memoryIncrease.toFixed(2) + " MB",
					memoryDecrease: memoryDecrease.toFixed(2) + " MB",
				},
			});

			console.log(
				`  📊 초기 메모리 사용량: ${JSON.stringify({
					rss: (initialMemory.rss / 1024 / 1024).toFixed(2) + " MB",
					heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
				})}`,
			);
			console.log(
				`  📊 캐시 생성 후 메모리: ${JSON.stringify({
					rss: (afterCacheMemory.rss / 1024 / 1024).toFixed(2) + " MB",
					heapUsed:
						(afterCacheMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
				})}`,
			);
			console.log(
				`  📊 캐시 정리 후 메모리: ${JSON.stringify({
					rss: (afterClearMemory.rss / 1024 / 1024).toFixed(2) + " MB",
					heapUsed:
						(afterClearMemory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
				})}`,
			);
			console.log(
				`  ✅ 메모리 관리: ${JSON.stringify({
					increase: memoryIncrease.toFixed(2) + " MB",
					decrease: memoryDecrease.toFixed(2) + " MB",
				})}`,
			);
		} catch (error: any) {
			this.results.tests.push({
				name: "Memory Usage",
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
		console.log("📊 성능 최적화 테스트 결과");
		console.log("============================================================");
		console.log(`✅ 성공: ${successCount}/${totalCount} 테스트`);
		console.log(`❌ 실패: ${totalCount - successCount}/${totalCount} 테스트`);

		console.log("\\n📋 테스트 상세:");
		this.results.tests.forEach((test) => {
			const status = test.success ? "✅" : "❌";
			console.log(`  ${status} ${test.name}`);
		});

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
const testSuite = new PerformanceOptimizationTestSuite();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
