/**
 * Enhanced Export Extractor - File-Level Usage Examples
 *
 * This file demonstrates practical usage patterns for EnhancedExportExtractor
 * with real-world TypeScript code examples and analysis scenarios.
 */

import { EnhancedExportExtractor } from "../src/extractors/EnhancedExportExtractor";
import { TypeScriptParser } from "../src/parsers/TypeScriptParser";
import type {
	EnhancedExportExtractionResult,
	ExportMethodInfo,
	ClassExportInfo,
} from "../src/extractors/EnhancedExportExtractor";

// ===== EXAMPLE 1: Basic Usage Pattern =====
async function basicUsageExample() {
	console.log("🔸 Example 1: Basic Usage Pattern");
	console.log("=====================================\n");

	const parser = new TypeScriptParser();
	const extractor = new EnhancedExportExtractor();

	const simpleCode = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export class Counter {
  private count: number = 0;

  public increment(): void {
    this.count++;
  }

  public getCount(): number {
    return this.count;
  }
}

export const VERSION = '1.0.0';
export let isDebug = false;
`;

	try {
		const parseResult = await parser.parse("/example.ts", simpleCode);

		if (!parseResult.ast || parseResult.errors.length > 0) {
			console.error("❌ 파싱 실패:", parseResult.errors);
			return;
		}

		const result = extractor.extractExports(parseResult.ast, "/example.ts");

		console.log("📊 통계:");
		console.log(`  전체 exports: ${result.statistics.totalExports}`);
		console.log(`  함수: ${result.statistics.functionExports}`);
		console.log(`  클래스: ${result.statistics.classExports}`);
		console.log(`  클래스 메서드: ${result.statistics.classMethodsExports}`);
		console.log(`  변수: ${result.statistics.variableExports}\n`);

		console.log("📋 Export 목록:");
		result.exportMethods.forEach((exp, index) => {
			console.log(`  ${index + 1}. ${exp.name} (${exp.exportType})`);
			if (exp.parentClass) {
				console.log(`     └─ 소속 클래스: ${exp.parentClass}`);
			}
		});
	} catch (error) {
		console.error("❌ 오류:", error);
	}

	console.log("\n");
}

// ===== EXAMPLE 2: Advanced Class Analysis =====
async function advancedClassAnalysisExample() {
	console.log("🔸 Example 2: Advanced Class Analysis");
	console.log("======================================\n");

	const parser = new TypeScriptParser();
	const extractor = new EnhancedExportExtractor();

	const complexClassCode = `
export abstract class BaseRepository<T> {
  protected static connection: Database;
  private cache = new Map<string, T>();

  constructor(protected tableName: string) {}

  public abstract findById(id: string): Promise<T | null>;

  public static setConnection(db: Database): void {
    BaseRepository.connection = db;
  }

  protected async cacheGet(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  private logAccess(operation: string): void {
    console.log(\`Access: \${operation} on \${this.tableName}\`);
  }
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  public async findById(id: string): Promise<User | null> {
    this.logAccess('findById');
    return this.cacheGet(id);
  }

  public async findByEmail(email: string): Promise<User | null> {
    return UserRepository.connection.query('SELECT * FROM users WHERE email = ?', [email]);
  }

  public static async createTable(): Promise<void> {
    await this.connection.execute('CREATE TABLE users...');
  }
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export type UserFilter = Partial<Pick<User, 'email' | 'name'>>;
`;

	try {
		const parseResult = await parser.parse(
			"/repositories.ts",
			complexClassCode,
		);

		if (!parseResult.ast || parseResult.errors.length > 0) {
			console.error("❌ 파싱 실패:", parseResult.errors);
			return;
		}

		const result = extractor.extractExports(
			parseResult.ast,
			"/repositories.ts",
		);

		console.log("🏗️ 클래스 상세 분석:");
		result.classes.forEach((cls) => {
			console.log(`\n📁 클래스: ${cls.className}`);
			console.log(`   위치: Line ${cls.location.line}`);

			if (cls.superClass) {
				console.log(`   상속: ${cls.superClass}`);
			}

			if (cls.methods.length > 0) {
				console.log("   메서드:");
				cls.methods.forEach((method) => {
					const modifiers = [];
					if (method.isStatic) modifiers.push("static");
					if (method.isAsync) modifiers.push("async");

					const signature = method.parameters
						.map((p) => `${p.name}${p.optional ? "?" : ""}: ${p.type || "any"}`)
						.join(", ");

					console.log(
						`     - ${modifiers.join(" ")} ${method.visibility} ${method.name}(${signature})`,
					);
				});
			}

			if (cls.properties.length > 0) {
				console.log("   프로퍼티:");
				cls.properties.forEach((prop) => {
					const modifiers = prop.isStatic ? "static" : "";
					console.log(
						`     - ${modifiers} ${prop.visibility} ${prop.name}${prop.type ? `: ${prop.type}` : ""}`,
					);
				});
			}
		});

		// Export 유형별 분류
		console.log("\n📊 Export 유형별 분석:");
		const byType = result.exportMethods.reduce(
			(acc, exp) => {
				if (!acc[exp.exportType]) acc[exp.exportType] = [];
				acc[exp.exportType].push(exp);
				return acc;
			},
			{} as Record<string, ExportMethodInfo[]>,
		);

		Object.entries(byType).forEach(([type, exports]) => {
			console.log(`  ${type}: ${exports.length}개`);
			exports.forEach((exp) => console.log(`    - ${exp.name}`));
		});
	} catch (error) {
		console.error("❌ 오류:", error);
	}

	console.log("\n");
}

// ===== EXAMPLE 3: Multi-File Analysis =====
async function multiFileAnalysisExample() {
	console.log("🔸 Example 3: Multi-File Analysis");
	console.log("==================================\n");

	const parser = new TypeScriptParser();
	const extractor = new EnhancedExportExtractor();

	const files = [
		{
			path: "/utils.ts",
			content: `
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  // implementation
  return () => {};
}

export const CONSTANTS = {
  API_URL: 'https://api.example.com',
  TIMEOUT: 5000
} as const;
`,
		},
		{
			path: "/services.ts",
			content: `
export class ApiService {
  private baseURL: string;

  constructor(baseURL: string = CONSTANTS.API_URL) {
    this.baseURL = baseURL;
  }

  public async get<T>(endpoint: string): Promise<T> {
    // implementation
    return {} as T;
  }

  public async post<T, U = any>(endpoint: string, data: U): Promise<T> {
    // implementation
    return {} as T;
  }
}

export default class DefaultLogger {
  public log(message: string): void {
    console.log(\`[\${formatDate(new Date())}] \${message}\`);
  }
}
`,
		},
		{
			path: "/types.ts",
			content: `
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  LOADING = 'loading'
}

export default interface Config {
  apiUrl: string;
  debug: boolean;
}
`,
		},
	];

	const results: Array<{
		file: string;
		result: EnhancedExportExtractionResult | null;
	}> = [];

	// 각 파일 분석
	for (const file of files) {
		try {
			const parseResult = await parser.parse(file.path, file.content);

			if (!parseResult.ast || parseResult.errors.length > 0) {
				console.error(`❌ ${file.path} 파싱 실패:`, parseResult.errors);
				results.push({ file: file.path, result: null });
				continue;
			}

			const result = extractor.extractExports(parseResult.ast, file.path);
			results.push({ file: file.path, result });
		} catch (error) {
			console.error(`❌ ${file.path} 분석 오류:`, error);
			results.push({ file: file.path, result: null });
		}
	}

	// 결과 집계
	console.log("📊 다중 파일 분석 결과:");

	let totalStats = {
		files: 0,
		totalExports: 0,
		functions: 0,
		classes: 0,
		variables: 0,
		types: 0,
		defaultExports: 0,
	};

	results.forEach(({ file, result }) => {
		if (!result) {
			console.log(`  ❌ ${file}: 분석 실패`);
			return;
		}

		totalStats.files++;
		totalStats.totalExports += result.statistics.totalExports;
		totalStats.functions += result.statistics.functionExports;
		totalStats.classes += result.statistics.classExports;
		totalStats.variables += result.statistics.variableExports;
		totalStats.types += result.statistics.typeExports;
		totalStats.defaultExports += result.statistics.defaultExports;

		console.log(`  ✅ ${file}:`);
		console.log(
			`     exports: ${result.statistics.totalExports}, functions: ${result.statistics.functionExports}, classes: ${result.statistics.classExports}`,
		);
	});

	console.log("\n📈 전체 통계:");
	console.log(`  분석된 파일: ${totalStats.files}`);
	console.log(`  총 exports: ${totalStats.totalExports}`);
	console.log(`  함수: ${totalStats.functions}`);
	console.log(`  클래스: ${totalStats.classes}`);
	console.log(`  변수: ${totalStats.variables}`);
	console.log(`  타입: ${totalStats.types}`);
	console.log(`  기본 exports: ${totalStats.defaultExports}`);

	console.log("\n");
}

// ===== EXAMPLE 4: Error Handling and Validation =====
async function errorHandlingExample() {
	console.log("🔸 Example 4: Error Handling and Validation");
	console.log("=============================================\n");

	const parser = new TypeScriptParser();
	const extractor = new EnhancedExportExtractor();

	// 문법 오류가 있는 코드
	const brokenCode = `
export function test(
  // 누락된 괄호와 구문 오류
export class BrokenClass {
  method() {
    console.log("unclosed string
  }
`;

	// 빈 파일
	const emptyCode = "";

	// 올바른 코드
	const validCode = `
export function validFunction(): void {
  console.log('This works!');
}
`;

	const testCases = [
		{ name: "문법 오류", code: brokenCode },
		{ name: "빈 파일", code: emptyCode },
		{ name: "정상 파일", code: validCode },
	];

	for (const testCase of testCases) {
		console.log(`🧪 테스트: ${testCase.name}`);

		try {
			const parseResult = await parser.parse(
				`/${testCase.name}.ts`,
				testCase.code,
			);

			// 파싱 결과 검사
			if (!parseResult.ast) {
				console.log("  ❌ AST 생성 실패");
				continue;
			}

			if (parseResult.errors.length > 0) {
				console.log("  ⚠️  파싱 오류 발견:");
				parseResult.errors.forEach((error) => {
					console.log(`    - ${error.message} (Line ${error.location.line})`);
				});
			}

			// Export 추출 시도
			const result = extractor.extractExports(
				parseResult.ast,
				`/${testCase.name}.ts`,
			);

			// 결과 검증
			const validation = extractor.validate(result);

			if (!validation.isValid) {
				console.log("  ❌ 검증 실패:");
				validation.errors.forEach((error) => console.log(`    - ${error}`));
			} else {
				console.log(
					`  ✅ 성공: ${result.statistics.totalExports}개 export 발견`,
				);
			}

			if (validation.warnings.length > 0) {
				console.log("  ⚠️  검증 경고:");
				validation.warnings.forEach((warning) =>
					console.log(`    - ${warning}`),
				);
			}
		} catch (error) {
			console.log(
				`  💥 예외 발생: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		console.log("");
	}
}

// ===== EXAMPLE 5: Performance and Configuration =====
async function performanceConfigExample() {
	console.log("🔸 Example 5: Performance and Configuration");
	console.log("============================================\n");

	const extractor = new EnhancedExportExtractor();

	// 현재 설정 확인
	console.log("🔧 기본 설정:");
	const currentConfig = extractor.getConfiguration();
	console.log(
		`  메모리 제한: ${(currentConfig.memoryLimit! / 1024 / 1024).toFixed(1)}MB`,
	);
	console.log(`  타임아웃: ${currentConfig.timeout}ms`);
	console.log(`  우선순위: ${currentConfig.priority}`);

	// 설정 변경
	console.log("\n⚙️  성능 최적화 설정 적용...");
	extractor.configure({
		timeout: 10000, // 10초
		memoryLimit: 50 * 1024 * 1024, // 50MB
		priority: 2,
		defaultOptions: {
			includeLocations: true,
			includeComments: false,
			maxDepth: 20,
			custom: {
				includeTypeAnnotations: true,
				analyzeInheritance: true,
			},
		},
	});

	// 메타데이터 확인
	console.log("\n📋 추출기 메타데이터:");
	const metadata = extractor.getMetadata();
	console.log(`  이름: ${metadata.name}`);
	console.log(`  버전: ${metadata.version}`);
	console.log(`  지원 언어: ${metadata.supportedLanguages?.join(", ")}`);
	console.log(
		`  평균 처리 속도: ${metadata.performance?.averageTimePerNode}ms/노드`,
	);
	console.log(`  메모리 사용량: ${metadata.performance?.memoryUsage}`);
	console.log(`  시간 복잡도: ${metadata.performance?.timeComplexity}`);

	// 대용량 파일 시뮬레이션
	const largeFileCode = Array(100)
		.fill(0)
		.map(
			(_, i) => `
export function func${i}(param${i}: string): string {
  return \`result\${param${i}}\`;
}

export class Class${i} {
  private prop${i}: number = ${i};

  public method${i}(): number {
    return this.prop${i};
  }
}
`,
		)
		.join("\n");

	console.log("\n⏱️  대용량 파일 처리 테스트...");
	const startTime = Date.now();
	const memoryBefore = process.memoryUsage();

	try {
		const parser = new TypeScriptParser();
		const parseResult = await parser.parse("/large-file.ts", largeFileCode);

		if (parseResult.ast) {
			const result = extractor.extractExports(
				parseResult.ast,
				"/large-file.ts",
			);

			const endTime = Date.now();
			const memoryAfter = process.memoryUsage();

			console.log(`  ✅ 처리 완료: ${endTime - startTime}ms`);
			console.log(`  📊 결과: ${result.statistics.totalExports}개 export`);
			console.log(
				`  💾 메모리 사용: ${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)}MB 증가`,
			);
		}
	} catch (error) {
		console.log(
			`  ❌ 처리 실패: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	console.log("\n");
}

// ===== UTILITY FUNCTIONS =====

/**
 * Export 결과를 JSON 형태로 정리하여 출력
 */
function formatResultAsJson(result: EnhancedExportExtractionResult): string {
	return JSON.stringify(
		{
			summary: result.statistics,
			exports: result.exportMethods.map((exp) => ({
				name: exp.name,
				type: exp.exportType,
				declaration: exp.declarationType,
				location: `Line ${exp.location.line}`,
				...(exp.parentClass && { parentClass: exp.parentClass }),
				...(exp.visibility && { visibility: exp.visibility }),
				...(exp.parameters && {
					parameters: exp.parameters.map(
						(p) => `${p.name}${p.optional ? "?" : ""}`,
					),
				}),
			})),
			classes: result.classes.map((cls) => ({
				name: cls.className,
				location: `Line ${cls.location.line}`,
				methodCount: cls.methods.length,
				propertyCount: cls.properties.length,
				...(cls.superClass && { extends: cls.superClass }),
			})),
		},
		null,
		2,
	);
}

/**
 * Export 유형별로 그룹화
 */
function groupExportsByType(exports: ExportMethodInfo[]) {
	return exports.reduce(
		(groups, exp) => {
			const type = exp.exportType;
			if (!groups[type]) groups[type] = [];
			groups[type].push(exp);
			return groups;
		},
		{} as Record<string, ExportMethodInfo[]>,
	);
}

// ===== MAIN EXECUTION =====
async function runAllExamples() {
	console.log("🚀 Enhanced Export Extractor - Usage Examples");
	console.log("==============================================\n");

	await basicUsageExample();
	await advancedClassAnalysisExample();
	await multiFileAnalysisExample();
	await errorHandlingExample();
	await performanceConfigExample();

	console.log("✅ 모든 예시 실행 완료!");
}

// 스크립트가 직접 실행될 때만 예시 실행
if (require.main === module) {
	runAllExamples().catch(console.error);
}

export {
	basicUsageExample,
	advancedClassAnalysisExample,
	multiFileAnalysisExample,
	errorHandlingExample,
	performanceConfigExample,
	formatResultAsJson,
	groupExportsByType,
};
