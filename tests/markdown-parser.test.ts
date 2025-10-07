/**
 * 마크다운 파서 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MarkdownParser } from "../src/parsers/markdown/MarkdownParser";
import { MarkdownLinkTracker } from "../src/parsers/markdown/MarkdownLinkTracker";
import { MarkdownHeadingExtractor } from "../src/parsers/markdown/MarkdownHeadingExtractor";
import { MarkdownTagCollector } from "../src/parsers/markdown/MarkdownTagCollector";
import { MarkdownTagHeadingMapper } from "../src/parsers/markdown/MarkdownTagHeadingMapper";
import { MarkdownTagConventionManager } from "../src/parsers/markdown/MarkdownTagConventionManager";
import { MarkdownTagDocumentGenerator } from "../src/parsers/markdown/MarkdownTagDocumentGenerator";
import { MarkdownTagTypeValidator } from "../src/parsers/markdown/MarkdownTagTypeValidator";
import { MarkdownTagTypeDocumentationGenerator } from "../src/parsers/markdown/MarkdownTagTypeDocumentation";
import { globalTagTypeContainer } from "../src/parsers/markdown/MarkdownTagTypeDefinitions";
import * as fs from "fs";
import * as path from "path";

describe("마크다운 파서 테스트", () => {
	let parser: MarkdownParser;
	let linkTracker: MarkdownLinkTracker;
	let headingExtractor: MarkdownHeadingExtractor;
	let tagCollector: MarkdownTagCollector;
	let tagHeadingMapper: MarkdownTagHeadingMapper;
	let tagConventionManager: MarkdownTagConventionManager;
	let tagDocumentGenerator: MarkdownTagDocumentGenerator;
	let tagTypeValidator: MarkdownTagTypeValidator;
	let tagTypeDocumentGenerator: MarkdownTagTypeDocumentationGenerator;
	// let tagCollector: MarkdownTagCollector;
	// let tagHeadingMapper: MarkdownTagHeadingMapper;
	// let tagConventionManager: MarkdownTagConventionManager;
	// let tagDocumentGenerator: MarkdownTagDocumentGenerator;
	// let tagTypeValidator: MarkdownTagTypeValidator;
	// let tagTypeDocumentGenerator: MarkdownTagTypeDocumentationGenerator;

	beforeAll(() => {
		parser = new MarkdownParser();
		linkTracker = new MarkdownLinkTracker("/tmp");
		headingExtractor = new MarkdownHeadingExtractor();
		tagCollector = new MarkdownTagCollector();
		tagHeadingMapper = new MarkdownTagHeadingMapper();
		tagConventionManager = new MarkdownTagConventionManager();
		tagDocumentGenerator = new MarkdownTagDocumentGenerator();
		tagTypeValidator = new MarkdownTagTypeValidator();
		tagTypeDocumentGenerator = new MarkdownTagTypeDocumentationGenerator();
	});

	afterAll(() => {
		// 정리 작업
	});

	describe("기본 마크다운 파싱", () => {
		it("간단한 마크다운 문서 파싱", async () => {
			const markdown = `# 제목
## 부제목
일반 텍스트입니다.

- 리스트 항목 1
- 리스트 항목 2

**굵은 텍스트**와 *기울임 텍스트*입니다.`;

			const result = await parser.parse(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.nodeCount).toBeGreaterThan(0);
		});

		it("복잡한 마크다운 문서 파싱", async () => {
			const markdown = `# 메인 제목

## 섹션 1
이것은 첫 번째 섹션입니다.

### 하위 섹션 1.1
- 항목 1
- 항목 2
- 항목 3

### 하위 섹션 1.2
\`\`\`typescript
const example = "Hello World";
console.log(example);
\`\`\`

## 섹션 2
이것은 두 번째 섹션입니다.

> 인용문입니다.

[링크](https://example.com)와 **굵은 텍스트**가 있습니다.`;

			const result = await parser.parse(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata).toBeDefined();
			expect(result.metadata.nodeCount).toBeGreaterThan(0);
		});

		it("빈 마크다운 문서 파싱", async () => {
			const markdown = "";
			const result = await parser.parse(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
		});

		it("특수 문자가 포함된 마크다운 파싱", async () => {
			const markdown = `# 특수 문자 테스트

## 이모지 테스트
🚀 🎉 ✅ ❌

## 특수 기호 테스트
- @username
- #hashtag
- $price
- %percentage

## 코드 블록 테스트
\`\`\`javascript
const regex = /[a-zA-Z0-9@#$%^&*()_+]/g;
\`\`\``;

			const result = await parser.parse(markdown);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
		});
	});

	describe("링크 추적 기능", () => {
		it("내부 링크 추적", async () => {
			const markdown = `# 문서

[내부 링크 1](./other-file.md)
[내부 링크 2](../docs/guide.md)
[내부 링크 3](../../config/settings.md)`;

			// 임시 파일 생성
			const tempFilePath = path.join(__dirname, "temp-test-file.md");
			await fs.promises.writeFile(tempFilePath, markdown);
			const links = await linkTracker.trackLinks(tempFilePath, "test-project");
			await fs.promises.unlink(tempFilePath);

			expect(links).toBeDefined();
			expect(links.internal).toBeDefined();
			expect(links.internal.length).toBe(3);
			expect(links.internal[0].path).toBe("./other-file.md");
			expect(links.internal[1].path).toBe("../docs/guide.md");
			expect(links.internal[2].path).toBe("../../config/settings.md");
		});

		it("외부 링크 추적", async () => {
			const markdown = `# 문서

[외부 링크 1](https://example.com)
[외부 링크 2](https://github.com/user/repo)
[외부 링크 3](mailto:contact@example.com)`;

			// 임시 파일 생성
			const tempFilePath = path.join(__dirname, "temp-test-file.md");
			await fs.promises.writeFile(tempFilePath, markdown);
			const links = await linkTracker.trackLinks(tempFilePath, "test-project");
			await fs.promises.unlink(tempFilePath);

			expect(links).toBeDefined();
			expect(links.external).toBeDefined();
			expect(links.external.length).toBe(3);
			expect(links.external[0].url).toBe("https://example.com");
			expect(links.external[1].url).toBe("https://github.com/user/repo");
			expect(links.external[2].url).toBe("mailto:contact@example.com");
		});

		it("앵커 링크 추적", async () => {
			const markdown = `# 문서

[섹션으로 이동](#섹션-1)
[하위 섹션으로 이동](#하위-섹션-1-1)
[제목으로 이동](#제목)`;

			// 임시 파일 생성
			const tempFilePath = path.join(__dirname, "temp-test-file.md");
			await fs.promises.writeFile(tempFilePath, markdown);
			const links = await linkTracker.trackLinks(tempFilePath, "test-project");
			await fs.promises.unlink(tempFilePath);

			expect(links).toBeDefined();
			expect(links.anchor).toBeDefined();
			expect(links.anchor.length).toBe(3);
			expect(links.anchor[0].anchor).toBe("#섹션-1");
			expect(links.anchor[1].anchor).toBe("#하위-섹션-1-1");
			expect(links.anchor[2].anchor).toBe("#제목");
		});

		it("복합 링크 추적", async () => {
			const markdown = `# 문서

[내부 링크](./file.md)
[외부 링크](https://example.com)
[앵커 링크](#section)
[이미지](image.png)
[이메일](mailto:test@example.com)`;

			// 임시 파일 생성
			const tempFilePath = path.join(__dirname, "temp-test-file.md");
			await fs.promises.writeFile(tempFilePath, markdown);
			const links = await linkTracker.trackLinks(tempFilePath, "test-project");
			await fs.promises.unlink(tempFilePath);

			expect(links).toBeDefined();
			expect(links.internal.length).toBe(1);
			expect(links.external.length).toBe(2);
			expect(links.anchor.length).toBe(1);
			expect(links.images.length).toBe(1);
		});
	});

	describe("헤딩 추출 기능", () => {
		it("기본 헤딩 추출", async () => {
			const markdown = `# 메인 제목
## 섹션 1
### 하위 섹션 1.1
#### 세부 항목 1.1.1
##### 세부 항목 1.1.1.1
###### 세부 항목 1.1.1.1.1`;

			const headings = await headingExtractor.extractHeadings(markdown);

			expect(headings).toBeDefined();
			expect(headings.length).toBe(6);
			expect(headings[0].level).toBe(1);
			expect(headings[0].text).toBe("메인 제목");
			expect(headings[1].level).toBe(2);
			expect(headings[1].text).toBe("섹션 1");
		});

		it("중첩된 헤딩 구조 추출", async () => {
			const markdown = `# 프로젝트 개요
## 설치 방법
### 요구사항
### 설치 단계
#### 1단계: 의존성 설치
#### 2단계: 설정 파일 생성
## 사용법
### 기본 사용법
### 고급 사용법`;

			const headings = await headingExtractor.extractHeadings(markdown);

			expect(headings).toBeDefined();
			expect(headings.length).toBe(9);

			// 레벨별 헤딩 수 확인
			const level1 = headings.filter((h) => h.level === 1);
			const level2 = headings.filter((h) => h.level === 2);
			const level3 = headings.filter((h) => h.level === 3);
			const level4 = headings.filter((h) => h.level === 4);

			expect(level1.length).toBe(1);
			expect(level2.length).toBe(2);
			expect(level3.length).toBe(4);
			expect(level4.length).toBe(2);
		});

		it("헤딩 없는 문서", async () => {
			const markdown = `일반 텍스트입니다.
리스트 항목입니다.
**굵은 텍스트**입니다.`;

			const headings = await headingExtractor.extractHeadings(markdown);

			expect(headings).toBeDefined();
			expect(headings.length).toBe(0);
		});
	});

	describe("태그 수집 기능", () => {
		it("기본 태그 수집", async () => {
			const markdown = `# 문서 #기능
## 섹션 1 #예시
### 하위 섹션 #테스트

[링크](file.md) #가이드라인
일반 텍스트 #요구사항`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);

			expect(tags).toBeDefined();
			expect(tags.length).toBe(5);

			const tagNames = tags.map((tag) => tag.name);
			expect(tagNames).toContain("#기능");
			expect(tagNames).toContain("#예시");
			expect(tagNames).toContain("#테스트");
			expect(tagNames).toContain("#가이드라인");
			expect(tagNames).toContain("#요구사항");
		});

		it("명시적 태그 유형 수집", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 사용자 시나리오 #시나리오
## 개선 사항 #개선
## TODO #todo
## 테스트 케이스 #테스트
## 에러 유형 #에러`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);

			expect(tags).toBeDefined();
			expect(tags.length).toBe(8);

			// 명시적 태그 유형 확인
			const explicitTags = tags.filter((tag) =>
				[
					"#기능",
					"#예시",
					"#요구사항",
					"#시나리오",
					"#개선",
					"#todo",
					"#테스트",
					"#에러",
				].includes(tag.name),
			);
			expect(explicitTags.length).toBe(8);
		});

		it("태그 위치 정보", async () => {
			const markdown = `# 제목 #기능
## 섹션 #예시
[링크](file.md) #가이드라인`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);

			expect(tags).toBeDefined();
			expect(tags.length).toBe(3);

			// 태그 위치 확인
			const titleTag = tags.find((tag) => tag.name === "#기능");
			const sectionTag = tags.find((tag) => tag.name === "#예시");
			const linkTag = tags.find((tag) => tag.name === "#가이드라인");

			expect(titleTag).toBeDefined();
			expect(sectionTag).toBeDefined();
			expect(linkTag).toBeDefined();
		});
	});

	describe("태그-헤딩 매핑 기능", () => {
		it("태그와 헤딩 관계 매핑", async () => {
			const markdown = `# 메인 제목 #기능
## 섹션 1 #예시
### 하위 섹션 #테스트
## 섹션 2 #요구사항`;

			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const relationships = await tagHeadingMapper.mapTagHeadingRelationships(
				headings,
				tags.tags,
				"test-project",
			);

			expect(relationships).toBeDefined();
			expect(relationships.length).toBeGreaterThan(0);

			// 관계 타입 확인
			const directRelations = relationships.filter(
				(rel) => rel.type === "direct",
			);
			const nearbyRelations = relationships.filter(
				(rel) => rel.type === "nearby",
			);

			expect(directRelations.length).toBeGreaterThan(0);
		});

		it("태그-헤딩 관계 강도 계산", async () => {
			const markdown = `# 제목 #기능
## 섹션 #예시
[링크](file.md) #가이드라인`;

			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const relationships = await tagHeadingMapper.mapTagHeadingRelationships(
				headings,
				tags.tags,
				"test-project",
			);

			expect(relationships).toBeDefined();

			// 관계 강도 확인
			relationships.forEach((rel) => {
				expect(rel.strength).toBeGreaterThanOrEqual(0);
				expect(rel.strength).toBeLessThanOrEqual(1);
			});
		});
	});

	describe("태그 컨벤션 관리", () => {
		it("태그 컨벤션 분석", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 테스트 케이스 #테스트`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const conventions = await tagConventionManager.analyzeTags(
				tags.tags,
				"test-file.md",
			);

			expect(conventions).toBeDefined();
			expect(conventions.categories).toBeDefined();
			expect(conventions.priorities).toBeDefined();
			expect(conventions.definitions).toBeDefined();
		});

		it("태그 컨벤션 문서 생성", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const conventions = await tagConventionManager.analyzeTags(
				tags.tags,
				"test-file.md",
			);
			const document =
				await tagDocumentGenerator.generateTagConventionDocument(conventions);

			expect(document).toBeDefined();
			expect(document.content).toBeDefined();
			expect(document.content.length).toBeGreaterThan(0);
		});
	});

	describe("태그 유형 검증", () => {
		it("명시적 태그 유형 검증", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const validationResults = await tagTypeValidator.validateSingleTag(
				tags.tags[0],
				markdown,
			);

			expect(validationResults).toBeDefined();
			expect(validationResults.isValid).toBeDefined();
			expect(validationResults.score).toBeDefined();
			expect(validationResults.suggestions).toBeDefined();
		});

		it("태그 유형 문서 생성", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const validationResults = await tagTypeValidator.validateSingleTag(
				tags.tags[0],
				markdown,
			);
			const document =
				await tagTypeDocumentGenerator.generateMarkdownDocumentation([
					validationResults,
				]);

			expect(document).toBeDefined();
			expect(typeof document).toBe("string");
			expect(document.length).toBeGreaterThan(0);
		});
	});

	describe("통합 마크다운 분석", () => {
		it("완전한 마크다운 분석", async () => {
			const markdown = `# 프로젝트 개요 #기능
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

			// 링크 추적 - 임시 파일 생성
			const tempFilePath = path.join(__dirname, "temp-test-file.md");
			await fs.promises.writeFile(tempFilePath, markdown);
			const links = await linkTracker.trackLinks(tempFilePath, "test-project");
			await fs.promises.unlink(tempFilePath);

			// 헤딩 추출
			const headings = await headingExtractor.extractHeadings(markdown);

			// 태그 수집
			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);

			// 태그-헤딩 매핑
			const relationships = await tagHeadingMapper.mapTagHeadingRelationships(
				headings,
				tags.tags,
				"test-project",
			);

			// 태그 컨벤션 분석
			const conventions = await tagConventionManager.analyzeTags(
				tags.tags,
				"test-file.md",
			);

			// 결과 검증
			expect(links).toBeDefined();
			expect(headings).toBeDefined();
			expect(tags).toBeDefined();
			expect(relationships).toBeDefined();
			expect(conventions).toBeDefined();

			// 링크 검증
			expect(links.internal.length).toBe(4);
			expect(links.internal[0].path).toBe("api.md");
			expect(links.internal[1].path).toBe("user-guide.md");
			expect(links.internal[2].path).toBe("tests/unit.md");
			expect(links.internal[3].path).toBe("tests/integration.md");

			// 헤딩 검증
			expect(headings.length).toBe(6);
			expect(headings[0].text).toBe("프로젝트 개요");
			expect(headings[1].text).toBe("설치 방법");
			expect(headings[2].text).toBe("요구사항");

			// 태그 검증
			expect(tags.length).toBe(10);
			const tagNames = tags.map((tag) => tag.name);
			expect(tagNames).toContain("#기능");
			expect(tagNames).toContain("#가이드라인");
			expect(tagNames).toContain("#요구사항");
			expect(tagNames).toContain("#예시");
			expect(tagNames).toContain("#테스트");

			// 관계 검증
			expect(relationships.length).toBeGreaterThan(0);

			// 컨벤션 검증
			expect(conventions.categories).toBeDefined();
			expect(conventions.priorities).toBeDefined();
		});
	});
});
