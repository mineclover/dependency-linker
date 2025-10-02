# Namespace Management

**Category**: Core Feature
**Commands**: `list-namespaces`, `create-namespace`, `delete-namespace`, `list-files`
**Status**: ✅ Production Ready

---

## 📋 Overview

네임스페이스 관리 기능은 프로젝트의 파일들을 목적별로 조직화하고 관리합니다. 각 네임스페이스는 독립적인 파일 그룹을 나타내며, 서로 다른 분석 대상과 관리 목적을 가집니다.

### Key Concepts

**네임스페이스(Namespace)**:
- 파일들의 논리적 그룹
- 목적 기반 분리 (source, tests, docs, configs)
- 독립적인 filePatterns와 excludePatterns

**분리 원칙**:
> 네임스페이스는 분석 대상과 관리 목적이 다르기 때문에 분리하지만,
> 의존성 자체는 같은 차원에 존재합니다.

---

## 🛠️ Commands

### `list-namespaces`

설정된 모든 네임스페이스 목록을 조회합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js list-namespaces [options]
```

**Options**:
- `-c, --config <path>` - Config file path (default: deps.config.json)

**Example**:
```bash
node dist/cli/namespace-analyzer.js list-namespaces
```

**Output**:
```
📋 Available Namespaces
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. source (default)
  2. tests
  3. configs
  4. docs
```

---

### `create-namespace <name>`

새로운 네임스페이스를 생성합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js create-namespace <name> [options]
```

**Options**:
- `-c, --config <path>` - Config file path
- `-p, --patterns <patterns...>` - File patterns to include
- `-e, --exclude <patterns...>` - File patterns to exclude
- `-d, --description <text>` - Namespace description

**Example**:
```bash
# Integration tests 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace integration-tests \
  --patterns "tests/integration/**/*.ts" \
  --exclude "**/*.skip.ts" \
  --description "Integration test files"

# API 문서 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace api-docs \
  --patterns "docs/api/**/*.md" \
  --description "API documentation"
```

**Output**:
```
✅ Namespace 'integration-tests' created successfully
```

**Config Update**:
```json
{
  "namespaces": {
    "integration-tests": {
      "filePatterns": ["tests/integration/**/*.ts"],
      "excludePatterns": ["**/*.skip.ts"],
      "description": "Integration test files"
    }
  }
}
```

---

### `delete-namespace <name>`

네임스페이스를 삭제합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js delete-namespace <name> [options]
```

**Options**:
- `-c, --config <path>` - Config file path

**Example**:
```bash
node dist/cli/namespace-analyzer.js delete-namespace integration-tests
```

**Output**:
```
✅ Namespace 'integration-tests' deleted
```

**⚠️ Warning**:
- 네임스페이스 삭제는 설정만 제거합니다
- GraphDB의 기존 데이터는 삭제되지 않습니다
- 필요시 GraphDB를 수동으로 초기화하세요

---

### `list-files <namespace>`

네임스페이스에 포함된 파일 목록을 조회합니다.

**Syntax**:
```bash
node dist/cli/namespace-analyzer.js list-files <namespace> [options]
```

**Options**:
- `--cwd <path>` - Working directory
- `-c, --config <path>` - Config file path

**Example**:
```bash
# source 네임스페이스 파일 목록
node dist/cli/namespace-analyzer.js list-files source

# tests 네임스페이스 파일 목록
node dist/cli/namespace-analyzer.js list-files tests
```

**Output**:
```
📁 Files in namespace 'source'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 76 file(s):

  src/api/analysis.ts
  src/core/QueryEngine.ts
  src/database/GraphDatabase.ts
  ...
  src/utils/helpers.ts
```

---

## 🏗️ Architecture

### Namespace Configuration

**deps.config.json**:
```json
{
  "default": "source",
  "namespaces": {
    "source": {
      "filePatterns": [
        "src/**/*.ts",
        "src/**/*.tsx"
      ],
      "excludePatterns": [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/__tests__/**"
      ],
      "description": "Source code files"
    },
    "tests": {
      "filePatterns": [
        "tests/**/*.ts",
        "**/*.test.ts",
        "**/*.spec.ts"
      ],
      "excludePatterns": [
        "**/*.skip.ts"
      ],
      "description": "Test files"
    },
    "configs": {
      "filePatterns": [
        "*.config.js",
        "*.config.json",
        ".eslintrc.js",
        "tsconfig.json"
      ],
      "description": "Configuration files"
    },
    "docs": {
      "filePatterns": [
        "docs/**/*.md",
        "*.md"
      ],
      "excludePatterns": [
        "node_modules/**"
      ],
      "description": "Documentation files"
    }
  }
}
```

### Pattern Matching

**Glob Pattern Support**:
- `**/*` - 모든 서브디렉토리
- `*.ts` - 특정 확장자
- `src/**/*.{ts,tsx}` - 여러 확장자
- `!**/*.test.ts` - 제외 패턴 (excludePatterns 사용 권장)

**Example Patterns**:
```json
{
  "filePatterns": [
    "src/**/*.ts",           // src 하위 모든 .ts 파일
    "src/**/*.tsx",          // src 하위 모든 .tsx 파일
    "lib/index.ts"           // 특정 파일
  ],
  "excludePatterns": [
    "**/*.test.ts",          // 모든 테스트 파일 제외
    "**/__tests__/**",       // __tests__ 디렉토리 제외
    "**/node_modules/**"     // node_modules 제외
  ]
}
```

---

## 📊 Data Structures

### NamespaceConfig

```typescript
interface NamespaceConfig {
  filePatterns: string[];       // Include patterns
  excludePatterns?: string[];   // Exclude patterns
  description?: string;         // Human-readable description
}
```

### ConfigFile

```typescript
interface ConfigFile {
  namespaces: Record<string, NamespaceConfig>;
  default?: string;             // Default namespace to use
}
```

### NamespaceWithFiles

```typescript
interface NamespaceWithFiles {
  namespace: string;            // Namespace name
  metadata: NamespaceConfig;    // Namespace configuration
  files: string[];              // Matched file paths
  fileCount: number;            // Number of matched files
}
```

---

## 🎯 Use Cases

### Use Case 1: 프로젝트 초기 설정

**Scenario**: 새 프로젝트에 네임스페이스 구조 설정

```bash
# 1. 기본 네임스페이스 확인
node dist/cli/namespace-analyzer.js list-namespaces

# 2. 테스트 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace tests \
  --patterns "tests/**/*.ts" "**/*.test.ts" \
  --description "Test files"

# 3. 문서 네임스페이스 생성
node dist/cli/namespace-analyzer.js create-namespace docs \
  --patterns "docs/**/*.md" "*.md" \
  --description "Documentation"

# 4. 파일 확인
node dist/cli/namespace-analyzer.js list-files source
node dist/cli/namespace-analyzer.js list-files tests
```

---

### Use Case 2: 도메인별 분리

**Scenario**: 마이크로서비스 모노레포에서 서비스별 네임스페이스 생성

```bash
# auth 서비스
node dist/cli/namespace-analyzer.js create-namespace auth \
  --patterns "services/auth/**/*.ts" \
  --description "Authentication service"

# payment 서비스
node dist/cli/namespace-analyzer.js create-namespace payment \
  --patterns "services/payment/**/*.ts" \
  --description "Payment service"

# shared 라이브러리
node dist/cli/namespace-analyzer.js create-namespace shared \
  --patterns "libs/shared/**/*.ts" \
  --description "Shared utilities"

# 각 서비스별 분석
node dist/cli/namespace-analyzer.js analyze auth
node dist/cli/namespace-analyzer.js analyze payment
```

---

### Use Case 3: 레이어별 분리

**Scenario**: 클린 아키텍처 스타일로 레이어별 네임스페이스 구성

```bash
# Domain layer
node dist/cli/namespace-analyzer.js create-namespace domain \
  --patterns "src/domain/**/*.ts" \
  --description "Domain entities and business logic"

# Application layer
node dist/cli/namespace-analyzer.js create-namespace application \
  --patterns "src/application/**/*.ts" \
  --description "Use cases and application services"

# Infrastructure layer
node dist/cli/namespace-analyzer.js create-namespace infrastructure \
  --patterns "src/infrastructure/**/*.ts" \
  --description "External dependencies and implementations"

# Presentation layer
node dist/cli/namespace-analyzer.js create-namespace presentation \
  --patterns "src/presentation/**/*.ts" \
  --description "Controllers and UI"

# 크로스 레이어 의존성 확인
node dist/cli/namespace-analyzer.js analyze-all --show-cross
node dist/cli/namespace-analyzer.js cross-namespace --detailed
```

---

### Use Case 4: 동적 네임스페이스 관리

**Scenario**: 프로그래밍 API로 네임스페이스 동적 생성

```typescript
import { configManager } from "./src/namespace/ConfigManager";

// 네임스페이스 생성
await configManager.setNamespaceConfig(
  "api-routes",
  {
    filePatterns: ["src/routes/**/*.ts"],
    excludePatterns: ["**/*.test.ts"],
    description: "API route handlers"
  },
  "deps.config.json"
);

// 네임스페이스 목록 조회
const { namespaces, default: defaultNs } =
  await configManager.listNamespaces("deps.config.json");
console.log(`Namespaces: ${namespaces.join(", ")}`);

// 네임스페이스 파일 조회
const data = await configManager.getNamespaceWithFiles(
  "api-routes",
  "deps.config.json"
);
console.log(`Files in api-routes: ${data.fileCount}`);

// 네임스페이스 삭제
await configManager.deleteNamespace("api-routes", "deps.config.json");
```

---

## 🔧 Best Practices

### 1. 명확한 네임스페이스 목적

**좋은 예시**:
```json
{
  "source": { "description": "Production source code" },
  "tests": { "description": "Unit and integration tests" },
  "e2e": { "description": "End-to-end tests" },
  "docs": { "description": "Project documentation" }
}
```

**나쁜 예시**:
```json
{
  "stuff": { "description": "Various files" },
  "other": { "description": "Other stuff" }
}
```

---

### 2. 명시적인 패턴 사용

**좋은 예시**:
```json
{
  "filePatterns": [
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "excludePatterns": [
    "**/*.test.ts",
    "**/__mocks__/**"
  ]
}
```

**나쁜 예시**:
```json
{
  "filePatterns": ["**/*"],  // 너무 광범위
  "excludePatterns": []      // 제외 없음
}
```

---

### 3. 계층적 네임스페이스 구조

**좋은 구조**:
```
source/           # 메인 소스 코드
├─ domain/        # 도메인 로직
├─ application/   # 애플리케이션 로직
└─ infrastructure/# 인프라 구현

tests/            # 모든 테스트
├─ unit/          # 단위 테스트
├─ integration/   # 통합 테스트
└─ e2e/           # E2E 테스트

docs/             # 문서
```

**나쁜 구조**:
```
everything/       # 모든 것
random/           # 분류되지 않은 것
misc/             # 기타
```

---

### 4. 네임스페이스 간 경계 명확화

**설계 원칙**:
- `source` → `tests`: ❌ 금지 (프로덕션 코드가 테스트에 의존하면 안 됨)
- `tests` → `source`: ✅ 허용 (테스트는 프로덕션 코드를 테스트함)
- `docs` → `source`: ✅ 허용 (문서는 소스 코드 참조 가능)
- `source` → `docs`: ❌ 금지 (프로덕션 코드가 문서에 의존하면 안 됨)

**검증**:
```bash
# 크로스 네임스페이스 의존성 확인
node dist/cli/namespace-analyzer.js cross-namespace --detailed

# source → tests 의존성이 있다면 아키텍처 위반!
```

---

## ⚡ Performance

### Pattern Matching Performance

**Fast-Glob 성능**:
- 1,000 files: ~50ms
- 10,000 files: ~200ms
- 100,000 files: ~1s

**최적화 팁**:
- 구체적인 패턴 사용 (`src/**/*.ts` > `**/*`)
- 제외 패턴 활용 (`node_modules` 등)
- 캐싱 활용 (ConfigManager가 자동 처리)

---

## 🐛 Known Issues

### Issue 1: Glob Pattern Order

**Description**: filePatterns의 순서가 결과에 영향을 주지 않습니다.

**Workaround**: 모든 패턴이 OR 조건으로 평가됨

---

### Issue 2: Overlapping Patterns

**Description**: 여러 네임스페이스에 같은 파일이 매칭될 수 있습니다.

**Example**:
```json
{
  "source": { "filePatterns": ["src/**/*.ts"] },
  "tests": { "filePatterns": ["**/*.test.ts"] }
}
```
→ `src/utils.test.ts`가 두 네임스페이스에 모두 매칭됨

**Workaround**: excludePatterns로 명확히 분리
```json
{
  "source": {
    "filePatterns": ["src/**/*.ts"],
    "excludePatterns": ["**/*.test.ts"]
  }
}
```

---

## 🚀 Future Enhancements

### Planned Features

**Namespace Inheritance**:
```json
{
  "base": {
    "filePatterns": ["src/**/*.ts"]
  },
  "source": {
    "extends": "base",
    "excludePatterns": ["**/*.test.ts"]
  }
}
```

**Namespace Aliases**:
```json
{
  "namespaceAliases": {
    "src": "source",
    "test": "tests"
  }
}
```

**Validation Rules**:
```json
{
  "validationRules": {
    "noCrossDependencies": ["source → tests"],
    "requiredDependencies": ["tests → source"]
  }
}
```

---

## 📚 Related Documentation

- [Dependency Analysis](../dependency-analysis/) - 네임스페이스별 분석
- [Cross-Namespace](../cross-namespace/) - 네임스페이스 간 의존성
- [Context Documents](../context-documents/) - 네임스페이스 메타데이터

---

**Last Updated**: 2025-10-02
**Version**: 3.0.0
