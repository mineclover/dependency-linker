# Unknown Symbol System 아키텍처

## 📋 **개요**

Unknown Symbol System은 Dependency Linker의 핵심 기능으로, 내부 메서드와 export된 심볼 간의 동등성을 추론하여 의존성 관계를 완성하는 시스템입니다.

## 🏗️ **아키텍처 원칙**

### **1. 모듈성 (Modularity)**
- 각 컴포넌트는 독립적인 책임을 가짐
- 명확한 인터페이스를 통한 상호작용
- 의존성 주입을 통한 느슨한 결합

### **2. 단일 책임 원칙 (Single Responsibility Principle)**
- `UnknownSymbolManager`: Unknown Symbol 관리
- `EquivalenceInferenceEngine`: 동등성 추론
- `UnknownSymbolHandler`: CLI 인터페이스

### **3. 의존성 역전 원칙 (Dependency Inversion Principle)**
- Factory 패턴을 통한 의존성 관리
- 인터페이스 기반 설계
- 구체적인 구현에 의존하지 않음

## 🔧 **핵심 컴포넌트**

### **1. Unknown Symbol Manager**
```typescript
// 위치: src/database/services/UnknownSymbolManager.ts
export class UnknownSymbolManager {
    // Unknown Symbol 등록 및 관리
    async registerUnknownSymbol(symbol: Omit<UnknownSymbol, 'id'>): Promise<UnknownSymbol>
    
    // 동등성 후보 검색
    async findEquivalenceCandidates(unknownSymbol: UnknownSymbol): Promise<EquivalenceCandidate[]>
    
    // 동등성 관계 생성
    async createEquivalenceRelation(unknown: UnknownSymbol, known: UnknownSymbol, confidence: number, matchType: string): Promise<EquivalenceRelation>
}
```

### **2. Equivalence Inference Engine**
```typescript
// 위치: src/database/inference/EquivalenceInferenceEngine.ts
export class EquivalenceInferenceEngine {
    // 동등성 추론 실행
    async inferEquivalence(unknown: UnknownSymbol, known: UnknownSymbol): Promise<EquivalenceInferenceResult | null>
    
    // 배치 동등성 추론
    async batchInferEquivalence(unknowns: UnknownSymbol[], knowns: UnknownSymbol[]): Promise<EquivalenceInferenceResult[]>
}
```

### **3. CLI Handler**
```typescript
// 위치: src/cli/handlers/unknown-handler.ts
export class UnknownSymbolHandler {
    // Unknown Symbol 등록
    async registerUnknownSymbol(options: RegisterOptions): Promise<void>
    
    // 동등성 후보 검색
    async searchEquivalenceCandidates(options: SearchOptions): Promise<void>
    
    // 추론 규칙 적용
    async applyInferenceRules(options: InferenceOptions): Promise<void>
}
```

## 📊 **데이터 흐름**

### **1. Unknown Symbol 등록 플로우**
```
User Input → CLI Handler → Unknown Symbol Manager → Database
     ↓              ↓              ↓                    ↓
  CLI Command   Validation    Symbol Creation    Storage
```

### **2. 동등성 추론 플로우**
```
Unknown Symbol → Candidate Search → Inference Engine → Equivalence Relation
      ↓               ↓                    ↓                    ↓
   Registration   Name/Type/Context    Rule Application    Database Update
```

### **3. CLI 명령어 플로우**
```
CLI Command → Handler Factory → Service Factory → Core Logic
     ↓              ↓               ↓                ↓
  Validation    Handler Get    Service Get      Business Logic
```

## 🔄 **추론 규칙 시스템**

### **1. 규칙 우선순위**
1. **정확한 이름 매칭** (우선순위: 10)
2. **타입 기반 매칭** (우선순위: 8)
3. **컨텍스트 기반 매칭** (우선순위: 6)
4. **시맨틱 매칭** (우선순위: 4)
5. **부분 매칭** (우선순위: 2)

### **2. 신뢰도 계산**
```typescript
const calculateConfidence = (unknown: UnknownSymbol, known: UnknownSymbol) => {
    let confidence = 0;
    
    // 이름 매칭 (40%)
    if (unknown.name === known.name) confidence += 0.4;
    
    // 타입 매칭 (30%)
    if (unknown.type === known.type) confidence += 0.3;
    
    // 컨텍스트 매칭 (30%)
    if (unknown.sourceFile === known.sourceFile) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
};
```

## 🏭 **Factory 패턴 구현**

### **1. Service Factory**
```typescript
// 위치: src/database/services/index.ts
export class ServiceFactory {
    static getUnknownSymbolManager(): UnknownSymbolManager
    static getFileDependencyAnalyzer(): FileDependencyAnalyzer
    static async initializeAll(): Promise<void>
    static async closeAll(): Promise<void>
}
```

### **2. Handler Factory**
```typescript
// 위치: src/cli/handlers/index.ts
export class HandlerFactory {
    static getRDFHandler(): RDFHandler
    static getUnknownHandler(): UnknownSymbolHandler
    static async initializeAll(): Promise<void>
    static async closeAll(): Promise<void>
}
```

## 📁 **디렉토리 구조**

```
src/
├── database/
│   ├── services/
│   │   ├── index.ts                    # Service Factory
│   │   ├── UnknownSymbolManager.ts    # Unknown Symbol 관리
│   │   └── FileDependencyAnalyzer.ts   # 파일 의존성 분석
│   └── inference/
│       ├── index.ts                   # Inference 모듈 인덱스
│       └── EquivalenceInferenceEngine.ts # 동등성 추론 엔진
├── cli/
│   └── handlers/
│       ├── index.ts                   # Handler Factory
│       └── unknown-handler.ts         # Unknown Symbol CLI 핸들러
└── tests/
    └── integration/
        └── unknown-symbol-integration.test.ts # 통합 테스트
```

## 🧪 **테스트 전략**

### **1. 단위 테스트**
- 각 컴포넌트의 독립적인 기능 검증
- Mock 객체를 통한 의존성 격리
- 경계값 및 예외 상황 테스트

### **2. 통합 테스트**
- Factory 패턴을 통한 전체 시스템 테스트
- End-to-End 워크플로우 검증
- 성능 및 확장성 테스트

### **3. 테스트 커버리지**
- 핵심 비즈니스 로직: 100%
- CLI 인터페이스: 90%+
- 에러 핸들링: 85%+

## 🚀 **확장성 고려사항**

### **1. 새로운 추론 규칙 추가**
```typescript
// 새로운 규칙 추가 예시
const customRule: EquivalenceRule = {
    name: 'custom_semantic_match',
    description: '커스텀 시맨틱 매칭',
    priority: 5,
    matches: async (unknown, known) => {
        // 커스텀 매칭 로직
        return customSemanticAnalysis(unknown, known) > 0.6;
    },
    calculateConfidence: async (unknown, known) => {
        return customSemanticAnalysis(unknown, known);
    }
};
```

### **2. 새로운 CLI 명령어 추가**
```typescript
// 새로운 CLI 옵션 추가
program
    .option('--custom-rule <rule>', '커스텀 추론 규칙 적용')
    .action(async (options) => {
        if (options.customRule) {
            await handler.applyCustomRule(options.customRule);
        }
    });
```

## 📈 **성능 최적화**

### **1. 캐싱 전략**
- 동등성 후보 캐싱
- 추론 결과 캐싱
- LRU 캐시를 통한 메모리 관리

### **2. 배치 처리**
- 대량 심볼의 배치 추론
- 병렬 처리 지원
- 진행률 표시

### **3. 인덱싱**
- RDF 주소 기반 인덱싱
- 이름/타입 기반 복합 인덱스
- 공간-시간 트레이드오프 최적화

## 🔒 **보안 고려사항**

### **1. 입력 검증**
- CLI 입력값 검증
- RDF 주소 형식 검증
- 파일 경로 보안 검증

### **2. 에러 처리**
- 민감한 정보 노출 방지
- 안전한 에러 메시지
- 로깅 및 모니터링

## 📚 **사용 예시**

### **1. 기본 사용법**
```bash
# Unknown Symbol 등록
npm run cli -- unknown --register --file src/types.ts --symbol User --type Class

# 동등성 후보 검색
npm run cli -- unknown --candidates --symbol User

# 추론 규칙 적용
npm run cli -- unknown --infer --symbol User

# 통계 조회
npm run cli -- unknown --stats
```

### **2. 프로그래밍 인터페이스**
```typescript
import { ServiceFactory } from './database/services';

// 서비스 초기화
await ServiceFactory.initializeAll();

// Unknown Symbol Manager 사용
const manager = ServiceFactory.getUnknownSymbolManager();
const symbol = await manager.registerUnknownSymbol({
    name: 'User',
    type: 'Class',
    sourceFile: 'src/types.ts',
    // ... 기타 옵션
});

// 동등성 후보 검색
const candidates = await manager.findEquivalenceCandidates(symbol);
```

이 아키텍처는 모듈성, 확장성, 유지보수성을 고려하여 설계되었으며, Factory 패턴을 통한 의존성 관리로 테스트 용이성과 코드 재사용성을 극대화했습니다.
