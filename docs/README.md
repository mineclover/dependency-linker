# Documentation Index

**Technical documentation hub for the Dependency Linker project.**

**Note**: 
- Feature documentation has been moved to the `features/` directory
- User scenarios are documented in `USER-SCENARIOS.md` at the project root
- Work history and status reports have been moved to the `history/` directory
- This directory contains only current technical documentation and user guides

## 목차
- [📚 Documentation Categories](#-documentation-categories)
- [🎯 Quick Start Paths](#-quick-start-paths)
- [📖 Key Documents](#-key-documents)
- [🔗 Related Resources](#-related-resources)
- [📝 Documentation Standards](#-documentation-standards)

---

## 📚 Documentation Categories

### 🚀 Getting Started

| Document | Description | Status |
|----------|-------------|--------|
| [Setup-Guide.md](Setup-Guide.md) | Installation and initial setup | ✅ |
| [API.md](API.md) | Complete API reference and usage | ✅ |
| [GLOSSARY.md](GLOSSARY.md) | Technical terminology and definitions | ✅ |

### 🔄 Pipeline & Architecture

| Document | Description | Status |
|----------|-------------|--------|
| [pipeline-overview.md](pipeline-overview.md) | **Complete pipeline: Extraction → Storage → Analysis → Inference** | ✅ |
| [type-system.md](type-system.md) | Node and Edge type definitions | ✅ |
| [semantic-tags.md](semantic-tags.md) | Semantic tags system and usage | ✅ |
| [module-organization.md](module-organization.md) | Module structure and organization | ✅ |
| [PARSER_SYSTEM.md](PARSER_SYSTEM.md) | Parser system architecture | ✅ |

### 🔍 Core Systems

| Document | Description | Status |
|----------|-------------|--------|
| [rdf-addressing.md](rdf-addressing.md) | RDF-based node identification system | ✅ |
| [unknown-node-inference.md](unknown-node-inference.md) | Unknown node and alias inference system | ✅ |
| [single-file-analysis-api.md](single-file-analysis-api.md) | Single file analysis API | ✅ |
| [identifier-strategy.md](identifier-strategy.md) | Node identifier generation strategy | ✅ |
| [edge-type-management.md](edge-type-management.md) | Edge type system and hierarchy | ✅ |

### 🧠 Graph Database & Analysis

| Document | Description | Status |
|----------|-------------|--------|
| [graph-maintenance-conventions.md](graph-maintenance-conventions.md) | Graph maintenance conventions | ✅ |
| [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md) | Analyzer ownership pattern | ✅ |
| [NODE-LISTING-API.md](NODE-LISTING-API.md) | Node listing and query API | ✅ |
| [query-workflow-guide.md](query-workflow-guide.md) | Query system workflow guide | ✅ |
| [CustomKeyMapper-Guide.md](CustomKeyMapper-Guide.md) | Custom key mapping guide | ✅ |

### 🏗️ Development & Integration

| Document | Description | Status |
|----------|-------------|--------|
| [namespace-scenario-guide.md](namespace-scenario-guide.md) | Namespace-Scenario Integration guide | ✅ |
| [CONVENTIONS.md](CONVENTIONS.md) | Code and architecture conventions | ✅ |
| [testing-strategy.md](testing-strategy.md) | Testing strategy and best practices | ✅ |
| [PACKAGE_EXPORTS.md](PACKAGE_EXPORTS.md) | Package export structure | ✅ |

### ⚡ Performance

| Document | Description | Status |
|----------|-------------|--------|
| [PERFORMANCE.md](PERFORMANCE.md) | Performance optimization guide | ✅ |

---

## 🎯 Quick Start Paths

### For New Users
1. **[pipeline-overview.md](pipeline-overview.md)** - 📌 **START HERE** - Complete system overview
2. [Setup-Guide.md](Setup-Guide.md) - Install and configure
3. [API.md](API.md) - Learn basic API usage
4. **[USER-SCENARIOS.md](../USER-SCENARIOS.md)** - 7 comprehensive user scenarios
5. **[features/](../features/)** - Feature documentation and specifications

### For Understanding Core Systems
1. [pipeline-overview.md](pipeline-overview.md) - Complete architecture
2. [type-system.md](type-system.md) - Type definitions and classification
3. [rdf-addressing.md](rdf-addressing.md) - Node identification system
4. [unknown-node-inference.md](unknown-node-inference.md) - Unknown node handling
5. [semantic-tags.md](semantic-tags.md) - Semantic tagging system

### For Developers
1. [module-organization.md](module-organization.md) - Codebase structure
2. [CONVENTIONS.md](CONVENTIONS.md) - Development conventions
3. [graph-maintenance-conventions.md](graph-maintenance-conventions.md) - Graph maintenance
4. [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md) - Creating analyzers
5. [testing-strategy.md](testing-strategy.md) - Testing approach

### For Advanced Integration
1. [namespace-scenario-guide.md](namespace-scenario-guide.md) - Namespace-Scenario integration
2. [single-file-analysis-api.md](single-file-analysis-api.md) - Single file analysis
3. [CustomKeyMapper-Guide.md](CustomKeyMapper-Guide.md) - Custom key mapping
4. [query-workflow-guide.md](query-workflow-guide.md) - Query workflows

---

## 📖 Key Documents

### [pipeline-overview.md](pipeline-overview.md)
**Complete data processing pipeline from extraction to inference.**

**Pipeline Stages**:
1. **Extraction**: AST parsing → Symbol extraction → Edge extraction
2. **Storage**: GraphDB nodes + edges + Edge Type management
3. **Analysis**: Node Type/Edge Type based analysis, Pattern analysis
4. **Inference**: Hierarchical, Transitive, Inheritable relationships

Audience: All users and developers

---

### [type-system.md](type-system.md)
**Node and Edge type definitions and classification hierarchy.**

Contents:
- Node type definitions (file, class, function, etc.)
- Edge type definitions with parent hierarchy
- Type validation and consistency rules
- Classification and semantic meaning

Audience: Developers and advanced users

---

### [rdf-addressing.md](rdf-addressing.md)
**RDF-based node identification system for unique symbol addressing.**

Contents:
- RDF address format: `<projectName>/<filePath>#<NodeType>:<SymbolName>`
- Identifier generation and validation
- Symbol definition location tracking
- Search engine functionality

Audience: Developers working with nodes

---

### [unknown-node-inference.md](unknown-node-inference.md)
**Unknown node and alias inference system for imported symbols.**

Contents:
- Unknown node concept and dual-node pattern
- Alias handling (original node + alias node)
- Edge types: `uses`, `aliasOf`
- Inference and resolution strategies

Audience: Developers working with dependencies

---

### [graph-maintenance-conventions.md](graph-maintenance-conventions.md)
**Comprehensive maintenance conventions for graph database.**

Contents:
- Edge type management (Registry as single source of truth)
- Analyzer ownership pattern (OWNED_EDGE_TYPES)
- Schema synchronization guidelines
- Type safety requirements
- Testing requirements
- Rescan-based approach

Audience: Developers and maintainers

---

### [namespace-scenario-guide.md](namespace-scenario-guide.md)
**Complete guide to Namespace-Scenario Integration for horizontal scalability.**

Contents:
- Namespace configuration and management
- Scenario selection and composition
- Execution order and dependencies
- Real-world configuration examples
- Best practices and troubleshooting

Audience: Users and developers

---

## 🔗 Related Resources

### Feature Documentation
- **[features/](../features/)** - Complete feature specifications and guides
- **[features/index.md](../features/index.md)** - Feature overview dashboard

### User Documentation
- **[USER-SCENARIOS.md](../USER-SCENARIOS.md)** - 7 comprehensive user scenarios
- **[README.md](../README.md)** - Project overview and quick start

### Code Documentation
- **Inference Module**: `/src/database/inference/README.md`
- **Examples**: `/examples/`

### Example Code
- **Inference Demo**: `/examples/inference-system-demo.ts`
- **Edge Type Validation**: `/examples/edge-type-validation-demo.ts`
- **Graph Analysis**: `/examples/graph-analysis.ts`

### Archived Documentation
- **[archive/](archive/)** - Historical documentation and status reports
- **[archive/README.md](archive/README.md)** - Archive index and policy

---

## 📝 Documentation Standards

### Document Organization

**This directory (docs/)**: Technical and code management documentation
- Architecture and system design
- API references and technical guides
- Development conventions and patterns
- Performance and testing strategies

**Features directory**: Feature specifications and user guides
- Feature-specific documentation
- Implementation status and roadmaps
- Use cases and examples

**Project root**: High-level documentation
- README.md - Project overview
- USER-SCENARIOS.md - User scenarios
- CONTRIBUTING.md - Contribution guide
- DEVELOPMENT.md - Development guide

### Document Structure
Each document should follow this structure:
1. **Purpose**: Brief description of what the document covers
2. **Table of Contents**: For documents >300 lines
3. **Content Sections**: Logical organization with clear headers
4. **Examples**: Code examples with explanations
5. **Related Documentation**: Links to related docs
6. **Metadata**: Last updated date, version

### Naming Conventions
- **Guides**: `{topic}-guide.md` (lowercase with hyphens)
- **System Docs**: `{SYSTEM_NAME}.md` (uppercase)
- **Technical Docs**: `{feature-name}.md` (lowercase with hyphens)

### Update Process
1. Update document content
2. Update "Last Updated" date
3. Update this index if adding/removing documents
4. Update features/index.md if feature-related
5. Commit with descriptive message

---

## 📊 Document Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete and up-to-date |
| 🔄 | In progress |
| 📝 | Needs update |
| ❌ | Deprecated (archived) |
| 🆕 | New document |

---

## 🔍 Search Tips

**Finding Information**:
- **User Scenarios**: Check USER-SCENARIOS.md at project root
- **Features**: Browse features/ directory
- **Architecture**: See pipeline-overview.md
- **Node System**: Check rdf-addressing.md and unknown-node-inference.md
- **Development**: Review CONVENTIONS.md and testing-strategy.md
- **Historical Info**: Look in archive/ directory

**Common Questions**:
- "How do I use this feature?" → features/ directory or USER-SCENARIOS.md
- "How does the system work?" → pipeline-overview.md
- "How do I identify nodes?" → rdf-addressing.md
- "How are imports handled?" → unknown-node-inference.md
- "How do I contribute?" → CONVENTIONS.md and testing-strategy.md
- "What's archived?" → archive/README.md

---

## 📅 Document Maintenance

**Regular Updates**:
- Review quarterly
- Update after major features
- Keep examples current
- Validate links and references
- Archive obsolete documentation

**Version History**:
- 1.0 (2025-09-30): Created comprehensive documentation index
- 2.0 (2025-10-05): Reorganized documentation structure
  - Moved feature docs to features/ directory
  - Created USER-SCENARIOS.md for user workflows
  - Archived historical and duplicate documentation
  - Focused docs/ on technical documentation only

---

**Last Updated**: 2025-10-05
**Version**: 2.0
**Maintainer**: Development Team

---

For feature documentation, see the `features/` directory. For user scenarios, see `USER-SCENARIOS.md` at the project root.
