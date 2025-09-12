// Jest setup for tree-sitter analyzer tests
// Extend timeout for tree-sitter parsing operations
jest.setTimeout(10000);

// Global test utilities can be added here
declare global {
	var testUtils: Record<string, any>;
}

(global as any).testUtils = {
	// Add any global test utilities here
};

export {};
