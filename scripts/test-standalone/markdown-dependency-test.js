#!/usr/bin/env node

/**
 * 마크다운 의존성 부여 방식 테스트 스크립트
 *
 * 마크다운 파일의 다양한 의존성 부여 방식을 테스트합니다:
 * - 표준 링크: [text](path)
 * - 이미지 참조: ![alt](path)
 * - 위키 링크: [[path]] 또는 [[path|text]]
 * - 심볼 참조: @ClassName 또는 @function()
 * - 코드 블록 참조: ```language:filepath
 * - 파일 포함 지시어: <!-- include:path -->
 * - 앵커 링크: [text](#anchor)
 * - 해시태그: #tag 또는 #태그
 */

const {
	extractMarkdownDependencies,
} = require("../../dist/core/MarkdownDependencyExtractor.js");
const {
	markdownFileToGraph,
} = require("../../dist/integration/MarkdownToGraph.js");
const { GraphDatabase } = require("../../dist/database/GraphDatabase.js");
const fs = require("fs");
const path = require("path");

console.log("=== 마크다운 의존성 부여 방식 테스트 스크립트 ===");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 마크다운 파일들
const testMarkdownFiles = [
	{
		name: "기본 마크다운 의존성",
		filePath: "tests/fixtures/markdown/basic-dependencies.md",
		expectedDependencies: [
			{ type: "link", to: "README.md", text: "프로젝트 문서" },
			{ type: "image", to: "images/logo.png", text: "로고" },
			{ type: "wikilink", to: "UserGuide", text: "사용자 가이드" },
			{ type: "symbol-reference", to: "UserService", text: "UserService" },
			{ type: "hashtag", to: "#frontend", text: "frontend" },
		],
	},
	{
		name: "고급 마크다운 의존성",
		filePath: "tests/fixtures/markdown/advanced-dependencies.md",
		expectedDependencies: [
			{ type: "code-block-reference", to: "src/UserService.ts" },
			{ type: "include", to: "sections/api-reference.md" },
			{ type: "anchor", to: "#api-reference", text: "API 참조" },
			{ type: "hashtag", to: "#backend", text: "backend" },
		],
	},
	{
		name: "외부 링크 의존성",
		filePath: "tests/fixtures/markdown/external-dependencies.md",
		expectedDependencies: [
			{
				type: "link",
				to: "https://github.com/user/repo",
				text: "GitHub 저장소",
			},
			{ type: "link", to: "https://docs.example.com", text: "문서" },
			{
				type: "image",
				to: "https://example.com/image.png",
				text: "외부 이미지",
			},
		],
	},
];

// 테스트 마크다운 파일 생성
function createTestMarkdownFiles() {
	const markdownDir = path.join(process.cwd(), "tests/fixtures/markdown");

	if (!fs.existsSync(markdownDir)) {
		fs.mkdirSync(markdownDir, { recursive: true });
	}

	// 기본 마크다운 의존성 파일
	const basicDependenciesContent = `---
title: "기본 마크다운 의존성 테스트"
tags: [frontend, documentation]
---

# 기본 마크다운 의존성 테스트

이 문서는 마크다운의 기본적인 의존성 부여 방식을 테스트합니다.

## 링크 의존성

- [프로젝트 문서](README.md) - 표준 마크다운 링크
- ![로고](images/logo.png) - 이미지 참조
- [[UserGuide]] - 위키 스타일 링크
- [[UserGuide|사용자 가이드]] - 위키 스타일 링크 (텍스트 포함)

## 심볼 참조

- @UserService - 클래스 참조
- @UserService.getUser() - 메서드 참조
- @UserService.createUser() - 메서드 참조

## 해시태그

- #frontend - 프론트엔드 관련
- #documentation - 문서 관련
- #테스트 - 한국어 해시태그

## 앵커 링크

- [설치](#installation) - 내부 앵커 링크
- [사용법](#usage) - 내부 앵커 링크

## 설치 {#installation}

설치 방법은 다음과 같습니다.

## 사용법 {#usage}

사용법은 다음과 같습니다.
`;

	fs.writeFileSync(
		path.join(markdownDir, "basic-dependencies.md"),
		basicDependenciesContent,
	);

	// 고급 마크다운 의존성 파일
	const advancedDependenciesContent = `---
title: "고급 마크다운 의존성 테스트"
tags: [backend, api]
---

# 고급 마크다운 의존성 테스트

이 문서는 마크다운의 고급 의존성 부여 방식을 테스트합니다.

## 코드 블록 참조

\`\`\`typescript:src/UserService.ts
export class UserService {
    async getUser(id: string): Promise<User | null> {
        return this.users.find(user => user.id === id) || null;
    }
}
\`\`\`

## 파일 포함 지시어

<!-- include:sections/api-reference.md -->

## 해시태그

- #backend - 백엔드 관련
- #api - API 관련
- #데이터베이스 - 데이터베이스 관련

## 앵커 링크

- [API 참조](#api-reference) - 내부 앵커 링크
- [데이터베이스](#database) - 내부 앵커 링크

## API 참조 {#api-reference}

API 참조는 다음과 같습니다.

## 데이터베이스 {#database}

데이터베이스 설정은 다음과 같습니다.
`;

	fs.writeFileSync(
		path.join(markdownDir, "advanced-dependencies.md"),
		advancedDependenciesContent,
	);

	// 외부 링크 의존성 파일
	const externalDependenciesContent = `---
title: "외부 링크 의존성 테스트"
tags: [external, links]
---

# 외부 링크 의존성 테스트

이 문서는 외부 링크 의존성을 테스트합니다.

## 외부 링크

- [GitHub 저장소](https://github.com/user/repo) - 외부 GitHub 링크
- [문서](https://docs.example.com) - 외부 문서 링크
- ![외부 이미지](https://example.com/image.png) - 외부 이미지

## 해시태그

- #external - 외부 관련
- #links - 링크 관련
`;

	fs.writeFileSync(
		path.join(markdownDir, "external-dependencies.md"),
		externalDependenciesContent,
	);

	console.log("✅ 테스트 마크다운 파일 생성 완료");
}

// 마크다운 의존성 추출 테스트
async function testMarkdownDependencyExtraction(testFile) {
	console.log(`\n--- ${testFile.name} ---`);

	try {
		const filePath = path.join(process.cwd(), testFile.filePath);

		if (!fs.existsSync(filePath)) {
			console.log("❌ 테스트 파일이 없습니다:", filePath);
			return { success: false, error: "Test file not found" };
		}

		const content = fs.readFileSync(filePath, "utf8");
		console.log("✅ 파일 읽기 성공");
		console.log("  file size:", content.length, "bytes");

		// 마크다운 의존성 추출
		const result = extractMarkdownDependencies(filePath, content);
		console.log("✅ 의존성 추출 완료");
		console.log("  dependencies count:", result.dependencies.length);
		console.log("  headings count:", result.headings.length);
		console.log("  frontMatter:", result.frontMatter ? "있음" : "없음");

		// 의존성 타입별 분석
		const dependencyTypes = {};
		result.dependencies.forEach((dep) => {
			dependencyTypes[dep.type] = (dependencyTypes[dep.type] || 0) + 1;
		});
		console.log("  dependency types:", dependencyTypes);

		// 예상 의존성과 비교
		const foundDependencies = [];
		const missingDependencies = [];

		testFile.expectedDependencies.forEach((expected) => {
			const found = result.dependencies.find(
				(dep) => dep.type === expected.type && dep.to === expected.to,
			);
			if (found) {
				foundDependencies.push(expected);
			} else {
				missingDependencies.push(expected);
			}
		});

		console.log("  found dependencies:", foundDependencies.length);
		console.log("  missing dependencies:", missingDependencies.length);

		if (missingDependencies.length > 0) {
			console.log("  missing:", missingDependencies);
		}

		return {
			success: missingDependencies.length === 0,
			error: missingDependencies.length > 0 ? "Missing dependencies" : null,
			result,
		};
	} catch (error) {
		console.log("❌ 마크다운 의존성 추출 실패");
		console.log("  error:", error.message);
		console.log("  stack:", error.stack);
		return { success: false, error: error.message };
	}
}

// 그래프 데이터베이스 통합 테스트
async function testMarkdownGraphIntegration(testFile) {
	console.log(`\n--- ${testFile.name} (Graph Integration) ---`);

	try {
		const filePath = path.join(process.cwd(), testFile.filePath);
		const content = fs.readFileSync(filePath, "utf8");

		// 임시 데이터베이스 생성
		const tempDbPath = path.join(process.cwd(), "temp-markdown-test.db");
		const db = new GraphDatabase(tempDbPath);
		await db.initialize();

		// 마크다운을 그래프로 변환
		const graphResult = await markdownFileToGraph(db, filePath, {
			createMissingNodes: true,
			skipExternalUrls: false,
		});

		console.log("✅ 그래프 변환 완료");
		console.log("  nodes created:", graphResult.nodesCreated);
		console.log("  relationships created:", graphResult.relationshipsCreated);

		// 데이터베이스 정리
		await db.close();
		fs.unlinkSync(tempDbPath);

		return {
			success: true,
			error: null,
			result: graphResult,
		};
	} catch (error) {
		console.log("❌ 그래프 통합 테스트 실패");
		console.log("  error:", error.message);
		console.log("  stack:", error.stack);
		return { success: false, error: error.message };
	}
}

// 메인 실행 함수
async function main() {
	console.log("\n=== 마크다운 의존성 테스트 시작 ===");

	// 테스트 파일 생성
	createTestMarkdownFiles();

	const results = [];

	// 각 테스트 파일에 대해 의존성 추출 테스트
	for (const testFile of testMarkdownFiles) {
		const extractionResult = await testMarkdownDependencyExtraction(testFile);
		results.push({
			name: testFile.name,
			test: "dependency-extraction",
			...extractionResult,
		});

		// 그래프 통합 테스트
		const graphResult = await testMarkdownGraphIntegration(testFile);
		results.push({
			name: testFile.name,
			test: "graph-integration",
			...graphResult,
		});
	}

	console.log("\n=== 마크다운 의존성 테스트 결과 요약 ===");
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
				console.log(`  - ${r.name} (${r.test}): ${r.error}`);
			});
	}

	// 테스트 파일 정리
	const markdownDir = path.join(process.cwd(), "tests/fixtures/markdown");
	if (fs.existsSync(markdownDir)) {
		fs.rmSync(markdownDir, { recursive: true, force: true });
		console.log("✅ 테스트 파일 정리 완료");
	}

	process.exit(failureCount > 0 ? 1 : 0);
}

// 실행
main().catch(console.error);
