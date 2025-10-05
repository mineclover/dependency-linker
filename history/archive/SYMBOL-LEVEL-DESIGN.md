# Symbol-Level Context System Design

**Date**: 2025-10-03
**Version**: 1.0.0
**Status**: In Development

---

## 🎯 Goals

1. Extract symbols (classes, functions, methods) from source code
2. Generate symbol-level context documents with dependency information
3. Enable fine-grained dependency tracking at symbol level
4. Provide LLM-friendly context for specific code elements

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Symbol Extraction Pipeline                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Tree-sitter     │────▶│  Symbol          │────▶│  Symbol Context  │
│  Queries         │     │  Extractor       │     │  Generator       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                         │
        │                        │                         │
        ▼                        ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ ts-class-def     │     │ Symbol {         │     │ symbols/         │
│ ts-function-def  │     │   name           │     │   src/           │
│ ts-method-def    │     │   kind           │     │     MyClass/     │
│ ts-interface-def │     │   location       │     │       method.md  │
│ ts-type-def      │     │   signature      │     └──────────────────┘
│ ts-enum-def      │     │   dependencies   │
└──────────────────┘     │ }                │
                         └──────────────────┘
```

---

## 🔧 Data Structures

### SymbolInfo Interface

```typescript
export interface SymbolInfo {
  /** Symbol name (e.g., "MyClass", "calculateTotal") */
  name: string;

  /** Symbol kind (class, function, method, interface, type, enum, variable) */
  kind: SymbolKind;

  /** File path relative to project root */
  filePath: string;

  /** Symbol name path (Serena-style: /ClassName/methodName) */
  namePath: string;

  /** Source location */
  location: {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  };

  /** Function/method signature (if applicable) */
  signature?: string;

  /** Parent symbol (for methods, nested classes, etc.) */
  parentSymbol?: string;

  /** Type parameters (for generics) */
  typeParameters?: string[];

  /** Return type (for functions/methods) */
  returnType?: string;

  /** Parameters (for functions/methods) */
  parameters?: ParameterInfo[];

  /** Visibility/access modifier */
  visibility?: 'public' | 'private' | 'protected' | 'internal';

  /** Whether it's static */
  isStatic?: boolean;

  /** Whether it's async */
  isAsync?: boolean;

  /** Whether it's abstract */
  isAbstract?: boolean;

  /** Language */
  language: SupportedLanguage;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
}

export enum SymbolKind {
  Class = 'class',
  Interface = 'interface',
  Function = 'function',
  Method = 'method',
  Property = 'property',
  Variable = 'variable',
  Type = 'type',
  Enum = 'enum',
  EnumMember = 'enum-member',
  Constant = 'constant',
}
```

### SymbolDependency Interface

```typescript
export interface SymbolDependency {
  /** Source symbol name path */
  from: string;

  /** Target symbol name path */
  to: string;

  /** Dependency type */
  type: SymbolDependencyType;

  /** Location where dependency occurs */
  location: {
    line: number;
    column: number;
  };

  /** Context (e.g., the line of code) */
  context?: string;
}

export enum SymbolDependencyType {
  /** Function/method call */
  Call = 'call',

  /** Class instantiation */
  Instantiation = 'instantiation',

  /** Property/field access */
  PropertyAccess = 'property-access',

  /** Type reference */
  TypeReference = 'type-reference',

  /** Inheritance */
  Extends = 'extends',

  /** Interface implementation */
  Implements = 'implements',

  /** Import */
  Import = 'import',
}
```

---

## 🌲 Tree-sitter Queries (TypeScript)

### Required Queries

```typescript
export const TYPESCRIPT_SYMBOL_QUERIES = {
  // Class definitions
  "ts-class-definitions": `
    (class_declaration
      name: (type_identifier) @class_name
      type_parameters: (type_parameters)? @type_params
      heritage: (class_heritage)? @heritage
      body: (class_body) @class_body) @class
  `,

  // Interface definitions
  "ts-interface-definitions": `
    (interface_declaration
      name: (type_identifier) @interface_name
      type_parameters: (type_parameters)? @type_params
      body: (object_type) @interface_body) @interface
  `,

  // Function definitions
  "ts-function-definitions": `
    (function_declaration
      name: (identifier) @function_name
      type_parameters: (type_parameters)? @type_params
      parameters: (formal_parameters) @params
      return_type: (type_annotation)? @return_type
      body: (statement_block) @function_body) @function
  `,

  // Method definitions
  "ts-method-definitions": `
    (method_definition
      name: [
        (property_identifier) @method_name
        (computed_property_name) @computed_name
      ]
      parameters: (formal_parameters) @params
      return_type: (type_annotation)? @return_type
      body: (statement_block) @method_body) @method
  `,

  // Type alias definitions
  "ts-type-definitions": `
    (type_alias_declaration
      name: (type_identifier) @type_name
      type_parameters: (type_parameters)? @type_params
      value: (_) @type_value) @type_def
  `,

  // Enum definitions
  "ts-enum-definitions": `
    (enum_declaration
      name: (identifier) @enum_name
      body: (enum_body) @enum_body) @enum
  `,

  // Variable declarations (const, let, var)
  "ts-variable-definitions": `
    (lexical_declaration
      (variable_declarator
        name: (identifier) @var_name
        type: (type_annotation)? @var_type
        value: (_)? @var_value)) @variable
  `,

  // Arrow functions (exported const functions)
  "ts-arrow-function-definitions": `
    (lexical_declaration
      (variable_declarator
        name: (identifier) @function_name
        value: (arrow_function
          parameters: (_) @params
          return_type: (type_annotation)? @return_type
          body: (_) @function_body))) @arrow_function
  `,
};
```

---

## 📁 Symbol Context Document Structure

### File Organization

```
.dependency-linker/context/symbols/
├── src/
│   ├── database/
│   │   ├── GraphDatabase/
│   │   │   ├── constructor.md
│   │   │   ├── initialize.md
│   │   │   ├── addNode.md
│   │   │   └── findNodes.md
│   │   └── InferenceEngine/
│   │       ├── extractNearestNodes.md
│   │       └── calculateDepth.md
│   └── utils/
│       ├── fileUtils/
│       │   ├── readFile.md
│       │   └── writeFile.md
│       └── pathUtils.md  # (for standalone functions)
```

### Naming Convention

**Format**: `<symbol-name>.md`

**Examples**:
- Class: `GraphDatabase.md` (overview)
- Method: `GraphDatabase/initialize.md`
- Function: `calculateDepth.md`
- Nested class: `OuterClass/InnerClass.md`

---

## 📄 Symbol Context Document Template

```markdown
# Symbol: `<symbol-name>`

**Type**: <class|function|method|interface|type|enum>
**File**: <relative-file-path>:<line-number>
**Language**: <typescript|javascript|python|java>

---

## Signature

\`\`\`typescript
<full-signature>
\`\`\`

---

## Location

- **File**: `<relative-path>`
- **Lines**: <start> - <end>
- **Parent**: <parent-symbol-if-any>

---

## Dependencies

### Calls (functions/methods this symbol calls)
- `functionName()` - <file>:<line>
- `Class.method()` - <file>:<line>

### Used By (symbols that call this symbol)
- `callerFunction()` - <file>:<line>
- `CallerClass.method()` - <file>:<line>

### Type References
- `TypeName` - <file>:<line>

### Inheritance
- **Extends**: `BaseClass`
- **Implements**: `Interface1`, `Interface2`

---

## Purpose

[AUTO-GENERATED: User should fill this in]

What does this symbol do? What is its responsibility?

---

## Implementation Notes

[AUTO-GENERATED: User should fill this in]

Key implementation details, algorithms, design decisions.

---

## Related Symbols

- `<related-symbol-1>` - <relationship>
- `<related-symbol-2>` - <relationship>

---

**Generated**: <timestamp>
**Node ID**: <graph-node-id>
</markdown>
```

---

## 🔄 Implementation Phases

### Phase 1: Tree-sitter Queries (Current)
- [ ] Add TypeScript symbol extraction queries
- [ ] Update query registration system
- [ ] Test query execution

### Phase 2: Symbol Extraction API
- [ ] Create `SymbolExtractor` class
- [ ] Implement `extractSymbols(filePath)` → `SymbolInfo[]`
- [ ] Add symbol dependency detection
- [ ] Integrate with QueryEngine

### Phase 3: Symbol Context Generation
- [ ] Extend `ContextDocumentGenerator`
- [ ] Implement `generateSymbolContext(symbol, deps)`
- [ ] Add symbol-level directory structure creation
- [ ] Generate template markdown

### Phase 4: CLI Integration
- [ ] Add `generate-symbol-context <file> <symbol>` command
- [ ] Add `generate-symbol-context-all <file>` command
- [ ] Add `list-symbol-context` command
- [ ] Update help documentation

### Phase 5: Testing & Validation
- [ ] Test with TypeScript files
- [ ] Test with Python files
- [ ] Test with Java files
- [ ] Verify document quality

---

## 🎯 Success Criteria

1. ✅ Extract all major symbol types (class, function, method, interface, type, enum)
2. ✅ Generate well-structured symbol context documents
3. ✅ Track symbol-level dependencies (calls, references)
4. ✅ Integrate seamlessly with existing file-level system
5. ✅ Provide CLI commands for symbol context generation
6. ✅ Maintain Serena-compatible name path format

---

## 🚧 Known Limitations

1. **Scope**: Initially focusing on top-level and class-member symbols
2. **Nested Functions**: May not handle deeply nested closures
3. **Dynamic Code**: Cannot track runtime-generated symbols
4. **Cross-file Inference**: Symbol dependencies limited to same file initially

---

## 📚 References

- Tree-sitter TypeScript grammar: https://github.com/tree-sitter/tree-sitter-typescript
- LSP SymbolKind: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#symbolKind
- Serena MCP: Name path conventions for symbol identification

---

**Next Steps**: Implement TypeScript symbol extraction queries
