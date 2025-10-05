# Documentation Conventions

**Purpose**: Standards for project documentation structure, format, and maintenance

---

## Document Organization

### Category Structure

Documentation is organized into five main categories:

1. **🚀 Getting Started** - Installation, setup, basic usage
2. **🏗️ Architecture & System Design** - Module structure, system architecture
3. **🧠 Graph Database & Inference** - Database system and inference capabilities
4. **🔍 Analysis & Features** - Dependency analysis and feature guides
5. **⚡ Performance & Optimization** - Performance tuning and optimization

### Directory Structure

```
docs/
├── CONVENTIONS.md                          # This file
├── README.md                              # Documentation index
│
├── Setup-Guide.md                         # 🚀 Getting Started
├── API.md                                 # 🚀 API Reference
│
├── module-organization.md                 # 🏗️ Architecture
├── PARSER_SYSTEM.md                       # 🏗️ Parser system
├── PACKAGE_EXPORTS.md                     # 🏗️ Package structure
│
├── inference-system.md                    # 🧠 Primary reference
├── graph-maintenance-conventions.md       # 🧠 Primary reference
├── inference-system-status-report.md      # 🧠 Status tracking
├── analyzer-ownership-pattern.md          # 🧠 Supporting doc
├── edge-type-management.md                # 🧠 Supporting doc
├── identifier-strategy.md                 # 🧠 Supporting doc
│
├── DEPENDENCY_GRAPH_ANALYSIS.md           # 🔍 Features
├── CustomKeyMapper-Guide.md               # 🔍 Features
│
└── PERFORMANCE.md                         # ⚡ Optimization
```

---

## Document Priority System

### Priority Levels

| Priority | Symbol | Usage | Update Frequency |
|----------|--------|-------|------------------|
| Primary | 🔴 | Must-read for all users | Every feature release |
| Reference | 🟡 | Important reference material | Every minor update |
| Supporting | 🟢 | Detailed supporting information | As needed |

### Assignment Guidelines

**🔴 Primary Documents**:
- Essential for all users of the feature
- Complete, self-contained guide
- Examples: `inference-system.md`, `graph-maintenance-conventions.md`

**🟡 Reference Documents**:
- Important contextual information
- Status reports and architectural overviews
- Examples: `inference-system-status-report.md`, `module-organization.md`

**🟢 Supporting Documents**:
- Deep-dive into specific topics
- Advanced usage patterns
- Examples: `edge-type-management.md`, `analyzer-ownership-pattern.md`

---

## Document Structure

### Standard Template

```markdown
# Document Title

**Brief description of document purpose and scope**

## Table of Contents (for documents >300 lines)
- [Section 1](#section-1)
- [Section 2](#section-2)

## Overview

High-level introduction to the topic.

## Section 1: Main Content

Detailed content with subsections.

### Subsection 1.1

Content with examples.

## Section 2: Advanced Topics

Advanced or optional content.

## Examples

### Example 1: [Use Case Name]
\`\`\`typescript
// Code example with comments
\`\`\`

## Related Documentation

- [Related Doc 1](path/to/doc)
- [Related Doc 2](path/to/doc)

---

**Last Updated**: YYYY-MM-DD
**Version**: X.Y
**Maintainer**: [Team/Person Name]
```

### Required Sections

Every document must include:

1. **Title**: Clear, descriptive title
2. **Purpose**: Brief description in bold at the top
3. **Content**: Well-organized main content
4. **Examples**: Practical code examples where applicable
5. **Metadata**: Last updated date, version, maintainer

### Optional Sections

- **Table of Contents**: Required for documents >300 lines
- **Quick Start**: For getting started guides
- **API Reference**: For technical documentation
- **Troubleshooting**: For complex features
- **Related Documentation**: Links to related docs

---

## Naming Conventions

### File Naming Patterns

| Pattern | Usage | Examples |
|---------|-------|----------|
| `{Topic}-Guide.md` | User guides | `Setup-Guide.md`, `CustomKeyMapper-Guide.md` |
| `{SYSTEM_NAME}.md` | System documentation | `PARSER_SYSTEM.md`, `PERFORMANCE.md` |
| `{feature-name}.md` | Feature documentation | `inference-system.md`, `module-organization.md` |
| `{topic}-status-report.md` | Status reports | `inference-system-status-report.md` |

### Title Conventions

- **Guides**: Use "Guide" suffix (e.g., "Setup Guide")
- **Systems**: Use uppercase for established systems (e.g., "PARSER SYSTEM")
- **Features**: Use descriptive titles (e.g., "Inference System")
- **Patterns**: Use "Pattern" suffix (e.g., "Analyzer Ownership Pattern")

---

## Content Guidelines

### Writing Style

#### DO ✅
- Use clear, concise language
- Write in present tense
- Use active voice
- Include code examples
- Provide context before details
- Use consistent terminology
- Link to related documentation

#### DON'T ❌
- Don't assume prior knowledge
- Don't use jargon without explanation
- Don't create orphaned documents (always link from index)
- Don't duplicate content across documents
- Don't forget to update related docs

### Code Examples

```typescript
// ✅ Good: Complete, runnable example with context
import { InferenceEngine } from './database/inference';

// Initialize inference engine
const engine = new InferenceEngine(db, {
  enableCache: true,
  cacheSyncStrategy: 'lazy'
});

// Query hierarchical relationships
const imports = await engine.queryHierarchical('imports', {
  includeChildren: true,
  maxDepth: 3
});

console.log(`Found ${imports.relationships.length} import relationships`);
```

```typescript
// ❌ Bad: Incomplete, no context
const engine = new InferenceEngine(db);
const result = await engine.query();
```

### Formatting Standards

#### Headings
- Use ATX-style headings (`#`, `##`, `###`)
- Maximum 4 heading levels
- Capitalize first letter of each word (title case)

#### Lists
```markdown
- Use `-` for unordered lists
- Consistent indentation (2 spaces)
- Parallel structure

1. Use `1.` for ordered lists
2. Consistent numbering
3. Parallel structure
```

#### Code Blocks
```markdown
\`\`\`typescript
// Always specify language
// Include comments for clarity
const example = "formatted code";
\`\`\`
```

#### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
```

#### Emphasis
- **Bold** for important terms or emphasis
- *Italic* for introducing new concepts
- `Code` for inline code, file names, commands
- > Blockquotes for notes or important information

---

## Cross-Referencing

### Internal Links

```markdown
<!-- Relative path from current document -->
[Module Organization](module-organization.md)

<!-- Absolute path from project root -->
[Database README](../src/database/README.md)

<!-- Section anchors -->
[Performance Guidelines](#performance-guidelines)
```

### External Links

```markdown
<!-- External documentation -->
[SQLite Documentation](https://www.sqlite.org/docs.html)

<!-- GitHub issues/PRs -->
[Issue #123](https://github.com/user/repo/issues/123)
```

### Link Validation

- Check links before committing
- Update links when moving or renaming documents
- Use relative paths for internal links
- Verify external links are stable

---

## Documentation Index

### README.md Structure

The main documentation index (`docs/README.md`) must include:

1. **Overview**: Brief project description
2. **Category Index**: Organized by topic
3. **Quick Start Paths**: For different user types
4. **Document Descriptions**: Purpose and audience for each document
5. **Learning Paths**: Curated reading sequences
6. **Search Tips**: Common questions mapped to documents
7. **Standards**: Documentation standards reference
8. **Maintenance**: Update schedule and procedures

### Index Update Triggers

Update `docs/README.md` when:
- Adding new documentation
- Removing documentation
- Changing document purpose or priority
- Reorganizing categories
- Major content updates

---

## Update Process

### Regular Updates

#### After Feature Addition
1. Update primary feature documentation
2. Add examples to relevant guides
3. Update API reference if applicable
4. Update documentation index
5. Commit with descriptive message

#### After Bug Fix
1. Update troubleshooting section if applicable
2. Add note to relevant documentation
3. Update examples if affected

#### Quarterly Review
1. Check all documents for accuracy
2. Validate links
3. Update stale examples
4. Review priority classifications
5. Update version numbers

### Commit Messages

```bash
# Good commit messages
docs: Add inference system comprehensive guide
docs: Update module organization with inference module
docs: Fix broken links in API reference
docs: Refresh performance benchmarks

# Bad commit messages
update docs
fix
changes
```

---

## Status Tracking

### Status Legend

| Symbol | Meaning | Action Required |
|--------|---------|-----------------|
| ✅ | Complete and up-to-date | None |
| 🔄 | In progress | Complete documentation |
| 📝 | Needs update | Update content |
| ❌ | Deprecated | Remove or archive |
| 🆕 | New document | Review and integrate |

### Document Metadata

Include at bottom of each document:

```markdown
---
**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Database Module Team
**Status**: ✅ Complete
---
```

---

## Versioning

### Version Numbering

- **Major (1.0)**: Complete rewrite or major restructure
- **Minor (1.1)**: Significant content additions
- **Patch (1.1.1)**: Small updates, fixes, clarifications

### Version History

Include version history for major documents:

```markdown
## Version History

- **1.2** (2025-09-30): Added inference system documentation
- **1.1** (2025-09-20): Updated module organization
- **1.0** (2025-09-10): Initial release
```

---

## Special Document Types

### API Documentation

```markdown
# API Reference

## Function Name

**Description**: Brief description of what it does

**Signature**:
\`\`\`typescript
function functionName(param1: Type1, param2: Type2): ReturnType
\`\`\`

**Parameters**:
- `param1` (Type1): Description of param1
- `param2` (Type2): Description of param2

**Returns**: Description of return value

**Example**:
\`\`\`typescript
const result = functionName('value1', 'value2');
\`\`\`

**Throws**:
- `ErrorType`: When this error occurs

**See Also**: [Related Function](#related-function)
```

### Status Reports

```markdown
# System Status Report

## Implementation Status

### ✅ Completed Features
- Feature 1: Description
- Feature 2: Description

### 🔄 In Progress
- Feature 3: Description (80% complete)

### 📝 Pending
- Feature 4: Description (planned)

## Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Parse time | <200ms | 150ms | ✅ |
| Memory | <100MB | 85MB | ✅ |

## Recommendations

1. Recommendation 1
2. Recommendation 2

---
**Report Date**: 2025-09-30
**Next Review**: 2025-10-30
```

### Troubleshooting Guides

```markdown
# Troubleshooting

## Common Issues

### Issue: Problem Description

**Symptoms**:
- Symptom 1
- Symptom 2

**Cause**: Why this happens

**Solution**:
1. Step 1
2. Step 2

**Prevention**: How to avoid in future
```

---

## Quality Checklist

Before committing documentation:

- [ ] Spell-checked
- [ ] Grammar-checked
- [ ] Code examples tested
- [ ] Links validated
- [ ] Formatting consistent
- [ ] Metadata updated
- [ ] Index updated (if new document)
- [ ] Related docs updated
- [ ] Screenshots current (if applicable)
- [ ] Cross-references checked

---

## Tools and Automation

### Recommended Tools

- **Spell check**: `cSpell` VS Code extension
- **Link check**: `markdown-link-check`
- **Formatting**: Prettier with markdown parser
- **Preview**: VS Code markdown preview

### Automated Checks

```json
// .markdownlint.json
{
  "MD013": { "line_length": 120 },
  "MD033": false,  // Allow inline HTML
  "MD041": false   // Allow content before heading
}
```

---

## Related Documentation

- [Documentation Index](README.md) - Main documentation hub
- [Module Organization](module-organization.md) - Codebase structure
- [Project README](../README.md) - Project overview
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Documentation Team