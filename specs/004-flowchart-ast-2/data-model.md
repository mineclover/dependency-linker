# Data Model: AST-Based Code Analysis Framework

## Core Entities

### AnalysisEngine
**Purpose**: Central coordinator for multi-language AST analysis
**Fields**:
- `parserRegistry: ParserRegistry` - Manages language-specific parsers
- `extractorRegistry: ExtractorRegistry` - Manages data extraction plugins
- `interpreterRegistry: InterpreterRegistry` - Manages data interpretation plugins
- `cacheManager: CacheManager` - Handles AST and result caching
- `config: AnalysisConfig` - Analysis configuration and options

**Relationships**:
- Owns ParserRegistry, ExtractorRegistry, InterpreterRegistry, CacheManager
- Uses AnalysisConfig for configuration

**State Transitions**:
`Uninitialized → Initialized → Processing → Complete/Error`

### LanguageParser
**Purpose**: Language-specific AST parsing capability
**Fields**:
- `language: Parser.Language` - Tree-sitter language grammar
- `name: string` - Language identifier (e.g., "typescript", "go", "java")
- `extensions: string[]` - Supported file extensions
- `version: string` - Parser version for cache invalidation

**Relationships**:
- Registered with ParserRegistry
- Used by AnalysisEngine for AST generation

**Validation Rules**:
- Language must be valid tree-sitter grammar
- Extensions must include leading dot (e.g., ".ts", ".go")
- Name must be unique within registry

### IDataExtractor<T>
**Purpose**: Plugin interface for extracting specific data from AST
**Fields**:
- `name: string` - Unique extractor identifier
- `supportedLanguages: string[]` - Compatible language parsers
- `version: string` - Extractor version for compatibility

**Methods**:
- `extract(ast: Parser.Tree, source: string, filePath: string): T[]` - Extract data from AST

**Validation Rules**:
- Name must be unique within registry
- Must support at least one language
- Extract method must handle parse errors gracefully

### IDataInterpreter<TInput, TOutput>
**Purpose**: Plugin interface for processing extracted data
**Fields**:
- `name: string` - Unique interpreter identifier
- `inputType: string` - Expected input data type identifier
- `outputType: string` - Produced output data type identifier

**Methods**:
- `interpret(data: TInput[], context: AnalysisContext): TOutput` - Process extracted data

**Validation Rules**:
- Name must be unique within registry
- Input/output types must match registered data types
- Must handle empty or invalid input data

### ExtractedData
**Purpose**: Standardized container for raw AST-extracted information
**Fields**:
- `type: string` - Data type identifier (e.g., "dependency", "identifier", "function")
- `language: string` - Source language
- `filePath: string` - Origin file path
- `location: SourceLocation` - AST node location
- `data: any` - Type-specific extracted data
- `metadata: Record<string, any>` - Additional context information

**Relationships**:
- Produced by IDataExtractor implementations
- Consumed by IDataInterpreter implementations

### AnalysisResult
**Purpose**: Final output of analysis process
**Fields**:
- `filePath: string` - Analyzed file path
- `language: string` - Detected language
- `success: boolean` - Analysis completion status
- `extractedData: ExtractedData[]` - Raw extracted information
- `interpretedResults: Map<string, any>` - Processed analysis results
- `performance: PerformanceMetrics` - Timing and resource usage
- `errors: AnalysisError[]` - Any errors encountered

**Relationships**:
- Contains ExtractedData from extractors
- Contains interpreted results from interpreters
- Includes PerformanceMetrics for monitoring

### AnalysisConfig
**Purpose**: Configuration for analysis behavior
**Fields**:
- `enabledExtractors: string[]` - Active data extractors
- `enabledInterpreters: string[]` - Active data interpreters
- `cacheSettings: CacheConfig` - Caching behavior configuration
- `parallelism: number` - Concurrent analysis limit
- `timeout: number` - Analysis timeout in milliseconds
- `languageSettings: Map<string, any>` - Language-specific options

**Validation Rules**:
- Enabled extractors/interpreters must exist in registries
- Parallelism must be positive integer
- Timeout must be positive number

### CacheEntry<T>
**Purpose**: Cached analysis data with expiration
**Fields**:
- `key: string` - Unique cache identifier
- `filePath: string` - Source file path
- `fileHash: string` - File content hash for invalidation
- `timestamp: number` - Cache creation time
- `ttl: number` - Time-to-live in milliseconds
- `data: T` - Cached data payload

**Relationships**:
- Managed by CacheManager
- Referenced by cache key

**State Transitions**:
`Fresh → Stale → Expired`

## Validation Rules

### Data Consistency
- ExtractedData.type must match registered extractor output types
- IDataInterpreter input types must match available ExtractedData types
- AnalysisResult.language must match registered parser languages

### Performance Constraints
- AST parsing timeout: 30 seconds default, configurable
- Cache entry TTL: 1 hour default, configurable
- Maximum concurrent analyses: 10 default, configurable

### Error Handling
- Parse errors must not prevent partial analysis
- Missing extractors/interpreters should log warnings, not fail
- Cache failures must fallback to direct analysis

## Data Relationships

```
AnalysisEngine
├── ParserRegistry (1:1)
│   └── LanguageParser[] (1:many)
├── ExtractorRegistry (1:1)
│   └── IDataExtractor[] (1:many)
├── InterpreterRegistry (1:1)
│   └── IDataInterpreter[] (1:many)
└── CacheManager (1:1)
    └── CacheEntry[] (1:many)

AnalysisResult
├── ExtractedData[] (1:many)
├── PerformanceMetrics (1:1)
└── AnalysisError[] (1:many)
```