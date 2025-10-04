/**
 * RDF Addressing System Tests
 * RDF 기반 노드 식별자 시스템 테스트
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
	NodeIdentifier,
	type NodeContext,
} from "../../src/database/core/NodeIdentifier";

describe("RDF Addressing System", () => {
	const projectRoot = "/test/project";
	let identifier: NodeIdentifier;

	beforeEach(() => {
		identifier = new NodeIdentifier(projectRoot);
	});

	describe("RDF Address Generation", () => {
		test("should create RDF address for file node with projectName", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/parser.ts",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier("file", "parser.ts", context);

			expect(id).toBe("dependency-linker/src/parser.ts");
		});

		test("should create RDF address for class with projectName", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/parser.ts",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier(
				"class",
				"TypeScriptParser",
				context,
			);

			expect(id).toBe("dependency-linker/src/parser.ts#Class:TypeScriptParser");
		});

		test("should create RDF address for method with projectName", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/parser.ts",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier(
				"method",
				"TypeScriptParser.parse",
				context,
			);

			expect(id).toBe(
				"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse",
			);
		});

		test("should use default projectName when not provided", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/parser.ts",
				language: "typescript",
				projectRoot,
			};

			const id = identifier.createIdentifier(
				"class",
				"TypeScriptParser",
				context,
			);

			expect(id).toBe("unknown-project/src/parser.ts#Class:TypeScriptParser");
		});

		test("should create RDF address for interface", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/types.ts",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier(
				"interface",
				"NodeTypeSpec",
				context,
			);

			expect(id).toBe("dependency-linker/src/types.ts#Interface:NodeTypeSpec");
		});

		test("should create RDF address for markdown heading", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/docs/guide.md",
				language: "markdown",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier(
				"heading",
				"Installation",
				context,
			);

			expect(id).toBe("dependency-linker/docs/guide.md#Heading:Installation");
		});

		test("should create library identifier without projectName", () => {
			const context: NodeContext = {
				sourceFile: "",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier("library", "react", context);

			expect(id).toBe("library#react");
		});

		test("should create RDF address for unknown symbol from import", () => {
			const context: NodeContext = {
				sourceFile: "/test/project/src/app.ts",
				language: "typescript",
				projectRoot,
				projectName: "dependency-linker",
			};

			const id = identifier.createIdentifier(
				"unknown",
				"TypeScriptParser",
				context,
			);

			expect(id).toBe(
				"dependency-linker/src/app.ts#Unknown:TypeScriptParser",
			);
		});
	});

	describe("RDF Address Parsing", () => {
		test("should parse file RDF address", () => {
			const address = "dependency-linker/src/parser.ts";

			const rdf = identifier.parseRdfAddress(address);

			expect(rdf).not.toBeNull();
			expect(rdf?.projectName).toBe("dependency-linker");
			expect(rdf?.filePath).toBe("src/parser.ts");
			expect(rdf?.nodeType).toBe("");
			expect(rdf?.symbolName).toBe("");
		});

		test("should parse class RDF address", () => {
			const address = "dependency-linker/src/parser.ts#Class:TypeScriptParser";

			const rdf = identifier.parseRdfAddress(address);

			expect(rdf).not.toBeNull();
			expect(rdf?.projectName).toBe("dependency-linker");
			expect(rdf?.filePath).toBe("src/parser.ts");
			expect(rdf?.nodeType).toBe("Class");
			expect(rdf?.symbolName).toBe("TypeScriptParser");
		});

		test("should parse method RDF address", () => {
			const address =
				"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";

			const rdf = identifier.parseRdfAddress(address);

			expect(rdf).not.toBeNull();
			expect(rdf?.projectName).toBe("dependency-linker");
			expect(rdf?.filePath).toBe("src/parser.ts");
			expect(rdf?.nodeType).toBe("Method");
			expect(rdf?.symbolName).toBe("TypeScriptParser.parse");
		});

		test("should parse nested path RDF address", () => {
			const address =
				"dependency-linker/src/parsers/typescript/TypeScriptParser.ts#Class:TypeScriptParser";

			const rdf = identifier.parseRdfAddress(address);

			expect(rdf).not.toBeNull();
			expect(rdf?.projectName).toBe("dependency-linker");
			expect(rdf?.filePath).toBe("src/parsers/typescript/TypeScriptParser.ts");
			expect(rdf?.nodeType).toBe("Class");
			expect(rdf?.symbolName).toBe("TypeScriptParser");
		});

		test("should parse unknown symbol RDF address", () => {
			const address =
				"dependency-linker/src/app.ts#Unknown:TypeScriptParser";

			const rdf = identifier.parseRdfAddress(address);

			expect(rdf).not.toBeNull();
			expect(rdf?.projectName).toBe("dependency-linker");
			expect(rdf?.filePath).toBe("src/app.ts");
			expect(rdf?.nodeType).toBe("Unknown");
			expect(rdf?.symbolName).toBe("TypeScriptParser");
		});

		test("should return null for invalid RDF address", () => {
			const rdf1 = identifier.parseRdfAddress("");
			const rdf2 = identifier.parseRdfAddress("invalid");
			const rdf3 = identifier.parseRdfAddress("#Method:parse");

			expect(rdf1).toBeNull();
			expect(rdf2).toBeNull();
			expect(rdf3).toBeNull();
		});
	});

	describe("RDF Address Validation", () => {
		test("should validate correct file RDF address", () => {
			const address = "dependency-linker/src/parser.ts";

			expect(identifier.validateIdentifier(address)).toBe(true);
		});

		test("should validate correct symbol RDF address", () => {
			const address =
				"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";

			expect(identifier.validateIdentifier(address)).toBe(true);
		});

		test("should validate library identifier", () => {
			const address = "library#react";

			expect(identifier.validateIdentifier(address)).toBe(true);
		});

		test("should reject invalid RDF addresses", () => {
			expect(identifier.validateIdentifier("")).toBe(false);
			expect(identifier.validateIdentifier("invalid")).toBe(false);
			expect(identifier.validateIdentifier("#Method:parse")).toBe(false);
			expect(identifier.validateIdentifier("project/#Method:")).toBe(false);
			expect(identifier.validateIdentifier("project/file#:symbol")).toBe(false);
		});
	});

	describe("RDF Address Relations", () => {
		test("should identify related nodes in same file", () => {
			const id1 =
				"dependency-linker/src/parser.ts#Class:TypeScriptParser";
			const id2 =
				"dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";

			expect(identifier.areRelated(id1, id2)).toBe(true);
		});

		test("should identify unrelated nodes in different files", () => {
			const id1 =
				"dependency-linker/src/parser.ts#Class:TypeScriptParser";
			const id2 = "dependency-linker/src/types.ts#Interface:NodeTypeSpec";

			expect(identifier.areRelated(id1, id2)).toBe(false);
		});

		test("should identify unrelated nodes in different projects", () => {
			const id1 =
				"dependency-linker/src/parser.ts#Class:TypeScriptParser";
			const id2 = "other-project/src/parser.ts#Class:TypeScriptParser";

			expect(identifier.areRelated(id1, id2)).toBe(false);
		});
	});

	describe("parseIdentifier Integration", () => {
		test("should parse file identifier to node identity", () => {
			const address = "dependency-linker/src/parser.ts";

			const parsed = identifier.parseIdentifier(address);

			expect(parsed).not.toBeNull();
			expect(parsed?.type).toBe("file");
			expect(parsed?.name).toBe("parser.ts");
			expect(parsed?.context?.sourceFile).toBe("src/parser.ts");
			expect(parsed?.context?.projectName).toBe("dependency-linker");
		});

		test("should parse symbol identifier to node identity", () => {
			const address =
				"dependency-linker/src/parser.ts#Class:TypeScriptParser";

			const parsed = identifier.parseIdentifier(address);

			expect(parsed).not.toBeNull();
			expect(parsed?.type).toBe("class");
			expect(parsed?.name).toBe("TypeScriptParser");
			expect(parsed?.context?.sourceFile).toBe("src/parser.ts");
			expect(parsed?.context?.projectName).toBe("dependency-linker");
		});

		test("should parse library identifier to node identity", () => {
			const address = "library#react";

			const parsed = identifier.parseIdentifier(address);

			expect(parsed).not.toBeNull();
			expect(parsed?.type).toBe("library");
			expect(parsed?.name).toBe("react");
		});
	});
});
