# Research: Multi-Language AST Analysis Framework

## Multi-Language Tree-Sitter Integration

### Decision: Use language-specific tree-sitter packages
**Rationale**: Each language requires its own tree-sitter grammar package for accurate parsing
**Alternatives considered**: Single universal parser (insufficient language support), language servers (too heavy for analysis)

**Recommended packages**:
- `tree-sitter-typescript` (already in use)
- `tree-sitter-go` (official Go grammar)
- `tree-sitter-java` (official Java grammar)
- `tree-sitter-python` (official Python grammar)

**Integration pattern**:
```typescript
interface LanguageParser {
  language: Parser.Language;
  extensions: string[];
  parse(source: string): Parser.Tree;
}

class ParserRegistry {
  private parsers = new Map<string, LanguageParser>();

  register(lang: string, parser: LanguageParser): void;
  getParser(fileExtension: string): LanguageParser | null;
}
```

## Plugin Architecture Patterns

### Decision: Interface-based plugin system
**Rationale**: TypeScript interfaces provide type safety and clear contracts for plugins
**Alternatives considered**: Dynamic loading (runtime errors), inheritance-based (tight coupling)

**Core interfaces**:
```typescript
interface IDataExtractor<T> {
  readonly name: string;
  readonly supportedLanguages: string[];
  extract(ast: Parser.Tree, source: string, filePath: string): T[];
}

interface IDataInterpreter<TInput, TOutput> {
  readonly name: string;
  interpret(data: TInput[], context: AnalysisContext): TOutput;
}

interface IAnalysisPlugin {
  readonly extractors: IDataExtractor<any>[];
  readonly interpreters: IDataInterpreter<any, any>[];
}
```

## AST Caching Strategies

### Decision: File-based JSON caching with TTL
**Rationale**: Simple implementation, cross-process sharing, size-efficient for analysis data
**Alternatives considered**: In-memory (no persistence), binary format (complexity), database (overkill)

**Cache structure**:
```typescript
interface CacheEntry<T> {
  filePath: string;
  fileHash: string;
  timestamp: number;
  ttl: number;
  data: T;
}

interface ASTCache {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T, ttl?: number): void;
  invalidate(key: string): void;
  cleanup(): void; // Remove expired entries
}
```

## Performance Optimization

### Decision: Lazy parser initialization and AST reuse
**Rationale**: Minimize memory footprint, maximize parse result reuse across analyzers
**Alternatives considered**: Pre-load all parsers (memory waste), parse per analyzer (performance waste)

**Optimization strategies**:
1. **Lazy Loading**: Initialize language parsers only when needed
2. **AST Reuse**: Parse once, analyze multiple times with different extractors
3. **Streaming Analysis**: Process large files in chunks for memory efficiency
4. **Parallel Processing**: Analyze multiple files concurrently (handled by external workflow)

**Performance targets**:
- Parser initialization: <50ms per language
- AST parsing: <200ms per file (up to 10k lines)
- Memory usage: <100MB for typical analysis session
- Cache hit ratio: >80% for repeated analysis

## Three-Module Architecture

### Decision: Clear separation of parsing, extraction, and interpretation
**Rationale**: Aligns with user requirements for modular, extensible system
**Alternatives considered**: Monolithic analysis (not extensible), pipeline pattern (complex)

**Module responsibilities**:
1. **Code Parser Module**: Language detection, AST generation, caching
2. **Data Extraction Module**: AST traversal, information extraction (dependencies, identifiers, etc.)
3. **Data Interpretation Module**: Analysis-specific processing, path mapping, classification

**Data flow**:
```
Source Code → [Parser] → AST → [Extractor] → Raw Data → [Interpreter] → Analysis Result
```

## Integration with Existing System

### Decision: Maintain existing API surface with internal refactoring
**Rationale**: Preserve user compatibility while enabling new capabilities
**Alternatives considered**: Complete rewrite (breaking changes), parallel implementation (maintenance burden)

**Compatibility strategy**:
- Keep `TypeScriptAnalyzer` class as facade
- Implement new system as internal engine
- Add new APIs for extended functionality
- Deprecate old APIs gradually

**Migration path**:
1. Refactor existing dependency analysis as plugin
2. Add multi-language support via new parser registry
3. Extend with additional analysis types
4. Provide migration guide for new APIs