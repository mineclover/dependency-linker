# Query Specification

## 개요
Dependency Linker의 쿼리 시스템 정의: Tree-sitter 기반 AST 쿼리, 구현 스펙, 선택 가능한 쿼리 구성

---

## 1. 쿼리 시스템 아키텍처

### 1.1 쿼리 계층 구조
```
Query Engine (최상위)
├── Tree-sitter Query Engine (AST 파싱)
├── Query Registry (쿼리 등록/관리)
├── Query Processor (결과 처리)
└── Query Bridge (연결 계층)
```

### 1.2 쿼리 실행 흐름
```
Source Code → Tree-sitter Parser → AST → Query Engine → Query Results → Symbol Extraction
```

---

## 2. 구현된 쿼리 스펙

### 2.1 TypeScript Import 쿼리

#### 2.1.1 Import Sources 쿼리
```typescript
"ts-import-sources": `
    (import_statement
        source: (string) @source)
`
```
- **목적**: 모든 import 문의 소스 경로 추출
- **결과**: `@source` 캡처로 소스 경로 반환
- **예시**: `"react"`, `"../../utils/helpers"`

#### 2.1.2 Named Imports 쿼리
```typescript
"ts-named-imports": `
    (import_statement
        (import_clause
            (named_imports
                (import_specifier
                    (identifier) @name))))
`
```
- **목적**: 네임드 import의 심볼명 추출
- **결과**: `@name` 캡처로 import된 심볼명 반환
- **예시**: `{ useState, useEffect }` → `useState`, `useEffect`

#### 2.1.3 Default Imports 쿼리
```typescript
"ts-default-imports": `
    (import_statement
        (import_clause
            (identifier) @import_name)
        source: (string) @source)
`
```
- **목적**: 기본 import의 심볼명과 소스 추출
- **결과**: `@import_name`, `@source` 캡처
- **예시**: `import React from "react"` → `React`, `"react"`

#### 2.1.4 Type Imports 쿼리
```typescript
"ts-type-imports": `
    (import_statement
        "type"
        (import_clause
            (named_imports
                (import_specifier
                    (identifier) @name)))
        source: (string) @source)
`
```
- **목적**: 타입 전용 import 추출
- **결과**: `@name`, `@source` 캡처
- **예시**: `import type { User } from "./types"` → `User`, `"./types"`

### 2.2 TypeScript Export 쿼리

#### 2.2.1 Export Declarations 쿼리
```typescript
"ts-export-declarations": `
    (export_statement
        (lexical_declaration
            (variable_declarator
                name: (identifier) @export_name))) @export_statement
`
```
- **목적**: export된 변수/상수 선언 추출
- **결과**: `@export_name`, `@export_statement` 캡처
- **예시**: `export const myVar = "value"` → `myVar`

#### 2.2.2 Export Assignments 쿼리
```typescript
"ts-export-assignments": `
    (export_statement "default") @default_export
`
```
- **목적**: default export 추출
- **결과**: `@default_export` 캡처
- **예시**: `export default MyComponent` → default export 식별

### 2.3 TypeScript Symbol Definition 쿼리

#### 2.3.1 Class Definitions 쿼리
```typescript
"ts-class-definitions": `
    (class_declaration
        name: (type_identifier) @class_name
        type_parameters: (type_parameters)? @type_params
        (class_heritage)? @heritage
        body: (class_body) @class_body) @class
`
```
- **목적**: 클래스 정의 추출
- **결과**: 클래스명, 제네릭, 상속 정보
- **예시**: `class MyClass<T> extends BaseClass` → `MyClass`, `T`, `BaseClass`

#### 2.3.2 Interface Definitions 쿼리
```typescript
"ts-interface-definitions": `
    (interface_declaration
        name: (type_identifier) @interface_name
        type_parameters: (type_parameters)? @type_params
        body: (interface_body) @interface_body) @interface
`
```
- **목적**: 인터페이스 정의 추출
- **결과**: 인터페이스명, 제네릭, 본문
- **예시**: `interface IUser<T>` → `IUser`, `T`

#### 2.3.3 Function Definitions 쿼리
```typescript
"ts-function-definitions": `
    (function_declaration
        name: (identifier) @function_name
        type_parameters: (type_parameters)? @type_params
        parameters: (formal_parameters) @params
        return_type: (type_annotation)? @return_type
        body: (statement_block) @function_body) @function
`
```
- **목적**: 함수 정의 추출
- **결과**: 함수명, 매개변수, 반환 타입
- **예시**: `function myFunc(param: string): number` → `myFunc`, `param`, `number`

#### 2.3.4 Method Definitions 쿼리
```typescript
"ts-method-definitions": `
    (method_definition
        name: [
            (property_identifier) @method_name
            (computed_property_name) @computed_name
        ]
        parameters: (formal_parameters) @params
        return_type: (type_annotation)? @return_type
        body: (statement_block) @method_body) @method
`
```
- **목적**: 메서드 정의 추출
- **결과**: 메서드명, 매개변수, 반환 타입
- **예시**: `myMethod(param: string): void` → `myMethod`, `param`, `void`

#### 2.3.5 Type Definitions 쿼리
```typescript
"ts-type-definitions": `
    (type_alias_declaration
        name: (type_identifier) @type_name
        type_parameters: (type_parameters)? @type_params
        value: (_) @type_value) @type_def
`
```
- **목적**: 타입 별칭 정의 추출
- **결과**: 타입명, 제네릭, 타입 값
- **예시**: `type MyType<T> = string | number` → `MyType`, `T`, `string | number`

#### 2.3.6 Enum Definitions 쿼리
```typescript
"ts-enum-definitions": `
    (enum_declaration
        name: (identifier) @enum_name
        body: (enum_body) @enum_body) @enum
`
```
- **목적**: 열거형 정의 추출
- **결과**: 열거형명, 본문
- **예시**: `enum Color { Red, Green, Blue }` → `Color`

#### 2.3.7 Variable Definitions 쿼리
```typescript
"ts-variable-definitions": `
    (lexical_declaration
        (variable_declarator
            name: (identifier) @var_name
            type: (type_annotation)? @var_type
            value: (_)? @var_value)) @variable
`
```
- **목적**: 변수 선언 추출
- **결과**: 변수명, 타입, 값
- **예시**: `const myVar: string = "hello"` → `myVar`, `string`, `"hello"`

#### 2.3.8 Arrow Function Definitions 쿼리
```typescript
"ts-arrow-function-definitions": `
    (lexical_declaration
        (variable_declarator
            name: (identifier) @function_name
            value: (arrow_function
                parameters: (_) @params
                return_type: (type_annotation)? @return_type
                body: (_) @function_body))) @arrow_function
`
```
- **목적**: 화살표 함수 정의 추출
- **결과**: 함수명, 매개변수, 반환 타입, 본문
- **예시**: `const myFunc = (param: string): number => { }` → `myFunc`, `param`, `number`

#### 2.3.9 Property Definitions 쿼리
```typescript
"ts-property-definitions": `
    (public_field_definition
        name: (property_identifier) @property_name
        type: (type_annotation)? @property_type
        value: (_)? @property_value) @property
`
```
- **목적**: 클래스 프로퍼티 정의 추출
- **결과**: 프로퍼티명, 타입, 값
- **예시**: `private myProperty: string;` → `myProperty`, `string`

### 2.4 TypeScript Dependency Tracking 쿼리

#### 2.4.1 Call Expressions 쿼리
```typescript
"ts-call-expressions": `
    (call_expression
        function: [
            (identifier) @function_name
            (super) @super_call
            (member_expression
                object: (_) @object
                property: (property_identifier) @method_name)
        ]
        arguments: (arguments) @args) @call
`
```
- **목적**: 함수/메서드 호출 추출
- **결과**: 함수명, 객체, 메서드명, 인수
- **예시**: `obj.method(arg1, arg2)` → `obj`, `method`, `arg1, arg2`

#### 2.4.2 New Expressions 쿼리
```typescript
"ts-new-expressions": `
    (new_expression
        constructor: [
            (identifier) @class_name
            (member_expression
                property: (property_identifier) @class_name)
        ]
        arguments: (arguments)? @args) @new_expr
`
```
- **목적**: 클래스 인스턴스화 추출
- **결과**: 클래스명, 인수
- **예시**: `new MyClass(arg1)` → `MyClass`, `arg1`

#### 2.4.3 Member Expressions 쿼리
```typescript
"ts-member-expressions": `
    (member_expression
        object: (_) @object
        property: (property_identifier) @property_name) @member_access
`
```
- **목적**: 속성 접근 추출
- **결과**: 객체, 속성명
- **예시**: `obj.property` → `obj`, `property`

#### 2.4.4 Type References 쿼리
```typescript
"ts-type-references": `
    (type_annotation
        [
            (type_identifier) @type_name
            (generic_type
                name: (type_identifier) @type_name)
        ]) @type_ref
`
```
- **목적**: 타입 참조 추출
- **결과**: 타입명
- **예시**: `param: SomeType<T>` → `SomeType`

#### 2.4.5 Extends Clause 쿼리
```typescript
"ts-extends-clause": `
    (class_heritage
        (extends_clause
            value: [
                (identifier) @base_class
                (member_expression
                    property: (property_identifier) @base_class)
            ])) @extends
`
```
- **목적**: 상속 관계 추출
- **결과**: 기본 클래스명
- **예시**: `class MyClass extends BaseClass` → `BaseClass`

#### 2.4.6 Implements Clause 쿼리
```typescript
"ts-implements-clause": `
    (class_heritage
        (implements_clause
            (type_identifier) @interface_name)) @implements
`
```
- **목적**: 인터페이스 구현 관계 추출
- **결과**: 인터페이스명
- **예시**: `class MyClass implements IInterface` → `IInterface`

---

## 3. 쿼리 선택 및 구성

### 3.1 쿼리 카테고리

#### 3.1.1 기본 분석 쿼리 (Basic Analysis)
- `ts-import-sources`: Import 소스 추출
- `ts-export-declarations`: Export 선언 추출
- `ts-export-assignments`: Export 할당 추출

#### 3.1.2 심볼 정의 쿼리 (Symbol Definitions)
- `ts-class-definitions`: 클래스 정의
- `ts-interface-definitions`: 인터페이스 정의
- `ts-function-definitions`: 함수 정의
- `ts-method-definitions`: 메서드 정의
- `ts-type-definitions`: 타입 정의
- `ts-enum-definitions`: 열거형 정의
- `ts-variable-definitions`: 변수 정의
- `ts-arrow-function-definitions`: 화살표 함수 정의
- `ts-property-definitions`: 프로퍼티 정의

#### 3.1.3 의존성 추적 쿼리 (Dependency Tracking)
- `ts-call-expressions`: 함수 호출
- `ts-new-expressions`: 클래스 인스턴스화
- `ts-member-expressions`: 속성 접근
- `ts-type-references`: 타입 참조
- `ts-extends-clause`: 상속 관계
- `ts-implements-clause`: 구현 관계

#### 3.1.4 고급 분석 쿼리 (Advanced Analysis)
- `ts-named-imports`: 네임드 import
- `ts-default-imports`: 기본 import
- `ts-type-imports`: 타입 import

### 3.2 쿼리 우선순위

#### 3.2.1 필수 쿼리 (Required)
- `ts-import-sources`: 의존성 분석 필수
- `ts-export-declarations`: 심볼 추출 필수

#### 3.2.2 권장 쿼리 (Recommended)
- `ts-class-definitions`: 객체지향 분석
- `ts-function-definitions`: 함수형 분석
- `ts-call-expressions`: 호출 관계 분석

#### 3.2.3 선택적 쿼리 (Optional)
- `ts-type-definitions`: 타입 시스템 분석
- `ts-enum-definitions`: 열거형 분석
- `ts-property-definitions`: 프로퍼티 분석

---

## 4. Namespace 기반 쿼리 구성

### 4.1 Namespace Config 확장

```typescript
export interface NamespaceConfig {
    // 기존 필드들...
    
    /** 쿼리 구성 */
    queries: {
        /** 활성화된 쿼리 카테고리 */
        categories: QueryCategory[];
        /** 커스텀 쿼리 설정 */
        custom: {
            enabled: boolean;
            queryIds: string[];
        };
        /** 쿼리 실행 옵션 */
        options: {
            enableParallelExecution: boolean;
            enableCaching: boolean;
            maxConcurrency: number;
        };
    };
}

export type QueryCategory = 
    | "basic-analysis"
    | "symbol-definitions" 
    | "dependency-tracking"
    | "advanced-analysis";
```

### 4.2 쿼리 매핑

```typescript
export const QUERY_CATEGORY_MAPPING: Record<QueryCategory, string[]> = {
    "basic-analysis": [
        "ts-import-sources",
        "ts-export-declarations", 
        "ts-export-assignments"
    ],
    "symbol-definitions": [
        "ts-class-definitions",
        "ts-interface-definitions",
        "ts-function-definitions",
        "ts-method-definitions",
        "ts-type-definitions",
        "ts-enum-definitions",
        "ts-variable-definitions",
        "ts-arrow-function-definitions",
        "ts-property-definitions"
    ],
    "dependency-tracking": [
        "ts-call-expressions",
        "ts-new-expressions",
        "ts-member-expressions",
        "ts-type-references",
        "ts-extends-clause",
        "ts-implements-clause"
    ],
    "advanced-analysis": [
        "ts-named-imports",
        "ts-default-imports",
        "ts-type-imports"
    ]
};
```

---

## 5. 성능 최적화

### 5.1 쿼리 실행 최적화
- **병렬 실행**: 독립적인 쿼리들을 동시 실행
- **캐싱**: 동일한 파일에 대한 중복 쿼리 방지
- **배치 처리**: 여러 파일을 배치로 처리

### 5.2 메모리 관리
- **쿼리 결과 캐싱**: LRU 캐시로 메모리 사용량 제한
- **AST 재사용**: 동일한 파일의 여러 쿼리에서 AST 재사용
- **가비지 컬렉션**: 사용하지 않는 쿼리 결과 정리

### 5.3 성능 모니터링
- **쿼리 실행 시간**: 각 쿼리의 실행 시간 측정
- **메모리 사용량**: 쿼리 실행 중 메모리 사용량 추적
- **캐시 히트율**: 캐시 효율성 측정

---

## 6. 확장성

### 6.1 새로운 쿼리 추가
1. **쿼리 정의**: Tree-sitter 쿼리 문자열 작성
2. **프로세서 구현**: 쿼리 결과 처리 로직
3. **등록**: Query Registry에 쿼리 등록
4. **테스트**: 쿼리 정확성 검증

### 6.2 새로운 언어 지원
1. **파서 설정**: Tree-sitter 언어 파서 등록
2. **쿼리 작성**: 해당 언어의 AST 패턴에 맞는 쿼리 작성
3. **프로세서 구현**: 언어별 결과 처리 로직
4. **통합**: 기존 쿼리 시스템과 통합

---

## 7. 검증 및 테스트

### 7.1 쿼리 정확성 검증
- **단위 테스트**: 각 쿼리의 정확성 검증
- **통합 테스트**: 전체 쿼리 시스템 검증
- **성능 테스트**: 대용량 파일에서의 성능 검증

### 7.2 호환성 검증
- **버전 호환성**: Tree-sitter 버전 호환성
- **언어 호환성**: TypeScript/JavaScript 버전 호환성
- **플랫폼 호환성**: 다양한 운영체제에서의 동작

---

## 8. 참조

### 8.1 구현 파일
- `src/queries/typescript/tree-sitter-queries.ts`: 쿼리 정의
- `src/queries/typescript/exports.ts`: Export 쿼리 프로세서
- `src/queries/typescript/imports.ts`: Import 쿼리 프로세서
- `src/core/QueryBridge.ts`: 쿼리 브리지
- `src/core/QueryEngine.ts`: 쿼리 엔진

### 8.2 관련 문서
- [Core Specification](./CORE-SPECIFICATION.md): 핵심 스펙
- [API Reference](./API-REFERENCE-COMPLETE.md): API 문서
- [User Guide](./USER-GUIDE-COMPLETE.md): 사용자 가이드
