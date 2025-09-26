/**
 * Unit tests for MarkdownLinkExtractor
 */

import { MarkdownLinkExtractor } from "../../../src/extractors/MarkdownLinkExtractor";
import type {
	MarkdownAST,
	MarkdownNode,
} from "../../../src/parsers/MarkdownParser";
import { LinkType } from "../../../src/parsers/MarkdownParser";

describe("MarkdownLinkExtractor", () => {
	let extractor: MarkdownLinkExtractor;

	beforeEach(() => {
		extractor = new MarkdownLinkExtractor();
	});

	const createMockAST = (children: MarkdownNode[]): MarkdownAST => ({
		type: "document",
		children,
	});

	const createMockNode = (
		type: string,
		overrides: Partial<MarkdownNode> = {},
	): MarkdownNode => ({
		type,
		position: {
			start: { line: 1, column: 1, offset: 0 },
			end: { line: 1, column: 10, offset: 9 },
		},
		...overrides,
	});

	describe("extract", () => {
		it("should extract inline links", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "https://example.com",
					value: "Example Link",
					title: "Example Title",
				}),
			]);

			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://example.com");
			expect(dependencies[0].type).toBe(LinkType.INLINE);
			expect(dependencies[0].isExternal).toBe(true);
			expect(dependencies[0].isInternal).toBe(false);
			expect(dependencies[0].title).toBe("Example Title");
		});

		it("should extract relative links", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "./docs/readme.md",
					value: "Documentation",
				}),
			]);

			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("./docs/readme.md");
			expect(dependencies[0].isRelative).toBe(true);
			expect(dependencies[0].isInternal).toBe(true);
			expect(dependencies[0].extension).toBe(".md");
		});

		it("should extract image links", async () => {
			const ast = createMockAST([
				createMockNode("image", {
					url: "./images/logo.png",
					alt: "Company Logo",
					title: "Our Logo",
				}),
			]);

			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("./images/logo.png");
			expect(dependencies[0].type).toBe(LinkType.IMAGE);
			expect(dependencies[0].alt).toBe("Company Logo");
			expect(dependencies[0].title).toBe("Our Logo");
			expect(dependencies[0].extension).toBe(".png");
		});

		it("should extract reference links when enabled", async () => {
			const ast = createMockAST([
				createMockNode("link_reference", {
					identifier: "ref1",
					value: "Reference Link",
				}),
				createMockNode("definition", {
					identifier: "ref1",
					url: "https://example.com",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				followReferenceLinks: true,
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://example.com");
			expect(dependencies[0].type).toBe(LinkType.REFERENCE);
		});

		it("should skip reference links when disabled", async () => {
			const ast = createMockAST([
				createMockNode("link_reference", {
					identifier: "ref1",
					value: "Reference Link",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				followReferenceLinks: false,
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(0);
		});

		it("should filter external links when disabled", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "https://example.com",
					value: "External",
				}),
				createMockNode("link", {
					url: "./internal.md",
					value: "Internal",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				includeExternalLinks: false,
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("./internal.md");
		});

		it("should filter internal links when disabled", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "https://example.com",
					value: "External",
				}),
				createMockNode("link", {
					url: "./internal.md",
					value: "Internal",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				includeInternalLinks: false,
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://example.com");
		});

		it("should exclude images when disabled", async () => {
			const ast = createMockAST([
				createMockNode("image", {
					url: "./image.png",
					alt: "Image",
				}),
				createMockNode("link", {
					url: "./link.md",
					value: "Link",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({ includeImages: false });
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("./link.md");
		});

		it("should apply exclude patterns", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "https://github.com/user/repo",
					value: "GitHub",
				}),
				createMockNode("link", {
					url: "https://example.com",
					value: "Example",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				excludePatterns: [/github\.com/],
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://example.com");
		});

		it("should apply include patterns", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "https://github.com/user/repo",
					value: "GitHub",
				}),
				createMockNode("link", {
					url: "https://example.com",
					value: "Example",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				includePatterns: [/github\.com/],
			});
			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://github.com/user/repo");
		});

		it("should resolve relative paths when enabled", async () => {
			const ast = createMockAST([
				createMockNode("link", {
					url: "../docs/api.md",
					value: "API Docs",
				}),
			]);

			const extractor = new MarkdownLinkExtractor({
				resolveRelativePaths: true,
				baseDir: "/project/src",
			});
			const dependencies = await extractor.extract(ast, "/project/src/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].resolvedPath).toBe("/project/docs/api.md");
		});

		it("should traverse nested nodes", async () => {
			const ast = createMockAST([
				createMockNode("paragraph", {
					children: [
						createMockNode("link", {
							url: "https://example.com",
							value: "Nested Link",
						}),
					],
				}),
			]);

			const dependencies = await extractor.extract(ast, "/path/to/file.md");

			expect(dependencies).toHaveLength(1);
			expect(dependencies[0].source).toBe("https://example.com");
		});
	});

	describe("URL classification", () => {
		it("should correctly identify external URLs", async () => {
			const testCases = [
				"https://example.com",
				"http://example.com",
				"mailto:user@example.com",
				"ftp://files.example.com",
				"tel:+1234567890",
			];

			for (const url of testCases) {
				const ast = createMockAST([
					createMockNode("link", { url, value: "Test" }),
				]);

				const dependencies = await extractor.extract(ast, "/path/to/file.md");
				expect(dependencies[0].isExternal).toBe(true);
				expect(dependencies[0].isInternal).toBe(false);
			}
		});

		it("should correctly identify relative URLs", async () => {
			const testCases = [
				"./relative.md",
				"../parent.md",
				"subfolder/file.md",
				"file.txt",
			];

			for (const url of testCases) {
				const ast = createMockAST([
					createMockNode("link", { url, value: "Test" }),
				]);

				const dependencies = await extractor.extract(ast, "/path/to/file.md");
				expect(dependencies[0].isRelative).toBe(true);
				expect(dependencies[0].isInternal).toBe(true);
			}
		});

		it("should correctly identify absolute internal URLs", async () => {
			const testCases = [
				"/absolute/path.md",
				"//protocol-relative.com/file.html",
			];

			for (const url of testCases) {
				const ast = createMockAST([
					createMockNode("link", { url, value: "Test" }),
				]);

				const dependencies = await extractor.extract(ast, "/path/to/file.md");
				expect(dependencies[0].isRelative).toBe(false);
			}
		});
	});

	describe("getMetadata", () => {
		it("should return correct extractor metadata", () => {
			const metadata = extractor.getMetadata();

			expect(metadata.name).toBe("MarkdownLinkExtractor");
			expect(metadata.version).toBe("1.0.0");
			expect(metadata.supportedLanguages).toContain("markdown");
			expect(metadata.outputTypes).toContain("MarkdownLinkDependency[]");
			expect(metadata.description).toContain("link dependencies");
		});
	});

	describe("configuration", () => {
		it("should configure extractor options", () => {
			const customOptions = {
				includeImages: false,
				includeExternalLinks: false,
				resolveRelativePaths: false,
			};

			const extractorConfig = {
				enabled: true,
				defaultOptions: {
					custom: customOptions,
				},
			};

			extractor.configure(extractorConfig);
			const config = extractor.getConfiguration();

			expect(config.defaultOptions?.custom?.includeImages).toBe(false);
			expect(config.defaultOptions?.custom?.includeExternalLinks).toBe(false);
			expect(config.defaultOptions?.custom?.resolveRelativePaths).toBe(false);
		});

		it("should merge options with defaults", () => {
			const extractorConfig = {
				enabled: true,
				defaultOptions: {
					custom: { includeImages: false },
				},
			};

			extractor.configure(extractorConfig);
			const config = extractor.getConfiguration();

			expect(config.defaultOptions?.custom?.includeImages).toBe(false);
			// Note: Only explicitly set options are available in custom config
		});
	});
});
