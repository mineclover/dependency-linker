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
const MarkdownHeadingExtractor_1 = require("../src/parsers/markdown/MarkdownHeadingExtractor");
const MarkdownTagCollector_1 = require("../src/parsers/markdown/MarkdownTagCollector");
const MarkdownTagHeadingMapper_1 = require("../src/parsers/markdown/MarkdownTagHeadingMapper");
const MarkdownTagConventionManager_1 = require("../src/parsers/markdown/MarkdownTagConventionManager");
const MarkdownTagDocumentGenerator_1 = require("../src/parsers/markdown/MarkdownTagDocumentGenerator");
const MarkdownTagTypeValidator_1 = require("../src/parsers/markdown/MarkdownTagTypeValidator");
const MarkdownTagTypeDocumentationGenerator_1 = require("../src/parsers/markdown/MarkdownTagTypeDocumentationGenerator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, globals_1.describe)("마크다운 분석 통합 테스트", () => {
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
		parser = new MarkdownParser_1.MarkdownParser();
		linkTracker = new MarkdownLinkTracker_1.MarkdownLinkTracker();
		headingExtractor =
			new MarkdownHeadingExtractor_1.MarkdownHeadingExtractor();
		tagCollector = new MarkdownTagCollector_1.MarkdownTagCollector();
		tagHeadingMapper =
			new MarkdownTagHeadingMapper_1.MarkdownTagHeadingMapper();
		tagConventionManager =
			new MarkdownTagConventionManager_1.MarkdownTagConventionManager();
		tagDocumentGenerator =
			new MarkdownTagDocumentGenerator_1.MarkdownTagDocumentGenerator();
		tagTypeValidator =
			new MarkdownTagTypeValidator_1.MarkdownTagTypeValidator();
		tagTypeDocumentGenerator =
			new MarkdownTagTypeDocumentationGenerator_1.MarkdownTagTypeDocumentationGenerator();
	});
	(0, globals_1.afterAll)(() => {});
	(0, globals_1.describe)("실제 프로젝트 문서 분석", () => {
		(0, globals_1.it)("README.md 분석", async () => {
			const readmePath = path.join(__dirname, "../README.md");
			if (!fs.existsSync(readmePath)) {
				console.log("README.md 파일이 없습니다. 테스트를 건너뜁니다.");
				return;
			}
			const markdown = fs.readFileSync(readmePath, "utf-8");
			const links = await linkTracker.trackLinks(markdown);
			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(markdown);
			(0, globals_1.expect)(links).toBeDefined();
			(0, globals_1.expect)(headings).toBeDefined();
			(0, globals_1.expect)(tags).toBeDefined();
			console.log(`README.md 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
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
				.slice(0, 5);
			for (const file of files) {
				const filePath = path.join(docsPath, file);
				const markdown = fs.readFileSync(filePath, "utf-8");
				const links = await linkTracker.trackLinks(markdown);
				const headings = await headingExtractor.extractHeadings(markdown);
				const tags = await tagCollector.collectTags(markdown);
				(0, globals_1.expect)(links).toBeDefined();
				(0, globals_1.expect)(headings).toBeDefined();
				(0, globals_1.expect)(tags).toBeDefined();
				console.log(`${file} 분석 결과:`);
				console.log(
					`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
				);
				console.log(`- 헤딩: ${headings.length}개`);
				console.log(`- 태그: ${tags.length}개`);
			}
		});
	});
	(0, globals_1.describe)("복잡한 마크다운 문서 분석", () => {
		(0, globals_1.it)("API 문서 분석", async () => {
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
			const links = await linkTracker.trackLinks(markdown);
			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(markdown);
			const relationships = await tagHeadingMapper.mapTagHeadingRelationships(
				headings,
				tags,
			);
			const conventions = await tagConventionManager.analyzeTags(tags);
			(0, globals_1.expect)(links).toBeDefined();
			(0, globals_1.expect)(headings).toBeDefined();
			(0, globals_1.expect)(tags).toBeDefined();
			(0, globals_1.expect)(relationships).toBeDefined();
			(0, globals_1.expect)(conventions).toBeDefined();
			(0, globals_1.expect)(links.internal.length).toBe(3);
			(0, globals_1.expect)(links.internal[0].path).toBe("user-guide.md");
			(0, globals_1.expect)(links.internal[1].path).toBe("config-guide.md");
			(0, globals_1.expect)(links.internal[2].path).toBe("troubleshooting.md");
			(0, globals_1.expect)(headings.length).toBe(12);
			(0, globals_1.expect)(headings[0].text).toBe("API 문서");
			(0, globals_1.expect)(headings[1].text).toBe("개요");
			(0, globals_1.expect)(headings[2].text).toBe("인증 API");
			(0, globals_1.expect)(tags.length).toBe(20);
			const tagNames = tags.map((tag) => tag.name);
			(0, globals_1.expect)(tagNames).toContain("#기능");
			(0, globals_1.expect)(tagNames).toContain("#define");
			(0, globals_1.expect)(tagNames).toContain("#예시");
			(0, globals_1.expect)(tagNames).toContain("#요구사항");
			(0, globals_1.expect)(tagNames).toContain("#에러");
			(0, globals_1.expect)(tagNames).toContain("#테스트");
			(0, globals_1.expect)(tagNames).toContain("#가이드라인");
			(0, globals_1.expect)(relationships.length).toBeGreaterThan(0);
			(0, globals_1.expect)(conventions.categories).toBeDefined();
			(0, globals_1.expect)(conventions.priorities).toBeDefined();
			console.log(`API 문서 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
			console.log(`- 관계: ${relationships.length}개`);
		});
		(0, globals_1.it)("사용자 가이드 분석", async () => {
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
			const links = await linkTracker.trackLinks(markdown);
			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(markdown);
			const relationships = await tagHeadingMapper.mapTagHeadingRelationships(
				headings,
				tags,
			);
			const conventions = await tagConventionManager.analyzeTags(tags);
			(0, globals_1.expect)(links).toBeDefined();
			(0, globals_1.expect)(headings).toBeDefined();
			(0, globals_1.expect)(tags).toBeDefined();
			(0, globals_1.expect)(relationships).toBeDefined();
			(0, globals_1.expect)(conventions).toBeDefined();
			(0, globals_1.expect)(links.internal.length).toBe(3);
			(0, globals_1.expect)(links.internal[0].path).toBe("api.md");
			(0, globals_1.expect)(links.internal[1].path).toBe("config-guide.md");
			(0, globals_1.expect)(links.internal[2].path).toBe("troubleshooting.md");
			(0, globals_1.expect)(headings.length).toBe(12);
			(0, globals_1.expect)(headings[0].text).toBe("사용자 가이드");
			(0, globals_1.expect)(headings[1].text).toBe("시작하기");
			(0, globals_1.expect)(headings[2].text).toBe("설치 방법");
			(0, globals_1.expect)(tags.length).toBe(15);
			const tagNames = tags.map((tag) => tag.name);
			(0, globals_1.expect)(tagNames).toContain("#가이드라인");
			(0, globals_1.expect)(tagNames).toContain("#예시");
			(0, globals_1.expect)(tagNames).toContain("#에러");
			(0, globals_1.expect)(tagNames).toContain("#개선");
			(0, globals_1.expect)(relationships.length).toBeGreaterThan(0);
			(0, globals_1.expect)(conventions.categories).toBeDefined();
			(0, globals_1.expect)(conventions.priorities).toBeDefined();
			console.log(`사용자 가이드 분석 결과:`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
			console.log(`- 관계: ${relationships.length}개`);
		});
	});
	(0, globals_1.describe)("태그 유형 검증 테스트", () => {
		(0, globals_1.it)("명시적 태그 유형 검증", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항
## 사용자 시나리오 #시나리오
## 개선 사항 #개선
## TODO #todo
## 테스트 케이스 #테스트
## 에러 유형 #에러`;
			const tags = await tagCollector.collectTags(markdown);
			for (const tag of tags) {
				const validationResult = await tagTypeValidator.validateSingleTag(
					tag,
					markdown,
				);
				(0, globals_1.expect)(validationResult).toBeDefined();
				(0, globals_1.expect)(validationResult.isValid).toBeDefined();
				(0, globals_1.expect)(validationResult.score).toBeDefined();
				(0, globals_1.expect)(validationResult.suggestions).toBeDefined();
				console.log(`태그 ${tag.name} 검증 결과:`);
				console.log(`- 유효성: ${validationResult.isValid}`);
				console.log(`- 점수: ${validationResult.score}`);
				console.log(`- 제안: ${validationResult.suggestions.length}개`);
			}
		});
		(0, globals_1.it)("태그 유형 문서 생성", async () => {
			const markdown = `# 기능 정의 #기능
## 사용 예시 #예시
## 요구사항 #요구사항`;
			const tags = await tagCollector.collectTags(markdown);
			const validationResults = [];
			for (const tag of tags) {
				const validationResult = await tagTypeValidator.validateSingleTag(
					tag,
					markdown,
				);
				validationResults.push(validationResult);
			}
			const document =
				await tagTypeDocumentGenerator.generateMarkdownDocumentation(
					validationResults,
				);
			(0, globals_1.expect)(document).toBeDefined();
			(0, globals_1.expect)(document.content).toBeDefined();
			(0, globals_1.expect)(document.content.length).toBeGreaterThan(0);
			console.log(`태그 유형 문서 생성 완료:`);
			console.log(`- 내용 길이: ${document.content.length}자`);
		});
	});
	(0, globals_1.describe)("성능 테스트", () => {
		(0, globals_1.it)("대용량 마크다운 문서 분석", async () => {
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
			const links = await linkTracker.trackLinks(markdown);
			const headings = await headingExtractor.extractHeadings(markdown);
			const tags = await tagCollector.collectTags(markdown);
			const endTime = Date.now();
			const processingTime = endTime - startTime;
			(0, globals_1.expect)(links).toBeDefined();
			(0, globals_1.expect)(headings).toBeDefined();
			(0, globals_1.expect)(tags).toBeDefined();
			(0, globals_1.expect)(processingTime).toBeLessThan(5000);
			console.log(`대용량 문서 분석 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(
				`- 링크: ${links.internal.length + links.external.length + links.anchor.length}개`,
			);
			console.log(`- 헤딩: ${headings.length}개`);
			console.log(`- 태그: ${tags.length}개`);
		});
		(0, globals_1.it)("병렬 처리 성능 테스트", async () => {
			const markdowns = [];
			for (let i = 1; i <= 10; i++) {
				let markdown = `# 문서 ${i} #기능\n\n`;
				markdown += `## 섹션 1 #예시\n`;
				markdown += `## 섹션 2 #요구사항\n`;
				markdown += `[링크](file-${i}.md) #가이드라인\n`;
				markdowns.push(markdown);
			}
			const startTime = Date.now();
			const promises = markdowns.map(async (markdown) => {
				const links = await linkTracker.trackLinks(markdown);
				const headings = await headingExtractor.extractHeadings(markdown);
				const tags = await tagCollector.collectTags(markdown);
				return { links, headings, tags };
			});
			const results = await Promise.all(promises);
			const endTime = Date.now();
			const processingTime = endTime - startTime;
			(0, globals_1.expect)(results).toBeDefined();
			(0, globals_1.expect)(results.length).toBe(10);
			(0, globals_1.expect)(processingTime).toBeLessThan(3000);
			console.log(`병렬 처리 성능 테스트 결과:`);
			console.log(`- 처리 시간: ${processingTime}ms`);
			console.log(`- 처리된 문서: ${results.length}개`);
		});
	});
});
//# sourceMappingURL=markdown-analysis-integration.test.js.map
