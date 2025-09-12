/**
 * TypeScript Analyzer API Integration Tests
 * End-to-end testing of the complete API functionality
 */

import { TypeScriptAnalyzer } from "../../../src/api/TypeScriptAnalyzer";
import {
	analyzeTypeScriptFile,
	extractDependencies,
	getBatchAnalysis,
	analyzeDirectory,
} from "../../../src/api/factory-functions";
import {
	AnalysisOptions,
	BatchAnalysisOptions,
	AnalyzerOptions,
	LogLevel,
} from "../../../src/api/types";
import {
	FileNotFoundError,
	InvalidFileTypeError,
	ParseTimeoutError,
	ConfigurationError,
} from "../../../src/api/errors";
import path from "path";
import fs from "fs";
import os from "os";

describe("TypeScript Analyzer API Integration Tests", () => {
	let tempDir: string;
	let analyzer: TypeScriptAnalyzer;

	// Test file contents
	const simpleModule = `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { CustomType } from './types';

export interface Config {
  name: string;
  version: number;
}

export const getConfig = async (): Promise<Config> => {
  const data = await readFile('config.json');
  return JSON.parse(data.toString());
};

export default getConfig;
`.trim();

	const complexModule = `
import React, { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { z } from 'zod';
import { debounce } from 'lodash';
import { ApiClient } from '../api/client';
import { formatDate, validateInput } from '../utils';

interface Props {
  id: string;
  optional?: number;
}

const schema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

export type UserData = z.infer<typeof schema>;

export const UserComponent: React.FC<Props> = ({ id, optional = 42 }) => {
  const [data, setData] = useState<UserData | null>(null);
  
  useEffect(() => {
    const fetchData = debounce(async () => {
      const client = new ApiClient();
      const result = await client.fetchUser(id);
      setData(result);
    }, 300);
    
    fetchData();
  }, [id]);

  return (
    <div>
      {data && <span>{formatDate(new Date())}</span>}
    </div>
  );
};

export { validateInput };
export default UserComponent;
`.trim();

	const typeDefinitions = `
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
}

declare global {
  interface Window {
    API_BASE_URL: string;
  }
}

export declare function fetchData<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>>;
`.trim();

	beforeEach(() => {
		// Create temporary directory structure
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-integration-"));

		// Create test files
		fs.writeFileSync(path.join(tempDir, "simple.ts"), simpleModule);
		fs.writeFileSync(path.join(tempDir, "complex.tsx"), complexModule);
		fs.writeFileSync(path.join(tempDir, "types.d.ts"), typeDefinitions);

		// Create subdirectory with more files
		const subDir = path.join(tempDir, "utils");
		fs.mkdirSync(subDir);
		fs.writeFileSync(
			path.join(subDir, "helpers.ts"),
			`export const helper = (x: number) => x * 2;`,
		);

		// Create some non-TypeScript files
		fs.writeFileSync(path.join(tempDir, "readme.md"), "# Test Project");
		fs.writeFileSync(path.join(tempDir, "package.json"), '{"name": "test"}');

		// Initialize analyzer
		analyzer = new TypeScriptAnalyzer({
			enableCache: true,
			defaultTimeout: 10000,
			logLevel: LogLevel.WARN,
		});
	});

	afterEach(() => {
		// Cleanup
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("Main API Class Integration", () => {
		it("should analyze simple TypeScript file with complete results", async () => {
			const filePath = path.join(tempDir, "simple.ts");
			const result = await analyzer.analyzeFile(filePath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(filePath);
			expect(result.dependencies.length).toBeGreaterThanOrEqual(3);
			expect(result.imports.length).toBeGreaterThanOrEqual(3);
			expect(result.exports.length).toBeGreaterThanOrEqual(3);
			expect(typeof result.parseTime).toBe("number");

			// Check specific dependencies
			const depNames = result.dependencies.map((d) => d.source);
			expect(depNames).toContain("fs/promises");
			expect(depNames).toContain("path");
			expect(depNames).toContain("./types");
		});

		it("should analyze complex React component with all features", async () => {
			const filePath = path.join(tempDir, "complex.tsx");
			const result = await analyzer.analyzeFile(filePath);

			expect(result.success).toBe(true);
			expect(result.dependencies.length).toBeGreaterThanOrEqual(6);

			// Check React-specific imports
			const depNames = result.dependencies.map((d) => d.source);
			expect(depNames).toContain("react");
			expect(depNames).toContain("z");
			expect(depNames).toContain("lodash");
			expect(depNames).toContain("../api/client");
			expect(depNames).toContain("../utils");

			// Check exports
			expect(result.exports.length).toBeGreaterThanOrEqual(3);
			const exportNames = result.exports.map((e) => e.name);
			expect(exportNames).toContain("UserData");
			expect(exportNames).toContain("UserComponent");
			expect(exportNames).toContain("validateInput");
		});

		it("should handle type definition files correctly", async () => {
			const filePath = path.join(tempDir, "types.d.ts");
			const result = await analyzer.analyzeFile(filePath);

			expect(result.success).toBe(true);
			expect(result.exports.length).toBeGreaterThanOrEqual(4);

			const exportNames = result.exports.map((e) => e.name);
			expect(exportNames).toContain("ApiResponse");
			expect(exportNames).toContain("UserStatus");
			expect(exportNames).toContain("User");
			expect(exportNames).toContain("fetchData");
		});

		it("should support batch analysis with detailed results", async () => {
			const filePaths = [
				path.join(tempDir, "simple.ts"),
				path.join(tempDir, "complex.tsx"),
				path.join(tempDir, "types.d.ts"),
			];

			const batchResult = await analyzer.analyzeFiles(filePaths, {
				concurrency: 2,
				continueOnError: true,
			});

			expect(batchResult.results).toHaveLength(3);
			expect(batchResult.summary.totalFiles).toBe(3);
			expect(batchResult.summary.successfulFiles).toBe(3);
			expect(batchResult.summary.failedFiles).toBe(0);
			expect(batchResult.summary.totalDependencies).toBeGreaterThan(8);
			expect(batchResult.errors).toHaveLength(0);
			expect(typeof batchResult.totalTime).toBe("number");
		});

		it("should handle source code analysis without file system", async () => {
			const sourceCode = `
import { Component } from 'react';
import axios from 'axios';

export class TestComponent extends Component {
  async fetchData() {
    return axios.get('/api/data');
  }
}
      `.trim();

			const result = await analyzer.analyzeSource(sourceCode, {
				contextPath: "/virtual/test.tsx",
				variant: "tsx",
			});

			expect(result.success).toBe(true);
			expect(result.filePath).toBe("/virtual/test.tsx");
			expect(result.dependencies.length).toBe(2);

			const depNames = result.dependencies.map((d) => d.source);
			expect(depNames).toContain("react");
			expect(depNames).toContain("axios");
		});

		it("should provide accurate convenience methods", async () => {
			const filePath = path.join(tempDir, "simple.ts");

			// Test extractDependencies
			const dependencies = await analyzer.extractDependencies(filePath);
			expect(dependencies).toContain("fs/promises");
			expect(dependencies).toContain("path");
			expect(dependencies).toContain("./types");
			expect(dependencies).toHaveLength(3);

			// Test getImports
			const imports = await analyzer.getImports(filePath);
			expect(imports.length).toBeGreaterThanOrEqual(3);

			// Test getExports
			const exports = await analyzer.getExports(filePath);
			expect(exports.length).toBeGreaterThanOrEqual(2);
			const exportNames = exports.map((e) => e.name);
			expect(exportNames).toContain("Config");
			expect(exportNames).toContain("getConfig");
		});

		it("should handle error cases gracefully", async () => {
			// Non-existent file
			await expect(
				analyzer.analyzeFile("/nonexistent/file.ts"),
			).rejects.toThrow(FileNotFoundError);

			// Invalid file type
			const jsFile = path.join(tempDir, "test.js");
			fs.writeFileSync(jsFile, "const x = 42;");
			await expect(analyzer.analyzeFile(jsFile)).rejects.toThrow(
				InvalidFileTypeError,
			);

			// Invalid source code should not throw but may return partial results
			const result = await analyzer.analyzeSource(`
        import { incomplete from 'module';
        export const broken = 
      `);
			expect(result).toHaveProperty("success");
			expect(result).toHaveProperty("filePath");
		});

		it("should manage cache and state correctly", async () => {
			const filePath = path.join(tempDir, "simple.ts");

			// First analysis
			const result1 = await analyzer.analyzeFile(filePath);
			const initialState = analyzer.getState();

			expect(initialState.isInitialized).toBe(true);
			expect(initialState.metrics?.totalFilesAnalyzed).toBe(1);

			// Second analysis should hit cache
			const result2 = await analyzer.analyzeFile(filePath);
			const afterCacheState = analyzer.getState();

			expect(result1.filePath).toBe(result2.filePath);
			expect(result1.dependencies).toEqual(result2.dependencies);

			// Clear cache
			analyzer.clearCache();

			// Third analysis after cache clear
			const result3 = await analyzer.analyzeFile(filePath);
			expect(result3.success).toBe(true);
		});
	});

	describe("Factory Functions Integration", () => {
		it("should provide consistent results with main API", async () => {
			const filePath = path.join(tempDir, "simple.ts");

			const [apiResult, factoryResult] = await Promise.all([
				analyzer.analyzeFile(filePath),
				analyzeTypeScriptFile(filePath),
			]);

			expect(factoryResult.filePath).toBe(apiResult.filePath);
			expect(factoryResult.success).toBe(apiResult.success);
			expect(factoryResult.dependencies).toEqual(apiResult.dependencies);
			expect(factoryResult.imports).toEqual(apiResult.imports);
			expect(factoryResult.exports).toEqual(apiResult.exports);
		});

		it("should handle batch analysis through factory function", async () => {
			const filePaths = [
				path.join(tempDir, "simple.ts"),
				path.join(tempDir, "complex.tsx"),
			];

			const results = await getBatchAnalysis(filePaths, {
				concurrency: 1,
				continueOnError: true,
			});

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[1].success).toBe(true);
			expect(results[0].dependencies.length).toBeGreaterThan(0);
			expect(results[1].dependencies.length).toBeGreaterThan(0);
		});

		it("should analyze directory with factory function", async () => {
			const results = await analyzeDirectory(tempDir, {
				extensions: [".ts", ".tsx", ".d.ts"],
				maxDepth: 2,
			});

			expect(results.length).toBe(4); // simple.ts, complex.tsx, types.d.ts, utils/helpers.ts
			expect(results.every((r) => r.success)).toBe(true);

			// Check that we found files in subdirectory
			const filePaths = results.map((r) => r.filePath);
			expect(filePaths.some((p) => p.includes("helpers.ts"))).toBe(true);
		});

		it("should extract dependencies consistently", async () => {
			const filePath = path.join(tempDir, "complex.tsx");

			const [apiDeps, factoryDeps] = await Promise.all([
				analyzer.extractDependencies(filePath),
				extractDependencies(filePath),
			]);

			expect(factoryDeps).toEqual(apiDeps);
			expect(factoryDeps).toContain("react");
			expect(factoryDeps).toContain("z");
			expect(factoryDeps).toContain("lodash");
		});
	});

	describe("Configuration and Options Integration", () => {
		it("should respect analysis options", async () => {
			const filePath = path.join(tempDir, "complex.tsx");
			const options: AnalysisOptions = {
				format: "json",
				includeSources: true,
				includeTypeImports: false,
				parseTimeout: 15000,
			};

			const result = await analyzer.analyzeFile(filePath, options);
			expect(result.success).toBe(true);
			expect(result.dependencies.length).toBeGreaterThan(0);
		});

		it("should handle timeout configuration", async () => {
			const quickAnalyzer = new TypeScriptAnalyzer({
				defaultTimeout: 1, // Very short timeout
			});

			const filePath = path.join(tempDir, "complex.tsx");

			// This might timeout or succeed depending on system performance
			try {
				const result = await quickAnalyzer.analyzeFile(filePath);
				expect(result).toHaveProperty("success");
			} catch (error) {
				expect(error).toBeInstanceOf(ParseTimeoutError);
			}
		});

		it("should handle different log levels", async () => {
			const verboseAnalyzer = new TypeScriptAnalyzer({
				logLevel: LogLevel.DEBUG,
				enableCache: false,
			});

			const result = await verboseAnalyzer.analyzeFile(
				path.join(tempDir, "simple.ts"),
			);
			expect(result.success).toBe(true);

			const state = verboseAnalyzer.getState();
			expect(state.config.logLevel).toBe(LogLevel.DEBUG);
			expect(state.config.enableCache).toBe(false);
		});

		it("should support custom dependency injection", async () => {
			const mockParser = {
				parseSource: jest.fn().mockResolvedValue({
					dependencies: [{ source: "mock-dep", type: "external" }],
					imports: [],
					exports: [],
					hasParseErrors: false,
				}),
				parseFile: jest.fn(),
			};

			const customAnalyzer = new TypeScriptAnalyzer(
				{},
				{
					parser: mockParser as any,
				},
			);

			const result = await customAnalyzer.analyzeFile(
				path.join(tempDir, "simple.ts"),
			);
			expect(result.success).toBe(true);
			expect(mockParser.parseSource).toHaveBeenCalled();
		});
	});

	describe("Event System Integration", () => {
		it("should emit events during analysis operations", async () => {
			const events: any[] = [];

			analyzer.on("analysisStart" as any, (data) =>
				events.push({ type: "start", data }),
			);
			analyzer.on("analysisComplete" as any, (data) =>
				events.push({ type: "complete", data }),
			);

			const filePath = path.join(tempDir, "simple.ts");
			await analyzer.analyzeFile(filePath);

			expect(events).toHaveLength(2);
			expect(events[0].type).toBe("start");
			expect(events[0].data.filePath).toBe(filePath);
			expect(events[1].type).toBe("complete");
			expect(events[1].data.filePath).toBe(filePath);
			expect(events[1].data.result).toHaveProperty("success");
		});

		it("should emit batch events during batch operations", async () => {
			const events: any[] = [];

			analyzer.on("batchStart" as any, (data) =>
				events.push({ type: "batchStart", data }),
			);
			analyzer.on("batchProgress" as any, (data) =>
				events.push({ type: "batchProgress", data }),
			);
			analyzer.on("batchComplete" as any, (data) =>
				events.push({ type: "batchComplete", data }),
			);

			const filePaths = [
				path.join(tempDir, "simple.ts"),
				path.join(tempDir, "complex.tsx"),
			];

			await analyzer.analyzeFiles(filePaths);

			expect(events.length).toBeGreaterThan(2);
			expect(events.some((e) => e.type === "batchStart")).toBe(true);
			expect(events.some((e) => e.type === "batchComplete")).toBe(true);
		});
	});

	describe("Output Formatting Integration", () => {
		it("should format results in different output formats", async () => {
			const filePath = path.join(tempDir, "simple.ts");
			const result = await analyzer.analyzeFile(filePath);

			// JSON format
			const jsonOutput = analyzer.formatResult(result, "json");
			expect(() => JSON.parse(jsonOutput)).not.toThrow();
			const parsedJson = JSON.parse(jsonOutput);
			expect(parsedJson).toHaveProperty("filePath");
			expect(parsedJson).toHaveProperty("dependencies");

			// Summary format
			const summaryOutput = analyzer.formatResult(result, "summary");
			expect(typeof summaryOutput).toBe("string");
			expect(summaryOutput.length).toBeGreaterThan(0);

			// CSV format
			const csvOutput = analyzer.formatResult(result, "csv");
			expect(typeof csvOutput).toBe("string");
			expect(csvOutput).toContain(","); // Should contain comma separators
		});
	});

	describe("Performance and Memory Integration", () => {
		it("should handle concurrent operations efficiently", async () => {
			const filePaths = [
				path.join(tempDir, "simple.ts"),
				path.join(tempDir, "complex.tsx"),
				path.join(tempDir, "types.d.ts"),
			];

			const startTime = Date.now();

			// Run multiple operations concurrently
			const promises = [
				...filePaths.map((fp) => analyzer.analyzeFile(fp)),
				analyzer.analyzeFiles(filePaths.slice(0, 2)),
				extractDependencies(filePaths[0]),
				analyzeTypeScriptFile(filePaths[1]),
			];

			const results = await Promise.all(promises);
			const totalTime = Date.now() - startTime;

			expect(results).toHaveLength(7);
			expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

			// Verify all operations succeeded
			const analysisResults = results.slice(0, 3) as any[];
			expect(analysisResults.every((r) => r.success)).toBe(true);
		});

		it("should maintain performance metrics", async () => {
			const filePath = path.join(tempDir, "simple.ts");

			// Perform multiple analyses
			await analyzer.analyzeFile(filePath);
			await analyzer.analyzeFile(filePath); // Should hit cache
			await analyzer.analyzeFile(path.join(tempDir, "complex.tsx"));

			const state = analyzer.getState();
			const metrics = state.metrics!;

			expect(metrics.totalFilesAnalyzed).toBeGreaterThanOrEqual(2);
			expect(metrics.averageAnalysisTime).toBeGreaterThan(0);
			expect(metrics.totalAnalysisTime).toBeGreaterThan(0);
		});
	});

	describe("Real-world Scenarios Integration", () => {
		it("should handle a typical React project structure", async () => {
			// Create a more realistic project structure
			const srcDir = path.join(tempDir, "src");
			const componentsDir = path.join(srcDir, "components");
			const utilsDir = path.join(srcDir, "utils");

			fs.mkdirSync(srcDir);
			fs.mkdirSync(componentsDir);
			fs.mkdirSync(utilsDir);

			// App.tsx
			fs.writeFileSync(
				path.join(srcDir, "App.tsx"),
				`
import React from 'react';
import { Header } from './components/Header';
import { UserList } from './components/UserList';
import { ApiProvider } from './utils/api';

const App: React.FC = () => {
  return (
    <ApiProvider>
      <Header />
      <UserList />
    </ApiProvider>
  );
};

export default App;
      `.trim(),
			);

			// Header component
			fs.writeFileSync(
				path.join(componentsDir, "Header.tsx"),
				`
import React from 'react';
import { formatTitle } from '../utils/text';

export const Header: React.FC = () => {
  return <h1>{formatTitle('My App')}</h1>;
};
      `.trim(),
			);

			// Utils
			fs.writeFileSync(
				path.join(utilsDir, "text.ts"),
				`
export const formatTitle = (title: string): string => {
  return title.toUpperCase();
};

export const slugify = (text: string): string => {
  return text.toLowerCase().replace(/\\s+/g, '-');
};
      `.trim(),
			);

			// Analyze the entire src directory
			const results = await analyzeDirectory(srcDir, {
				extensions: [".ts", ".tsx"],
				maxDepth: 3,
			});

			expect(results.length).toBe(3);

			// Verify each file was analyzed correctly
			const appResult = results.find((r) => r.filePath.includes("App.tsx"));
			expect(appResult?.success).toBe(true);
			expect(appResult?.dependencies.some((d) => d.source === "react")).toBe(
				true,
			);
			expect(
				appResult?.dependencies.some((d) =>
					d.source.includes("./components/Header"),
				),
			).toBe(true);

			const headerResult = results.find((r) =>
				r.filePath.includes("Header.tsx"),
			);
			expect(headerResult?.success).toBe(true);
			expect(
				headerResult?.dependencies.some((d) =>
					d.source.includes("../utils/text"),
				),
			).toBe(true);
		});

		it("should handle monorepo-style package structure", async () => {
			// Create packages structure
			const packagesDir = path.join(tempDir, "packages");
			const coreDir = path.join(packagesDir, "core");
			const uiDir = path.join(packagesDir, "ui");

			fs.mkdirSync(packagesDir);
			fs.mkdirSync(coreDir);
			fs.mkdirSync(uiDir);

			// Core package
			fs.writeFileSync(
				path.join(coreDir, "index.ts"),
				`
export interface User {
  id: string;
  name: string;
}

export class UserService {
  async getUser(id: string): Promise<User> {
    return { id, name: 'Test User' };
  }
}
      `.trim(),
			);

			// UI package that depends on core
			fs.writeFileSync(
				path.join(uiDir, "UserDisplay.tsx"),
				`
import React from 'react';
import { User, UserService } from '@myapp/core';

interface Props {
  userId: string;
}

export const UserDisplay: React.FC<Props> = ({ userId }) => {
  const [user, setUser] = React.useState<User | null>(null);
  
  React.useEffect(() => {
    const service = new UserService();
    service.getUser(userId).then(setUser);
  }, [userId]);
  
  return user ? <div>{user.name}</div> : <div>Loading...</div>;
};
      `.trim(),
			);

			// Analyze both packages
			const results = await analyzeDirectory(packagesDir, {
				extensions: [".ts", ".tsx"],
				maxDepth: 3,
			});

			expect(results.length).toBe(2);

			const coreResult = results.find((r) => r.filePath.includes("core"));
			expect(coreResult?.exports.length).toBeGreaterThanOrEqual(2);

			const uiResult = results.find((r) => r.filePath.includes("ui"));
			expect(uiResult?.dependencies.some((d) => d.source === "react")).toBe(
				true,
			);
			expect(
				uiResult?.dependencies.some((d) => d.source === "@myapp/core"),
			).toBe(true);
		});
	});
});
