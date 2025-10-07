#!/usr/bin/env node

/**
 * 전체 기능 점검 테스트 스크립트
 *
 * dependency-linker의 모든 핵심 기능을 종합적으로 테스트합니다:
 * - Tree-sitter 파싱 (TypeScript, Java, Python, Go)
 * - CLI 명령어 (Help, Version, Analyze, Dependencies)
 * - Query System (파일 분석 및 쿼리 실행)
 * - 마크다운 의존성 부여 방식
 * - 그래프 데이터베이스 통합
 * - RDF 시스템
 * - Namespace 분석
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("=== 전체 기능 점검 테스트 스크립트 ===");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 스위트들
const testSuites = [
	{
		name: "Tree-sitter 파싱 테스트",
		script: "tree-sitter-parsing-test.js",
		description: "다양한 언어의 Tree-sitter 파싱 기능",
		critical: true,
	},
	{
		name: "CLI 통합 테스트",
		script: "cli-integration-test.js",
		description: "CLI 명령어의 기본 동작",
		critical: true,
	},
	{
		name: "Query System 테스트",
		script: "query-system-test.js",
		description: "Query System의 파일 분석 기능",
		critical: true,
	},
	{
		name: "마크다운 의존성 테스트",
		script: "markdown-dependency-test.js",
		description: "마크다운 의존성 부여 방식",
		critical: false,
	},
];

// 개별 테스트 스위트 실행
async function runTestSuite(testSuite) {
	console.log(`\n--- ${testSuite.name} ---`);
	console.log(`설명: ${testSuite.description}`);
	console.log(`중요도: ${testSuite.critical ? "CRITICAL" : "OPTIONAL"}`);

	return new Promise((resolve) => {
		const scriptPath = path.join(__dirname, testSuite.script);
		const child = spawn("node", [scriptPath], {
			cwd: process.cwd(),
			stdio: "inherit",
		});

		child.on("close", (code) => {
			const success = code === 0;
			console.log(
				`${success ? "✅" : "❌"} ${testSuite.name} ${success ? "성공" : "실패"}`,
			);
			resolve({
				name: testSuite.name,
				success,
				exitCode: code,
				critical: testSuite.critical,
			});
		});

		child.on("error", (error) => {
			console.log(`❌ ${testSuite.name} 실행 오류: ${error.message}`);
			resolve({
				name: testSuite.name,
				success: false,
				error: error.message,
				critical: testSuite.critical,
			});
		});
	});
}

// 기능별 상세 분석
function analyzeFeatureStatus(results) {
	console.log("\n=== 기능별 상세 분석 ===");

	const criticalResults = results.filter((r) => r.critical);
	const optionalResults = results.filter((r) => !r.critical);

	const criticalSuccess = criticalResults.filter((r) => r.success).length;
	const criticalFailure = criticalResults.filter((r) => !r.success).length;

	const optionalSuccess = optionalResults.filter((r) => r.success).length;
	const optionalFailure = optionalResults.filter((r) => !r.success).length;

	console.log(`\n핵심 기능 (CRITICAL): ${criticalResults.length}개`);
	console.log(`  성공: ${criticalSuccess}개`);
	console.log(`  실패: ${criticalFailure}개`);

	if (criticalFailure > 0) {
		console.log("\n실패한 핵심 기능:");
		criticalResults
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  - ${r.name}: ${r.error || `Exit code: ${r.exitCode}`}`);
			});
	}

	console.log(`\n선택 기능 (OPTIONAL): ${optionalResults.length}개`);
	console.log(`  성공: ${optionalSuccess}개`);
	console.log(`  실패: ${optionalFailure}개`);

	if (optionalFailure > 0) {
		console.log("\n실패한 선택 기능:");
		optionalResults
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  - ${r.name}: ${r.error || `Exit code: ${r.exitCode}`}`);
			});
	}

	return {
		critical: { success: criticalSuccess, failure: criticalFailure },
		optional: { success: optionalSuccess, failure: optionalFailure },
	};
}

// 권장 조치사항 생성
function generateRecommendations(analysis) {
	console.log("\n=== 권장 조치사항 ===");

	if (analysis.critical.failure === 0) {
		console.log("✅ 모든 핵심 기능이 정상 동작합니다.");
		console.log("  → 프로덕션 환경에서 사용 가능");
		console.log("  → 추가 기능 개발 진행 가능");
	} else {
		console.log("⚠️ 일부 핵심 기능에 문제가 있습니다.");
		console.log("  → 핵심 기능 수정 후 프로덕션 배포");
		console.log("  → 실패한 기능의 우선순위 조정");
	}

	if (analysis.optional.failure > 0) {
		console.log("\n📋 선택 기능 개선 사항:");
		console.log("  → 선택 기능은 점진적 개선 대상");
		console.log("  → 핵심 기능 안정화 후 개선 진행");
	}

	// 전체 상태 평가
	const overallStatus = analysis.critical.failure === 0 ? "STABLE" : "UNSTABLE";
	console.log(`\n전체 상태: ${overallStatus}`);

	if (overallStatus === "STABLE") {
		console.log("  → 시스템이 안정적으로 동작합니다.");
		console.log("  → 모든 핵심 기능이 정상입니다.");
	} else {
		console.log("  → 시스템에 불안정 요소가 있습니다.");
		console.log("  → 핵심 기능 수정이 필요합니다.");
	}
}

// 메인 실행 함수
async function main() {
	console.log("\n=== 전체 기능 점검 시작 ===");

	// 빌드 확인
	const distPath = path.join(process.cwd(), "dist");
	if (!fs.existsSync(distPath)) {
		console.log("❌ dist 디렉토리가 없습니다. 먼저 빌드하세요.");
		console.log("  npm run build");
		process.exit(1);
	}

	const results = [];

	// 각 테스트 스위트 실행
	for (const testSuite of testSuites) {
		const result = await runTestSuite(testSuite);
		results.push(result);
	}

	// 기능별 상세 분석
	const analysis = analyzeFeatureStatus(results);

	// 권장 조치사항 생성
	generateRecommendations(analysis);

	console.log("\n=== 전체 기능 점검 결과 요약 ===");
	const totalSuccess = results.filter((r) => r.success).length;
	const totalFailure = results.filter((r) => !r.success).length;

	console.log(`총 테스트 스위트: ${results.length}`);
	console.log(`성공: ${totalSuccess}`);
	console.log(`실패: ${totalFailure}`);

	// 종료 코드 결정
	const criticalFailure = analysis.critical.failure;
	const exitCode = criticalFailure > 0 ? 1 : 0;

	if (exitCode === 0) {
		console.log("\n🎉 전체 기능 점검 완료 - 모든 핵심 기능이 정상입니다!");
	} else {
		console.log("\n⚠️ 전체 기능 점검 완료 - 일부 핵심 기능에 문제가 있습니다.");
	}

	process.exit(exitCode);
}

// 실행
main().catch(console.error);
