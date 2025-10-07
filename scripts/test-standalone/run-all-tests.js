#!/usr/bin/env node

/**
 * 통합 테스트 실행 스크립트
 * 모든 독립 테스트를 순차적으로 실행
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("=== 통합 테스트 실행 스크립트 ===");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 스크립트들
const testScripts = [
	{
		name: "Tree-sitter 파싱 테스트",
		script: "tree-sitter-parsing-test.js",
		description: "Tree-sitter 파서의 각 언어별 파싱 테스트",
		critical: true,
	},
	{
		name: "CLI 통합 테스트",
		script: "cli-integration-test.js",
		description: "CLI 명령어들의 기본 동작 테스트",
		critical: true,
	},
	{
		name: "Query System 테스트",
		script: "query-system-test.js",
		description: "Query System의 파일 분석 기능 테스트",
		critical: true,
	},
	{
		name: "마크다운 의존성 테스트",
		script: "markdown-dependency-test.js",
		description: "마크다운 의존성 부여 방식 테스트",
		critical: false,
	},
];

// 개별 테스트 실행 함수
async function runTestScript(testScript) {
	console.log(`\n--- ${testScript.name} ---`);
	console.log(`설명: ${testScript.description}`);

	return new Promise((resolve) => {
		const scriptPath = path.join(__dirname, testScript.script);
		const child = spawn("node", [scriptPath], {
			cwd: process.cwd(),
			stdio: "inherit",
		});

		child.on("close", (code) => {
			const success = code === 0;
			console.log(
				`${success ? "✅" : "❌"} ${testScript.name} ${success ? "성공" : "실패"}`,
			);
			resolve({
				name: testScript.name,
				success,
				exitCode: code,
			});
		});

		child.on("error", (error) => {
			console.log(`❌ ${testScript.name} 실행 오류: ${error.message}`);
			resolve({
				name: testScript.name,
				success: false,
				error: error.message,
			});
		});
	});
}

// 메인 실행 함수
async function main() {
	console.log("\n=== 모든 독립 테스트 실행 시작 ===");

	const results = [];

	for (const testScript of testScripts) {
		const result = await runTestScript(testScript);
		results.push(result);
	}

	console.log("\n=== 전체 테스트 결과 요약 ===");
	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.filter((r) => !r.success).length;

	console.log(`총 테스트 스크립트: ${results.length}`);
	console.log(`성공: ${successCount}`);
	console.log(`실패: ${failureCount}`);

	if (failureCount > 0) {
		console.log("\n실패한 테스트 스크립트:");
		results
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  - ${r.name}: ${r.error || `Exit code: ${r.exitCode}`}`);
			});
	}

	console.log("\n=== 테스트 완료 ===");
	process.exit(failureCount > 0 ? 1 : 0);
}

// 실행
main().catch(console.error);
