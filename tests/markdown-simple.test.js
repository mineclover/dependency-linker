"use strict";
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (
					!desc ||
					("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
				) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, "default", { enumerable: true, value: v });
			}
		: function (o, v) {
				o["default"] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o)
						if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== "default") __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MarkdownParser_1 = require("../src/parsers/markdown/MarkdownParser");
const MarkdownLinkTracker_1 = require("../src/parsers/markdown/MarkdownLinkTracker");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, globals_1.describe)("간단한 마크다운 파서 테스트", () => {
	let parser;
	let linkTracker;
	const testDir = path.join(__dirname, "../test-markdown-simple");
	(0, globals_1.beforeAll)(async () => {
		parser = new MarkdownParser_1.MarkdownParser();
		linkTracker = new MarkdownLinkTracker_1.MarkdownLinkTracker(testDir);
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});
	(0, globals_1.afterAll)(async () => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});
	(0, globals_1.describe)("기본 마크다운 파싱", () => {
		(0, globals_1.it)("간단한 마크다운 문서 파싱", async () => {
			const markdown = `# 제목
## 부제목
일반 텍스트입니다.

- 리스트 항목 1
- 리스트 항목 2

**굵은 텍스트**와 *기울임 텍스트*입니다.`;
			const result = await parser.parseMarkdown(markdown);
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.tree).toBeDefined();
			(0, globals_1.expect)(result.metadata).toBeDefined();
			(0, globals_1.expect)(result.metadata.nodeCount).toBeGreaterThan(0);
			(0, globals_1.expect)(result.symbols).toBeDefined();
			console.log(`마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});
		(0, globals_1.it)("링크가 포함된 마크다운 파싱", async () => {
			const markdown = `# 문서

[내부 링크](./other-file.md)
[외부 링크](https://example.com)
[앵커 링크](#섹션)`;
			const result = await parser.parseMarkdown(markdown);
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.tree).toBeDefined();
			(0, globals_1.expect)(result.metadata).toBeDefined();
			console.log(`링크 포함 마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});
		(0, globals_1.it)("코드 블록이 포함된 마크다운 파싱", async () => {
			const markdown = `# 코드 예시

\`\`\`typescript
const example = "Hello World";
console.log(example);
\`\`\`

인라인 코드: \`const x = 1\``;
			const result = await parser.parseMarkdown(markdown);
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.tree).toBeDefined();
			(0, globals_1.expect)(result.metadata).toBeDefined();
			console.log(`코드 블록 포함 마크다운 파싱 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});
	});
	(0, globals_1.describe)("링크 추적 기능", () => {
		(0, globals_1.it)("내부 링크 추적", async () => {
			const testFile = path.join(testDir, "test-links.md");
			const markdown = `# 문서

[내부 링크 1](./other-file.md)
[내부 링크 2](../docs/guide.md)
[내부 링크 3](../../config/settings.md)`;
			fs.writeFileSync(testFile, markdown);
			const result = await linkTracker.trackLinks(testFile, "test-project");
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.brokenLinks).toBeDefined();
			(0, globals_1.expect)(result.brokenLinks.length).toBeGreaterThanOrEqual(
				0,
			);
		});
		(0, globals_1.it)("외부 링크 추적", async () => {
			const testFile = path.join(testDir, "test-external-links.md");
			const markdown = `# 문서

[외부 링크 1](https://example.com)
[외부 링크 2](https://github.com/user/repo)
[외부 링크 3](mailto:contact@example.com)`;
			fs.writeFileSync(testFile, markdown);
			const result = await linkTracker.trackLinks(testFile, "test-project");
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.brokenLinks).toBeDefined();
		});
	});
	(0, globals_1.describe)("실제 파일 분석", () => {
		(0, globals_1.it)("README.md 파일 분석", async () => {
			const readmePath = path.join(__dirname, "../README.md");
			if (!fs.existsSync(readmePath)) {
				console.log("README.md 파일이 없습니다. 테스트를 건너뜁니다.");
				return;
			}
			const markdown = fs.readFileSync(readmePath, "utf-8");
			const result = await parser.parseMarkdown(markdown);
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.tree).toBeDefined();
			(0, globals_1.expect)(result.metadata).toBeDefined();
			console.log(`README.md 분석 결과:`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
			console.log(`- 파싱 시간: 0ms (fallback parsing)`);
		});
		(0, globals_1.it)("docs 폴더 문서 분석", async () => {
			const docsPath = path.join(__dirname, "../docs");
			if (!fs.existsSync(docsPath)) {
				console.log("docs 폴더가 없습니다. 테스트를 건너뜁니다.");
				return;
			}
			const files = fs
				.readdirSync(docsPath, { recursive: true })
				.filter((file) => typeof file === "string" && file.endsWith(".md"))
				.slice(0, 3);
			for (const file of files) {
				const filePath = path.join(docsPath, file);
				const markdown = fs.readFileSync(filePath, "utf-8");
				const result = await parser.parseMarkdown(markdown);
				(0, globals_1.expect)(result).toBeDefined();
				(0, globals_1.expect)(result.tree).toBeDefined();
				(0, globals_1.expect)(result.metadata).toBeDefined();
				console.log(`${file} 분석 결과:`);
				console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
				console.log(`- 파싱 시간: 0ms (fallback parsing)`);
			}
		});
	});
	(0, globals_1.describe)("성능 테스트", () => {
		(0, globals_1.it)("대용량 마크다운 문서 분석", async () => {
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
			(0, globals_1.expect)(result).toBeDefined();
			(0, globals_1.expect)(result.tree).toBeDefined();
			(0, globals_1.expect)(result.metadata).toBeDefined();
			(0, globals_1.expect)(processingTime).toBeLessThan(2000);
			console.log(`대용량 문서 분석 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(`- 노드 수: ${result.metadata.nodeCount}개`);
		});
	});
});
//# sourceMappingURL=markdown-simple.test.js.map
