module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/src", "<rootDir>/tests"],
	testMatch: [
		"**/tests/**/*.test.ts",
		"**/__tests__/**/*.ts",
		"**/?(*.)+(spec|test).ts",
	],
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.d.ts",
		"!src/**/__tests__/**",
		"!src/**/index.ts",
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html", "json"],
	// Enhanced coverage configuration for T050
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 85,
			lines: 85,
			statements: 85,
		},
		// Specific thresholds for new API methods (T050)
		"src/api/TypeScriptAnalyzer.ts": {
			branches: 90,
			functions: 100, // All diagnostic methods must be covered
			lines: 95,
			statements: 95,
		},
		"src/api/factory-functions.ts": {
			branches: 85,
			functions: 100, // All cache functions must be covered
			lines: 90,
			statements: 90,
		},
		"src/api/errors/DiagnosticTool.ts": {
			branches: 85,
			functions: 95,
			lines: 90,
			statements: 90,
		},
	},
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	testTimeout: 15000, // Increased for integration tests
	verbose: true,
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	// Additional configuration for better reporting
	collectCoverage: false, // Enable manually with --coverage flag
	coveragePathIgnorePatterns: [
		"/node_modules/",
		"/tests/",
		"/__tests__/",
		"/coverage/",
		"/build/",
		"/dist/",
	],
	// Jest extensions for better integration test support
	maxWorkers: "50%", // Optimize for integration tests
	testSequencer: "@jest/test-sequencer",
};
