/**
 * Mock factory instances for testing TypeScript analyzer functionality
 * Provides controlled test doubles for analyzer components
 */

import type { AnalysisResult, AnalysisError } from '../../src/models/AnalysisResult';
import type { AnalysisOptions, BatchAnalysisOptions, DirectoryOptions } from '../../src/api/types';
import type { ParseResult } from '../../src/core/types/ParseTypes';
import type { ITypeScriptParser } from '../../src/core/interfaces/ITypeScriptParser';
import { TypeScriptAnalyzer } from '../../src/api/TypeScriptAnalyzer';
import type { DependencyInfo } from '../../src/models/DependencyInfo';
import type { ImportInfo } from '../../src/models/ImportInfo';
import type { ExportInfo } from '../../src/models/ExportInfo';

/**
 * Mock analysis results for different test scenarios
 */
export const mockAnalysisResults = {
	simple: {
		filePath: '/test/simple.ts',
		success: true,
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		parseTime: 15,
	} as AnalysisResult,

	complex: {
		filePath: '/test/complex.ts',
		success: true,
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		parseTime: 45,
	} as AnalysisResult,

	withErrors: {
		filePath: '/test/with-errors.ts',
		success: false,
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		parseTime: 35,
		error: {
			code: 'PARSE_ERROR',
			message: 'Syntax errors found in file',
			details: ['Expected ":" after property name at line 5']
		} as AnalysisError,
	} as AnalysisResult,
};

/**
 * Mock parse results for different scenarios
 */
export const mockParseResults = {
	simple: {
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		hasParseErrors: false,
	} as ParseResult,

	complex: {
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		hasParseErrors: false,
	} as ParseResult,

	withSyntaxError: {
		dependencies: [] as DependencyInfo[],
		imports: [] as ImportInfo[],
		exports: [] as ExportInfo[],
		hasParseErrors: true,
	} as ParseResult,
};

/**
 * Mock TypeScript parser implementation
 */
export class MockTypeScriptParser implements ITypeScriptParser {
	private shouldFail: boolean = false;
	private customResults: Map<string, ParseResult> = new Map();

	constructor(options: { shouldFail?: boolean } = {}) {
		this.shouldFail = options.shouldFail ?? false;
	}

	/**
	 * Set custom result for specific source
	 */
	public setCustomResult(source: string, result: ParseResult): void {
		this.customResults.set(source, result);
	}

	/**
	 * Configure parser to fail for testing error scenarios
	 */
	public setShouldFail(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
	}

	public async parseSource(source: string): Promise<ParseResult> {
		// Simulate parsing delay
		await new Promise(resolve => setTimeout(resolve, 10));

		if (this.shouldFail) {
			throw new Error('Mock parser configured to fail');
		}

		// Return custom result if set
		if (this.customResults.has(source)) {
			return this.customResults.get(source)!;
		}

		// Return appropriate mock result based on source content
		if (source.includes('non-existent-package')) {
			return mockParseResults.withSyntaxError;
		}

		if (source.includes('ComplexClass')) {
			return mockParseResults.complex;
		}

		return mockParseResults.simple;
	}

	public async parseFile(filePath: string): Promise<ParseResult> {
		// Simulate file reading delay
		await new Promise(resolve => setTimeout(resolve, 5));

		if (this.shouldFail) {
			throw new Error(`Mock parser failed to read file: ${filePath}`);
		}

		// Return appropriate result based on file name
		if (filePath.includes('with-errors')) {
			return mockParseResults.withSyntaxError;
		}

		if (filePath.includes('complex')) {
			return mockParseResults.complex;
		}

		return mockParseResults.simple;
	}
}

/**
 * Mock TypeScript analyzer factory
 */
export class MockAnalyzerFactory {
	private static instances: Map<string, TypeScriptAnalyzer> = new Map();
	
	/**
	 * Create a mock analyzer with configurable behavior
	 */
	public static createMockAnalyzer(options: {
		shouldFail?: boolean;
		customResults?: Map<string, AnalysisResult>;
		parseDelay?: number;
		analysisDelay?: number;
	} = {}): TypeScriptAnalyzer {
		const {
			shouldFail = false,
			customResults = new Map(),
			parseDelay = 10,
			analysisDelay = 20,
		} = options;

		// Create analyzer instance
		const analyzer = new TypeScriptAnalyzer({
			enableCache: false, // Disable cache for predictable tests
			cacheSize: 0,
			defaultTimeout: 5000,
		});

		// Mock the analyzeFile method using prototype manipulation
		const originalAnalyzeFile = (analyzer as any).analyzeFile?.bind(analyzer);
		(analyzer as any).analyzeFile = async (filePath: string, options?: AnalysisOptions): Promise<AnalysisResult> => {
			// Simulate delays
			await new Promise(resolve => setTimeout(resolve, parseDelay + analysisDelay));

			if (shouldFail) {
				throw new Error(`Mock analyzer configured to fail for: ${filePath}`);
			}

			// Return custom result if set
			if (customResults.has(filePath)) {
				return customResults.get(filePath)!;
			}

			// Return appropriate mock result based on file path
			if (filePath.includes('with-errors')) {
				return mockAnalysisResults.withErrors;
			}

			if (filePath.includes('complex')) {
				return mockAnalysisResults.complex;
			}

			return mockAnalysisResults.simple;
		};

		return analyzer;
	}

	/**
	 * Create mock analyzer for batch processing
	 */
	public static createBatchMockAnalyzer(options: {
		resultsPerFile?: number;
		shouldFailOnFile?: string;
		batchDelay?: number;
	} = {}): TypeScriptAnalyzer {
		const {
			resultsPerFile = 1,
			shouldFailOnFile,
			batchDelay = 50,
		} = options;

		const analyzer = this.createMockAnalyzer();

		// Mock batch processing methods if they exist
		(analyzer as any).analyzeDirectory = async (
			dirPath: string,
			options?: DirectoryOptions
		): Promise<AnalysisResult[]> => {
			// Simulate batch processing delay
			await new Promise(resolve => setTimeout(resolve, batchDelay));

			if (shouldFailOnFile && dirPath.includes(shouldFailOnFile)) {
				throw new Error(`Batch analysis failed on: ${shouldFailOnFile}`);
			}

			// Return multiple mock results
			const results: AnalysisResult[] = [];
			for (let i = 0; i < resultsPerFile; i++) {
				results.push({
					...mockAnalysisResults.simple,
					filePath: `${dirPath}/file-${i}.ts`,
				});
			}

			return results;
		};

		return analyzer;
	}

	/**
	 * Create analyzer that simulates memory/performance issues
	 */
	public static createPerformanceMockAnalyzer(options: {
		memoryLeakSize?: number;
		cpuIntensiveWork?: boolean;
		slowAnalysis?: boolean;
	} = {}): TypeScriptAnalyzer {
		const {
			memoryLeakSize = 0,
			cpuIntensiveWork = false,
			slowAnalysis = false,
		} = options;

		const analyzer = this.createMockAnalyzer();
		const originalAnalyzeFile = (analyzer as any).analyzeFile?.bind(analyzer);

		(analyzer as any).analyzeFile = async (filePath: string, options?: AnalysisOptions): Promise<AnalysisResult> => {
			// Simulate memory leak
			if (memoryLeakSize > 0) {
				const leak = new Array(memoryLeakSize).fill('x'.repeat(1000));
				// Keep reference to prevent GC
				(global as any).__testMemoryLeak = ((global as any).__testMemoryLeak || []).concat(leak);
			}

			// Simulate CPU intensive work
			if (cpuIntensiveWork) {
				let result = 0;
				for (let i = 0; i < 1000000; i++) {
					result += Math.sqrt(i);
				}
			}

			// Simulate slow analysis
			if (slowAnalysis) {
				await new Promise(resolve => setTimeout(resolve, 2000));
			}

			if (originalAnalyzeFile) {
				return originalAnalyzeFile(filePath, options);
			} else {
				return mockAnalysisResults.simple;
			}
		};

		return analyzer;
	}

	/**
	 * Reset all cached instances
	 */
	public static reset(): void {
		this.instances.clear();
		// Clean up any memory leaks
		if ((global as any).__testMemoryLeak) {
			delete (global as any).__testMemoryLeak;
		}
	}
}

/**
 * Factory function mocks for testing the function-based API
 */
export const mockFactoryFunctions = {
	/**
	 * Mock analyzeTypeScriptFile function
	 */
	analyzeTypeScriptFile: jest.fn().mockImplementation(
		async (filePath: string, options?: AnalysisOptions): Promise<AnalysisResult> => {
			// Simulate delay
			await new Promise(resolve => setTimeout(resolve, 10));

			if (filePath.includes('non-existent')) {
				throw new Error('File not found');
			}

			if (filePath.includes('complex')) {
				return mockAnalysisResults.complex;
			}

			return mockAnalysisResults.simple;
		}
	),

	/**
	 * Mock extractDependencies function
	 */
	extractDependencies: jest.fn().mockImplementation(
		async (source: string): Promise<DependencyInfo[]> => {
			await new Promise(resolve => setTimeout(resolve, 5));

			if (source.includes('ComplexClass')) {
				return mockAnalysisResults.complex.dependencies;
			}

			return mockAnalysisResults.simple.dependencies;
		}
	),

	/**
	 * Mock getBatchAnalysis function
	 */
	getBatchAnalysis: jest.fn().mockImplementation(
		async (filePaths: string[], options?: BatchAnalysisOptions): Promise<AnalysisResult[]> => {
			await new Promise(resolve => setTimeout(resolve, 20));

			return filePaths.map((filePath, index) => ({
				...mockAnalysisResults.simple,
				filePath,
			}));
		}
	),

	/**
	 * Mock analyzeDirectory function
	 */
	analyzeDirectory: jest.fn().mockImplementation(
		async (dirPath: string, options?: DirectoryOptions): Promise<AnalysisResult[]> => {
			await new Promise(resolve => setTimeout(resolve, 30));

			const fileCount = 3;
			return Array.from({ length: fileCount }, (_, index) => ({
				...mockAnalysisResults.simple,
				filePath: `${dirPath}/file-${index}.ts`,
			}));
		}
	),

	/**
	 * Reset all mocks
	 */
	resetAll: (): void => {
		Object.values(mockFactoryFunctions).forEach(mock => {
			if (typeof mock === 'function' && 'mockReset' in mock) {
				mock.mockReset();
			}
		});
	},
};

/**
 * Test data builders for creating various test scenarios
 */
export class TestDataBuilder {
	/**
	 * Build a simple TypeScript file content
	 */
	public static buildSimpleTypeScript(): string {
		return `
export interface TestType {
  id: number;
  name: string;
}

export const testFunction = (): TestType => ({
  id: 1,
  name: 'test'
});
`;
	}

	/**
	 * Build complex TypeScript file content with multiple dependencies
	 */
	public static buildComplexTypeScript(): string {
		return `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ComplexType<T = any> {
  id: number;
  data: T;
  metadata: Record<string, unknown>;
}

export class ComplexClass<T> extends EventEmitter {
  constructor(private data: T) {
    super();
  }

  public async process(): Promise<void> {
    const filePath = path.resolve('./data.json');
    const content = await readFile(filePath, 'utf8');
    this.emit('processed', JSON.parse(content));
  }
}
`;
	}

	/**
	 * Build TypeScript file with syntax errors
	 */
	public static buildErrorTypeScript(): string {
		return `
export interface ErrorType {
  id number; // Missing colon
  name: string;
}

export const errorFunction = (): ErrorType => {
  return { id: 'not-number', name: 123 }; // Type errors
};
`;
	}
}