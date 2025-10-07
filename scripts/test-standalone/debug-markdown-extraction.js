#!/usr/bin/env node

/**
 * 마크다운 의존성 추출 디버깅 스크립트
 *
 * 마크다운 의존성 추출 과정을 단계별로 디버깅합니다.
 */

const {
	extractMarkdownDependencies,
} = require("../../dist/core/MarkdownDependencyExtractor.js");
const { MARKDOWN_PATTERNS } = require("../../dist/core/markdown-types.js");
const fs = require("fs");
const path = require("path");

console.log("=== 마크다운 의존성 추출 디버깅 스크립트 ===");

// 테스트 마크다운 내용
const testMarkdown = `---
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

// 패턴별 테스트
function testPatterns() {
	console.log("\n=== 패턴별 테스트 ===");

	const lines = testMarkdown.split("\n");

	// 링크 패턴 테스트
	console.log("\n--- 링크 패턴 테스트 ---");
	MARKDOWN_PATTERNS.LINK.lastIndex = 0;
	const linkMatches = Array.from(testMarkdown.matchAll(MARKDOWN_PATTERNS.LINK));
	console.log("링크 매치 수:", linkMatches.length);
	linkMatches.forEach((match, index) => {
		console.log(`  ${index + 1}. [${match[1]}](${match[2]})`);
	});

	// 심볼 참조 패턴 테스트
	console.log("\n--- 심볼 참조 패턴 테스트 ---");
	MARKDOWN_PATTERNS.SYMBOL_REF.lastIndex = 0;
	const symbolMatches = Array.from(
		testMarkdown.matchAll(MARKDOWN_PATTERNS.SYMBOL_REF),
	);
	console.log("심볼 참조 매치 수:", symbolMatches.length);
	symbolMatches.forEach((match, index) => {
		console.log(`  ${index + 1}. @${match[1]}`);
	});

	// 해시태그 패턴 테스트
	console.log("\n--- 해시태그 패턴 테스트 ---");
	MARKDOWN_PATTERNS.HASHTAG.lastIndex = 0;
	const hashtagMatches = Array.from(
		testMarkdown.matchAll(MARKDOWN_PATTERNS.HASHTAG),
	);
	console.log("해시태그 매치 수:", hashtagMatches.length);
	hashtagMatches.forEach((match, index) => {
		console.log(`  ${index + 1}. #${match[1]}`);
	});

	// 위키 링크 패턴 테스트
	console.log("\n--- 위키 링크 패턴 테스트 ---");
	MARKDOWN_PATTERNS.WIKI_LINK.lastIndex = 0;
	const wikiMatches = Array.from(
		testMarkdown.matchAll(MARKDOWN_PATTERNS.WIKI_LINK),
	);
	console.log("위키 링크 매치 수:", wikiMatches.length);
	wikiMatches.forEach((match, index) => {
		console.log(
			`  ${index + 1}. [[${match[1]}${match[2] ? `|${match[2]}` : ""}]]`,
		);
	});
}

// 실제 추출 테스트
function testExtraction() {
	console.log("\n=== 실제 추출 테스트 ===");

	try {
		const result = extractMarkdownDependencies("test.md", testMarkdown);

		console.log("추출 결과:");
		console.log("  dependencies count:", result.dependencies.length);
		console.log("  headings count:", result.headings.length);
		console.log("  frontMatter:", result.frontMatter ? "있음" : "없음");

		// 의존성 타입별 분석
		const dependencyTypes = {};
		result.dependencies.forEach((dep) => {
			dependencyTypes[dep.type] = (dependencyTypes[dep.type] || 0) + 1;
		});
		console.log("  dependency types:", dependencyTypes);

		// 각 의존성 상세 출력
		console.log("\n--- 추출된 의존성 상세 ---");
		result.dependencies.forEach((dep, index) => {
			console.log(
				`  ${index + 1}. [${dep.type}] ${dep.to} (line ${dep.location.line})`,
			);
			if (dep.text) {
				console.log(`      text: "${dep.text}"`);
			}
		});

		// 예상 의존성과 비교
		const expectedDependencies = [
			{ type: "link", to: "README.md", text: "프로젝트 문서" },
			{ type: "image", to: "images/logo.png", text: "로고" },
			{ type: "wikilink", to: "UserGuide", text: "UserGuide" },
			{ type: "wikilink", to: "UserGuide", text: "사용자 가이드" },
			{ type: "symbol-reference", to: "UserService", text: "UserService" },
			{
				type: "symbol-reference",
				to: "UserService.getUser()",
				text: "UserService.getUser()",
			},
			{
				type: "symbol-reference",
				to: "UserService.createUser()",
				text: "UserService.createUser()",
			},
			{ type: "hashtag", to: "#frontend", text: "frontend" },
			{ type: "hashtag", to: "#documentation", text: "documentation" },
			{ type: "hashtag", to: "#테스트", text: "테스트" },
			{ type: "anchor", to: "#installation", text: "설치" },
			{ type: "anchor", to: "#usage", text: "사용법" },
		];

		console.log("\n--- 예상 의존성과 비교 ---");
		const foundDependencies = [];
		const missingDependencies = [];

		expectedDependencies.forEach((expected) => {
			const found = result.dependencies.find(
				(dep) => dep.type === expected.type && dep.to === expected.to,
			);
			if (found) {
				foundDependencies.push(expected);
			} else {
				missingDependencies.push(expected);
			}
		});

		console.log("찾은 의존성:", foundDependencies.length);
		console.log("누락된 의존성:", missingDependencies.length);

		if (missingDependencies.length > 0) {
			console.log("\n누락된 의존성:");
			missingDependencies.forEach((missing) => {
				console.log(`  - [${missing.type}] ${missing.to} (${missing.text})`);
			});
		}
	} catch (error) {
		console.log("❌ 추출 실패:", error.message);
		console.log("  stack:", error.stack);
	}
}

// 메인 실행
async function main() {
	testPatterns();
	testExtraction();
}

main().catch(console.error);
