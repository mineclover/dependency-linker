# Linux 개발 환경 가이드

## 🐧 Linux에서 PathInfo 개발하기

PathInfo 시스템은 Linux를 주요 개발 플랫폼으로 설계되었으며, Linux의 POSIX 표준을 기본으로 합니다.

## 🎯 Linux 우선 설계

### 개발 환경 구성

```bash
# Ubuntu/Debian 환경 설정
sudo apt update
sudo apt install nodejs npm git

# Node.js 버전 확인 (18+ 권장)
node --version  # v18.0.0+
npm --version   # 8.0.0+

# 프로젝트 클론 및 설정
git clone <repository>
cd dependency-linker
npm install
```

### 기본 경로 구조

```typescript
// Linux 표준 경로 패턴
const linuxPaths = [
  '/home/user/projects/myapp',      // 사용자 프로젝트
  '/opt/applications/service',      // 시스템 애플리케이션
  '/usr/local/bin/tools',          // 로컬 도구
  '/var/log/application.log',      // 로그 파일
  '/tmp/build/artifacts',          // 임시 빌드 파일
  '/etc/config/app.conf'           // 설정 파일
];

// PathInfo로 Linux 경로 처리
linuxPaths.forEach(path => {
  const pathInfo = createPathInfo(path);
  console.log(`${path} → depth: ${pathInfo.depth}, separator: "${pathInfo.separator}"`);
});
```

## 📁 Linux 프로젝트 구조 분석

### 일반적인 Linux 프로젝트

```
/home/user/projects/myapp/
├── src/                    # 소스 코드 (depth: 1)
│   ├── components/         # 컴포넌트 (depth: 2)
│   ├── utils/             # 유틸리티 (depth: 2)
│   └── index.ts           # 엔트리 포인트 (depth: 2)
├── docs/                  # 문서 (depth: 1)
│   ├── api/              # API 문서 (depth: 2)
│   └── guides/           # 가이드 (depth: 2)
├── tests/                # 테스트 (depth: 1)
├── build/                # 빌드 출력 (depth: 1)
├── package.json          # 패키지 설정 (depth: 0)
└── README.md            # 프로젝트 설명 (depth: 0)
```

### PathInfo를 활용한 분석

```typescript
import { analyzeDirectory, groupPathInfoByDirectory } from './src/lib/index';

async function analyzeLinuxProject() {
  // Linux 프로젝트 구조 분석
  const results = await analyzeDirectory('/home/user/projects/myapp', {
    includeMarkdown: true,
    extensions: ['.ts', '.js', '.md', '.json'],
    maxDepth: 3,
    ignorePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      '.cache/**'
    ]
  });

  // 경로 정보 추출
  const pathInfos = results
    .map(r => r.pathInfo)
    .filter(Boolean);

  // Linux 디렉토리 구조별 그룹핑
  const grouped = groupPathInfoByDirectory(pathInfos);

  console.log('🐧 Linux 프로젝트 구조:');
  for (const [dir, files] of grouped) {
    const displayDir = dir === '.' ? '(프로젝트 루트)' : dir;
    console.log(`📁 ${displayDir}: ${files.length}개 파일`);

    files.forEach(file => {
      console.log(`   📄 ${file.fileName} (깊이: ${file.depth})`);
    });
  }

  // 깊이별 분석
  const depthAnalysis = pathInfos.reduce((acc, info) => {
    acc[info.depth] = (acc[info.depth] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  console.log('\n📊 깊이별 파일 분포:');
  Object.entries(depthAnalysis).forEach(([depth, count]) => {
    const bar = '█'.repeat(Math.ceil(count / pathInfos.length * 20));
    console.log(`   깊이 ${depth}: ${bar} ${count}개`);
  });
}
```

## 🔧 Linux 특화 유틸리티

### 심볼릭 링크 처리

```typescript
import { readlinkSync, lstatSync } from 'fs';

function createLinuxPathInfo(inputPath: string) {
  const pathInfo = createPathInfo(inputPath);

  // Linux 심볼릭 링크 감지
  try {
    const stats = lstatSync(pathInfo.absolute);
    if (stats.isSymbolicLink()) {
      const target = readlinkSync(pathInfo.absolute);
      console.log(`심볼릭 링크: ${pathInfo.relative} → ${target}`);
    }
  } catch (error) {
    // 파일이 존재하지 않는 경우 무시
  }

  return pathInfo;
}
```

### 권한 기반 필터링

```typescript
import { accessSync, constants } from 'fs';

function filterByPermissions(pathInfos: PathInfo[], permission: 'read' | 'write' | 'execute') {
  const permissionMap = {
    read: constants.R_OK,
    write: constants.W_OK,
    execute: constants.X_OK
  };

  return pathInfos.filter(pathInfo => {
    try {
      accessSync(pathInfo.absolute, permissionMap[permission]);
      return true;
    } catch {
      return false;
    }
  });
}

// 사용 예시
const pathInfos = createBatchPathInfo([
  '/usr/bin/node',
  '/etc/passwd',
  '/tmp/myfile.txt',
  '/home/user/script.sh'
]);

const executable = filterByPermissions(pathInfos, 'execute');
console.log('실행 가능한 파일들:', executable.map(p => p.relative));
```

## 🚀 Linux 개발 워크플로우

### 1. 개발 환경 설정

```bash
# 개발 의존성 설치
npm install

# TypeScript 컴파일러 설정
npx tsc --init

# 테스트 환경 구성
npm test

# 개발 서버 실행
npm run dev
```

### 2. PathInfo 기반 개발

```typescript
#!/usr/bin/env node
// Linux shebang으로 직접 실행 가능

import { createPathInfo, analyzeDirectory } from './src/lib/index';

async function linuxDevelopmentWorkflow() {
  // 현재 작업 디렉토리 분석
  const workingDir = process.cwd();
  console.log(`🐧 Linux 작업 디렉토리: ${workingDir}`);

  // 프로젝트 파일 스캔
  const results = await analyzeDirectory('.', {
    includeMarkdown: true,
    extensions: ['.ts', '.js', '.md'],
    maxDepth: 3
  });

  // Linux 개발에 중요한 파일들 필터링
  const importantFiles = results.filter(r =>
    r.pathInfo && (
      r.pathInfo.fileName === 'package.json' ||
      r.pathInfo.fileName === 'tsconfig.json' ||
      r.pathInfo.fileName === 'README.md' ||
      r.pathInfo.fileName.endsWith('.sh') ||
      r.pathInfo.extension === '.md'
    )
  );

  console.log('\n📋 중요한 프로젝트 파일들:');
  importantFiles.forEach(file => {
    const icon = file.pathInfo.extension === '.sh' ? '🔧' :
                 file.pathInfo.extension === '.md' ? '📝' :
                 file.pathInfo.fileName.includes('package') ? '📦' :
                 file.pathInfo.fileName.includes('tsconfig') ? '⚙️' : '📄';

    console.log(`   ${icon} ${file.pathInfo.relative} (깊이: ${file.pathInfo.depth})`);
  });
}

// 실행
linuxDevelopmentWorkflow().catch(console.error);
```

### 3. 빌드 및 배포

```bash
# Linux용 빌드
npm run build

# 권한 설정 (실행 파일의 경우)
chmod +x dist/bin/cli.js

# 시스템 경로에 링크 생성
sudo ln -s $(pwd)/dist/bin/cli.js /usr/local/bin/myapp

# 테스트
myapp --version
```

## 📊 Linux 환경 성능 최적화

### 파일 시스템 최적화

```typescript
import { Worker } from 'worker_threads';

class LinuxPathAnalyzer {
  private workers: Worker[] = [];

  async analyzeLargeDirectory(rootPath: string) {
    // Linux의 멀티코어 활용
    const cpuCount = require('os').cpus().length;

    console.log(`🐧 ${cpuCount}개 CPU 코어 활용`);

    // 병렬 처리로 대용량 디렉토리 분석
    const chunks = await this.splitDirectory(rootPath, cpuCount);

    const results = await Promise.all(
      chunks.map(chunk => this.processChunk(chunk))
    );

    return results.flat();
  }

  private async splitDirectory(rootPath: string, chunks: number) {
    // 디렉토리를 청크로 분할
    const pathInfo = createPathInfo(rootPath);
    // 구현 로직...
    return [];
  }

  private async processChunk(paths: string[]) {
    // 개별 청크 처리
    return createBatchPathInfo(paths);
  }
}
```

### 메모리 최적화

```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function processLargeFileList(listPath: string) {
  const fileStream = createReadStream(listPath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity // Windows \r\n도 처리
  });

  const results: PathInfo[] = [];

  for await (const line of rl) {
    if (line.trim()) {
      const pathInfo = createPathInfo(line.trim());

      // 즉시 처리하여 메모리 사용량 최소화
      if (pathInfo.isWithinProject) {
        results.push(pathInfo);
      }
    }
  }

  console.log(`🐧 처리된 유효 경로: ${results.length}개`);
  return results;
}
```

## 🔍 Linux 디버깅 도구

### 상세 로깅

```typescript
import { writeFileSync } from 'fs';

function debugLinuxPaths(pathInfos: PathInfo[]) {
  const debugInfo = {
    platform: process.platform,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
    pathCount: pathInfos.length,
    paths: pathInfos.map(p => ({
      input: p.input,
      absolute: p.absolute,
      relative: p.relative,
      depth: p.depth,
      separator: p.separator,
      isWithinProject: p.isWithinProject
    }))
  };

  // Linux 표준 로그 위치에 저장
  const logPath = '/tmp/pathinfo-debug.json';
  writeFileSync(logPath, JSON.stringify(debugInfo, null, 2));

  console.log(`🐧 디버그 정보 저장: ${logPath}`);
  console.log(`   총 ${pathInfos.length}개 경로 분석`);
  console.log(`   프로젝트 내부: ${pathInfos.filter(p => p.isWithinProject).length}개`);
  console.log(`   평균 깊이: ${(pathInfos.reduce((sum, p) => sum + p.depth, 0) / pathInfos.length).toFixed(1)}`);
}
```

### 성능 프로파일링

```typescript
import { performance } from 'perf_hooks';

class LinuxPerformanceProfiler {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) throw new Error(`Mark ${startMark} not found`);

    const duration = performance.now() - start;
    console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  async profilePathAnalysis(paths: string[]) {
    this.mark('total-start');

    this.mark('batch-create-start');
    const pathInfos = createBatchPathInfo(paths);
    this.measure('PathInfo 배치 생성', 'batch-create-start');

    this.mark('grouping-start');
    const grouped = groupPathInfoByDirectory(pathInfos);
    this.measure('디렉토리 그룹핑', 'grouping-start');

    this.mark('filtering-start');
    const filtered = filterPathInfo(pathInfos, {
      extensions: ['.ts', '.js', '.md'],
      maxDepth: 3
    });
    this.measure('경로 필터링', 'filtering-start');

    this.measure('전체 처리 시간', 'total-start');

    console.log(`\n🐧 Linux 성능 요약:`);
    console.log(`   입력 경로: ${paths.length}개`);
    console.log(`   생성된 PathInfo: ${pathInfos.length}개`);
    console.log(`   그룹: ${grouped.size}개`);
    console.log(`   필터링 결과: ${filtered.length}개`);
  }
}
```

## 🎯 Linux 배포 가이드

### npm 패키지 준비

```bash
# Linux 빌드
npm run build

# 패키지 검증
npm pack --dry-run

# Linux에서 테스트
npm install -g .
```

### systemd 서비스 등록

```ini
# /etc/systemd/system/pathinfo-service.service
[Unit]
Description=PathInfo Analysis Service
After=network.target

[Service]
Type=simple
User=pathinfo
WorkingDirectory=/opt/pathinfo
ExecStart=/usr/bin/node dist/service.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 서비스 활성화
sudo systemctl enable pathinfo-service
sudo systemctl start pathinfo-service
sudo systemctl status pathinfo-service
```

## 🌟 Linux 모범 사례

### 1. 경로 처리 최적화

```typescript
// Linux에서 효율적인 경로 처리
const optimizedPathInfo = createPathInfo('./src/index.ts');

// 캐싱 활용
const pathCache = new Map<string, PathInfo>();

function getCachedPathInfo(path: string): PathInfo {
  if (!pathCache.has(path)) {
    pathCache.set(path, createPathInfo(path));
  }
  return pathCache.get(path)!;
}
```

### 2. 에러 처리

```typescript
function safeCreatePathInfo(path: string): PathInfo | null {
  try {
    return createPathInfo(path);
  } catch (error) {
    console.error(`🐧 Linux 경로 처리 오류: ${path}`, error);
    return null;
  }
}
```

### 3. 리소스 관리

```typescript
process.on('SIGTERM', () => {
  console.log('🐧 Linux 신호 수신, 정리 중...');
  // PathInfo 캐시 정리
  // 임시 파일 삭제
  process.exit(0);
});
```

## 🎉 결론

PathInfo 시스템은 Linux 환경에서 최적의 성능과 안정성을 제공하도록 설계되었습니다. POSIX 표준을 준수하면서도 다른 플랫폼과의 호환성을 유지합니다.

**Linux 개발의 주요 이점:**
- 🐧 네이티브 POSIX 지원
- 🚀 최적화된 성능
- 🔧 풍부한 시스템 도구 통합
- 📊 효율적인 멀티코어 활용
- 🛡️ 안정적인 메모리 관리

Linux에서 PathInfo를 사용하여 강력하고 효율적인 경로 분석 시스템을 구축하세요!