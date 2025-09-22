/**
 * Unit tests for MarkdownParser
 */

import { MarkdownParser, LinkType } from '../../../src/parsers/MarkdownParser';
import type { MarkdownAST } from '../../../src/parsers/MarkdownParser';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';

describe('MarkdownParser', () => {
	let parser: MarkdownParser;
	let tempDir: string;
	let tempFile: string;

	beforeEach(() => {
		parser = new MarkdownParser();
		tempDir = join(__dirname, 'temp-markdown');
		tempFile = join(tempDir, 'test.md');

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

	describe('supports', () => {
		it('should support markdown extensions', () => {
			expect(parser.supports('markdown')).toBe(true);
			expect(parser.supports('md')).toBe(true);
			expect(parser.supports('MARKDOWN')).toBe(true);
		});

		it('should not support non-markdown extensions', () => {
			expect(parser.supports('javascript')).toBe(false);
			expect(parser.supports('typescript')).toBe(false);
			expect(parser.supports('html')).toBe(false);
		});
	});

	describe('detectLanguage', () => {
		it('should detect markdown from file extensions', () => {
			expect(parser.detectLanguage('file.md')).toBe('markdown');
			expect(parser.detectLanguage('file.markdown')).toBe('markdown');
			expect(parser.detectLanguage('file.mdown')).toBe('markdown');
			expect(parser.detectLanguage('file.mkd')).toBe('markdown');
		});

		it('should detect markdown from content patterns', () => {
			const markdownContent = `
# Header
This is a [link](http://example.com)
- List item
![image](image.png)
\`\`\`javascript
code block
\`\`\`
> blockquote
			`.trim();

			expect(parser.detectLanguage('unknown.txt', markdownContent)).toBe('markdown');
		});

		it('should return unknown for non-markdown content', () => {
			const plainText = 'This is just plain text without markdown syntax.';
			expect(parser.detectLanguage('file.txt', plainText)).toBe('unknown');
		});
	});

	describe('parse', () => {
		it('should parse simple markdown content', async () => {
			const content = `# Header\nThis is a paragraph with a [link](http://example.com).`;
			writeFileSync(tempFile, content);

			const result = await parser.parse(tempFile);

			expect(result.language).toBe('markdown');
			expect(result.errors).toHaveLength(0);
			expect(result.ast.type).toBe('document');
			expect(result.ast.children).toHaveLength(2); // header + paragraph
		});

		it('should parse content with inline links', async () => {
			const content = `
# Documentation
Here is a [link to external site](https://example.com).
And here is a [relative link](./docs/api.md).
			`.trim();

			writeFileSync(tempFile, content);
			const result = await parser.parse(tempFile);

			expect(result.metadata.links).toHaveLength(2);

			const externalLink = result.metadata.links.find(l => l.url === 'https://example.com');
			expect(externalLink).toBeDefined();
			expect(externalLink?.type).toBe(LinkType.INLINE);
			expect(externalLink?.isExternal).toBe(true);
			expect(externalLink?.isInternal).toBe(false);

			const relativeLink = result.metadata.links.find(l => l.url === './docs/api.md');
			expect(relativeLink).toBeDefined();
			expect(relativeLink?.type).toBe(LinkType.INLINE);
			expect(relativeLink?.isRelative).toBe(true);
			expect(relativeLink?.isInternal).toBe(true);
		});

		it('should parse content with images', async () => {
			const content = `
# Images
![Local image](./images/logo.png)
![External image](https://example.com/image.jpg "Title")
			`.trim();

			writeFileSync(tempFile, content);
			const result = await parser.parse(tempFile);

			expect(result.metadata.links).toHaveLength(2);

			const localImage = result.metadata.links.find(l => l.url === './images/logo.png');
			expect(localImage).toBeDefined();
			expect(localImage?.type).toBe(LinkType.IMAGE);
			expect(localImage?.alt).toBe('Local image');

			const externalImage = result.metadata.links.find(l => l.url === 'https://example.com/image.jpg');
			expect(externalImage).toBeDefined();
			expect(externalImage?.type).toBe(LinkType.IMAGE);
			expect(externalImage?.title).toBe('Title');
		});

		it('should parse reference links', async () => {
			const content = `
# Reference Links
This is a [reference link][ref1].
And this is an [image reference][img1].

[ref1]: https://example.com "Example"
[img1]: ./image.png
			`.trim();

			writeFileSync(tempFile, content);
			const result = await parser.parse(tempFile);

			// Should find the reference link usage
			const referenceLinks = result.ast.children.flatMap(child =>
				child.children?.filter(node => node.type === 'link_reference') || []
			);
			expect(referenceLinks).toHaveLength(2);
		});

		it('should extract headings', async () => {
			const content = `
# Main Header
## Sub Header
### Sub Sub Header
			`.trim();

			writeFileSync(tempFile, content);
			const result = await parser.parse(tempFile);

			expect(result.metadata.headings).toHaveLength(3);
			expect(result.metadata.headings[0].text).toBe('Main Header');
			expect(result.metadata.headings[1].text).toBe('Sub Header');
			expect(result.metadata.headings[2].text).toBe('Sub Sub Header');
		});

		it('should extract code blocks when enabled', async () => {
			const content = `
# Code Examples
\`\`\`typescript
function hello() {
  console.log('Hello');
}
\`\`\`

\`\`\`
Plain code block
\`\`\`
			`.trim();

			writeFileSync(tempFile, content);
			const result = await parser.parse(tempFile);

			expect(result.metadata.codeBlocks).toHaveLength(2);
			expect(result.metadata.codeBlocks[0].language).toBe('typescript');
			expect(result.metadata.codeBlocks[1].language).toBe('');
		});

		it('should handle parse errors gracefully', async () => {
			// Create invalid file path
			const invalidPath = '/nonexistent/path/file.md';

			const result = await parser.parse(invalidPath);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('PARSE_ERROR');
			expect(result.ast.type).toBe('document');
			expect(result.ast.children).toHaveLength(0);
		});

		it('should include source map when enabled', async () => {
			const parser = new MarkdownParser({ enableSourceMap: true });
			const content = `# Header\nParagraph`;
			writeFileSync(tempFile, content);

			const result = await parser.parse(tempFile);

			expect(result.ast.sourceMap).toBeDefined();
			expect(Object.keys(result.ast.sourceMap!)).toHaveLength(2); // Two lines
		});

		it('should not include source map when disabled', async () => {
			const parser = new MarkdownParser({ enableSourceMap: false });
			const content = `# Header\nParagraph`;
			writeFileSync(tempFile, content);

			const result = await parser.parse(tempFile);

			expect(result.ast.sourceMap).toBeUndefined();
		});
	});

	describe('validateSyntax', () => {
		it('should validate correct markdown syntax', () => {
			const content = `# Header\n[Link](http://example.com)\n![Image](image.png)`;
			const result = parser.validateSyntax(content);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect malformed links', () => {
			const content = `# Header\n[Malformed link](incomplete`;
			const result = parser.validateSyntax(content);

			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].type).toBe('MALFORMED_LINK');
		});

		it('should warn about potentially unclosed code blocks', () => {
			const content = `# Header\n\`\`\`javascript\ncode here`;
			const result = parser.validateSyntax(content);

			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe('UNCLOSED_CODE_BLOCK');
		});
	});

	describe('getMetadata', () => {
		it('should return correct parser metadata', () => {
			const metadata = parser.getMetadata();

			expect(metadata.name).toBe('MarkdownParser');
			expect(metadata.version).toBe('1.0.0');
			expect(metadata.supportedLanguages).toContain('markdown');
			expect(metadata.supportedLanguages).toContain('md');
			expect(metadata.supportedExtensions).toContain('.md');
			expect(metadata.features).toContain('link_extraction');
			expect(metadata.features).toContain('syntax_validation');
		});
	});

	describe('configuration', () => {
		it('should configure parser options', () => {
			const options = {
				enableSourceMap: false,
				validateLinks: true,
				extractCodeBlocks: false
			};

			parser.configure(options);
			const config = parser.getConfiguration();

			expect(config.enableSourceMap).toBe(false);
			expect(config.validateLinks).toBe(true);
			expect(config.extractCodeBlocks).toBe(false);
		});

		it('should merge options with defaults', () => {
			parser.configure({ validateLinks: true });
			const config = parser.getConfiguration();

			expect(config.validateLinks).toBe(true);
			expect(config.enableSourceMap).toBe(true); // Default value preserved
		});
	});

	describe('dispose', () => {
		it('should dispose without errors', () => {
			expect(() => parser.dispose()).not.toThrow();
		});
	});

	describe('getGrammar', () => {
		it('should return null for markdown grammar', () => {
			expect(parser.getGrammar()).toBeNull();
		});
	});
});