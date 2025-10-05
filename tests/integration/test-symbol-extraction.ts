/**
 * Test Symbol Extraction
 * Verifies that SymbolExtractor can extract symbols from TypeScript files
 */

import path from "node:path";
import { initializeAnalysisSystem } from "../../src/api/analysis";
import { createSymbolExtractor } from "../../src/core/SymbolExtractor";

// Initialize the analysis system (parsers, queries, etc.)
initializeAnalysisSystem();

// Sample TypeScript code with various symbols
const sampleCode = `
/**
 * User interface
 */
export interface User {
	id: number;
	name: string;
	email: string;
}

/**
 * User role enum
 */
export enum UserRole {
	Admin = 'admin',
	User = 'user',
	Guest = 'guest',
}

/**
 * User service class
 */
export class UserService {
	private users: User[] = [];

	constructor(private readonly config: { maxUsers: number }) {}

	/**
	 * Get user by ID
	 */
	getUserById(id: number): User | undefined {
		return this.users.find(u => u.id === id);
	}

	/**
	 * Add new user
	 */
	async addUser(user: User): Promise<void> {
		if (this.users.length >= this.config.maxUsers) {
			throw new Error('Max users reached');
		}
		this.users.push(user);
	}
}

/**
 * Validate user data
 */
export function validateUser(user: User): boolean {
	return Boolean(user.id && user.name && user.email);
}

/**
 * Format user name
 */
export const formatUserName = (user: User): string => {
	return \`\${user.name} <\${user.email}>\`;
};

/**
 * User data type
 */
export type UserData = Pick<User, 'name' | 'email'>;
`;

async function testSymbolExtraction() {
	console.log("🧪 Testing Symbol Extraction");
	console.log("━".repeat(60));

	const extractor = createSymbolExtractor({
		projectRoot: process.cwd(),
		includeNested: true,
		extractDocs: true,
	});

	try {
		// Create a temporary test file
		const testFilePath = path.join(process.cwd(), "test-sample.ts");

		// Extract symbols from the sample code
		const result = await extractor.extractFromFile(
			testFilePath,
			"typescript",
			sampleCode,
		);

		console.log(`\n📁 File: ${result.filePath}`);
		console.log(`🔤 Language: ${result.language}`);
		console.log(`📊 Symbols extracted: ${result.symbols.length}`);
		console.log("");

		// Group symbols by kind
		const symbolsByKind = new Map<string, typeof result.symbols>();
		for (const symbol of result.symbols) {
			const kind = symbol.kind;
			if (!symbolsByKind.has(kind)) {
				symbolsByKind.set(kind, []);
			}
			symbolsByKind.get(kind)?.push(symbol);
		}

		// Display symbols by kind
		for (const [kind, symbols] of symbolsByKind.entries()) {
			console.log(`\n${getKindIcon(kind)} ${kind.toUpperCase()}`);
			console.log("─".repeat(60));

			for (const symbol of symbols) {
				console.log(`  📍 ${symbol.namePath}`);
				console.log(
					`     Location: ${symbol.location.startLine}:${symbol.location.startColumn}`,
				);

				if (symbol.signature) {
					console.log(`     Signature: ${symbol.signature}`);
				}

				if (symbol.parentSymbol) {
					console.log(`     Parent: ${symbol.parentSymbol}`);
				}

				if (symbol.typeParameters && symbol.typeParameters.length > 0) {
					console.log(
						`     Type Params: <${symbol.typeParameters.join(", ")}>`,
					);
				}

				if (symbol.parameters && symbol.parameters.length > 0) {
					console.log(`     Parameters: ${symbol.parameters.length}`);
					for (const param of symbol.parameters) {
						console.log(
							`       - ${param.name}${param.type ? `: ${param.type}` : ""}${param.optional ? "?" : ""}`,
						);
					}
				}

				console.log("");
			}
		}

		// Summary
		console.log("━".repeat(60));
		console.log("📈 Summary:");
		console.log(`   Total symbols: ${result.symbols.length}`);
		for (const [kind, symbols] of symbolsByKind.entries()) {
			console.log(`   ${kind}: ${symbols.length}`);
		}

		// Verify expected symbols
		console.log("\n✅ Verification:");
		const expectedSymbols = [
			{ name: "User", kind: "interface" },
			{ name: "UserRole", kind: "enum" },
			{ name: "UserService", kind: "class" },
			{ name: "getUserById", kind: "method", parent: "/UserService" },
			{ name: "addUser", kind: "method", parent: "/UserService" },
			{ name: "users", kind: "property", parent: "/UserService" },
			{ name: "validateUser", kind: "function" },
			{ name: "formatUserName", kind: "function" },
			{ name: "UserData", kind: "type" },
		];

		let passed = 0;
		let failed = 0;

		for (const expected of expectedSymbols) {
			const found = result.symbols.find(
				(s) =>
					s.name === expected.name &&
					s.kind === expected.kind &&
					(!expected.parent || s.parentSymbol === expected.parent),
			);

			if (found) {
				console.log(`   ✓ ${expected.name} (${expected.kind})`);
				passed++;
			} else {
				console.log(`   ✗ ${expected.name} (${expected.kind}) - NOT FOUND`);
				failed++;
			}
		}

		console.log(`\n   Passed: ${passed}/${expectedSymbols.length}`);
		console.log(`   Failed: ${failed}/${expectedSymbols.length}`);

		if (failed === 0) {
			console.log("\n🎉 All tests passed!");
		} else {
			console.log("\n⚠️  Some tests failed");
		}
	} catch (error) {
		console.error("❌ Error:", error);
		throw error;
	}
}

function getKindIcon(kind: string): string {
	const icons: Record<string, string> = {
		class: "🏛️",
		interface: "📋",
		function: "⚡",
		method: "🔧",
		property: "📦",
		type: "🏷️",
		enum: "🎯",
		variable: "📝",
		constant: "🔒",
	};
	return icons[kind] || "❓";
}

// Run test
testSymbolExtraction().catch((error) => {
	console.error("Test failed:", error);
	process.exit(1);
});
