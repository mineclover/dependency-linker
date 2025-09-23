# 의존성 분석 도구 (Dependency Analysis Tools)

이 디렉토리는 단일 파일 기반 의존성 분석을 위한 독립적인 도구들을 포함합니다.

## 도구 목록

### 1. `dependency-analyzer.ts`
- **기능**: 특정 파일을 시작점으로 모든 의존성 파일들을 재귀적으로 추적
- **출력**: 의존성 트리, 순환 의존성 검사, JSON 결과 저장
- **사용법**: `npx tsx dependency-analyzer.ts`

### 2. `dependency-visualizer.ts`
- **기능**: 분석 결과를 다양한 형태로 시각화
- **출력**: Mermaid 그래프, ASCII 트리, 디렉토리 요약, 핵심 분석
- **사용법**: `npx tsx run-visualization.ts`

### 3. `run-visualization.ts`
- **기능**: 시각화 도구 실행 스크립트
- **의존성**: dependency-analyzer.ts의 결과 JSON 필요

### 4. `analyze-core-files.ts`
- **기능**: 여러 핵심 파일들을 일괄 분석
- **용도**: 프로젝트 전체 구조 파악

## 주요 특징

- ✅ **격리된 환경**: 메인 프로젝트와 분리된 독립 도구
- ✅ **단일 파일 기반**: 특정 파일 하나를 시작점으로 분석
- ✅ **순환 의존성 검사**: DFS 알고리즘으로 순환 의존성 탐지
- ✅ **다양한 import 지원**: ES6, CommonJS, 동적 import, type-only import
- ✅ **시각화 지원**: Mermaid, ASCII 트리, 요약 리포트

## 분석 결과 예시

```
📊 의존성 분석 결과: src/services/AnalysisEngine.ts
📁 총 파일 수: 33개
📈 최대 깊이: 4
🔄 순환 의존성: 0개
```

이 도구들은 프로젝트의 의존성 구조를 이해하고 리팩토링 계획을 세우는 데 유용합니다.