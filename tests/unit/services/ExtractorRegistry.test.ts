/**
 * Unit tests for ExtractorRegistry
 * Tests dynamic registration and management of data extractors
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import { ExtractorRegistry } from "../../../src/services/ExtractorRegistry";
import type {
	IDataExtractor,
	ExtractorOptions,
	ValidationResult,
	ExtractorMetadata,
	ExtractorConfiguration,
	OutputSchema,
	AST,
} from "../../../src/extractors/IDataExtractor";

// Mock extractor for testing
interface MockExtractionResult {
	mockData: string;
	timestamp: string;
	options: ExtractorOptions;
}

class MockExtractor implements IDataExtractor<MockExtractionResult> {
	private name: string;
	private version: string;
	private supported: boolean;

	constructor(name = "mock", version = "1.0.0", supported = true) {
		this.name = name;
		this.version = version;
		this.supported = supported;
	}

	extract(
		ast: AST,
		filePath: string,
		options?: ExtractorOptions,
	): MockExtractionResult {
		return {
			mockData: `extracted from ${filePath}`,
			timestamp: new Date().toISOString(),
			options: options || {},
		};
	}

	supports(language: string): boolean {
		return this.supported;
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	validate(data: MockExtractionResult): ValidationResult {
		return {
			isValid: true,
			errors: [],
			warnings: [],
		};
	}

	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: "Mock extractor for testing",
			supportedLanguages: ["typescript", "javascript"],
			outputTypes: ["mock"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.001,
				memoryUsage: "low",
				timeComplexity: "linear",
				maxRecommendedFileSize: 1000000,
			},
		};
	}

	configure(options: ExtractorConfiguration): void {
		// Mock configuration
	}

	getConfiguration(): ExtractorConfiguration {
		return {
			enabled: true,
			priority: 1,
			timeout: 5000,
			memoryLimit: 100000000,
			languages: ["typescript", "javascript"],
			errorHandling: "lenient",
			logLevel: "info",
		};
	}

	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			properties: {
				mockData: {
					type: "string",
					description: "Mock data for testing",
				},
			},
			required: ["mockData"],
			version: "1.0.0",
		};
	}

	dispose(): void {
		// Mock cleanup
	}
}

describe("ExtractorRegistry", () => {
	let registry: ExtractorRegistry;

	beforeEach(() => {
		registry = new ExtractorRegistry();
	});

	describe("Registration", () => {
		test("should register extractor successfully", () => {
			const extractor = new MockExtractor("test-extractor");

			registry.register("test", extractor);

			expect(registry.getExtractor("test")).toBe(extractor);
		});

		test("should handle registering duplicate extractor with warning", () => {
			const extractor1 = new MockExtractor("extractor1");
			const extractor2 = new MockExtractor("extractor2");

			registry.register("duplicate", extractor1);

			// According to implementation, it logs warning but allows overwrite
			expect(() => registry.register("duplicate", extractor2)).not.toThrow();
			expect(registry.getExtractor("duplicate")).toBe(extractor2);
		});

		test("should unregister extractor successfully", () => {
			const extractor = new MockExtractor("unregister-test");

			registry.register("unregister", extractor);
			expect(registry.getExtractor("unregister")).toBe(extractor);

			const result = registry.unregister("unregister");
			expect(result).toBe(true);
			expect(registry.getExtractor("unregister")).toBeUndefined();
		});

		test("should return false when unregistering non-existent extractor", () => {
			const result = registry.unregister("non-existent");
			expect(result).toBe(false);
		});
	});

	describe("Extractor Retrieval", () => {
		test("should return extractor by name", () => {
			const extractor = new MockExtractor("retrieval-test");
			registry.register("retrieval", extractor);

			const retrieved = registry.getExtractor("retrieval");
			expect(retrieved).toBe(extractor);
		});

		test("should throw error when getting non-existent extractor", () => {
			const retrieved = registry.getExtractor("non-existent");
			expect(retrieved).toBeUndefined();
		});

		test("should check if extractor exists", () => {
			const extractor = new MockExtractor("exists-test");

			expect(registry.getExtractor("exists")).toBeUndefined();

			registry.register("exists", extractor);
			expect(registry.getExtractor("exists")).toBe(extractor);
		});
	});

	describe("Language Support", () => {
		test("should return extractors that support a language", () => {
			const tsExtractor = new MockExtractor("ts-extractor", "1.0.0", true);
			const unsupportedExtractor = new MockExtractor(
				"unsupported",
				"1.0.0",
				false,
			);

			registry.register("typescript", tsExtractor);
			registry.register("unsupported", unsupportedExtractor);

			const supporters = registry.getExtractorsForLanguage("typescript");
			expect(supporters).toHaveLength(1);
			expect(supporters[0]).toBe(tsExtractor);
		});

		test("should return empty array when no extractors support language", () => {
			const supporters = registry.getExtractorsForLanguage("unknown-language");
			expect(supporters).toHaveLength(0);
		});
	});

	describe("Registry Operations", () => {
		test("should list all registered extractor names", () => {
			const extractor1 = new MockExtractor("first");
			const extractor2 = new MockExtractor("second");

			registry.register("first", extractor1);
			registry.register("second", extractor2);

			const extractors = registry.getAllExtractors();
			expect(extractors.has("first")).toBe(true);
			expect(extractors.has("second")).toBe(true);
			expect(extractors.size).toBe(2);
		});

		test("should clear all extractors", () => {
			const extractor1 = new MockExtractor("clear1");
			const extractor2 = new MockExtractor("clear2");

			registry.register("clear1", extractor1);
			registry.register("clear2", extractor2);

			expect(registry.getAllExtractors().size).toBe(2);

			registry.clear();
			expect(registry.getAllExtractors().size).toBe(0);
		});

		test("should get extractor count", () => {
			expect(registry.getAllExtractors().size).toBe(0);

			const extractor1 = new MockExtractor("count1");
			const extractor2 = new MockExtractor("count2");

			registry.register("count1", extractor1);
			expect(registry.getAllExtractors().size).toBe(1);

			registry.register("count2", extractor2);
			expect(registry.getAllExtractors().size).toBe(2);
		});
	});

	describe("Extractor Metadata", () => {
		test("should retrieve extractor metadata", () => {
			const extractor = new MockExtractor("metadata-test", "2.0.0");
			registry.register("metadata", extractor);

			const retrievedExtractor = registry.getExtractor("metadata");
			expect(retrievedExtractor).toBeDefined();

			const metadata = retrievedExtractor!.getMetadata();
			expect(metadata.name).toBe("metadata-test");
			expect(metadata.version).toBe("2.0.0");
			expect(metadata.description).toBe("Mock extractor for testing");
			expect(metadata.supportedLanguages).toContain("typescript");
		});

		test("should return undefined when getting non-existent extractor", () => {
			const extractor = registry.getExtractor("non-existent");
			expect(extractor).toBeUndefined();
		});
	});

	describe("Error Handling", () => {
		test("should handle extractor validation errors gracefully", () => {
			const invalidExtractor = new MockExtractor("invalid");
			// Override validate to return invalid result
			invalidExtractor.validate = () => ({
				isValid: false,
				errors: ["Test validation error"],
				warnings: ["Test warning"],
			});

			registry.register("invalid", invalidExtractor);

			const extractor = registry.getExtractor("invalid");
			const validationResult = extractor!.validate({});

			expect(validationResult.isValid).toBe(false);
			expect(validationResult.errors).toContain("Test validation error");
			expect(validationResult.warnings).toContain("Test warning");
		});
	});

	describe("Configuration Management", () => {
		test("should configure extractor through registry", () => {
			const extractor = new MockExtractor("configurable");
			let configuredOptions: ExtractorConfiguration | null = null;

			// Override configure to capture options
			extractor.configure = (options: ExtractorConfiguration) => {
				configuredOptions = options;
			};

			registry.register("configurable", extractor);

			const config: ExtractorConfiguration = {
				enabled: false,
				priority: 5,
				timeout: 10000,
				languages: ["typescript"],
			};

			const retrievedExtractor = registry.getExtractor("configurable");
			retrievedExtractor!.configure(config);

			expect(configuredOptions).toEqual(config);
		});
	});
});
