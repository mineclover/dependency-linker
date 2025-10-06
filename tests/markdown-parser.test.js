"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MarkdownParser_js_1 = require("../src/parsers/markdown/MarkdownParser.js");
const MarkdownLinkTracker_js_1 = require("../src/parsers/markdown/MarkdownLinkTracker.js");
const MarkdownHeadingExtractor_js_1 = require("../src/parsers/markdown/MarkdownHeadingExtractor.js");
const MarkdownTagCollector_js_1 = require("../src/parsers/markdown/MarkdownTagCollector.js");
const MarkdownTagHeadingMapper_js_1 = require("../src/parsers/markdown/MarkdownTagHeadingMapper.js");
const MarkdownTagConventionManager_js_1 = require("../src/parsers/markdown/MarkdownTagConventionManager.js");
const MarkdownTagDocumentGenerator_js_1 = require("../src/parsers/markdown/MarkdownTagDocumentGenerator.js");
const MarkdownTagTypeValidator_js_1 = require("../src/parsers/markdown/MarkdownTagTypeValidator.js");
const MarkdownTagTypeDocumentation_js_1 = require("../src/parsers/markdown/MarkdownTagTypeDocumentation.js");
(0, globals_1.describe)("마크다운 파서 테스트", () => {
    let parser;
    let linkTracker;
    let headingExtractor;
    let tagCollector;
    let tagHeadingMapper;
    let tagConventionManager;
    let tagDocumentGenerator;
    let tagTypeValidator;
    let tagTypeDocumentGenerator;
    (0, globals_1.beforeAll)(() => {
        parser = new MarkdownParser_js_1.MarkdownParser();
        linkTracker = new MarkdownLinkTracker_js_1.MarkdownLinkTracker("/tmp");
        headingExtractor = new MarkdownHeadingExtractor_js_1.MarkdownHeadingExtractor();
        tagCollector = new MarkdownTagCollector_js_1.MarkdownTagCollector();
        tagHeadingMapper = new MarkdownTagHeadingMapper_js_1.MarkdownTagHeadingMapper();
        tagConventionManager = new MarkdownTagConventionManager_js_1.MarkdownTagConventionManager();
        tagDocumentGenerator = new MarkdownTagDocumentGenerator_js_1.MarkdownTagDocumentGenerator();
        tagTypeValidator = new MarkdownTagTypeValidator_js_1.MarkdownTagTypeValidator();
        tagTypeDocumentGenerator = new MarkdownTagTypeDocumentation_js_1.MarkdownTagTypeDocumentGenerator();
    });
    (0, globals_1.afterAll)(() => {
    });
    (0, globals_1.describe)("기본 마크다운 파싱", () => {
        (0, globals_1.it)("간단한 마크다운 문서 파싱", async () => {
            const markdown = `# 제목
## 부제목
일반 텍스트입니다.

- 리스트 항목 1
- 리스트 항목 2

**굵은 텍스트**와 *기울임 텍스트*입니다.`;
            const result = await parser.parse(markdown);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.ast).toBeDefined();
            (0, globals_1.expect)(result.ast.children).toBeDefined();
            (0, globals_1.expect)(result.ast.children.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("복잡한 마크다운 문서 파싱", async () => {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.ast).toBeDefined();
            (0, globals_1.expect)(result.ast.children).toBeDefined();
            (0, globals_1.expect)(result.ast.children.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("빈 마크다운 문서 파싱", async () => {
            const markdown = "";
            const result = await parser.parse(markdown);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.ast).toBeDefined();
        });
        (0, globals_1.it)("특수 문자가 포함된 마크다운 파싱", async () => {
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
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.ast).toBeDefined();
        });
    });
    (0, globals_1.describe)("링크 추적 기능", () => {
        (0, globals_1.it)("내부 링크 추적", async () => {
            const markdown = `# 문서

[내부 링크 1](./other-file.md)
[내부 링크 2](../docs/guide.md)
[내부 링크 3](../../config/settings.md)`;
            const links = await linkTracker.trackLinks(markdown);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(links.internal).toBeDefined();
            (0, globals_1.expect)(links.internal.length).toBe(3);
            (0, globals_1.expect)(links.internal[0].path).toBe("./other-file.md");
            (0, globals_1.expect)(links.internal[1].path).toBe("../docs/guide.md");
            (0, globals_1.expect)(links.internal[2].path).toBe("../../config/settings.md");
        });
        (0, globals_1.it)("외부 링크 추적", async () => {
            const markdown = `# 문서

[외부 링크 1](https://example.com)
[외부 링크 2](https://github.com/user/repo)
[외부 링크 3](mailto:contact@example.com)`;
            const links = await linkTracker.trackLinks(markdown);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(links.external).toBeDefined();
            (0, globals_1.expect)(links.external.length).toBe(3);
            (0, globals_1.expect)(links.external[0].url).toBe("https://example.com");
            (0, globals_1.expect)(links.external[1].url).toBe("https://github.com/user/repo");
            (0, globals_1.expect)(links.external[2].url).toBe("mailto:contact@example.com");
        });
        (0, globals_1.it)("앵커 링크 추적", async () => {
            const markdown = `# 문서

[섹션으로 이동](#섹션-1)
[하위 섹션으로 이동](#하위-섹션-1-1)
[제목으로 이동](#제목)`;
            const links = await linkTracker.trackLinks(markdown);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(links.anchor).toBeDefined();
            (0, globals_1.expect)(links.anchor.length).toBe(3);
            (0, globals_1.expect)(links.anchor[0].anchor).toBe("#섹션-1");
            (0, globals_1.expect)(links.anchor[1].anchor).toBe("#하위-섹션-1-1");
            (0, globals_1.expect)(links.anchor[2].anchor).toBe("#제목");
        });
        (0, globals_1.it)("복합 링크 추적", async () => {
            const markdown = `# 문서

[내부 링크](./file.md)
[외부 링크](https://example.com)
[앵커 링크](#section)
[이미지](image.png)
[이메일](mailto:test@example.com)`;
            const links = await linkTracker.trackLinks(markdown);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(links.internal.length).toBe(1);
            (0, globals_1.expect)(links.external.length).toBe(2);
            (0, globals_1.expect)(links.anchor.length).toBe(1);
            (0, globals_1.expect)(links.images.length).toBe(1);
        });
    });
    (0, globals_1.describe)("헤딩 추출 기능", () => {
        (0, globals_1.it)("기본 헤딩 추출", async () => {
            const markdown = `# 메인 제목
## 섹션 1
### 하위 섹션 1.1
#### 세부 항목 1.1.1
##### 세부 항목 1.1.1.1
###### 세부 항목 1.1.1.1.1`;
            const headings = await headingExtractor.extractHeadings(markdown);
            (0, globals_1.expect)(headings).toBeDefined();
            (0, globals_1.expect)(headings.length).toBe(6);
            (0, globals_1.expect)(headings[0].level).toBe(1);
            (0, globals_1.expect)(headings[0].text).toBe("메인 제목");
            (0, globals_1.expect)(headings[1].level).toBe(2);
            (0, globals_1.expect)(headings[1].text).toBe("섹션 1");
        });
        (0, globals_1.it)("중첩된 헤딩 구조 추출", async () => {
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
            (0, globals_1.expect)(headings).toBeDefined();
            (0, globals_1.expect)(headings.length).toBe(8);
            const level1 = headings.filter((h) => h.level === 1);
            const level2 = headings.filter((h) => h.level === 2);
            const level3 = headings.filter((h) => h.level === 3);
            const level4 = headings.filter((h) => h.level === 4);
            (0, globals_1.expect)(level1.length).toBe(1);
            (0, globals_1.expect)(level2.length).toBe(2);
            (0, globals_1.expect)(level3.length).toBe(4);
            (0, globals_1.expect)(level4.length).toBe(2);
        });
        (0, globals_1.it)("헤딩 없는 문서", async () => {
            const markdown = `일반 텍스트입니다.
리스트 항목입니다.
**굵은 텍스트**입니다.`;
            const headings = await headingExtractor.extractHeadings(markdown);
            (0, globals_1.expect)(headings).toBeDefined();
            (0, globals_1.expect)(headings.length).toBe(0);
        });
    });
    (0, globals_1.describe)("태그 수집 기능", () => {
        (0, globals_1.it)("기본 태그 수집", async () => {
            const markdown = `# 문서 #기능
## 섹션 1 #예시
### 하위 섹션 #테스트

[링크](file.md) #가이드라인
일반 텍스트 #요구사항`;
            const tags = await tagCollector.collectTags(markdown);
            (0, globals_1.expect)(tags).toBeDefined();
            (0, globals_1.expect)(tags.length).toBe(5);
            const tagNames = tags.map((tag) => tag.name);
            (0, globals_1.expect)(tagNames).toContain("#기능");
            (0, globals_1.expect)(tagNames).toContain("#예시");
            (0, globals_1.expect)(tagNames).toContain("#테스트");
            (0, globals_1.expect)(tagNames).toContain("#가이드라인");
            (0, globals_1.expect)(tagNames).toContain("#요구사항");
        });
        (0, globals_1.it)("명시적 태그 유형 수집", async () => {
            const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 사용자 시나리오 #시나리오
## 개선 사항 #개선
## TODO #todo
## 테스트 케이스 #테스트
## 에러 유형 #에러`;
            const tags = await tagCollector.collectTags(markdown);
            (0, globals_1.expect)(tags).toBeDefined();
            (0, globals_1.expect)(tags.length).toBe(8);
            const explicitTags = tags.filter((tag) => [
                "#기능",
                "#예시",
                "#요구사항",
                "#시나리오",
                "#개선",
                "#todo",
                "#테스트",
                "#에러",
            ].includes(tag.name));
            (0, globals_1.expect)(explicitTags.length).toBe(8);
        });
        (0, globals_1.it)("태그 위치 정보", async () => {
            const markdown = `# 제목 #기능
## 섹션 #예시
[링크](file.md) #가이드라인`;
            const tags = await tagCollector.collectTags(markdown);
            (0, globals_1.expect)(tags).toBeDefined();
            (0, globals_1.expect)(tags.length).toBe(3);
            const titleTag = tags.find((tag) => tag.name === "#기능");
            const sectionTag = tags.find((tag) => tag.name === "#예시");
            const linkTag = tags.find((tag) => tag.name === "#가이드라인");
            (0, globals_1.expect)(titleTag).toBeDefined();
            (0, globals_1.expect)(sectionTag).toBeDefined();
            (0, globals_1.expect)(linkTag).toBeDefined();
        });
    });
    (0, globals_1.describe)("태그-헤딩 매핑 기능", () => {
        (0, globals_1.it)("태그와 헤딩 관계 매핑", async () => {
            const markdown = `# 메인 제목 #기능
## 섹션 1 #예시
### 하위 섹션 #테스트
## 섹션 2 #요구사항`;
            const headings = await headingExtractor.extractHeadings(markdown);
            const tags = await tagCollector.collectTags(markdown);
            const relationships = await tagHeadingMapper.mapTagHeadingRelationships(headings, tags);
            (0, globals_1.expect)(relationships).toBeDefined();
            (0, globals_1.expect)(relationships.length).toBeGreaterThan(0);
            const directRelations = relationships.filter((rel) => rel.type === "direct");
            const nearbyRelations = relationships.filter((rel) => rel.type === "nearby");
            (0, globals_1.expect)(directRelations.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("태그-헤딩 관계 강도 계산", async () => {
            const markdown = `# 제목 #기능
## 섹션 #예시
[링크](file.md) #가이드라인`;
            const headings = await headingExtractor.extractHeadings(markdown);
            const tags = await tagCollector.collectTags(markdown);
            const relationships = await tagHeadingMapper.mapTagHeadingRelationships(headings, tags);
            (0, globals_1.expect)(relationships).toBeDefined();
            relationships.forEach((rel) => {
                (0, globals_1.expect)(rel.strength).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(rel.strength).toBeLessThanOrEqual(1);
            });
        });
    });
    (0, globals_1.describe)("태그 컨벤션 관리", () => {
        (0, globals_1.it)("태그 컨벤션 분석", async () => {
            const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 테스트 케이스 #테스트`;
            const tags = await tagCollector.collectTags(markdown);
            const conventions = await tagConventionManager.analyzeTags(tags);
            (0, globals_1.expect)(conventions).toBeDefined();
            (0, globals_1.expect)(conventions.categories).toBeDefined();
            (0, globals_1.expect)(conventions.priorities).toBeDefined();
            (0, globals_1.expect)(conventions.definitions).toBeDefined();
        });
        (0, globals_1.it)("태그 컨벤션 문서 생성", async () => {
            const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;
            const tags = await tagCollector.collectTags(markdown);
            const conventions = await tagConventionManager.analyzeTags(tags);
            const document = await tagDocumentGenerator.generateTagConventionDocument(conventions);
            (0, globals_1.expect)(document).toBeDefined();
            (0, globals_1.expect)(document.content).toBeDefined();
            (0, globals_1.expect)(document.content.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)("태그 유형 검증", () => {
        (0, globals_1.it)("명시적 태그 유형 검증", async () => {
            const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;
            const tags = await tagCollector.collectTags(markdown);
            const validationResults = await tagTypeValidator.validateSingleTag(tags[0], markdown);
            (0, globals_1.expect)(validationResults).toBeDefined();
            (0, globals_1.expect)(validationResults.isValid).toBeDefined();
            (0, globals_1.expect)(validationResults.score).toBeDefined();
            (0, globals_1.expect)(validationResults.suggestions).toBeDefined();
        });
        (0, globals_1.it)("태그 유형 문서 생성", async () => {
            const markdown = `# 기능 정의 #기능
## 사용 예시 #예시`;
            const tags = await tagCollector.collectTags(markdown);
            const validationResults = await tagTypeValidator.validateSingleTag(tags[0], markdown);
            const document = await tagTypeDocumentGenerator.generateMarkdownDocumentation([
                validationResults,
            ]);
            (0, globals_1.expect)(document).toBeDefined();
            (0, globals_1.expect)(document.content).toBeDefined();
            (0, globals_1.expect)(document.content.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)("통합 마크다운 분석", () => {
        (0, globals_1.it)("완전한 마크다운 분석", async () => {
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
            const links = await linkTracker.trackLinks(markdown);
            const headings = await headingExtractor.extractHeadings(markdown);
            const tags = await tagCollector.collectTags(markdown);
            const relationships = await tagHeadingMapper.mapTagHeadingRelationships(headings, tags);
            const conventions = await tagConventionManager.analyzeTags(tags);
            (0, globals_1.expect)(links).toBeDefined();
            (0, globals_1.expect)(headings).toBeDefined();
            (0, globals_1.expect)(tags).toBeDefined();
            (0, globals_1.expect)(relationships).toBeDefined();
            (0, globals_1.expect)(conventions).toBeDefined();
            (0, globals_1.expect)(links.internal.length).toBe(4);
            (0, globals_1.expect)(links.internal[0].path).toBe("api.md");
            (0, globals_1.expect)(links.internal[1].path).toBe("user-guide.md");
            (0, globals_1.expect)(links.internal[2].path).toBe("tests/unit.md");
            (0, globals_1.expect)(links.internal[3].path).toBe("tests/integration.md");
            (0, globals_1.expect)(headings.length).toBe(6);
            (0, globals_1.expect)(headings[0].text).toBe("프로젝트 개요");
            (0, globals_1.expect)(headings[1].text).toBe("설치 방법");
            (0, globals_1.expect)(headings[2].text).toBe("요구사항");
            (0, globals_1.expect)(tags.length).toBe(8);
            const tagNames = tags.map((tag) => tag.name);
            (0, globals_1.expect)(tagNames).toContain("#기능");
            (0, globals_1.expect)(tagNames).toContain("#가이드라인");
            (0, globals_1.expect)(tagNames).toContain("#요구사항");
            (0, globals_1.expect)(tagNames).toContain("#예시");
            (0, globals_1.expect)(tagNames).toContain("#테스트");
            (0, globals_1.expect)(relationships.length).toBeGreaterThan(0);
            (0, globals_1.expect)(conventions.categories).toBeDefined();
            (0, globals_1.expect)(conventions.priorities).toBeDefined();
        });
    });
});
//# sourceMappingURL=markdown-parser.test.js.map