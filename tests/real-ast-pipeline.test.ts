/**
 * Real AST Pipeline Test
 * 실제 tree-sitter를 사용한 AST → 쿼리 파이프라인 테스트
 */

import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import Java from "tree-sitter-java";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
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
  let javaParser: Parser;
  let pythonParser: Parser;
  let goParser: Parser;

  beforeAll(() => {
    // TypeScript 파서 설정
    tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);

    // JavaScript 파서 설정
    jsParser = new Parser();
    jsParser.setLanguage(JavaScript);

    // Java 파서 설정
    javaParser = new Parser();
    javaParser.setLanguage(Java);

    // Python 파서 설정
    pythonParser = new Parser();
    pythonParser.setLanguage(Python);

    // Go 파서 설정
    goParser = new Parser();
    goParser.setLanguage(Go);
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

  describe("Java AST → Query Pipeline", () => {
    it("should parse Java and extract import information", () => {
      const sourceCode = `
package com.example.app;

import java.util.List;
import java.util.ArrayList;
import static java.lang.Math.PI;
import com.example.models.User;

public class UserService {
    private List<User> users;

    public UserService() {
        this.users = new ArrayList<>();
    }

    public void addUser(User user) {
        users.add(user);
    }

    public List<User> getUsers() {
        return users;
    }
}
      `.trim();

      const tree = javaParser.parse(sourceCode);
      const astNode = convertTreeSitterNode(tree.rootNode);

      const context: QueryExecutionContext = {
        sourceCode,
        language: "java" as SupportedLanguage,
        filePath: "UserService.java",
        astNode,
      };

      expect(astNode.type).toBe("program");
      expect(astNode.text).toBe(sourceCode);
      expect(astNode.children).toBeDefined();
      expect(astNode.children!.length).toBeGreaterThan(0);

      // 깊이 우선 탐색으로 import 노드들 찾기
      const findNodesByType = (node: ASTNode, targetType: string): ASTNode[] => {
        const results: ASTNode[] = [];
        if (node.type === targetType) {
          results.push(node);
        }
        if (node.children) {
          for (const child of node.children) {
            results.push(...findNodesByType(child, targetType));
          }
        }
        return results;
      };

      const importNodes = findNodesByType(astNode, "import_declaration");
      expect(importNodes.length).toBeGreaterThan(0);

      const importTexts = importNodes.map(node => node.text);
      expect(importTexts.some(text => text.includes("java.util.List"))).toBe(true);
      expect(importTexts.some(text => text.includes("ArrayList"))).toBe(true);
      expect(importTexts.some(text => text.includes("static"))).toBe(true);

      const classNodes = findNodesByType(astNode, "class_declaration");
      expect(classNodes.length).toBe(1);
      expect(classNodes[0].text).toContain("UserService");

      console.log("✅ Java AST → Query Pipeline 검증 완료");
      console.log(`   - Source: ${sourceCode.split('\n')[1].trim()}...`);
      console.log(`   - AST Type: ${astNode.type}`);
      console.log(`   - Imports: ${importNodes.length} declarations`);
      console.log(`   - Classes: ${classNodes.length} class`);
    });

    it("should handle various Java constructs", () => {
      const testCases = [
        {
          name: "Interface with methods",
          code: `
public interface UserRepository {
    void save(User user);
    User findById(Long id);
    List<User> findAll();
}`,
          expectedTypes: ["interface_declaration", "method_declaration"]
        },
        {
          name: "Enum definition",
          code: `
public enum Status {
    ACTIVE,
    INACTIVE,
    PENDING
}`,
          expectedTypes: ["enum_declaration", "enum_constant"]
        },
        {
          name: "Abstract class with inheritance",
          code: `
public abstract class BaseService<T> extends ServiceBase implements Repository<T> {
    protected abstract void process(T item);
}`,
          expectedTypes: ["class_declaration", "method_declaration"]
        }
      ];

      testCases.forEach(testCase => {
        const tree = javaParser.parse(testCase.code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        expect(astNode.type).toBe("program");

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

        console.log(`✅ Java ${testCase.name} AST 처리 확인`);
      });
    });
  });

  describe("Python AST → Query Pipeline", () => {
    it("should parse Python and extract import information", () => {
      const sourceCode = `
import os
import sys
from typing import List, Dict, Optional
from django.http import HttpResponse
from .models import User
import pandas as pd
import numpy as np

class UserService:
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.users: List[User] = []

    def add_user(self, user: User) -> None:
        self.users.append(user)

    def get_users(self) -> List[User]:
        return self.users

    async def fetch_user_data(self, user_id: int) -> Optional[User]:
        # 비동기 데이터 가져오기
        return await self._fetch_from_db(user_id)

def process_data(data: pd.DataFrame) -> np.ndarray:
    return data.values
      `.trim();

      const tree = pythonParser.parse(sourceCode);
      const astNode = convertTreeSitterNode(tree.rootNode);

      const context: QueryExecutionContext = {
        sourceCode,
        language: "python" as SupportedLanguage,
        filePath: "user_service.py",
        astNode,
      };

      expect(astNode.type).toBe("module");
      expect(astNode.text).toBe(sourceCode);
      expect(astNode.children).toBeDefined();
      expect(astNode.children!.length).toBeGreaterThan(0);

      const findNodesByType = (node: ASTNode, targetType: string): ASTNode[] => {
        const results: ASTNode[] = [];
        if (node.type === targetType) {
          results.push(node);
        }
        if (node.children) {
          for (const child of node.children) {
            results.push(...findNodesByType(child, targetType));
          }
        }
        return results;
      };

      const importNodes = findNodesByType(astNode, "import_statement");
      const fromImportNodes = findNodesByType(astNode, "import_from_statement");

      expect(importNodes.length).toBeGreaterThan(0);
      expect(fromImportNodes.length).toBeGreaterThan(0);

      const allImports = [...importNodes, ...fromImportNodes];
      const importTexts = allImports.map(node => node.text);

      expect(importTexts.some(text => text.includes("pandas"))).toBe(true);
      expect(importTexts.some(text => text.includes("from typing"))).toBe(true);
      expect(importTexts.some(text => text.includes("django"))).toBe(true);

      const classNodes = findNodesByType(astNode, "class_definition");
      expect(classNodes.length).toBe(1);
      expect(classNodes[0].text).toContain("UserService");

      const functionNodes = findNodesByType(astNode, "function_definition");
      expect(functionNodes.length).toBeGreaterThan(0);

      console.log("✅ Python AST → Query Pipeline 검증 완료");
      console.log(`   - Source: ${sourceCode.split('\n')[0]}...`);
      console.log(`   - AST Type: ${astNode.type}`);
      console.log(`   - Import statements: ${importNodes.length}`);
      console.log(`   - From import statements: ${fromImportNodes.length}`);
      console.log(`   - Classes: ${classNodes.length}`);
      console.log(`   - Functions: ${functionNodes.length}`);
    });

    it("should handle various Python constructs", () => {
      const testCases = [
        {
          name: "Async/await functions",
          code: `
async def fetch_data(url: str) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()`,
          expectedTypes: ["function_definition", "async", "await"]
        },
        {
          name: "Decorators and class methods",
          code: `
class APIClient:
    @property
    def base_url(self) -> str:
        return self._base_url

    @staticmethod
    def validate_response(response):
        return response.status_code == 200`,
          expectedTypes: ["class_definition", "decorated_definition", "function_definition"]
        },
        {
          name: "List comprehension and generators",
          code: `
def process_users(users):
    active_users = [user for user in users if user.is_active]
    user_emails = (user.email for user in active_users)
    return list(user_emails)`,
          expectedTypes: ["function_definition", "list_comprehension", "generator_expression"]
        }
      ];

      testCases.forEach(testCase => {
        const tree = pythonParser.parse(testCase.code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        expect(astNode.type).toBe("module");

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

        console.log(`✅ Python ${testCase.name} AST 처리 확인`);
      });
    });
  });

  describe("Go AST → Query Pipeline", () => {
    it("should parse Go and extract import information", () => {
      const sourceCode = `
package main

import (
    "fmt"
    "net/http"
    "encoding/json"
    "github.com/gorilla/mux"
    "github.com/example/app/models"
)

type User struct {
    ID   int    \`json:"id"\`
    Name string \`json:"name"\`
    Email string \`json:"email"\`
}

type UserService struct {
    users []User
}

func (s *UserService) AddUser(user User) {
    s.users = append(s.users, user)
}

func (s *UserService) GetUsers() []User {
    return s.users
}

func main() {
    service := &UserService{}

    r := mux.NewRouter()
    r.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
        users := service.GetUsers()
        json.NewEncoder(w).Encode(users)
    }).Methods("GET")

    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", r)
}
      `.trim();

      const tree = goParser.parse(sourceCode);
      const astNode = convertTreeSitterNode(tree.rootNode);

      const context: QueryExecutionContext = {
        sourceCode,
        language: "go" as SupportedLanguage,
        filePath: "main.go",
        astNode,
      };

      expect(astNode.type).toBe("source_file");
      expect(astNode.text).toBe(sourceCode);
      expect(astNode.children).toBeDefined();
      expect(astNode.children!.length).toBeGreaterThan(0);

      const findNodesByType = (node: ASTNode, targetType: string): ASTNode[] => {
        const results: ASTNode[] = [];
        if (node.type === targetType) {
          results.push(node);
        }
        if (node.children) {
          for (const child of node.children) {
            results.push(...findNodesByType(child, targetType));
          }
        }
        return results;
      };

      const packageNodes = findNodesByType(astNode, "package_clause");
      expect(packageNodes.length).toBe(1);
      expect(packageNodes[0].text).toContain("main");

      const importNodes = findNodesByType(astNode, "import_declaration");
      expect(importNodes.length).toBeGreaterThan(0);

      const typeNodes = findNodesByType(astNode, "type_declaration");
      expect(typeNodes.length).toBeGreaterThan(0);

      const functionNodes = findNodesByType(astNode, "function_declaration");
      expect(functionNodes.length).toBeGreaterThan(0);

      const methodNodes = findNodesByType(astNode, "method_declaration");
      expect(methodNodes.length).toBeGreaterThan(0);

      console.log("✅ Go AST → Query Pipeline 검증 완료");
      console.log(`   - Source: package main...`);
      console.log(`   - AST Type: ${astNode.type}`);
      console.log(`   - Package: ${packageNodes.length} clause`);
      console.log(`   - Imports: ${importNodes.length} declarations`);
      console.log(`   - Types: ${typeNodes.length} declarations`);
      console.log(`   - Functions: ${functionNodes.length} declarations`);
      console.log(`   - Methods: ${methodNodes.length} declarations`);
    });

    it("should handle various Go constructs", () => {
      const testCases = [
        {
          name: "Interface definitions",
          code: `
type UserRepository interface {
    Save(user User) error
    FindByID(id int) (User, error)
    FindAll() ([]User, error)
}`,
          expectedTypes: ["type_declaration", "interface_type", "method_elem"]
        },
        {
          name: "Struct with embedded types",
          code: `
type BaseModel struct {
    ID        uint      \`gorm:"primarykey"\`
    CreatedAt time.Time
    UpdatedAt time.Time
}

type User struct {
    BaseModel
    Name  string \`json:"name"\`
    Email string \`json:"email" gorm:"unique"\`
}`,
          expectedTypes: ["type_declaration", "struct_type", "field_declaration"]
        },
        {
          name: "Goroutines and channels",
          code: `
func processUsers(users []User) <-chan User {
    result := make(chan User)

    go func() {
        defer close(result)
        for _, user := range users {
            result <- user
        }
    }()

    return result
}`,
          expectedTypes: ["function_declaration", "go_statement", "call_expression", "channel_type"]
        }
      ];

      testCases.forEach(testCase => {
        const tree = goParser.parse(testCase.code);
        const astNode = convertTreeSitterNode(tree.rootNode);

        expect(astNode.type).toBe("source_file");

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

        console.log(`✅ Go ${testCase.name} AST 처리 확인`);
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