# Notion Markdown 기능 마이그레이션 및 사용법

## 📖 개요

기존 `src/utils/notionMarkdownConverter.ts`에서 `src_new` 구조로 완전히 마이그레이션된 Notion-Markdown 양방향 변환 기능에 대한 문서입니다.

## 🏗️ 아키텍처 및 파일 위치

### 핵심 파일 구조

```
src/
├── infrastructure/notion/
│   ├── markdownConverter.ts     # 🔧 핵심 변환 로직
│   ├── schemaManager.ts         # 📋 데이터베이스 스키마 관리  
│   └── index.ts                 # 📦 통합 export
├── cli/commands/markdown/
│   └── index.ts                 # 🖥️ CLI 명령어 구현
└── cli/main.ts                  # 🚀 메인 CLI 진입점
```

### 컴포넌트 상세

#### 1. `NotionMarkdownConverter` 클래스
**위치**: `src/infrastructure/notion/markdownConverter.ts`

**주요 기능**:
- Notion 페이지 → Markdown 변환
- Markdown → Notion 페이지/데이터베이스 엔트리 변환  
- 블록 청킹 및 Rate limiting 처리
- Rich text 포매팅 지원

#### 2. Markdown CLI 명령어
**위치**: `src/cli/commands/markdown/index.ts`

**제공 명령어**:
- `upload` - Markdown → Notion 데이터베이스
- `download` - Notion → Markdown 파일
- `convert` - 양방향 형식 변환
- `sync` - 디렉토리 동기화

## 🚀 사용법

### 1. CLI 빌드

```bash
# src_new 전용 빌드 명령어
bun run build:new

# 또는 직접 빌드
bun build src/cli/main.ts --outdir dist --target node
```

**중요**: `bun run build`는 기존 src를 빌드하므로, src_new는 반드시 `build:new`를 사용해야 합니다.

### 2. 기본 명령어

#### Markdown → Notion 페이지 변환

```bash
node dist/main.js markdown convert test.md \
  --to notion \
  --parent <parent-page-id> \
  --config deplink.config.json
```

#### Notion 페이지 → Markdown 다운로드

```bash
node dist/main.js markdown download <page-id> \
  --output downloaded.md \
  --metadata \
  --config deplink.config.json
```

#### 데이터베이스 엔트리 업로드 (legacy)

```bash
node dist/main.js markdown upload test.md \
  --database <database-id> \
  --config deplink.config.json
```

### 3. 배치 처리

#### 디렉토리 전체 변환

```bash
node dist/main.js markdown convert ./docs \
  --to notion \
  --parent <parent-page-id> \
  --batch
```

#### 디렉토리 동기화 (Watch 모드)

```bash
node dist/main.js markdown sync ./docs \
  --database <database-id> \
  --watch \
  --interval 5000
```

### 4. 프로그래밍 방식 사용

```typescript
import { NotionMarkdownConverter } from '../infrastructure/notion/markdownConverter.js';

const converter = new NotionMarkdownConverter(apiKey);

// Markdown → Notion
const result = await converter.markdownToNotion(
  markdownContent,
  parentPageId,
  'Page Title'
);

// Notion → Markdown  
const download = await converter.notionToMarkdown(
  pageId,
  { includeMetadata: true }
);
```

## ⚙️ 설정 파일

### deplink.config.json 예시

```json
{
  "apiKey": "ntn_...",
  "parentPageId": "267485837460...",
  "databases": {
    "docs": "d5c10024-8939-414a..."
  }
}
```

### 필수 설정

- `apiKey`: Notion Integration API 키
- `parentPageId`: 페이지 생성 시 부모 페이지 ID
- `databases.docs`: 데이터베이스 업로드용 ID (선택사항)

## 📋 지원되는 Markdown 기능

### ✅ 완전 지원

- **헤더**: `#`, `##`, `###`
- **텍스트 포매팅**: **굵게**, *기울임*, `인라인 코드`
- **리스트**: 
  - 순서 있는 리스트 (1. 2. 3.)
  - 순서 없는 리스트 (- * +)
  - 체크박스 (- [x], - [ ])
- **코드 블록**: 언어 구문 강조 지원
- **인용구**: `> 인용 텍스트`  
- **구분선**: `---`
- **링크**: `[텍스트](URL)`

### ⚠️ 제한사항

- 테이블: 간단한 변환만 지원
- 이미지: URL만 지원 (파일 업로드 불가)
- 중첩 리스트: 기본 들여쓰기만 지원

## 🔧 기술적 세부사항

### Rate Limiting 처리

```typescript
// 자동 지연 및 재시도
await new Promise(resolve => setTimeout(resolve, 1000));

// 지수 백오프
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
```

### 블록 청킹

```typescript
const MAX_BLOCKS_PER_REQUEST = 100;
// 100블록 이상 시 자동 분할 처리
```

### 에러 처리

- API 오류 자동 감지 및 리포트
- 설정 파일 검증
- 친화적 오류 메시지 제공

## 📊 테스트 결과

### ✅ 검증 완료

1. **업로드 테스트**
   - ✅ 단일 파일 → Notion 페이지
   - ✅ 모든 Markdown 요소 변환
   - ✅ 페이지 URL 자동 생성

2. **다운로드 테스트**  
   - ✅ Notion 페이지 → Markdown
   - ✅ **풍부한 메타데이터 보존** (front-matter)
     - `notion_page_id`, `title`, `last_synced`
     - `created`, `lastEdited` (Notion API 메타데이터)
     - `word_count`, `reading_time_minutes` (자동 계산)
     - `auto_generated` 플래그
   - ✅ HTML 주석으로 Notion URL 추가
   - ✅ 콘텐츠 무결성 유지

3. **CLI 통합**
   - ✅ 모든 명령어 작동
   - ✅ Config 파일 자동 로딩  
   - ✅ 에러 처리 및 메시지

### 실제 테스트 로그

#### 최신 빌드 및 다운로드 테스트 (2025-09-09)

```bash
# 빌드
$ bun run build:new
Bundled 190 modules in 23ms
  main.js  0.83 MB  (entry point)

# 다운로드 테스트  
$ node dist/main.js markdown download 26848583-7460-811c-8ebe-ff880f63b135 --output src-new-test.md --config deplink.config.json
📥 Starting Notion page download...
📥 Converting Notion page 26848583-7460-811c-8ebe-ff880f63b135 to Markdown...
✅ Successfully converted page to Markdown
✅ Successfully downloaded to: src-new-test.md
   Title: test-markdown
   Created: 2025-09-08T15:33:00.000Z
   Last Edited: 2025-09-08T15:33:00.000Z

# CLI 명령어 확인
$ node dist/main.js --help
Commands:
  init            프로젝트 초기화 및 설정
  sync            코드베이스와 문서 동기화
  explore         코드베이스와 의존성 탐색
  docs            문서 관리 및 편집
  workspace|ws    워크스페이스 전체 관리
  markdown|md     Notion-Markdown 변환 및 동기화  ✅
  dev             개발자 도구 및 유틸리티
```

#### Front-Matter 비교 검증

**원본 테스트 파일**:
```yaml
---
notion_page_id: 2674858374608048a7d4b8f4fa7846f
notion_database_id: 1f9d636a-f895-4db3-a514-1a58e8b0b5d8
title: "Sample Document with Notion ID"
last_synced: 2024-09-08T14:30:00.000Z
---
```

**마이그레이션된 결과 (더 풍부함)**:
```yaml
---
notion_page_id: 26848583-7460-811c-8ebe-ff880f63b135
title: test-markdown
last_synced: '2025-09-08T15:52:59.765Z'
created: '2025-09-08T15:33:00.000Z'
lastEdited: '2025-09-08T15:33:00.000Z'
word_count: 99
reading_time_minutes: 1
auto_generated: true
---
<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460811c8ebeff880f63b135 -->
<!-- Last synced: 2025-09-08T15:52:59.765Z -->
```

**✅ 검증 결과**: 마이그레이션된 버전이 원본보다 더 많은 메타데이터를 제공합니다.

## 🔄 마이그레이션 히스토리

### Before (Legacy)
```
src/utils/notionMarkdownConverter.ts (630+ lines)
├── 하드코딩된 설정
├── 레거시 의존성
└── 분산된 CLI 명령어
```

### After (Modern)
```
src/infrastructure/notion/markdownConverter.ts (600 lines)
├── 🏗️ 현대적 아키텍처
├── 📋 통합 로깅 시스템  
├── ⚙️ 설정 기반 운영
└── 🖥️ 완전한 CLI 통합
```

### 개선사항

- **아키텍처**: 계층화된 구조로 관심사 분리 (Infrastructure/CLI 분리)
- **에러 처리**: 향상된 오류 감지 및 복구
- **성능**: Rate limiting 및 청크 최적화  
- **사용성**: 친화적 CLI 및 설정 시스템
- **유지보수성**: TypeScript 타입 안정성
- **🆕 Front-Matter 개선**: 
  - 원본 대비 더 풍부한 메타데이터 (`created`, `lastEdited`, `word_count`, `reading_time_minutes`)
  - HTML 주석으로 Notion URL 및 동기화 시간 추가
  - `local_doc_id` 제거로 단순화
- **🆕 빌드 시스템**: `bun run build:new` 전용 명령어로 분리된 빌드 환경

## 🚨 알려진 이슈

### 1. 다중 데이터 소스 제한

```
❌ Databases with multiple data sources are not supported in this API version.
```

**해결책**: 단순 페이지 생성 사용
```bash
deplink markdown convert file.md --to notion --parent <page-id>
```

### 2. 데이터베이스 권한 오류

```  
❌ Could not find database with ID: xxx. Make sure the relevant pages and databases are shared with your integration.
```

**해결책**: Notion에서 데이터베이스를 Integration과 공유

## 📚 관련 문서

- [Notion API 공식 문서](https://developers.notion.com/)
- [CLI 명령어 전체 목록](../cli-commands.md)
- [설정 파일 가이드](../configuration.md)

## 🔮 향후 계획

- [ ] 이미지 업로드 지원
- [ ] 테이블 변환 개선  
- [ ] 배치 처리 성능 최적화
- [ ] 실시간 동기화 기능
- [ ] 버전 관리 통합

---

**마이그레이션 완료**: 2025-09-08  
**문서 업데이트**: 2025-09-09  
**테스트 상태**: ✅ 모든 핵심 기능 검증 완료 (Front-Matter 개선 포함)  
**빌드 검증**: ✅ `bun run build:new` 정상 작동 (190 modules, 23ms, 0.83MB)  
**사용 준비**: 🚀 바로 사용 가능