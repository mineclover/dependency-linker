/**
 * 마크다운 분석 통합 테스트
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

describe("마크다운 분석 통합 테스트", () => {
	let parser: MarkdownParser;
	let linkTracker: MarkdownLinkTracker;
	let headingExtractor: MarkdownHeadingExtractor;
	let tagCollector: MarkdownTagCollector;
	let tagHeadingMapper: MarkdownTagHeadingMapper;
	let tagConventionManager: MarkdownTagConventionManager;
	let tagDocumentGenerator: MarkdownTagDocumentGenerator;
	let tagTypeValidator: MarkdownTagTypeValidator;
	let tagTypeDocumentGenerator: MarkdownTagTypeDocumentationGenerator;

	beforeAll(() => {
		parser = new MarkdownParser();
		linkTracker = new MarkdownLinkTracker(process.cwd());
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

	describe("실제 프로젝트 문서 분석", () => {
		it("README.md 분석", async () => {
			const readmePath = path.join(__dirname, "../README.md");
			if (!fs.existsSync(readmePath)) {
				console.log("README.md 파일이 없습니다. 테스트를 건너뜁니다.");
				return;
			}

			const markdown = fs.readFileSync(readmePath, "utf-8");

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

			// 결과 검증
			expect(links).toBeDefined();
			expect(headings).toBeDefined();
			expect(tags).toBeDefined();

			console.log(`README.md 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
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
				.slice(0, 5); // 처음 5개 파일만 테스트

			for (const file of files) {
				const filePath = path.join(docsPath, file.toString());
				const markdown = fs.readFileSync(filePath, "utf-8");

				// 링크 추적 - 임시 파일 생성
				const tempFilePath = path.join(__dirname, "temp-test-file.md");
				await fs.promises.writeFile(tempFilePath, markdown);
				const links = await linkTracker.trackLinks(
					tempFilePath,
					"test-project",
				);
				await fs.promises.unlink(tempFilePath);

				// 헤딩 추출
				const headings = await headingExtractor.extractHeadings(markdown);

				// 태그 수집
				const tags = await tagCollector.collectTags(
					markdown,
					"test-file.md",
					"test-project",
				);

				// 결과 검증
				expect(links).toBeDefined();
				expect(headings).toBeDefined();
				expect(tags).toBeDefined();

				console.log(`${file} 분석 결과:`);
				console.log(
					`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
				);
				console.log(`- 헤딩: ${headings.length}개`);
				console.log(`- 태그: ${tags.length}개`);
			}
		});
	});

	describe("복잡한 마크다운 문서 분석", () => {
		it("API 문서 분석", async () => {
			const markdown = `# API 문서 #기능

## 개요 #define
이 API는 사용자 인증과 데이터 관리를 제공합니다.

## 인증 API #기능

### POST /api/auth/login #기능
사용자 로그인을 처리합니다.

**요청 예시** #예시
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**응답 예시** #예시
\`\`\`json
{
  "token": "jwt-token",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
\`\`\`

### POST /api/auth/register #기능
사용자 등록을 처리합니다.

**요청 예시** #예시
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
\`\`\`

## 사용자 API #기능

### GET /api/users #기능
사용자 목록을 조회합니다.

**응답 예시** #예시
\`\`\`json
[
  {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
]
\`\`\`

### GET /api/users/:id #기능
특정 사용자를 조회합니다.

**경로 매개변수** #요구사항
- \`id\`: 사용자 ID (문자열)

**응답 예시** #예시
\`\`\`json
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

## 에러 처리 #에러

### 인증 에러 #에러
- 401: 인증 실패
- 403: 권한 없음
- 429: 요청 한도 초과

### 서버 에러 #에러
- 500: 내부 서버 오류
- 503: 서비스 불가

## 테스트 #테스트

### 단위 테스트 #테스트
\`\`\`typescript
describe('Auth API', () => {
  it('POST /api/auth/login - 성공', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
\`\`\`

### 통합 테스트 #테스트
\`\`\`typescript
describe('User API Integration', () => {
  it('GET /api/users - 성공', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer ' + token);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
\`\`\`

## 관련 문서 #가이드라인
- [사용자 가이드](user-guide.md) #가이드라인
- [설정 가이드](config-guide.md) #가이드라인
- [문제 해결](troubleshooting.md) #가이드라인`;

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
			expect(links.internal.length).toBe(3);
			expect(links.internal[0].path).toBe("user-guide.md");
			expect(links.internal[1].path).toBe("config-guide.md");
			expect(links.internal[2].path).toBe("troubleshooting.md");

			// 헤딩 검증
			expect(headings.length).toBe(15);
			expect(headings[0].text).toBe("API 문서");
			expect(headings[1].text).toBe("개요");
			expect(headings[2].text).toBe("인증 API");

			// 태그 검증
			expect(tags.length).toBe(24);
			const tagNames = tags.map((tag) => tag.name);
			expect(tagNames).toContain("#기능");
			expect(tagNames).toContain("#define");
			expect(tagNames).toContain("#예시");
			expect(tagNames).toContain("#요구사항");
			expect(tagNames).toContain("#에러");
			expect(tagNames).toContain("#테스트");
			expect(tagNames).toContain("#가이드라인");

			// 관계 검증
			expect(relationships.length).toBeGreaterThan(0);

			// 컨벤션 검증
			expect(conventions.categories).toBeDefined();
			expect(conventions.priorities).toBeDefined();

			console.log(`API 문서 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
			console.log(`- 관계: ${relationships.length}개`);
		});

		it("사용자 가이드 분석", async () => {
			const markdown = `# 사용자 가이드 #가이드라인

## 시작하기 #가이드라인

### 설치 방법 #가이드라인
1. Node.js 16+ 설치
2. 프로젝트 클론
3. 의존성 설치
4. 설정 파일 생성

### 기본 설정 #가이드라인
\`\`\`json
{
  "projectName": "my-project",
  "namespaces": {
    "source": {
      "files": ["src/**/*.ts"],
      "enabled": true
    }
  }
}
\`\`\`

## 사용법 #예시

### 기본 사용법 #예시
\`\`\`bash
# 프로젝트 분석
npm run analyze -- --pattern "src/**/*.ts"

# 특정 파일 분석
npm run analyze -- --file "src/main.ts"
\`\`\`

### 고급 사용법 #예시
\`\`\`bash
# 성능 최적화 분석
npm run analyze -- --pattern "src/**/*.ts" --performance

# 캐시 활용 분석
npm run analyze -- --pattern "src/**/*.ts" --cache
\`\`\`

## 설정 #가이드라인

### Namespace 설정 #가이드라인
각 namespace는 프로젝트의 논리적 그룹을 나타냅니다.

**기본 설정** #예시
\`\`\`json
{
  "namespaces": {
    "source": {
      "description": "소스 코드 분석",
      "files": ["src/**/*.ts", "src/**/*.js"],
      "enabled": true
    }
  }
}
\`\`\`

**고급 설정** #예시
\`\`\`json
{
  "namespaces": {
    "source": {
      "description": "소스 코드 분석",
      "files": ["src/**/*.ts", "src/**/*.js"],
      "enabled": true,
      "options": {
        "parallelProcessing": true,
        "maxConcurrency": 8,
        "batchSize": 50,
        "enableCache": true
      }
    }
  }
}
\`\`\`

## 문제 해결 #가이드라인

### 자주 발생하는 문제 #가이드라인

#### 메모리 부족 오류 #에러
**증상**: 메모리 부족 오류 발생
**해결 방법**: 
1. 배치 크기 줄이기
2. 메모리 제한 늘리기
3. 병렬 처리 수 줄이기

#### 처리 속도 문제 #개선
**증상**: 분석 속도가 느림
**해결 방법**:
1. 병렬 처리 활성화
2. 캐시 활용
3. 배치 크기 조정

## 관련 문서 #가이드라인
- [API 문서](api.md) #가이드라인
- [설정 가이드](config-guide.md) #가이드라인
- [문제 해결](troubleshooting.md) #가이드라인`;

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
			expect(links.internal.length).toBe(3);
			expect(links.internal[0].path).toBe("api.md");
			expect(links.internal[1].path).toBe("config-guide.md");
			expect(links.internal[2].path).toBe("troubleshooting.md");

			// 헤딩 검증
			expect(headings.length).toBe(18);
			expect(headings[0].text).toBe("사용자 가이드");
			expect(headings[1].text).toBe("시작하기");
			expect(headings[2].text).toBe("설치 방법");

			// 태그 검증
			expect(tags.length).toBe(19);
			const tagNames = tags.map((tag) => tag.name);
			expect(tagNames).toContain("#가이드라인");
			expect(tagNames).toContain("#예시");
			expect(tagNames).toContain("#에러");
			expect(tagNames).toContain("#개선");

			// 관계 검증
			expect(relationships.length).toBeGreaterThan(0);

			// 컨벤션 검증
			expect(conventions.categories).toBeDefined();
			expect(conventions.priorities).toBeDefined();

			console.log(`사용자 가이드 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
			console.log(`- 관계: ${relationships.length}개`);
		});
	});

	describe("태그 유형 검증 테스트", () => {
		it("명시적 태그 유형 검증", async () => {
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

			// 각 태그에 대해 검증 수행
			for (const tag of tags) {
				const validationResult = await tagTypeValidator.validateSingleTag(
					tag,
					markdown,
				);

				expect(validationResult).toBeDefined();
				expect(validationResult.isValid).toBeDefined();
				expect(validationResult.score).toBeDefined();
				expect(validationResult.suggestions).toBeDefined();

				console.log(`태그 ${tag.name} 검증 결과:`);
				console.log(`- 유효성: ${validationResult.isValid}`);
				console.log(`- 점수: ${validationResult.score}`);
				console.log(`- 제안: ${validationResult.suggestions.length}개`);
			}
		});

		it("태그 유형 문서 생성", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;

			const tags = await tagCollector.collectTags(
				markdown,
				"test-file.md",
				"test-project",
			);
			const validationResults = [];

			// 각 태그에 대해 검증 수행
			for (const tag of tags) {
				const validationResult = await tagTypeValidator.validateSingleTag(
					tag,
					markdown,
				);
				validationResults.push(validationResult);
			}

			// 태그 유형 문서 생성
			const document =
				await tagTypeDocumentGenerator.generateMarkdownDocumentation(
					validationResults,
				);

			expect(document).toBeDefined();
			expect(document).toBeDefined();
			expect(document.length).toBeGreaterThan(0);

			console.log(`태그 유형 문서 생성 완료:`);
			console.log(`- 내용 길이: ${document.length}자`);
		});
	});

	describe("성능 테스트", () => {
		it("대용량 마크다운 문서 분석", async () => {
			// 대용량 마크다운 문서 생성
			let markdown = "# 대용량 문서\n\n";

			for (let i = 1; i <= 100; i++) {
				markdown += `## 섹션 ${i} #기능\n`;
				markdown += `이것은 섹션 ${i}입니다.\n\n`;

				for (let j = 1; j <= 10; j++) {
					markdown += `### 하위 섹션 ${i}.${j} #예시\n`;
					markdown += `하위 섹션 ${i}.${j}의 내용입니다.\n\n`;
					markdown += `[링크 ${i}.${j}](file-${i}-${j}.md) #가이드라인\n\n`;
				}
			}

			const startTime = Date.now();

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

			const endTime = Date.now();
			const processingTime = endTime - startTime;

			// 결과 검증
			expect(links).toBeDefined();
			expect(headings).toBeDefined();
			expect(tags).toBeDefined();

			// 성능 검증
			expect(processingTime).toBeLessThan(5000); // 5초 이내

			console.log(`대용량 문서 분석 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
		});

		it("병렬 처리 성능 테스트", async () => {
			const markdowns = [];

			// 여러 개의 마크다운 문서 생성
			for (let i = 1; i <= 10; i++) {
				let markdown = `# 문서 ${i} #기능\n\n`;
				markdown += `## 섹션 1 #예시\n`;
				markdown += `## 섹션 2 #요구사항\n`;
				markdown += `[링크](file-${i}.md) #가이드라인\n`;
				markdowns.push(markdown);
			}

			const startTime = Date.now();

			// 병렬 처리
			const promises = markdowns.map(async (markdown, index) => {
				// 임시 파일 생성
				const tempFilePath = path.join(__dirname, `temp-test-file-${index}.md`);
				await fs.promises.writeFile(tempFilePath, markdown);

				const links = await linkTracker.trackLinks(
					tempFilePath,
					"test-project",
				);
				const headings = await headingExtractor.extractHeadings(markdown);
				const tags = await tagCollector.collectTags(
					markdown,
					"test-file.md",
					"test-project",
				);

				// 임시 파일 삭제
				await fs.promises.unlink(tempFilePath);

				return { links, headings, tags };
			});

			const results = await Promise.all(promises);

			const endTime = Date.now();
			const processingTime = endTime - startTime;

			// 결과 검증
			expect(results).toBeDefined();
			expect(results.length).toBe(10);

			// 성능 검증
			expect(processingTime).toBeLessThan(3000); // 3초 이내

			console.log(`병렬 처리 성능 테스트 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(`- 처리된 문서: ${results.length}개`);
		});
	});
});
