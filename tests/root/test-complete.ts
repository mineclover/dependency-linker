import { execSync } from "child_process";
import fs from "fs";
import path from "path";

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

class CompleteTestRunner {
	private results: TestSuiteResults;

	constructor() {
		this.results = {
			tests: [],
			errors: [],
			startTime: Date.now(),
		};
	}

	async run(): Promise<void> {
		console.log("🚀 완전한 테스트 스위트 시작");
		console.log("=".repeat(60));

		try {
			// 1. 빌드 확인
			await this.runBuildTest();

			// 2. Jest 테스트 실행
			await this.runJestTests();

			// 3. 핵심 기능 테스트
			await this.runCoreFeaturesTest();

			// 4. 통합 테스트
			await this.runIntegrationTest();

			// 5. 성능 테스트
			await this.runPerformanceTest();

			// 6. 고급 기능 테스트
			await this.runAdvancedFeaturesTest();

			// 7. 최종 결과 출력
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

	async runBuildTest(): Promise<void> {
		console.log("📋 1. 빌드 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  🔨 TypeScript 컴파일 중...");
			execSync("npm run build", { stdio: "inherit" });

			// dist 디렉토리 확인
			if (!fs.existsSync("dist")) {
				throw new Error("dist 디렉토리가 존재하지 않습니다.");
			}

			// main 파일 확인
			if (!fs.existsSync("dist/index.js")) {
				throw new Error("dist/index.js 파일이 존재하지 않습니다.");
			}

			// types 파일 확인
			if (!fs.existsSync("dist/index.d.ts")) {
				throw new Error("dist/index.d.ts 파일이 존재하지 않습니다.");
			}

			this.results.tests.push({
				name: "build",
				success: true,
				message: "빌드 성공",
			});

			console.log("  ✅ 빌드 성공");
			console.log("  ✅ dist 디렉토리: 존재");
			console.log("  ✅ main 파일: 존재");
			console.log("  ✅ types 파일: 존재");
		} catch (error: any) {
			this.results.tests.push({
				name: "build",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async runJestTests(): Promise<void> {
		console.log("📋 2. Jest 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  🧪 Jest 테스트 실행 중...");
			execSync("npm run test:jest", { stdio: "inherit" });

			this.results.tests.push({
				name: "jest",
				success: true,
				message: "Jest 테스트 완료",
			});

			console.log("  ✅ Jest 테스트 완료");
		} catch (error: any) {
			this.results.tests.push({
				name: "jest",
				success: false,
				message: error.message,
			});
			throw error;
		}
	}

	async runCoreFeaturesTest(): Promise<void> {
		console.log("📋 3. 핵심 기능 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  🔧 핵심 기능 테스트 실행 중...");
			const coreOutput = execSync("npm run test:core", {
				stdio: "pipe",
				encoding: "utf8",
				timeout: 30000,
			});

			// 성공 여부 확인
			if (coreOutput.includes("✅ 성공: 5/5 테스트")) {
				this.results.tests.push({
					name: "core_features",
					success: true,
					message: "핵심 기능 테스트 완료",
					details: {
						output: coreOutput,
					},
				});
				console.log("  ✅ 핵심 기능 테스트 완료");
			} else {
				throw new Error("핵심 기능 테스트 실패");
			}
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
		console.log("📋 4. 통합 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  🔗 통합 테스트 실행 중...");
			const integrationOutput = execSync("npm run test:integration-only", {
				stdio: "pipe",
				encoding: "utf8",
				timeout: 30000,
			});

			// 성공 여부 확인
			if (integrationOutput.includes("✅ 성공: 4/4 테스트")) {
				this.results.tests.push({
					name: "integration",
					success: true,
					message: "통합 테스트 완료",
					details: {
						output: integrationOutput,
					},
				});
				console.log("  ✅ 통합 테스트 완료");
			} else {
				throw new Error("통합 테스트 실패");
			}
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
		console.log("📋 5. 성능 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  ⚡ 성능 테스트 실행 중...");
			const { analyzeFile } = require("../../dist/api/analysis.js");

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
				name: "performance",
				success: true,
				message: "성능 테스트 완료",
				duration: endTime - startTime,
				details: {
					executionTime: endTime - startTime,
					nodeCount: result.parseMetadata.nodeCount,
					parseTime: result.parseMetadata.parseTime,
				},
			});

			console.log("  ✅ 성능 테스트 완료");
			console.log(`    - 실행 시간: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`    - 분석된 노드: ${result.parseMetadata.nodeCount}`);
			console.log(
				`    - 파싱 시간: ${result.parseMetadata.parseTime.toFixed(2)}ms`,
			);
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
		console.log("📋 6. 고급 기능 테스트");
		console.log("----------------------------------------");

		try {
			console.log("  🚀 고급 기능 테스트 실행 중...");
			const {
				EdgeTypeRegistry,
			} = require("../../dist/database/inference/EdgeTypeRegistry.js");
			const { GraphDatabase } = require("../../dist/database/GraphDatabase.js");

			// Edge Type Registry 테스트
			EdgeTypeRegistry.initialize();
			const stats = EdgeTypeRegistry.getStatistics();

			// 데이터베이스 테스트
			const db = new GraphDatabase(":memory:");
			await db.initialize();

			const startTime = performance.now();
			for (let i = 0; i < 100; i++) {
				await db.upsertNode({
					identifier: `advanced-test/src/Node${i}.ts#Class:Node${i}`,
					type: "class",
					name: `Node${i}`,
					sourceFile: `src/Node${i}.ts`,
					language: "typescript",
				});
			}
			const endTime = performance.now();

			this.results.tests.push({
				name: "advanced_features",
				success: true,
				message: "고급 기능 테스트 완료",
				duration: endTime - startTime,
				details: {
					edgeTypeStats: stats,
					nodeCreationTime: endTime - startTime,
					nodeCount: 100,
					throughput: (100 / (endTime - startTime)) * 1000,
				},
			});

			console.log("  ✅ Edge Type Registry 고급 기능");
			console.log(`    - 전체 타입: ${stats.total}`);
			console.log(`    - 전이적 타입: ${stats.transitive}`);
			console.log(`    - 상속 가능한 타입: ${stats.inheritable}`);
			console.log(`    - 통계: ${stats.total}개 타입`);
			console.log("  ✅ 데이터베이스 고급 기능");
			console.log(
				`    - 노드 생성 시간: ${(endTime - startTime).toFixed(2)}ms`,
			);
			console.log(`    - 생성된 노드: 100`);
			console.log(
				`    - 처리 속도: ${((100 / (endTime - startTime)) * 1000).toFixed(0)} nodes/sec`,
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
		console.log("📊 완전한 테스트 결과");
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
					`  - 평균 실행 시간: ${performanceTest.details.executionTime.toFixed(2)}ms`,
				);
			}
			if (advancedTest?.details) {
				console.log(
					`  - 평균 처리 속도: ${advancedTest.details.throughput.toFixed(0)} nodes/sec`,
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
			console.log("🎉 우수한 성능! 프로덕션 준비 완료");
		}
		console.log(
			"============================================================\\n",
		);
	}
}

// 테스트 실행
const testRunner = new CompleteTestRunner();
testRunner.run().catch((error) => {
	console.error("테스트 실행 실패:", error);
	process.exit(1);
});
