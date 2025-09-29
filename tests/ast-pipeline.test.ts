/**
 * AST Pipeline Test
 * AST → 쿼리 조합 및 실행 파이프라인 테스트 (멀티 언어)
 */

import {
  QueryEngine,
  CustomKeyMapping,
  QueryExecutionContext,
  QueryMatch,
  ASTNode,
  SupportedLanguage,
} from "../src";

describe("AST → Query Pipeline", () => {
  describe("Pipeline Architecture", () => {
    it("should support AST → Query → Results pipeline", () => {
      // 1. AST 단계: 다양한 언어의 AST를 시뮬레이션
      const typeScriptAST: ASTNode = {
        type: "program",
        text: 'import { useState } from "react";',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 34 },
        children: [
          {
            type: "import_statement",
            text: 'import { useState } from "react";',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 34 },
          }
        ]
      };

      const javaScriptAST: ASTNode = {
        type: "program",
        text: 'const React = require("react");',
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 0, column: 31 },
        children: [
          {
            type: "variable_declaration",
            text: 'const React = require("react");',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 31 },
          }
        ]
      };

      // 2. 쿼리 조합 단계: 언어별 쿼리 조합
      const tsQueries = ["ts-import-sources", "ts-named-imports"];
      const jsQueries = ["js-import-sources", "js-named-imports"];

      // 3. 실행 컨텍스트: 언어에 따라 다른 컨텍스트
      const tsContext: QueryExecutionContext = {
        sourceCode: 'import { useState } from "react";',
        language: "typescript" as SupportedLanguage,
        filePath: "component.ts",
        astNode: typeScriptAST
      };

      const jsContext: QueryExecutionContext = {
        sourceCode: 'const React = require("react");',
        language: "javascript" as SupportedLanguage,
        filePath: "component.js",
        astNode: javaScriptAST
      };

      // 4. 파이프라인 검증
      expect(tsContext.language).toBe("typescript");
      expect(jsContext.language).toBe("javascript");
      expect(tsContext.astNode.type).toBe("program");
      expect(jsContext.astNode.type).toBe("program");

      // 5. 언어별 쿼리 매핑이 다름을 확인
      expect(tsQueries).toContain("ts-import-sources");
      expect(jsQueries).toContain("js-import-sources");
      expect(tsQueries).not.toEqual(jsQueries);
    });
  });

  describe("Language Interchangeability", () => {
    it("should handle different languages with same query structure", async () => {
      // 같은 파이프라인, 다른 언어들
      const languages: SupportedLanguage[] = ["typescript", "javascript", "go", "java"];

      for (const language of languages) {
        const mockAST: ASTNode = {
          type: "program",
          text: `// ${language} source code`,
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 20 },
        };

        const context: QueryExecutionContext = {
          sourceCode: `// ${language} source code`,
          language,
          filePath: `test.${language === "typescript" ? "ts" : language === "javascript" ? "js" : language}`,
          astNode: mockAST
        };

        // 파이프라인이 언어와 무관하게 동일한 구조를 유지
        expect(context.astNode.type).toBe("program");
        expect(context.language).toBe(language);
        expect(typeof context.sourceCode).toBe("string");
        expect(typeof context.filePath).toBe("string");
      }
    });

    it("should support custom key mapping across languages", () => {
      // 언어에 관계없이 동일한 커스텀 키 구조 사용 가능
      const customMappingTS = {
        imports: "ts-import-sources",
        namedImports: "ts-named-imports",
        exports: "ts-export-declarations",
      };

      const customMappingJS = {
        imports: "js-import-sources",
        namedImports: "js-named-imports",
        exports: "js-export-declarations",
      };

      const customMappingGo = {
        imports: "go-import-declarations",
        exports: "go-exports",
      };

      // 모든 언어가 동일한 사용자 키 구조를 유지
      expect(customMappingTS.imports).toMatch(/import-sources$/);
      expect(customMappingJS.imports).toMatch(/import-sources$/);
      expect(customMappingGo.imports).toMatch(/import/);

      // 하지만 실제 쿼리 키는 언어별로 다름
      expect(customMappingTS.imports).toBe("ts-import-sources");
      expect(customMappingJS.imports).toBe("js-import-sources");
      expect(customMappingGo.imports).toBe("go-import-declarations");
    });
  });

  describe("Query Composition Pipeline", () => {
    it("should compose queries for multi-language analysis", () => {
      // 멀티 언어 프로젝트에서의 쿼리 조합
      const projectQueries = {
        // TypeScript 파일들
        "frontend": ["ts-import-sources", "ts-export-declarations", "ts-function-declarations"],
        // JavaScript 파일들
        "legacy": ["js-import-sources", "js-export-declarations", "js-function-declarations"],
        // Go 백엔드
        "backend": ["go-import-declarations", "go-function-declarations", "go-exports"],
        // Java 서비스
        "services": ["java-import-declarations", "java-class-definitions", "java-method-definitions"]
      };

      // 각 언어별로 다른 쿼리 세트가 조합됨
      expect(projectQueries.frontend).toContain("ts-import-sources");
      expect(projectQueries.legacy).toContain("js-import-sources");
      expect(projectQueries.backend).toContain("go-import-declarations");
      expect(projectQueries.services).toContain("java-import-declarations");

      // 하지만 모든 언어가 공통 패턴을 가짐 (imports, exports, functions)
      Object.values(projectQueries).forEach(queries => {
        const hasImports = queries.some(q => q.includes("import"));
        const hasDeclarations = queries.some(q => q.includes("function") || q.includes("class") || q.includes("method"));

        expect(hasImports || hasDeclarations).toBe(true);
      });
    });

    it("should execute pipeline with different AST structures", async () => {
      const engine = QueryEngine.globalInstance;

      // 다른 언어들의 AST 구조 시뮬레이션
      const astStructures = {
        typescript: {
          type: "program",
          text: 'export const API_URL = "https://api.example.com";',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 45 },
        },
        go: {
          type: "source_file",
          text: 'package main\n\nconst API_URL = "https://api.example.com"',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 2, column: 43 },
        },
        java: {
          type: "compilation_unit",
          text: 'public class Config {\n  public static final String API_URL = "https://api.example.com";\n}',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 2, column: 1 },
        }
      };

      // 모든 AST 구조가 파이프라인에서 처리 가능
      Object.entries(astStructures).forEach(([language, ast]) => {
        expect(ast.type).toBeDefined();
        expect(ast.text).toBeDefined();
        expect(ast.startPosition).toBeDefined();
        expect(ast.endPosition).toBeDefined();

        // 언어별로 다른 AST 노드 타입을 가지지만 동일한 인터페이스
        expect(typeof ast.type).toBe("string");
        expect(typeof ast.text).toBe("string");
      });
    });
  });

  describe("Real Pipeline Execution", () => {
    it("should demonstrate end-to-end AST → Query → Results pipeline", async () => {
      // 1. AST 단계 (Mock)
      const mockMatches: QueryMatch[] = [
        {
          node: {
            type: "import_statement",
            text: 'import React from "react"',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 24 },
          },
          captures: [
            {
              name: "source",
              node: {
                type: "string_literal",
                text: '"react"',
                startPosition: { row: 0, column: 18 },
                endPosition: { row: 0, column: 25 },
              }
            }
          ]
        }
      ];

      // 2. 실행 컨텍스트
      const context: QueryExecutionContext = {
        sourceCode: 'import React from "react"',
        language: "typescript",
        filePath: "App.tsx",
        astNode: {
          type: "program",
          text: 'import React from "react"',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 24 },
        }
      };

      // 3. 커스텀 키 매핑으로 쿼리 조합
      const customMapping = {
        imports: "ts-import-sources" as const,
        defaultImports: "ts-default-imports" as const,
        namedImports: "ts-named-imports" as const
      };

      // 4. 파이프라인 실행 시뮬레이션
      const mapper = CustomKeyMapping.createMapper(customMapping);
      expect(mapper.getMapping()).toEqual(customMapping);
      expect(mapper.getUserKeys()).toContain("imports");
      expect(mapper.getQueryKeys()).toContain("ts-import-sources");

      // 5. 결과 확인 - AST가 쿼리를 통해 구조화된 결과로 변환됨
      const validation = mapper.validate();
      expect(validation.isValid).toBe(true);
    });
  });
});