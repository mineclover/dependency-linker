/**
 * Unit tests for LinkDependencyInterpreter
 */

import {
	LinkDependencyInterpreter,
	DependencyCategory,
	LinkStatus,
	IssueType,
	IssueSeverity,
} from "../../../src/interpreters/LinkDependencyInterpreter";
import type { MarkdownLinkDependency } from "../../../src/extractors/MarkdownLinkExtractor";
import type { InterpreterContext } from "../../../src/interpreters/IDataInterpreter";
import { LinkType } from "../../../src/parsers/MarkdownParser";
import { join } from "node:path";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";

describe("LinkDependencyInterpreter", () => {
	let interpreter: LinkDependencyInterpreter;
	let tempDir: string;
	let tempFile: string;

	beforeEach(() => {
		interpreter = new LinkDependencyInterpreter();
		tempDir = join(__dirname, "temp-interpreter");
		tempFile = join(tempDir, "test.md");

		// Create temp directory
		if (!existsSync(tempDir)) {
			mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up temp files
		try {
			if (existsSync(tempFile)) {
				unlinkSync(tempFile);
			}
		} catch {
			// Ignore cleanup errors
		}
	});

	const createMockDependency = (
		overrides: Partial<MarkdownLinkDependency> = {},
	): MarkdownLinkDependency => ({
		source: "https://example.com",
		type: LinkType.INLINE,
		isExternal: true,
		isRelative: false,
		isInternal: false,
		line: 1,
		column: 1,
		...overrides,
	});

	const createMockContext = (): InterpreterContext => ({
		filePath: "/test/file.md",
		language: "markdown",
		metadata: {},
		options: {},
		timestamp: new Date(),
	});

	describe("interpret", () => {
		it("should analyze basic link dependencies", async () => {
			const dependencies = [
				createMockDependency({ source: "https://example.com" }),
				createMockDependency({
					source: "./readme.md",
					isExternal: false,
					isRelative: true,
					isInternal: true,
					extension: ".md",
				}),
			];

			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.summary.totalLinks).toBe(2);
			expect(result.summary.externalLinks).toBe(1);
			expect(result.summary.internalLinks).toBe(1);
			expect(result.dependencies).toHaveLength(2);
		});

		it("should categorize different dependency types correctly", async () => {
			const dependencies = [
				createMockDependency({
					source: "mailto:user@example.com",
					type: LinkType.INLINE,
				}),
				createMockDependency({
					source: "#section",
					type: LinkType.INLINE,
				}),
				createMockDependency({
					source: "./image.png",
					type: LinkType.IMAGE,
					isExternal: false,
					isInternal: true,
					extension: ".png",
				}),
				createMockDependency({
					source: "./docs.md",
					isExternal: false,
					isInternal: true,
					extension: ".md",
				}),
			];

			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.dependencies[0].category).toBe(DependencyCategory.EMAIL);
			expect(result.dependencies[1].category).toBe(DependencyCategory.ANCHOR);
			expect(result.dependencies[2].category).toBe(DependencyCategory.IMAGE);
			expect(result.dependencies[3].category).toBe(
				DependencyCategory.DOCUMENTATION,
			);
		});

		it("should validate file existence for internal links", async () => {
			// Create a test file
			writeFileSync(tempFile, "test content");

			const dependencies = [
				createMockDependency({
					source: "./test.md",
					isExternal: false,
					isInternal: true,
					resolvedPath: tempFile,
				}),
				createMockDependency({
					source: "./missing.md",
					isExternal: false,
					isInternal: true,
					resolvedPath: join(tempDir, "missing.md"),
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				validateFiles: true,
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.dependencies[0].status).toBe(LinkStatus.VALID);
			expect(result.dependencies[0].fileExists).toBe(true);
			expect(result.dependencies[1].status).toBe(LinkStatus.BROKEN);
			expect(result.dependencies[1].fileExists).toBe(false);
		});

		it("should detect broken links and missing files", async () => {
			const dependencies = [
				createMockDependency({
					source: "./missing.md",
					isExternal: false,
					isInternal: true,
					resolvedPath: "/nonexistent/file.md",
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				validateFiles: true,
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.issues).toHaveLength(2); // BROKEN_LINK + MISSING_FILE
			expect(result.issues.some((i) => i.type === IssueType.BROKEN_LINK)).toBe(
				true,
			);
			expect(result.issues.some((i) => i.type === IssueType.MISSING_FILE)).toBe(
				true,
			);
			expect(result.summary.brokenLinks).toBe(1);
		});

		it("should perform security checks", async () => {
			const dependencies = [
				createMockDependency({
					source: "https://suspicious-domain.com/malware",
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				securityChecks: true,
				blockedDomains: ["suspicious-domain.com"],
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.dependencies[0].status).toBe(LinkStatus.SUSPICIOUS);
			expect(
				result.issues.some((i) => i.type === IssueType.SECURITY_RISK),
			).toBe(true);
			expect(result.metadata.securityWarnings).toBe(1);
		});

		it("should check file sizes for performance warnings", async () => {
			// Create a large file
			const largeContent = "x".repeat(2 * 1024 * 1024); // 2MB
			writeFileSync(tempFile, largeContent);

			const dependencies = [
				createMockDependency({
					source: "./test.md",
					isExternal: false,
					isInternal: true,
					resolvedPath: tempFile,
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				performanceChecks: true,
				maxFileSizeWarning: 1024 * 1024, // 1MB
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(
				result.issues.some((i) => i.type === IssueType.PERFORMANCE_ISSUE),
			).toBe(true);
			expect(result.metadata.performanceWarnings).toBe(1);
		});

		it("should check accessibility for images", async () => {
			const dependencies = [
				createMockDependency({
					source: "./image.png",
					type: LinkType.IMAGE,
					alt: "", // Empty alt text
					isExternal: false,
					isInternal: true,
				}),
				createMockDependency({
					source: "./image2.png",
					type: LinkType.IMAGE,
					alt: "Good alt text",
					isExternal: false,
					isInternal: true,
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				accessibilityChecks: true,
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			const accessibilityIssues = result.issues.filter(
				(i) => i.type === IssueType.ACCESSIBILITY_ISSUE,
			);
			expect(accessibilityIssues).toHaveLength(1);
			expect(accessibilityIssues[0].message).toContain("missing alt text");
		});

		it("should generate appropriate recommendations", async () => {
			const dependencies = [
				createMockDependency({
					source: "./missing.md",
					isExternal: false,
					isInternal: true,
					resolvedPath: "/nonexistent/file.md",
				}),
				createMockDependency({
					source: "./image.png",
					type: LinkType.IMAGE,
					alt: "",
					isExternal: false,
					isInternal: true,
				}),
			];

			const interpreter = new LinkDependencyInterpreter({
				validateFiles: true,
				accessibilityChecks: true,
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.recommendations).toContain("Fix 1 broken link");
			expect(
				result.recommendations.some((r) => r.includes("accessibility")),
			).toBe(true);
		});

		it("should count unique domains", async () => {
			const dependencies = [
				createMockDependency({ source: "https://example.com/page1" }),
				createMockDependency({ source: "https://example.com/page2" }),
				createMockDependency({ source: "https://github.com/repo" }),
				createMockDependency({ source: "https://docs.github.com/guide" }),
			];

			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.summary.uniqueDomains).toBe(2); // example.com, github.com (docs.github.com counts as github.com)
		});

		it("should calculate link density", async () => {
			const dependencies = [
				createMockDependency({ line: 1 }),
				createMockDependency({ line: 5 }),
				createMockDependency({ line: 10 }),
			];

			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.summary.linkDensity).toBe(3 / 10); // 3 links over 10 lines
		});

		it("should respect allowed domains filter", async () => {
			const dependencies = [
				createMockDependency({ source: "https://allowed.com" }),
				createMockDependency({ source: "https://not-allowed.com" }),
			];

			const interpreter = new LinkDependencyInterpreter({
				allowedDomains: ["allowed.com"],
			});
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.dependencies[0].status).toBe(LinkStatus.VALID);
			expect(result.dependencies[1].status).toBe(LinkStatus.UNREACHABLE);
		});

		it("should include timing information", async () => {
			const dependencies = [createMockDependency()];
			const result = await interpreter.interpret(dependencies, createMockContext());

			expect(result.metadata.analysisTime).toBeGreaterThan(0);
			expect(typeof result.metadata.analysisTime).toBe("number");
		});
	});

	describe("MIME type detection", () => {
		it("should detect common MIME types", async () => {
			const testCases = [
				{ file: "./doc.md", expected: "text/markdown" },
				{ file: "./image.png", expected: "image/png" },
				{ file: "./image.jpg", expected: "image/jpeg" },
				{ file: "./doc.pdf", expected: "application/pdf" },
				{ file: "./page.html", expected: "text/html" },
				{ file: "./unknown.xyz", expected: "application/octet-stream" },
			];

			for (const testCase of testCases) {
				// Create the file
				const filePath = join(tempDir, testCase.file.replace("./", ""));
				writeFileSync(filePath, "test content");

				const dependencies = [
					createMockDependency({
						source: testCase.file,
						isExternal: false,
						isInternal: true,
						resolvedPath: filePath,
					}),
				];

				const result = await interpreter.interpret(dependencies, createMockContext());
				expect(result.dependencies[0].mimeType).toBe(testCase.expected);

				// Clean up
				unlinkSync(filePath);
			}
		});
	});

	describe("getMetadata", () => {
		it("should return correct interpreter metadata", () => {
			const metadata = interpreter.getMetadata();

			expect(metadata.name).toBe("LinkDependencyInterpreter");
			expect(metadata.version).toBe("1.0.0");
			expect(metadata.supportedDataTypes).toContain("MarkdownLinkDependency[]");
			expect(metadata.outputType).toBe("LinkDependencyAnalysis");
			expect(metadata.description).toContain("broken links");
			expect(metadata.description).toContain("security issues");
		});
	});

	describe("configuration", () => {
		it("should configure interpreter options", () => {
			const options = {
				enabled: true,
				defaultOptions: {
					custom: {
						validateFiles: false,
						checkExternalLinks: true,
						securityChecks: false,
						maxFileSizeWarning: 5 * 1024 * 1024,
					},
				},
			};

			interpreter.configure(options);
			const config = interpreter.getConfiguration();

			expect(config.defaultOptions?.custom.validateFiles).toBe(false);
			expect(config.defaultOptions?.custom.checkExternalLinks).toBe(true);
			expect(config.defaultOptions?.custom.securityChecks).toBe(false);
			expect(config.defaultOptions?.custom.maxFileSizeWarning).toBe(5 * 1024 * 1024);
		});

		it("should merge options with defaults", () => {
			interpreter.configure({
				enabled: true,
				defaultOptions: {
					custom: { validateFiles: false },
				},
			});
			const config = interpreter.getConfiguration();

			expect(config.defaultOptions?.custom.validateFiles).toBe(false);
			expect(config.defaultOptions?.custom.securityChecks).toBe(true); // Default preserved
		});
	});
});
