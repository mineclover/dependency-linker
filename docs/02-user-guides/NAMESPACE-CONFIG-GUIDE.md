# Namespace Configuration Guide

## 개요

이 가이드는 dependency-linker 시스템에서 namespace 설정을 효과적으로 관리하는 방법을 설명합니다. namespace 기반 최적화와 성능 향상을 위한 설정 방법을 다룹니다.

## 목차

- [Namespace 기본 개념](#namespace-기본-개념)
- [Configuration 파일 구조](#configuration-파일-구조)
- [Namespace 설정 옵션](#namespace-설정-옵션)
- [성능 최적화 설정](#성능-최적화-설정)
- [CLI 명령어](#cli-명령어)
- [모범 사례](#모범-사례)
- [문제 해결](#문제-해결)

## Namespace 기본 개념

### 1. Namespace란?

Namespace는 프로젝트의 논리적 그룹을 나타내는 단위입니다. 각 namespace는 특정 목적과 설정을 가집니다.

```json
{
  "namespaces": {
    "source": {
      "description": "소스 코드 분석",
      "files": ["src/**/*.ts", "src/**/*.js"],
      "enabled": true
    },
    "docs": {
      "description": "문서 분석",
      "files": ["docs/**/*.md"],
      "enabled": true
    },
    "tests": {
      "description": "테스트 코드 분석",
      "files": ["tests/**/*.ts", "**/*.test.ts"],
      "enabled": false
    }
  }
}
```

### 2. Namespace의 장점

- **논리적 분리**: 프로젝트를 목적별로 분리하여 관리
- **성능 최적화**: namespace별로 최적화된 설정 적용
- **선택적 분석**: 필요한 namespace만 선택적으로 분석
- **확장성**: 새로운 namespace를 쉽게 추가

## Configuration 파일 구조

### 1. 기본 구조

```json
{
  "projectName": "my-project",
  "version": "1.0.0",
  "namespaces": {
    "namespace-name": {
      "description": "namespace 설명",
      "files": ["glob-pattern"],
      "enabled": true,
      "options": {
        "parallelProcessing": true,
        "maxConcurrency": 8,
        "batchSize": 50,
        "enableCache": true,
        "memoryLimit": 1024
      }
    }
  }
}
```

### 2. 고급 구조

```json
{
  "projectName": "my-project",
  "version": "1.0.0",
  "globalOptions": {
    "parallelProcessing": true,
    "maxConcurrency": 16,
    "batchSize": 100,
    "enableCache": true,
    "memoryLimit": 2048,
    "enablePerformanceMonitoring": true
  },
  "namespaces": {
    "source": {
      "description": "소스 코드 분석",
      "files": ["src/**/*.ts", "src/**/*.js"],
      "enabled": true,
      "options": {
        "parallelProcessing": true,
        "maxConcurrency": 8,
        "batchSize": 50,
        "enableCache": true,
        "memoryLimit": 1024,
        "queries": ["typescript", "javascript"],
        "rdf": true
      }
    },
    "docs": {
      "description": "문서 분석",
      "files": ["docs/**/*.md"],
      "enabled": true,
      "options": {
        "parallelProcessing": false,
        "maxConcurrency": 4,
        "batchSize": 20,
        "enableCache": true,
        "memoryLimit": 512,
        "queries": ["markdown"],
        "rdf": true,
        "tagAnalysis": true
      }
    }
  }
}
```

## Namespace 설정 옵션

### 1. 기본 옵션

#### `description`
- **타입**: `string`
- **설명**: namespace에 대한 설명
- **예시**: `"소스 코드 분석"`

#### `files`
- **타입**: `string[]`
- **설명**: 분석할 파일 패턴 (glob 패턴)
- **예시**: `["src/**/*.ts", "src/**/*.js"]`

#### `enabled`
- **타입**: `boolean`
- **설명**: namespace 활성화 여부
- **기본값**: `true`

### 2. 성능 옵션

#### `parallelProcessing`
- **타입**: `boolean`
- **설명**: 병렬 처리 활성화
- **기본값**: `true`

#### `maxConcurrency`
- **타입**: `number`
- **설명**: 최대 동시 처리 수
- **기본값**: `8`
- **권장값**: CPU 코어 수의 1-2배

#### `batchSize`
- **타입**: `number`
- **설명**: 배치 크기
- **기본값**: `50`
- **권장값**: 메모리 사용량에 따라 조정

#### `memoryLimit`
- **타입**: `number`
- **설명**: 메모리 제한 (MB)
- **기본값**: `1024`
- **권장값**: 시스템 메모리의 50-70%

### 3. 캐시 옵션

#### `enableCache`
- **타입**: `boolean`
- **설명**: 캐시 활성화
- **기본값**: `true`

#### `cacheOptions`
- **타입**: `object`
- **설명**: 캐시 설정
- **예시**:
```json
{
  "cacheOptions": {
    "maxSize": 1000,
    "ttl": 300000,
    "strategy": "lru"
  }
}
```

### 4. 분석 옵션

#### `queries`
- **타입**: `string[]`
- **설명**: 사용할 쿼리 카테고리
- **예시**: `["typescript", "javascript", "markdown"]`

#### `rdf`
- **타입**: `boolean`
- **설명**: RDF 분석 활성화
- **기본값**: `false`

#### `tagAnalysis`
- **타입**: `boolean`
- **설명**: 태그 분석 활성화
- **기본값**: `false`

## 성능 최적화 설정

### 1. 메모리 최적화

#### 작은 프로젝트 (< 1000 파일)
```json
{
  "options": {
    "parallelProcessing": true,
    "maxConcurrency": 4,
    "batchSize": 25,
    "memoryLimit": 512
  }
}
```

#### 중간 프로젝트 (1000-5000 파일)
```json
{
  "options": {
    "parallelProcessing": true,
    "maxConcurrency": 8,
    "batchSize": 50,
    "memoryLimit": 1024
  }
}
```

#### 큰 프로젝트 (> 5000 파일)
```json
{
  "options": {
    "parallelProcessing": true,
    "maxConcurrency": 16,
    "batchSize": 100,
    "memoryLimit": 2048
  }
}
```

### 2. 처리 속도 최적화

#### 빠른 처리 (정확도 우선)
```json
{
  "options": {
    "parallelProcessing": true,
    "maxConcurrency": 16,
    "batchSize": 100,
    "enableCache": true
  }
}
```

#### 정확한 처리 (속도 우선)
```json
{
  "options": {
    "parallelProcessing": false,
    "maxConcurrency": 1,
    "batchSize": 10,
    "enableCache": false
  }
}
```

### 3. 캐시 최적화

#### 개발 환경
```json
{
  "options": {
    "enableCache": true,
    "cacheOptions": {
      "maxSize": 500,
      "ttl": 60000,
      "strategy": "lru"
    }
  }
}
```

#### 프로덕션 환경
```json
{
  "options": {
    "enableCache": true,
    "cacheOptions": {
      "maxSize": 2000,
      "ttl": 300000,
      "strategy": "lru"
    }
  }
}
```

## CLI 명령어

### 1. 기본 명령어

#### Namespace 목록 조회
```bash
npm run namespace -- --list
```

#### 특정 namespace 실행
```bash
npm run namespace -- --name source
```

#### 모든 namespace 실행
```bash
npm run namespace -- --all
```

### 2. 최적화 명령어

#### Namespace 최적화
```bash
npm run optimize-namespace -- --name source
```

#### 모든 namespace 최적화
```bash
npm run optimize-all-namespaces
```

#### 성능 통계 조회
```bash
npm run namespace-performance
```

### 3. 고급 명령어

#### RDF 분석 활성화
```bash
npm run namespace -- --name source --rdf
```

#### 태그 분석 활성화
```bash
npm run namespace -- --name docs --collect-tags
```

#### 성능 모니터링 활성화
```bash
npm run namespace -- --name source --performance
```

## 모범 사례

### 1. Namespace 설계

#### ✅ 좋은 namespace 설계
```json
{
  "namespaces": {
    "source": {
      "description": "소스 코드 분석",
      "files": ["src/**/*.ts", "src/**/*.js"],
      "enabled": true,
      "options": {
        "queries": ["typescript", "javascript"],
        "rdf": true
      }
    },
    "docs": {
      "description": "문서 분석",
      "files": ["docs/**/*.md"],
      "enabled": true,
      "options": {
        "queries": ["markdown"],
        "tagAnalysis": true
      }
    },
    "tests": {
      "description": "테스트 코드 분석",
      "files": ["tests/**/*.ts", "**/*.test.ts"],
      "enabled": false,
      "options": {
        "queries": ["typescript"],
        "rdf": false
      }
    }
  }
}
```

#### ❌ 피해야 할 namespace 설계
```json
{
  "namespaces": {
    "everything": {
      "description": "모든 파일 분석",
      "files": ["**/*"],
      "enabled": true
    }
  }
}
```

### 2. 성능 최적화

#### ✅ 성능 최적화 설정
```json
{
  "globalOptions": {
    "parallelProcessing": true,
    "maxConcurrency": 8,
    "batchSize": 50,
    "enableCache": true,
    "memoryLimit": 1024
  },
  "namespaces": {
    "source": {
      "options": {
        "maxConcurrency": 8,
        "batchSize": 50
      }
    },
    "docs": {
      "options": {
        "maxConcurrency": 4,
        "batchSize": 20
      }
    }
  }
}
```

#### ❌ 성능 저하 설정
```json
{
  "namespaces": {
    "source": {
      "options": {
        "parallelProcessing": false,
        "maxConcurrency": 1,
        "batchSize": 1,
        "enableCache": false
      }
    }
  }
}
```

### 3. 메모리 관리

#### ✅ 메모리 효율적 설정
```json
{
  "namespaces": {
    "source": {
      "options": {
        "memoryLimit": 1024,
        "batchSize": 50,
        "enableCache": true
      }
    }
  }
}
```

#### ❌ 메모리 낭비 설정
```json
{
  "namespaces": {
    "source": {
      "options": {
        "memoryLimit": 8192,
        "batchSize": 1000,
        "enableCache": false
      }
    }
  }
}
```

## 문제 해결

### 1. 자주 발생하는 문제

#### Q1: Namespace가 실행되지 않아요
**A**: 다음을 확인하세요:
- `enabled` 옵션이 `true`인지 확인
- 파일 패턴이 올바른지 확인
- 파일이 실제로 존재하는지 확인

#### Q2: 메모리 사용량이 너무 높아요
**A**: 다음 설정을 조정하세요:
- `memoryLimit` 값을 줄이세요
- `batchSize` 값을 줄이세요
- `maxConcurrency` 값을 줄이세요

#### Q3: 처리 속도가 너무 느려요
**A**: 다음 설정을 조정하세요:
- `parallelProcessing`을 `true`로 설정
- `maxConcurrency` 값을 늘리세요
- `enableCache`를 `true`로 설정

#### Q4: 캐시가 제대로 작동하지 않아요
**A**: 다음을 확인하세요:
- `enableCache`가 `true`인지 확인
- `cacheOptions` 설정이 올바른지 확인
- 캐시 디렉토리에 쓰기 권한이 있는지 확인

### 2. 성능 문제 해결

#### 느린 처리 속도
```bash
# 성능 통계 확인
npm run namespace-performance

# 최적화 실행
npm run optimize-namespace -- --name source
```

#### 높은 메모리 사용량
```json
{
  "options": {
    "memoryLimit": 512,
    "batchSize": 25,
    "maxConcurrency": 4
  }
}
```

#### 캐시 문제
```json
{
  "options": {
    "enableCache": true,
    "cacheOptions": {
      "maxSize": 1000,
      "ttl": 300000
    }
  }
}
```

### 3. 디버깅

#### 디버그 모드 활성화
```bash
DEBUG=* npm run namespace -- --name source
```

#### 상세 로그 활성화
```bash
npm run namespace -- --name source --verbose
```

#### 성능 모니터링 활성화
```bash
npm run namespace -- --name source --performance
```

## 고급 설정

### 1. 커스텀 쿼리

```json
{
  "namespaces": {
    "source": {
      "options": {
        "queries": ["typescript", "javascript"],
        "customQueries": {
          "typescript": ["class", "interface", "function"],
          "javascript": ["function", "class"]
        }
      }
    }
  }
}
```

### 2. 조건부 실행

```json
{
  "namespaces": {
    "source": {
      "enabled": true,
      "conditions": {
        "fileCount": { "min": 10, "max": 1000 },
        "fileSize": { "max": 1048576 }
      }
    }
  }
}
```

### 3. 환경별 설정

```json
{
  "environments": {
    "development": {
      "namespaces": {
        "source": {
          "options": {
            "maxConcurrency": 4,
            "batchSize": 25
          }
        }
      }
    },
    "production": {
      "namespaces": {
        "source": {
          "options": {
            "maxConcurrency": 16,
            "batchSize": 100
          }
        }
      }
    }
  }
}
```

## 결론

이 가이드를 따라 namespace 설정을 최적화하면 dependency-linker 시스템의 성능을 크게 향상시킬 수 있습니다.

### 핵심 원칙
1. **목적별 분리**: 각 namespace는 명확한 목적을 가져야 함
2. **성능 최적화**: 프로젝트 크기에 맞는 설정 적용
3. **메모리 관리**: 적절한 메모리 제한 설정
4. **캐시 활용**: 성능 향상을 위한 캐시 전략

### 지속적 개선
- 정기적인 성능 모니터링
- 설정 최적화
- 사용자 피드백 반영

이 가이드를 참고하여 프로젝트에 맞는 최적의 namespace 설정을 구축하시기 바랍니다.
