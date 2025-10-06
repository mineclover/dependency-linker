"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const NodeIdentifier_1 = require("../../src/database/core/NodeIdentifier");
(0, globals_1.describe)("RDF Addressing System", () => {
    const projectRoot = "/test/project";
    let identifier;
    (0, globals_1.beforeEach)(() => {
        identifier = new NodeIdentifier_1.NodeIdentifier(projectRoot);
    });
    (0, globals_1.describe)("RDF Address Generation", () => {
        (0, globals_1.test)("should create RDF address for file node with projectName", () => {
            const context = {
                sourceFile: "/test/project/src/parser.ts",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("file", "parser.ts", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/src/parser.ts");
        });
        (0, globals_1.test)("should create RDF address for class with projectName", () => {
            const context = {
                sourceFile: "/test/project/src/parser.ts",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("class", "TypeScriptParser", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/src/parser.ts#Class:TypeScriptParser");
        });
        (0, globals_1.test)("should create RDF address for method with projectName", () => {
            const context = {
                sourceFile: "/test/project/src/parser.ts",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("method", "TypeScriptParser.parse", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/src/parser.ts#Method:TypeScriptParser.parse");
        });
        (0, globals_1.test)("should use default projectName when not provided", () => {
            const context = {
                sourceFile: "/test/project/src/parser.ts",
                language: "typescript",
                projectRoot,
            };
            const id = identifier.createIdentifier("class", "TypeScriptParser", context);
            (0, globals_1.expect)(id).toBe("unknown-project/src/parser.ts#Class:TypeScriptParser");
        });
        (0, globals_1.test)("should create RDF address for interface", () => {
            const context = {
                sourceFile: "/test/project/src/types.ts",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("interface", "NodeTypeSpec", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/src/types.ts#Interface:NodeTypeSpec");
        });
        (0, globals_1.test)("should create RDF address for markdown heading", () => {
            const context = {
                sourceFile: "/test/project/docs/guide.md",
                language: "markdown",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("heading", "Installation", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/docs/guide.md#Heading:Installation");
        });
        (0, globals_1.test)("should create library identifier without projectName", () => {
            const context = {
                sourceFile: "",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("library", "react", context);
            (0, globals_1.expect)(id).toBe("library#react");
        });
        (0, globals_1.test)("should create RDF address for unknown symbol from import", () => {
            const context = {
                sourceFile: "/test/project/src/app.ts",
                language: "typescript",
                projectRoot,
                projectName: "dependency-linker",
            };
            const id = identifier.createIdentifier("unknown", "TypeScriptParser", context);
            (0, globals_1.expect)(id).toBe("dependency-linker/src/app.ts#Unknown:TypeScriptParser");
        });
    });
    (0, globals_1.describe)("RDF Address Parsing", () => {
        (0, globals_1.test)("should parse file RDF address", () => {
            const address = "dependency-linker/src/parser.ts";
            const rdf = identifier.parseRdfAddress(address);
            (0, globals_1.expect)(rdf).not.toBeNull();
            (0, globals_1.expect)(rdf?.projectName).toBe("dependency-linker");
            (0, globals_1.expect)(rdf?.filePath).toBe("src/parser.ts");
            (0, globals_1.expect)(rdf?.nodeType).toBe("");
            (0, globals_1.expect)(rdf?.symbolName).toBe("");
        });
        (0, globals_1.test)("should parse class RDF address", () => {
            const address = "dependency-linker/src/parser.ts#Class:TypeScriptParser";
            const rdf = identifier.parseRdfAddress(address);
            (0, globals_1.expect)(rdf).not.toBeNull();
            (0, globals_1.expect)(rdf?.projectName).toBe("dependency-linker");
            (0, globals_1.expect)(rdf?.filePath).toBe("src/parser.ts");
            (0, globals_1.expect)(rdf?.nodeType).toBe("Class");
            (0, globals_1.expect)(rdf?.symbolName).toBe("TypeScriptParser");
        });
        (0, globals_1.test)("should parse method RDF address", () => {
            const address = "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";
            const rdf = identifier.parseRdfAddress(address);
            (0, globals_1.expect)(rdf).not.toBeNull();
            (0, globals_1.expect)(rdf?.projectName).toBe("dependency-linker");
            (0, globals_1.expect)(rdf?.filePath).toBe("src/parser.ts");
            (0, globals_1.expect)(rdf?.nodeType).toBe("Method");
            (0, globals_1.expect)(rdf?.symbolName).toBe("TypeScriptParser.parse");
        });
        (0, globals_1.test)("should parse nested path RDF address", () => {
            const address = "dependency-linker/src/parsers/typescript/TypeScriptParser.ts#Class:TypeScriptParser";
            const rdf = identifier.parseRdfAddress(address);
            (0, globals_1.expect)(rdf).not.toBeNull();
            (0, globals_1.expect)(rdf?.projectName).toBe("dependency-linker");
            (0, globals_1.expect)(rdf?.filePath).toBe("src/parsers/typescript/TypeScriptParser.ts");
            (0, globals_1.expect)(rdf?.nodeType).toBe("Class");
            (0, globals_1.expect)(rdf?.symbolName).toBe("TypeScriptParser");
        });
        (0, globals_1.test)("should parse unknown symbol RDF address", () => {
            const address = "dependency-linker/src/app.ts#Unknown:TypeScriptParser";
            const rdf = identifier.parseRdfAddress(address);
            (0, globals_1.expect)(rdf).not.toBeNull();
            (0, globals_1.expect)(rdf?.projectName).toBe("dependency-linker");
            (0, globals_1.expect)(rdf?.filePath).toBe("src/app.ts");
            (0, globals_1.expect)(rdf?.nodeType).toBe("Unknown");
            (0, globals_1.expect)(rdf?.symbolName).toBe("TypeScriptParser");
        });
        (0, globals_1.test)("should return null for invalid RDF address", () => {
            const rdf1 = identifier.parseRdfAddress("");
            const rdf2 = identifier.parseRdfAddress("invalid");
            const rdf3 = identifier.parseRdfAddress("#Method:parse");
            (0, globals_1.expect)(rdf1).toBeNull();
            (0, globals_1.expect)(rdf2).toBeNull();
            (0, globals_1.expect)(rdf3).toBeNull();
        });
    });
    (0, globals_1.describe)("RDF Address Validation", () => {
        (0, globals_1.test)("should validate correct file RDF address", () => {
            const address = "dependency-linker/src/parser.ts";
            (0, globals_1.expect)(identifier.validateIdentifier(address)).toBe(true);
        });
        (0, globals_1.test)("should validate correct symbol RDF address", () => {
            const address = "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";
            (0, globals_1.expect)(identifier.validateIdentifier(address)).toBe(true);
        });
        (0, globals_1.test)("should validate library identifier", () => {
            const address = "library#react";
            (0, globals_1.expect)(identifier.validateIdentifier(address)).toBe(true);
        });
        (0, globals_1.test)("should reject invalid RDF addresses", () => {
            (0, globals_1.expect)(identifier.validateIdentifier("")).toBe(false);
            (0, globals_1.expect)(identifier.validateIdentifier("invalid")).toBe(false);
            (0, globals_1.expect)(identifier.validateIdentifier("#Method:parse")).toBe(false);
            (0, globals_1.expect)(identifier.validateIdentifier("project/#Method:")).toBe(false);
            (0, globals_1.expect)(identifier.validateIdentifier("project/file#:symbol")).toBe(false);
        });
    });
    (0, globals_1.describe)("RDF Address Relations", () => {
        (0, globals_1.test)("should identify related nodes in same file", () => {
            const id1 = "dependency-linker/src/parser.ts#Class:TypeScriptParser";
            const id2 = "dependency-linker/src/parser.ts#Method:TypeScriptParser.parse";
            (0, globals_1.expect)(identifier.areRelated(id1, id2)).toBe(true);
        });
        (0, globals_1.test)("should identify unrelated nodes in different files", () => {
            const id1 = "dependency-linker/src/parser.ts#Class:TypeScriptParser";
            const id2 = "dependency-linker/src/types.ts#Interface:NodeTypeSpec";
            (0, globals_1.expect)(identifier.areRelated(id1, id2)).toBe(false);
        });
        (0, globals_1.test)("should identify unrelated nodes in different projects", () => {
            const id1 = "dependency-linker/src/parser.ts#Class:TypeScriptParser";
            const id2 = "other-project/src/parser.ts#Class:TypeScriptParser";
            (0, globals_1.expect)(identifier.areRelated(id1, id2)).toBe(false);
        });
    });
    (0, globals_1.describe)("parseIdentifier Integration", () => {
        (0, globals_1.test)("should parse file identifier to node identity", () => {
            const address = "dependency-linker/src/parser.ts";
            const parsed = identifier.parseIdentifier(address);
            (0, globals_1.expect)(parsed).not.toBeNull();
            (0, globals_1.expect)(parsed?.type).toBe("file");
            (0, globals_1.expect)(parsed?.name).toBe("parser.ts");
            (0, globals_1.expect)(parsed?.context?.sourceFile).toBe("src/parser.ts");
            (0, globals_1.expect)(parsed?.context?.projectName).toBe("dependency-linker");
        });
        (0, globals_1.test)("should parse symbol identifier to node identity", () => {
            const address = "dependency-linker/src/parser.ts#Class:TypeScriptParser";
            const parsed = identifier.parseIdentifier(address);
            (0, globals_1.expect)(parsed).not.toBeNull();
            (0, globals_1.expect)(parsed?.type).toBe("class");
            (0, globals_1.expect)(parsed?.name).toBe("TypeScriptParser");
            (0, globals_1.expect)(parsed?.context?.sourceFile).toBe("src/parser.ts");
            (0, globals_1.expect)(parsed?.context?.projectName).toBe("dependency-linker");
        });
        (0, globals_1.test)("should parse library identifier to node identity", () => {
            const address = "library#react";
            const parsed = identifier.parseIdentifier(address);
            (0, globals_1.expect)(parsed).not.toBeNull();
            (0, globals_1.expect)(parsed?.type).toBe("library");
            (0, globals_1.expect)(parsed?.name).toBe("react");
        });
    });
});
//# sourceMappingURL=rdf-addressing.test.js.map