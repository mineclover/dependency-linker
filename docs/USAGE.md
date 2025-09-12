# 사용 방법 가이드

TypeScript 파일 분석기의 실제 사용 방법과 활용 예시를 설명합니다.

## 목차
- [기본 사용법](#기본-사용법)
- [출력 형식](#출력-형식)
- [실제 사용 사례](#실제-사용-사례)
- [고급 옵션](#고급-옵션)
- [통합 활용](#통합-활용)
- [문제 해결](#문제-해결)

## 기본 사용법

### 1. 단일 파일 분석

```bash
# 기본 JSON 출력
./analyze-file src/components/Button.tsx

# 사람이 읽기 쉬운 텍스트 출력
./analyze-file src/components/Button.tsx --format text

# 소스 위치 정보 포함
./analyze-file src/components/Button.tsx --include-sources
```

### 2. 대용량 파일 처리

```bash
# 타임아웃 설정 (기본 5초)
./analyze-file large-file.ts --parse-timeout 10000

# 메모리 제한이 있는 환경
NODE_OPTIONS="--max-old-space-size=4096" ./analyze-file huge-file.ts
```

## 출력 형식

### JSON 출력 (기본값)
```json
{
  "filePath": "example.tsx",
  "success": true,
  "parseTime": 8,
  "dependencies": [
    {
      "source": "react",
      "type": "external",
      "location": { "line": 1, "column": 0, "offset": 0 },
      "isNodeBuiltin": false,
      "isScopedPackage": false,
      "packageName": "react"
    }
  ],
  "imports": [
    {
      "source": "react",
      "specifiers": [
        {
          "type": "named",
          "imported": "useState",
          "local": "useState"
        }
      ],
      "location": { "line": 1, "column": 0, "offset": 0 },
      "isTypeOnly": false
    }
  ],
  "exports": [
    {
      "name": "Component",
      "type": "named",
      "location": { "line": 5, "column": 0, "offset": 100 },
      "isTypeOnly": false
    }
  ]
}
```

### 텍스트 출력 (--format text)
```
File: example.tsx
Parse Time: 8ms
Status: Success

Dependencies:
  External:
    react (1:0)
    @mui/material (2:0)
  Relative:
    ./utils (3:0)

Imports:
  react (1:0)
    named: useState
    default: default as React

Exports:
  Named:
    Component (5:0)

Summary:
  Total Dependencies: 3
  Total Imports: 2
  Total Exports: 1
  External: 2
  Relative: 1
```

## 실제 사용 사례

### 1. 의존성 관리

#### 외부 패키지 목록 추출
```bash
# 프로젝트의 모든 외부 의존성 찾기
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  ./analyze-file "$file" | jq '.dependencies[] | select(.type == "external") | .source'
done | sort | uniq
```

#### 특정 패키지 사용처 찾기
```bash
# React Hook 사용처 찾기
find src -name "*.tsx" | while read file; do
  result=$(./analyze-file "$file" | jq -r --arg pkg "react" '.imports[] | select(.source == $pkg) | .specifiers[] | select(.imported | startswith("use")) | .imported')
  if [ ! -z "$result" ]; then
    echo "$file: $result"
  fi
done
```

### 2. 코드 품질 분석

#### 순환 의존성 체크
```bash
# 상대 경로 import 패턴 분석
./analyze-file src/components/Header.tsx --format text | grep -A 10 "Relative:"
```

#### Import 스타일 일관성 검사
```bash
# Default vs Named import 사용 패턴
for file in src/**/*.ts; do
  echo "=== $file ==="
  ./analyze-file "$file" | jq '.imports[] | {source: .source, hasDefault: (.specifiers[] | select(.type == "default") | length > 0), hasNamed: (.specifiers[] | select(.type == "named") | length > 0)}'
done
```

### 3. 빌드 도구 통합

#### Webpack Bundle Analyzer 연동
```javascript
// webpack.config.js
const { execSync } = require('child_process');

function analyzeDependencies(filePath) {
  try {
    const output = execSync(`./analyze-file ${filePath}`, { encoding: 'utf8' });
    const result = JSON.parse(output);
    return result.dependencies.filter(dep => dep.type === 'external');
  } catch (error) {
    console.warn(`Failed to analyze ${filePath}:`, error.message);
    return [];
  }
}

module.exports = {
  // ... 기존 설정
  plugins: [
    new (class DependencyAnalysisPlugin {
      apply(compiler) {
        compiler.hooks.compilation.tap('DependencyAnalysisPlugin', (compilation) => {
          // Entry point 분석
          const entryDeps = analyzeDependencies('./src/index.ts');
          console.log('Entry dependencies:', entryDeps.map(d => d.source));
        });
      }
    })()
  ]
};
```

#### Package.json 동기화 스크립트
```bash
#!/bin/bash
# check-deps.sh - package.json과 실제 사용 의존성 비교

echo "실제 사용 중인 외부 패키지:"
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  ./analyze-file "$file" 2>/dev/null | jq -r '.dependencies[]? | select(.type == "external") | .source'
done | sort | uniq > used-deps.txt

echo "package.json 의존성:"
jq -r '.dependencies | keys[]' package.json | sort > declared-deps.txt

echo -e "\n사용하지 않는 패키지:"
comm -23 declared-deps.txt used-deps.txt

echo -e "\n선언되지 않은 패키지:"
comm -13 declared-deps.txt used-deps.txt

rm used-deps.txt declared-deps.txt
```

### 4. 문서 자동 생성

#### API 문서 생성
```bash
#!/bin/bash
# generate-api-docs.sh

echo "# API 문서" > api-docs.md
echo "" >> api-docs.md

for file in src/api/*.ts; do
  echo "## $(basename "$file" .ts)" >> api-docs.md
  echo "" >> api-docs.md
  
  # Export된 함수들 추출
  ./analyze-file "$file" | jq -r '.exports[] | select(.type == "named") | "- `" + .name + "`"' >> api-docs.md
  
  # Import된 타입들 추출  
  echo "" >> api-docs.md
  echo "**사용된 타입:**" >> api-docs.md
  ./analyze-file "$file" | jq -r '.imports[] | select(.isTypeOnly == true) | .specifiers[] | "- " + .imported' >> api-docs.md
  
  echo "" >> api-docs.md
done
```

## 고급 옵션

### 1. 성능 최적화

```bash
# 빠른 분석 (최소한의 정보만)
./analyze-file src/index.ts --parse-timeout 1000

# 상세 분석 (모든 위치 정보 포함)
./analyze-file src/index.ts --include-sources --parse-timeout 10000
```

### 2. 배치 처리

```bash
# 여러 파일 병렬 분석
find src -name "*.ts" -o -name "*.tsx" | xargs -P 4 -I {} bash -c './analyze-file "{}" > "analysis-results/$(basename {} .ts).json"'
```

### 3. 필터링과 변환

```bash
# React 컴포넌트만 분석
find src -name "*.tsx" | while read file; do
  result=$(./analyze-file "$file" | jq 'select(.imports[] | .source == "react")')
  if [ ! -z "$result" ]; then
    echo "$file is a React component"
  fi
done

# TypeScript 인터페이스 추출
./analyze-file src/types/user.ts | jq '.exports[] | select(.isTypeOnly == true)'
```

## 통합 활용

### CI/CD 파이프라인

```yaml
# .github/workflows/dependency-check.yml
name: Dependency Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build analyzer
        run: npm run build
      
      - name: Check for unused dependencies
        run: |
          # 실제 사용 중인 패키지 추출
          find src -name "*.ts" -o -name "*.tsx" | while read file; do
            ./analyze-file "$file" 2>/dev/null | jq -r '.dependencies[]? | select(.type == "external") | .source'
          done | sort | uniq > used.txt
          
          # package.json과 비교
          npm ls --depth=0 --parseable | grep node_modules | sed 's/.*node_modules\///' > installed.txt
          
          # 차이점 보고
          if ! cmp -s used.txt installed.txt; then
            echo "Dependency mismatch detected!"
            exit 1
          fi
```

### IDE 통합 (VSCode Extension 예시)

```javascript
// extension.js
const vscode = require('vscode');
const { exec } = require('child_process');

function activate(context) {
  const disposable = vscode.commands.registerCommand('typescript-analyzer.analyze', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;

    const filePath = activeEditor.document.fileName;
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      vscode.window.showErrorMessage('TypeScript 파일만 분석 가능합니다.');
      return;
    }

    exec(`./analyze-file "${filePath}" --format text`, (error, stdout) => {
      if (error) {
        vscode.window.showErrorMessage(`분석 실패: ${error.message}`);
        return;
      }

      // 결과를 새 문서로 표시
      vscode.workspace.openTextDocument({
        content: stdout,
        language: 'plaintext'
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    });
  });

  context.subscriptions.push(disposable);
}
```

## 문제 해결

### 일반적인 오류

#### 1. Native Build 오류
```bash
# 해결법
npm rebuild tree-sitter

# 또는 완전 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 2. Parse 타임아웃
```bash
# 타임아웃 증가
./analyze-file large-file.ts --parse-timeout 30000

# 메모리 증가
NODE_OPTIONS="--max-old-space-size=8192" ./analyze-file large-file.ts
```

#### 3. 권한 문제
```bash
# 실행 권한 부여
chmod +x analyze-file

# 파일 읽기 권한 확인
chmod 644 target-file.ts
```

### 성능 최적화 팁

1. **작은 파일 우선**: 큰 파일은 타임아웃을 늘려 분석
2. **병렬 처리**: xargs -P를 사용해 여러 파일 동시 분석
3. **결과 캐싱**: 동일 파일은 결과를 캐시해서 재사용
4. **필터링**: 필요한 정보만 jq로 추출해서 처리 속도 향상

### 디버깅

```bash
# 상세 디버그 정보
NODE_ENV=debug ./analyze-file problem-file.ts

# 파싱 과정 추적
./analyze-file problem-file.ts --include-sources --format text
```

---

더 자세한 정보는 [README.md](README.md)와 [quickstart.md](quickstart.md)를 참고하세요.