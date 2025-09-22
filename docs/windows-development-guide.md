# Windows 개발 환경 가이드

## 🪟 Windows에서 PathInfo 개발하기

PathInfo 시스템은 Windows 환경에서도 완벽하게 작동하도록 설계되었으며, Windows의 특수한 경로 시스템을 완전히 지원합니다.

## 🎯 Windows 특화 기능

### 개발 환경 구성

```powershell
# PowerShell에서 환경 설정
# Node.js 설치 (winget 사용)
winget install OpenJS.NodeJS

# 또는 Chocolatey 사용
choco install nodejs

# Node.js 버전 확인 (18+ 권장)
node --version  # v18.0.0+
npm --version   # 8.0.0+

# 프로젝트 클론 및 설정
git clone <repository>
cd dependency-linker
npm install
```

### Windows 경로 특성

```typescript
// Windows 고유 경로 패턴
const windowsPaths = [
  'C:\\Users\\Developer\\Projects\\myapp',    // 드라이브 문자
  'D:\\Development\\Tools',                    // 다른 드라이브
  '\\\\network\\shared\\folder',              // UNC 경로
  'C:\\Program Files\\Application',           // 프로그램 파일
  'C:\\Program Files (x86)\\Legacy',         // x86 프로그램
  '%USERPROFILE%\\Documents\\Projects',       // 환경 변수
  '%APPDATA%\\MyApp\\config.json',           // 애플리케이션 데이터
  '%TEMP%\\build\\output',                   // 임시 디렉토리
  'C:\\ProgramData\\SharedData'              // 공용 데이터
];

// PathInfo로 Windows 경로 처리
windowsPaths.forEach(path => {
  const pathInfo = createPathInfo(path);
  console.log(`${path} → separator: "${pathInfo.separator}", depth: ${pathInfo.depth}`);
});
```

## 📁 Windows 프로젝트 구조 분석

### 일반적인 Windows 개발 구조

```
C:\Users\Developer\Projects\myapp\
├── src\                           # 소스 코드 (depth: 1)
│   ├── components\                # 컴포넌트 (depth: 2)
│   ├── utils\                     # 유틸리티 (depth: 2)
│   └── index.ts                   # 엔트리 포인트 (depth: 2)
├── docs\                          # 문서 (depth: 1)
│   ├── api\                       # API 문서 (depth: 2)
│   └── guides\                    # 가이드 (depth: 2)
├── tests\                         # 테스트 (depth: 1)
├── build\                         # 빌드 출력 (depth: 1)
├── node_modules\                  # 의존성 (depth: 1)
├── package.json                   # 패키지 설정 (depth: 0)
└── README.md                      # 프로젝트 설명 (depth: 0)
```

### PathInfo를 활용한 Windows 분석

```typescript
import { analyzeDirectory, groupPathInfoByDirectory } from './src/lib/index';

async function analyzeWindowsProject() {
  // Windows 프로젝트 구조 분석
  const results = await analyzeDirectory('C:\\Users\\Developer\\Projects\\myapp', {
    includeMarkdown: true,
    extensions: ['.ts', '.js', '.md', '.json'],
    maxDepth: 3,
    ignorePatterns: [
      'node_modules\\**',
      '.git\\**',
      'dist\\**',
      'bin\\**',
      'obj\\**'          // .NET 프로젝트 호환
    ]
  });

  // 경로 정보 추출
  const pathInfos = results
    .map(r => r.pathInfo)
    .filter(Boolean);

  // Windows 디렉토리 구조별 그룹핑
  const grouped = groupPathInfoByDirectory(pathInfos);

  console.log('🪟 Windows 프로젝트 구조:');
  for (const [dir, files] of grouped) {
    const displayDir = dir === '.' ? '(프로젝트 루트)' : dir;
    console.log(`📁 ${displayDir}: ${files.length}개 파일`);

    files.forEach(file => {
      console.log(`   📄 ${file.fileName} (깊이: ${file.depth})`);
    });
  }

  // 드라이브별 분석
  const driveAnalysis = pathInfos.reduce((acc, info) => {
    const match = info.absolute.match(/^([A-Z]):/);
    if (match) {
      const drive = match[1] + ':';
      acc[drive] = (acc[drive] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  console.log('\n💾 드라이브별 파일 분포:');
  Object.entries(driveAnalysis).forEach(([drive, count]) => {
    const bar = '█'.repeat(Math.ceil(count / pathInfos.length * 20));
    console.log(`   ${drive} ${bar} ${count}개`);
  });
}
```

## 🔧 Windows 특화 유틸리티

### 드라이브 문자 처리

```typescript
function analyzeWindowsDrives(pathInfos: PathInfo[]) {
  const driveInfo = new Map<string, {
    count: number;
    totalDepth: number;
    extensions: Set<string>;
  }>();

  pathInfos.forEach(pathInfo => {
    const match = pathInfo.absolute.match(/^([A-Z]):/);
    if (match) {
      const drive = match[1];
      const info = driveInfo.get(drive) || {
        count: 0,
        totalDepth: 0,
        extensions: new Set()
      };

      info.count++;
      info.totalDepth += pathInfo.depth;
      info.extensions.add(pathInfo.extension);
      driveInfo.set(drive, info);
    }
  });

  console.log('🪟 Windows 드라이브 분석:');
  for (const [drive, info] of driveInfo) {
    const avgDepth = (info.totalDepth / info.count).toFixed(1);
    console.log(`   ${drive}: ${info.count}개 파일, 평균 깊이: ${avgDepth}, 확장자: ${info.extensions.size}종류`);
  }

  return driveInfo;
}
```

### UNC 경로 지원

```typescript
function handleUNCPaths(inputPath: string): PathInfo {
  const pathInfo = createPathInfo(inputPath);

  // UNC 경로 감지
  if (pathInfo.absolute.startsWith('\\\\')) {
    console.log(`UNC 경로 감지: ${pathInfo.absolute}`);

    // 네트워크 경로 분석
    const uncMatch = pathInfo.absolute.match(/^\\\\([^\\]+)\\([^\\]+)/);
    if (uncMatch) {
      const [, server, share] = uncMatch;
      console.log(`   서버: ${server}, 공유: ${share}`);
    }
  }

  return pathInfo;
}
```

### Windows 환경 변수 확장

```typescript
import { homedir, tmpdir } from 'os';

function expandWindowsVariables(path: string): string {
  // 주요 Windows 환경 변수 확장
  const variables = {
    '%USERPROFILE%': homedir(),
    '%APPDATA%': process.env.APPDATA || `${homedir()}\\AppData\\Roaming`,
    '%LOCALAPPDATA%': process.env.LOCALAPPDATA || `${homedir()}\\AppData\\Local`,
    '%TEMP%': tmpdir(),
    '%TMP%': tmpdir(),
    '%PROGRAMFILES%': process.env.PROGRAMFILES || 'C:\\Program Files',
    '%PROGRAMFILES(X86)%': process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
    '%PROGRAMDATA%': process.env.PROGRAMDATA || 'C:\\ProgramData',
    '%WINDIR%': process.env.WINDIR || 'C:\\Windows',
    '%SYSTEMROOT%': process.env.SYSTEMROOT || 'C:\\Windows'
  };

  let expandedPath = path;
  for (const [variable, value] of Object.entries(variables)) {
    expandedPath = expandedPath.replace(
      new RegExp(variable.replace(/[()]/g, '\\$&'), 'gi'),
      value
    );
  }

  return expandedPath;
}

// 사용 예시
const pathsWithVariables = [
  '%USERPROFILE%\\Documents\\MyProject',
  '%APPDATA%\\MyApp\\config.json',
  '%TEMP%\\build-output'
];

pathsWithVariables.forEach(path => {
  const expanded = expandWindowsVariables(path);
  const pathInfo = createPathInfo(expanded);
  console.log(`${path} → ${pathInfo.relative}`);
});
```

## 🚀 Windows 개발 워크플로우

### 1. PowerShell/CMD 환경 설정

```powershell
# PowerShell 실행 정책 설정 (관리자 권한)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 개발 의존성 설치
npm install

# TypeScript 컴파일러 글로벌 설치
npm install -g typescript

# 테스트 환경 구성
npm test

# 개발 서버 실행
npm run dev
```

### 2. Visual Studio Code 통합

```json
// .vscode/settings.json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "files.eol": "\r\n",
  "files.associations": {
    "*.ts": "typescript"
  },
  "path-intellisense.mappings": {
    "/": "${workspaceRoot}",
    "\\": "${workspaceRoot}"
  }
}
```

### 3. Windows 배치 스크립트

```batch
@echo off
REM build.bat - Windows 빌드 스크립트

echo 🪟 Windows 빌드 시작...

REM TypeScript 컴파일
call npx tsc

REM 테스트 실행
call npm test

REM 배포 패키징
call npm run package

echo ✅ Windows 빌드 완료!
pause
```

## 📊 Windows 환경 성능 최적화

### Windows 파일 시스템 최적화

```typescript
import { Worker } from 'worker_threads';
import { cpus } from 'os';

class WindowsPathAnalyzer {
  private readonly maxWorkers: number;

  constructor() {
    // Windows에서 최적 워커 수 계산
    this.maxWorkers = Math.max(1, cpus().length - 1);
  }

  async analyzeLargeWindowsDirectory(rootPath: string) {
    console.log(`🪟 Windows ${this.maxWorkers}개 워커 사용`);

    // Windows 장기 경로명 지원 확인
    if (rootPath.length > 260) {
      console.warn('⚠️ 장기 경로명 감지. Windows 10 1607+ 또는 장기 경로명 지원 필요');
    }

    // 병렬 처리로 대용량 디렉토리 분석
    const chunks = await this.splitWindowsDirectory(rootPath);

    const results = await Promise.all(
      chunks.map(chunk => this.processWindowsChunk(chunk))
    );

    return results.flat();
  }

  private async splitWindowsDirectory(rootPath: string) {
    // Windows 드라이브별로 청크 분할
    const pathInfo = createPathInfo(rootPath);

    // 구현 로직...
    return [];
  }

  private async processWindowsChunk(paths: string[]) {
    // Windows 특화 경로 처리
    return createBatchPathInfo(paths.map(expandWindowsVariables));
  }
}
```

### 레지스트리 기반 설정

```typescript
// Windows 레지스트리에서 개발 도구 경로 감지
function detectWindowsDevTools(): Record<string, string> {
  const devTools: Record<string, string> = {};

  try {
    // Node.js 설치 경로
    if (process.env.PROGRAMFILES) {
      const nodePath = `${process.env.PROGRAMFILES}\\nodejs`;
      devTools.nodejs = nodePath;
    }

    // Visual Studio Code
    if (process.env.LOCALAPPDATA) {
      const vscodePath = `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code`;
      devTools.vscode = vscodePath;
    }

    // Git for Windows
    if (process.env.PROGRAMFILES) {
      const gitPath = `${process.env.PROGRAMFILES}\\Git`;
      devTools.git = gitPath;
    }

    console.log('🪟 Windows 개발 도구 감지:');
    Object.entries(devTools).forEach(([tool, path]) => {
      const pathInfo = createPathInfo(path);
      console.log(`   ${tool}: ${pathInfo.absolute}`);
    });

  } catch (error) {
    console.warn('Windows 개발 도구 감지 실패:', error);
  }

  return devTools;
}
```

## 🔍 Windows 디버깅 도구

### 이벤트 로그 통합

```typescript
import { writeFileSync } from 'fs';
import { homedir } from 'os';

function logWindowsPathAnalysis(pathInfos: PathInfo[]) {
  const debugInfo = {
    platform: process.platform,
    windowsVersion: process.env.OS,
    computerName: process.env.COMPUTERNAME,
    username: process.env.USERNAME,
    userProfile: process.env.USERPROFILE,
    timestamp: new Date().toISOString(),
    pathCount: pathInfos.length,
    drives: [...new Set(pathInfos.map(p => p.absolute.charAt(0)).filter(d => /[A-Z]/.test(d)))],
    paths: pathInfos.map(p => ({
      input: p.input,
      absolute: p.absolute,
      relative: p.relative,
      depth: p.depth,
      separator: p.separator,
      wasAbsolute: p.wasAbsolute,
      isDriveRoot: p.absolute.match(/^[A-Z]:\\?$/) !== null
    }))
  };

  // Windows 사용자 문서 폴더에 저장
  const logPath = `${homedir()}\\Documents\\pathinfo-windows-debug.json`;
  writeFileSync(logPath, JSON.stringify(debugInfo, null, 2));

  console.log(`🪟 Windows 디버그 정보 저장: ${logPath}`);
  console.log(`   분석된 드라이브: ${debugInfo.drives.join(', ')}`);
  console.log(`   총 ${pathInfos.length}개 경로 분석`);
  console.log(`   평균 깊이: ${(pathInfos.reduce((sum, p) => sum + p.depth, 0) / pathInfos.length).toFixed(1)}`);
}
```

### Windows 성능 카운터

```typescript
import { performance } from 'perf_hooks';

class WindowsPerformanceProfiler {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) throw new Error(`Mark ${startMark} not found`);

    const duration = performance.now() - start;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  async profileWindowsPathAnalysis(paths: string[]) {
    this.mark('total-start');

    // Windows 환경 변수 확장
    this.mark('expand-start');
    const expandedPaths = paths.map(expandWindowsVariables);
    this.measure('Windows 환경 변수 확장', 'expand-start');

    // PathInfo 배치 생성
    this.mark('batch-create-start');
    const pathInfos = createBatchPathInfo(expandedPaths);
    this.measure('PathInfo 배치 생성', 'batch-create-start');

    // 드라이브 분석
    this.mark('drive-analysis-start');
    const driveInfo = analyzeWindowsDrives(pathInfos);
    this.measure('드라이브 분석', 'drive-analysis-start');

    // 디렉토리 그룹핑
    this.mark('grouping-start');
    const grouped = groupPathInfoByDirectory(pathInfos);
    this.measure('디렉토리 그룹핑', 'grouping-start');

    this.measure('전체 Windows 분석 시간', 'total-start');

    console.log(`\n🪟 Windows 성능 요약:`);
    console.log(`   입력 경로: ${paths.length}개`);
    console.log(`   확장된 경로: ${expandedPaths.length}개`);
    console.log(`   생성된 PathInfo: ${pathInfos.length}개`);
    console.log(`   감지된 드라이브: ${driveInfo.size}개`);
    console.log(`   그룹: ${grouped.size}개`);
  }
}
```

## 🎯 Windows 배포 가이드

### MSI 패키지 준비

```xml
<!-- windows-installer.wxs -->
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="PathInfo Analyzer" Language="1033"
           Version="1.0.0.0" Manufacturer="YourCompany"
           UpgradeCode="YOUR-UPGRADE-CODE-HERE">

    <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" />

    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />

    <MediaTemplate EmbedCab="yes" />

    <Feature Id="ProductFeature" Title="PathInfo Analyzer" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>
  </Product>

  <Fragment>
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="PathInfo Analyzer" />
      </Directory>
    </Directory>
  </Fragment>
</Wix>
```

### Windows 서비스 등록

```typescript
// windows-service.ts
import { spawn } from 'child_process';

class WindowsServiceManager {
  static async installService() {
    const serviceName = 'PathInfoAnalyzer';
    const serviceDisplayName = 'PathInfo Analysis Service';
    const servicePath = process.execPath;
    const serviceArgs = [__filename];

    try {
      // sc.exe 명령어를 통한 서비스 등록
      const result = spawn('sc.exe', [
        'create',
        serviceName,
        `binPath= "${servicePath} ${serviceArgs.join(' ')}"`,
        `DisplayName= "${serviceDisplayName}"`,
        'start= auto'
      ], { stdio: 'inherit' });

      console.log(`🪟 Windows 서비스 '${serviceDisplayName}' 설치 완료`);

    } catch (error) {
      console.error('Windows 서비스 설치 실패:', error);
    }
  }

  static async startService() {
    try {
      spawn('sc.exe', ['start', 'PathInfoAnalyzer'], { stdio: 'inherit' });
      console.log('🪟 PathInfo 서비스 시작됨');
    } catch (error) {
      console.error('서비스 시작 실패:', error);
    }
  }
}
```

## 🌟 Windows 모범 사례

### 1. 장기 경로명 처리

```typescript
// Windows 10 1607+ 장기 경로명 지원
function handleWindowsLongPaths(path: string): string {
  // \\?\ 접두사 사용으로 260자 제한 우회
  if (path.length > 260 && !path.startsWith('\\\\?\\')) {
    if (path.match(/^[A-Z]:/)) {
      return `\\\\?\\${path}`;
    } else if (path.startsWith('\\\\')) {
      return `\\\\?\\UNC\\${path.slice(2)}`;
    }
  }
  return path;
}
```

### 2. Windows 권한 처리

```typescript
import { access, constants } from 'fs/promises';

async function checkWindowsPermissions(pathInfo: PathInfo) {
  try {
    await access(pathInfo.absolute, constants.R_OK);
    console.log(`✅ 읽기 권한: ${pathInfo.relative}`);
  } catch {
    console.log(`❌ 읽기 권한 없음: ${pathInfo.relative}`);
  }

  try {
    await access(pathInfo.absolute, constants.W_OK);
    console.log(`✅ 쓰기 권한: ${pathInfo.relative}`);
  } catch {
    console.log(`❌ 쓰기 권한 없음: ${pathInfo.relative}`);
  }
}
```

### 3. Windows 오류 처리

```typescript
function handleWindowsErrors(error: NodeJS.ErrnoException, pathInfo: PathInfo) {
  switch (error.code) {
    case 'ENOENT':
      console.error(`🪟 파일을 찾을 수 없음: ${pathInfo.absolute}`);
      break;
    case 'EACCES':
      console.error(`🪟 접근 권한 없음: ${pathInfo.absolute}`);
      break;
    case 'EMFILE':
      console.error(`🪟 너무 많은 파일이 열려 있음`);
      break;
    case 'ENAMETOOLONG':
      console.error(`🪟 경로가 너무 김: ${pathInfo.absolute}`);
      break;
    default:
      console.error(`🪟 Windows 오류 (${error.code}):`, error.message);
  }
}
```

## 🎉 결론

PathInfo 시스템은 Windows 환경의 모든 특수성을 완벽하게 지원합니다:

**Windows 고유 기능:**
- 🪟 드라이브 문자 완전 지원 (C:, D:, 등)
- 📡 UNC 네트워크 경로 처리
- 🔧 환경 변수 자동 확장
- 📁 장기 경로명 지원 (260자 제한 우회)
- ⚙️ Windows 서비스 통합

**개발 효율성:**
- 💻 Visual Studio Code 완벽 통합
- 🔍 PowerShell/CMD 환경 지원
- 📦 MSI 패키지 배포 지원
- 🛡️ Windows 권한 시스템 인식

Windows에서 PathInfo를 사용하여 강력하고 안정적인 경로 분석 시스템을 구축하세요! 🪟✨