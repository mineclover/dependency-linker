import { performance } from "perf_hooks";
import { EnhancedExportExtractor } from "../../src/extractors/EnhancedExportExtractor";
import { TypeScriptParser } from "../../src/parsers/TypeScriptParser";

interface PerformanceMetrics {
	executionTime: number;
	memoryUsage: number;
	exportCount: number;
	accuracy: number;
	testCase: string;
}

interface ComparisonResult {
	baseline: PerformanceMetrics;
	optimized?: PerformanceMetrics;
	improvement: {
		executionTime: number;
		memoryUsage: number;
		throughput: number;
	};
}

class ExportExtractorBenchmark {
	private parser = new TypeScriptParser();
	private extractor = new EnhancedExportExtractor();

	/**
	 * 메모리 사용량 측정
	 */
	private measureMemoryUsage(): number {
		if (global.gc) {
			global.gc();
		}
		return process.memoryUsage().heapUsed;
	}

	/**
	 * 단일 테스트 케이스 벤치마크 실행
	 */
	async runSingleBenchmark(
		testCase: string,
		sourceCode: string,
		iterations: number = 10,
	): Promise<PerformanceMetrics> {
		const times: number[] = [];
		const memoryUsages: number[] = [];
		let exportCount = 0;
		let accuracy = 1.0;

		// 워밍업
		for (let i = 0; i < 3; i++) {
			await this.executeSingleRun(sourceCode);
		}

		// 실제 측정
		for (let i = 0; i < iterations; i++) {
			const memoryBefore = this.measureMemoryUsage();
			const startTime = performance.now();

			const result = await this.executeSingleRun(sourceCode);

			const endTime = performance.now();
			const memoryAfter = this.measureMemoryUsage();

			times.push(endTime - startTime);
			memoryUsages.push(memoryAfter - memoryBefore);

			if (i === 0) {
				exportCount = result.statistics.totalExports;
			}
		}

		return {
			executionTime: this.calculateMedian(times),
			memoryUsage: this.calculateMedian(memoryUsages),
			exportCount,
			accuracy,
			testCase,
		};
	}

	/**
	 * 단일 실행
	 */
	private async executeSingleRun(sourceCode: string) {
		const parseResult = await this.parser.parse("benchmark.ts", sourceCode);
		if (!parseResult.ast) {
			throw new Error("Failed to parse code");
		}
		return this.extractor.extractExports(parseResult.ast, "benchmark.ts");
	}

	/**
	 * 중간값 계산
	 */
	private calculateMedian(values: number[]): number {
		const sorted = values.sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	}

	/**
	 * 테스트 케이스 생성기
	 */
	generateTestCases(): Record<string, string> {
		return {
			"Small File (5 exports)": this.generateSmallFile(),
			"Medium File (50 exports)": this.generateMediumFile(),
			"Large File (200 exports)": this.generateLargeFile(),
			"Complex File (nested classes)": this.generateComplexFile(),
			"Real World Example": this.generateRealWorldExample(),
			"EnhancedExportExtractor.ts (1,272 lines)": this.loadRealPackageFile(
				"src/extractors/EnhancedExportExtractor.ts",
			),
			"IDataExtractor.ts (822 lines)": this.loadRealPackageFile(
				"src/extractors/IDataExtractor.ts",
			),
			"EnhancedDependencyExtractor.ts (503 lines)": this.loadRealPackageFile(
				"src/extractors/EnhancedDependencyExtractor.ts",
			),
		};
	}

	/**
	 * 소형 파일 생성 (5 exports)
	 */
	private generateSmallFile(): string {
		return `
export const API_URL = 'https://api.example.com';
export function getData(id: string): Promise<any> {
  return fetch(\`\${API_URL}/data/\${id}\`).then(res => res.json());
}

export class DataService {
  private baseUrl = API_URL;

  async fetchData(id: string) {
    return getData(id);
  }
}

export interface User {
  id: string;
  name: string;
}

export default DataService;
    `.trim();
	}

	/**
	 * 중형 파일 생성 (50 exports)
	 */
	private generateMediumFile(): string {
		const functions = Array.from(
			{ length: 20 },
			(_, i) =>
				`export function func${i}(param: number): number { return param * ${i}; }`,
		);

		const classes = Array.from(
			{ length: 10 },
			(_, i) => `
export class Class${i} {
  private value${i} = ${i};
  public method${i}(): number { return this.value${i}; }
  public static staticMethod${i}(): void {}
}`,
		);

		const interfaces = Array.from(
			{ length: 10 },
			(_, i) => `export interface Interface${i} { prop${i}: string; }`,
		);

		const variables = Array.from(
			{ length: 10 },
			(_, i) => `export const CONST_${i} = ${i};`,
		);

		return [...functions, ...classes, ...interfaces, ...variables].join("\n");
	}

	/**
	 * 대형 파일 생성 (200+ exports)
	 */
	private generateLargeFile(): string {
		const functions = Array.from(
			{ length: 80 },
			(_, i) =>
				`export function func${i}(param${i}: number): number { return param${i} * ${i}; }`,
		);

		const classes = Array.from(
			{ length: 40 },
			(_, i) => `
export class Class${i} {
  private value${i} = ${i};
  public method${i}(arg: string): string { return arg + ${i}; }
  public static staticMethod${i}(): void {}
  protected protectedProp${i} = '${i}';
}`,
		);

		const interfaces = Array.from(
			{ length: 40 },
			(_, i) =>
				`export interface Interface${i} { prop${i}: string; method${i}(): void; }`,
		);

		const variables = Array.from(
			{ length: 40 },
			(_, i) => `export const CONST_${i} = { value: ${i}, name: 'const${i}' };`,
		);

		return [...functions, ...classes, ...interfaces, ...variables].join("\n");
	}

	/**
	 * 복잡한 파일 생성 (상속, 제네릭, 중첩)
	 */
	private generateComplexFile(): string {
		return `
export abstract class BaseService<T> {
  protected abstract processData(data: T): T;

  public async getData<K extends keyof T>(key: K): Promise<T[K]> {
    const data = await this.fetchData();
    return data[key];
  }

  protected abstract fetchData(): Promise<T>;
}

export class UserService extends BaseService<User> {
  constructor(private apiKey: string) {
    super();
  }

  protected processData(data: User): User {
    return { ...data, processed: true };
  }

  protected async fetchData(): Promise<User> {
    return { id: '1', name: 'John', processed: false };
  }

  public static create(apiKey: string): UserService {
    return new UserService(apiKey);
  }
}

export interface User {
  id: string;
  name: string;
  processed?: boolean;
}

export namespace UserUtils {
  export interface UserConfig {
    timeout: number;
    retries: number;
  }

  export function validateUser(user: User): boolean {
    return Boolean(user.id && user.name);
  }

  export const DEFAULT_CONFIG: UserConfig = {
    timeout: 5000,
    retries: 3
  };
}

export type UserValidator = (user: User) => boolean;
export type ServiceFactory<T> = (config: any) => BaseService<T>;

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

export default UserService;
    `.trim();
	}

	/**
	 * 실제 패키지 파일 로드
	 */
	private loadRealPackageFile(filePath: string): string {
		try {
			const fs = require("fs");
			const path = require("path");
			const fullPath = path.resolve(filePath);
			return fs.readFileSync(fullPath, "utf-8");
		} catch (error) {
			console.warn(`Failed to load ${filePath}, using fallback`);
			return this.generateRealWorldExample();
		}
	}

	/**
	 * 실제 세계 예시 파일
	 */
	private generateRealWorldExample(): string {
		return `
import { EventEmitter } from 'events';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  apiKey?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient extends EventEmitter {
  private config: Required<ApiConfig>;
  private requestCount = 0;

  constructor(config: ApiConfig) {
    super();
    this.config = {
      timeout: 5000,
      retries: 3,
      apiKey: '',
      ...config
    };
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  private async request<T>(endpoint: string, options: RequestOptions): Promise<ApiResponse<T>> {
    this.requestCount++;
    this.emit('request', { endpoint, options });

    // 실제 구현 생략
    return {
      data: {} as T,
      status: 200,
      headers: {},
      timestamp: Date.now()
    };
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  static createDefault(): ApiClient {
    return new ApiClient({
      baseUrl: 'https://api.example.com',
      timeout: 10000,
      retries: 3
    });
  }
}

export const { createDefault } = ApiClient;
export { ApiClient as Client };

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type ResponseHandler<T> = (response: ApiResponse<T>) => void;

export default ApiClient;
    `.trim();
	}

	/**
	 * 전체 벤치마크 스위트 실행
	 */
	async runBenchmarkSuite(): Promise<Record<string, PerformanceMetrics>> {
		const testCases = this.generateTestCases();
		const results: Record<string, PerformanceMetrics> = {};

		console.log("🚀 EnhancedExportExtractor 성능 벤치마크 시작...");
		console.log("📦 실제 node_modules 패키지 파일들을 포함한 테스트\n");

		for (const [name, sourceCode] of Object.entries(testCases)) {
			console.log(`📊 ${name} 테스트 중...`);

			try {
				const metrics = await this.runSingleBenchmark(name, sourceCode, 10);
				results[name] = metrics;

				console.log(
					`   ✅ 완료: ${metrics.executionTime.toFixed(2)}ms, ${metrics.exportCount} exports`,
				);
				console.log(
					`       메모리: ${(metrics.memoryUsage / 1024).toFixed(2)}KB`,
				);
			} catch (error) {
				console.log(
					`   ❌ 실패: ${error instanceof Error ? error.message : String(error)}`,
				);
			}

			console.log();
		}

		return results;
	}

	/**
	 * 결과 보고서 생성
	 */
	generateReport(results: Record<string, PerformanceMetrics>): string {
		const report = ["# EnhancedExportExtractor 성능 벤치마크 보고서\n"];

		report.push(`## 📊 테스트 결과\n`);
		report.push(
			"| 테스트 케이스 | 실행 시간 | 메모리 사용량 | Export 수 | 처리율 (exports/ms) |",
		);
		report.push(
			"|--------------|-----------|---------------|-----------|-------------------|",
		);

		for (const [name, metrics] of Object.entries(results)) {
			const throughput = (metrics.exportCount / metrics.executionTime).toFixed(
				2,
			);
			report.push(
				`| ${name} | ${metrics.executionTime.toFixed(2)}ms | ${(metrics.memoryUsage / 1024).toFixed(2)}KB | ${metrics.exportCount} | ${throughput} |`,
			);
		}

		report.push("\n## 🎯 성능 분석");

		const avgTime =
			Object.values(results).reduce((sum, m) => sum + m.executionTime, 0) /
			Object.keys(results).length;
		const avgMemory =
			Object.values(results).reduce((sum, m) => sum + m.memoryUsage, 0) /
			Object.keys(results).length;

		report.push(`- **평균 실행 시간**: ${avgTime.toFixed(2)}ms`);
		report.push(`- **평균 메모리 사용량**: ${(avgMemory / 1024).toFixed(2)}KB`);

		const entries = Object.entries(results);
		const fastest = entries.reduce((min, [name, metrics]) =>
			metrics.executionTime < min[1].executionTime ? [name, metrics] : min,
		);

		const slowest = entries.reduce((max, [name, metrics]) =>
			metrics.executionTime > max[1].executionTime ? [name, metrics] : max,
		);

		report.push(
			`- **가장 빠른 케이스**: ${fastest[0]} (${fastest[1].executionTime.toFixed(2)}ms)`,
		);
		report.push(
			`- **가장 느린 케이스**: ${slowest[0]} (${slowest[1].executionTime.toFixed(2)}ms)`,
		);

		report.push(`\n## 📅 테스트 환경`);
		report.push(`- **Node.js 버전**: ${process.version}`);
		report.push(`- **플랫폼**: ${process.platform} ${process.arch}`);
		report.push(
			`- **메모리**: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
		);
		report.push(`- **테스트 시간**: ${new Date().toISOString()}`);

		return report.join("\n");
	}
}

// 벤치마크 실행 스크립트
if (require.main === module) {
	const benchmark = new ExportExtractorBenchmark();

	benchmark
		.runBenchmarkSuite()
		.then((results) => {
			const report = benchmark.generateReport(results);
			console.log("\n" + report);

			// 결과를 파일로 저장
			const fs = require("fs");
			const path = require("path");

			const reportPath = path.join(
				__dirname,
				"../../.performance-data/export-extractor-benchmark.md",
			);
			fs.writeFileSync(reportPath, report);

			console.log(`\n📄 보고서가 저장되었습니다: ${reportPath}`);
		})
		.catch((error) => {
			console.error("❌ 벤치마크 실행 중 오류:", error);
			process.exit(1);
		});
}

export { ExportExtractorBenchmark, PerformanceMetrics, ComparisonResult };
