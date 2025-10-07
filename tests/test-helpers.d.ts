import type { QueryFunction } from "../src/core/types";
export declare function createMockQueryFunction(
	name: string,
	processor?: () => any[],
): QueryFunction<any>;
export declare const mockQueryResults: {
	imports: {
		source: string;
		type: string;
		isExternal: boolean;
	}[];
	namedImports: {
		name: string;
		source: string;
		isType: boolean;
	}[];
	exports: {
		name: string;
		type: string;
		isDefault: boolean;
	}[];
};
export declare const mockContext: {
	sourceCode: string;
	language: "typescript";
	filePath: string;
	tree: any;
};
export declare const mockMatches: {
	queryName: string;
	captures: {
		name: "test";
		node: any;
	}[];
}[];
//# sourceMappingURL=test-helpers.d.ts.map
