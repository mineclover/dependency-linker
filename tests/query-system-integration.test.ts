/**
 * Query System Integration Tests
 * 쿼리 시스템 통합 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs";
import path from "path";
import { analyzeFile } from "../dist/api/analysis.js";
import { AnalysisNamespaceManager } from "../dist/namespace/analysis-namespace.js";

describe("Query System Integration", () => {
	let testDir: string;
	let testConfigPath: string;
	let manager: AnalysisNamespaceManager;

	beforeEach(() => {
		testDir = "./test-query-integration";
		testConfigPath = path.join(testDir, "dependency-linker.config.json");

		// 테스트 디렉토리 생성
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}

		manager = new AnalysisNamespaceManager(testConfigPath);
	});

	afterEach(() => {
		// 테스트 디렉토리 정리
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	describe("Basic Query Execution", () => {
		it("should execute basic analysis queries", async () => {
			const testCode = `
import React from 'react';
import { useState, useEffect } from 'react';

export const MyComponent = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);
  
  return <div>Count: {count}</div>;
};

export default MyComponent;
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-component.tsx",
			);

			expect(result.queryResults).toBeDefined();
			expect(Object.keys(result.queryResults).length).toBeGreaterThan(0);
		});

		it("should extract import sources", async () => {
			const testCode = `
import React from 'react';
import { useState } from 'react';
import { Button } from './components/Button';
import type { User } from './types';
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-imports.ts",
			);

			// ts-import-sources 쿼리 결과 확인
			const importSources = result.queryResults["ts-import-sources"] || [];

			// 파싱 실패 시 빈 결과를 예상
			if (importSources.length === 0) {
				console.warn("No import sources found - parsing may have failed");
				// 파싱 실패 시 테스트를 통과시키지 않음
				expect(importSources.length).toBeGreaterThan(0);
			} else {
				expect(importSources.length).toBeGreaterThan(0);
			}

			const sources = importSources
				.map((item: any) => item.source)
				.filter(Boolean);
			expect(sources).toContain("react");
			expect(sources).toContain("./components/Button");
			expect(sources).toContain("./types");
		});

		it("should extract export declarations", async () => {
			const testCode = `
export const myFunction = () => {
  return 'hello';
};

export class MyClass {
  constructor() {}
}

export interface MyInterface {
  name: string;
}

export default MyClass;
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-exports.ts",
			);

			// ts-export-declarations 쿼리 결과 확인
			const exportDeclarations =
				result.queryResults["ts-export-declarations"] || [];
			expect(exportDeclarations.length).toBeGreaterThan(0);

			const exportNames = exportDeclarations
				.map((item: any) => item.exportName)
				.filter(Boolean);
			expect(exportNames).toContain("myFunction");
		});
	});

	describe("Symbol Definition Queries", () => {
		it("should extract class definitions", async () => {
			const testCode = `
export class UserService {
  private users: User[] = [];
  
  constructor(private apiClient: ApiClient) {}
  
  async getUsers(): Promise<User[]> {
    return this.users;
  }
  
  async addUser(user: User): Promise<void> {
    this.users.push(user);
  }
}
`;

			const result = await analyzeFile(testCode, "typescript", "test-class.ts");

			// ts-class-definitions 쿼리 결과 확인
			const classDefinitions =
				result.queryResults["ts-class-definitions"] || [];
			expect(classDefinitions.length).toBeGreaterThan(0);

			const classNames = classDefinitions
				.map((item: any) => item.class_name)
				.filter(Boolean);
			expect(classNames).toContain("UserService");
		});

		it("should extract function definitions", async () => {
			const testCode = `
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-functions.ts",
			);

			// ts-function-declarations 쿼리 결과 확인
			const functionDefinitions =
				result.queryResults["ts-function-declarations"] || [];
			expect(functionDefinitions.length).toBeGreaterThan(0);

			const functionNames = functionDefinitions
				.map((item: any) => item.function_name)
				.filter(Boolean);
			expect(functionNames).toContain("calculateTotal");
		});

		it("should extract interface definitions", async () => {
			const testCode = `
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-interfaces.ts",
			);

			// ts-interface-definitions 쿼리 결과 확인
			const interfaceDefinitions =
				result.queryResults["ts-interface-definitions"] || [];
			expect(interfaceDefinitions.length).toBeGreaterThan(0);

			const interfaceNames = interfaceDefinitions
				.map((item: any) => item.interface_name)
				.filter(Boolean);
			expect(interfaceNames).toContain("User");
			expect(interfaceNames).toContain("ApiResponse");
		});
	});

	describe("Dependency Tracking Queries", () => {
		it("should extract call expressions", async () => {
			const testCode = `
import { useState, useEffect } from 'react';

export const MyComponent = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  
  const fetchData = async () => {
    const response = await fetch('/api/data');
    return response.json();
  };
  
  return <div>{data}</div>;
};
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-calls.tsx",
			);

			// ts-function-calls 쿼리 결과 확인
			const callExpressions = result.queryResults["ts-function-calls"] || [];
			expect(callExpressions.length).toBeGreaterThan(0);

			const functionNames = callExpressions
				.map((item: any) => item.function_name)
				.filter(Boolean);
			expect(functionNames).toContain("useState");
			expect(functionNames).toContain("useEffect");
			expect(functionNames).toContain("fetch");
		});

		it("should extract member expressions", async () => {
			const testCode = `
export class Calculator {
  private result: number = 0;
  
  add(value: number): Calculator {
    this.result += value;
    return this;
  }
  
  getResult(): number {
    return this.result;
  }
}

const calc = new Calculator();
calc.add(5).add(3);
const result = calc.getResult();
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-members.ts",
			);

			// ts-property-definitions 쿼리 결과 확인
			const memberExpressions =
				result.queryResults["ts-property-definitions"] || [];
			expect(memberExpressions.length).toBeGreaterThan(0);

			const propertyNames = memberExpressions
				.map((item: any) => item.property_name)
				.filter(Boolean);
			expect(propertyNames).toContain("add");
			expect(propertyNames).toContain("getResult");
		});
	});

	describe("Advanced Analysis Queries", () => {
		it("should extract named imports", async () => {
			const testCode = `
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Form } from './components';
import type { User, ApiResponse } from './types';
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-named-imports.ts",
			);

			// ts-named-imports 쿼리 결과 확인
			const namedImports = result.queryResults["ts-named-imports"] || [];
			expect(namedImports.length).toBeGreaterThan(0);

			const importNames = namedImports
				.map((item: any) => item.name)
				.filter(Boolean);
			expect(importNames).toContain("useState");
			expect(importNames).toContain("useEffect");
			expect(importNames).toContain("Button");
		});

		it("should extract type imports", async () => {
			const testCode = `
import type { User, ApiResponse } from './types';
import type { ComponentProps } from 'react';
import { useState } from 'react';
`;

			const result = await analyzeFile(
				testCode,
				"typescript",
				"test-type-imports.ts",
			);

			// ts-type-imports 쿼리 결과 확인
			const typeImports = result.queryResults["ts-type-imports"] || [];
			expect(typeImports.length).toBeGreaterThan(0);

			const typeNames = typeImports
				.map((item: any) => item.name)
				.filter(Boolean);
			expect(typeNames).toContain("User");
			expect(typeNames).toContain("ApiResponse");
			expect(typeNames).toContain("ComponentProps");
		});
	});

	describe("Namespace-based Query Execution", () => {
		it("should execute queries based on namespace configuration", async () => {
			// 테스트 설정 파일 생성
			const config = {
				projectName: "test-project",
				rootPath: testDir,
				namespaces: {
					"test-source": {
						name: "test-source",
						description: "Test source analysis",
						patterns: {
							include: ["src/**/*.ts"],
							exclude: [],
						},
						analysis: {
							enabled: true,
							options: {
								enableParallelExecution: true,
								enableCaching: true,
							},
						},
						queries: {
							categories: ["basic-analysis", "symbol-definitions"],
							custom: {
								enabled: false,
								queryIds: [],
							},
							options: {
								enableParallelExecution: true,
								enableCaching: true,
								maxConcurrency: 2,
							},
						},
						compliance: {
							enabled: true,
							rules: [],
						},
						output: {
							format: "json" as const,
							destination: "./reports/test-source.json",
							includeMetadata: true,
							includeStatistics: true,
						},
					},
				},
				globalSettings: {
					defaultLanguage: "typescript",
					maxConcurrency: 4,
					cacheEnabled: true,
				},
			};

			fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

			// 테스트 소스 파일 생성
			const srcDir = path.join(testDir, "src");
			if (!fs.existsSync(srcDir)) {
				fs.mkdirSync(srcDir, { recursive: true });
			}

			const testFile = path.join(srcDir, "test.ts");
			fs.writeFileSync(
				testFile,
				`
export const testFunction = () => {
  return 'test';
};

export class TestClass {
  method() {
    return 'method';
  }
}
`,
			);

			// 네임스페이스 분석 실행 - 실제 메서드 사용
			const result = await manager.getActiveQueriesForNamespace("test-source");

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should respect query category configuration", async () => {
			const config = {
				projectName: "test-project",
				rootPath: testDir,
				namespaces: {
					"basic-only": {
						name: "basic-only",
						description: "Basic analysis only",
						patterns: {
							include: ["src/**/*.ts"],
							exclude: [],
						},
						analysis: {
							enabled: true,
							options: {
								enableParallelExecution: true,
								enableCaching: true,
							},
						},
						queries: {
							categories: ["basic-analysis"], // 기본 분석만
							custom: {
								enabled: false,
								queryIds: [],
							},
							options: {
								enableParallelExecution: true,
								enableCaching: true,
								maxConcurrency: 1,
							},
						},
						compliance: {
							enabled: true,
							rules: [],
						},
						output: {
							format: "json" as const,
							destination: "./reports/basic-only.json",
							includeMetadata: true,
							includeStatistics: true,
						},
					},
				},
				globalSettings: {
					defaultLanguage: "typescript",
					maxConcurrency: 4,
					cacheEnabled: true,
				},
			};

			fs.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

			// 테스트 소스 파일 생성
			const srcDir = path.join(testDir, "src");
			if (!fs.existsSync(srcDir)) {
				fs.mkdirSync(srcDir, { recursive: true });
			}

			const testFile = path.join(srcDir, "test.ts");
			fs.writeFileSync(
				testFile,
				`
import { useState } from 'react';

export const testFunction = () => {
  const [count, setCount] = useState(0);
  return count;
};
`,
			);

			// 활성 쿼리 확인
			const activeQueries =
				await manager.getActiveQueriesForNamespace("basic-only");

			// 기본 분석 쿼리만 포함되어야 함
			expect(activeQueries).toContain("ts-import-sources");
			expect(activeQueries).toContain("ts-export-declarations");
			expect(activeQueries).toContain("ts-export-assignments");

			// 심볼 정의 쿼리는 포함되지 않아야 함
			expect(activeQueries).not.toContain("ts-class-definitions");
			expect(activeQueries).not.toContain("ts-function-definitions");
		});
	});

	describe("Query Performance", () => {
		it("should handle large files efficiently", async () => {
			// 큰 파일 생성 (1000줄)
			const largeCode = Array.from(
				{ length: 1000 },
				(_, i) => `
export const function${i} = () => {
  return 'function ${i}';
};

export class Class${i} {
  method${i}() {
    return 'method ${i}';
  }
}
`,
			).join("\n");

			const startTime = Date.now();
			const result = await analyzeFile(
				largeCode,
				"typescript",
				"large-file.ts",
			);
			const endTime = Date.now();

			expect(result.queryResults).toBeDefined();
			expect(endTime - startTime).toBeLessThan(5000); // 5초 이내
		});

		it("should cache query results", async () => {
			const testCode = `
export const cachedFunction = () => {
  return 'cached';
};
`;

			// 첫 번째 실행
			const startTime1 = Date.now();
			const result1 = await analyzeFile(
				testCode,
				"typescript",
				"cache-test.ts",
			);
			const endTime1 = Date.now();

			// 두 번째 실행 (캐시된 결과 사용)
			const startTime2 = Date.now();
			const result2 = await analyzeFile(
				testCode,
				"typescript",
				"cache-test.ts",
			);
			const endTime2 = Date.now();

			expect(result1.queryResults).toEqual(result2.queryResults);
			expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
		});
	});
});
