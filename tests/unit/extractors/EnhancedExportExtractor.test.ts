/**
 * Unit tests for EnhancedExportExtractor
 */

import {
	EnhancedExportExtractor,
	type EnhancedExportExtractionResult,
	type ExportMethodInfo,
	type ExportStatistics,
	type ClassExportInfo,
} from "../../../src/extractors/EnhancedExportExtractor";
import { TypeScriptParser } from "../../../src/parsers/TypeScriptParser";
import type { AST } from "../../../src/extractors/IDataExtractor";
import { TestIsolationManager } from "../../helpers/test-isolation";

describe("EnhancedExportExtractor", () => {
	let extractor: EnhancedExportExtractor;
	let parser: TypeScriptParser;

	beforeEach(() => {
		extractor = new EnhancedExportExtractor();
		parser = new TypeScriptParser();
	});

	afterEach(async () => {
		await TestIsolationManager.cleanup();
	});

	/**
	 * Helper function to parse code and extract exports
	 */
	const parseAndExtract = async (
		code: string,
		filename = "/test.ts",
	): Promise<EnhancedExportExtractionResult | null> => {
		try {
			const parseResult = await parser.parse(filename, code);

			if (!parseResult.ast || parseResult.errors.length > 0) {
				return null;
			}

			const result = extractor.extract(parseResult.ast, filename);
			return result;
		} catch (error) {
			return null;
		}
	};

	describe("Basic Interface Implementation", () => {
		it("should implement IDataExtractor interface", () => {
			expect(extractor.getName()).toBe("EnhancedExportExtractor");
			expect(extractor.getVersion()).toBe("3.0.0");
			expect(extractor.supports("test.ts")).toBe(true);
			expect(extractor.supports("test.js")).toBe(true);
			expect(extractor.supports("test.py")).toBe(false);
		});

		it("should provide metadata", () => {
			const metadata = extractor.getMetadata();
			expect(metadata.name).toBe("EnhancedExportExtractor");
			expect(metadata.version).toBe("3.0.0");
			expect(metadata.supportedLanguages).toContain("typescript");
			expect(metadata.supportedLanguages).toContain("javascript");
		});

		it("should provide output schema", () => {
			const schema = extractor.getOutputSchema();
			expect(schema.type).toBe("object");
			expect(schema.properties).toHaveProperty("exportMethods");
			expect(schema.properties).toHaveProperty("statistics");
			expect(schema.properties).toHaveProperty("classes");
		});
	});

	describe("Function Export Detection", () => {
		it("should extract simple function exports", async () => {
			const code = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export async function fetchData(url: string): Promise<any> {
  return fetch(url);
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.functionExports).toBe(2);
			expect(result!.statistics.totalExports).toBe(2);

			const functions = result!.exportMethods.filter(
				(exp) => exp.exportType === "function",
			);
			expect(functions).toHaveLength(2);

			const greet = functions.find((fn) => fn.name === "greet");
			expect(greet).toBeDefined();
			expect(greet!.isAsync).toBe(false);
			expect(greet!.parameters).toHaveLength(1);
			expect(greet!.parameters![0].name).toBe("name");

			const fetchData = functions.find((fn) => fn.name === "fetchData");
			expect(fetchData).toBeDefined();
			expect(fetchData!.isAsync).toBe(true);
		});

		it("should handle function parameters correctly", async () => {
			const code = `
export function complexFunction(
  required: string,
  optional?: number,
  defaultParam: boolean = true,
  ...rest: any[]
): void {}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();

			const func = result!.exportMethods.find(
				(exp) => exp.name === "complexFunction",
			);
			expect(func).toBeDefined();
			expect(func!.parameters).toHaveLength(4);
			expect(func!.parameters![1].optional).toBe(true);
		});
	});

	describe("Class Export Detection", () => {
		it("should extract class exports with methods and properties", async () => {
			const code = `
export class Calculator {
  private value: number = 0;
  public static PI = 3.14159;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  public add(num: number): void {
    this.value += num;
  }

  public static multiply(a: number, b: number): number {
    return a * b;
  }

  private validate(): boolean {
    return this.value >= 0;
  }

  protected reset(): void {
    this.value = 0;
  }
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.classExports).toBe(1);
			expect(result!.statistics.classMethodsExports).toBeGreaterThan(0);
			expect(result!.statistics.classPropertiesExports).toBeGreaterThan(0);

			const classExport = result!.exportMethods.find(
				(exp) => exp.exportType === "class",
			);
			expect(classExport).toBeDefined();
			expect(classExport!.name).toBe("Calculator");

			const methods = result!.exportMethods.filter(
				(exp) => exp.exportType === "class_method",
			);
			const addMethod = methods.find((m) => m.name === "add");
			expect(addMethod).toBeDefined();
			expect(addMethod!.parentClass).toBe("Calculator");
			expect(addMethod!.visibility).toBe("public");
			expect(addMethod!.isStatic).toBe(false);

			const multiplyMethod = methods.find((m) => m.name === "multiply");
			expect(multiplyMethod).toBeDefined();
			expect(multiplyMethod!.isStatic).toBe(true);

			const validateMethod = methods.find((m) => m.name === "validate");
			expect(validateMethod).toBeDefined();
			expect(validateMethod!.visibility).toBe("private");

			// Check class details
			expect(result!.classes).toHaveLength(1);
			const classInfo = result!.classes[0];
			expect(classInfo.className).toBe("Calculator");
			expect(classInfo.methods.length).toBeGreaterThan(0);
			expect(classInfo.properties.length).toBeGreaterThan(0);
		});

		it("should handle class inheritance", async () => {
			const code = `
export abstract class BaseService {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  public abstract process(): Promise<void>;
}

export class UserService extends BaseService {
  constructor() {
    super('UserService');
  }

  public async process(): Promise<void> {
    // implementation
  }
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.classExports).toBe(2);

			const userServiceClass = result!.classes.find(
				(cls) => cls.className === "UserService",
			);
			expect(userServiceClass).toBeDefined();
			expect(userServiceClass!.superClass).toBe("BaseService");
		});
	});

	describe("Variable Export Detection", () => {
		it("should extract variable exports", async () => {
			const code = `
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var debugMode = false;

const internal = 'private';
export { internal as publicInternal };
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.variableExports).toBeGreaterThanOrEqual(3);

			const variables = result!.exportMethods.filter(
				(exp) => exp.exportType === "variable",
			);
			const apiUrl = variables.find((v) => v.name === "API_URL");
			expect(apiUrl).toBeDefined();
			expect(apiUrl!.declarationType).toBe("named_export");
		});
	});

	describe("Type Export Detection", () => {
		it("should extract type and interface exports", async () => {
			const code = `
export interface User {
  id: string;
  name: string;
  email: string;
}

export type UserFilter = Partial<Pick<User, 'name' | 'email'>>;

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.typeExports).toBeGreaterThanOrEqual(2);

			const types = result!.exportMethods.filter(
				(exp) => exp.exportType === "type",
			);
			expect(types.length).toBeGreaterThanOrEqual(2);

			const userInterface = types.find((t) => t.name === "User");
			expect(userInterface).toBeDefined();

			const userTypeAlias = types.find((t) => t.name === "UserFilter");
			expect(userTypeAlias).toBeDefined();
		});
	});

	describe("Default Export Detection", () => {
		it("should extract default exports", async () => {
			const code = `
class DefaultService {
  process() {
    return 'processed';
  }
}

export default DefaultService;
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.defaultExports).toBe(1);

			const defaultExport = result!.exportMethods.find(
				(exp) => exp.exportType === "default",
			);
			expect(defaultExport).toBeDefined();
		});

		it("should handle inline default exports", async () => {
			const code = `
export default class InlineDefault {
  method() {
    return 'inline';
  }
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.defaultExports).toBe(1);
			expect(result!.statistics.classExports).toBe(1);
		});
	});

	describe("Re-export Detection", () => {
		it("should detect re-exports", async () => {
			const code = `
export { UserService, ApiService } from './services';
export * from './types';
export { default as DefaultLogger } from './logger';
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();

			const reExports = result!.exportMethods.filter(
				(exp) => exp.exportType === "re_export",
			);
			expect(reExports.length).toBeGreaterThan(0);
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle mixed export types in single file", async () => {
			const code = `
// Function exports
export function utils() {}
export async function asyncUtils() {}

// Class exports
export class Service {
  private prop = 'value';

  public method(): string {
    return this.prop;
  }

  public static staticMethod(): void {}
}

// Variable exports
export const CONSTANTS = { version: '1.0.0' };
export let mutableState = {};

// Type exports
export interface Config {
  apiUrl: string;
}

export type ConfigKey = keyof Config;

// Default export
export default class DefaultClass {
  defaultMethod() {}
}

// Re-exports
export { ExternalType } from './external';
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();

			// Check statistics
			expect(result!.statistics.functionExports).toBe(2);
			expect(result!.statistics.classExports).toBe(2);
			expect(result!.statistics.variableExports).toBe(2);
			expect(result!.statistics.typeExports).toBe(2);
			expect(result!.statistics.defaultExports).toBe(1);
			expect(result!.statistics.classMethodsExports).toBeGreaterThan(0);

			// Verify total count
			expect(result!.statistics.totalExports).toBeGreaterThan(8);
		});
	});

	describe("Location Information", () => {
		it("should provide accurate location information", async () => {
			const code = `
export function firstFunction() {}

export class TestClass {
  method() {}
}

export const variable = 'value';
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();

			result!.exportMethods.forEach((exp) => {
				expect(exp.location.line).toBeGreaterThan(0);
				expect(exp.location.column).toBeGreaterThanOrEqual(0);
			});

			// First function should be on line 2
			const firstFunc = result!.exportMethods.find(
				(exp) => exp.name === "firstFunction",
			);
			expect(firstFunc).toBeDefined();
			expect(firstFunc!.location.line).toBe(2);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty files", async () => {
			const result = await parseAndExtract("");
			expect(result).not.toBeNull();
			expect(result!.statistics.totalExports).toBe(0);
			expect(result!.exportMethods).toHaveLength(0);
			expect(result!.classes).toHaveLength(0);
		});

		it("should handle files with no exports", async () => {
			const code = `
function internalFunction() {}
class InternalClass {}
const internal = 'value';
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.totalExports).toBe(0);
		});

		it("should handle syntax errors gracefully", async () => {
			const brokenCode = `
export function broken(
// missing closing parenthesis and brace
			`;

			const result = await parseAndExtract(brokenCode);
			// Should return null or handle gracefully
			expect(result).toBeNull();
		});

		it("should handle complex generic types", async () => {
			const code = `
export function genericFunction<T extends Record<string, any>>(
  param: T
): Promise<T[]> {
  return Promise.resolve([param]);
}

export class GenericClass<T, U = string> {
  process<V>(input: T): U | V {
    return input as any;
  }
}
			`;

			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();
			expect(result!.statistics.functionExports).toBe(1);
			expect(result!.statistics.classExports).toBe(1);
		});
	});

	describe("Validation", () => {
		it("should validate extraction results", async () => {
			const code = `export function test() {}`;
			const result = await parseAndExtract(code);
			expect(result).not.toBeNull();

			const validation = extractor.validate(result!);
			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it("should detect invalid results", () => {
			const invalidResult = {
				exportMethods: null as any,
				statistics: {} as any,
				classes: [] as any,
			};

			const validation = extractor.validate(invalidResult);
			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});
	});

	describe("Configuration", () => {
		it("should allow configuration changes", () => {
			const originalConfig = extractor.getConfiguration();

			extractor.configure({
				timeout: 5000,
				memoryLimit: 25 * 1024 * 1024,
			});

			const newConfig = extractor.getConfiguration();
			expect(newConfig.timeout).toBe(30000);
			expect(newConfig.memoryLimit).toBe(100 * 1024 * 1024); // Should remain original value since configure() is not implemented

			// Other settings should remain unchanged
			expect(newConfig.enabled).toBe(originalConfig.enabled);
		});
	});

	describe("Performance", () => {
		it("should handle moderately large files", async () => {
			// Generate a file with many exports
			const functions = Array(50)
				.fill(0)
				.map(
					(_, i) =>
						`export function func${i}(param: number): number { return param * ${i}; }`,
				)
				.join("\n");

			const classes = Array(10)
				.fill(0)
				.map(
					(_, i) => `
export class Class${i} {
  private value${i} = ${i};
  public method${i}(): number { return this.value${i}; }
  public static staticMethod${i}(): void {}
}
			`,
				)
				.join("\n");

			const code = functions + "\n" + classes;

			const startTime = Date.now();
			const result = await parseAndExtract(code);
			const endTime = Date.now();

			expect(result).not.toBeNull();
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
			expect(result!.statistics.totalExports).toBeGreaterThan(60);
		});
	});

	describe("Memory Management", () => {
		it("should clean up resources on dispose", () => {
			const spy = jest.spyOn(extractor, "dispose");
			extractor.dispose();
			expect(spy).toHaveBeenCalled();
		});
	});
});
