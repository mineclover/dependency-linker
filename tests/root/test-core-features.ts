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

class CoreFeaturesTestSuite {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			errors: [],
		};
	}

	async run(): Promise<void> {
		console.log("🚀 핵심 기능 테스트 시작\n");

		try {
			await this.testDatabaseOperations();
			await this.testEdgeTypeRegistry();
			await this.testInferenceEngine();
			await this.testFileAnalysis();
			await this.testPerformanceFeatures();

			this.printResults();
			console.log("\n✅ 모든 핵심 기능 테스트가 완료되었습니다.");
			process.exit(0);
		} catch (error: any) {
			console.error("❌ 핵심 기능 테스트 실패:", error.message);
			this.results.errors.push(error.message);
			this.printResults();
			process.exit(1);
		}
	}

	async testDatabaseOperations(): Promise<void> {
		console.log("📋 1. 데이터베이스 작업 테스트...");

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

			// 노드 조회 테스트
			const nodes = await db.findNodes({
				sourceFiles: ["src/TestClass.ts"],
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

			// 관계 조회 테스트
			const relationships = await db.findRelationships({
				fromNodeIds: [nodeId],
			});

			this.results.tests.push({
				name: "database_operations",
				success: true,
				message: "데이터베이스 작업 성공",
				details: {
					nodeCount: nodes.length,
					relationshipCount: relationships.length,
				},
			});

			console.log("  ✅ 노드 생성: 성공");
			console.log("  ✅ 노드 조회: 성공");
			console.log(`    - 조회된 노드 수: ${nodes.length}`);
			console.log("  ✅ 관계 생성: 성공");
			console.log("  ✅ 관계 조회: 성공");
			console.log(`    - 조회된 관계 수: ${relationships.length}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "database_operations",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testEdgeTypeRegistry(): Promise<void> {
		console.log("📋 2. Edge Type Registry 테스트...");

		try {
			// Edge Type Registry 초기화
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

			// 타입 조회 테스트
			const dependsOnType = EdgeTypeRegistry.get("depends_on");
			const transitiveTypes = EdgeTypeRegistry.getTransitiveTypes();
			const inheritableTypes = EdgeTypeRegistry.getInheritableTypes();
			const stats = EdgeTypeRegistry.getStatistics();

			this.results.tests.push({
				name: "edge_type_registry",
				success: true,
				message: "Edge Type Registry 성공",
				details: {
					totalTypes: stats.total,
					transitiveTypes: stats.transitive,
					inheritableTypes: stats.inheritable,
				},
			});

			console.log("  ✅ Edge Type Registry 초기화: 성공");
			console.log(`    - 등록된 타입 수: ${stats.total}`);
			console.log("  ✅ depends_on 타입 조회: 성공");
			console.log("  ✅ 전이적 타입 조회: 성공");
			console.log(`    - 전이적 타입 수: ${stats.transitive}`);
			console.log("  ✅ 상속 가능한 타입 조회: 성공");
			console.log(`    - 상속 가능한 타입 수: ${stats.inheritable}`);
			console.log("  ✅ 통계 조회: 성공");
			console.log(`    - 전체 타입 수: ${stats.total}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "edge_type_registry",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testInferenceEngine(): Promise<void> {
		console.log("📋 3. 추론 엔진 테스트...");

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

			// 추론 엔진 초기화
			const inferenceEngine = new InferenceEngine(db);

			// 전이적 추론 테스트
			const transitiveResults = await inferenceEngine.queryTransitive(
				nodeA,
				"depends_on",
				{ maxPathLength: 3 },
			);

			// 계층적 추론 테스트
			const hierarchicalResults = await inferenceEngine.queryHierarchical(
				"depends_on",
				{ includeChildren: true, maxDepth: 2 },
			);

			this.results.tests.push({
				name: "inference_engine",
				success: true,
				message: "추론 엔진 성공",
				details: {
					transitiveResults: transitiveResults.length,
					hierarchicalResults: hierarchicalResults.length,
				},
			});

			console.log("  ✅ 전이적 추론: 성공");
			console.log(`    - 추론된 관계 수: ${transitiveResults.length}`);
			console.log("  ✅ 계층적 추론: 성공");
			console.log(`    - 계층적 관계 수: ${hierarchicalResults.length}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "inference_engine",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testFileAnalysis(): Promise<void> {
		console.log("📋 4. 파일 분석 테스트...");

		try {
			const testCode = `
import { Component } from 'react';
import { useState } from 'react';

interface Props {
  title: string;
}

export class MyComponent extends Component<Props> {
  private state = useState<string>('');
  
  render() {
    return <div>{this.props.title}</div>;
  }
}
			`;

			const startTime = performance.now();
			const result = await analyzeFile(
				testCode,
				"typescript",
				"src/MyComponent.tsx",
			);
			const endTime = performance.now();

			this.results.tests.push({
				name: "file_analysis",
				success: true,
				message: "파일 분석 성공",
				details: {
					language: result.language,
					nodeCount: result.parseMetadata.nodeCount,
					executionTime: endTime - startTime,
					importSources: Object.keys(result.queryResults).length,
				},
			});

			console.log("  ✅ 파일 분석: 성공");
			console.log(`    - 분석된 언어: ${result.language}`);
			console.log(`    - 파싱된 노드 수: ${result.parseMetadata.nodeCount}`);
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(
				`    - Import 소스 수: ${Object.keys(result.queryResults).length}`,
			);
		} catch (error: any) {
			this.results.tests.push({
				name: "file_analysis",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async testPerformanceFeatures(): Promise<void> {
		console.log("📋 5. 성능 기능 테스트...");

		try {
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			// 최적화된 추론 엔진 테스트
			const optimizedEngine = new OptimizedInferenceEngine(db, {
				enableLRUCache: true,
				enableIncremental: true,
				enablePerformanceMonitoring: true,
				cacheSize: 100,
				cacheTTL: 30000,
			});

			const startTime = performance.now();
			const results = await optimizedEngine.queryHierarchical("depends_on", {
				includeChildren: true,
			});
			const endTime = performance.now();

			// LRU 캐시 통계
			const cacheStats = optimizedEngine.getLRUCacheStatistics();
			const performanceMetrics = optimizedEngine.getPerformanceMetrics();

			this.results.tests.push({
				name: "performance_features",
				success: true,
				message: "성능 기능 성공",
				details: {
					executionTime: endTime - startTime,
					resultCount: results.length,
					cacheSize: cacheStats.size,
					hitRate: cacheStats.hitRate,
					metricsCount: performanceMetrics.size,
				},
			});

			console.log("  ✅ 최적화된 추론 엔진: 성공");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`    - 추론 결과 수: ${results.length}`);
			console.log("  ✅ LRU 캐시: 성공");
			console.log(`    - 캐시 크기: ${cacheStats.size}`);
			console.log(`    - 히트율: ${cacheStats.hitRate}`);
			console.log("  ✅ 성능 메트릭: 성공");
			console.log(`    - 측정된 메트릭 수: ${performanceMetrics.size}`);
		} catch (error: any) {
			this.results.tests.push({
				name: "performance_features",
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
		console.log("📊 핵심 기능 테스트 결과");
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
const testSuite = new CoreFeaturesTestSuite();
testSuite.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
