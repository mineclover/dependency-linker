/**
 * Parser Integration Tests
 * 파서 모듈 통합 테스트
 */

import {
  Parsers,
  createParser,
  createParserForFile,
  isFileSupported,
  getSupportedLanguages,
  parseCode,
  parseFile,
} from "../src/parsers";

describe("Parser Integration Tests", () => {
  describe("Parser Factory", () => {
    it("should support all configured languages", async () => {
      const languages = getSupportedLanguages();

      console.log("🌐 지원되는 언어들:", languages);

      expect(languages).toContain("typescript");
      expect(languages).toContain("javascript");
      expect(languages).toContain("java");
      expect(languages).toContain("python");
      expect(languages).toContain("go");
    });

    it("should create language-specific parsers", async () => {
      const tsParser = createParser("typescript");
      const javaParser = createParser("java");
      const pythonParser = createParser("python");
      const goParser = createParser("go");

      expect(tsParser.getLanguage()).toBe("typescript");
      expect(javaParser.getLanguage()).toBe("java");
      expect(pythonParser.getLanguage()).toBe("python");
      expect(goParser.getLanguage()).toBe("go");

      console.log("✅ 모든 언어별 파서 생성 성공");
    });

    it("should auto-select parser by file extension", async () => {
      const testCases = [
        { file: "test.ts", expectedLanguage: "typescript" },
        { file: "test.tsx", expectedLanguage: "typescript" },
        { file: "test.js", expectedLanguage: "typescript" }, // JS uses TS parser
        { file: "test.java", expectedLanguage: "java" },
        { file: "test.py", expectedLanguage: "python" },
        { file: "test.go", expectedLanguage: "go" },
      ];

      for (const { file, expectedLanguage } of testCases) {
        const parser = createParserForFile(file);
        expect(parser).toBeTruthy();
        expect(parser!.getLanguage()).toBe(expectedLanguage);

        console.log(`📁 ${file} → ${expectedLanguage} 파서 자동 선택`);
      }
    });

    it("should check file support correctly", async () => {
      expect(isFileSupported("test.ts")).toBe(true);
      expect(isFileSupported("test.java")).toBe(true);
      expect(isFileSupported("test.py")).toBe(true);
      expect(isFileSupported("test.go")).toBe(true);

      expect(isFileSupported("test.txt")).toBe(false);
      expect(isFileSupported("test.cpp")).toBe(false);

      console.log("✅ 파일 지원 여부 확인 완료");
    });
  });

  describe("TypeScript Parser", () => {
    it("should parse TypeScript code successfully", async () => {
      const sourceCode = `
import React from 'react';
import { useState } from 'react';

export const Component: React.FC = () => {
  const [count, setCount] = useState(0);
  return <div>Count: {count}</div>;
};

export default Component;
      `.trim();

      const result = await parseCode(sourceCode, "typescript", "test.tsx");

      expect(result.tree).toBeDefined();
      expect(result.tree.rootNode).toBeDefined();
      expect(result.context.language).toBe("typescript");
      expect(result.metadata.language).toBe("typescript");
      expect(result.metadata.nodeCount).toBeGreaterThan(0);

      console.log("🔷 TypeScript 파싱 결과:");
      console.log(`   - 노드 수: ${result.metadata.nodeCount}`);
      console.log(`   - 파싱 시간: ${result.metadata.parseTime.toFixed(2)}ms`);
      console.log(`   - AST 루트: ${result.tree.rootNode.type}`);
    });
  });

  describe("Java Parser", () => {
    it("should parse Java code successfully", async () => {
      const sourceCode = `
package com.example;

import java.util.List;
import java.util.ArrayList;

public class UserService {
    private List<String> users;

    public UserService() {
        this.users = new ArrayList<>();
    }

    public void addUser(String user) {
        users.add(user);
    }
}
      `.trim();

      const result = await parseCode(sourceCode, "java", "UserService.java");

      expect(result.tree).toBeDefined();
      expect(result.tree.rootNode).toBeDefined();
      expect(result.context.language).toBe("java");
      expect(result.metadata.language).toBe("java");
      expect(result.metadata.nodeCount).toBeGreaterThan(0);

      console.log("☕ Java 파싱 결과:");
      console.log(`   - 노드 수: ${result.metadata.nodeCount}`);
      console.log(`   - 파싱 시간: ${result.metadata.parseTime.toFixed(2)}ms`);
      console.log(`   - AST 루트: ${result.tree.rootNode.type}`);
    });
  });

  describe("Python Parser", () => {
    it("should parse Python code successfully", async () => {
      const sourceCode = `
import os
import sys
from typing import List, Dict

class UserService:
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.users: List[str] = []

    def add_user(self, user: str) -> None:
        self.users.append(user)

    async def get_users(self) -> List[str]:
        return self.users

def main():
    service = UserService({"db": "sqlite"})
    service.add_user("Alice")
      `.trim();

      const result = await parseCode(sourceCode, "python", "user_service.py");

      expect(result.tree).toBeDefined();
      expect(result.tree.rootNode).toBeDefined();
      expect(result.context.language).toBe("python");
      expect(result.metadata.language).toBe("python");
      expect(result.metadata.nodeCount).toBeGreaterThan(0);

      console.log("🐍 Python 파싱 결과:");
      console.log(`   - 노드 수: ${result.metadata.nodeCount}`);
      console.log(`   - 파싱 시간: ${result.metadata.parseTime.toFixed(2)}ms`);
      console.log(`   - AST 루트: ${result.tree.rootNode.type}`);
    });
  });

  describe("Go Parser", () => {
    it("should parse Go code successfully", async () => {
      const sourceCode = `
package main

import (
    "fmt"
    "net/http"
)

type User struct {
    ID   int    \`json:"id"\`
    Name string \`json:"name"\`
}

type UserService struct {
    users []User
}

func (s *UserService) AddUser(user User) {
    s.users = append(s.users, user)
}

func main() {
    service := &UserService{}
    user := User{ID: 1, Name: "Alice"}
    service.AddUser(user)

    fmt.Printf("Users: %+v\\n", service.users)
}
      `.trim();

      const result = await parseCode(sourceCode, "go", "main.go");

      expect(result.tree).toBeDefined();
      expect(result.tree.rootNode).toBeDefined();
      expect(result.context.language).toBe("go");
      expect(result.metadata.language).toBe("go");
      expect(result.metadata.nodeCount).toBeGreaterThan(0);

      console.log("🐹 Go 파싱 결과:");
      console.log(`   - 노드 수: ${result.metadata.nodeCount}`);
      console.log(`   - 파싱 시간: ${result.metadata.parseTime.toFixed(2)}ms`);
      console.log(`   - AST 루트: ${result.tree.rootNode.type}`);
    });
  });

  describe("Cross-Language Compatibility", () => {
    it("should handle multiple languages consistently", async () => {
      const testCases = [
        {
          language: "typescript" as const,
          code: 'import React from "react"; export default React;',
          file: "test.ts"
        },
        {
          language: "java" as const,
          code: 'import java.util.List; public class Test {}',
          file: "Test.java"
        },
        {
          language: "python" as const,
          code: 'import os\nclass Test: pass',
          file: "test.py"
        },
        {
          language: "go" as const,
          code: 'package main\nimport "fmt"\nfunc main() {}',
          file: "main.go"
        }
      ];

      console.log("🌍 다중 언어 호환성 테스트:");

      for (const { language, code, file } of testCases) {
        const result = await parseCode(code, language, file);

        expect(result.tree).toBeDefined();
        expect(result.tree.rootNode).toBeDefined();
        expect(result.context.language).toBe(language);
        expect(result.metadata.nodeCount).toBeGreaterThan(0);

        console.log(`   ✅ ${language}: ${result.metadata.nodeCount} 노드, ${result.metadata.parseTime.toFixed(1)}ms`);
      }
    });
  });
});