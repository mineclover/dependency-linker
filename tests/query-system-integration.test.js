"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const analysis_js_1 = require("../dist/api/analysis.js");
const analysis_namespace_js_1 = require("../dist/namespace/analysis-namespace.js");
(0, globals_1.describe)("Query System Integration", () => {
    let testDir;
    let testConfigPath;
    let manager;
    (0, globals_1.beforeEach)(() => {
        testDir = "./test-query-integration";
        testConfigPath = path_1.default.join(testDir, "dependency-linker.config.json");
        if (!fs_1.default.existsSync(testDir)) {
            fs_1.default.mkdirSync(testDir, { recursive: true });
        }
        manager = new analysis_namespace_js_1.AnalysisNamespaceManager(testConfigPath);
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    (0, globals_1.describe)("Basic Query Execution", () => {
        (0, globals_1.it)("should execute basic analysis queries", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-component.tsx");
            (0, globals_1.expect)(result.queryResults).toBeDefined();
            (0, globals_1.expect)(Object.keys(result.queryResults).length).toBeGreaterThan(0);
        });
        (0, globals_1.it)("should extract import sources", async () => {
            const testCode = `
import React from 'react';
import { useState } from 'react';
import { Button } from './components/Button';
import type { User } from './types';
`;
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-imports.ts");
            const importSources = result.queryResults["ts-import-sources"] || [];
            (0, globals_1.expect)(importSources.length).toBeGreaterThan(0);
            const sources = importSources
                .map((item) => item.source)
                .filter(Boolean);
            (0, globals_1.expect)(sources).toContain("react");
            (0, globals_1.expect)(sources).toContain("./components/Button");
            (0, globals_1.expect)(sources).toContain("./types");
        });
        (0, globals_1.it)("should extract export declarations", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-exports.ts");
            const exportDeclarations = result.queryResults["ts-export-declarations"] || [];
            (0, globals_1.expect)(exportDeclarations.length).toBeGreaterThan(0);
            const exportNames = exportDeclarations
                .map((item) => item.exportName)
                .filter(Boolean);
            (0, globals_1.expect)(exportNames).toContain("myFunction");
        });
    });
    (0, globals_1.describe)("Symbol Definition Queries", () => {
        (0, globals_1.it)("should extract class definitions", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-class.ts");
            const classDefinitions = result.queryResults["ts-class-definitions"] || [];
            (0, globals_1.expect)(classDefinitions.length).toBeGreaterThan(0);
            const classNames = classDefinitions
                .map((item) => item.class_name)
                .filter(Boolean);
            (0, globals_1.expect)(classNames).toContain("UserService");
        });
        (0, globals_1.it)("should extract function definitions", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-functions.ts");
            const functionDefinitions = result.queryResults["ts-function-definitions"] || [];
            (0, globals_1.expect)(functionDefinitions.length).toBeGreaterThan(0);
            const functionNames = functionDefinitions
                .map((item) => item.function_name)
                .filter(Boolean);
            (0, globals_1.expect)(functionNames).toContain("calculateTotal");
        });
        (0, globals_1.it)("should extract interface definitions", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-interfaces.ts");
            const interfaceDefinitions = result.queryResults["ts-interface-definitions"] || [];
            (0, globals_1.expect)(interfaceDefinitions.length).toBeGreaterThan(0);
            const interfaceNames = interfaceDefinitions
                .map((item) => item.interface_name)
                .filter(Boolean);
            (0, globals_1.expect)(interfaceNames).toContain("User");
            (0, globals_1.expect)(interfaceNames).toContain("ApiResponse");
        });
    });
    (0, globals_1.describe)("Dependency Tracking Queries", () => {
        (0, globals_1.it)("should extract call expressions", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-calls.tsx");
            const callExpressions = result.queryResults["ts-call-expressions"] || [];
            (0, globals_1.expect)(callExpressions.length).toBeGreaterThan(0);
            const functionNames = callExpressions
                .map((item) => item.function_name)
                .filter(Boolean);
            (0, globals_1.expect)(functionNames).toContain("useState");
            (0, globals_1.expect)(functionNames).toContain("useEffect");
            (0, globals_1.expect)(functionNames).toContain("fetch");
        });
        (0, globals_1.it)("should extract member expressions", async () => {
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
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-members.ts");
            const memberExpressions = result.queryResults["ts-member-expressions"] || [];
            (0, globals_1.expect)(memberExpressions.length).toBeGreaterThan(0);
            const propertyNames = memberExpressions
                .map((item) => item.property_name)
                .filter(Boolean);
            (0, globals_1.expect)(propertyNames).toContain("add");
            (0, globals_1.expect)(propertyNames).toContain("getResult");
        });
    });
    (0, globals_1.describe)("Advanced Analysis Queries", () => {
        (0, globals_1.it)("should extract named imports", async () => {
            const testCode = `
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Form } from './components';
import type { User, ApiResponse } from './types';
`;
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-named-imports.ts");
            const namedImports = result.queryResults["ts-named-imports"] || [];
            (0, globals_1.expect)(namedImports.length).toBeGreaterThan(0);
            const importNames = namedImports
                .map((item) => item.name)
                .filter(Boolean);
            (0, globals_1.expect)(importNames).toContain("useState");
            (0, globals_1.expect)(importNames).toContain("useEffect");
            (0, globals_1.expect)(importNames).toContain("Button");
        });
        (0, globals_1.it)("should extract type imports", async () => {
            const testCode = `
import type { User, ApiResponse } from './types';
import type { ComponentProps } from 'react';
import { useState } from 'react';
`;
            const result = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "test-type-imports.ts");
            const typeImports = result.queryResults["ts-type-imports"] || [];
            (0, globals_1.expect)(typeImports.length).toBeGreaterThan(0);
            const typeNames = typeImports
                .map((item) => item.name)
                .filter(Boolean);
            (0, globals_1.expect)(typeNames).toContain("User");
            (0, globals_1.expect)(typeNames).toContain("ApiResponse");
            (0, globals_1.expect)(typeNames).toContain("ComponentProps");
        });
    });
    (0, globals_1.describe)("Namespace-based Query Execution", () => {
        (0, globals_1.it)("should execute queries based on namespace configuration", async () => {
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
                            format: "json",
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
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
            const srcDir = path_1.default.join(testDir, "src");
            if (!fs_1.default.existsSync(srcDir)) {
                fs_1.default.mkdirSync(srcDir, { recursive: true });
            }
            const testFile = path_1.default.join(srcDir, "test.ts");
            fs_1.default.writeFileSync(testFile, `
export const testFunction = () => {
  return 'test';
};

export class TestClass {
  method() {
    return 'method';
  }
}
`);
            const result = await manager.runNamespaceAnalysis("test-source");
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.filesAnalyzed).toBeGreaterThan(0);
            (0, globals_1.expect)(result.symbolsFound).toBeGreaterThan(0);
        });
        (0, globals_1.it)("should respect query category configuration", async () => {
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
                            categories: ["basic-analysis"],
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
                            format: "json",
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
            fs_1.default.writeFileSync(testConfigPath, JSON.stringify(config, null, 2));
            const srcDir = path_1.default.join(testDir, "src");
            if (!fs_1.default.existsSync(srcDir)) {
                fs_1.default.mkdirSync(srcDir, { recursive: true });
            }
            const testFile = path_1.default.join(srcDir, "test.ts");
            fs_1.default.writeFileSync(testFile, `
import { useState } from 'react';

export const testFunction = () => {
  const [count, setCount] = useState(0);
  return count;
};
`);
            const activeQueries = await manager.getActiveQueriesForNamespace("basic-only");
            (0, globals_1.expect)(activeQueries).toContain("ts-import-sources");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-declarations");
            (0, globals_1.expect)(activeQueries).toContain("ts-export-assignments");
            (0, globals_1.expect)(activeQueries).not.toContain("ts-class-definitions");
            (0, globals_1.expect)(activeQueries).not.toContain("ts-function-definitions");
        });
    });
    (0, globals_1.describe)("Query Performance", () => {
        (0, globals_1.it)("should handle large files efficiently", async () => {
            const largeCode = Array.from({ length: 1000 }, (_, i) => `
export const function${i} = () => {
  return 'function ${i}';
};

export class Class${i} {
  method${i}() {
    return 'method ${i}';
  }
}
`).join("\n");
            const startTime = Date.now();
            const result = await (0, analysis_js_1.analyzeFile)(largeCode, "typescript", "large-file.ts");
            const endTime = Date.now();
            (0, globals_1.expect)(result.queryResults).toBeDefined();
            (0, globals_1.expect)(endTime - startTime).toBeLessThan(5000);
        });
        (0, globals_1.it)("should cache query results", async () => {
            const testCode = `
export const cachedFunction = () => {
  return 'cached';
};
`;
            const startTime1 = Date.now();
            const result1 = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "cache-test.ts");
            const endTime1 = Date.now();
            const startTime2 = Date.now();
            const result2 = await (0, analysis_js_1.analyzeFile)(testCode, "typescript", "cache-test.ts");
            const endTime2 = Date.now();
            (0, globals_1.expect)(result1.queryResults).toEqual(result2.queryResults);
            (0, globals_1.expect)(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
        });
    });
});
//# sourceMappingURL=query-system-integration.test.js.map