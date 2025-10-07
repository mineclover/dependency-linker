#!/usr/bin/env node

/**
 * Tree-sitter 파싱 테스트 스크립트
 * Jest 환경과 분리하여 독립적으로 실행
 */

const Parser = require("tree-sitter");
const TypeScript = require("tree-sitter-typescript");
const Java = require("tree-sitter-java");
const Python = require("tree-sitter-python");
const Go = require("tree-sitter-go");

console.log("=== Tree-sitter 파싱 테스트 스크립트 ===");
console.log(
	"Tree-sitter version:",
	require("tree-sitter/package.json").version,
);
console.log("Node.js version:", process.version);
console.log("Platform:", process.platform);

// 테스트 케이스들
const testCases = [
	{
		name: "TypeScript - Simple Class",
		language: "typescript",
		parser: () => {
			const parser = new Parser();
			parser.setLanguage(TypeScript.typescript);
			return parser;
		},
		sourceCode: `
export class UserService {
    private users: User[] = [];

    async getUser(id: string): Promise<User | null> {
        return this.users.find(user => user.id === id) || null;
    }
}

export interface User {
    id: string;
    name: string;
    email: string;
}
`,
	},
	{
		name: "TypeScript - Complex Component",
		language: "typescript",
		parser: () => {
			const parser = new Parser();
			parser.setLanguage(TypeScript.typescript);
			return parser;
		},
		sourceCode: `
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
`,
	},
	{
		name: "Java - Simple Class",
		language: "java",
		parser: () => {
			const parser = new Parser();
			parser.setLanguage(Java);
			return parser;
		},
		sourceCode: `
public class UserService {
    private List<User> users = new ArrayList<>();
    
    public User getUser(String id) {
        return users.stream()
            .filter(user -> user.getId().equals(id))
            .findFirst()
            .orElse(null);
    }
}
`,
	},
	{
		name: "Python - Simple Class",
		language: "python",
		parser: () => {
			const parser = new Parser();
			parser.setLanguage(Python);
			return parser;
		},
		sourceCode: `
class UserService:
    def __init__(self):
        self.users = []
    
    def get_user(self, user_id):
        return next((user for user in self.users if user.id == user_id), None)
`,
	},
	{
		name: "Go - Simple Struct",
		language: "go",
		parser: () => {
			const parser = new Parser();
			parser.setLanguage(Go);
			return parser;
		},
		sourceCode: `
package main

type UserService struct {
    users []User
}

func (s *UserService) GetUser(id string) *User {
    for _, user := range s.users {
        if user.ID == id {
            return &user
        }
    }
    return nil
}
`,
	},
];

// 테스트 실행 함수
async function runTest(testCase) {
	console.log(`\n--- ${testCase.name} ---`);

	try {
		const parser = testCase.parser();
		const tree = parser.parse(testCase.sourceCode);

		console.log("✅ 파싱 성공");
		console.log("  tree:", !!tree);
		console.log("  rootNode:", !!tree?.rootNode);
		console.log("  rootNode type:", tree?.rootNode?.type);
		console.log("  childCount:", tree?.rootNode?.childCount);
		console.log("  hasError:", tree?.rootNode?.hasError);

		if (tree?.rootNode) {
			console.log("  startPosition:", tree.rootNode.startPosition);
			console.log("  endPosition:", tree.rootNode.endPosition);
		}

		return { success: true, error: null };
	} catch (error) {
		console.log("❌ 파싱 실패");
		console.log("  error:", error.message);
		return { success: false, error: error.message };
	}
}

// 메인 실행 함수
async function main() {
	console.log("\n=== 테스트 시작 ===");

	const results = [];

	for (const testCase of testCases) {
		const result = await runTest(testCase);
		results.push({
			name: testCase.name,
			language: testCase.language,
			...result,
		});
	}

	console.log("\n=== 테스트 결과 요약 ===");
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
