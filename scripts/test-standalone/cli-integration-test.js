#!/usr/bin/env node

/**
 * CLI 통합 테스트 스크립트
 * Jest 환경과 분리하여 독립적으로 실행
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("=== CLI 통합 테스트 스크립트 ===");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 케이스들
const testCases = [
	{
		name: "CLI - Help Command",
		command: ["node", "dist/cli/main.js", "--help"],
		expectedOutput: "Commands:",
		timeout: 5000,
	},
	{
		name: "CLI - Version Command",
		command: ["node", "dist/cli/main.js", "--version"],
		expectedOutput: "2.1.0",
		timeout: 5000,
	},
	{
		name: "CLI - Analyze Command (Basic)",
		command: ["node", "dist/cli/main.js", "analyze", "--help"],
		expectedOutput: "analyze",
		timeout: 5000,
	},
	{
		name: "CLI - Dependencies Command (Basic)",
		command: ["node", "dist/cli/main.js", "dependencies", "--help"],
		expectedOutput: "dependencies",
		timeout: 5000,
	},
];

// CLI 명령어 실행 함수
async function runCLITest(testCase) {
	console.log(`\n--- ${testCase.name} ---`);

	return new Promise((resolve) => {
		const child = spawn(testCase.command[0], testCase.command.slice(1), {
			cwd: process.cwd(),
			stdio: "pipe",
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		const timeout = setTimeout(() => {
			child.kill();
			resolve({
				success: false,
				error: "Timeout",
				stdout,
				stderr,
			});
		}, testCase.timeout);

		child.on("close", (code) => {
			clearTimeout(timeout);

			const output = stdout + stderr;
			const hasExpectedOutput = output.includes(testCase.expectedOutput);

			console.log("✅ CLI 명령어 실행 완료");
			console.log("  exit code:", code);
			console.log("  expected output found:", hasExpectedOutput);
			console.log("  output length:", output.length);

			if (output.length > 0) {
				console.log("  output preview:", output.slice(0, 200) + "...");
			}

			resolve({
				success: code === 0 && hasExpectedOutput,
				error: code !== 0 ? `Exit code: ${code}` : null,
				stdout,
				stderr,
			});
		});

		child.on("error", (error) => {
			clearTimeout(timeout);
			resolve({
				success: false,
				error: error.message,
				stdout,
				stderr,
			});
		});
	});
}

// 메인 실행 함수
async function main() {
	console.log("\n=== CLI 테스트 시작 ===");

	// 빌드 확인
	const distPath = path.join(process.cwd(), "dist");
	if (!fs.existsSync(distPath)) {
		console.log("❌ dist 디렉토리가 없습니다. 먼저 빌드하세요.");
		process.exit(1);
	}

	const results = [];

	for (const testCase of testCases) {
		const result = await runCLITest(testCase);
		results.push({
			name: testCase.name,
			...result,
		});
	}

	console.log("\n=== CLI 테스트 결과 요약 ===");
	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.filter((r) => !r.success).length;

	console.log(`총 테스트: ${results.length}`);
	console.log(`성공: ${successCount}`);
	console.log(`실패: ${failureCount}`);

	if (failureCount > 0) {
		console.log("\n실패한 테스트:");
		results
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  - ${r.name}: ${r.error}`);
			});
	}

	process.exit(failureCount > 0 ? 1 : 0);
}

// 실행
main().catch(console.error);
