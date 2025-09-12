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
	coverageReporters: ["text", "lcov", "html"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	testTimeout: 10000,
	verbose: true,
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
