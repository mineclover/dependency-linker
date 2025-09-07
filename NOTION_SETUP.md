---
notion_page_id: 26848583-7460-81a4-b64d-fec5b819fe04
notion_database_id: ce1374d8-884a-4435-9a04-fae1c43154c9
last_synced: '2025-09-08T11:29:14.702Z'
category: docs
auto_generated: true
---
# Notion API 설정 가이드

이 프로젝트는 Notion API를 사용해 코드 파일을 Notion 데이터베이스에 업로드하고 관리합니다.

## 1. Notion Integration 생성

1. **Notion 개발자 페이지 접속**
   - https://www.notion.so/developers 로 이동
   - "View my integrations" 클릭

2. **새 Integration 생성**
   - "New integration" 클릭
   - Integration 이름 입력 (예: "Dependency Linker")
   - Associated workspace 선택
   - Capabilities: "Read content", "Update content", "Insert content" 선택
   - "Submit" 클릭

3. **API 키 복사**
   - 생성된 Integration에서 "Internal Integration Token" 복사
   - `secret_`으로 시작하는 키입니다

## 2. 데이터베이스 설정

1. **Notion에서 데이터베이스 생성**
   - 새 페이지 생성
   - "/database" 입력해서 Table 데이터베이스 생성
   - 제목을 "Project Files"로 설정

2. **데이터베이스 속성 설정**
   다음 속성들을 추가하세요:
   
   | 속성명 | 타입 | 설명 |
   |--------|------|------|
   | File Path | Title | 파일 경로 (기본 제목 속성) |
   | Extension | Select | 파일 확장자 (.ts, .js, .tsx, .jsx) |
   | Size (bytes) | Number | 파일 크기 |
   | Status | Select | 상태 (Uploaded, Updated, Error) |
   | Project | Select | 프로젝트 이름 |
   | Tracking ID | Text | 추적 ID |
   | Last Modified | Date | 마지막 수정일 |
   | External Dependencies | Multi-select | 외부 의존성 |

3. **Integration을 데이터베이스에 연결**
   - 데이터베이스 페이지에서 "..." 메뉴 클릭
   - "Connections" → "Connect to" → 생성한 Integration 선택

4. **데이터베이스 ID 확인**
   - 데이터베이스 URL에서 ID 복사
   - URL 형식: `https://notion.so/workspace/DatabaseName-{DATABASE_ID}`
   - 32자리 문자열이 데이터베이스 ID입니다

## 3. 프로젝트 설정

### 방법 1: 환경변수 설정 (권장)

```bash
export NOTION_API_KEY="secret_your_api_key_here"
```

### 방법 2: 설정 파일 수정

`deplink.config.json` 파일에서:

```json
{
  "apiKey": "secret_your_api_key_here",
  "databases": {
    "files": "your_database_id_here"
  }
}
```

## 4. 스크립트 실행

### 초기 설정 (모든 코드 파일 업로드)
```bash
npm run init:notion
```

### 일반 동기화
```bash
npm run sync
```

### 드라이 런 (테스트)
```bash
npm run sync:dry
```

## 5. 권한 확인

Integration에 다음 권한이 있는지 확인하세요:
- ✅ Read content
- ✅ Update content  
- ✅ Insert content
- ✅ 데이터베이스에 Connection 추가됨

## 트러블슈팅

### "API token is invalid" 오류
- API 키가 올바른지 확인
- Integration이 올바른 workspace에 생성되었는지 확인
- API 키가 `secret_`으로 시작하는지 확인

### "object_not_found" 오류
- 데이터베이스 ID가 올바른지 확인
- Integration이 해당 데이터베이스에 연결되었는지 확인
- 데이터베이스가 삭제되지 않았는지 확인

### "validation_error" 오류
- 데이터베이스 속성이 올바르게 설정되었는지 확인
- Select 옵션이 미리 정의되었는지 확인

## 파일 추적 ID

초기화 후 각 코드 파일 하단에 다음과 같은 주석이 추가됩니다:

```javascript
// Notion ID : DL-filename-abc123 <-[deplink: DO NOT REMOVE]
```

이 주석을 삭제하거나 수정하지 마세요. 파일과 Notion 데이터베이스 간의 연결을 유지하는 데 필요합니다.
