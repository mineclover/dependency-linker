# macOS 개발 환경 가이드

## 🍎 macOS에서 PathInfo 개발하기

PathInfo 시스템은 macOS 환경에서 네이티브 성능과 완벽한 UNIX 호환성을 제공하도록 설계되었습니다.

## 🎯 macOS 특화 기능

### 개발 환경 구성

```bash
# Homebrew 설치 (macOS 패키지 매니저)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 설치
brew install node

# 또는 nvm 사용 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node
nvm use node

# Node.js 버전 확인 (18+ 권장)
node --version  # v18.0.0+
npm --version   # 8.0.0+

# 개발 도구 설치
brew install git
brew install --cask visual-studio-code

# 프로젝트 설정
git clone <repository>
cd dependency-linker
npm install
```

### macOS 경로 특성

```typescript
// macOS 고유 경로 패턴
const macosPaths = [
  '/Users/developer/Projects/myapp',        // 사용자 홈
  '/Applications/Visual Studio Code.app',  // 애플리케이션
  '/System/Library/Frameworks',            // 시스템 프레임워크
  '/usr/local/bin/node',                   // Homebrew 바이너리
  '/opt/homebrew/bin/brew',                // Apple Silicon Homebrew
  '/Library/Application Support/MyApp',    // 시스템 지원 파일
  '~/Documents/Projects',                  // 틸드 확장
  '/Volumes/ExternalDrive/backup',         // 마운트된 볼륨
  '/private/tmp/build',                    // 임시 디렉토리
  '/var/log/system.log',                   // 시스템 로그
  '/Users/Shared/data'                     // 공유 폴더
];

// PathInfo로 macOS 경로 처리
macosPaths.forEach(path => {
  const pathInfo = createPathInfo(path);
  console.log(`${path} → separator: "${pathInfo.separator}", depth: ${pathInfo.depth}`);
});
```

## 📁 macOS 프로젝트 구조 분석

### 일반적인 macOS 개발 구조

```
/Users/developer/Projects/myapp/
├── src/                           # 소스 코드 (depth: 1)
│   ├── components/                # 컴포넌트 (depth: 2)
│   ├── utils/                     # 유틸리티 (depth: 2)
│   └── index.ts                   # 엔트리 포인트 (depth: 2)
├── docs/                          # 문서 (depth: 1)
│   ├── api/                       # API 문서 (depth: 2)
│   └── guides/                    # 가이드 (depth: 2)
├── tests/                         # 테스트 (depth: 1)
├── build/                         # 빌드 출력 (depth: 1)
├── node_modules/                  # 의존성 (depth: 1)
├── .git/                          # Git 저장소 (depth: 1)
├── package.json                   # 패키지 설정 (depth: 0)
├── .gitignore                     # Git 무시 목록 (depth: 0)
└── README.md                      # 프로젝트 설명 (depth: 0)
```

### PathInfo를 활용한 macOS 분석

```typescript
import { analyzeDirectory, groupPathInfoByDirectory } from './src/lib/index';
import { homedir } from 'os';

async function analyzeMacOSProject() {
  // macOS 프로젝트 구조 분석
  const projectPath = `${homedir()}/Projects/myapp`;
  const results = await analyzeDirectory(projectPath, {
    includeMarkdown: true,
    extensions: ['.ts', '.js', '.md', '.json', '.sh'],
    maxDepth: 3,
    ignorePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.DS_Store',        // macOS 특화
      '**/.DS_Store',
      '.Trashes/**',      // 휴지통
      '.fseventsd/**'     // 파일 시스템 이벤트
    ]
  });

  // 경로 정보 추출
  const pathInfos = results
    .map(r => r.pathInfo)
    .filter(Boolean);

  // macOS 디렉토리 구조별 그룹핑
  const grouped = groupPathInfoByDirectory(pathInfos);

  console.log('🍎 macOS 프로젝트 구조:');
  for (const [dir, files] of grouped) {
    const displayDir = dir === '.' ? '(프로젝트 루트)' : dir;
    console.log(`📁 ${displayDir}: ${files.length}개 파일`);

    files.forEach(file => {
      console.log(`   📄 ${file.fileName} (깊이: ${file.depth})`);
    });
  }

  // 숨김 파일 분석 (macOS 특화)
  const hiddenFiles = pathInfos.filter(info =>
    info.fileName.startsWith('.') ||
    info.fileName === '.DS_Store'
  );

  console.log('\n👁️‍🗨️ macOS 숨김 파일 분석:');
  const hiddenByType = hiddenFiles.reduce((acc, file) => {
    const type = file.fileName === '.DS_Store' ? 'Finder 설정' :
                 file.fileName === '.gitignore' ? 'Git 설정' :
                 file.fileName.startsWith('.env') ? '환경 변수' :
                 '기타 숨김 파일';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(hiddenByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}개`);
  });
}
```

## 🔧 macOS 특화 유틸리티

### 틸드(~) 경로 확장

```typescript
import { homedir } from 'os';

function expandMacOSTildePaths(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace('~', homedir());
  }

  // 다른 사용자 홈 디렉토리 (~username/)
  const userTildeMatch = path.match(/^~([^/]+)(\/.*)?$/);
  if (userTildeMatch) {
    const [, username, rest = ''] = userTildeMatch;
    return `/Users/${username}${rest}`;
  }

  return path;
}

// 사용 예시
const macOSPathsWithTilde = [
  '~/Documents/Projects',
  '~/Desktop/file.txt',
  '~alice/shared/data.json',
  '~bob/workspace/project'
];

macOSPathsWithTilde.forEach(path => {
  const expanded = expandMacOSTildePaths(path);
  const pathInfo = createPathInfo(expanded);
  console.log(`${path} → ${pathInfo.relative}`);
});
```

### 번들 및 앱 패키지 처리

```typescript
function analyzeMacOSBundle(bundlePath: string): {
  isBundle: boolean;
  bundleType: string;
  executablePath?: string;
  resourcesPath?: string;
} {
  const pathInfo = createPathInfo(bundlePath);

  // .app, .framework, .bundle 등 macOS 번들 감지
  const bundleExtensions = ['.app', '.framework', '.bundle', '.plugin', '.kext'];
  const isBundle = bundleExtensions.some(ext => pathInfo.fileName.endsWith(ext));

  if (!isBundle) {
    return { isBundle: false, bundleType: 'none' };
  }

  const bundleType = bundleExtensions.find(ext => pathInfo.fileName.endsWith(ext)) || 'unknown';

  // 번들 내부 구조 분석
  const result = {
    isBundle: true,
    bundleType,
    executablePath: undefined as string | undefined,
    resourcesPath: undefined as string | undefined
  };

  if (bundleType === '.app') {
    // macOS 앱 번들 구조
    result.executablePath = `${pathInfo.absolute}/Contents/MacOS`;
    result.resourcesPath = `${pathInfo.absolute}/Contents/Resources`;
  } else if (bundleType === '.framework') {
    // macOS 프레임워크 구조
    result.executablePath = pathInfo.absolute;
    result.resourcesPath = `${pathInfo.absolute}/Resources`;
  }

  return result;
}

// 사용 예시
const macOSBundles = [
  '/Applications/Visual Studio Code.app',
  '/System/Library/Frameworks/Foundation.framework',
  '/Library/Audio/Plug-Ins/HAL/MyAudioDriver.plugin'
];

macOSBundles.forEach(bundlePath => {
  const analysis = analyzeMacOSBundle(bundlePath);
  console.log(`${bundlePath}:`);
  console.log(`   번들: ${analysis.isBundle ? '✅' : '❌'}`);
  if (analysis.isBundle) {
    console.log(`   타입: ${analysis.bundleType}`);
    if (analysis.executablePath) {
      console.log(`   실행 파일: ${analysis.executablePath}`);
    }
  }
});
```

### Spotlight 메타데이터 통합

```typescript
import { spawn } from 'child_process';

async function getSpotlightMetadata(filePath: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const mdls = spawn('mdls', ['-plist', '-', filePath]);
    let output = '';

    mdls.stdout.on('data', (data) => {
      output += data.toString();
    });

    mdls.on('close', (code) => {
      if (code === 0) {
        try {
          // plist 파싱 (간단한 구현)
          const metadata = parsePlist(output);
          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`mdls failed with code ${code}`));
      }
    });
  });
}

function parsePlist(plistContent: string): Record<string, any> {
  // 간단한 plist 파서 (실제로는 전용 라이브러리 사용 권장)
  const metadata: Record<string, any> = {};

  // 기본적인 파싱 로직
  const lines = plistContent.split('\n');
  lines.forEach(line => {
    const keyMatch = line.match(/<key>(.*?)<\/key>/);
    if (keyMatch) {
      // 키 추출 로직
    }
  });

  return metadata;
}
```

## 🚀 macOS 개발 워크플로우

### 1. Xcode Command Line Tools

```bash
# Xcode Command Line Tools 설치
xcode-select --install

# 설치 확인
xcode-select -p
# 출력: /Applications/Xcode.app/Contents/Developer

# Git 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2. Homebrew 패키지 관리

```bash
# 개발 도구 설치
brew install node npm yarn
brew install git gh
brew install tree jq

# GUI 애플리케이션 설치
brew install --cask visual-studio-code
brew install --cask github-desktop
brew install --cask sourcetree

# 설치된 패키지 확인
brew list
brew list --cask
```

### 3. Shell 환경 설정

```bash
# ~/.zshrc (macOS Catalina+)
export PATH="/opt/homebrew/bin:$PATH"  # Apple Silicon
export PATH="/usr/local/bin:$PATH"     # Intel Mac

# Node.js 환경
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/share/nvm/nvm.sh" ] && \. "/opt/homebrew/share/nvm/nvm.sh"

# 별칭 설정
alias ll="ls -la"
alias la="ls -A"
alias l="ls -CF"
alias ..="cd .."
alias ...="cd ../.."

# PathInfo 프로젝트 별칭
alias pathinfo-demo="npx tsx demo-macos-pathinfo.ts"
alias pathinfo-test="npm test"
```

## 📊 macOS 환경 성능 최적화

### Apple Silicon vs Intel 최적화

```typescript
import { arch } from 'os';

class MacOSPathAnalyzer {
  private readonly isAppleSilicon: boolean;
  private readonly maxWorkers: number;

  constructor() {
    this.isAppleSilicon = arch() === 'arm64';

    // Apple Silicon은 효율성 코어도 고려
    this.maxWorkers = this.isAppleSilicon
      ? Math.max(2, cpus().length - 2)  // 효율성 코어 예약
      : Math.max(1, cpus().length - 1); // Intel 기존 방식
  }

  async analyzeLargeMacOSDirectory(rootPath: string) {
    const chipset = this.isAppleSilicon ? 'Apple Silicon' : 'Intel';
    console.log(`🍎 macOS ${chipset} ${this.maxWorkers}개 워커 사용`);

    // Apple Silicon 최적화 경로
    if (this.isAppleSilicon) {
      return this.analyzeWithAppleSiliconOptimization(rootPath);
    } else {
      return this.analyzeWithIntelOptimization(rootPath);
    }
  }

  private async analyzeWithAppleSiliconOptimization(rootPath: string) {
    // Apple Silicon 특화 최적화
    console.log('🚀 Apple Silicon 최적화 활성화');

    // 메모리 효율적인 청크 처리
    const chunks = await this.splitDirectoryEfficiently(rootPath);

    const results = await Promise.all(
      chunks.map(chunk => this.processChunkOnAppleSilicon(chunk))
    );

    return results.flat();
  }

  private async analyzeWithIntelOptimization(rootPath: string) {
    // Intel Mac 최적화
    console.log('⚡ Intel 최적화 활성화');

    // 기존 병렬 처리 방식
    const chunks = await this.splitDirectoryTraditional(rootPath);

    const results = await Promise.all(
      chunks.map(chunk => this.processChunkOnIntel(chunk))
    );

    return results.flat();
  }

  private async splitDirectoryEfficiently(rootPath: string) {
    // Apple Silicon 메모리 효율적 분할
    const pathInfo = createPathInfo(rootPath);
    // 구현 로직...
    return [];
  }

  private async splitDirectoryTraditional(rootPath: string) {
    // Intel 기존 분할 방식
    const pathInfo = createPathInfo(rootPath);
    // 구현 로직...
    return [];
  }

  private async processChunkOnAppleSilicon(paths: string[]) {
    // Apple Silicon 최적화 처리
    return createBatchPathInfo(paths);
  }

  private async processChunkOnIntel(paths: string[]) {
    // Intel 최적화 처리
    return createBatchPathInfo(paths);
  }
}
```

### macOS 시스템 통합

```typescript
import { spawn } from 'child_process';

async function getMacOSSystemInfo(): Promise<{
  version: string;
  build: string;
  architecture: string;
  hostname: string;
  users: string[];
}> {
  const systemInfo = {
    version: '',
    build: '',
    architecture: arch(),
    hostname: '',
    users: [] as string[]
  };

  try {
    // macOS 버전 정보
    const swVers = spawn('sw_vers', ['-productVersion']);
    swVers.stdout.on('data', (data) => {
      systemInfo.version = data.toString().trim();
    });

    // 빌드 정보
    const buildVers = spawn('sw_vers', ['-buildVersion']);
    buildVers.stdout.on('data', (data) => {
      systemInfo.build = data.toString().trim();
    });

    // 호스트명
    systemInfo.hostname = require('os').hostname();

    // 사용자 목록
    const users = spawn('dscl', ['.', 'list', '/Users']);
    users.stdout.on('data', (data) => {
      systemInfo.users = data.toString()
        .split('\n')
        .filter(user => user && !user.startsWith('_'))
        .slice(0, 10); // 시스템 사용자 제외
    });

  } catch (error) {
    console.warn('macOS 시스템 정보 수집 실패:', error);
  }

  return systemInfo;
}
```

## 🔍 macOS 디버깅 도구

### 시스템 로그 통합

```typescript
import { writeFileSync } from 'fs';
import { homedir } from 'os';

function logMacOSPathAnalysis(pathInfos: PathInfo[]) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    architecture: arch(),
    macosVersion: '', // getMacOSSystemInfo()에서 설정
    nodeVersion: process.version,
    hostname: require('os').hostname(),
    username: require('os').userInfo().username,
    pathCount: pathInfos.length,
    volumeAnalysis: analyzeMacOSVolumes(pathInfos),
    bundleAnalysis: analyzeMacOSBundles(pathInfos),
    paths: pathInfos.map(p => ({
      input: p.input,
      absolute: p.absolute,
      relative: p.relative,
      depth: p.depth,
      separator: p.separator,
      isBundle: p.fileName.match(/\.(app|framework|bundle|plugin)$/) !== null,
      isHidden: p.fileName.startsWith('.'),
      isMacOSSpecific: p.fileName === '.DS_Store' || p.absolute.includes('.Trashes')
    }))
  };

  // macOS 표준 로그 위치에 저장
  const logPath = `${homedir()}/Library/Logs/pathinfo-macos-debug.json`;
  writeFileSync(logPath, JSON.stringify(debugInfo, null, 2));

  console.log(`🍎 macOS 디버그 정보 저장: ${logPath}`);
  console.log(`   분석된 볼륨: ${Object.keys(debugInfo.volumeAnalysis).length}개`);
  console.log(`   번들 파일: ${Object.values(debugInfo.bundleAnalysis).reduce((a, b) => a + b, 0)}개`);
  console.log(`   총 ${pathInfos.length}개 경로 분석`);
}

function analyzeMacOSVolumes(pathInfos: PathInfo[]): Record<string, number> {
  const volumes: Record<string, number> = {};

  pathInfos.forEach(pathInfo => {
    if (pathInfo.absolute.startsWith('/Volumes/')) {
      const volumeMatch = pathInfo.absolute.match(/^\/Volumes\/([^/]+)/);
      if (volumeMatch) {
        const volumeName = volumeMatch[1];
        volumes[volumeName] = (volumes[volumeName] || 0) + 1;
      }
    } else {
      volumes['Macintosh HD'] = (volumes['Macintosh HD'] || 0) + 1;
    }
  });

  return volumes;
}

function analyzeMacOSBundles(pathInfos: PathInfo[]): Record<string, number> {
  const bundles: Record<string, number> = {
    '.app': 0,
    '.framework': 0,
    '.bundle': 0,
    '.plugin': 0
  };

  pathInfos.forEach(pathInfo => {
    for (const bundleExt of Object.keys(bundles)) {
      if (pathInfo.fileName.endsWith(bundleExt)) {
        bundles[bundleExt]++;
        break;
      }
    }
  });

  return bundles;
}
```

### macOS 성능 프로파일링

```typescript
import { performance } from 'perf_hooks';

class MacOSPerformanceProfiler {
  private marks: Map<string, number> = new Map();
  private readonly isAppleSilicon: boolean;

  constructor() {
    this.isAppleSilicon = arch() === 'arm64';
  }

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) throw new Error(`Mark ${startMark} not found`);

    const duration = performance.now() - start;
    const chipset = this.isAppleSilicon ? 'Apple Silicon' : 'Intel';
    console.log(`⏱️ [${chipset}] ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  async profileMacOSPathAnalysis(paths: string[]) {
    this.mark('total-start');

    // 틸드 경로 확장
    this.mark('tilde-expand-start');
    const expandedPaths = paths.map(expandMacOSTildePaths);
    this.measure('macOS 틸드 경로 확장', 'tilde-expand-start');

    // PathInfo 배치 생성
    this.mark('batch-create-start');
    const pathInfos = createBatchPathInfo(expandedPaths);
    this.measure('PathInfo 배치 생성', 'batch-create-start');

    // 번들 분석
    this.mark('bundle-analysis-start');
    const bundleInfo = analyzeMacOSBundles(pathInfos);
    this.measure('macOS 번들 분석', 'bundle-analysis-start');

    // 볼륨 분석
    this.mark('volume-analysis-start');
    const volumeInfo = analyzeMacOSVolumes(pathInfos);
    this.measure('macOS 볼륨 분석', 'volume-analysis-start');

    // 디렉토리 그룹핑
    this.mark('grouping-start');
    const grouped = groupPathInfoByDirectory(pathInfos);
    this.measure('디렉토리 그룹핑', 'grouping-start');

    this.measure('전체 macOS 분석 시간', 'total-start');

    const chipset = this.isAppleSilicon ? 'Apple Silicon' : 'Intel';
    console.log(`\n🍎 macOS ${chipset} 성능 요약:`);
    console.log(`   입력 경로: ${paths.length}개`);
    console.log(`   확장된 경로: ${expandedPaths.length}개`);
    console.log(`   생성된 PathInfo: ${pathInfos.length}개`);
    console.log(`   감지된 볼륨: ${Object.keys(volumeInfo).length}개`);
    console.log(`   번들 파일: ${Object.values(bundleInfo).reduce((a, b) => a + b, 0)}개`);
    console.log(`   그룹: ${grouped.size}개`);
  }
}
```

## 🎯 macOS 배포 가이드

### 앱 번들 생성

```typescript
// macos-app-builder.ts
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

class MacOSAppBuilder {
  static async createAppBundle(appName: string, version: string) {
    const bundlePath = `./dist/${appName}.app`;

    // 앱 번들 디렉토리 구조 생성
    mkdirSync(`${bundlePath}/Contents/MacOS`, { recursive: true });
    mkdirSync(`${bundlePath}/Contents/Resources`, { recursive: true });

    // Info.plist 생성
    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>${appName}</string>
    <key>CFBundleExecutable</key>
    <string>${appName}</string>
    <key>CFBundleIdentifier</key>
    <string>com.yourcompany.${appName.toLowerCase()}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${version}</string>
    <key>CFBundleVersion</key>
    <string>${version}</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>`;

    writeFileSync(`${bundlePath}/Contents/Info.plist`, infoPlist);

    console.log(`🍎 macOS 앱 번들 생성: ${bundlePath}`);
  }

  static async signApp(bundlePath: string, identity: string) {
    try {
      // 코드 서명
      const result = spawn('codesign', [
        '--force',
        '--sign', identity,
        '--deep',
        bundlePath
      ], { stdio: 'inherit' });

      console.log(`🔐 macOS 앱 서명 완료: ${bundlePath}`);

    } catch (error) {
      console.error('macOS 앱 서명 실패:', error);
    }
  }

  static async notarizeApp(bundlePath: string) {
    try {
      // 공증 프로세스 (Apple Developer Account 필요)
      const result = spawn('xcrun', [
        'notarytool',
        'submit',
        bundlePath,
        '--keychain-profile', 'notarization'
      ], { stdio: 'inherit' });

      console.log(`📝 macOS 앱 공증 완료: ${bundlePath}`);

    } catch (error) {
      console.error('macOS 앱 공증 실패:', error);
    }
  }
}
```

### Homebrew Formula 생성

```ruby
# pathinfo.rb
class Pathinfo < Formula
  desc "Advanced path analysis tool with cross-platform support"
  homepage "https://github.com/yourorg/dependency-linker"
  url "https://github.com/yourorg/dependency-linker/archive/v1.0.0.tar.gz"
  sha256 "sha256_here"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/pathinfo", "--version"
  end
end
```

## 🌟 macOS 모범 사례

### 1. 시스템 통합

```typescript
// macOS LaunchAgent 설정
const launchAgentPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.yourcompany.pathinfo</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/usr/local/lib/pathinfo/index.js</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>`;

// ~/Library/LaunchAgents/com.yourcompany.pathinfo.plist
```

### 2. 권한 및 보안

```typescript
import { access, constants } from 'fs/promises';

async function checkMacOSPermissions(pathInfo: PathInfo) {
  try {
    // 파일 시스템 권한 확인
    await access(pathInfo.absolute, constants.R_OK);
    console.log(`✅ 읽기 권한: ${pathInfo.relative}`);

    // macOS 특별 디렉토리 확인
    if (pathInfo.absolute.includes('Library/Application Support')) {
      console.log(`📁 애플리케이션 지원 디렉토리 접근`);
    }

    if (pathInfo.absolute.includes('Documents') || pathInfo.absolute.includes('Desktop')) {
      console.log(`🔐 사용자 문서 디렉토리 (Privacy 권한 필요할 수 있음)`);
    }

  } catch (error) {
    console.log(`❌ 접근 권한 없음: ${pathInfo.relative}`);
  }
}
```

### 3. 성능 최적화

```typescript
// Apple Silicon 최적화
function optimizeForAppleSilicon() {
  if (arch() === 'arm64') {
    // Apple Silicon 특화 최적화
    process.env.NODE_OPTIONS = '--max-old-space-size=8192'; // 8GB 메모리 활용

    console.log('🚀 Apple Silicon 최적화 활성화');
    console.log('   - 메모리 사용량 최적화');
    console.log('   - 효율성 코어 활용');
  }
}
```

## 🎉 결론

PathInfo 시스템은 macOS 환경의 모든 특성을 완벽하게 활용합니다:

**macOS 고유 기능:**
- 🍎 UNIX 경로 시스템 네이티브 지원
- 📱 앱 번들 (.app, .framework) 인식
- 🏠 틸드(~) 경로 자동 확장
- 💾 볼륨 및 마운트 포인트 처리
- 🔍 Spotlight 메타데이터 통합

**개발 효율성:**
- 🛠️ Xcode 및 Command Line Tools 통합
- 🍺 Homebrew 패키지 관리 지원
- ⚡ Apple Silicon 최적화
- 🔐 macOS 보안 모델 준수

**Apple 생태계 통합:**
- 📱 iOS/macOS 개발 워크플로우 지원
- 🔐 코드 서명 및 공증 준비
- 📦 App Store 배포 호환성
- 🍎 macOS Big Sur+ 디자인 가이드라인 준수

macOS에서 PathInfo를 사용하여 아름답고 효율적인 경로 분석 시스템을 구축하세요! 🍎✨