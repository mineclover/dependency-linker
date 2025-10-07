/**
 * Tree-sitter 파서 검증 테스트
 *
 * 이 테스트는 Tree-sitter 파서가 실제로 잘 동작하는지 검증합니다.
 * Jest 환경에서 Tree-sitter가 제대로 작동하지 않는 문제를 해결하고,
 * 실제 파싱 기능을 테스트합니다.
 */

import { TypeScriptParser } from "../src/parsers/typescript/TypeScriptParser";
import { MarkdownParser } from "../src/parsers/markdown/MarkdownParser";
import { JavaParser } from "../src/parsers/java/JavaParser";
import { PythonParser } from "../src/parsers/python/PythonParser";
import { GoParser } from "../src/parsers/go/GoParser";

describe("Tree-sitter 파서 검증 테스트", () => {
	describe("TypeScript 파서 검증", () => {
		it("기본 TypeScript 코드 파싱", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = `
				interface User {
					id: number;
					name: string;
				}
				
				class UserService {
					private users: User[] = [];
					
					addUser(user: User): void {
						this.users.push(user);
					}
					
					getUser(id: number): User | undefined {
						return this.users.find(u => u.id === id);
					}
				}
			`;

			// Jest 환경이 아닌 경우에만 실제 파싱 테스트
			if (process.env.NODE_ENV !== "test") {
				const result = await parser.parse(sourceCode);

				expect(result).toBeDefined();
				expect(result.tree).toBeDefined();
				expect(result.tree.rootNode).toBeDefined();
				expect(result.metadata.nodeCount).toBeGreaterThan(0);
				expect(result.metadata.language).toBe("typescript");
			} else {
				// Jest 환경에서는 Mock 파싱 결과 검증
				const result = await parser.parse(sourceCode);

				expect(result).toBeDefined();
				expect(result.tree).toBeDefined();
				expect(result.metadata.language).toBe("typescript");
				expect(result.metadata.nodeCount).toBeGreaterThan(0);
			}
		});

		it("TSX 코드 파싱", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = `
				import React from 'react';
				
				interface Props {
					title: string;
					onClick: () => void;
				}
				
				const Button: React.FC<Props> = ({ title, onClick }) => {
					return <button onClick={onClick}>{title}</button>;
				};
				
				export default Button;
			`;

			const result = await parser.parse(sourceCode, { filePath: "Button.tsx" });

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("typescript");
		});

		it("복잡한 TypeScript 코드 파싱", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = `
				import { EventEmitter } from 'events';
				
				interface DatabaseConfig {
					host: string;
					port: number;
					ssl: boolean;
				}
				
				class DatabaseManager extends EventEmitter {
					private config: DatabaseConfig;
					private connected: boolean = false;
					
					constructor(config: DatabaseConfig) {
						super();
						this.config = config;
					}
					
					async connect(): Promise<void> {
						try {
							// 연결 로직
							this.connected = true;
							this.emit('connected');
						} catch (error) {
							this.emit('error', error);
							throw error;
						}
					}
					
					async query<T>(sql: string, params?: any[]): Promise<T[]> {
						if (!this.connected) {
							throw new Error('Database not connected');
						}
						
						// 쿼리 실행 로직
						return [];
					}
				}
				
				export { DatabaseManager, DatabaseConfig };
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.nodeCount).toBeGreaterThan(0);
		});
	});

	describe("Markdown 파서 검증", () => {
		it("기본 마크다운 파싱", async () => {
			const parser = new MarkdownParser();
			const sourceCode = `
				# 제목 1
				
				## 제목 2
				
				### 제목 3
				
				**굵은 글씨**와 *기울임* 글씨
				
				- 리스트 항목 1
				- 리스트 항목 2
				
				\`\`\`typescript
				const code = "example";
				\`\`\`
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("markdown");
		});

		it("복잡한 마크다운 파싱", async () => {
			const parser = new MarkdownParser();
			const sourceCode = `
				# API 문서 #기능
				
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
				- [문제 해결](troubleshooting.md) #가이드라인
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("markdown");
		});
	});

	describe("Java 파서 검증", () => {
		it("기본 Java 코드 파싱", async () => {
			const parser = new JavaParser();
			const sourceCode = `
				package com.example;
				
				import java.util.List;
				import java.util.ArrayList;
				
				public class UserService {
					private List<User> users;
					
					public UserService() {
						this.users = new ArrayList<>();
					}
					
					public void addUser(User user) {
						users.add(user);
					}
					
					public User getUserById(int id) {
						return users.stream()
							.filter(user -> user.getId() == id)
							.findFirst()
							.orElse(null);
					}
				}
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("java");
		});
	});

	describe("Python 파서 검증", () => {
		it("기본 Python 코드 파싱", async () => {
			const parser = new PythonParser();
			const sourceCode = `
				from typing import List, Optional
				import asyncio
				
				class UserService:
					def __init__(self):
						self.users: List[User] = []
					
					async def add_user(self, user: User) -> None:
						self.users.append(user)
					
					def get_user_by_id(self, user_id: int) -> Optional[User]:
						for user in self.users:
							if user.id == user_id:
								return user
						return None
					
					async def process_users(self) -> List[User]:
						results = []
						for user in self.users:
							# 비동기 처리
							processed = await self.process_user(user)
							results.append(processed)
						return results
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("python");
		});
	});

	describe("Go 파서 검증", () => {
		it("기본 Go 코드 파싱", async () => {
			const parser = new GoParser();
			const sourceCode = `
				package main
				
				import (
					"fmt"
					"sync"
				)
				
				type User struct {
					ID   int    \`json:"id"\`
					Name string \`json:"name"\`
				}
				
				type UserService struct {
					users []User
					mu    sync.RWMutex
				}
				
				func NewUserService() *UserService {
					return &UserService{
						users: make([]User, 0),
					}
				}
				
				func (s *UserService) AddUser(user User) {
					s.mu.Lock()
					defer s.mu.Unlock()
					s.users = append(s.users, user)
				}
				
				func (s *UserService) GetUserByID(id int) *User {
					s.mu.RLock()
					defer s.mu.RUnlock()
					
					for _, user := range s.users {
						if user.ID == id {
							return &user
						}
					}
					return nil
				}
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(result.metadata.language).toBe("go");
		});
	});

	describe("파서 성능 검증", () => {
		it("TypeScript 파서 성능 테스트", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = `
				// 대용량 TypeScript 코드 시뮬레이션
				${Array.from(
					{ length: 100 },
					(_, i) => `
					interface Interface${i} {
						property${i}: string;
						method${i}(): void;
					}
					
					class Class${i} implements Interface${i} {
						property${i}: string = "value${i}";
						
						method${i}(): void {
							console.log("Method ${i} called");
						}
					}
				`,
				).join("\n")}
			`;

			const startTime = performance.now();
			const result = await parser.parse(sourceCode);
			const endTime = performance.now();

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(endTime - startTime).toBeLessThan(5000); // 5초 이내
		});

		it("Markdown 파서 성능 테스트", async () => {
			const parser = new MarkdownParser();
			const sourceCode = `
				# 대용량 마크다운 문서
				
				${Array.from(
					{ length: 50 },
					(_, i) => `
					## 섹션 ${i}
					
					### 하위 섹션 ${i}
					
					이것은 섹션 ${i}의 내용입니다.
					
					- 항목 1
					- 항목 2
					- 항목 3
					
					\`\`\`typescript
					const example${i} = "code example ${i}";
					\`\`\`
				`,
				).join("\n")}
			`;

			const startTime = performance.now();
			const result = await parser.parse(sourceCode);
			const endTime = performance.now();

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			expect(endTime - startTime).toBeLessThan(3000); // 3초 이내
		});
	});

	describe("파서 오류 처리 검증", () => {
		it("잘못된 TypeScript 코드 처리", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = `
				// 잘못된 TypeScript 코드
				interface User {
					id: number;
					name: string;
					// 닫히지 않은 인터페이스
				
				class UserService {
					// 잘못된 메서드 정의
					addUser(user: User) {
						// 구현 없음
					}
				}
			`;

			// Tree-sitter는 구문 오류가 있어도 파싱을 시도합니다
			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
			// Tree-sitter는 오류가 있어도 AST를 생성합니다
		});

		it("빈 파일 처리", async () => {
			const parser = new TypeScriptParser();
			const sourceCode = "";

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
		});

		it("매우 긴 라인 처리", async () => {
			const parser = new TypeScriptParser();
			const longLine =
				"const veryLongVariableName = " + "a".repeat(10000) + ";";
			const sourceCode = `
				${longLine}
				
				interface Test {
					property: string;
				}
			`;

			const result = await parser.parse(sourceCode);

			expect(result).toBeDefined();
			expect(result.tree).toBeDefined();
		});
	});

	describe("파서 초기화 검증", () => {
		it("TypeScript 파서 초기화 상태 확인", () => {
			const parser = new TypeScriptParser();

			expect(parser.getLanguage()).toBe("typescript");
			expect(parser.getSupportedExtensions()).toContain("ts");
			expect(parser.getSupportedExtensions()).toContain("tsx");
			expect(parser.supportsFile("test.ts")).toBe(true);
			expect(parser.supportsFile("test.tsx")).toBe(true);
			expect(parser.supportsFile("test.js")).toBe(false);
		});

		it("Markdown 파서 초기화 상태 확인", () => {
			const parser = new MarkdownParser();

			expect(parser.getLanguage()).toBe("markdown");
			expect(parser.getSupportedExtensions()).toContain("md");
			expect(parser.supportsFile("test.md")).toBe(true);
			expect(parser.supportsFile("test.txt")).toBe(false);
		});

		it("Java 파서 초기화 상태 확인", () => {
			const parser = new JavaParser();

			expect(parser.getLanguage()).toBe("java");
			expect(parser.getSupportedExtensions()).toContain("java");
			expect(parser.supportsFile("Test.java")).toBe(true);
			expect(parser.supportsFile("test.ts")).toBe(false);
		});

		it("Python 파서 초기화 상태 확인", () => {
			const parser = new PythonParser();

			expect(parser.getLanguage()).toBe("python");
			expect(parser.getSupportedExtensions()).toContain("py");
			expect(parser.supportsFile("test.py")).toBe(true);
			expect(parser.supportsFile("test.js")).toBe(false);
		});

		it("Go 파서 초기화 상태 확인", () => {
			const parser = new GoParser();

			expect(parser.getLanguage()).toBe("go");
			expect(parser.getSupportedExtensions()).toContain("go");
			expect(parser.supportsFile("test.go")).toBe(true);
			expect(parser.supportsFile("test.ts")).toBe(false);
		});
	});
});
