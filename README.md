# 🔗 Dependency Linker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f9f1e1)](https://bun.sh)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean-blue)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-48%2F48%20%E2%9C%85-green)](./docs/TEST_CASES.md)
[![Domain Coverage](https://img.shields.io/badge/Domain%20Coverage-100%25-brightgreen)](./docs/DOMAIN_ENTITIES_GUIDE.md)

**Clean Architecture 기반 TypeScript/JavaScript 프로젝트 의존성 추적 및 Notion 동기화 시스템**

Git 통합과 다중 언어 파서를 활용한 지능적 코드베이스 분석 및 자동화된 문서화 도구입니다.

## 🎉 Version 2.0 - Clean Architecture 완성

### ✅ 새로운 도메인 엔티티 구현
- **ProjectExploration**: 프로젝트 분석 및 파일 탐색 비즈니스 로직 (22 tests ✅)
- **DataCollectionRules**: 보안, 프라이버시, 데이터 수집 제약사항 (26 tests ✅)
- **완벽한 테스트 커버리지**: 48/48 테스트 통과로 비즈니스 로직 검증 완료

### 🛡️ 보안 & 프라이버시 강화
- **자동 콘텐츠 필터링**: API 키, 비밀번호, 토큰 자동 마스킹
- **경로 익명화**: 개인정보가 포함된 파일 경로 보호
- **속도 제한**: 리소스 남용 방지 및 안정성 향상
- **GDPR 준수**: 데이터 최소화 및 개인정보 보호

## 🎯 핵심 특징

### 🏗️ **Clean Architecture 설계**
- **계층 분리**: CLI → Services → Domain ← Infrastructure → Shared
- **의존성 역전**: 인터페이스 기반 모듈 설계
- **확장성**: 플러그인 아키텍처로 새로운 언어 파서 쉽게 추가

### 🧠 **다중 언어 지원**
- **TypeScript/JavaScript**: Tree-sitter + AST 분석
- **Python**: import/dependency 추적 
- **Go**: 모듈 시스템 분석
- **Rust**: Cargo.toml 기반 crate 분석

### ⚡ **성능 최적화**
- **SQLite 인덱싱**: 빠른 파일 상태 조회 (< 1초)
- **점진적 업데이트**: 변경된 파일만 동기화
- **배치 처리**: 대량 데이터 효율적 업로드
- **캐싱 시스템**: 의존성 그래프 재사용
- **적응형 탐색**: 프로젝트 규모별 최적화된 처리 전략

### 🔄 **완전 자동화**
- **Git 통합**: pre-commit/post-commit 훅 지원
- **실시간 감지**: 파일 변경 시 자동 동기화
- **CLI 데이터베이스 관리**: 스키마 기반 자동 생성
- **에러 복구**: 복구 메커니즘과 상세 리포팅

## 🚀 빠른 시작

### 1. 설치 및 초기 설정

```bash
# 저장소 클론 및 설치
git clone https://github.com/mineclover/dependency-linker.git
cd dependency-linker
bun install

# 환경 설정 (.env 파일 생성)
cp .env.example .env
# NOTION_API_KEY와 NOTION_PARENT_PAGE_ID 설정

# 프로젝트 초기화
bun run deplink init --template basic
```

### 2. 데이터베이스 설정 (CLI)

```bash
# 데이터베이스 스키마 초기화
bun run deplink-db init

# 연결 및 스키마 검증
bun run deplink-db check

# 데이터베이스 테스트
bun run deplink-db test
```

### 3. 현재 프로젝트 분석

```bash
# 기본 CLI 사용
bun run deplink --help

# 현재 프로젝트 탐색
bun run deplink explore enhanced

# 의존성 수집 및 분석
bun run deplink collect dependencies

# 워크스페이스 상태 확인
bun run deplink workspace status
```

### 4. 고급 기능

```bash
# 문서 관리
bun run deplink docs view README.md
bun run deplink docs track

# 개발자 도구
bun run deplink dev test --unit
bun run deplink dev debug --logs

# 데이터베이스 속성 추가
bun run deplink-db add-property files "New Field" select "Option1,Option2"
```

## 📋 CLI 명령어 참조

### 🎮 **Core CLI** (`deplink`)

```bash
# 기본 명령어
deplink --help                    # 도움말
deplink --version                 # 버전 확인

# 프로젝트 초기화
deplink init --template basic     # 기본 설정
deplink init --template full      # 전체 기능 설정

# 파일 탐색 및 분석
deplink explore enhanced          # 향상된 파일 탐색
deplink explore --demo           # 데모 모드
deplink analyze relationships     # 관계 분석

# 의존성 수집
deplink collect dependencies      # 의존성 수집
deplink collect all              # 전체 수집

# 워크스페이스 관리  
deplink workspace status         # 상태 확인
deplink workspace validate       # 설정 검증

# 문서 시스템
deplink docs view <file>         # 문서 보기
deplink docs track              # 추적 상태
deplink docs link <file> <id>   # 파일-페이지 연결

# 개발자 도구
deplink dev test --unit         # 단위 테스트
deplink dev debug --logs        # 디버깅
deplink dev export --json       # 데이터 내보내기
```

### 🗄️ **Database CLI** (`deplink-db`)

```bash
# 데이터베이스 관리
deplink-db init                  # 스키마 기반 초기화
deplink-db check                 # 연결 및 스키마 검증  
deplink-db test                  # 기능 테스트
deplink-db repair               # 🔧 자동 복구 (아카이브 감지/관계 속성 추가)
deplink-db reset                 # 데이터베이스 재설정
deplink-db restore              # 아카이브 복구 가이드

# 속성 관리
deplink-db add-property <db> <name> <type> [options]
# 예시:
deplink-db add-property files "Priority" select "High,Medium,Low"
deplink-db add-property functions "Complexity" number

# 자동 복구 옵션
deplink-db repair --dry-run     # 시뮬레이션만 실행
deplink-db repair -d files      # 특정 데이터베이스만 복구
```

### 🔧 **Package Scripts**

```bash
# 빌드 및 실행
bun run build                    # 프로젝트 빌드
bun run dev                      # 개발 모드 실행
bun run start                    # 빌드된 앱 실행

# 테스트 (48/48 tests ✅)
bun run test                     # 전체 테스트
bun run test:unit               # 단위 테스트 (도메인 엔티티 포함)
bun run test:integration        # 통합 테스트
bun run test:domain             # 도메인 계층 테스트

# 데이터베이스 관리 (단축 명령어)
bun run db:init                # 데이터베이스 초기화
bun run db:check               # 연결 상태 확인
bun run db:repair              # 🔧 자동 복구 (권장)
bun run db:test                # 연결 테스트

# 개발 도구
bun run lint                    # 코드 린팅
bun run type-check             # 타입 체크
bun run format                 # 코드 포매팅
```

## 🏗️ Clean Architecture 설계

### 📐 **아키텍처 계층**

```
📦 src/ (Clean Architecture)
├── 🎮 cli/                    # CLI Interface Layer
│   ├── commands/              # 15+ CLI 명령어 구현
│   │   ├── init/             # 프로젝트 초기화
│   │   ├── explore/          # 파일 탐색
│   │   ├── collect/          # 의존성 수집
│   │   ├── workspace/        # 워크스페이스 관리
│   │   ├── docs/             # 문서 시스템
│   │   ├── dev/              # 개발자 도구
│   │   └── database.ts       # 데이터베이스 CLI
│   └── main.ts               # CLI 진입점
├── 🔧 domain/                 # Domain Layer (NEW v2.0)
│   ├── entities/             # 핵심 비즈니스 엔티티
│   │   ├── ProjectExploration.ts    # 프로젝트 탐색 로직 (22 tests ✅)
│   │   └── DataCollectionRules.ts   # 데이터 수집 규칙 (26 tests ✅)
│   ├── services/             # 도메인 서비스
│   └── interfaces/           # 비즈니스 인터페이스
├── 🏭 infrastructure/         # Infrastructure Layer
│   ├── config/               # 설정 관리
│   ├── database/             # SQLite 관리
│   ├── filesystem/           # 파일시스템 연동
│   ├── notion/               # Notion API 클라이언트
│   └── git/                  # Git 통합
├── 🔄 services/              # Service Layer
│   ├── parsers/              # 다중 언어 파서
│   │   ├── typescript/       # TS/JS 파싱
│   │   ├── python/           # Python 파싱
│   │   ├── go/               # Go 파싱
│   │   └── rust/             # Rust 파싱
│   ├── notion/               # Notion 서비스들
│   ├── workflow/             # 워크플로우 관리
│   └── analysis/             # 의존성 분석
└── 🛠️ shared/                # Shared Layer
    ├── types/                # 공통 타입 정의
    └── utils/                # 유틸리티 함수
```

### ⚡ **성능 최적화**

- **메모리 사용량**: ~50MB (기본), ~200MB (대형 프로젝트)
- **처리 속도**: 프로젝트 스캔 < 5초 (1000개 파일)
- **확장성**: 10,000개 파일 프로젝트 지원
- **캐싱**: SQLite 기반 점진적 업데이트

## 📊 파일 상태 시스템

### 동기화 상태 관리

- **`not_synced`**: 아직 Notion에 업로드되지 않은 파일
- **`synced`**: Notion과 동기화된 상태
- **`needs_update`**: 파일이 수정되어 업데이트 필요
- **`error`**: 동기화 중 오류 발생

### 로컬 인덱스 (.deplink-db.json)

```json
{
  "projectPath": "/path/to/project",
  "lastSync": "2024-01-15T10:30:00.000Z",
  "files": {
    "src/main.ts": {
      "notionPageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "lastModified": "2024-01-15T10:25:00.000Z",
      "hash": "abc123de"
    }
  },
  "dependencies": {
    "src/main.ts": {
      "imports": ["src/utils/helper.ts"],
      "notionPageIds": ["f1e2d3c4-b5a6-9780-dcba-fe4321098765"]
    }
  }
}
```

## 🎯 Git 통합 자동화

### Pre-commit Hook 동작

```bash
# Git commit 실행 시 자동으로:
🔍 Changed files detection
📊 Sync status check  
💡 Notification if sync needed
✅ Commit proceeds
```

### Post-commit Hook (옵션)

```bash 
# 커밋 완료 후 자동으로:
🚀 Auto-sync to Notion
📈 Status update
✅ Notification
```

### 설정 예시

```bash
# 개발 중 자동 감지만
bun run workflow:setup

# 프로덕션 브랜치 자동 동기화  
bun run workflow:setup --auto-sync
```

## 📊 모니터링 및 상태 확인

### 빠른 상태 확인

```bash
bun run workflow:status
# 출력:
# 🔍 Dependency Linker Status
# ===========================
# 📁 Files: 48 total, 42 synced, 6 need updates
# 🔧 Config: ✅ Loaded  
# 📊 Databases: files, functions, docs
# 🎯 Git: 3 staged, 2 modified
# 🔄 6 files need Notion sync
```

### 상세 시스템 분석

```bash
bun run workflow:inspect
# 출력:
# 🔬 Detailed System Inspection
# =============================
# 
# 📁 File Status:
#    Total: 48
#    Synced: 42  
#    Need Update: 6
#    Not Synced: 0
#    Errors: 0
#
# 🎯 Git Status:
#    Staged: 3 files
#    Modified: 2 files  
#    Needs Sync: 6 files
```

## 🔧 고급 설정

### 환경별 설정

```bash
# 개발 환경 설정
bun run setup:env

# 설정 확인
bun run config:show
```

### 성능 최적화

```bash
# 환경 변수로 성능 튜닝
export BATCH_SIZE=50              # 배치 크기
export CONCURRENT_OPERATIONS=10   # 동시 작업 수
export MAX_CACHE_SIZE=10000      # 캐시 크기

# 저사양 시스템
export BATCH_SIZE=10
export CONCURRENT_OPERATIONS=3

# 고성능 시스템  
export BATCH_SIZE=100
export CONCURRENT_OPERATIONS=20
```

## 🚨 문제 해결

### 일반적인 문제

```bash
# 동기화 상태 리셋
rm .deplink-db.json
bun run workflow:sync

# Git 훅 재설치
bun run workflow:setup

# Notion 연결 테스트
bun run workflow:status
```

### 마이그레이션 (기존 Tracking ID에서)

```bash
# 1. 기존 tracking ID 제거
bun clean-all-ids.js --preview    # 미리보기
bun clean-all-ids.js              # 실제 제거

# 2. 새 시스템으로 동기화
bun run workflow:sync

# 3. Git 통합 설정
bun run workflow:setup
```

## 📚 주요 차이점 (기존 시스템과 비교)

### ✅ 새로운 시스템 (권장)

- **Notion Page ID 기반**: 안정적이고 네이티브한 식별자
- **파일 무수정**: 파일에 주석을 추가하지 않아 깔끔함
- **자동 Git 통합**: 변경 감지 및 자동화
- **빠른 상태 추적**: 로컬 인덱스로 즉시 상태 파악

### ❌ 기존 시스템 (deprecated)

- **Tracking ID 주석**: 파일에 `// Notion ID : DL-xxx` 주석 추가
- **수동 관리**: 개발자가 직접 ID 관리 필요
- **복잡한 정리**: ID 정리 시 여러 스크립트 필요

## 📚 문서

### 핵심 가이드

- **[스키마 시스템 가이드](./SCHEMA_GUIDE.md)** - JSON 스키마로 Notion 데이터베이스 자동 생성
- **[설정 가이드](./CONFIG_GUIDE.md)** - 환경별 설정 및 API 키 관리
- **[워크플로우 가이드](./WORKFLOW_GUIDE.md)** - Git 통합 및 자동화 설정

### 고급 기능

- **[양방향 관계 설정](./SCHEMA_GUIDE.md#양방향-관계)** - 파일 간 의존성 관계 자동 관리
- **[CLI 명령어 참조](./CLI_REFERENCE.md)** - 모든 명령어 상세 설명
- **[문제 해결 가이드](./TROUBLESHOOTING.md)** - 일반적인 문제와 해결책

### 아키텍처

- **[시스템 아키텍처](./docs/DOMAIN_ENTITIES_GUIDE.md#clean-architecture-principles)** - 전체 시스템 구조와 설계 원칙
- **[API 문서](./API_DOCS.md)** - 내부 API 및 확장 포인트

## 🤝 기여하기

프로젝트 개선에 참여해주세요!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)  
3. Test your changes (`bun run workflow:sync:dry`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

🔄 **Clean Architecture**: 도메인 주도 설계로 유지보수성 극대화  
🧪 **완전 테스트**: 48/48 테스트 통과로 안정성 보장  
🛡️ **보안 강화**: 자동 민감정보 필터링 및 개인정보 보호  
⚡ **지능형 최적화**: 프로젝트 규모별 적응형 처리 전략

## 💻 개발 환경 요구사항

- **Node.js**: 18+ (권장: Bun 런타임)
- **OS**: macOS, Linux, Windows WSL
- **Notion API**: Integration 설정 필요
- **Git**: 버전 관리 (선택사항)

## 📚 문서화

### 🎯 **시작하기**
- **[빠른 시작](./QUICK_START.md)** - 5분 내 설정 및 실행
- **[Notion 설정](./NOTION_SETUP.md)** - Notion API 통합 가이드
- **[설정 가이드](./docs/CONFIG-GUIDE.md)** - 환경별 설정 방법

### 🏗️ **아키텍처 & 개발**
- **[Clean Architecture 가이드](./docs/CLEAN_ARCHITECTURE_GUIDE.md)** - 시스템 설계 원칙
- **[도메인 엔티티 가이드](./docs/DOMAIN_ENTITIES_GUIDE.md)** - 비즈니스 로직 및 도메인 모델 ⭐ **NEW**
- **[API 문서](./docs/API_DOCUMENTATION.md)** - 내부 API 및 확장 포인트
- **[개발자 가이드](./docs/DEVELOPER-GUIDE.md)** - 기여 및 개발 가이드

### 📖 **전체 문서 목록**
모든 문서는 [**docs/README.md**](./docs/README.md)에서 확인할 수 있습니다.

---

**🔗 Version 2.0 - Clean Architecture 완성**  
도메인 엔티티 구현 완료로 TypeScript/JavaScript 프로젝트를 Notion과 안전하게 동기화하는 차세대 개발 도구
