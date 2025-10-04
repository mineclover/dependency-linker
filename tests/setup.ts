/**
 * Global Jest Setup
 * Initialize analysis system once for all tests to avoid race conditions
 */

import { initializeAnalysisSystem } from "../src/api/analysis";
import { globalParserManager } from "../src/parsers/ParserManager";

// Extend timeout for AST analysis operations
jest.setTimeout(10000);

// Initialize analysis system globally before any tests run
// This prevents race conditions when tests run in parallel
// Note: setupFilesAfterEnv runs in each worker, so we use a marker to ensure single init
if (!(global as any).__ANALYSIS_SYSTEM_INITIALIZED__) {
	initializeAnalysisSystem();
	(global as any).__ANALYSIS_SYSTEM_INITIALIZED__ = true;
}

// Note: Parser cache clearing moved to specific test files that need it
// Global afterEach hook caused issues with concurrent test execution

// Global test utilities can be added here
declare global {
	var testUtils: Record<string, any>;
}

(global as any).testUtils = {
	// Add any global test utilities here
};

export {};
