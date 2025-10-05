/**
 * 마크다운 분석 CLI 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

describe("마크다운 분석 CLI 테스트", () => {
	const testDir = path.join(__dirname, "../test-markdown");
	const testFiles = [
		"test-basic.md",
		"test-complex.md",
		"test-tags.md",
		"test-links.md",
		"test-headings.md",
	];

	beforeAll(async () => {
		// 테스트 디렉토리 생성
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}

		// 테스트 파일들 생성
		await createTestFiles();
	});

	afterAll(async () => {
		// 테스트 디렉토리 정리
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	async function createTestFiles() {
		// 기본 마크다운 파일
		const basicMarkdown = `# 기본 문서 #기능
## 섹션 1 #예시
일반 텍스트입니다.

[링크](other-file.md) #가이드라인
**굵은 텍스트**와 *기울임 텍스트*입니다.`;

		// 복잡한 마크다운 파일
		const complexMarkdown = `# 복잡한 문서 #기능
## 개요 #define
이 문서는 복잡한 구조를 가지고 있습니다.

## 설치 방법 #가이드라인
### 요구사항 #요구사항
- Node.js 16+
- npm 8+

### 설치 단계 #예시
\`\`\`bash
npm install
npm run build
\`\`\`

## 사용법 #예시
[API 문서](api.md) #가이드라인
[사용자 가이드](user-guide.md) #가이드라인

## 테스트 #테스트
[단위 테스트](tests/unit.md) #테스트
[통합 테스트](tests/integration.md) #테스트`;

		// 태그가 많은 마크다운 파일
		const tagsMarkdown = `# 태그 테스트 문서 #기능
## 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 사용자 시나리오 #시나리오
## 개선 사항 #개선
## TODO #todo
## 테스트 케이스 #테스트
## 에러 유형 #에러`;

		// 링크가 많은 마크다운 파일
		const linksMarkdown = `# 링크 테스트 문서 #기능
## 내부 링크 #가이드라인
[파일 1](./file1.md) #가이드라인
[파일 2](../file2.md) #가이드라인
[파일 3](../../file3.md) #가이드라인

## 외부 링크 #가이드라인
[외부 사이트](https://example.com) #가이드라인
[GitHub](https://github.com/user/repo) #가이드라인
[이메일](mailto:contact@example.com) #가이드라인

## 앵커 링크 #가이드라인
[섹션으로 이동](#섹션-1) #가이드라인
[하위 섹션으로 이동](#하위-섹션-1-1) #가이드라인`;

		// 헤딩이 많은 마크다운 파일
		const headingsMarkdown = `# 메인 제목 #기능
## 섹션 1 #예시
### 하위 섹션 1.1 #테스트
#### 세부 항목 1.1.1 #요구사항
##### 세부 항목 1.1.1.1 #개선
###### 세부 항목 1.1.1.1.1 #todo

## 섹션 2 #가이드라인
### 하위 섹션 2.1 #예시
#### 세부 항목 2.1.1 #테스트
##### 세부 항목 2.1.1.1 #요구사항

## 섹션 3 #기능
### 하위 섹션 3.1 #예시
#### 세부 항목 3.1.1 #테스트`;

		// 파일들 생성
		fs.writeFileSync(path.join(testDir, "test-basic.md"), basicMarkdown);
		fs.writeFileSync(path.join(testDir, "test-complex.md"), complexMarkdown);
		fs.writeFileSync(path.join(testDir, "test-tags.md"), tagsMarkdown);
		fs.writeFileSync(path.join(testDir, "test-links.md"), linksMarkdown);
		fs.writeFileSync(path.join(testDir, "test-headings.md"), headingsMarkdown);
	}

	describe("기본 CLI 명령어 테스트", () => {
		it("마크다운 파일 분석", async () => {
			const result = await runCLICommand([
				"analyze",
				"--pattern",
				`${testDir}/*.md`,
				"--output",
				path.join(testDir, "analysis-result.json"),
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Analysis completed");
		});

		it("특정 마크다운 파일 분석", async () => {
			const result = await runCLICommand([
				"analyze",
				"--file",
				path.join(testDir, "test-basic.md"),
				"--output",
				path.join(testDir, "single-file-analysis.json"),
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Analysis completed");
		});

		it("성능 모니터링과 함께 분석", async () => {
			const result = await runCLICommand([
				"analyze",
				"--pattern",
				`${testDir}/*.md`,
				"--performance",
				"--output",
				path.join(testDir, "performance-analysis.json"),
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Performance monitoring enabled");
		});
	});

	describe("태그 분석 CLI 명령어 테스트", () => {
		it("태그 수집", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--collect-tags",
				"--pattern",
				`${testDir}/*.md`,
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag collection completed");
		});

		it("태그-헤딩 매핑", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--map-tag-headings",
				"--pattern",
				`${testDir}/*.md`,
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag-heading mapping completed");
		});

		it("태그 문서 생성", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--generate-tag-docs",
				"--pattern",
				`${testDir}/*.md`,
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag documentation generated");
		});
	});

	describe("태그 유형 검증 CLI 명령어 테스트", () => {
		it("태그 유형 검증", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--validate-tag-types",
				"--pattern",
				`${testDir}/*.md`,
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag type validation completed");
		});

		it("태그 유형 문서 생성", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--generate-tag-type-docs",
				"--pattern",
				`${testDir}/*.md`,
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag type documentation generated");
		});
	});

	describe("명세서 기반 CLI 명령어 테스트", () => {
		it("태그 유형 로드", async () => {
			const result = await runCLICommand(["spec", "--load-tag-types"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Tag types loaded successfully");
		});

		it("코드 파싱 대상 로드", async () => {
			const result = await runCLICommand(["spec", "--load-code-targets"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain(
				"Code parsing targets loaded successfully",
			);
		});

		it("마크다운 파싱 대상 로드", async () => {
			const result = await runCLICommand(["spec", "--load-markdown-targets"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain(
				"Markdown parsing targets loaded successfully",
			);
		});

		it("명세서 검증", async () => {
			const result = await runCLICommand(["spec", "--validate-spec"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Specification format is valid");
		});

		it("명세서 생성", async () => {
			const result = await runCLICommand(["spec", "--generate-spec"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Specification generated successfully");
		});
	});

	describe("namespace 최적화 CLI 명령어 테스트", () => {
		it("namespace 최적화", async () => {
			const result = await runCLICommand([
				"spec",
				"--optimize",
				"--name",
				"docs",
			]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Namespace optimization completed");
		});

		it("모든 namespace 최적화", async () => {
			const result = await runCLICommand(["spec", "--optimize-all"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("All namespaces optimization completed");
		});

		it("성능 통계 조회", async () => {
			const result = await runCLICommand(["spec", "--performance-stats"]);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Performance statistics gathered");
		});
	});

	describe("결과 파일 검증", () => {
		it("분석 결과 파일 생성 확인", async () => {
			// 분석 실행
			await runCLICommand([
				"analyze",
				"--pattern",
				`${testDir}/*.md`,
				"--output",
				path.join(testDir, "test-analysis.json"),
			]);

			// 결과 파일 확인
			const resultFile = path.join(testDir, "test-analysis.json");
			expect(fs.existsSync(resultFile)).toBe(true);

			// 결과 파일 내용 확인
			const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
			expect(result).toBeDefined();
			expect(result.files).toBeDefined();
			expect(result.statistics).toBeDefined();
		});

		it("태그 문서 생성 확인", async () => {
			// 태그 문서 생성
			await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--generate-tag-docs",
				"--pattern",
				`${testDir}/*.md`,
			]);

			// 태그 문서 파일 확인
			const tagDocFile = path.join(testDir, "tag-convention-document.md");
			if (fs.existsSync(tagDocFile)) {
				const content = fs.readFileSync(tagDocFile, "utf-8");
				expect(content).toContain("# Tag Convention Document");
			}
		});

		it("태그 유형 문서 생성 확인", async () => {
			// 태그 유형 문서 생성
			await runCLICommand([
				"namespace",
				"--name",
				"docs",
				"--generate-tag-type-docs",
				"--pattern",
				`${testDir}/*.md`,
			]);

			// 태그 유형 문서 파일 확인
			const tagTypeDocFile = path.join(testDir, "tag-type-documentation.md");
			if (fs.existsSync(tagTypeDocFile)) {
				const content = fs.readFileSync(tagTypeDocFile, "utf-8");
				expect(content).toContain("# Tag Type Documentation");
			}
		});
	});

	describe("에러 처리 테스트", () => {
		it("존재하지 않는 파일 분석", async () => {
			const result = await runCLICommand([
				"analyze",
				"--file",
				path.join(testDir, "non-existent.md"),
			]);

			expect(result.success).toBe(false);
			expect(result.error).toContain("File not found");
		});

		it("잘못된 패턴 분석", async () => {
			const result = await runCLICommand([
				"analyze",
				"--pattern",
				"invalid-pattern",
			]);

			expect(result.success).toBe(false);
			expect(result.error).toContain("No files found");
		});

		it("잘못된 namespace 이름", async () => {
			const result = await runCLICommand([
				"namespace",
				"--name",
				"invalid-namespace",
				"--collect-tags",
			]);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Namespace not found");
		});
	});

	// CLI 명령어 실행 헬퍼 함수
	async function runCLICommand(
		args: string[],
	): Promise<{ success: boolean; output: string; error: string }> {
		return new Promise((resolve) => {
			const child = spawn("node", ["dist/cli/main.js", ...args], {
				cwd: path.join(__dirname, ".."),
				stdio: ["pipe", "pipe", "pipe"],
			});

			let output = "";
			let error = "";

			child.stdout.on("data", (data) => {
				output += data.toString();
			});

			child.stderr.on("data", (data) => {
				error += data.toString();
			});

			child.on("close", (code) => {
				resolve({
					success: code === 0,
					output,
					error,
				});
			});

			child.on("error", (err) => {
				resolve({
					success: false,
					output,
					error: err.message,
				});
			});
		});
	}
});
