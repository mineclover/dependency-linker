---
notion_page_id: 26848583-7460-8198-84d6-d3cd844b278f
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
title: Quick Start Guide - Dependency Linker
last_synced: '2025-09-08T11:29:10.413Z'
category: docs
auto_generated: true
name: null
file_path: ./QUICK_START.md
status: Published
type: Tutorial
last_updated: '2025-09-08'
word_count: 819
reading_time: 5
---
# Quick Start Guide - Dependency Linker

5분만에 Dependency Linker를 설정하고 첫 번째 동기화를 완료하는 빠른 시작 가이드입니다.

## 🚀 빠른 설정 (5분)

### 1단계: 환경 설정 (2분)

#### Notion Integration 생성
1. [Notion Developers](https://developers.notion.com/) 접속
2. **"New Integration"** 클릭
3. Integration 정보 입력:
   - Name: `Dependency Linker`
   - Capabilities: ✅ Read, ✅ Insert, ✅ Update content
4. **API 키 복사** 📋

#### 프로젝트 설정
```bash
# 1. .env 파일 생성
cat > .env << EOF
NOTION_API_KEY=your_copied_api_key_here
NOTION_PARENT_PAGE_ID=your_page_id_here
NODE_ENV=development
EOF

# 2. 기본 설정 파일 생성
cat > deplink.config.json << EOF
{
  "project": {
    "name": "$(basename $(pwd))",
    "path": "$(pwd)"
  }
}
EOF
```

### 2단계: Notion 페이지 준비 (1분)

1. Notion에서 새 페이지 생성 (예: "프로젝트 관리")
2. 페이지 URL에서 ID 추출:
   ```
   https://notion.so/workspace/Page-Name-{이부분이_페이지_ID}
   ```
3. `.env` 파일의 `NOTION_PARENT_PAGE_ID`에 페이지 ID 입력
4. 페이지에서 **Share** → **Invite** → 생성한 Integration 선택

### 3단계: 첫 번째 실행 (2분)

```bash
# 1. 시스템 상태 확인
deplink workflow status

# 2. 문서 시스템 설정 (자동으로 데이터베이스 생성)
deplink workflow setup-docs

# 3. 첫 번째 동기화 (드라이 런)
deplink workflow sync --dry-run

# 4. 실제 동기화
deplink workflow sync
```

🎉 **완료!** 이제 Notion에서 동기화된 파일들을 확인할 수 있습니다.

---

## 📚 주요 사용법

### 일상 작업 플로우

```bash
# 1. 매일 아침 - 상태 확인
deplink wf st

# 2. 코딩 후 - 변경사항 미리보기
deplink wf sync --dry-run

# 3. 동기화 실행
deplink wf sync

# 4. 문서 업데이트 (선택사항)
deplink wf upload-docs
```

### 문서 관리 워크플로우

```bash
# API 문서 업로드 (분류 및 태그 포함)
deplink wf upload-docs \
  --type "API Documentation" \
  --priority "High" \
  --tags "api,backend,rest" \
  --relate-to "src/main.ts,src/services/syncWorkflowService.ts"

# README 업데이트
deplink wf upload-docs \
  --type "README" \
  --priority "High" \
  --tags "documentation,guide"
```

---

## 🛠️ 실전 예제

### 예제 1: TypeScript 프로젝트 설정

```bash
# 프로젝트 디렉토리에서
cd /path/to/your/typescript/project

# 환경 설정
export NOTION_API_KEY="ntn_your_integration_key"
export NOTION_PARENT_PAGE_ID="your_page_id"

# Dependency Linker 설정
deplink workflow setup-docs
deplink workflow sync

# 결과 확인
deplink workflow inspect
```

### 예제 2: React 프로젝트 + 문서 관리

```bash
# 1. 기본 설정
deplink wf setup-docs

# 2. React 컴포넌트 동기화
deplink wf sync

# 3. 컴포넌트 문서 업로드
deplink wf upload-docs \
  --type "Technical Spec" \
  --tags "react,components,frontend" \
  --relate-to "src/components/*.tsx"

# 4. 상태 확인
deplink wf st
```

### 예제 3: 팀 협업 설정

```bash
# deplink.config.json 파일에 환경별 설정 추가
{
  "environment": "development",
  "environments": {
    "development": {
      "databases": {
        "files": "team-dev-files-db-id",
        "docs": "team-dev-docs-db-id"
      }
    },
    "production": {
      "databases": {
        "files": "team-prod-files-db-id", 
        "docs": "team-prod-docs-db-id"
      }
    }
  }
}

# 환경별 동기화
NODE_ENV=development deplink wf sync  # 개발
NODE_ENV=production deplink wf sync   # 프로덕션
```

---

## 🔄 자동화 설정

### Git 훅으로 자동 동기화

```bash
# Git 훅 설정
deplink workflow setup-git --auto-sync

# 이제 커밋할 때마다 자동으로 동기화됩니다
git add .
git commit -m "새 기능 추가"
# → 자동으로 Notion 동기화 실행
```

### 일일 동기화 스크립트

```bash
#!/bin/bash
# daily-sync.sh

echo "🌅 Daily sync starting..."

# 상태 확인
deplink wf st

# 새 문서 업로드
deplink wf upload-docs --priority "Medium"

# 파일 동기화
deplink wf sync

echo "✅ Daily sync completed!"
```

```bash
# 실행 권한 부여 및 실행
chmod +x daily-sync.sh
./daily-sync.sh
```

### cron 작업으로 자동 실행

```bash
# crontab 설정
crontab -e

# 매일 오전 9시에 동기화
0 9 * * * cd /path/to/your/project && ./daily-sync.sh
```

---

## 📊 유용한 명령어 조합

### 개발 시작할 때
```bash
# 전체 시스템 점검
deplink wf inspect && deplink schema validate
```

### 코딩 완료 후
```bash
# 변경사항 확인 후 동기화
deplink wf sync --dry-run && deplink wf sync
```

### 문서 정리할 때
```bash
# 문서 업로드 후 전체 동기화
deplink wf upload-docs && deplink wf sync
```

### 문제 해결할 때
```bash
# 상태 확인 → 스키마 검증 → 문서 시스템 재설정
deplink wf st && deplink schema validate && deplink wf setup-docs
```

---

## ⚡ 성능 팁

### 1. 파일 필터링 최적화
```json
{
  "fileFilters": {
    "extensions": [".ts", ".tsx", ".js", ".jsx", ".md"],
    "maxSize": 2000000,
    "ignorePatterns": [
      "node_modules/**",
      "dist/**",
      "**/*.test.*",
      "**/*.spec.*",
      "coverage/**"
    ],
    "useGitignore": true
  }
}
```

### 2. 대용량 프로젝트 설정
```json
{
  "apiQueue": {
    "maxConcurrent": 2,
    "delayBetweenRequests": 500
  }
}
```

### 3. 선택적 동기화
```bash
# 특정 파일만 동기화 (향후 기능)
deplink wf sync --pattern "src/**/*.ts"
```

---

## 🐛 빠른 문제 해결

### 자주 발생하는 문제

#### 1. "API key invalid" 오류
```bash
# 해결방법
echo $NOTION_API_KEY  # API 키 확인
# .env 파일에서 API 키 재설정
```

#### 2. "Page not found" 오류
```bash
# 해결방법
echo $NOTION_PARENT_PAGE_ID  # 페이지 ID 확인
# Notion에서 Integration 권한 재확인
```

#### 3. "Database not found" 오류
```bash
# 해결방법
deplink wf setup-docs  # 데이터베이스 재생성
```

#### 4. 동기화가 느림
```bash
# 해결방법: 파일 필터링 강화
deplink.config.json에서 ignorePatterns 추가
```

### 진단 명령어
```bash
# 1단계: 기본 진단
deplink wf st

# 2단계: 상세 진단  
deplink wf inspect

# 3단계: 스키마 검증
deplink schema validate

# 4단계: 설정 파일 검증
cat deplink.config.json | jq .
```

---

## 📈 다음 단계

### 고급 기능 탐색
1. **환경별 설정**: [Configuration Guide](./docs/CONFIGURATION_GUIDE.md)
2. **전체 API 레퍼런스**: [Domain Entities Guide](./docs/DOMAIN_ENTITIES_GUIDE.md)  
3. **상세 기능 가이드**: [FEATURES.md](./FEATURES.md)

### 커뮤니티
- 이슈 리포팅: GitHub Issues
- 기능 제안: Feature Requests
- 문서 개선: Pull Requests

---

🎉 **축하합니다!** 이제 Dependency Linker를 효과적으로 사용할 준비가 완료되었습니다. 코딩에 집중하시면 파일 관리는 자동으로 처리됩니다.

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:01:01.168Z -->

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:01:01.170Z -->

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:02:59.900Z -->

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:17:21.108Z -->

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:19:14.551Z -->

<!-- This document is synced with Notion -->
<!-- Notion Page: https://notion.so/268485837460818f87fbe935113747c1 -->
<!-- Last synced: 2025-09-08T09:33:15.785Z -->
