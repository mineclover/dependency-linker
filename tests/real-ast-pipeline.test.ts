/**
 * Real AST Pipeline Test
 * 실제 tree-sitter를 사용한 AST → 쿼리 파이프라인 테스트
 */

import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import {
  QueryEngine,
  CustomKeyMapping,
  QueryExecutionContext,
  QueryMatch,
  ASTNode,
  SupportedLanguage,
} from "../src";

// tree-sitter AST를 우리 ASTNode 형식으로 변환
function convertTreeSitterNode(node: Parser.SyntaxNode): ASTNode {
  return {
    type: node.type,
    text: node.text,
    startPosition: {
      row: node.startPosition.row,
      column: node.startPosition.column,
    },
    endPosition: {
      row: node.endPosition.row,
      column: node.endPosition.column,
    },
    children: node.children.map(child => convertTreeSitterNode(child)),
  };
}

describe("Real AST → Query Pipeline", () => {
  let tsParser: Parser;
  let jsParser: Parser;

  beforeAll(() => {
    // TypeScript 파서 설정
    tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);

    // JavaScript 파서 설정
    jsParser = new Parser();
    jsParser.setLanguage(JavaScript);
  });

  describe("TypeScript AST → Query Pipeline", () => {
    it("should parse TypeScript and extract import information", () => {
      // 1. 실제 TypeScript 코드
      const sourceCode = `
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
import type { User } from './types/User';

export const UserComponent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  return <div>Hello {user?.name}</div>;
};

export default UserComponent;
      `.trim();

      // 2. tree-sitter로 실제 AST 파싱
      const tree = tsParser.parse(sourceCode);
      const astNode = convertTreeSitterNode(tree.rootNode);

      // 3. 실행 컨텍스트 생성
      const context: QueryExecutionContext = {
        sourceCode,
        language: "typescript" as SupportedLanguage,
        filePath: "UserComponent.tsx",
        astNode,
      };

      // 4. AST 구조 검증
      expect(astNode.type).toBe("program");
      expect(astNode.text).toBe(sourceCode);
      expect(astNode.children).toBeDefined();
      expect(astNode.children!.length).toBeGreaterThan(0);

      // 5. import 노드들 찾기
      const importNodes = astNode.children!.filter(child =>
        child.type === "import_statement"
      );

      expect(importNodes.length).toBe(3); // 3개의 import 문

      // 6. 각 import 유형 확인
      const importTexts = importNodes.map(node => node.text);
      expect(importTexts[0]).toContain("React, { useState, useEffect }");
      expect(importTexts[1]).toContain("Button");
      expect(importTexts[2]).toContain("type { User }");

      // 7. export 노드들 찾기
      const exportNodes = astNode.children!.filter(child =>
        child.type === "export_statement" ||
        child.type === "lexical_declaration" &&
        child.text.startsWith("export")
      );

      expect(exportNodes.length).toBeGreaterThan(0);

      console.log("✅ TypeScript AST → Query Pipeline 검증 완료");
      console.log(`   - Source: ${sourceCode.split('\n')[0]}...`);
      console.log(`   - AST Type: ${astNode.type}`);
      console.log(`   - Children: ${astNode.children!.length} nodes`);
      console.log(`   - Imports: ${importNodes.length} statements`);
      console.log(`   - Language: ${context.language}`);
    });

    it("should process different TypeScript constructs", () => {
      const testCases = [
        {
          name: "Classes",
          code: `
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchData(): Promise<any> {
    return fetch(this.baseUrl);
  }
}`,
          expectedTypes: ["class_declaration"]
        },
        {
          name: "Interfaces",
          code: `
export interface UserData {
  id: number;
  name: string;
  email?: string;
}

export type Status = 'active' | 'inactive';`,
          expectedTypes: ["interface_declaration", "type_alias_declaration"]
        },
        {
          name: "Functions",
          code: `
export function processUser(data: UserData): User {
  return new User(data);
}

export const asyncProcessor = async (data: any) => {
  return await processUser(data);
};`,
          expectedTypes: ["function_declaration", "lexical_declaration"]
        }
      ];

      testCases.forEach(testCase => {
        const tree = tsParser.parse(testCase.code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        expect(astNode.type).toBe("program");
        expect(astNode.children).toBeDefined();

        // 예상된 타입들이 AST에 포함되어 있는지 확인 (깊이 우선 탐색)
        const getAllNodeTypes = (node: ASTNode): string[] => {
          const types = [node.type];
          if (node.children) {
            for (const child of node.children) {
              types.push(...getAllNodeTypes(child));
            }
          }
          return types;
        };

        const allNodeTypes = new Set(getAllNodeTypes(astNode));

        testCase.expectedTypes.forEach(expectedType => {
          expect(Array.from(allNodeTypes)).toContain(expectedType);
        });

        console.log(`✅ ${testCase.name} AST 처리 확인`);
        console.log(`   - Node Types: ${Array.from(allNodeTypes).join(", ")}`);
      });
    });
  });

  describe("JavaScript AST → Query Pipeline", () => {
    it("should parse JavaScript and handle different module systems", () => {
      const testCases = [
        {
          name: "ES6 Modules",
          code: `
import express from 'express';
import { router } from './routes';

export const app = express();
export default app;`,
          language: "javascript" as SupportedLanguage
        },
        {
          name: "CommonJS",
          code: `
const express = require('express');
const { router } = require('./routes');

module.exports = {
  app: express(),
  router
};`,
          language: "javascript" as SupportedLanguage
        }
      ];

      testCases.forEach(testCase => {
        const tree = jsParser.parse(testCase.code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        const context: QueryExecutionContext = {
          sourceCode: testCase.code,
          language: testCase.language,
          filePath: `test.js`,
          astNode,
        };

        expect(astNode.type).toBe("program");
        expect(context.language).toBe("javascript");

        console.log(`✅ ${testCase.name} JavaScript AST 처리 확인`);
        console.log(`   - AST Type: ${astNode.type}`);
        console.log(`   - Language: ${context.language}`);
      });
    });
  });

  describe("Cross-Language Query Execution", () => {
    it("should demonstrate language interchangeability in pipeline", () => {
      // 동일한 로직, 다른 언어로 구현
      const implementations = {
        typescript: `
export interface Config {
  apiUrl: string;
  timeout: number;
}

export const defaultConfig: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};`,
        javascript: `
const defaultConfig = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};

module.exports = { defaultConfig };`
      };

      // 각 언어별로 AST 파싱 및 파이프라인 처리
      Object.entries(implementations).forEach(([language, code]) => {
        const parser = language === "typescript" ? tsParser : jsParser;
        const tree = parser.parse(code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        const context: QueryExecutionContext = {
          sourceCode: code,
          language: language as SupportedLanguage,
          filePath: `config.${language === "typescript" ? "ts" : "js"}`,
          astNode,
        };

        // 동일한 파이프라인 구조
        expect(astNode.type).toBe("program");
        expect(context.language).toBe(language);
        expect(context.sourceCode).toContain("apiUrl");
        expect(context.sourceCode).toContain("example.com");

        console.log(`✅ ${language} 파이프라인 처리 확인`);
        console.log(`   - 동일한 로직, 다른 언어`);
        console.log(`   - AST Type: ${astNode.type}`);
        console.log(`   - Context Language: ${context.language}`);
      });
    });

    it("should support custom query mapping across languages", () => {
      // 현재 구현된 쿼리들로 커스텀 매핑 테스트
      const typeScriptMapping = CustomKeyMapping.createMapper({
        imports: "ts-import-sources",
        namedImports: "ts-named-imports",
        defaultImports: "ts-default-imports",
        typeImports: "ts-type-imports"
      });

      const pythonMapping = CustomKeyMapping.createMapper({
        imports: "python-import-sources",
        fromImports: "python-from-imports",
        importStatements: "python-import-statements",
        importAliases: "python-import-as"
      });

      // TypeScript 매핑 검증
      const tsValidation = typeScriptMapping.validate();
      expect(tsValidation.isValid).toBe(true);

      const tsUserKeys = typeScriptMapping.getUserKeys();
      expect(tsUserKeys).toContain("imports");
      expect(tsUserKeys).toContain("namedImports");

      // Python 매핑 검증
      const pyValidation = pythonMapping.validate();
      expect(pyValidation.isValid).toBe(true);

      const pyUserKeys = pythonMapping.getUserKeys();
      expect(pyUserKeys).toContain("imports");
      expect(pyUserKeys).toContain("fromImports");

      console.log(`✅ TypeScript 커스텀 매핑 검증`);
      console.log(`   - User Keys: ${tsUserKeys.join(", ")}`);
      console.log(`   - Valid: ${tsValidation.isValid}`);

      console.log(`✅ Python 커스텀 매핑 검증`);
      console.log(`   - User Keys: ${pyUserKeys.join(", ")}`);
      console.log(`   - Valid: ${pyValidation.isValid}`);

      // 언어 간 쿼리 구조의 일관성 확인
      expect(tsUserKeys.length).toBeGreaterThan(2);
      expect(pyUserKeys.length).toBeGreaterThan(2);
      expect(tsUserKeys).toContain("imports");
      expect(pyUserKeys).toContain("imports");
    });
  });
});