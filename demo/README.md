# 🎯 TypeScript File Analyzer - Interactive Demo

이 디렉토리에는 TypeScript File Analyzer의 모든 기능을 시연할 수 있는 완전한 데모 환경이 준비되어 있습니다.

## 🚀 빠른 시작

### 1️⃣ 자동 데모 실행
```bash
# 모든 예제를 자동으로 분석하고 결과를 생성
./demo/run-demo.sh
```

### 2️⃣ 개별 파일 테스트
```bash
# 간단한 React 컴포넌트
./analyze-file demo/examples/simple-component.tsx --format text

# 복잡한 React 앱 (11개 의존성)
./analyze-file demo/examples/complex-app.tsx --format json

# Node.js Express 서버 (20개 의존성)
./analyze-file demo/examples/node-backend.ts --format text

# 구문 오류 파일 (에러 복구 테스트)
./analyze-file demo/examples/broken-syntax.tsx --format text
```

## 📁 Demo 구조

```
demo/
├── README.md              # 이 파일
├── run-demo.sh            # 자동 데모 스크립트
├── examples/              # 테스트용 예제 파일들
│   ├── simple-component.tsx    # 기본 React 컴포넌트
│   ├── complex-app.tsx         # 복잡한 React 앱 (11개 의존성)
│   ├── node-backend.ts         # Express 서버 (20개 의존성)
│   └── broken-syntax.tsx       # 구문 오류 파일 (에러 복구 테스트)
└── results/               # 분석 결과 JSON 파일들 (자동 생성)
    ├── simple-component.json
    ├── complex-app.json
    ├── node-backend.json
    └── broken-syntax.json
```

## 🧪 예제 파일 상세 정보

### 📦 Simple Component (simple-component.tsx)
- **목적**: 기본적인 React 컴포넌트
- **의존성**: React만 사용
- **특징**: 인터페이스, props, 기본 export
- **분석 시간**: ~4-6ms

### 🏗️ Complex App (complex-app.tsx)
- **목적**: 실제 프로덕션 앱과 유사한 복잡한 컴포넌트
- **의존성**: 11개 (React, MUI, axios, lodash, date-fns 등)
- **특징**: 
  - 다양한 import 타입 (default, named, side-effect)
  - 상대경로 import (./styles.css, ../services/)
  - 복수 export (interface, 함수, 기본값)
  - TypeScript 고급 타입
- **분석 시간**: ~10-11ms

### 🖥️ Node Backend (node-backend.ts)
- **목적**: Express.js 기반 백엔드 서버
- **의존성**: 20개 (express, cors, helmet, pg, redis 등)
- **특징**:
  - 대량의 npm 패키지 import
  - 미들웨어, 라우터, 인증 시스템
  - 클래스, 인터페이스, 타입 정의
  - 복잡한 비즈니스 로직
- **분석 시간**: ~12ms

### 💥 Broken Syntax (broken-syntax.tsx)
- **목적**: 에러 복구 능력 테스트
- **특징**:
  - 의도적인 구문 오류들
  - 불완전한 함수 정의
  - 누락된 괄호, 세미콜론
  - JSX 태그 불일치
- **결과**: 구문 오류에도 불구하고 import/export 정상 추출

## 📊 분석 결과 예시

### JSON 출력 (API 연동용)
```json
{
  "filePath": "demo/examples/complex-app.tsx",
  "success": true,
  "dependencies": [
    {
      "source": "react",
      "type": "external",
      "location": {"line": 1, "column": 0, "offset": 0},
      "isNodeBuiltin": false,
      "isScopedPackage": false,
      "packageName": "react"
    }
  ],
  "imports": [...],
  "exports": [...],
  "parseTime": 11
}
```

### Text 출력 (사람용)
```
File: demo/examples/complex-app.tsx
Dependencies:
  External: react, @mui/material, axios, lodash, date-fns, react-toastify
  Relative: ./styles.css, ../services/ApiClient, ./utils/validators
Imports: 11개
Exports: 5개 (interface, 함수, 기본값)
Parse Time: 11ms ⚡
```

## 🎯 실전 활용 예제

### 1. 프로젝트의 모든 외부 패키지 찾기
```bash
./analyze-file demo/examples/complex-app.tsx --format json | \
jq -r '.dependencies[] | select(.type == "external") | .packageName' | \
sort | uniq
```

### 2. 상대경로 의존성 추출
```bash
./analyze-file demo/examples/complex-app.tsx --format json | \
jq -r '.dependencies[] | select(.type == "relative") | .source'
```

### 3. 성능 벤치마크
```bash
# 각 파일별 분석 속도 측정
time ./analyze-file demo/examples/simple-component.tsx > /dev/null
time ./analyze-file demo/examples/complex-app.tsx > /dev/null
time ./analyze-file demo/examples/node-backend.ts > /dev/null
```

### 4. 통계 정보 추출
```bash
# 의존성 개수
./analyze-file demo/examples/node-backend.ts --format json | \
jq '.dependencies | length'

# 외부 패키지 개수
./analyze-file demo/examples/node-backend.ts --format json | \
jq '[.dependencies[] | select(.type == "external")] | length'
```

## 🔧 고급 사용법

### 소스 위치 정보 포함
```bash
./analyze-file demo/examples/complex-app.tsx --include-sources --format json
```

### 파싱 타임아웃 설정
```bash
./analyze-file demo/examples/node-backend.ts --parse-timeout 10000
```

### 결과를 파일로 저장
```bash
./analyze-file demo/examples/complex-app.tsx --format json > my-analysis.json
```

## 🏆 성능 지표

실제 데모 실행 결과:

| 파일 | 의존성 수 | 분석 시간 | 파일 크기 |
|------|-----------|-----------|-----------|
| simple-component.tsx | 1개 | 4-6ms | 271B |
| complex-app.tsx | 11개 | 10-11ms | 6.9KB |
| node-backend.ts | 20개 | 12ms | 11KB |
| broken-syntax.tsx | 3개 | 7ms | 1.3KB |

- **전체 실행 시간**: ~40-50ms (CLI 오버헤드 포함)
- **메모리 사용량**: 최소한 (< 50MB)
- **에러 복구**: 구문 오류에도 불구하고 의존성 추출 성공

## 🎉 실행 가능한 데모 명령어

```bash
# 1. 전체 자동 데모
./demo/run-demo.sh

# 2. 개별 파일 테스트
./analyze-file demo/examples/simple-component.tsx --format text
./analyze-file demo/examples/complex-app.tsx --format json
./analyze-file demo/examples/node-backend.ts --format text
./analyze-file demo/examples/broken-syntax.tsx --format text

# 3. 의존성 분석
./analyze-file demo/examples/complex-app.tsx --format json | jq '.dependencies'

# 4. 성능 측정
time ./analyze-file demo/examples/node-backend.ts > /dev/null

# 5. 결과 저장
./analyze-file demo/examples/complex-app.tsx --format json > my-result.json
```

**🚀 이제 직접 테스트해보세요!**

모든 예제가 준비되어 있어 바로 실행하고 결과를 확인할 수 있습니다. 각 명령어는 실제로 작동하며, 다양한 시나리오에서 분석기의 성능과 정확성을 체험할 수 있습니다.