# Project Root Detection & Configuration Management

## 📍 프로젝트 루트 탐지 전략

### 자동 탐지 우선순위
1. **package.json 기반 탐지** (최우선)
2. **.git 디렉토리 기반 탐지** (차순위)
3. **수동 지정** (`--root` 플래그)
4. **현재 디렉토리** (fallback)

### 탐지 알고리즘
```typescript
class ProjectRootDetector {
  async detectProjectRoot(startPath?: string): Promise<string> {
    const searchPath = startPath || process.cwd();
    
    // 1. package.json을 찾을 때까지 상위로 탐색
    let packageJsonRoot = await this.findUpwards(searchPath, 'package.json');
    if (packageJsonRoot) return packageJsonRoot;
    
    // 2. .git 디렉토리를 찾을 때까지 상위로 탐색  
    let gitRoot = await this.findUpwards(searchPath, '.git');
    if (gitRoot) return gitRoot;
    
    // 3. 현재 디렉토리 사용
    return searchPath;
  }
  
  private async findUpwards(startPath: string, target: string): Promise<string | null> {
    let currentPath = path.resolve(startPath);
    
    while (currentPath !== path.dirname(currentPath)) {
      const targetPath = path.join(currentPath, target);
      if (await fs.pathExists(targetPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }
    
    return null;
  }
}
```

## 📄 Configuration Files

### deplink.config.json (프로젝트 루트)
```json
{
  "$schema": "./node_modules/dependency-linker/schemas/config.schema.json",
  "version": "1.0.0",
  "projectName": "my-awesome-project",
  "notion": {
    "databases": {
      "files": "database-id-from-notion",
      "docs": "database-id-from-notion",
      "functions": "database-id-from-notion"
    },
    "parentPageId": "optional-parent-page-id"
  },
  "analysis": {
    "includePatterns": ["src/**/*", "docs/**/*"],
    "excludePatterns": ["node_modules/**", "dist/**", ".git/**"],
    "parseCodeFiles": true,
    "parseMarkdownFiles": true,
    "detectLibraries": true
  },
  "sync": {
    "autoSync": false,
    "batchSize": 50,
    "rateLimitDelay": 350
  }
}
```

### .env 파일 관리
```bash
# .env (생성됨, .gitignore에 추가됨)
NOTION_API_KEY=secret_abc123...
NOTION_WORKSPACE_ID=optional-workspace-id

# 선택적 환경별 설정
DEPLINK_ENVIRONMENT=development
DEPLINK_LOG_LEVEL=info
```

### .env.example (생성됨, git에 포함)
```bash
# Notion API 설정
NOTION_API_KEY=your_notion_api_key_here
NOTION_WORKSPACE_ID=optional_workspace_id

# 환경 설정
DEPLINK_ENVIRONMENT=development
DEPLINK_LOG_LEVEL=info
```

## 🔧 환경 설정 프로세스

### `npx deplink setup` 워크플로우
```typescript
class SetupCommand {
  async execute() {
    const projectRoot = await this.detector.detectProjectRoot();
    
    // 1. 프로젝트 루트 확인
    console.log(`✅ Project root detected: ${projectRoot}`);
    
    // 2. Notion API 키 입력받기
    const apiKey = await this.promptForNotionApiKey();
    
    // 3. .env 파일 생성
    await this.createEnvFile(projectRoot, apiKey);
    
    // 4. .gitignore 업데이트
    await this.updateGitIgnore(projectRoot);
    
    // 5. deplink.config.json 생성 또는 업데이트
    await this.createOrUpdateConfig(projectRoot);
    
    console.log('🎉 Setup complete! Run `npx deplink sync` to start.');
  }
  
  private async promptForNotionApiKey(): Promise<string> {
    return await prompts({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Notion API key:',
      validate: (value) => value.startsWith('secret_') ? true : 'Invalid API key format'
    });
  }
  
  private async updateGitIgnore(projectRoot: string): Promise<void> {
    const gitIgnorePath = path.join(projectRoot, '.gitignore');
    const depLinkIgnores = [
      '',
      '# Dependency Linker',
      '.env',
      '.deplink/cache/',
      '.deplink/temp/'
    ].join('\n');
    
    if (await fs.pathExists(gitIgnorePath)) {
      const content = await fs.readFile(gitIgnorePath, 'utf-8');
      if (!content.includes('# Dependency Linker')) {
        await fs.appendFile(gitIgnorePath, depLinkIgnores);
      }
    } else {
      await fs.writeFile(gitIgnorePath, depLinkIgnores);
    }
  }
}
```

## 🗂️ 내부 데이터 구조

### .deplink/ 디렉토리 구조
```
.deplink/
├── mappings.db              # SQLite: Notion ID 매핑
├── index.db                 # SQLite: 의존성 인덱스
├── cache/                   # 임시 파일 캐시
│   ├── contexts/           # 컨텍스트 임시 파일
│   └── exports/            # Notion 내보내기 캐시
└── logs/                    # 실행 로그
    ├── sync.log
    └── errors.log
```

### SQLite 스키마
```sql
-- mappings.db
CREATE TABLE notion_mappings (
  local_id TEXT PRIMARY KEY,
  notion_page_id TEXT NOT NULL,
  notion_database_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'file', 'doc', 'function'
  last_synced DATETIME,
  checksum TEXT
);

CREATE TABLE database_schemas (
  database_key TEXT PRIMARY KEY,
  database_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  properties_mapping TEXT NOT NULL -- JSON
);
```

## 🎯 CLI 명령어 개선

### 프로젝트 루트를 고려한 명령어
```bash
# 어느 하위 디렉토리에서든 실행 가능 (자동 탐지)
cd your-project/src/components/
npx deplink sync              # 프로젝트 루트 자동 탐지

# 수동 지정
npx deplink sync --root /path/to/project

# 현재 디렉토리 강제 사용
npx deplink sync --root .

# 프로젝트 정보 확인
npx deplink info              # 탐지된 루트, 설정 정보 출력
```

## 🔐 보안 고려사항

### API 키 보안
- `.env` 파일은 절대 git에 커밋하지 않음
- `.env.example`로 필요한 환경변수 가이드 제공
- API 키 검증 로직 포함

### 권한 관리
- 프로젝트 루트 외부 파일 접근 제한
- 사용자 홈 디렉토리나 시스템 파일 접근 방지
- Notion API 권한 범위 확인

## 📦 NPM 패키지 구조

### package.json
```json
{
  "name": "dependency-linker",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "deplink": "./dist/cli/main.js"
  },
  "files": [
    "dist/",
    "schemas/",
    "templates/"
  ],
  "peerDependencies": {
    "typescript": ">=4.5.0"
  }
}
```

### 배포 파일 구조
```
dependency-linker/
├── dist/                    # 컴파일된 JavaScript
├── schemas/                 # JSON 스키마 파일
├── templates/              # 설정 파일 템플릿
│   ├── deplink.config.json
│   └── .env.example
└── package.json
```

이러한 구조로 린터나 프리티어와 같은 개발 도구의 표준적인 사용 패턴을 따르게 됩니다.