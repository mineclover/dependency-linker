/**
 * Test Dependency Tracking
 * Verifies that SymbolExtractor can track dependencies between symbols
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import path from "node:path";
import { initializeAnalysisSystem } from "../src/api/analysis";
import { createSymbolExtractor } from "../src/core/SymbolExtractor";
import { SymbolDependencyType } from "../src/core/symbol-types";

// Sample TypeScript code with various dependencies
const sampleCode = `
/**
 * Base class for users
 */
export class BaseUser {
	protected id: number;

	constructor(id: number) {
		this.id = id;
	}
}

/**
 * User interface
 */
export interface IUser {
	name: string;
	email: string;
}

/**
 * User service class with dependencies
 */
export class UserService extends BaseUser implements IUser {
	name: string;
	email: string;

	constructor(id: number, name: string, email: string) {
		super(id); // Call to parent constructor
		this.name = name;
		this.email = email;
	}

	/**
	 * Validate user - calls external function
	 */
	validateUser(): boolean {
		return validateEmail(this.email);
	}

	/**
	 * Create notification - instantiates a class
	 */
	notify(message: string): void {
		const notification = new Notification(message);
		notification.send();
	}
}

/**
 * Standalone validation function
 */
export function validateEmail(email: string): boolean {
	return email.includes('@');
}

/**
 * Notification class
 */
export class Notification {
	private message: string;

	constructor(message: string) {
		this.message = message;
	}

	send(): void {
		console.log(this.message);
	}
}

/**
 * User factory with type references
 */
export function createUser(data: IUser): BaseUser {
	return new UserService(1, data.name, data.email);
}
`;

describe("Symbol Dependency Tracking", () => {
	beforeEach(() => {
		// Initialize the analysis system before each test to ensure clean state
		initializeAnalysisSystem();
	});

	it("should extract symbols and dependencies from TypeScript code", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		// Create a test file path (file doesn't need to exist, we pass sourceCode directly)
		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");

		// Extract symbols and dependencies
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Basic assertions
		expect(result.filePath).toBe("test-dependency-sample.ts");
		expect(result.language).toBe("typescript");
		expect(result.symbols.length).toBeGreaterThan(0);
		expect(result.dependencies.length).toBeGreaterThan(0);
	});

	it("should detect extends relationship", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Find extends dependency
		const extendsDep = result.dependencies.find(
			(d) => d.to === "/BaseUser" && d.type === SymbolDependencyType.Extends,
		);

		expect(extendsDep).toBeDefined();
		expect(extendsDep?.type).toBe(SymbolDependencyType.Extends);
	});

	it("should detect implements relationship", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Find implements dependency
		const implementsDep = result.dependencies.find(
			(d) => d.to === "/IUser" && d.type === SymbolDependencyType.Implements,
		);

		expect(implementsDep).toBeDefined();
		expect(implementsDep?.type).toBe(SymbolDependencyType.Implements);
	});

	it("should detect function calls", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Find call dependencies
		const callDeps = result.dependencies.filter(
			(d) => d.type === SymbolDependencyType.Call,
		);

		expect(callDeps.length).toBeGreaterThan(0);

		// Check for specific calls
		const validateEmailCall = callDeps.find((d) => d.to === "/validateEmail");
		const sendCall = callDeps.find((d) => d.to === "/send");

		expect(validateEmailCall).toBeDefined();
		expect(sendCall).toBeDefined();
	});

	it("should detect class instantiation", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Find instantiation dependencies
		const instantiationDeps = result.dependencies.filter(
			(d) => d.type === SymbolDependencyType.Instantiation,
		);

		expect(instantiationDeps.length).toBeGreaterThan(0);

		// Check for specific instantiations
		const notificationNew = instantiationDeps.find(
			(d) => d.to === "/Notification",
		);
		const userServiceNew = instantiationDeps.find(
			(d) => d.to === "/UserService",
		);

		expect(notificationNew).toBeDefined();
		expect(userServiceNew).toBeDefined();
	});

	it("should detect type references", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Find type reference dependencies
		const typeRefDeps = result.dependencies.filter(
			(d) => d.type === SymbolDependencyType.TypeReference,
		);

		expect(typeRefDeps.length).toBeGreaterThan(0);

		// Check for type references in createUser function
		const iUserRef = typeRefDeps.find((d) => d.to === "/IUser");
		const baseUserRef = typeRefDeps.find((d) => d.to === "/BaseUser");

		expect(iUserRef).toBeDefined();
		expect(baseUserRef).toBeDefined();
	});

	it("should track all expected dependency types", async () => {
		const extractor = createSymbolExtractor({
			projectRoot: process.cwd(),
			includeNested: true,
			extractDocs: true,
		});

		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		// Expected dependencies
		const expectedDependencies = [
			{
				to: "/BaseUser",
				type: SymbolDependencyType.Extends,
				description: "UserService extends BaseUser",
			},
			{
				to: "/IUser",
				type: SymbolDependencyType.Implements,
				description: "UserService implements IUser",
			},
			{
				to: "/super",
				type: SymbolDependencyType.Call,
				description: "Call to parent constructor",
			},
			{
				to: "/validateEmail",
				type: SymbolDependencyType.Call,
				description: "Call to validateEmail function",
			},
			{
				to: "/Notification",
				type: SymbolDependencyType.Instantiation,
				description: "new Notification() instantiation",
			},
			{
				to: "/send",
				type: SymbolDependencyType.Call,
				description: "notification.send() method call",
			},
			{
				to: "/IUser",
				type: SymbolDependencyType.TypeReference,
				description: "data: IUser parameter type",
			},
			{
				to: "/BaseUser",
				type: SymbolDependencyType.TypeReference,
				description: "return type BaseUser",
			},
			{
				to: "/UserService",
				type: SymbolDependencyType.Instantiation,
				description: "new UserService() in createUser",
			},
		];

		// Check each expected dependency
		for (const expected of expectedDependencies) {
			const found = result.dependencies.find(
				(d) => d.to === expected.to && d.type === expected.type,
			);

			expect(found).toBeDefined();
		}
	});
});
