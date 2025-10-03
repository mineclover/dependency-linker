/**
 * Test Dependency Tracking
 * Verifies that SymbolExtractor can track dependencies between symbols
 */

import path from "node:path";
import { initializeAnalysisSystem } from "./src/api/analysis";
import { createSymbolExtractor } from "./src/core/SymbolExtractor";
import { SymbolDependencyType } from "./src/core/symbol-types";

// Initialize the analysis system (parsers, queries, etc.)
initializeAnalysisSystem();

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

async function testDependencyTracking() {
	console.log("🔗 Testing Dependency Tracking");
	console.log("━".repeat(60));

	const extractor = createSymbolExtractor({
		projectRoot: process.cwd(),
		includeNested: true,
		extractDocs: true,
	});

	try {
		// Create a temporary test file
		const testFilePath = path.join(process.cwd(), "test-dependency-sample.ts");

		// Extract symbols and dependencies
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		console.log(`\n📁 File: ${result.filePath}`);
		console.log(`🔤 Language: ${result.language}`);
		console.log(`📊 Symbols extracted: ${result.symbols.length}`);
		console.log(`🔗 Dependencies found: ${result.dependencies.length}`);
		console.log("");

		// Group dependencies by type
		const depsByType = new Map<string, typeof result.dependencies>();
		for (const dep of result.dependencies) {
			const type = dep.type;
			if (!depsByType.has(type)) {
				depsByType.set(type, []);
			}
			depsByType.get(type)?.push(dep);
		}

		// Display dependencies by type
		for (const [type, deps] of depsByType.entries()) {
			console.log(`\n${getDependencyTypeIcon(type)} ${type.toUpperCase()}`);
			console.log("─".repeat(60));

			for (const dep of deps) {
				console.log(`  ${dep.from} → ${dep.to}`);
				console.log(`     Location: ${dep.location.line}:${dep.location.column}`);
				if (dep.context) {
					console.log(`     Context: ${dep.context.substring(0, 60)}...`);
				}
				console.log("");
			}
		}

		// Summary
		console.log("━".repeat(60));
		console.log("📈 Dependency Summary:");
		console.log(`   Total dependencies: ${result.dependencies.length}`);
		for (const [type, deps] of depsByType.entries()) {
			console.log(`   ${type}: ${deps.length}`);
		}

		// Verify expected dependencies
		console.log("\n✅ Verification:");
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

		let passed = 0;
		let failed = 0;

		for (const expected of expectedDependencies) {
			const found = result.dependencies.find(
				(d) => d.to === expected.to && d.type === expected.type,
			);

			if (found) {
				console.log(`   ✓ ${expected.description}`);
				passed++;
			} else {
				console.log(`   ✗ ${expected.description} - NOT FOUND`);
				failed++;
			}
		}

		console.log(`\n   Passed: ${passed}/${expectedDependencies.length}`);
		console.log(`   Failed: ${failed}/${expectedDependencies.length}`);

		if (failed === 0) {
			console.log("\n🎉 All dependency tests passed!");
		} else {
			console.log("\n⚠️  Some dependency tests failed");
		}
	} catch (error) {
		console.error("❌ Error:", error);
		throw error;
	}
}

function getDependencyTypeIcon(type: string): string {
	const icons: Record<string, string> = {
		call: "📞",
		instantiation: "🆕",
		"property-access": "📦",
		"type-reference": "🏷️",
		extends: "⬆️",
		implements: "✅",
		import: "📥",
		"type-parameter": "🔤",
	};
	return icons[type] || "🔗";
}

// Run test
testDependencyTracking().catch((error) => {
	console.error("Test failed:", error);
	process.exit(1);
});
