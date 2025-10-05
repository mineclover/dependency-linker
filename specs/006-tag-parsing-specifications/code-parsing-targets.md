# Code Parsing Targets Specification

## Overview

이 명세서는 코드에서 파싱되는 대상들을 명시적으로 정의합니다.

## TypeScript/JavaScript Parsing Targets

### 1. Class Elements

#### 1.1 Class Declaration
```typescript
// Target: class keyword
class MyClass {
  // Class body
}
```

**Parsing Rules**:
- **Pattern**: `class\s+(\w+)\s*\{`
- **Extraction**: Class name, inheritance, decorators
- **Metadata**: Access modifiers, abstract classes, generic types

#### 1.2 Class Methods
```typescript
class MyClass {
  // Target: method declarations
  public methodName(): void { }
  private _privateMethod(): string { }
  static staticMethod(): number { }
  async asyncMethod(): Promise<void> { }
}
```

**Parsing Rules**:
- **Pattern**: `(public|private|protected)?\s*(static)?\s*(async)?\s*(\w+)\s*\(`
- **Extraction**: Method name, parameters, return type, modifiers
- **Metadata**: Access level, static status, async status

#### 1.3 Class Properties
```typescript
class MyClass {
  // Target: property declarations
  public property: string;
  private _privateProp: number;
  static readonly staticProp: boolean;
  readonly readonlyProp: object;
}
```

**Parsing Rules**:
- **Pattern**: `(public|private|protected)?\s*(static)?\s*(readonly)?\s*(\w+)\s*:`
- **Extraction**: Property name, type, modifiers
- **Metadata**: Access level, static status, readonly status

### 2. Interface Elements

#### 2.1 Interface Declaration
```typescript
// Target: interface keyword
interface MyInterface {
  // Interface body
}
```

**Parsing Rules**:
- **Pattern**: `interface\s+(\w+)\s*\{`
- **Extraction**: Interface name, inheritance, generic types
- **Metadata**: Interface type, generic constraints

#### 2.2 Interface Properties
```typescript
interface MyInterface {
  // Target: property declarations
  requiredProp: string;
  optionalProp?: number;
  readonly readonlyProp: boolean;
}
```

**Parsing Rules**:
- **Pattern**: `(\w+)\??\s*:\s*(\w+)`
- **Extraction**: Property name, type, optional status
- **Metadata**: Required/optional status, readonly status

#### 2.3 Interface Methods
```typescript
interface MyInterface {
  // Target: method declarations
  methodName(): void;
  asyncMethod(): Promise<string>;
  optionalMethod?(): number;
}
```

**Parsing Rules**:
- **Pattern**: `(\w+)\??\s*\([^)]*\)\s*:\s*(\w+)`
- **Extraction**: Method name, parameters, return type
- **Metadata**: Optional status, async status

### 3. Function Elements

#### 3.1 Function Declaration
```typescript
// Target: function keyword
function myFunction(param: string): number {
  return param.length;
}
```

**Parsing Rules**:
- **Pattern**: `function\s+(\w+)\s*\([^)]*\)\s*:\s*(\w+)`
- **Extraction**: Function name, parameters, return type
- **Metadata**: Function type, parameter types

#### 3.2 Arrow Function
```typescript
// Target: arrow function
const arrowFunction = (param: string): number => {
  return param.length;
};
```

**Parsing Rules**:
- **Pattern**: `(\w+)\s*=\s*\([^)]*\)\s*=>\s*`
- **Extraction**: Variable name, parameters, return type
- **Metadata**: Arrow function type, parameter types

#### 3.3 Method Declaration
```typescript
// Target: method in object
const obj = {
  methodName(param: string): number {
    return param.length;
  }
};
```

**Parsing Rules**:
- **Pattern**: `(\w+)\s*\([^)]*\)\s*:\s*(\w+)\s*\{`
- **Extraction**: Method name, parameters, return type
- **Metadata**: Method type, parameter types

### 4. Type Elements

#### 4.1 Type Declaration
```typescript
// Target: type keyword
type MyType = string | number;
```

**Parsing Rules**:
- **Pattern**: `type\s+(\w+)\s*=\s*`
- **Extraction**: Type name, type definition
- **Metadata**: Type type, union types, intersection types

#### 4.2 Generic Types
```typescript
// Target: generic type parameters
type GenericType<T> = T[];
interface GenericInterface<T, U> {
  prop: T;
  method(): U;
}
```

**Parsing Rules**:
- **Pattern**: `(\w+)<(\w+(?:,\s*\w+)*)>`
- **Extraction**: Type name, generic parameters
- **Metadata**: Generic type, parameter constraints

### 5. Enum Elements

#### 5.1 Enum Declaration
```typescript
// Target: enum keyword
enum MyEnum {
  VALUE1,
  VALUE2,
  VALUE3
}
```

**Parsing Rules**:
- **Pattern**: `enum\s+(\w+)\s*\{`
- **Extraction**: Enum name, enum values
- **Metadata**: Enum type, value types

#### 5.2 Enum Values
```typescript
enum MyEnum {
  // Target: enum values
  VALUE1 = "value1",
  VALUE2 = 2,
  VALUE3 = "value3"
}
```

**Parsing Rules**:
- **Pattern**: `(\w+)\s*=\s*([^,}]+)`
- **Extraction**: Value name, value assignment
- **Metadata**: Value type, assignment type

### 6. Import/Export Elements

#### 6.1 Import Statements
```typescript
// Target: import statements
import { Component } from 'react';
import * as utils from './utils';
import defaultExport from './module';
```

**Parsing Rules**:
- **Pattern**: `import\s+([^from]+)\s+from\s+['"]([^'"]+)['"]`
- **Extraction**: Import names, module path
- **Metadata**: Import type, module type

#### 6.2 Export Statements
```typescript
// Target: export statements
export const myConstant = 'value';
export function myFunction() { }
export default class MyClass { }
```

**Parsing Rules**:
- **Pattern**: `export\s+(const|function|class|interface|type)\s+(\w+)`
- **Extraction**: Export type, export name
- **Metadata**: Export type, export scope

### 7. Variable Elements

#### 7.1 Variable Declaration
```typescript
// Target: variable declarations
const myConst: string = 'value';
let myLet: number = 42;
var myVar: boolean = true;
```

**Parsing Rules**:
- **Pattern**: `(const|let|var)\s+(\w+)\s*:\s*(\w+)`
- **Extraction**: Variable name, type, declaration type
- **Metadata**: Declaration type, variable scope

#### 7.2 Constant Declaration
```typescript
// Target: constant declarations
const MY_CONSTANT = 'value';
const { destructured } = object;
const [arrayItem] = array;
```

**Parsing Rules**:
- **Pattern**: `const\s+(\w+)\s*=`
- **Extraction**: Constant name, assignment
- **Metadata**: Constant type, assignment type

## Markdown Parsing Targets

### 1. Heading Elements

#### 1.1 Heading Levels
```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

**Parsing Rules**:
- **Pattern**: `^(#{1,6})\s+(.+)$`
- **Extraction**: Heading level, heading text
- **Metadata**: Heading depth, heading type

#### 1.2 Heading with Tags
```markdown
## My Heading #tag1 #tag2
### Another Heading #example
```

**Parsing Rules**:
- **Pattern**: `^(#{1,6})\s+(.+?)\s+(#\w+(?:\s+#\w+)*)$`
- **Extraction**: Heading level, heading text, tags
- **Metadata**: Heading depth, tag count, tag types

### 2. Link Elements

#### 2.1 Internal Links
```markdown
[Link Text](./path/to/file.md)
[Link Text](../other/file.md)
[Link Text](file.md)
```

**Parsing Rules**:
- **Pattern**: `\[([^\]]+)\]\(([^)]+)\)`
- **Extraction**: Link text, link URL
- **Metadata**: Link type, link scope

#### 2.2 External Links
```markdown
[External Link](https://example.com)
[External Link](http://example.com)
[External Link](mailto:email@example.com)
```

**Parsing Rules**:
- **Pattern**: `\[([^\]]+)\]\((https?://[^)]+)\)`
- **Extraction**: Link text, link URL
- **Metadata**: Link type, link protocol

#### 2.3 Links with Tags
```markdown
[Link Text](./file.md) #tag1 #tag2
[External Link](https://example.com) #example
```

**Parsing Rules**:
- **Pattern**: `\[([^\]]+)\]\(([^)]+)\)\s+(#\w+(?:\s+#\w+)*)`
- **Extraction**: Link text, link URL, tags
- **Metadata**: Link type, tag count, tag types

### 3. Code Elements

#### 3.1 Inline Code
```markdown
This is `inline code` text.
```

**Parsing Rules**:
- **Pattern**: `\`([^`]+)\``
- **Extraction**: Code text
- **Metadata**: Code type, code scope

#### 3.2 Code Blocks
```markdown
```typescript
const code = 'example';
```
```

**Parsing Rules**:
- **Pattern**: `^```(\w*)\n([\s\S]*?)\n```$`
- **Extraction**: Language, code content
- **Metadata**: Code language, code type

#### 3.3 Code Blocks with Tags
```markdown
```typescript #example
const code = 'example';
```
```

**Parsing Rules**:
- **Pattern**: `^```(\w*)\s+(#\w+(?:\s+#\w+)*)\n([\s\S]*?)\n```$`
- **Extraction**: Language, tags, code content
- **Metadata**: Code language, tag count, tag types

### 4. List Elements

#### 4.1 Unordered Lists
```markdown
- Item 1
- Item 2
  - Nested Item 1
  - Nested Item 2
```

**Parsing Rules**:
- **Pattern**: `^(\s*)([-*+])\s+(.+)$`
- **Extraction**: Indentation, marker, text
- **Metadata**: List type, nesting level

#### 4.2 Ordered Lists
```markdown
1. Item 1
2. Item 2
   1. Nested Item 1
   2. Nested Item 2
```

**Parsing Rules**:
- **Pattern**: `^(\s*)(\d+\.)\s+(.+)$`
- **Extraction**: Indentation, number, text
- **Metadata**: List type, nesting level

#### 4.3 Lists with Tags
```markdown
- Item 1 #tag1
- Item 2 #tag2 #tag3
```

**Parsing Rules**:
- **Pattern**: `^(\s*)([-*+]|\d+\.)\s+(.+?)\s+(#\w+(?:\s+#\w+)*)$`
- **Extraction**: Indentation, marker, text, tags
- **Metadata**: List type, tag count, tag types

### 5. Table Elements

#### 5.1 Table Structure
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
```

**Parsing Rules**:
- **Pattern**: `^\|(.+)\|$`
- **Extraction**: Table row, cells
- **Metadata**: Table type, cell count

#### 5.2 Tables with Tags
```markdown
| Header 1 | Header 2 | Header 3 | #table
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   | #data
```

**Parsing Rules**:
- **Pattern**: `^\|(.+)\|\s+(#\w+(?:\s+#\w+)*)$`
- **Extraction**: Table row, cells, tags
- **Metadata**: Table type, tag count, tag types

## Tag Context Parsing

### 1. Inline Tag Context

#### 1.1 Sentence Context
```markdown
This is a sentence with #inline-tag in the middle.
```

**Parsing Rules**:
- **Pattern**: `([^#]*?)(#\w+)([^#]*?)`
- **Extraction**: Prefix text, tag, suffix text
- **Metadata**: Context type, tag position

#### 1.2 Paragraph Context
```markdown
This is a paragraph with multiple #tags and #more-tags.
```

**Parsing Rules**:
- **Pattern**: `([^#]*?)(#\w+)([^#]*?)(#\w+)([^#]*?)`
- **Extraction**: Text segments, tags
- **Metadata**: Context type, tag count, tag positions

### 2. Heading Tag Context

#### 2.1 Heading with Tags
```markdown
## My Heading #tag1 #tag2
```

**Parsing Rules**:
- **Pattern**: `^(#{1,6})\s+(.+?)\s+(#\w+(?:\s+#\w+)*)$`
- **Extraction**: Heading level, heading text, tags
- **Metadata**: Heading depth, tag count, tag types

#### 2.2 Heading Context Analysis
```markdown
## My Heading #tag1 #tag2

This is content under the heading.
```

**Parsing Rules**:
- **Pattern**: `^(#{1,6})\s+(.+?)\s+(#\w+(?:\s+#\w+)*)\s*\n\n(.+)`
- **Extraction**: Heading level, heading text, tags, content
- **Metadata**: Heading depth, tag count, content length

### 3. Link Tag Context

#### 3.1 Link with Tags
```markdown
[Link Text](./file.md) #tag1 #tag2
```

**Parsing Rules**:
- **Pattern**: `\[([^\]]+)\]\(([^)]+)\)\s+(#\w+(?:\s+#\w+)*)`
- **Extraction**: Link text, link URL, tags
- **Metadata**: Link type, tag count, tag types

#### 3.2 Link Context Analysis
```markdown
This is a paragraph with [Link Text](./file.md) #tag1 #tag2 in the middle.
```

**Parsing Rules**:
- **Pattern**: `([^[]*?)\[([^\]]+)\]\(([^)]+)\)\s+(#\w+(?:\s+#\w+)*)([^[]*?)`
- **Extraction**: Prefix text, link text, link URL, tags, suffix text
- **Metadata**: Context type, link type, tag count

## Parsing Configuration

### 1. TypeScript/JavaScript Configuration

```typescript
interface TypeScriptParsingConfig {
  // Class parsing
  classPattern: string;
  methodPattern: string;
  propertyPattern: string;
  
  // Interface parsing
  interfacePattern: string;
  interfacePropertyPattern: string;
  interfaceMethodPattern: string;
  
  // Function parsing
  functionPattern: string;
  arrowFunctionPattern: string;
  
  // Type parsing
  typePattern: string;
  genericPattern: string;
  
  // Enum parsing
  enumPattern: string;
  enumValuePattern: string;
  
  // Import/Export parsing
  importPattern: string;
  exportPattern: string;
}
```

### 2. Markdown Configuration

```typescript
interface MarkdownParsingConfig {
  // Heading parsing
  headingPattern: string;
  headingWithTagsPattern: string;
  
  // Link parsing
  linkPattern: string;
  linkWithTagsPattern: string;
  
  // Code parsing
  inlineCodePattern: string;
  codeBlockPattern: string;
  codeBlockWithTagsPattern: string;
  
  // List parsing
  unorderedListPattern: string;
  orderedListPattern: string;
  listWithTagsPattern: string;
  
  // Table parsing
  tablePattern: string;
  tableWithTagsPattern: string;
}
```

### 3. Tag Context Configuration

```typescript
interface TagContextConfig {
  // Inline tag context
  inlineTagPattern: string;
  sentenceContextPattern: string;
  paragraphContextPattern: string;
  
  // Heading tag context
  headingTagPattern: string;
  headingContextPattern: string;
  
  // Link tag context
  linkTagPattern: string;
  linkContextPattern: string;
}
```

## Quality Assurance

### 1. Parsing Accuracy

#### 1.1 Pattern Matching Accuracy
- **Target**: 95% 이상의 패턴 매칭 정확도
- **Measurement**: 정규식 패턴 매칭 성공률
- **Validation**: 수동 검증을 통한 정확도 확인

#### 1.2 Context Analysis Accuracy
- **Target**: 90% 이상의 컨텍스트 분석 정확도
- **Measurement**: 컨텍스트 분석 성공률
- **Validation**: 의미적 분석을 통한 정확도 확인

### 2. Performance Metrics

#### 2.1 Parsing Speed
- **Target**: 1000개 파일/초 이상의 파싱 속도
- **Measurement**: 파일당 평균 파싱 시간
- **Optimization**: 정규식 최적화, 캐싱 전략

#### 2.2 Memory Usage
- **Target**: 100MB 이하의 메모리 사용량
- **Measurement**: 파싱 중 메모리 사용량
- **Optimization**: 스트리밍 파싱, 메모리 정리

### 3. Error Handling

#### 3.1 Pattern Errors
- **Fallback**: 패턴 매칭 실패 시 대체 방법
- **Recovery**: 오류 발생 시 복구 전략
- **Logging**: 오류 로깅 및 모니터링

#### 3.2 Context Errors
- **Validation**: 컨텍스트 분석 결과 검증
- **Correction**: 오류 수정 제안
- **Feedback**: 사용자 피드백 수집

## Extensibility

### 1. Custom Patterns

#### 1.1 User-defined Patterns
- **Configuration**: 사용자 정의 패턴 설정
- **Validation**: 패턴 유효성 검증
- **Testing**: 패턴 테스트 및 검증

#### 1.2 Pattern Libraries
- **Standard Patterns**: 표준 패턴 라이브러리
- **Community Patterns**: 커뮤니티 패턴 라이브러리
- **Custom Libraries**: 사용자 정의 패턴 라이브러리

### 2. Language Support

#### 2.1 Multi-language Support
- **Unicode**: 유니코드 문자 지원
- **Encoding**: 다양한 인코딩 지원
- **Localization**: 지역화된 패턴 지원

#### 2.2 Framework Support
- **React**: React 컴포넌트 파싱
- **Vue**: Vue 컴포넌트 파싱
- **Angular**: Angular 컴포넌트 파싱

### 3. Integration Points

#### 3.1 IDE Integration
- **VS Code**: VS Code 확장 지원
- **IntelliJ**: IntelliJ 플러그인 지원
- **Sublime**: Sublime Text 패키지 지원

#### 3.2 CI/CD Integration
- **GitHub Actions**: GitHub Actions 워크플로우
- **Jenkins**: Jenkins 파이프라인
- **GitLab CI**: GitLab CI/CD 파이프라인
