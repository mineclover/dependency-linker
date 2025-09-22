# Markdown Analysis Examples

Examples demonstrating the new Markdown parsing and link dependency analysis capabilities.

## 🚀 Quick Start

### Simple Markdown Analysis

```typescript
import { MarkdownParser, MarkdownLinkExtractor, LinkDependencyInterpreter } from '@context-action/dependency-linker';

// Initialize components
const parser = new MarkdownParser();
const extractor = new MarkdownLinkExtractor();
const interpreter = new LinkDependencyInterpreter();

// Analyze a markdown file
const parseResult = await parser.parse('./docs/README.md');
const dependencies = await extractor.extract(parseResult.ast, './docs/README.md');
const analysis = await interpreter.interpret(dependencies);

console.log('Total links:', analysis.summary.totalLinks);
console.log('Broken links:', analysis.summary.brokenLinks);
console.log('Issues found:', analysis.issues.length);
```

### Using the Analysis Engine

```typescript
import { AnalysisEngine, MarkdownParser, MarkdownLinkExtractor, LinkDependencyInterpreter } from '@context-action/dependency-linker';

// Create analysis engine
const engine = new AnalysisEngine();

// Register Markdown components
engine.registerParser('markdown', new MarkdownParser());
engine.registerExtractor('markdown-links', new MarkdownLinkExtractor());
engine.registerInterpreter('link-analysis', new LinkDependencyInterpreter());

// Analyze markdown file
const result = await engine.analyze('./docs/README.md', 'markdown', {
  extractors: ['markdown-links'],
  interpreters: ['link-analysis']
});
```

## 📊 Comprehensive Link Analysis

### Extract Different Link Types

```typescript
const markdownContent = `
# Documentation

## External Resources
- [GitHub](https://github.com/user/repo)
- [Documentation](https://docs.example.com)

## Internal Files
- [Getting Started](./getting-started.md)
- [API Reference](../api/README.md)

## Images
![Logo](./assets/logo.png)
![Banner](https://cdn.example.com/banner.jpg)

## Reference Links
See our [main docs][docs] and [API guide][api].

[docs]: ./docs/README.md
[api]: ./api/index.md
`;

const parser = new MarkdownParser();
const extractor = new MarkdownLinkExtractor();
const interpreter = new LinkDependencyInterpreter();

// Parse and extract
const parseResult = await parser.parse('example.md', markdownContent);
const dependencies = await extractor.extract(parseResult.ast, 'example.md');

// Analyze dependencies
const analysis = await interpreter.interpret(dependencies);

// Review results
console.log('Analysis Summary:');
console.log('- Total links:', analysis.summary.totalLinks);
console.log('- External links:', analysis.summary.externalLinks);
console.log('- Internal links:', analysis.summary.internalLinks);
console.log('- Image links:', analysis.summary.imageLinks);
console.log('- Reference links:', analysis.summary.referenceLinks);
console.log('- Unique domains:', analysis.summary.uniqueDomains);
```

### Filter and Configure Analysis

```typescript
// Configure extractor for specific link types
const extractor = new MarkdownLinkExtractor({
  includeImages: true,
  includeExternalLinks: true,
  includeInternalLinks: true,
  resolveRelativePaths: true,
  excludePatterns: [/github\.com/, /stackoverflow\.com/],
  includePatterns: [/docs\./]
});

// Configure interpreter for security and performance checks
const interpreter = new LinkDependencyInterpreter({
  validateFiles: true,
  securityChecks: true,
  performanceChecks: true,
  accessibilityChecks: true,
  blockedDomains: ['malicious-site.com'],
  maxFileSizeWarning: 5 * 1024 * 1024 // 5MB
});
```

## 🔍 Link Validation and Issues

### File Existence Validation

```typescript
const interpreter = new LinkDependencyInterpreter({
  validateFiles: true,
  baseDir: './project-root'
});

const analysis = await interpreter.interpret(dependencies);

// Check for broken links
const brokenLinks = analysis.dependencies.filter(dep =>
  dep.status === 'broken'
);

console.log('Broken links found:');
brokenLinks.forEach(link => {
  console.log(`- ${link.source} (line ${link.line})`);
});

// Review issues
analysis.issues.forEach(issue => {
  console.log(`${issue.severity}: ${issue.message}`);
  if (issue.suggestion) {
    console.log(`  Suggestion: ${issue.suggestion}`);
  }
});
```

### Security Analysis

```typescript
const secureInterpreter = new LinkDependencyInterpreter({
  securityChecks: true,
  blockedDomains: [
    'suspicious-domain.com',
    'malware-site.evil'
  ],
  allowedDomains: [
    'github.com',
    'docs.microsoft.com',
    'developer.mozilla.org'
  ]
});

const analysis = await secureInterpreter.interpret(dependencies);

// Check security warnings
const securityIssues = analysis.issues.filter(issue =>
  issue.type === 'security_risk'
);

console.log(`Security warnings: ${analysis.metadata.securityWarnings}`);
securityIssues.forEach(issue => {
  console.log(`⚠️ ${issue.message}`);
});
```

### Accessibility Checks

```typescript
const accessibleInterpreter = new LinkDependencyInterpreter({
  accessibilityChecks: true
});

const analysis = await accessibleInterpreter.interpret(dependencies);

// Find images without alt text
const accessibilityIssues = analysis.issues.filter(issue =>
  issue.type === 'accessibility_issue'
);

console.log('Accessibility issues:');
accessibilityIssues.forEach(issue => {
  console.log(`♿ ${issue.message} (line ${issue.dependency.line})`);
});
```

## 📈 Performance and Metrics

### Large Document Analysis

```typescript
// Configure for performance with large documents
const performantExtractor = new MarkdownLinkExtractor({
  resolveRelativePaths: false, // Skip path resolution for speed
  followReferenceLinks: false  // Skip reference resolution for speed
});

const lightweightInterpreter = new LinkDependencyInterpreter({
  validateFiles: false,        // Skip file system checks
  checkExternalLinks: false,   // Skip external link validation
  securityChecks: false,       // Skip security analysis
  performanceChecks: false     // Skip performance analysis
});

// Measure performance
const startTime = Date.now();
const analysis = await lightweightInterpreter.interpret(dependencies);
const analysisTime = Date.now() - startTime;

console.log(`Analysis completed in ${analysisTime}ms`);
console.log(`Link density: ${analysis.summary.linkDensity.toFixed(3)}`);
```

### Batch Analysis

```typescript
import { glob } from 'glob';

// Find all markdown files
const markdownFiles = await glob('**/*.md', { ignore: 'node_modules/**' });

const results = [];
for (const file of markdownFiles) {
  try {
    const parseResult = await parser.parse(file);
    const dependencies = await extractor.extract(parseResult.ast, file);
    const analysis = await interpreter.interpret(dependencies);

    results.push({
      file,
      totalLinks: analysis.summary.totalLinks,
      brokenLinks: analysis.summary.brokenLinks,
      issues: analysis.issues.length
    });
  } catch (error) {
    console.error(`Failed to analyze ${file}:`, error.message);
  }
}

// Summary report
const totalFiles = results.length;
const totalLinks = results.reduce((sum, r) => sum + r.totalLinks, 0);
const totalBroken = results.reduce((sum, r) => sum + r.brokenLinks, 0);

console.log(`\nBatch Analysis Summary:`);
console.log(`- Files analyzed: ${totalFiles}`);
console.log(`- Total links: ${totalLinks}`);
console.log(`- Broken links: ${totalBroken}`);
console.log(`- Health score: ${((totalLinks - totalBroken) / totalLinks * 100).toFixed(1)}%`);
```

## 🛠️ Custom Configuration

### Advanced Extractor Configuration

```typescript
const customExtractor = new MarkdownLinkExtractor({
  // Base directory for resolving relative paths
  baseDir: process.cwd(),

  // Include/exclude specific link types
  includeImages: true,
  includeExternalLinks: true,
  includeInternalLinks: true,

  // Path resolution
  resolveRelativePaths: true,

  // Reference link handling
  followReferenceLinks: true,

  // Pattern-based filtering
  excludePatterns: [
    /localhost/,           // Exclude localhost links
    /127\.0\.0\.1/,        // Exclude local IP
    /\.git/                // Exclude git URLs
  ],
  includePatterns: [
    /docs?\./,             // Include documentation sites
    /\.md$/                // Include markdown files
  ]
});
```

### Advanced Interpreter Configuration

```typescript
const customInterpreter = new LinkDependencyInterpreter({
  // File validation
  validateFiles: true,
  checkExternalLinks: false,

  // Security settings
  securityChecks: true,
  allowedDomains: ['github.com', 'npmjs.com'],
  blockedDomains: ['spam-site.com'],

  // Performance settings
  performanceChecks: true,
  maxFileSizeWarning: 10 * 1024 * 1024, // 10MB

  // Accessibility settings
  accessibilityChecks: true,

  // Base directory for file resolution
  baseDir: './docs'
});
```

## 💡 Best Practices

1. **File Validation**: Enable file validation for internal links to catch broken references
2. **Security Checks**: Use domain allowlists and blocklists for external link security
3. **Performance**: Disable unnecessary checks for large-scale analysis
4. **Accessibility**: Always check for missing alt text on images
5. **Patterns**: Use regex patterns to filter relevant links for your use case

## 🔗 Integration Examples

### With CI/CD Pipeline

```typescript
// ci-link-check.ts
import { MarkdownParser, MarkdownLinkExtractor, LinkDependencyInterpreter } from '@context-action/dependency-linker';

async function checkDocumentationLinks() {
  const parser = new MarkdownParser();
  const extractor = new MarkdownLinkExtractor({ includeExternalLinks: false });
  const interpreter = new LinkDependencyInterpreter({ validateFiles: true });

  const files = await glob('docs/**/*.md');
  let hasErrors = false;

  for (const file of files) {
    const parseResult = await parser.parse(file);
    const dependencies = await extractor.extract(parseResult.ast, file);
    const analysis = await interpreter.interpret(dependencies);

    if (analysis.summary.brokenLinks > 0) {
      console.error(`❌ ${file}: ${analysis.summary.brokenLinks} broken links`);
      hasErrors = true;
    } else {
      console.log(`✅ ${file}: All links valid`);
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

checkDocumentationLinks().catch(console.error);
```

### With Documentation Generation

```typescript
// Generate link health report
async function generateLinkReport() {
  // ... analysis code ...

  const report = {
    generated: new Date().toISOString(),
    summary: analysis.summary,
    recommendations: analysis.recommendations,
    issues: analysis.issues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      file: issue.dependency.source,
      line: issue.dependency.line
    }))
  };

  await fs.writeFile('link-health-report.json', JSON.stringify(report, null, 2));
}
```

## 📚 Further Reading

- [API Documentation](../api/README.md) - Complete API reference
- [Core Analysis Framework](./basic-usage.md) - Main framework usage
- [Performance Guide](../PERFORMANCE.md) - Optimization tips
- [Test Examples](../../tests/integration/markdown-analysis.test.ts) - Comprehensive test scenarios