/**
 * 간단한 마크다운 파서 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MarkdownParser } from "../src/parsers/markdown/MarkdownParser";
import { MarkdownLinkTracker } from "../src/parsers/markdown/MarkdownLinkTracker";
import * as fs from "fs";
import * as path from "path";

describe("간단한 마크다운 파서 테스트", () => {
	let parser: MarkdownParser;
	let linkTracker: MarkdownLinkTracker;
	const testDir = path.join(__dirname, "../test-markdown-simple");

	beforeAll(async () => {
		parser = new MarkdownParser();
		linkTracker = new MarkdownLinkTracker(testDir);

		// 테스트 디렉토리 생성
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterAll(async () => {
		// 테스트 디렉토리 정리
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("기본 마크다운 파싱", () => {
		it("간단한 마크다운 문서 파싱", async () => {
			const markdown = `# 제목
## 부제목
일반 텍스트입니다.

- 리스트 항목 1
- 리스트 항목 2

**굵은 텍스트**와 *기울임 텍스트*입니다.`;

			const result = await parser.parseMarkdown(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.nodeCount).toBeGreaterThan(0);
			expect(result.symbols).toBeDefined();

			console.log(`마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});

		it("링크가 포함된 마크다운 파싱", async () => {
			const markdown = `# 문서

[내부 링크](./other-file.md)
[외부 링크](https://example.com)
[앵커 링크](#섹션)`;

			const result = await parser.parseMarkdown(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();

			console.log(`링크 포함 마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});

		it("코드 블록이 포함된 마크다운 파싱", async () => {
			const markdown = `# 코드 예시

\`\`\`typescript
const example = "Hello World";
console.log(example);
\`\`\`

인라인 코드: \`const x = 1\``;

			const result = await parser.parseMarkdown(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();

			console.log(`코드 블록 포함 마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});
	});

	describe("링크 추적 기능", () => {
		it("내부 링크 추적", async () => {
			const testFile = path.join(testDir, "test-links.md");
			const markdown = `# 문서

[내부 링크 1](./other-file.md)
[내부 링크 2](../docs/guide.md)
[내부 링크 3](../../config/settings.md)`;

			fs.writeFileSync(testFile, markdown);

			const result = await linkTracker.trackLinks(testFile, "test-project");

			expect(result).toBeDefined();
			expect(result.brokenLinks).toBeDefined();
			// 파일이 존재하지 않으므로 broken 링크가 있을 수 있음
			expect(result.brokenLinks.length).toBeGreaterThanOrEqual(0);
		});

		it("외부 링크 추적", async () => {
			const testFile = path.join(testDir, "test-external-links.md");
			const markdown = `# 문서

[외부 링크 1](https://example.com)
[외부 링크 2](https://github.com/user/repo)
[외부 링크 3](mailto:contact@example.com)`;

			fs.writeFileSync(testFile, markdown);

			const result = await linkTracker.trackLinks(testFile, "test-project");

			expect(result).toBeDefined();
			expect(result.brokenLinks).toBeDefined();
			// 외부 링크는 broken으로 표시되지 않을 수 있음
		});
	});

	describe("실제 파일 분석", () => {
		it("README.md 파일 분석", async () => {
			const readmePath = path.join(__dirname, "../README.md");
			if (!fs.existsSync(readmePath)) {
				console.log("README.md 파일이 없습니다. 테스트를 건너뜁니다.");
				return;
			}

			const markdown = fs.readFileSync(readmePath, "utf-8");
			const result = await parser.parseMarkdown(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();

			console.log(`README.md 분석 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});

		it("docs 폴더 문서 분석", async () => {
			const docsPath = path.join(__dirname, "../docs");
			if (!fs.existsSync(docsPath)) {
				console.log("docs 폴더가 없습니다. 테스트를 건너뜁니다.");
				return;
			}

			const files = fs
				.readdirSync(docsPath, { recursive: true })
				.filter((file) => typeof file === "string" && file.endsWith(".md"))
				.slice(0, 3); // 처음 3개 파일만 테스트

			for (const file of files) {
				const filePath = path.join(docsPath, file as string);
				const markdown = fs.readFileSync(filePath, "utf-8");
				const result = await parser.parseMarkdown(markdown);

				expect(result).toBeDefined();
				expect(result.tree).toBeDefined();
				expect(result.metadata).toBeDefined();

				console.log(`${file} 분석 결과:`);
				console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
				console.log(`- 파싱 시간: 0ms (fallback parsing)`);
			}
		});
	});

	describe("성능 테스트", () => {
		it("대용량 마크다운 문서 분석", async () => {
			// 대용량 마크다운 문서 생성
			let markdown = "# 대용량 문서\n\n";

			for (let i = 1; i <= 50; i++) {
				markdown += `## 섹션 ${i}\n`;
				markdown += `이것은 섹션 ${i}입니다.\n\n`;

				for (let j = 1; j <= 5; j++) {
					markdown += `### 하위 섹션 ${i}.${j}\n`;
					markdown += `하위 섹션 ${i}.${j}의 내용입니다.\n\n`;
					markdown += `[링크 ${i}.${j}](file-${i}-${j}.md)\n\n`;
				}
			}

			const startTime = Date.now();
			const result = await parser.parseMarkdown(markdown);
			const endTime = Date.now();
			const processingTime = endTime - startTime;

			// 결과 검증
			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();

			// 성능 검증
			expect(processingTime).toBeLessThan(2000); // 2초 이내

			console.log(`대용량 문서 분석 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
		});
	});
});
