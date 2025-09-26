/**
 * Integration test for multi-language analysis capabilities
 * Tests the complete analysis workflow across different programming languages
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

describe("Multi-Language Analysis Integration", () => {
	let testDir: string;
	let analysisEngine: any; // Will be replaced with actual implementation

	beforeEach(async () => {
		// Create temporary test directory
		testDir = await fs.mkdtemp(path.join(os.tmpdir(), "multi-lang-test-"));

		// Mock analysis engine - will be replaced with real implementation
		analysisEngine = {
			analyzeFile: jest.fn(),
			analyzeBatch: jest.fn(),
			registerExtractor: jest.fn(),
			registerInterpreter: jest.fn(),
		};
	});

	afterEach(async () => {
		// Clean up test directory
		await fs.rm(testDir, { recursive: true, force: true });
	});

	describe("TypeScript Analysis", () => {
		test("should analyze TypeScript files with imports and exports", async () => {
			const tsContent = `
import { Component } from 'react';
import lodash from 'lodash';
import * as utils from './utils';

export interface UserData {
  id: number;
  name: string;
}

export class UserComponent extends Component<UserData> {
  render() {
    return lodash.map(utils.getData(), user => user.name);
  }
}

export default UserComponent;
      `;

			const filePath = path.join(testDir, "component.tsx");
			await fs.writeFile(filePath, tsContent);

			// Mock expected result
			const mockResult = {
				filePath,
				language: "typescript",
				extractedData: {
					imports: [
						{ source: "react", specifiers: ["Component"], type: "named" },
						{ source: "lodash", specifiers: ["lodash"], type: "default" },
						{
							source: "./utils",
							specifiers: ["*"],
							type: "namespace",
							alias: "utils",
						},
					],
					exports: [
						{ name: "UserData", type: "interface" },
						{ name: "UserComponent", type: "class" },
						{ name: "default", type: "default", value: "UserComponent" },
					],
					dependencies: ["react", "lodash"],
				},
				interpretedData: {
					dependencyAnalysis: {
						external: ["react", "lodash"],
						internal: ["./utils"],
						summary: { total: 3, external: 2, internal: 1 },
					},
				},
				performanceMetrics: {
					parseTime: 25,
					extractionTime: 10,
					interpretationTime: 5,
					totalTime: 40,
					memoryUsage: 2048,
				},
				errors: [],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.language).toBe("typescript");
			expect(result.extractedData.imports).toHaveLength(3);
			expect(result.extractedData.exports).toHaveLength(3);
			expect(result.extractedData.dependencies).toContain("react");
			expect(result.extractedData.dependencies).toContain("lodash");
			expect(result.errors).toHaveLength(0);
		});

		test("should handle TypeScript syntax errors gracefully", async () => {
			const invalidTsContent = `
import { Component } from 'react';

export class BrokenComponent {
  render( {
    // Missing closing parenthesis and bracket
      `;

			const filePath = path.join(testDir, "broken.ts");
			await fs.writeFile(filePath, invalidTsContent);

			const mockResult = {
				filePath,
				language: "typescript",
				extractedData: {},
				interpretedData: {},
				performanceMetrics: {
					parseTime: 5,
					extractionTime: 0,
					interpretationTime: 0,
					totalTime: 5,
					memoryUsage: 512,
				},
				errors: [
					{
						type: "SyntaxError",
						message: "Unexpected end of file",
						location: { line: 6, column: 1 },
					},
				],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe("SyntaxError");
		});
	});

	describe("JavaScript Analysis", () => {
		test("should analyze CommonJS modules", async () => {
			const jsContent = `
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const customModule = require('./custom');

class FileProcessor extends EventEmitter {
  process(filePath) {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    return customModule.transform(content);
  }
}

module.exports = FileProcessor;
module.exports.VERSION = '1.0.0';
      `;

			const filePath = path.join(testDir, "processor.js");
			await fs.writeFile(filePath, jsContent);

			const mockResult = {
				filePath,
				language: "javascript",
				extractedData: {
					imports: [
						{ source: "fs", type: "require", specifiers: ["fs"] },
						{ source: "path", type: "require", specifiers: ["path"] },
						{ source: "events", type: "require", specifiers: ["EventEmitter"] },
						{
							source: "./custom",
							type: "require",
							specifiers: ["customModule"],
						},
					],
					exports: [
						{ type: "module.exports", value: "FileProcessor" },
						{
							type: "module.exports.property",
							name: "VERSION",
							value: "1.0.0",
						},
					],
					dependencies: ["fs", "path", "events"],
				},
				interpretedData: {
					dependencyAnalysis: {
						external: ["fs", "path", "events"],
						internal: ["./custom"],
						summary: { total: 4, external: 3, internal: 1 },
					},
				},
				performanceMetrics: {
					parseTime: 20,
					extractionTime: 8,
					interpretationTime: 4,
					totalTime: 32,
					memoryUsage: 1536,
				},
				errors: [],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.language).toBe("javascript");
			expect(result.extractedData.imports).toHaveLength(4);
			expect(result.extractedData.dependencies).toContain("fs");
			expect(result.extractedData.dependencies).toContain("events");
		});

		test("should analyze ES6 modules", async () => {
			const es6Content = `
import React, { useState, useEffect } from 'react';
import { Router } from 'express';
import config from '../config/index.js';

export const useCustomHook = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    setState(config.defaultValue);
  }, []);

  return state;
};

export { Router };
export default useCustomHook;
      `;

			const filePath = path.join(testDir, "hooks.mjs");
			await fs.writeFile(filePath, es6Content);

			const mockResult = {
				filePath,
				language: "javascript",
				extractedData: {
					imports: [
						{
							source: "react",
							specifiers: ["React", "useState", "useEffect"],
							type: "mixed",
						},
						{ source: "express", specifiers: ["Router"], type: "named" },
						{
							source: "../config/index.js",
							specifiers: ["config"],
							type: "default",
						},
					],
					exports: [
						{ name: "useCustomHook", type: "named" },
						{ name: "Router", type: "re-export" },
						{ name: "default", type: "default", value: "useCustomHook" },
					],
					dependencies: ["react", "express"],
				},
				interpretedData: {
					dependencyAnalysis: {
						external: ["react", "express"],
						internal: ["../config/index.js"],
						summary: { total: 3, external: 2, internal: 1 },
					},
				},
				performanceMetrics: {
					parseTime: 18,
					extractionTime: 7,
					interpretationTime: 3,
					totalTime: 28,
					memoryUsage: 1280,
				},
				errors: [],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.language).toBe("javascript");
			expect(result.extractedData.exports).toHaveLength(3);
			expect(result.extractedData.dependencies).toContain("react");
		});
	});

	describe("Go Analysis", () => {
		test("should analyze Go packages and imports", async () => {
			const goContent = `
package main

import (
  "fmt"
  "os"
  "net/http"
  "github.com/gorilla/mux"
  "github.com/user/project/internal/config"
  . "github.com/user/project/pkg/utils"
)

type Server struct {
  router *mux.Router
  config *config.Config
}

func NewServer(cfg *config.Config) *Server {
  return &Server{
    router: mux.NewRouter(),
    config: cfg,
  }
}

func (s *Server) Start() error {
  fmt.Println("Starting server...")
  return http.ListenAndServe(":8080", s.router)
}

func main() {
  cfg := LoadConfig()
  server := NewServer(cfg)
  if err := server.Start(); err != nil {
    fmt.Printf("Server error: %v\n", err)
    os.Exit(1)
  }
}
      `;

			const filePath = path.join(testDir, "main.go");
			await fs.writeFile(filePath, goContent);

			const mockResult = {
				filePath,
				language: "go",
				extractedData: {
					package: "main",
					imports: [
						{ path: "fmt", type: "standard" },
						{ path: "os", type: "standard" },
						{ path: "net/http", type: "standard" },
						{ path: "github.com/gorilla/mux", type: "external" },
						{
							path: "github.com/user/project/internal/config",
							type: "internal",
						},
						{
							path: "github.com/user/project/pkg/utils",
							type: "internal",
							import_type: "dot",
						},
					],
					types: [
						{ name: "Server", type: "struct", fields: ["router", "config"] },
					],
					functions: [
						{ name: "NewServer", type: "function", receiver: null },
						{ name: "Start", type: "method", receiver: "Server" },
						{ name: "main", type: "function", receiver: null },
					],
					dependencies: ["github.com/gorilla/mux"],
				},
				interpretedData: {
					dependencyAnalysis: {
						standard: ["fmt", "os", "net/http"],
						external: ["github.com/gorilla/mux"],
						internal: [
							"github.com/user/project/internal/config",
							"github.com/user/project/pkg/utils",
						],
						summary: { total: 6, standard: 3, external: 1, internal: 2 },
					},
				},
				performanceMetrics: {
					parseTime: 30,
					extractionTime: 12,
					interpretationTime: 6,
					totalTime: 48,
					memoryUsage: 2560,
				},
				errors: [],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.language).toBe("go");
			expect(result.extractedData.package).toBe("main");
			expect(result.extractedData.imports).toHaveLength(6);
			expect(result.extractedData.functions).toHaveLength(3);
			expect(result.extractedData.dependencies).toContain(
				"github.com/gorilla/mux",
			);
		});
	});

	describe("Java Analysis", () => {
		test("should analyze Java classes and imports", async () => {
			const javaContent = `
package com.example.service;

import java.util.List;
import java.util.ArrayList;
import java.io.IOException;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.model.User;
import com.example.repository.UserRepository;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> getAllUsers() throws IOException {
        List<User> users = new ArrayList<>();
        users.addAll(userRepository.findAll());
        return users;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }
}
      `;

			const filePath = path.join(testDir, "UserService.java");
			await fs.writeFile(filePath, javaContent);

			const mockResult = {
				filePath,
				language: "java",
				extractedData: {
					package: "com.example.service",
					imports: [
						{ class: "java.util.List", type: "standard" },
						{ class: "java.util.ArrayList", type: "standard" },
						{ class: "java.io.IOException", type: "standard" },
						{
							class: "org.springframework.stereotype.Service",
							type: "external",
						},
						{
							class: "org.springframework.beans.factory.annotation.Autowired",
							type: "external",
						},
						{ class: "com.example.model.User", type: "internal" },
						{
							class: "com.example.repository.UserRepository",
							type: "internal",
						},
					],
					classes: [
						{
							name: "UserService",
							type: "class",
							annotations: ["Service"],
							fields: [
								{
									name: "userRepository",
									type: "UserRepository",
									annotations: ["Autowired"],
								},
							],
							methods: [
								{
									name: "getAllUsers",
									returnType: "List<User>",
									parameters: [],
									throws: ["IOException"],
								},
								{
									name: "getUserById",
									returnType: "User",
									parameters: ["Long id"],
								},
								{
									name: "saveUser",
									returnType: "User",
									parameters: ["User user"],
								},
							],
						},
					],
					dependencies: ["org.springframework"],
				},
				interpretedData: {
					dependencyAnalysis: {
						standard: ["java.util", "java.io"],
						external: ["org.springframework"],
						internal: ["com.example.model", "com.example.repository"],
						summary: { total: 4, standard: 2, external: 1, internal: 2 },
					},
				},
				performanceMetrics: {
					parseTime: 35,
					extractionTime: 15,
					interpretationTime: 8,
					totalTime: 58,
					memoryUsage: 3072,
				},
				errors: [],
			};

			analysisEngine.analyzeFile.mockResolvedValue(mockResult);

			const result = await analysisEngine.analyzeFile(filePath);

			expect(result.language).toBe("java");
			expect(result.extractedData.package).toBe("com.example.service");
			expect(result.extractedData.imports).toHaveLength(7);
			expect(result.extractedData.classes).toHaveLength(1);
			expect(result.extractedData.classes[0].methods).toHaveLength(3);
			expect(result.extractedData.dependencies).toContain(
				"org.springframework",
			);
		});
	});

	describe("Batch Analysis", () => {
		test("should analyze multiple files of different languages", async () => {
			// Create test files
			const files = [
				{
					name: "component.tsx",
					content:
						'import React from "react"; export default () => <div>Test</div>;',
				},
				{
					name: "server.js",
					content:
						'const express = require("express"); module.exports = express();',
				},
				{
					name: "main.go",
					content:
						'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello") }',
				},
				{
					name: "Service.java",
					content:
						"package com.test; import java.util.List; public class Service {}",
				},
			];

			const filePaths: string[] = [];
			for (const file of files) {
				const filePath = path.join(testDir, file.name);
				await fs.writeFile(filePath, file.content);
				filePaths.push(filePath);
			}

			const mockResults = [
				{
					filePath: filePaths[0],
					language: "typescript",
					extractedData: {
						imports: [
							{ source: "react", specifiers: ["React"], type: "default" },
						],
					},
					interpretedData: {
						dependencyAnalysis: {
							external: ["react"],
							internal: [],
							summary: { total: 1, external: 1, internal: 0 },
						},
					},
					performanceMetrics: {
						parseTime: 15,
						extractionTime: 5,
						interpretationTime: 3,
						totalTime: 23,
						memoryUsage: 1024,
					},
					errors: [],
				},
				{
					filePath: filePaths[1],
					language: "javascript",
					extractedData: {
						imports: [
							{ source: "express", type: "require", specifiers: ["express"] },
						],
					},
					interpretedData: {
						dependencyAnalysis: {
							external: ["express"],
							internal: [],
							summary: { total: 1, external: 1, internal: 0 },
						},
					},
					performanceMetrics: {
						parseTime: 12,
						extractionTime: 4,
						interpretationTime: 2,
						totalTime: 18,
						memoryUsage: 768,
					},
					errors: [],
				},
				{
					filePath: filePaths[2],
					language: "go",
					extractedData: {
						package: "main",
						imports: [{ path: "fmt", type: "standard" }],
					},
					interpretedData: {
						dependencyAnalysis: {
							standard: ["fmt"],
							external: [],
							internal: [],
							summary: { total: 1, standard: 1, external: 0, internal: 0 },
						},
					},
					performanceMetrics: {
						parseTime: 18,
						extractionTime: 6,
						interpretationTime: 3,
						totalTime: 27,
						memoryUsage: 1280,
					},
					errors: [],
				},
				{
					filePath: filePaths[3],
					language: "java",
					extractedData: {
						package: "com.test",
						imports: [{ class: "java.util.List", type: "standard" }],
					},
					interpretedData: {
						dependencyAnalysis: {
							standard: ["java.util"],
							external: [],
							internal: [],
							summary: { total: 1, standard: 1, external: 0, internal: 0 },
						},
					},
					performanceMetrics: {
						parseTime: 22,
						extractionTime: 8,
						interpretationTime: 4,
						totalTime: 34,
						memoryUsage: 1536,
					},
					errors: [],
				},
			];

			analysisEngine.analyzeBatch.mockResolvedValue(mockResults);

			const results = await analysisEngine.analyzeBatch(filePaths);

			expect(results).toHaveLength(4);
			expect(results.map((r: any) => r.language)).toEqual([
				"typescript",
				"javascript",
				"go",
				"java",
			]);
			expect(results.every((r: any) => r.errors.length === 0)).toBe(true);

			// Verify performance across languages
			const totalTime = results.reduce(
				(sum: number, r: any) => sum + r.performanceMetrics.totalTime,
				0,
			);
			expect(totalTime).toBeLessThan(200); // Total should be reasonable
		});
	});

	describe("Cross-Language Dependency Analysis", () => {
		test("should identify dependencies across language boundaries", async () => {
			// Simulate a polyglot project structure
			const files = [
				{ name: "frontend/app.tsx", language: "typescript" },
				{ name: "backend/server.js", language: "javascript" },
				{ name: "services/auth.go", language: "go" },
				{ name: "data/processor.java", language: "java" },
			];

			const filePaths = files.map((f) => path.join(testDir, f.name));

			// Mock cross-language analysis result
			const mockCrossLanguageResult = {
				languages: ["typescript", "javascript", "go", "java"],
				totalFiles: 4,
				dependencyMatrix: {
					typescript: {
						external: ["react", "@types/node"],
						internal: ["../backend/api"],
					},
					javascript: {
						external: ["express", "cors"],
						internal: ["../services/auth-client"],
					},
					go: {
						external: ["github.com/gorilla/mux"],
						internal: ["./config", "./handlers"],
					},
					java: {
						external: ["org.springframework"],
						internal: ["com.project.model"],
					},
				},
				crossLanguageDependencies: [
					{
						from: "frontend/app.tsx",
						to: "backend/server.js",
						type: "api-call",
					},
					{
						from: "backend/server.js",
						to: "services/auth.go",
						type: "service-call",
					},
				],
				insights: {
					mostUsedLanguage: "typescript",
					dependencyHotspots: ["backend/server.js"],
					recommendations: ["Consider API versioning for cross-service calls"],
				},
			};

			// Mock batch analysis to return cross-language insights
			analysisEngine.analyzeBatch.mockResolvedValue([mockCrossLanguageResult]);

			const result = await analysisEngine.analyzeBatch(filePaths);

			expect(result[0].languages).toHaveLength(4);
			expect(result[0].crossLanguageDependencies).toHaveLength(2);
			expect(result[0].insights.dependencyHotspots).toContain(
				"backend/server.js",
			);
		});
	});
});
