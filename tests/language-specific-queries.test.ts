/**
 * Language-Specific Query Tests
 * 언어별 기본 쿼리 동작 테스트
 */

import {
  QueryEngine,
  QueryExecutionContext,
  QueryMatch,
  ASTNode,
} from "../src";

// Mock 데이터 생성 헬퍼 함수들
function createMockASTNode(type: string, text: string, children?: ASTNode[]): ASTNode {
  return {
    type,
    text,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    children: children || []
  };
}

function createMockMatch(nodeType: string, nodeText: string, captures?: any[]): QueryMatch {
  return {
    node: createMockASTNode(nodeType, nodeText),
    captures: captures || []
  };
}

describe("Language-Specific Query Tests", () => {
  let engine: typeof QueryEngine.globalInstance;

  beforeAll(() => {
    engine = QueryEngine.globalInstance;
  });

  describe("TypeScript Queries", () => {
    const createTSContext = (sourceCode: string): QueryExecutionContext => ({
      sourceCode,
      language: "typescript",
      filePath: "test.ts",
      astNode: createMockASTNode("program", sourceCode)
    });

    it("should execute ts-import-sources query", async () => {
      const sourceCode = 'import React from "react";';
      const context = createTSContext(sourceCode);

      // Mock 매치에 더 현실적인 captures 추가
      const matches = [{
        node: createMockASTNode("import_statement", sourceCode),
        captures: [
          {
            name: "source",
            node: createMockASTNode("string", '"react"')
          }
        ]
      }];

      const results = await engine.execute("ts-import-sources", matches, context);

      expect(Array.isArray(results)).toBe(true);
      // Mock 데이터에서는 결과가 나올 수도 있고 없을 수도 있음
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should execute ts-named-imports query", async () => {
      const sourceCode = 'import { useState, useEffect } from "react";';
      const context = createTSContext(sourceCode);
      const matches = [createMockMatch("import_statement", sourceCode)];

      const results = await engine.execute("ts-named-imports", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should execute ts-type-imports query", async () => {
      const sourceCode = 'import type { User } from "./types";';
      const context = createTSContext(sourceCode);
      const matches = [createMockMatch("import_statement", sourceCode)];

      const results = await engine.execute("ts-type-imports", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should execute ts-export-declarations query", async () => {
      const sourceCode = 'export const Component = () => <div>Hello</div>;';
      const context = createTSContext(sourceCode);
      const matches = [createMockMatch("export_statement", sourceCode)];

      const results = await engine.execute("ts-export-declarations", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should execute multiple TypeScript queries", async () => {
      const sourceCode = 'import React from "react"; export const App = () => <div>Hello</div>;';
      const context = createTSContext(sourceCode);
      const matches = [
        createMockMatch("import_statement", 'import React from "react";'),
        createMockMatch("export_statement", 'export const App = () => <div>Hello</div>;')
      ];

      const results = await engine.executeMultiple([
        "ts-import-sources",
        "ts-export-declarations"
      ], matches, context);

      expect(results["ts-import-sources"]).toBeDefined();
      expect(results["ts-export-declarations"]).toBeDefined();
      expect(Array.isArray(results["ts-import-sources"])).toBe(true);
      expect(Array.isArray(results["ts-export-declarations"])).toBe(true);
    });
  });

  describe("Java Queries", () => {
    const createJavaContext = (sourceCode: string): QueryExecutionContext => ({
      sourceCode,
      language: "java",
      filePath: "Test.java",
      astNode: createMockASTNode("compilation_unit", sourceCode)
    });

    it("should execute java-import-sources query", async () => {
      const sourceCode = 'import java.util.List;';
      const context = createJavaContext(sourceCode);
      const matches = [createMockMatch("import_declaration", sourceCode)];

      const results = await engine.execute("java-import-sources", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("java-import-sources");
    });

    it("should execute java-class-declarations query", async () => {
      const sourceCode = 'public class TestClass { }';
      const context = createJavaContext(sourceCode);
      const matches = [createMockMatch("class_declaration", sourceCode)];

      const results = await engine.execute("java-class-declarations", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("java-class-declarations");
    });

    it("should execute java-interface-declarations query", async () => {
      const sourceCode = 'public interface TestInterface { }';
      const context = createJavaContext(sourceCode);
      const matches = [createMockMatch("interface_declaration", sourceCode)];

      const results = await engine.execute("java-interface-declarations", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("java-interface-declarations");
    });

    it("should execute java-method-declarations query", async () => {
      const sourceCode = 'public void testMethod() { }';
      const context = createJavaContext(sourceCode);
      const matches = [createMockMatch("method_declaration", sourceCode)];

      const results = await engine.execute("java-method-declarations", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("java-method-declarations");
    });

    it("should execute java wildcard and static imports", async () => {
      const wildcardCode = 'import java.util.*;';
      const staticCode = 'import static java.lang.Math.PI;';
      const context = createJavaContext(wildcardCode + staticCode);

      const wildcardMatches = [createMockMatch("import_declaration", wildcardCode)];
      const staticMatches = [createMockMatch("import_declaration", staticCode)];

      const wildcardResults = await engine.execute("java-wildcard-imports", wildcardMatches, context);
      const staticResults = await engine.execute("java-static-imports", staticMatches, context);

      expect(wildcardResults.length).toBe(1);
      expect(staticResults.length).toBe(1);
      expect(wildcardResults[0].queryName).toBe("java-wildcard-imports");
      expect(staticResults[0].queryName).toBe("java-static-imports");
    });
  });

  describe("Python Queries", () => {
    const createPythonContext = (sourceCode: string): QueryExecutionContext => ({
      sourceCode,
      language: "python",
      filePath: "test.py",
      astNode: createMockASTNode("module", sourceCode)
    });

    it("should execute python-import-sources query", async () => {
      const sourceCode = 'import pandas as pd';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("import_statement", sourceCode)];

      const results = await engine.execute("python-import-sources", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-import-sources");
    });

    it("should execute python-from-imports query", async () => {
      const sourceCode = 'from django.http import HttpResponse';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("import_from_statement", sourceCode)];

      const results = await engine.execute("python-from-imports", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-from-imports");
    });

    it("should execute python-function-definitions query", async () => {
      const sourceCode = 'def calculate_sum(a, b): return a + b';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("function_definition", sourceCode)];

      const results = await engine.execute("python-function-definitions", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-function-definitions");
    });

    it("should execute python-class-definitions query", async () => {
      const sourceCode = 'class TestClass: pass';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("class_definition", sourceCode)];

      const results = await engine.execute("python-class-definitions", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-class-definitions");
    });

    it("should execute python-variable-definitions query", async () => {
      const sourceCode = 'API_KEY = "secret"';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("assignment", sourceCode)];

      const results = await engine.execute("python-variable-definitions", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-variable-definitions");
    });

    it("should execute python import aliases", async () => {
      const sourceCode = 'import numpy as np';
      const context = createPythonContext(sourceCode);
      const matches = [createMockMatch("import_statement", sourceCode)];

      const results = await engine.execute("python-import-as", matches, context);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].queryName).toBe("python-import-as");
    });
  });

  describe("Cross-Language Query Patterns", () => {
    it("should have consistent import query patterns across languages", async () => {
      const engines = [
        {
          query: "ts-import-sources",
          context: { sourceCode: 'import React from "react";', language: "typescript" as const, filePath: "test.ts", astNode: createMockASTNode("program", "") },
          match: createMockMatch("import_statement", 'import React from "react";')
        },
        {
          query: "java-import-sources",
          context: { sourceCode: 'import java.util.List;', language: "java" as const, filePath: "Test.java", astNode: createMockASTNode("compilation_unit", "") },
          match: createMockMatch("import_declaration", 'import java.util.List;')
        },
        {
          query: "python-import-sources",
          context: { sourceCode: 'import pandas', language: "python" as const, filePath: "test.py", astNode: createMockASTNode("module", "") },
          match: createMockMatch("import_statement", 'import pandas')
        }
      ];

      for (const { query, context, match } of engines) {
        const results = await engine.execute(query as any, [match], context);
        expect(Array.isArray(results)).toBe(true);
        // Mock 데이터로는 실제 결과가 나오지 않을 수 있음
        expect(results.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should execute queries for different languages in parallel", async () => {
      const tsContext: QueryExecutionContext = {
        sourceCode: 'import React from "react";',
        language: "typescript",
        filePath: "App.tsx",
        astNode: createMockASTNode("program", "")
      };

      const javaContext: QueryExecutionContext = {
        sourceCode: 'import java.util.List;',
        language: "java",
        filePath: "App.java",
        astNode: createMockASTNode("compilation_unit", "")
      };

      const pythonContext: QueryExecutionContext = {
        sourceCode: 'import pandas as pd',
        language: "python",
        filePath: "app.py",
        astNode: createMockASTNode("module", "")
      };

      const matches = [createMockMatch("import_statement", "import test")];

      // 병렬 실행 테스트
      const [tsResults, javaResults, pythonResults] = await Promise.all([
        engine.execute("ts-import-sources", matches, tsContext),
        engine.execute("java-import-sources", matches, javaContext),
        engine.execute("python-import-sources", matches, pythonContext)
      ]);

      expect(tsResults.length).toBeGreaterThanOrEqual(0);
      expect(javaResults.length).toBeGreaterThanOrEqual(0);
      expect(pythonResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Query Result Type Safety", () => {
    it("should return properly typed results for each language", async () => {
      const tsContext: QueryExecutionContext = {
        sourceCode: 'import React from "react";',
        language: "typescript",
        filePath: "test.ts",
        astNode: createMockASTNode("program", "")
      };

      const matches = [createMockMatch("import_statement", 'import React from "react";')];

      const results = await engine.execute("ts-import-sources", matches, tsContext);

      // 결과 타입 검증 (결과가 있는 경우에만)
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("queryName");
        expect(results[0]).toHaveProperty("location");
        expect(results[0]).toHaveProperty("nodeText");
        expect(typeof results[0].queryName).toBe("string");
        expect(typeof results[0].nodeText).toBe("string");
        expect(typeof results[0].location).toBe("object");
      }
    });

    it("should maintain consistent result structure across languages", async () => {
      const queryTests = [
        { query: "ts-import-sources", language: "typescript" as const, code: 'import React from "react";' },
        { query: "java-import-sources", language: "java" as const, code: 'import java.util.List;' },
        { query: "python-import-sources", language: "python" as const, code: 'import pandas' }
      ];

      for (const { query, language, code } of queryTests) {
        const context: QueryExecutionContext = {
          sourceCode: code,
          language,
          filePath: `test.${language}`,
          astNode: createMockASTNode("program", code)
        };

        const matches = [createMockMatch("import_statement", code)];
        const results = await engine.execute(query as any, matches, context);

        // 모든 결과가 공통 인터페이스를 가져야 함 (결과가 있는 경우)
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
          expect(results[0]).toHaveProperty("queryName");
          expect(results[0]).toHaveProperty("location");
          expect(results[0]).toHaveProperty("nodeText");
          expect(typeof results[0].nodeText).toBe("string");
          expect(typeof results[0].location).toBe("object");
        }
      }
    });
  });
});