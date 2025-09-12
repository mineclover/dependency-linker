/**
 * Dependency Extraction Integration Test
 * Tests dependency analysis and classification functionality
 */

import * as fs from "fs";
import * as path from "path";
import { DependencyAnalyzer } from "../../src/services/DependencyAnalyzer";
import { TypeScriptParser } from "../../src/services/TypeScriptParser";
import { DependencyInfo } from "../../src/models/DependencyInfo";

describe("Dependency Extraction Integration", () => {
	let dependencyAnalyzer: DependencyAnalyzer;
	let parser: TypeScriptParser;
	const testFilesDir = path.join(__dirname, "../fixtures");

	beforeAll(async () => {
		dependencyAnalyzer = new DependencyAnalyzer();
		parser = new TypeScriptParser();

		// Create test fixtures directory
		await fs.promises.mkdir(testFilesDir, { recursive: true });
	});

	afterAll(async () => {
		// Clean up test fixtures
		await fs.promises.rm(testFilesDir, { recursive: true, force: true });
	});

	describe("Dependency type classification", () => {
		test("should correctly classify external dependencies", async () => {
			const testFile = path.join(testFilesDir, "external-deps.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Node.js built-in modules
import * as fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

// Third-party packages
import React from 'react';
import { Component } from 'react';
import lodash from 'lodash';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import styled from 'styled-components';

// Scoped packages
import { Button } from '@mui/material';
import { format } from '@date-fns/format';
import { Logger } from '@company/logger';

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// Filter external dependencies
			const externalDeps = dependencies.filter((d) => d.type === "external");

			expect(externalDeps).toHaveLength(12);

			// Node.js built-in modules
			expect(externalDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "fs",
						type: "external",
					}),
					expect.objectContaining({
						source: "fs/promises",
						type: "external",
					}),
					expect.objectContaining({
						source: "path",
						type: "external",
					}),
				]),
			);

			// Third-party packages
			expect(externalDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "react",
						type: "external",
					}),
					expect.objectContaining({
						source: "lodash",
						type: "external",
					}),
					expect.objectContaining({
						source: "uuid",
						type: "external",
					}),
					expect.objectContaining({
						source: "axios",
						type: "external",
					}),
					expect.objectContaining({
						source: "styled-components",
						type: "external",
					}),
				]),
			);

			// Scoped packages
			expect(externalDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "@mui/material",
						type: "external",
					}),
					expect.objectContaining({
						source: "@date-fns/format",
						type: "external",
					}),
					expect.objectContaining({
						source: "@company/logger",
						type: "external",
					}),
				]),
			);
		});

		test("should correctly classify relative dependencies", async () => {
			const testFile = path.join(testFilesDir, "relative-deps.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Same directory
import { utils } from './utils';
import config from './config.json';
import './styles.css';

// Parent directory
import { api } from '../api/client';
import { Types } from '../types';

// Nested directories
import { Button } from '../../components/Button';
import { helpers } from '../../../shared/helpers';

// Deep relative paths
import data from './data/users.json';
import { schema } from './schemas/user.schema';

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// All dependencies should be classified as relative
			expect(dependencies).toHaveLength(9);
			expect(dependencies.every((d) => d.type === "relative")).toBe(true);

			// Verify specific patterns
			expect(dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "./utils",
						type: "relative",
					}),
					expect.objectContaining({
						source: "../api/client",
						type: "relative",
					}),
					expect.objectContaining({
						source: "../../components/Button",
						type: "relative",
					}),
					expect.objectContaining({
						source: "./data/users.json",
						type: "relative",
					}),
				]),
			);
		});

		test("should correctly classify internal/absolute dependencies", async () => {
			const testFile = path.join(testFilesDir, "internal-deps.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Internal absolute imports (assuming project structure)
import { api } from 'src/api';
import { components } from 'src/components';
import { utils } from 'lib/utils';
import { config } from 'config/app';

// Potential internal modules
import { database } from 'db/connection';
import { routes } from 'routes/api';

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// These should be classified as internal (project-specific modules)
			expect(dependencies).toHaveLength(6);

			const internalDeps = dependencies.filter((d) => d.type === "internal");
			expect(internalDeps.length).toBeGreaterThan(0);

			expect(dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						source: "src/api",
						type: "internal",
					}),
					expect.objectContaining({
						source: "src/components",
						type: "internal",
					}),
				]),
			);
		});
	});

	describe("Complex dependency patterns", () => {
		test("should handle dynamic imports and requires", async () => {
			const testFile = path.join(testFilesDir, "dynamic-deps.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Dynamic ES6 imports
const loadModule = async () => {
  const { default: React } = await import('react');
  const utils = await import('./utils');
  const config = await import('../config.json');
  return { React, utils, config };
};

// CommonJS requires
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');

// Conditional requires
if (process.env.NODE_ENV === 'development') {
  const devTools = require('react-devtools');
}

// Dynamic requires
const getModule = (name: string) => {
  return require(name);
};

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// Should detect both static and dynamic imports
			expect(dependencies.length).toBeGreaterThan(6);

			// Check for dynamic imports
			const dynamicImports = dependencies.filter(
				(d) => d.source === "react" || d.source === "./utils",
			);
			expect(dynamicImports.length).toBeGreaterThan(0);

			// Check for CommonJS requires
			const requireImports = dependencies.filter((d) =>
				["fs", "path", "lodash", "react-devtools"].includes(d.source),
			);
			expect(requireImports.length).toBeGreaterThan(0);
		});

		test("should extract dependencies from JSX/TSX components", async () => {
			const testFile = path.join(testFilesDir, "jsx-deps.tsx");
			await fs.promises.writeFile(
				testFile,
				`
import React, { useState, useEffect } from 'react';
import { Button, TextField, Box } from '@mui/material';
import { styled, ThemeProvider } from '@mui/material/styles';
import { formatDate } from 'date-fns';

// Custom components
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import Modal from './Modal';

// Hooks and utilities
import { useApi } from '../hooks/useApi';
import { validateForm } from '../utils/validation';

// Types
import type { User, Theme } from '../types';

// Styles
import '../styles/app.css';
import styles from './Component.module.css';

const StyledContainer = styled(Box)\`
  padding: 16px;
  margin: 8px;
\`;

interface Props {
  user: User;
  theme: Theme;
}

export const UserForm: React.FC<Props> = ({ user, theme }) => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const api = useApi();

  useEffect(() => {
    // Component did mount logic
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <StyledContainer>
        <Header title="User Form" />
        <TextField 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <Button onClick={() => validateForm(formData)}>
          Submit
        </Button>
        <Footer />
      </StyledContainer>
    </ThemeProvider>
  );
};

export default UserForm;
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// Verify external dependencies (React ecosystem)
			const externalDeps = dependencies.filter((d) => d.type === "external");
			expect(externalDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ source: "react" }),
					expect.objectContaining({ source: "@mui/material" }),
					expect.objectContaining({ source: "@mui/material/styles" }),
					expect.objectContaining({ source: "date-fns" }),
				]),
			);

			// Verify relative dependencies (project files)
			const relativeDeps = dependencies.filter((d) => d.type === "relative");
			expect(relativeDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ source: "../components/Header" }),
					expect.objectContaining({ source: "../components/Footer" }),
					expect.objectContaining({ source: "./Modal" }),
					expect.objectContaining({ source: "../hooks/useApi" }),
					expect.objectContaining({ source: "../utils/validation" }),
					expect.objectContaining({ source: "../types" }),
					expect.objectContaining({ source: "../styles/app.css" }),
					expect.objectContaining({ source: "./Component.module.css" }),
				]),
			);
		});

		test("should handle re-exports and barrel exports", async () => {
			const testFile = path.join(testFilesDir, "barrel-exports.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Re-export everything
export * from './components/Button';
export * from './components/Input';
export * from '../utils';

// Re-export with rename
export { default as MyButton } from './components/Button';
export { UserCard as Card } from './components/UserCard';

// Re-export from external packages
export { Component } from 'react';
export { styled } from '@mui/material/styles';

// Conditional re-exports
export * from './dev-tools';
export * from './prod-tools';

// Mixed exports and imports
import { helper1, helper2 } from './helpers';
export { helper1, helper2 };

// Default re-export
import DefaultComponent from './DefaultComponent';
export default DefaultComponent;
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// Should detect dependencies from both imports and re-export statements
			const relativeDeps = dependencies.filter((d) => d.type === "relative");
			const externalDeps = dependencies.filter((d) => d.type === "external");

			expect(relativeDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ source: "./components/Button" }),
					expect.objectContaining({ source: "./components/Input" }),
					expect.objectContaining({ source: "../utils" }),
					expect.objectContaining({ source: "./helpers" }),
				]),
			);

			expect(externalDeps).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ source: "react" }),
					expect.objectContaining({ source: "@mui/material/styles" }),
				]),
			);
		});
	});

	describe("Edge cases and error handling", () => {
		test("should handle files with no dependencies", async () => {
			const testFile = path.join(testFilesDir, "no-deps.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Pure utility functions with no external dependencies
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;

export interface MathOperations {
  add: typeof add;
  multiply: typeof multiply;
}

export default { add, multiply };
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);
			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			expect(dependencies).toHaveLength(0);
			expect(parseResult.exports).toHaveLength(4); // add, multiply, MathOperations, default
		});

		test("should handle circular dependency detection", async () => {
			const testFile1 = path.join(testFilesDir, "circular1.ts");
			const testFile2 = path.join(testFilesDir, "circular2.ts");

			await fs.promises.writeFile(
				testFile1,
				`
import { functionB } from './circular2';

export const functionA = () => {
  return functionB() + 1;
};
`,
			);

			await fs.promises.writeFile(
				testFile2,
				`
import { functionA } from './circular1';

export const functionB = () => {
  return functionA() + 2;
};
`,
			);

			const content1 = await fs.promises.readFile(testFile1, "utf-8");
			const result1 = await parser.parseFile(testFile1, content1);
			const deps1 = await dependencyAnalyzer.classifyDependencies(
				result1.dependencies,
				testFile1,
			);

			const content2 = await fs.promises.readFile(testFile2, "utf-8");
			const result2 = await parser.parseFile(testFile2, content2);
			const deps2 = await dependencyAnalyzer.classifyDependencies(
				result2.dependencies,
				testFile2,
			);

			// Both files should have one relative dependency each
			expect(deps1).toHaveLength(1);
			expect(deps1[0]).toMatchObject({
				source: "./circular2",
				type: "relative",
			});

			expect(deps2).toHaveLength(1);
			expect(deps2[0]).toMatchObject({
				source: "./circular1",
				type: "relative",
			});

			// The analyzer should detect this as a potential circular dependency
			// (This would require more sophisticated analysis in the actual implementation)
		});

		test("should handle malformed import statements gracefully", async () => {
			const testFile = path.join(testFilesDir, "malformed-imports.ts");
			await fs.promises.writeFile(
				testFile,
				`
// Valid imports
import React from 'react';
import { useState } from 'react';

// Malformed imports that might cause parsing issues
// import from 'missing-source';
// import { } from 'empty-specifiers';

// But also some that should work
import './side-effect';
import defaultOnly from 'default-only';

export {};
`,
			);

			const content = await fs.promises.readFile(testFile, "utf-8");
			const parseResult = await parser.parseFile(testFile, content);

			// Should not crash, should extract valid dependencies
			expect(parseResult).toBeDefined();

			const dependencies = await dependencyAnalyzer.classifyDependencies(
				parseResult.dependencies,
				testFile,
			);

			// Should have extracted the valid imports
			expect(dependencies.length).toBeGreaterThanOrEqual(3);
			expect(dependencies).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ source: "react" }),
					expect.objectContaining({ source: "./side-effect" }),
					expect.objectContaining({ source: "default-only" }),
				]),
			);
		});
	});
});
