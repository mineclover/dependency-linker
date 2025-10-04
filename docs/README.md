# Documentation Index

**Central documentation hub for the Dependency Linker project.**

## 목차
- [📚 Documentation Categories](#-documentation-categories)
  - [🚀 Getting Started](#-getting-started)
  - [🔄 Pipeline & Data Flow](#-pipeline--data-flow)
  - [🏗️ Architecture & System Design](#️-architecture--system-design)
  - [🧠 Graph Database & Inference System](#-graph-database--inference-system)
  - [🔍 Analysis & Features](#-analysis--features)
  - [⚡ Performance & Optimization](#-performance--optimization)
- [🎯 Quick Start Paths](#-quick-start-paths)
- [📖 Document Descriptions](#-document-descriptions)
- [🔗 Related Resources](#-related-resources)
- [📝 Documentation Standards](#-documentation-standards)
- [🎓 Learning Paths](#-learning-paths)
- [📊 Document Status Legend](#-document-status-legend)
- [🔍 Search Tips](#-search-tips)
- [📅 Document Maintenance](#-document-maintenance)

---

## 📚 Documentation Categories

### 🚀 Getting Started
Quick start guides and initial setup.

| Document | Description | Status |
|----------|-------------|--------|
| [Setup-Guide.md](Setup-Guide.md) | Installation and initial setup | ✅ |
| [API.md](API.md) | Complete API reference and usage | ✅ |

---

### 🔄 Pipeline & Data Flow

**Complete data processing pipeline from extraction to inference.**

| Document | Description | Status | Priority |
|----------|-------------|--------|----------|
| [pipeline-overview.md](pipeline-overview.md) | **Complete pipeline: Extraction → Storage → Analysis → Inference** | ✅ NEW | 🔴 **START HERE** |
| [implementation-status.md](implementation-status.md) | **Implementation status & completion details** | ✅ NEW | 🔴 **IMPORTANT** |
| [type-system.md](type-system.md) | Type definitions (Node/Edge 대상 식별) | ✅ NEW | 🔴 Primary |
| [semantic-tags.md](semantic-tags.md) | Semantic tags (복합적 의미 표현, 선택적) | ✅ NEW | 🔴 Primary |
| [namespace-scenario-guide.md](namespace-scenario-guide.md) | 🆕 **Namespace-Scenario Integration 가이드** | ✅ NEW | 🔴 Primary |

**Pipeline Stages** (✅ COMPLETE):
1. **Extraction**: AST parsing → Symbol extraction → **Edge extraction** ✅
2. **Storage**: GraphDB nodes + edges + **Edge Type 관리** ✅
3. **Analysis**: **Node Type/Edge Type 기반 분석**, Pattern analysis ✅
4. **Inference**: Hierarchical, Transitive, Inheritable relationships ✅

**Completion Status**:
- ✅ **Edge 추출 + Edge Type 관리**: 의존성 분석 완성
- ✅ **Node Type 기반 분석**: 대상 식별 및 검색
- ✅ **Edge Type 기반 분석**: 관계 유형 검색
- ✅ **추론 엔진**: 3가지 추론 모두 작동
- 💡 **Semantic Tags**: 선택적 기능 (마크다운 헤딩 지원, 일반 코드는 필요시 구현)

**Quick Start**:
1. Read [pipeline-overview.md](pipeline-overview.md) for complete data flow
2. Check [implementation-status.md](implementation-status.md) for completion status & optional features

---

### 🏗️ Architecture & System Design

Core system architecture and module organization.

| Document | Description | Status |
|----------|-------------|--------|
| [module-organization.md](module-organization.md) | Module structure and organization guide | ✅ |
| [PARSER_SYSTEM.md](PARSER_SYSTEM.md) | Parser system architecture | ✅ |
| [PACKAGE_EXPORTS.md](PACKAGE_EXPORTS.md) | Package export structure | ✅ |

**Key Concepts**:
- Module boundaries and responsibilities
- Dependency graph and import conventions
- Core, Database, Inference, Integration modules
- Best practices for module design

---

### 🧠 Graph Database & Inference System

Complete graph database and inference capabilities.

| Document | Description | Status | Priority |
|----------|-------------|--------|----------|
| [inference-system.md](inference-system.md) | **Inference API and usage guide** | ✅ | 🔴 Primary |
| [graph-maintenance-conventions.md](graph-maintenance-conventions.md) | **Maintenance conventions** | ✅ | 🔴 Primary |
| [inference-system-status-report.md](inference-system-status-report.md) | Implementation status and roadmap | ✅ | 🟡 Reference |
| [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md) | Analyzer ownership pattern | ✅ | 🟢 Supporting |
| [edge-type-management.md](edge-type-management.md) | Edge type system details | ✅ | 🟢 Supporting |
| [identifier-strategy.md](identifier-strategy.md) | Node identifier strategy | ✅ | 🟢 Supporting |

**Quick Navigation**:
- **New to Inference?** → Start with [inference-system.md](inference-system.md)
- **Maintaining System?** → Read [graph-maintenance-conventions.md](graph-maintenance-conventions.md)
- **Implementation Status?** → Check [inference-system-status-report.md](inference-system-status-report.md)
- **Creating Analyzer?** → Review [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md)

**Inference Capabilities**:
1. **Hierarchical Inference**: Parent type queries include all child types
2. **Transitive Inference**: A→B→C chains with SQL Recursive CTE
3. **Inheritable Inference**: Relationship propagation through containment

**Key Components**:
- `EdgeTypeRegistry`: Edge type hierarchy management
- `InferenceEngine`: Three inference types with cache strategies
- `GraphDatabase`: Core database with inference query methods

---

### 🔍 Analysis & Features

Dependency analysis and graph features.

| Document | Description | Status | Priority |
|----------|-------------|--------|----------|
| [single-file-analysis-api.md](single-file-analysis-api.md) | **Single file analysis API** | ✅ NEW | 🔴 Primary |
| [DEPENDENCY_GRAPH_ANALYSIS.md](DEPENDENCY_GRAPH_ANALYSIS.md) | Graph analysis capabilities | ✅ | 🟡 Reference |
| [CustomKeyMapper-Guide.md](CustomKeyMapper-Guide.md) | Custom key mapping guide | ✅ | 🟢 Supporting |

---

### ⚡ Performance & Optimization

Performance tuning and optimization guides.

| Document | Description | Status |
|----------|-------------|--------|
| [PERFORMANCE.md](PERFORMANCE.md) | Performance optimization guide | ✅ |

---

## 🎯 Quick Start Paths

### For New Users
1. **[pipeline-overview.md](pipeline-overview.md)** - 📌 **START HERE** - Complete data flow understanding
2. [Setup-Guide.md](Setup-Guide.md) - Install and configure
3. [API.md](API.md) - Learn basic API usage
4. [namespace-scenario-guide.md](namespace-scenario-guide.md) - 🆕 Namespace-Scenario Integration
5. [inference-system.md](inference-system.md) - Understand inference capabilities

### For Understanding the System
1. **[pipeline-overview.md](pipeline-overview.md)** - Complete pipeline: Extraction → Storage → Analysis → Inference
2. [type-system.md](type-system.md) - Type definitions (실제 데이터 형태)
3. [semantic-tags.md](semantic-tags.md) - Semantic tags & extraction rules
4. [inference-system.md](inference-system.md) - Inference API and capabilities

### For Developers
1. [module-organization.md](module-organization.md) - Understand codebase structure
2. **[pipeline-overview.md](pipeline-overview.md)** - Data flow and processing stages
3. [inference-system.md](inference-system.md) - Learn inference API
4. [graph-maintenance-conventions.md](graph-maintenance-conventions.md) - Follow conventions
4. [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md) - Create analyzers

### For Maintainers
1. [graph-maintenance-conventions.md](graph-maintenance-conventions.md) - Maintenance rules
2. [inference-system-status-report.md](inference-system-status-report.md) - Current status
3. [module-organization.md](module-organization.md) - Module structure
4. [edge-type-management.md](edge-type-management.md) - Edge type system

---

## 📖 Document Descriptions

### Primary Documents (🔴 Must Read)

#### [inference-system.md](inference-system.md)
**Complete inference system API and usage guide.**

Contents:
- Three inference types (Hierarchical, Transitive, Inheritable)
- InferenceEngine API documentation
- SQL Recursive CTE implementation details
- EdgeTypeRegistry usage
- Cache strategies (eager/lazy/manual)
- Performance optimization tips
- Real-world usage examples
- Troubleshooting guide

Audience: All developers using inference system

#### [graph-maintenance-conventions.md](graph-maintenance-conventions.md)
**Comprehensive maintenance conventions for graph database and inference system.**

Contents:
- Edge type management (Registry as single source of truth)
- Analyzer ownership pattern (OWNED_EDGE_TYPES, source_file tracking)
- Schema synchronization guidelines
- Inference system maintenance (cache strategies, performance)
- Type safety requirements
- Testing requirements
- Performance monitoring
- Rescan-based approach (no migrations needed)
- Checklists for common tasks

Audience: Developers and maintainers

---

### Architecture Documents (🟡 Important)

#### [module-organization.md](module-organization.md)
**Complete module structure and organization guide.**

Contents:
- Overall project structure
- Core, Database, Inference, Integration modules
- Module dependencies and hierarchy
- Import conventions (internal, cross-module, dynamic)
- Adding new modules (checklist and template)
- Best practices for module design
- Circular dependency prevention

Audience: Developers and contributors

#### [PARSER_SYSTEM.md](PARSER_SYSTEM.md)
**Parser system architecture and multi-language support.**

Audience: Contributors working on parser system

#### [PACKAGE_EXPORTS.md](PACKAGE_EXPORTS.md)
**Package export structure and usage.**

Audience: Package users and contributors

---

### Supporting Documents (🟢 Reference)

#### [inference-system-status-report.md](inference-system-status-report.md)
**Implementation status, pending tasks, and recommendations.**

Contents:
- Complete implementation status
- Architecture decisions
- Performance characteristics
- What's working
- Pending tasks (testing, monitoring, cache)
- Technical debt assessment
- Recommendations for production use

Audience: Project managers and developers

#### [analyzer-ownership-pattern.md](analyzer-ownership-pattern.md)
**Analyzer ownership pattern for multi-analyzer edge management.**

Contents:
- OWNED_EDGE_TYPES pattern
- source_file tracking
- Cleanup isolation between analyzers
- Best practices for analyzer implementation

Audience: Developers creating analyzers

#### [edge-type-management.md](edge-type-management.md)
**Edge type system and hierarchy management.**

Contents:
- Edge type definitions
- Hierarchy structure
- Validation rules
- Dynamic registration

Audience: Advanced developers

#### [identifier-strategy.md](identifier-strategy.md)
**Node identifier generation strategy.**

Contents:
- Identifier format
- Uniqueness guarantees
- Generation utilities

Audience: Developers working with nodes

---

### Analysis Documents (🟢 Features)

#### [DEPENDENCY_GRAPH_ANALYSIS.md](DEPENDENCY_GRAPH_ANALYSIS.md)
**Graph analysis capabilities and usage.**

Audience: Users analyzing dependencies

#### [CustomKeyMapper-Guide.md](CustomKeyMapper-Guide.md)
**Custom key mapping for specialized analysis.**

Audience: Advanced users

---

### Performance Documents (⚡ Optimization)

#### [PERFORMANCE.md](PERFORMANCE.md)
**Performance optimization and benchmarking.**

Contents:
- Performance targets
- Optimization techniques
- Benchmarking tools
- Profiling guidance

Audience: Performance-focused developers

---

## 🔗 Related Resources

### Code Documentation
- **Inference Module**: `/src/database/inference/README.md`
- **Main README**: `/README.md`
- **Examples**: `/examples/`

### Example Code
- **Inference Demo**: `/examples/inference-system-demo.ts`
- **Edge Type Validation**: `/examples/edge-type-validation-demo.ts`
- **Inference Test**: `/examples/test-inference-with-source-file.ts`

---

## 📝 Documentation Standards

### Document Structure
Each document should follow this structure:
1. **Purpose**: Brief description of what the document covers
2. **Table of Contents**: For documents >300 lines
3. **Content Sections**: Logical organization with clear headers
4. **Examples**: Code examples with explanations
5. **Related Documentation**: Links to related docs
6. **Metadata**: Last updated date, version, maintainer

### Naming Conventions
- **Guides**: `{topic}-guide.md` or `{Topic}-Guide.md`
- **System Docs**: `{SYSTEM_NAME}.md` (uppercase)
- **Feature Docs**: `{feature-name}.md` (lowercase with hyphens)
- **Status Reports**: `{topic}-status-report.md`

### Update Process
1. Update document content
2. Update "Last Updated" date
3. Update this index if adding/removing documents
4. Commit with descriptive message

---

## 🎓 Learning Paths

### Path 1: Basic Usage
```
Setup-Guide.md → API.md → DEPENDENCY_GRAPH_ANALYSIS.md
```
**Time**: 1-2 hours
**Outcome**: Can use basic features

### Path 2: Inference System
```
inference-system.md → graph-maintenance-conventions.md →
analyzer-ownership-pattern.md → examples/inference-system-demo.ts
```
**Time**: 3-4 hours
**Outcome**: Can use and maintain inference system

### Path 3: Contributing
```
module-organization.md → graph-maintenance-conventions.md →
inference-system.md → analyzer-ownership-pattern.md →
PARSER_SYSTEM.md
```
**Time**: 4-6 hours
**Outcome**: Can contribute to codebase

### Path 4: Architecture Understanding
```
module-organization.md → PARSER_SYSTEM.md →
inference-system.md → PACKAGE_EXPORTS.md →
DEPENDENCY_GRAPH_ANALYSIS.md
```
**Time**: 4-5 hours
**Outcome**: Full architecture understanding

---

## 📊 Document Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete and up-to-date |
| 🔄 | In progress |
| 📝 | Needs update |
| ❌ | Deprecated |
| 🆕 | New document |

---

## 🔍 Search Tips

**Finding Information**:
- **Inference**: Check inference-system.md first
- **Maintenance**: Go to graph-maintenance-conventions.md
- **Module Structure**: See module-organization.md
- **Performance**: Review PERFORMANCE.md
- **Setup**: Start with Setup-Guide.md

**Common Questions**:
- "How do I query transitive dependencies?" → inference-system.md
- "How do I add a new edge type?" → graph-maintenance-conventions.md
- "What's the module structure?" → module-organization.md
- "How do I create an analyzer?" → analyzer-ownership-pattern.md
- "What's the current status?" → inference-system-status-report.md

---

## 📅 Document Maintenance

**Regular Updates**:
- Review quarterly
- Update after major features
- Keep examples current
- Validate links and references

**Version History**:
- 1.0 (2025-09-30): Created comprehensive documentation index
- 1.0 (2025-09-30): Added inference system documentation
- 1.0 (2025-09-30): Added maintenance conventions
- 1.0 (2025-09-30): Added module organization guide

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Development Team

---

For quick questions, search this index or check the specific category documentation.