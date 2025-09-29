/**
 * Core Functionality Tests - Basic System Validation
 */

import { createCustomKeyMapper } from "../src/mappers/CustomKeyMapper";
import { globalQueryEngine } from "../src/core/QueryEngine";
import { createMockQueryFunction } from "./test-helpers";

describe("Core System Functionality", () => {
	beforeAll(() => {
		// Register some basic test queries
		globalQueryEngine.getRegistry().register("ts-import-sources" as any, createMockQueryFunction("ts-import-sources"));
		globalQueryEngine.getRegistry().register("ts-named-imports" as any, createMockQueryFunction("ts-named-imports"));
		globalQueryEngine.getRegistry().register("ts-export-declarations" as any, createMockQueryFunction("ts-export-declarations"));
	});

	describe("CustomKeyMapper Basic Operations", () => {
		test("should create mapper and get user keys", () => {
			const mapping = {
				imports: "ts-import-sources",
				exports: "ts-export-declarations",
			};

			const mapper = createCustomKeyMapper(mapping);

			expect(mapper).toBeDefined();
			expect(mapper.getUserKeys()).toEqual(["imports", "exports"]);
		});

		test("should get query keys correctly", () => {
			const mapping = {
				imports: "ts-import-sources",
				namedImports: "ts-named-imports",
			};

			const mapper = createCustomKeyMapper(mapping);
			const queryKeys = mapper.getQueryKeys();

			expect(queryKeys).toEqual(["ts-import-sources", "ts-named-imports"]);
		});

		test("should validate mapping with registered queries", () => {
			const validMapping = {
				imports: "ts-import-sources",
				namedImports: "ts-named-imports",
			};

			const mapper = createCustomKeyMapper(validMapping);
			const validation = mapper.validate();

			expect(validation.isValid).toBe(true);
			expect(validation.errors).toEqual([]);
		});

		test("should fail validation with unregistered queries", () => {
			const invalidMapping = {
				imports: "ts-import-sources", // valid
				invalid: "unregistered-query", // invalid
			};

			const mapper = createCustomKeyMapper(invalidMapping);
			const validation = mapper.validate();

			expect(validation.isValid).toBe(false);
			expect(validation.errors.length).toBeGreaterThan(0);
		});
	});

	describe("Query Registry Integration", () => {
		test("should register and retrieve queries", () => {
			const registry = globalQueryEngine.getRegistry();

			expect(registry.get("ts-import-sources" as any)).toBeDefined();
			expect(registry.get("ts-named-imports" as any)).toBeDefined();
			expect(registry.get("ts-export-declarations" as any)).toBeDefined();
		});

		test("should list registered query keys", () => {
			const registry = globalQueryEngine.getRegistry();
			const allKeys = registry.getAllQueryKeys();

			expect(allKeys.length).toBeGreaterThan(0);
			expect(allKeys).toContain("ts-import-sources");
			expect(allKeys).toContain("ts-named-imports");
		});
	});

	describe("System Robustness", () => {
		test("should handle empty mapping", () => {
			const emptyMapping = {};

			const mapper = createCustomKeyMapper(emptyMapping);
			const validation = mapper.validate();

			expect(validation.isValid).toBe(true);
			expect(mapper.getUserKeys()).toEqual([]);
			expect(mapper.getQueryKeys()).toEqual([]);
		});

		test("should handle mapper creation with various mappings", () => {
			const singleMapping = { single: "ts-import-sources" };
			const multipleMapping = { multiple: "ts-import-sources", other: "ts-named-imports" };
			const complexMapping = { complex: "ts-export-declarations" };

			const mappings = [singleMapping, multipleMapping, complexMapping];

			mappings.forEach(mapping => {
				const mapper = createCustomKeyMapper(mapping);
				expect(mapper).toBeDefined();
				expect(mapper.getUserKeys().length).toBeGreaterThan(0);
			});
		});
	});

	describe("Performance Validation", () => {
		test("should handle multiple validations efficiently", () => {
			const startTime = Date.now();

			for (let i = 0; i < 100; i++) {
				const mapping = {
					imports: "ts-import-sources",
					exports: "ts-export-declarations",
				};

				const mapper = createCustomKeyMapper(mapping);
				mapper.validate();
			}

			const endTime = Date.now();
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});

		test("should handle large mappings", () => {
			const largeMapping: any = {};

			// Create mapping with 50 entries
			for (let i = 0; i < 50; i++) {
				largeMapping[`key${i}`] = "ts-import-sources";
			}

			const mapper = createCustomKeyMapper(largeMapping);

			expect(mapper.getUserKeys()).toHaveLength(50);
			expect(mapper.getQueryKeys()).toHaveLength(50);
		});
	});
});