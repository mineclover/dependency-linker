---
notion_page_id: 26848583-7460-8185-a919-f0e0da8f0180
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
last_synced: '2025-09-08T11:29:20.003Z'
category: docs
auto_generated: true
---
# Dependency Linker - 사용 예시

## 🚀 고급 추적 시스템

Dependency Linker는 이제 파일에 고유 식별자를 주입하여 완전한 추적 시스템을 제공합니다.

## 🔍 기본 워크플로우

### 1. 설정 초기화
```bash
bun run dev init
```

설정 파일(`~/.deplink-config.json`) 편집:
```json
{
  "notionApiKey": "secret_YOUR_ACTUAL_NOTION_API_KEY",
  "defaultDatabaseId": "YOUR_DATABASE_ID"
}
```

### 2. 프로젝트 탐색
```bash
# 기본 탐색
bun run dev explore

# 의존성 분석 포함
bun run dev explore --include-deps

# JSON 파일로 결과 저장
bun run dev explore --include-deps --output analysis.json
```

### 3. Notion 업로드
```bash
# 기본 업로드 (설정 파일의 기본 데이터베이스 사용)
bun run dev upload

# 특정 데이터베이스에 업로드
bun run dev upload -d YOUR_DATABASE_ID

# 특정 경로 업로드
bun run dev upload -p /path/to/project -d YOUR_DATABASE_ID
```

### 4. 동기화
```bash
# 기존 문서와 동기화
bun run dev sync

# 특정 데이터베이스와 동기화
bun run dev sync -d YOUR_DATABASE_ID
```

## 📝 파일 추적 시스템

업로드 후, 각 파일 하단에 고유 식별자가 추가됩니다:

### JavaScript/TypeScript 파일
```javascript
// 기존 코드...
export function myFunction() {
  return 'Hello World';
}

// Notion ID: DL-abc123-def456 <-[deplink: DO NOT REMOVE]
```

### Python 파일
```python
# 기존 코드...
def my_function():
    return "Hello World"

# Notion ID: DL-abc123-def456 <-[deplink: DO NOT REMOVE]
```

### HTML 파일
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>

<!-- Notion ID: DL-abc123-def456 <-[deplink: DO NOT REMOVE] -->
```

### CSS 파일
```css
.my-class {
    color: blue;
    font-size: 16px;
}

/* Notion ID: DL-abc123-def456 <-[deplink: DO NOT REMOVE] */
```

## 🔗 의존성 관계 추적

### Notion 데이터베이스 구조

업로드된 데이터베이스에는 다음 속성들이 포함됩니다:

- **File Path**: 파일 경로
- **Extension**: 파일 확장자
- **Size (bytes)**: 파일 크기
- **Last Modified**: 마지막 수정 시간
- **Dependencies**: 외부 의존성 목록
- **Imports**: 이 파일이 import하는 다른 파일들 (관계형)
- **Imported By**: 이 파일을 import하는 파일들 (관계형)
- **Notion ID**: 추적용 고유 ID
- **Status**: 업로드 상태

### 의존성 그래프 예시

```
src/utils/fileExplorer.ts
├── imports: ['fs/promises', 'path', './notionIdTracker.js']
├── imported by: ['src/commands/explore.ts', 'src/commands/upload.ts']
└── notion ID: DL-1a2b3c-4d5e6f

src/commands/upload.ts
├── imports: ['./init.js', '../utils/fileExplorer.js', '../utils/notionClient.js']
├── imported by: ['src/index.ts']
└── notion ID: DL-7g8h9i-0j1k2l
```

## 🗄️ 로컬 데이터베이스

프로젝트 루트에 `.deplink-db.json` 파일이 생성되어 로컬 상태를 추적합니다:

```json
{
  "projectPath": "/Users/username/my-project",
  "lastSync": "2023-12-01T10:00:00.000Z",
  "files": {
    "src/index.ts": {
      "notionId": "notion-page-id-123",
      "lastModified": "2023-12-01T09:30:00.000Z",
      "hash": "a1b2c3d4e5f6"
    }
  },
  "dependencies": {
    "src/index.ts": {
      "imports": ["./utils/helper.ts"],
      "notionIds": ["notion-page-id-456"]
    }
  }
}
```

## ⚡ API 큐 시스템

Notion API 속도 제한을 자동으로 처리합니다:

- **기본 지연**: 350ms (초당 3회 요청 제한 준수)
- **자동 재시도**: 실패 시 최대 3회 재시도
- **백오프 전략**: 지수적 백오프로 속도 제한 회피

## 🎯 실제 사용 시나리오

### 시나리오 1: 새 프로젝트 업로드
```bash
# 1. 프로젝트 초기화
cd /path/to/your/project
bun run dev init

# 2. 설정 편집 (Notion API 키 입력)
vim ~/.deplink-config.json

# 3. 프로젝트 분석 및 업로드
bun run dev explore --include-deps --output initial-analysis.json
bun run dev upload -d your_database_id
```

### 시나리오 2: 기존 프로젝트 동기화
```bash
# 코드 변경 후 동기화
bun run dev sync

# 변경사항 확인
bun run dev explore --include-deps
```

### 시나리오 3: 특정 경로만 업로드
```bash
# 특정 디렉토리만 업로드
bun run dev upload -p ./src/components -d your_database_id
```

## 🛡️ 보안 및 주의사항

### 1. 설정 파일 보안
```bash
# 설정 파일 권한 설정
chmod 600 ~/.deplink-config.json
```

### 2. .gitignore 설정
```gitignore
# Dependency Linker
.deplink-db.json
```

### 3. 추적 ID 보존
- **절대 제거 금지**: `[deplink: DO NOT REMOVE]` 마커가 있는 주석
- **수동 편집**: 추적 ID는 수동으로 편집하지 마세요

## 🔧 고급 설정

### 사용자 정의 무시 패턈
파일 탐색 시 추가로 무시할 패턴을 코드에서 설정할 수 있습니다:

```typescript
const structure = await explorer.exploreProject({
  includeDependencies: true,
  maxFileSize: 2 * 1024 * 1024, // 2MB
  customIgnorePatterns: [
    '**/temp/**',
    '**/*.backup',
    '**/logs/**'
  ]
});
```

### API 큐 커스터마이징
```typescript
// 더 느린 속도로 설정 (500ms 지연)
const apiQueue = new NotionApiQueue(500, 5); // 5회 재시도
```

## 📊 출력 예시

### 탐색 결과
```
🚀 Starting project exploration...

🔍 Exploring project at: /Users/username/my-project
🔍 Found existing Notion ID in src/index.ts: DL-1a2b3c-4d5e6f
📁 Found 25 files
✅ Processed 23 files
🔗 Analyzing dependencies...

📊 Project Summary:
├── Root Path: /Users/username/my-project
├── Total Files: 23
├── File Types:
│   ├── .ts: 15 files
│   ├── .js: 4 files
│   ├── .json: 2 files
│   ├── .css: 1 files
│   └── .md: 1 files
├── Package: my-project@1.0.0
├── Dependencies: 12 production, 8 development
└── Internal Dependencies: 18 files with imports/exports

📦 Most Imported Dependencies:
├── react: 8 imports
├── fs/promises: 5 imports
├── path: 3 imports
└── express: 2 imports

🎉 Exploration completed successfully!
```

### 업로드 결과
```
📤 Uploading 23 files to Notion...

📤 Uploaded: src/index.ts
📤 Uploaded: src/components/Button.tsx
🔄 Updated: src/utils/helper.ts
...

⏳ Processing upload queue...

📊 Upload Summary:
├── Uploaded: 20 files
├── Updated: 3 files
├── Errors: 0 files
└── Total: 23 files processed

🔗 Updating dependency relationships...
✅ Updated relationships for: src/index.ts
✅ Updated relationships for: src/components/Button.tsx
...
✅ Dependency relationships updated!

💉 Injecting Notion IDs into files...
✅ Injected Notion ID into: src/index.ts
✅ Injected Notion ID into: src/components/Button.tsx
...
✅ Injected IDs into 23 files!

📊 API Queue Statistics:
├── Final queue size: 0
├── Rate limit delay: 350ms
└── Max retries: 3

✅ Upload completed with dependency tracking!
```

## 🤝 통합 가이드

### CI/CD 통합
```yaml
# .github/workflows/notion-sync.yml
name: Sync with Notion

on:
  push:
    branches: [ main ]

jobs:
  notion-sync:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: oven-sh/setup-bun@v1
    - name: Install dependencies
      run: bun install
    - name: Build
      run: bun run build
    - name: Sync with Notion
      env:
        NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
        NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
      run: |
        echo '{"notionApiKey":"$NOTION_API_KEY","defaultDatabaseId":"$NOTION_DATABASE_ID"}' > ~/.deplink-config.json
        bun run dev sync
```

이제 완전한 파일 추적과 의존성 관리 시스템이 준비되었습니다!
