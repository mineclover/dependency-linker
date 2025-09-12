/**
 * Unit tests for ImportInfo model
 */

import {
	ImportInfo,
	ImportSpecifier,
	createImportSpecifier,
	createDefaultImportSpecifier,
	createNamespaceImportSpecifier,
	createNamedImportSpecifier,
	createImportInfo,
	createSideEffectImport,
	isSideEffectImport,
	hasDefaultImport,
	hasNamedImports,
	hasNamespaceImport,
	getImportStats,
} from "../../../src/models/ImportInfo";
import { SourceLocation } from "../../../src/models/SourceLocation";

describe("ImportInfo Model", () => {
	const mockLocation: SourceLocation = {
		line: 1,
		column: 0,
		offset: 0,
	};

	describe("ImportSpecifier interface", () => {
		test("should create valid import specifier", () => {
			const specifier = createImportSpecifier(
				"useState",
				"useStateHook",
				"named",
			);

			expect(specifier.imported).toBe("useState");
			expect(specifier.local).toBe("useStateHook");
			expect(specifier.type).toBe("named");
		});

		test("should create default import specifier", () => {
			const specifier = createDefaultImportSpecifier("React");

			expect(specifier.imported).toBe("default");
			expect(specifier.local).toBe("React");
			expect(specifier.type).toBe("default");
		});

		test("should create namespace import specifier", () => {
			const specifier = createNamespaceImportSpecifier("_");

			expect(specifier.imported).toBe("*");
			expect(specifier.local).toBe("_");
			expect(specifier.type).toBe("namespace");
		});

		test("should create named import specifier", () => {
			const specifier = createNamedImportSpecifier("useEffect");

			expect(specifier.imported).toBe("useEffect");
			expect(specifier.local).toBe("useEffect");
			expect(specifier.type).toBe("named");
		});
	});

	describe("ImportInfo interface", () => {
		test("should create default import", () => {
			const specifiers = [createDefaultImportSpecifier("React")];
			const importInfo = createImportInfo("react", specifiers, mockLocation);

			expect(importInfo.source).toBe("react");
			expect(importInfo.specifiers).toHaveLength(1);
			expect(importInfo.specifiers[0].type).toBe("default");
			expect(importInfo.specifiers[0].local).toBe("React");
			expect(importInfo.isTypeOnly).toBe(false);
		});

		test("should create named imports", () => {
			const specifiers = [
				createNamedImportSpecifier("useState"),
				createNamedImportSpecifier("useEffect", "effect"),
			];
			const importInfo = createImportInfo("react", specifiers, mockLocation);

			expect(importInfo.source).toBe("react");
			expect(importInfo.specifiers).toHaveLength(2);
			expect(importInfo.specifiers[0].imported).toBe("useState");
			expect(importInfo.specifiers[1].imported).toBe("useEffect");
			expect(importInfo.specifiers[1].local).toBe("effect");
		});

		test("should create namespace import", () => {
			const specifiers = [createNamespaceImportSpecifier("_")];
			const importInfo = createImportInfo("lodash", specifiers, mockLocation);

			expect(importInfo.source).toBe("lodash");
			expect(importInfo.specifiers[0].type).toBe("namespace");
			expect(importInfo.specifiers[0].local).toBe("_");
		});

		test("should create side-effect import", () => {
			const importInfo = createSideEffectImport("./styles.css", mockLocation);

			expect(importInfo.source).toBe("./styles.css");
			expect(importInfo.specifiers).toHaveLength(0);
			expect(isSideEffectImport(importInfo)).toBe(true);
		});

		test("should create type-only imports", () => {
			const specifiers = [
				createNamedImportSpecifier("User"),
				createNamedImportSpecifier("Role"),
			];
			const importInfo = createImportInfo(
				"./types",
				specifiers,
				mockLocation,
				true,
			);

			expect(importInfo.isTypeOnly).toBe(true);
			expect(importInfo.specifiers).toHaveLength(2);
		});

		test("should detect import types correctly", () => {
			const defaultImport = createImportInfo(
				"react",
				[createDefaultImportSpecifier("React")],
				mockLocation,
			);
			const namedImport = createImportInfo(
				"react",
				[createNamedImportSpecifier("useState")],
				mockLocation,
			);
			const namespaceImport = createImportInfo(
				"lodash",
				[createNamespaceImportSpecifier("_")],
				mockLocation,
			);
			const sideEffectImport = createSideEffectImport(
				"./styles.css",
				mockLocation,
			);

			expect(hasDefaultImport(defaultImport)).toBe(true);
			expect(hasNamedImports(namedImport)).toBe(true);
			expect(hasNamespaceImport(namespaceImport)).toBe(true);
			expect(isSideEffectImport(sideEffectImport)).toBe(true);
		});

		test("should generate import statistics", () => {
			const imports: ImportInfo[] = [
				createImportInfo(
					"react",
					[createDefaultImportSpecifier("React")],
					mockLocation,
				),
				createImportInfo(
					"react",
					[createNamedImportSpecifier("useState")],
					mockLocation,
					true,
				),
				createSideEffectImport("./styles.css", mockLocation),
			];

			const stats = getImportStats(imports);
			expect(stats.total).toBe(3);
			expect(stats.typeOnly).toBe(1);
			expect(stats.sideEffect).toBe(1);
			expect(stats.withDefault).toBe(1);
			expect(stats.withNamed).toBe(1);
			expect(stats.uniqueSources).toBe(2);
			expect(stats.totalSpecifiers).toBe(2);
		});
	});
});
