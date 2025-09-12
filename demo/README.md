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

### 3️⃣ 새로운 커스텀 출력 형식 테스트 (7가지 형식 지원)
```bash
# 🎨 커스텀 출력 형식 전체 데모
./demo/format-demo.sh

# 빠른 요약 (CI/CD 파이프라인용)
./analyze-file demo/examples/complex-app.tsx --format summary
# 출력: ✅ demo/examples/complex-app.tsx: 11 deps, 11 imports, 5 exports (10ms)

# 외부 패키지만 추출 (package.json 업데이트용)
./analyze-file demo/examples/complex-app.tsx --format deps-only
# 출력: react, @mui/material, axios, lodash, date-fns, react-toastify

# CSV 형식 (스프레드시트 분석용)
./analyze-file demo/examples/node-backend.ts --format csv
# 출력: filepath,status,dependencies,imports,exports,parsetime,error

# 테이블 형식 (터미널에서 시각적 확인)
./analyze-file demo/examples/complex-app.tsx --format table
# 출력: 예쁜 ASCII 테이블 형태

# 압축된 JSON (API 응답용)
./analyze-file demo/examples/simple-component.tsx --format compact
# 출력: 한 줄 압축된 JSON
```

## 📁 Demo 구조

```
demo/
├── README.md              # 이 파일  
├── run-demo.sh            # 자동 데모 스크립트
├── format-demo.sh         # 커스텀 출력 형식 데모 스크립트
├── examples/              # 테스트용 예제 파일들
│   ├── simple-component.tsx    # 기본 React 컴포넌트
│   ├── complex-app.tsx         # 복잡한 React 앱 (11개 의존성)
│   ├── node-backend.ts         # Express 서버 (20개 의존성)
│   └── broken-syntax.tsx       # 구문 오류 파일 (에러 복구 테스트)
├── results/               # 분석 결과 JSON 파일들 (자동 생성)
│   ├── simple-component.json
│   ├── complex-app.json  
│   ├── node-backend.json
│   └── broken-syntax.json
└── format-results/        # 커스텀 형식 결과 파일들 (자동 생성)
    ├── summary.txt        # 요약 형식
    ├── deps-only.txt      # 의존성 전용 형식
    ├── output.csv         # CSV 형식
    ├── table.txt          # 테이블 형식
    ├── compact.json       # 압축 JSON
    ├── pretty.json        # 예쁜 JSON
    └── detailed.txt       # 상세 텍스트
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

### 🎨 새로운 커스텀 출력 형식들

#### Summary Format (요약 형식) - CI/CD에 최적
```
✅ demo/examples/complex-app.tsx: 11 deps, 11 imports, 5 exports (9ms)
```

#### Dependencies Only Format (의존성만) - Package 관리용
```
@mui/material
axios  
date-fns
lodash
react
react-toastify
```

#### CSV Format (CSV 형식) - 스프레드시트 분석용
```
filepath,status,dependencies,imports,exports,parsetime,error
"demo/examples/complex-app.tsx","success",11,11,5,9,""
```

#### Table Format (테이블 형식) - 터미널에서 시각적 확인
```
📁 File: demo/examples/complex-app.tsx
⏱️  Parse time: 9ms

📦 DEPENDENCIES
┌────────────────────────────────────────────────────┬──────────┬──────────┐
│ Package/Module                                     │ Type     │ Location │
├────────────────────────────────────────────────────┼──────────┼──────────┤
│ react                                              │ external │ 1:0      │
│ @mui/material                                      │ external │ 2:0      │
└────────────────────────────────────────────────────┴──────────┴──────────┘
```

### 🔧 기존 형식들

#### JSON 출력 (API 연동용)
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

#### Text 출력 (상세 정보용)
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

최신 실행 결과 (Biome 린터/포맷터 적용 후):

| 파일 | 의존성 수 | 분석 시간 | 파일 크기 | CLI 실행 시간 |
|------|-----------|-----------|-----------|---------------|
| simple-component.tsx | 1개 | 7ms | 258B | 46ms |
| complex-app.tsx | 11개 | 9-10ms | 6.3KB | 49ms |
| node-backend.ts | 20개 | 14ms | 10.3KB | 74ms |
| broken-syntax.tsx | 3개 | 5ms | 1.3KB | - |

### 🚀 성능 개선사항
- **코드 품질**: Biome 린터/포맷터로 업그레이드 (ESLint 대체)
- **분석 정확도**: 향상된 에러 복구 및 부분 파싱
- **메모리 효율성**: 최적화된 tree-sitter 파싱 (<50MB)
- **타입 안정성**: TypeScript 컴파일 100% 클린
- **출력 형식**: 7가지 커스텀 출력 형식 지원

## 🎉 실행 가능한 데모 명령어

```bash
# 1. 전체 자동 데모
./demo/run-demo.sh

# 2. 커스텀 출력 형식 데모
./demo/format-demo.sh

# 3. 개별 파일 테스트
./analyze-file demo/examples/simple-component.tsx --format text
./analyze-file demo/examples/complex-app.tsx --format json
./analyze-file demo/examples/node-backend.ts --format text
./analyze-file demo/examples/broken-syntax.tsx --format text

# 4. 새로운 출력 형식들
./analyze-file demo/examples/complex-app.tsx --format summary     # 요약
./analyze-file demo/examples/complex-app.tsx --format deps-only  # 패키지만  
./analyze-file demo/examples/complex-app.tsx --format csv        # CSV
./analyze-file demo/examples/complex-app.tsx --format table     # 테이블
./analyze-file demo/examples/complex-app.tsx --format compact   # 압축 JSON

# 5. 의존성 분석
./analyze-file demo/examples/complex-app.tsx --format json | jq '.dependencies'

# 6. 성능 측정
time ./analyze-file demo/examples/node-backend.ts > /dev/null

# 7. 결과 저장
./analyze-file demo/examples/complex-app.tsx --format json > my-result.json
```

**🚀 이제 직접 테스트해보세요!**

모든 예제가 준비되어 있어 바로 실행하고 결과를 확인할 수 있습니다. 각 명령어는 실제로 작동하며, 다양한 시나리오에서 분석기의 성능과 정확성을 체험할 수 있습니다.

## ✅ 최신 업데이트 (2024-09-13)

### 🔧 기술적 개선사항
- **Biome 마이그레이션**: ESLint에서 Biome으로 완전 전환
- **타입 안정성**: TypeScript 컴파일 오류 0개 달성
- **코드 포맷팅**: 전체 코드베이스 일관성 있는 포맷팅 적용
- **성능 최적화**: 파싱 속도 및 메모리 사용량 최적화

### 📊 출력 형식 확장
7가지 출력 형식으로 다양한 사용 사례 지원:
1. `json` - 완전한 JSON 출력 (기본값)
2. `text` - 사람이 읽기 쉬운 상세 형식 
3. `compact` - 압축된 JSON (API 응답용)
4. `summary` - 한 줄 요약 (CI/CD용)
5. `csv` - CSV 형식 (스프레드시트 분석)
6. `deps-only` - 외부 패키지만 (의존성 관리)
7. `table` - ASCII 테이블 (터미널 표시)

### 🧪 검증 완료
- **성능 테스트**: 포괄적 성능 테스트 픽스처 추가
- **린트 검사**: Biome 린터 통과 (일부 스타일 경고 제외)
- **데모 테스트**: 모든 데모 스크립트 정상 작동 확인
- **문서화**: README, API.md, quickstart.md 최신 상태 반영