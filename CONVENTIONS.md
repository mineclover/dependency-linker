# Project Conventions Index

**Central hub for all directory-specific conventions and guidelines**

This document provides a comprehensive overview of conventions followed throughout the project. Each directory has its own specific conventions that should be followed when working in that area.

---

## 📁 Directory Structure and Conventions

### `/src/` - Source Code
**Purpose**: Core application source code
**Convention Document**: [src/CONVENTIONS.md](src/CONVENTIONS.md)

Key conventions:
- Module organization and boundaries
- Import/export patterns
- Type definitions location
- Naming conventions for files and exports

---

### `/src/database/` - Graph Database System
**Purpose**: SQLite-based graph database for code analysis
**Convention Document**: [src/database/CONVENTIONS.md](src/database/CONVENTIONS.md)

Key conventions:
- Schema management and migrations
- Edge type definitions and hierarchy
- Analyzer ownership patterns
- Query optimization guidelines
- Inference system conventions

**Related Documentation**:
- [Database README](src/database/README.md) - Usage guide
- [Inference Module README](src/database/inference/README.md) - Inference system details

---

### `/src/database/inference/` - Inference Module
**Purpose**: Centralized inference capabilities (hierarchical, transitive, inheritable)
**Convention Document**: [src/database/inference/CONVENTIONS.md](src/database/inference/CONVENTIONS.md)

Key conventions:
- Edge type registry management
- Inference engine usage patterns
- Cache strategies (eager/lazy/manual)
- Type safety requirements
- Performance optimization

---

### `/src/parsers/` - Language Parsers
**Purpose**: Tree-sitter based multi-language parsers
**Convention Document**: [src/parsers/CONVENTIONS.md](src/parsers/CONVENTIONS.md)

Key conventions:
- Parser implementation patterns
- AST traversal conventions
- Query file organization
- Language-specific extractors
- Error handling standards

---

### `/src/integration/` - Integration Layer
**Purpose**: High-level integration APIs
**Convention Document**: [src/integration/CONVENTIONS.md](src/integration/CONVENTIONS.md)

Key conventions:
- API design patterns
- Configuration management
- Error handling and reporting
- Progress tracking
- Resource cleanup

---

### `/tests/` - Test Suite
**Purpose**: Comprehensive test coverage
**Convention Document**: [tests/CONVENTIONS.md](tests/CONVENTIONS.md)

Key conventions:
- Test organization structure
- Naming patterns for test files
- Mock and fixture management
- Integration vs unit test separation
- Performance benchmarking

---

### `/docs/` - Documentation
**Purpose**: Project documentation and guides
**Convention Document**: [docs/CONVENTIONS.md](docs/CONVENTIONS.md)

Key conventions:
- Document structure and formatting
- Naming conventions for documents
- Update procedures
- Cross-referencing standards
- Priority classification (🔴 Primary, 🟡 Reference, 🟢 Supporting)

**Main Documentation Index**: [docs/README.md](docs/README.md)

---

### `/examples/` - Usage Examples
**Purpose**: Demonstration code and usage patterns
**Convention Document**: [examples/CONVENTIONS.md](examples/CONVENTIONS.md)

Key conventions:
- Example organization
- Code style and comments
- Error handling patterns
- Performance considerations
- README maintenance

**Examples Index**: [examples/README.md](examples/README.md)

---

### `/scripts/` - Utility Scripts
**Purpose**: Build, deployment, and utility scripts
**Convention Document**: [scripts/CONVENTIONS.md](scripts/CONVENTIONS.md)

Key conventions:
- Script naming and organization
- Error handling standards
- Logging and output format
- Configuration management
- Documentation requirements

---

### `/tools/` - Development Tools
**Purpose**: Development and analysis tools
**Convention Document**: [tools/CONVENTIONS.md](tools/CONVENTIONS.md)

Key conventions:
- Tool organization
- CLI interface patterns
- Configuration standards
- Output formatting
- Integration guidelines

---

## 🎯 Quick Navigation by Task

### Adding New Features
1. Check module organization: [docs/module-organization.md](docs/module-organization.md)
2. Review target module conventions: [src/CONVENTIONS.md](src/CONVENTIONS.md)
3. Follow analyzer patterns: [docs/analyzer-ownership-pattern.md](docs/analyzer-ownership-pattern.md)

### Working with Database
1. Database conventions: [src/database/CONVENTIONS.md](src/database/CONVENTIONS.md)
2. Inference system: [src/database/inference/CONVENTIONS.md](src/database/inference/CONVENTIONS.md)
3. Maintenance guide: [docs/graph-maintenance-conventions.md](docs/graph-maintenance-conventions.md)

### Writing Tests
1. Test conventions: [tests/CONVENTIONS.md](tests/CONVENTIONS.md)
2. Test organization patterns
3. Integration test guidelines

### Creating Documentation
1. Documentation conventions: [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
2. Documentation index: [docs/README.md](docs/README.md)
3. Documentation standards

### Adding Examples
1. Example conventions: [examples/CONVENTIONS.md](examples/CONVENTIONS.md)
2. Example patterns
3. Performance considerations

---

## 📋 Convention Document Template

When creating a new `CONVENTIONS.md` file for a directory:

```markdown
# [Directory Name] Conventions

**Purpose**: [Brief description of directory purpose]

## File Organization

### Directory Structure
[Expected subdirectory structure]

### File Naming
[Naming patterns and rules]

## Code Style

### TypeScript/JavaScript
[Language-specific conventions]

### Imports/Exports
[Import organization and export patterns]

## Module Patterns

### [Pattern Name]
[Description and usage guidelines]

## Best Practices

### DO ✅
- [Good practice 1]
- [Good practice 2]

### DON'T ❌
- [Bad practice 1]
- [Bad practice 2]

## Examples

### Example 1: [Use Case]
\`\`\`typescript
// Example code
\`\`\`

## Related Documentation
- [Related doc 1](path/to/doc)
- [Related doc 2](path/to/doc)

---
**Last Updated**: YYYY-MM-DD
**Maintainer**: Team Name
```

---

## 🔄 Convention Update Process

### When to Update Conventions
1. New patterns emerge and become standard
2. Existing conventions prove problematic
3. Technology or architecture changes
4. Team growth requires more explicit guidelines

### Update Procedure
1. **Propose Change**: Create issue describing proposed convention
2. **Discussion**: Team reviews and discusses impact
3. **Documentation**: Update relevant CONVENTIONS.md file(s)
4. **Announcement**: Communicate change to team
5. **Implementation**: Apply convention to new code
6. **Review**: Periodic review of convention effectiveness

### Convention Priority

**🔴 CRITICAL**: Safety, security, data integrity
- Must always be followed
- Violations should be caught in code review
- Examples: SQL injection prevention, file permission rules

**🟡 IMPORTANT**: Quality, maintainability, consistency
- Strong preference to follow
- Exceptions require justification
- Examples: Naming conventions, module organization

**🟢 RECOMMENDED**: Optimization, style, best practices
- Follow when practical
- Can be adjusted for specific contexts
- Examples: Performance patterns, code organization preferences

---

## 🎓 Learning Path

### For New Contributors
1. Start with [docs/README.md](docs/README.md) - Overall project understanding
2. Read [docs/module-organization.md](docs/module-organization.md) - Codebase structure
3. Review conventions for your target area
4. Check examples in [examples/](examples/)

### For Module Development
1. Module organization: [docs/module-organization.md](docs/module-organization.md)
2. Source conventions: [src/CONVENTIONS.md](src/CONVENTIONS.md)
3. Database conventions (if applicable): [src/database/CONVENTIONS.md](src/database/CONVENTIONS.md)
4. Test conventions: [tests/CONVENTIONS.md](tests/CONVENTIONS.md)

### For Documentation
1. Documentation index: [docs/README.md](docs/README.md)
2. Documentation conventions: [docs/CONVENTIONS.md](docs/CONVENTIONS.md)
3. Documentation standards and templates

---

## 📊 Convention Compliance

### Automated Checks
- **Linting**: ESLint with project rules
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest with coverage requirements
- **Formatting**: Prettier with project config

### Code Review Checklist
- [ ] Follows directory-specific conventions
- [ ] Naming conventions applied consistently
- [ ] Import/export patterns correct
- [ ] Documentation updated if needed
- [ ] Tests follow test conventions
- [ ] No convention violations introduced

### Metrics
- Convention compliance rate in code reviews
- Time to onboard new contributors
- Consistency scores across modules
- Technical debt related to convention violations

---

## 🔗 Related Resources

### Core Documentation
- [Main README](README.md) - Project overview
- [Module Organization](docs/module-organization.md) - Architecture guide
- [Documentation Index](docs/README.md) - All documentation

### Maintenance Guides
- [Graph Maintenance](docs/graph-maintenance-conventions.md) - Database maintenance
- [Inference System](docs/inference-system.md) - Inference API guide
- [Performance Guide](docs/PERFORMANCE.md) - Optimization patterns

### Development Tools
- [Dependency Analysis](tools/dependency-analysis/README.md) - Dependency tools
- [Example Projects](examples/README.md) - Usage examples

---

## 📝 Convention Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Established and enforced |
| 🔄 | In progress |
| 📝 | Needs documentation |
| ⚠️ | Under review |
| 🆕 | Recently added |

---

## 💬 Feedback and Questions

For questions about conventions:
1. Check relevant CONVENTIONS.md file
2. Review related documentation
3. Ask in team discussion channels
4. Create issue for clarification or improvement

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Development Team

---

**Next Steps**:
1. Create directory-specific CONVENTIONS.md files
2. Populate with existing patterns and practices
3. Review and validate with team
4. Establish enforcement mechanisms
5. Schedule periodic reviews