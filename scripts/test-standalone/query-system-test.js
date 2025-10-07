#!/usr/bin/env node

/**
 * Query System 테스트 스크립트
 * Jest 환경과 분리하여 독립적으로 실행
 */

const { analyzeFile } = require("../../dist/api/analysis.js");
const fs = require("fs");
const path = require("path");

console.log("=== Query System 테스트 스크립트 ===");
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 파일들
const testFiles = [
	{
		name: "TypeScript - Simple Class",
		filePath: "tests/fixtures/test-project/UserService.ts",
		expectedQueries: ["imports", "exports", "classes", "interfaces"],
	},
	{
		name: "TypeScript - Complex Component",
		filePath: "tests/fixtures/test-project/MyComponent.tsx",
		expectedQueries: [
			"imports",
			"exports",
			"classes",
			"interfaces",
			"functions",
		],
	},
];

// 테스트 파일 생성
function createTestFiles() {
	const testProjectDir = path.join(
		process.cwd(),
		"tests/fixtures/test-project",
	);

	if (!fs.existsSync(testProjectDir)) {
		fs.mkdirSync(testProjectDir, { recursive: true });
	}

	// UserService.ts
	const userServiceContent = `
export class UserService {
    private users: User[] = [];

    constructor() {
        this.users = [];
    }

    async getUser(id: string): Promise<User | null> {
        return this.users.find((user) => user.id === id) || null;
    }

    async createUser(userData: CreateUserRequest): Promise<User> {
        const user: User = {
            id: Math.random().toString(36).substr(2, 9),
            ...userData,
            createdAt: new Date(),
        };
        this.users.push(user);
        return user;
    }
}

export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

export interface CreateUserRequest {
    name: string;
    email: string;
}
`;

	fs.writeFileSync(
		path.join(testProjectDir, "UserService.ts"),
		userServiceContent,
	);

	// MyComponent.tsx
	const myComponentContent = `
import React from 'react';
import { useState, useEffect } from 'react';

export const MyComponent = () => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        console.log('Count changed:', count);
    }, [count]);
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
};

export default MyComponent;
`;

	fs.writeFileSync(
		path.join(testProjectDir, "MyComponent.tsx"),
		myComponentContent,
	);
}

// Query System 테스트 실행 함수
async function runQueryTest(testFile) {
	console.log(`\n--- ${testFile.name} ---`);

	try {
		const filePath = path.join(process.cwd(), testFile.filePath);

		if (!fs.existsSync(filePath)) {
			console.log("❌ 테스트 파일이 없습니다:", filePath);
			return { success: false, error: "Test file not found" };
		}

		const sourceCode = fs.readFileSync(filePath, "utf8");
		console.log("✅ 파일 읽기 성공");
		console.log("  file size:", sourceCode.length, "bytes");

		// 파일 확장자 기반 언어 감지
		const fileExtension = path.extname(filePath).toLowerCase();
		let language = "unknown";

		if (fileExtension === ".ts" || fileExtension === ".tsx") {
			language = "typescript";
		} else if (fileExtension === ".js" || fileExtension === ".jsx") {
			language = "javascript";
		} else if (fileExtension === ".java") {
			language = "java";
		} else if (fileExtension === ".py") {
			language = "python";
		} else if (fileExtension === ".go") {
			language = "go";
		}

		console.log("  detected language:", language);

		const result = await analyzeFile(sourceCode, language, filePath);
		console.log("✅ 분석 완료");
		console.log("  language:", result.language);
		console.log("  parseTime:", result.parseMetadata?.parseTime, "ms");
		console.log("  nodeCount:", result.parseMetadata?.nodeCount);

		// Query 결과 확인
		const queryResults = result.queryResults || {};
		const queryKeys = Object.keys(queryResults);
		console.log("  query keys:", queryKeys);

		// 각 쿼리 결과 확인
		for (const queryKey of testFile.expectedQueries) {
			const queryResult = queryResults[queryKey];
			if (queryResult && Array.isArray(queryResult)) {
				console.log(`  ${queryKey}: ${queryResult.length} results`);
			} else {
				console.log(`  ${queryKey}: no results`);
			}
		}

		return { success: true, error: null, result };
	} catch (error) {
		console.log("❌ Query System 테스트 실패");
		console.log("  error:", error.message);
		console.log("  stack:", error.stack);
		return { success: false, error: error.message };
	}
}

// 메인 실행 함수
async function main() {
	console.log("\n=== Query System 테스트 시작 ===");

	// 테스트 파일 생성
	createTestFiles();
	console.log("✅ 테스트 파일 생성 완료");

	const results = [];

	for (const testFile of testFiles) {
		const result = await runQueryTest(testFile);
		results.push({
			name: testFile.name,
			filePath: testFile.filePath,
			...result,
		});
	}

	console.log("\n=== Query System 테스트 결과 요약 ===");
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
