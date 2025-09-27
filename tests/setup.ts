// Jest setup for tree-sitter analyzer tests
// Extend timeout for tree-sitter parsing operations
jest.setTimeout(10000);

// Import test isolation utilities
import { TestIsolationManager } from "./helpers/test-isolation";

// Global test utilities can be added here
declare global {
	var testUtils: Record<string, any>;
}

(global as any).testUtils = {
	// Add any global test utilities here
};

// Enhanced global cleanup between tests
beforeEach(async () => {
	// Force cleanup of any leftover resources
	await TestIsolationManager.cleanup();
});

afterEach(async () => {
	// Ensure cleanup after each test
	await TestIsolationManager.cleanup();
});

// Global cleanup for entire test suite
afterAll(async () => {
	await TestIsolationManager.cleanup();
});

export {};
