/**
 * TypeScript Parsing Integration Test
 * Tests tree-sitter TypeScript parsing functionality
 */

import * as fs from "fs";
import * as path from "path";
import { TypeScriptParser } from "../../src/services/TypeScriptParser";
import { AnalysisResult } from "../../src/models/AnalysisResult";

describe("TypeScript Parsing Integration", () => {
	let parser: TypeScriptParser;
	const testFilesDir = path.join(__dirname, "../fixtures");

	beforeAll(async () => {
		parser = new TypeScriptParser();

		// Create test fixtures directory
		await fs.promises.mkdir(testFilesDir, { recursive: true });
	});

	afterAll(async () => {
		// Clean up only temporary test files, not the permanent fixtures
		const tempFiles = [
			"types.ts",
			"imports.ts",
			"exports.ts",
			"react.tsx",
			"syntax-error.ts",
			"large-file.ts",
		];
		for (const file of tempFiles) {
			const filePath = path.join(testFilesDir, file);
			try {
				await fs.promises.unlink(filePath);
			} catch (error) {
				// Ignore file not found errors
			}
		}
	});

	describe("TypeScript syntax parsing", () => {
		test("should parse TypeScript interfaces and types", async () => {
			const testFile = path.join(testFilesDir, "types.ts");
			await fs.promises.writeFile(
				testFile,
				`
export interface User {
  id: number;
  name: string;
  email?: string;
}

export type Status = 'active' | 'inactive' | 'pending';

export type UserWithStatus = User & {
  status: Status;
};

export interface GenericResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, content);

			expect(result.success).toBe(true);
			expect(result.exports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "User",
						type: "named",
						isTypeOnly: true,
					}),
					expect.objectContaining({
						name: "Status",
						type: "named",
						isTypeOnly: true,
					}),
					expect.objectContaining({
						name: "UserWithStatus",
						type: "named",
						isTypeOnly: true,
					}),
					expect.objectContaining({
						name: "GenericResponse",
						type: "named",
						isTypeOnly: true,
					}),
				]),
			);
		});

		test("should parse complex import statements", async () => {
			const testFile = path.join(testFilesDir, "imports.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Default imports
import React from 'react';
import lodash from 'lodash';

// Named imports
import { useState, useEffect } from 'react';
import { map, filter, reduce } from 'lodash';

// Namespace imports
import * as fs from 'fs';
import * as Utils from '../utils';

// Mixed imports
import Button, { ButtonProps, ButtonVariant } from './Button';

// Type-only imports
import type { ComponentProps } from 'react';
import type { Config } from './config';

// Side-effect imports
import './styles.css';
import '../polyfills';

// Dynamic imports (in async context)
async function loadModule() {
  const module = await import('./dynamic-module');
  return module.default;
}

// Aliased imports
import { LongComponentName as Component } from './components';
import { default as CustomDefault } from './custom';

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, content);

			expect(result.success).toBe(true);

			// Test default imports
			const reactImport = result.imports.find(
				(i) => i.source === "react" && !i.isTypeOnly,
			);
			expect(reactImport?.specifiers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						imported: "default",
						local: "React",
						type: "default",
					}),
				]),
			);

			// Test named imports
			const namedReactImport = result.imports.find(
				(i) =>
					i.source === "react" &&
					i.specifiers.some((s) => s.imported === "useState"),
			);
			expect(namedReactImport?.specifiers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						imported: "useState",
						local: "useState",
						type: "named",
					}),
					expect.objectContaining({
						imported: "useEffect",
						local: "useEffect",
						type: "named",
					}),
				]),
			);

			// Test namespace imports
			const fsImport = result.imports.find((i) => i.source === "fs");
			expect(fsImport?.specifiers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						imported: "*",
						local: "fs",
						type: "namespace",
					}),
				]),
			);

			// Test type-only imports
			const typeOnlyImport = result.imports.find(
				(i) => i.source === "react" && i.isTypeOnly,
			);
			expect(typeOnlyImport).toBeDefined();
			expect(typeOnlyImport?.isTypeOnly).toBe(true);

			// Test side-effect imports
			const sideEffectImport = result.imports.find(
				(i) => i.source === "./styles.css",
			);
			expect(sideEffectImport?.specifiers).toHaveLength(0);

			// Test aliased imports
			const aliasedImport = result.imports.find((i) =>
				i.specifiers.some(
					(s) => s.imported === "LongComponentName" && s.local === "Component",
				),
			);
			expect(aliasedImport).toBeDefined();
		});

		test("should parse export statements correctly", async () => {
			const testFile = path.join(testFilesDir, "exports.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Named exports
export const API_URL = 'https://api.example.com';
export let config = { debug: false };
export var legacy = 'old';

// Function exports
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export const arrowFunction = (x: number) => x * 2;

// Class exports
export class UserService {
  getUser() { return null; }
}

// Interface and type exports
export interface Config {
  apiUrl: string;
}

export type Theme = 'light' | 'dark';

// Re-exports
export { default as Button } from './Button';
export { UserCard, UserList } from './User';
export * from './utilities';
export * as utils from './utils';

// Default export
const defaultValue = { name: 'test' };
export default defaultValue;

// Export assignment
export = { legacyExport: true };
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, content);

			expect(result.success).toBe(true);

			// Test named exports
			expect(result.exports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "API_URL",
						type: "named",
						isTypeOnly: false,
					}),
					expect.objectContaining({
						name: "calculateSum",
						type: "named",
						isTypeOnly: false,
					}),
					expect.objectContaining({
						name: "UserService",
						type: "named",
						isTypeOnly: false,
					}),
					expect.objectContaining({
						name: "Config",
						type: "named",
						isTypeOnly: true,
					}),
					expect.objectContaining({
						name: "Theme",
						type: "named",
						isTypeOnly: true,
					}),
				]),
			);

			// Test default export
			expect(result.exports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "default",
						type: "default",
						isTypeOnly: false,
					}),
				]),
			);

			// Test re-exports
			expect(result.exports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "Button",
						type: "re-export",
						source: "./Button",
					}),
					expect.objectContaining({
						name: "UserCard",
						type: "re-export",
						source: "./User",
					}),
				]),
			);
		});

		test("should handle TSX/React syntax", async () => {
			const testFile = path.join(testFilesDir, "component.tsx");
			await fs.promises.writeFile(
				testFile,
				`
import React, { PropsWithChildren } from 'react';
import { styled } from '@mui/material/styles';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const StyledButton = styled('button')<ButtonProps>\`
  padding: \${props => props.size === 'small' ? '4px 8px' : '8px 16px'};
  background-color: \${props => props.variant === 'primary' ? 'blue' : 'gray'};
\`;

export const Button: React.FC<PropsWithChildren<ButtonProps>> = ({
  children,
  variant = 'primary',
  size = 'medium',
  ...props
}) => {
  return (
    <StyledButton variant={variant} size={size} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, content);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(testFile);

			// Verify React imports are detected
			expect(result.imports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "react",
						specifiers: expect.arrayContaining([
							expect.objectContaining({
								imported: "default",
								local: "React",
								type: "default",
							}),
							expect.objectContaining({
								imported: "PropsWithChildren",
								local: "PropsWithChildren",
								type: "named",
							}),
						]),
					}),
					expect.objectContaining({
						source: "@mui/material/styles",
					}),
				]),
			);

			// Verify exports
			expect(result.exports).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: "Button",
						type: "named",
						isTypeOnly: false,
					}),
					expect.objectContaining({
						name: "default",
						type: "default",
						isTypeOnly: false,
					}),
				]),
			);
		});

		test("should handle parsing errors gracefully", async () => {
			const testFile = path.join(testFilesDir, "syntax-error.ts");
			await fs.promises.writeFile(
				testFile,
				`
// File with syntax errors
import { test } from 'module';

const broken = function(
  // Missing closing parenthesis and brace
  
export const valid = 'this should still be parsed';
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, content);

			// Should not crash, but may have success=false or error info
			expect(result).toBeDefined();
			expect(result.filePath).toBe(testFile);

			if (result.error) {
				expect(result.error.code).toBe("PARSE_ERROR");
				expect(result.error.message).toContain("error");
			}

			// Should still extract what it can
			expect(result.imports).toBeDefined();
			expect(result.exports).toBeDefined();
		});
	});

	describe("Performance and memory", () => {
		test("should parse large files within time limit", async () => {
			const testFile = path.join(testFilesDir, "large-file.ts");

			// Generate a large TypeScript file
			let content = 'import { Component } from "react";\n\n';
			for (let i = 0; i < 50; i++) {
				// Reduced due to tree-sitter memory limits
				content += `
export interface User${i} {
  id: number;
  name: string;
  value${i}: string;
}

export const getUser${i} = (id: number): User${i} => {
  return { id, name: 'User${i}', value${i}: 'test' };
};
`;
			}
			content += "\nexport default {};";

			await fs.promises.writeFile(testFile, content);

			const startTime = Date.now();
			const fileContent = await fs.promises.readFile(testFile, "utf-8");
			const result = await parser.parseFile(testFile, fileContent);
			const parseTime = Date.now() - startTime;

			expect(result.success).toBe(true);
			expect(parseTime).toBeLessThan(5000); // 5 second limit
			expect(result.parseTime).toBeLessThan(2000); // 2 second internal parse time
			expect(result.exports.length).toBeGreaterThan(100); // Many exports (50 interfaces + 50 functions + 1 default)
		});
	});
});
