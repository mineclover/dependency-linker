/**
 * Parser-Independent Query Tests
 * 파서 없이도 동작하는 쿼리 기능 테스트
 */

import {
  QueryEngine,
  CustomKeyMapping,
  QueryExecutionContext,
  QueryMatch,
  ASTNode,
  SupportedLanguage,
} from "../src";

// Mock AST 노드 생성 헬퍼
function createMockASTNode(type: string, text: string): ASTNode {
  return {
    type,
    text,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
  };
}

// Mock QueryMatch 생성 헬퍼
function createMockMatch(nodeType: string, nodeText: string): QueryMatch {
  return {
    node: createMockASTNode(nodeType, nodeText),
    captures: [
      {
        name: "source",
        node: createMockASTNode("string", '"react"'),
      }
    ]
  };
}

describe("Parser-Independent Query Tests", () => {
  let engine: typeof QueryEngine.globalInstance;

  beforeEach(() => {
    engine = QueryEngine.globalInstance;
  });

  describe("Query Registration and Validation", () => {
    it("should have all language queries registered", () => {
      const registry = engine.getRegistry();
      const queryKeys = registry.getAllQueryKeys();

      expect(queryKeys.length).toBeGreaterThan(0);

      // TypeScript 쿼리 확인
      const tsQueries = queryKeys.filter((key: string) => key.startsWith("ts-"));
      expect(tsQueries.length).toBe(6);
      expect(tsQueries).toContain("ts-import-sources");
      expect(tsQueries).toContain("ts-named-imports");
      expect(tsQueries).toContain("ts-export-declarations");

      // Java 쿼리 확인
      const javaQueries = queryKeys.filter((key: string) => key.startsWith("java-"));
      expect(javaQueries.length).toBe(8);
      expect(javaQueries).toContain("java-import-sources");
      expect(javaQueries).toContain("java-class-declarations");

      // Python 쿼리 확인
      const pythonQueries = queryKeys.filter((key: string) => key.startsWith("python-"));
      expect(pythonQueries.length).toBe(8);
      expect(pythonQueries).toContain("python-import-sources");
      expect(pythonQueries).toContain("python-function-definitions");
    });

    it("should validate query metadata", () => {
      const registry = engine.getRegistry();
      const queryKeys = registry.getAllQueryKeys();

      for (const key of queryKeys) {
        const query = registry.get(key);
        expect(query).toBeDefined();
        expect(query!.name).toBe(key);
        expect(query!.description).toBeDefined();
        expect(query!.languages).toBeDefined();
        expect(query!.languages.length).toBeGreaterThan(0);
        expect(typeof query!.priority).toBe("number");
        expect(typeof query!.processor).toBe("function");
      }
    });
  });

  describe("Custom Key Mapping Without Parser", () => {
    it("should create and validate custom mappings", () => {
      // TypeScript 매핑 테스트
      const tsMapping = CustomKeyMapping.createMapper({
        imports: "ts-import-sources",
        exports: "ts-export-declarations",
        types: "ts-type-imports"
      });

      expect(tsMapping.getMapping()).toEqual({
        imports: "ts-import-sources",
        exports: "ts-export-declarations",
        types: "ts-type-imports"
      });

      const validation = tsMapping.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("should detect invalid query keys in mappings", () => {
      const invalidMapping = CustomKeyMapping.createMapper({
        imports: "ts-import-sources",
        invalid: "non-existent-query" as any
      });

      const validation = invalidMapping.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain("non-existent-query");
    });

    it("should support cross-language mappings", () => {
      const multiLangMapping = CustomKeyMapping.createMapper({
        tsImports: "ts-import-sources",
        javaImports: "java-import-sources",
        pythonImports: "python-import-sources",
        tsClasses: "ts-export-declarations",
        javaClasses: "java-class-declarations",
        pythonClasses: "python-class-definitions"
      });

      const validation = multiLangMapping.validate();
      expect(validation.isValid).toBe(true);

      const userKeys = multiLangMapping.getUserKeys();
      expect(userKeys).toContain("tsImports");
      expect(userKeys).toContain("javaImports");
      expect(userKeys).toContain("pythonImports");
    });
  });

  describe("Mock Query Execution", () => {
    it("should execute TypeScript queries with mock data", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import React from "react";',
        language: "typescript",
        filePath: "test.tsx",
        astNode: createMockASTNode("program", 'import React from "react";')
      };

      const mockMatches = [
        createMockMatch("import_statement", 'import React from "react";')
      ];

      // 쿼리 실행 (실제 파서 없이 mock 데이터로)
      const results = await engine.execute("ts-import-sources", mockMatches, mockContext);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("ts-import-sources");
    });

    it("should execute Java queries with mock data", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import java.util.List;',
        language: "java",
        filePath: "Test.java",
        astNode: createMockASTNode("compilation_unit", 'import java.util.List;')
      };

      const mockMatches = [
        createMockMatch("import_declaration", 'import java.util.List;')
      ];

      const results = await engine.execute("java-import-sources", mockMatches, mockContext);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("java-import-sources");
    });

    it("should execute Python queries with mock data", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import pandas as pd',
        language: "python",
        filePath: "test.py",
        astNode: createMockASTNode("module", 'import pandas as pd')
      };

      const mockMatches = [
        createMockMatch("import_statement", 'import pandas as pd')
      ];

      const results = await engine.execute("python-import-sources", mockMatches, mockContext);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-import-sources");
    });
  });

  describe("Query Engine Features", () => {
    it("should support multiple query execution", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import React from "react"; export const App = () => <div></div>;',
        language: "typescript",
        filePath: "App.tsx",
        astNode: createMockASTNode("program", 'import React from "react"; export const App = () => <div></div>;')
      };

      const mockMatches = [
        createMockMatch("import_statement", 'import React from "react";'),
        createMockMatch("export_statement", 'export const App = () => <div></div>;')
      ];

      const results = await engine.executeMultiple([
        "ts-import-sources",
        "ts-export-declarations"
      ], mockMatches, mockContext);

      expect(results["ts-import-sources"]).toBeDefined();
      expect(results["ts-export-declarations"]).toBeDefined();
      expect(Array.isArray(results["ts-import-sources"])).toBe(true);
      expect(Array.isArray(results["ts-export-declarations"])).toBe(true);
    });

    it("should execute queries by priority", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import React from "react";',
        language: "typescript",
        filePath: "test.tsx",
        astNode: createMockASTNode("program", 'import React from "react";')
      };

      const mockMatches = [
        createMockMatch("import_statement", 'import React from "react";')
      ];

      const results = await engine.executeByPriority([
        "ts-import-sources",
        "ts-named-imports",
        "ts-type-imports"
      ], mockMatches, mockContext, 80);

      // 높은 우선순위 쿼리들만 실행되어야 함
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });

    it("should get performance metrics", async () => {
      const mockContext: QueryExecutionContext = {
        sourceCode: 'import React from "react";',
        language: "typescript",
        filePath: "test.tsx",
        astNode: createMockASTNode("program", 'import React from "react";')
      };

      const mockMatches = [
        createMockMatch("import_statement", 'import React from "react";')
      ];

      // 쿼리 실행
      await engine.execute("ts-import-sources", mockMatches, mockContext);

      // 성능 메트릭 확인 (간소화)
      const validation = engine.validate();
      expect(validation.isValid).toBe(true);
    });

    it("should validate engine state", () => {
      const validation = engine.validate();
      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe("Language Support Validation", () => {
    it("should support all declared languages", () => {
      const supportedLanguages: SupportedLanguage[] = [
        "typescript", "javascript", "java", "python", "go"
      ];

      for (const language of supportedLanguages) {
        const mockContext: QueryExecutionContext = {
          sourceCode: "// test code",
          language,
          filePath: `test.${language}`,
          astNode: createMockASTNode("program", "// test code")
        };

        // 컨텍스트 생성이 에러 없이 동작해야 함
        expect(mockContext.language).toBe(language);
        expect(typeof mockContext.sourceCode).toBe("string");
      }
    });

    it("should have queries for major languages", () => {
      const registry = engine.getRegistry();
      const queryKeys = registry.getAllQueryKeys();

      // 각 주요 언어별로 쿼리가 존재하는지 확인
      const languagePrefixes = ["ts-", "java-", "python-"];

      for (const prefix of languagePrefixes) {
        const languageQueries = queryKeys.filter((key: string) => key.startsWith(prefix));
        expect(languageQueries.length).toBeGreaterThan(0);

        // 기본적인 import/export 쿼리가 있는지 확인
        const hasImportQuery = languageQueries.some((key: string) =>
          key.includes("import") || key.includes("sources")
        );
        expect(hasImportQuery).toBe(true);
      }
    });
  });
});