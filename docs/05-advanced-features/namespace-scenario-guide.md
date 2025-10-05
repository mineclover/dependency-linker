# Namespace-Scenario Integration Guide

**Complete guide to using namespaces with scenario-based analysis for horizontal scalability.**

## 목차
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Configuration Guide](#configuration-guide)
- [Scenario Selection Strategy](#scenario-selection-strategy)
- [CLI Usage](#cli-usage)
- [Real-World Examples](#real-world-examples)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Namespace-Scenario Integration**은 네임스페이스가 분석 시나리오를 선택하여 수평적 확장을 실현하는 시스템입니다.

### 핵심 개념

```
새 분석 = Namespace 추가 + Scenario 조합 선택
```

**기존 방식** (수직적 확장):
- 새로운 분석 → 코드 수정 → 전체 재배포
- 모든 파일에 동일한 분석 적용
- 유연성 부족

**새로운 방식** (수평적 확장):
- 새로운 분석 → 설정 파일 수정만
- 네임스페이스별 최적화된 시나리오 조합
- 코드 변경 없이 확장

### 핵심 가치

1. **비용 최적화**
   - 문서 분석: `markdown-linking`만 실행
   - UI 분석: `symbol-dependency` + `file-dependency`
   - 백엔드: `basic-structure` + `symbol-dependency`

2. **맥락 기반 분석**
   - 같은 `.ts` 파일도 네임스페이스에 따라 다르게 분석
   - `frontend` namespace → React 관련 분석
   - `backend` namespace → 서버 로직 분석

3. **수평적 확장**
   - 새 분석 추가 = 코드 변경 없이 설정만으로
   ```json
   {
     "api": {
       "filePatterns": ["src/api/**/*.ts"],
       "scenarios": ["graphql-schema", "file-dependency"]
     }
   }
   ```

---

## Core Concepts

### Namespace

**파일 그룹의 논리적 단위**로, glob 패턴으로 정의됩니다.

```json
{
  "frontend": {
    "filePatterns": ["src/frontend/**/*.tsx", "src/frontend/**/*.ts"],
    "excludePatterns": ["**/*.test.*"],
    "description": "Frontend React application",
    "semanticTags": ["ui", "react", "production"]
  }
}
```

### Scenario

**재사용 가능한 분석 명세**로, 특정 유형의 코드 분석을 정의합니다.

**Built-in Scenarios**:
- `basic-structure`: 파일/디렉토리 노드 (모든 언어 지원, 기반)
- `file-dependency`: Import/require 추적 (TypeScript/JavaScript)
- `symbol-dependency`: 심볼 수준 의존성 (calls, instantiation, type refs)
- `markdown-linking`: 마크다운 링크 분석 (8가지 의존성 타입)

### Scenario Dependencies

**시나리오 간 의존성**:
- `extends`: 타입 상속 - 자식이 부모의 모든 타입 상속
- `requires`: 실행 순서 - 선행 시나리오 없이는 타입 상속 없음

```typescript
// symbol-dependency는 file-dependency를 extends
// → symbol-dependency 실행 시 file-dependency의 모든 타입 사용 가능
{
  id: 'symbol-dependency',
  extends: 'file-dependency',  // 타입 상속
  // ...
}

// 실행 순서: file-dependency → symbol-dependency
```

### Execution Order

**Topological Sort (Kahn's Algorithm)**로 시나리오 실행 순서 자동 계산:

```json
{
  "scenarios": ["symbol-dependency", "file-dependency", "basic-structure"]
}
```

**실행 순서**:
1. `basic-structure` (의존성 없음)
2. `file-dependency` (extends: basic-structure)
3. `symbol-dependency` (extends: file-dependency)

---

## Configuration Guide

### NamespaceConfig Structure

```typescript
interface NamespaceConfig {
  filePatterns: string[];           // 필수: 파일 패턴
  excludePatterns?: string[];       // 선택: 제외 패턴
  description?: string;             // 선택: 설명
  semanticTags?: string[];          // 선택: 시맨틱 태그
  scenarios?: string[];             // 선택: 시나리오 ID 배열 (기본값: ["basic-structure", "file-dependency"])
  scenarioConfig?: ScenarioConfigMap; // 선택: 시나리오별 설정
}

type ScenarioConfigMap = {
  [scenarioId: string]: Record<string, unknown>;
};
```

### Basic Configuration

**최소 구성** (기본 시나리오 사용):

```json
{
  "namespaces": {
    "frontend": {
      "filePatterns": ["src/frontend/**/*.tsx"],
      "description": "Frontend code"
    }
  }
}
```

**실행 시나리오**: `["basic-structure", "file-dependency"]` (자동)

### Advanced Configuration

**시나리오 명시 + 설정**:

```json
{
  "namespaces": {
    "backend": {
      "filePatterns": ["src/backend/**/*.ts"],
      "excludePatterns": ["**/*.test.ts"],
      "description": "Backend API",
      "semanticTags": ["backend", "api"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"],
      "scenarioConfig": {
        "symbol-dependency": {
          "trackCalls": true,
          "trackInstantiations": true,
          "trackTypeReferences": true,
          "trackExtends": true,
          "trackImplements": true
        }
      }
    }
  }
}
```

### Scenario Configuration Options

각 시나리오는 고유한 설정 옵션을 가질 수 있습니다:

**symbol-dependency**:
```json
{
  "symbol-dependency": {
    "trackCalls": true,             // 함수/메서드 호출 추적
    "trackInstantiations": true,    // 클래스 인스턴스화 추적
    "trackTypeReferences": true,    // 타입 참조 추적
    "trackExtends": true,           // 클래스 상속 추적
    "trackImplements": true         // 인터페이스 구현 추적
  }
}
```

**markdown-linking**:
```json
{
  "markdown-linking": {
    "extractHashtags": true,        // 해시태그 추출
    "extractHeadingSymbols": true   // 헤딩 심볼 추출
  }
}
```

---

## Scenario Selection Strategy

### By Project Type

**Monorepo** (여러 패키지):
```json
{
  "web": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "mobile": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "backend": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "shared": {
    "scenarios": ["basic-structure", "file-dependency"]
  },
  "docs": {
    "scenarios": ["markdown-linking"]
  }
}
```

**Layered Architecture** (계층형 아키텍처):
```json
{
  "presentation": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "application": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "domain": {
    "scenarios": ["basic-structure"]  // 순수성 유지: 외부 의존성 최소화
  },
  "infrastructure": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  }
}
```

**Multi-Framework** (다중 프레임워크):
```json
{
  "react": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "vue": {
    "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
  },
  "python": {
    "scenarios": ["basic-structure", "file-dependency"]
  },
  "docs": {
    "scenarios": ["markdown-linking"]
  }
}
```

### By Analysis Goal

**의존성 분석** (Dependency Analysis):
- `basic-structure` + `file-dependency` + `symbol-dependency`

**문서 분석** (Documentation Analysis):
- `markdown-linking`

**구조 분석만** (Structure Only):
- `basic-structure`

**경량 분석** (Lightweight):
- `basic-structure` + `file-dependency`

**전체 분석** (Comprehensive):
- 모든 관련 시나리오 조합

---

## CLI Usage

### Scenario 조회

**모든 시나리오 목록**:
```bash
node dist/cli/namespace-analyzer.js scenarios
```

**출력**:
```
Available scenarios:
- basic-structure: File/directory structure nodes for all languages
- file-dependency: Import/require dependency tracking for TypeScript/JavaScript
- symbol-dependency: Symbol-level dependency tracking (calls, instantiation, type refs)
- markdown-linking: Markdown link dependency extraction
```

**네임스페이스별 시나리오 확인**:
```bash
node dist/cli/namespace-analyzer.js scenarios <namespace>
```

**예시**:
```bash
node dist/cli/namespace-analyzer.js scenarios frontend
```

**출력**:
```
Namespace: frontend
Scenarios: basic-structure, file-dependency, symbol-dependency

Scenario Configurations:
  symbol-dependency:
    trackCalls: true
    trackInstantiations: true
```

### Namespace 생성 (시나리오 포함)

```bash
node dist/cli/namespace-analyzer.js create-namespace <name> \
  -p <pattern> \
  --scenarios <scenario1,scenario2> \
  --scenario-config '<json>'
```

**예시**:
```bash
node dist/cli/namespace-analyzer.js create-namespace docs \
  -p "docs/**/*.md" \
  --scenarios markdown-linking \
  --scenario-config '{"markdown-linking":{"extractHashtags":true}}'
```

### 분석 실행 (시나리오 오버라이드)

**네임스페이스별 분석**:
```bash
node dist/cli/namespace-analyzer.js analyze <namespace> \
  --scenarios <scenario1,scenario2> \
  --scenario-config '<json>'
```

**예시**:
```bash
node dist/cli/namespace-analyzer.js analyze frontend \
  --scenarios basic-structure,symbol-dependency \
  --scenario-config '{"symbol-dependency":{"trackCalls":true}}'
```

**전체 프로젝트 분석**:
```bash
node dist/cli/namespace-analyzer.js analyze-all
```

---

## Real-World Examples

### Example 1: Monorepo Configuration

**프로젝트 구조**:
```
monorepo/
├── packages/
│   ├── web/          # React web app
│   ├── mobile/       # React Native
│   ├── backend/      # Node.js API
│   └── shared/       # Shared utilities
├── docs/             # Documentation
└── tests/            # E2E tests
```

**설정** (`namespaces.json`):
```json
{
  "namespaces": {
    "web": {
      "filePatterns": ["packages/web/**/*.tsx", "packages/web/**/*.ts"],
      "excludePatterns": ["**/*.test.*"],
      "semanticTags": ["frontend", "react", "production"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"],
      "scenarioConfig": {
        "symbol-dependency": {
          "trackCalls": true,
          "trackInstantiations": true,
          "trackTypeReferences": true
        }
      }
    },
    "mobile": {
      "filePatterns": ["packages/mobile/**/*.tsx", "packages/mobile/**/*.ts"],
      "excludePatterns": ["**/*.test.*"],
      "semanticTags": ["mobile", "react-native", "production"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "backend": {
      "filePatterns": ["packages/backend/**/*.ts"],
      "excludePatterns": ["**/*.test.ts"],
      "semanticTags": ["backend", "api", "production"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"],
      "scenarioConfig": {
        "symbol-dependency": {
          "trackCalls": true,
          "trackInstantiations": true,
          "trackTypeReferences": true,
          "trackExtends": true,
          "trackImplements": true
        }
      }
    },
    "shared": {
      "filePatterns": ["packages/shared/**/*.ts"],
      "excludePatterns": ["**/*.test.ts"],
      "semanticTags": ["shared", "utilities"],
      "scenarios": ["basic-structure", "file-dependency"]
    },
    "docs": {
      "filePatterns": ["docs/**/*.md"],
      "semanticTags": ["documentation"],
      "scenarios": ["markdown-linking"],
      "scenarioConfig": {
        "markdown-linking": {
          "extractHashtags": true,
          "extractHeadingSymbols": true
        }
      }
    },
    "tests": {
      "filePatterns": ["tests/**/*.ts"],
      "semanticTags": ["test", "e2e"],
      "scenarios": ["basic-structure", "file-dependency"]
    }
  }
}
```

**사용 예시**:
```bash
# 전체 분석
node dist/cli/namespace-analyzer.js analyze-all

# 특정 네임스페이스만 분석
node dist/cli/namespace-analyzer.js analyze web

# 시나리오 오버라이드 (symbol-dependency만 실행)
node dist/cli/namespace-analyzer.js analyze web --scenarios symbol-dependency
```

### Example 2: Layered Architecture

**프로젝트 구조** (DDD/Clean Architecture):
```
src/
├── presentation/     # UI Layer
├── application/      # Use Cases
├── domain/           # Business Logic (Pure)
├── infrastructure/   # External Services
└── shared-kernel/    # Shared Domain
```

**설정**:
```json
{
  "namespaces": {
    "presentation": {
      "filePatterns": ["src/presentation/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "application": {
      "filePatterns": ["src/application/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "domain": {
      "filePatterns": ["src/domain/**/*.ts"],
      "scenarios": ["basic-structure"]  // 순수성 유지: 외부 의존성 없음
    },
    "infrastructure": {
      "filePatterns": ["src/infrastructure/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "shared-kernel": {
      "filePatterns": ["src/shared-kernel/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency"]
    }
  }
}
```

**의존성 규칙 검증**:
```bash
# Domain layer가 다른 layer를 의존하지 않는지 확인
node dist/cli/namespace-analyzer.js analyze domain

# Cross-namespace 의존성 확인
node dist/cli/namespace-analyzer.js analyze-all
```

### Example 3: Multi-Framework Project

**프로젝트 구조**:
```
project/
├── frontend/
│   ├── react/        # React app
│   ├── vue/          # Vue app
│   └── angular/      # Angular app
├── backend/
│   ├── nodejs/       # Node.js API
│   ├── python/       # Python service
│   └── go/           # Go microservice
├── shared/
│   └── types/        # Shared TypeScript types
└── docs/             # Documentation
```

**설정**:
```json
{
  "namespaces": {
    "react": {
      "filePatterns": ["frontend/react/**/*.tsx", "frontend/react/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "vue": {
      "filePatterns": ["frontend/vue/**/*.vue", "frontend/vue/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "angular": {
      "filePatterns": ["frontend/angular/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "nodejs": {
      "filePatterns": ["backend/nodejs/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    },
    "python": {
      "filePatterns": ["backend/python/**/*.py"],
      "scenarios": ["basic-structure", "file-dependency"]
    },
    "go": {
      "filePatterns": ["backend/go/**/*.go"],
      "scenarios": ["basic-structure", "file-dependency"]
    },
    "shared-types": {
      "filePatterns": ["shared/types/**/*.ts"],
      "scenarios": ["basic-structure", "file-dependency"]
    },
    "docs": {
      "filePatterns": ["docs/**/*.md"],
      "scenarios": ["markdown-linking"]
    }
  }
}
```

---

## Migration Guide

### 기존 설정에서 마이그레이션

**기존 설정** (scenarios 필드 없음):
```json
{
  "namespaces": {
    "frontend": {
      "filePatterns": ["src/**/*.ts"],
      "semanticTags": ["frontend"]
    }
  }
}
```

**새 설정** (scenarios 필드 추가):
```json
{
  "namespaces": {
    "frontend": {
      "filePatterns": ["src/**/*.ts"],
      "semanticTags": ["frontend"],
      "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
    }
  }
}
```

### 하위 호환성

**scenarios 필드 없음** → 자동으로 기본 시나리오 적용:
- `["basic-structure", "file-dependency"]`

따라서 기존 설정은 **수정 없이 그대로 작동**합니다.

### 점진적 마이그레이션 전략

1. **현재 설정 유지** (scenarios 필드 없음)
   - 기본 시나리오 자동 적용
   - 안정적 작동 보장

2. **일부 네임스페이스에만 scenarios 추가**
   ```json
   {
     "frontend": {
       "scenarios": ["basic-structure", "file-dependency", "symbol-dependency"]
     },
     "backend": {
       // scenarios 필드 없음 → 기본 시나리오 적용
     }
   }
   ```

3. **전체 네임스페이스에 scenarios 적용**
   - 모든 네임스페이스에 명시적 시나리오 지정
   - 최적화된 분석 실행

---

## Best Practices

### 1. 시나리오 선택 원칙

**필요한 것만 선택**:
- 불필요한 시나리오는 분석 시간만 증가
- 목적에 맞는 최소 시나리오 조합 사용

**의존성 고려**:
- `symbol-dependency`는 `file-dependency`를 extends
- 단독으로 `symbol-dependency`만 선택 가능 (file-dependency 자동 포함)

### 2. ScenarioConfig 활용

**선택적 추적**:
```json
{
  "symbol-dependency": {
    "trackCalls": true,
    "trackInstantiations": false,  // 인스턴스화 추적 비활성화
    "trackTypeReferences": true
  }
}
```

**마크다운 최적화**:
```json
{
  "markdown-linking": {
    "extractHashtags": true,        // 해시태그만 추출
    "extractHeadingSymbols": false  // 헤딩 심볼 제외
  }
}
```

### 3. 네임스페이스 설계

**명확한 경계**:
- 각 네임스페이스는 명확한 책임을 가져야 함
- 겹치는 파일 패턴 최소화

**시맨틱 태그 활용**:
```json
{
  "frontend": {
    "semanticTags": ["ui", "react", "production"]
  },
  "backend": {
    "semanticTags": ["api", "server", "production"]
  },
  "tests": {
    "semanticTags": ["test", "quality-assurance"]
  }
}
```

### 4. 성능 최적화

**excludePatterns 활용**:
```json
{
  "filePatterns": ["src/**/*.ts"],
  "excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/*.d.ts"
  ]
}
```

**적절한 시나리오 조합**:
- 문서 → `markdown-linking`만
- 타입 정의 → `basic-structure` + `file-dependency`
- 전체 분석 → 모든 시나리오

---

## Troubleshooting

### 시나리오가 실행되지 않음

**증상**: 분석 후 `scenariosExecuted`가 비어있음

**원인**:
1. 잘못된 시나리오 ID
2. 순환 의존성
3. 파일 패턴 불일치

**해결**:
```bash
# 1. 사용 가능한 시나리오 확인
node dist/cli/namespace-analyzer.js scenarios

# 2. 네임스페이스 설정 확인
node dist/cli/namespace-analyzer.js scenarios <namespace>

# 3. 파일 패턴 확인
node dist/cli/namespace-analyzer.js list-namespaces
```

### 잘못된 시나리오 ID 에러

**에러 메시지**:
```
Error: Invalid scenario IDs: invalid-scenario-name
```

**해결**:
```bash
# 올바른 시나리오 ID 확인
node dist/cli/namespace-analyzer.js scenarios

# 설정 수정
# scenarios: ["invalid-scenario-name"] → scenarios: ["basic-structure"]
```

### 시나리오 실행 순서 문제

**증상**: 시나리오가 예상과 다른 순서로 실행됨

**원인**: 의존성 기반 topological sort

**확인**:
```typescript
// scenariosExecuted 필드 확인
const result = await analyzer.analyzeNamespace("frontend", configPath);
console.log(result.scenariosExecuted);
// ["basic-structure", "file-dependency", "symbol-dependency"]
```

**참고**: 실행 순서는 의존성을 기반으로 자동 계산되므로, 입력 순서와 다를 수 있습니다.

### Cross-Namespace 의존성 미탐지

**증상**: 네임스페이스 간 의존성이 탐지되지 않음

**원인**:
1. 시나리오 선택 부족 (file-dependency 필요)
2. 파일 패턴 불일치
3. Import 경로 문제

**해결**:
```bash
# 1. 전체 분석 실행
node dist/cli/namespace-analyzer.js analyze-all

# 2. 시나리오 확인 (file-dependency 포함 여부)
node dist/cli/namespace-analyzer.js scenarios <namespace>

# 3. 파일 분석 여부 확인
# totalFiles, analyzedFiles 수 비교
```

---

## Related Documentation

- **[Scenario System](../features/scenario-system/)** - Scenario System 상세 설계 및 구현
- **[Pipeline Overview](pipeline-overview.md)** - 전체 분석 파이프라인
- **[Type System](type-system.md)** - Node/Edge 타입 시스템
- **[Semantic Tags](semantic-tags.md)** - 시맨틱 태그 가이드
- **[Configuration Examples](../examples/namespace-configs/README.md)** - 실전 설정 예제

---

**Last Updated**: 2025-10-04
**Version**: 1.0
**Status**: ✅ Complete
