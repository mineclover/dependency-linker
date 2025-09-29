/**
 * Test Helper Functions
 */

import type { QueryFunction } from "../src/core/types";

/**
 * Create a mock QueryFunction for testing
 */
export function createMockQueryFunction(name: string, processor?: () => any[]): QueryFunction<any> {
	return {
		name,
		description: `Mock ${name} query`,
		query: "(test)",
		languages: ["typescript"] as const,
		priority: 1,
		resultType: name, // Use the name as the resultType to match the validation
		processor: jest.fn(processor || (() => []))
	};
}

/**
 * Create mock data for tests
 */
export const mockQueryResults = {
	imports: [
		{ source: "react", type: "default", isExternal: true },
		{ source: "./components/Button", type: "named", isExternal: false },
	],
	namedImports: [
		{ name: "useState", source: "react", isType: false },
		{ name: "Button", source: "./components/Button", isType: false },
	],
	exports: [
		{ name: "Component", type: "const", isDefault: false },
		{ name: "ProfileComponent", type: "const", isDefault: true },
	],
};

/**
 * Mock query execution context
 */
export const mockContext = {
	sourceCode: "test code",
	language: "typescript" as const,
	filePath: "test.ts",
	tree: {} as any, // Mock tree object
};

/**
 * Mock query matches
 */
export const mockMatches = [
	{
		queryName: "test-query",
		captures: [
			{
				name: "test" as const,
				node: {} as any, // Mock syntax node
			},
		],
	},
];