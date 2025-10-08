# 심볼 저장 로직 구현 요구사항

## 🎯 목표
`analyze` 명령어가 실제로 심볼을 데이터베이스에 저장하여 `dependencies`, `rdf --query`, `inference` 명령어가 정상 작동하도록 구현

## 📋 기능 요구사항

### 1. 심볼 추출 및 저장
- **입력**: TypeScript/JavaScript 파일 경로
- **처리**: Tree-sitter로 파싱하여 심볼 추출
- **출력**: 데이터베이스에 심볼 정보 저장

#### 추출할 심볼 타입
- **클래스**: `class ClassName`
- **함수**: `function functionName()`, `const functionName = () => {}`
- **메서드**: `class.methodName()`
- **변수**: `const variableName`, `let variableName`
- **인터페이스**: `interface InterfaceName`
- **타입**: `type TypeName`
- **열거형**: `enum EnumName`
- **네임스페이스**: `namespace NamespaceName`

#### 저장할 메타데이터
- **기본 정보**: 이름, 타입, 파일 경로, 라인/컬럼 번호
- **접근 제한자**: public, private, protected
- **속성**: static, async, abstract
- **네임스페이스**: 심볼이 속한 네임스페이스
- **RDF 주소**: `project:namespace:file:symbol` 형식

### 2. RDF 주소 생성
- **형식**: `{projectName}/{filePath}#{nodeType}:{symbolName}`
- **예시**: `dependency-linker/src/cli/main.ts#Class:Command`
- **고유성**: 프로젝트 내에서 고유한 식별자

### 3. 의존성 관계 저장
- **Import 관계**: `import { Symbol } from 'module'`
- **Export 관계**: `export class Symbol`
- **호출 관계**: `object.method()`
- **상속 관계**: `class Child extends Parent`
- **구현 관계**: `class Impl implements Interface`

### 4. 데이터베이스 저장 구조

#### rdf_addresses 테이블
```sql
INSERT INTO rdf_addresses (
  rdf_address, project_name, file_path, node_type, symbol_name,
  namespace, local_name, line_number, column_number, access_modifier,
  is_static, is_async, is_abstract
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### nodes 테이블
```sql
INSERT INTO nodes (
  identifier, type, name, source_file, language,
  semantic_tags, metadata, start_line, start_column, end_line, end_column
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### edges 테이블
```sql
INSERT INTO edges (
  source_node_id, target_node_id, relationship_type, metadata
) VALUES (?, ?, ?, ?)
```

## 🔧 구현 계획

### Phase 1: 심볼 추출 로직 구현
1. **TypeScript 파서 연동**: 기존 `TypeScriptParser` 활용
2. **심볼 추출기 연동**: `SymbolExtractor` 클래스 활용
3. **파싱 결과 처리**: Tree-sitter 결과에서 심볼 정보 추출

### Phase 2: RDF 주소 생성 로직 구현
1. **프로젝트명 추출**: 파일 경로에서 프로젝트명 추출
2. **RDF 주소 생성**: `{project}/{file}#{type}:{name}` 형식
3. **고유성 보장**: 중복 방지 로직

### Phase 3: 데이터베이스 저장 로직 구현
1. **RDF 주소 저장**: `storeRDFAddress()` 메서드 활용
2. **노드 저장**: `upsertNode()` 메서드 활용
3. **관계 저장**: `createEdge()` 메서드 활용

### Phase 4: 통합 및 테스트
1. **analyze 명령어 수정**: 실제 심볼 저장 로직 추가
2. **테스트**: `dependencies`, `rdf --query` 명령어 정상 작동 확인
3. **성능 최적화**: 대용량 파일 처리 최적화

## 📊 성공 기준

### 기능적 요구사항
- [ ] `analyze` 명령어 실행 후 심볼이 데이터베이스에 저장됨
- [ ] `dependencies --symbol "Command"` 명령어가 심볼을 찾음
- [ ] `rdf --query "Command"` 명령어가 프로젝트 심볼을 검색함
- [ ] `rdf --stats` 명령어가 0개가 아닌 RDF 주소 수를 표시함
- [ ] `inference` 명령어가 의존성 관계를 찾음

### 성능 요구사항
- [ ] 100개 파일 분석 시간 < 30초
- [ ] 메모리 사용량 < 500MB
- [ ] 데이터베이스 저장 시간 < 5초

### 품질 요구사항
- [ ] 에러 처리: 파싱 실패 시 적절한 에러 메시지
- [ ] 로깅: 분석 진행 상황 표시
- [ ] 중복 방지: 동일한 심볼 중복 저장 방지
- [ ] 트랜잭션: 데이터베이스 저장 실패 시 롤백

## 🚀 구현 우선순위

### High Priority
1. **기본 심볼 추출**: 클래스, 함수, 변수 추출
2. **RDF 주소 생성**: 기본 RDF 주소 생성 로직
3. **데이터베이스 저장**: rdf_addresses 테이블 저장

### Medium Priority
1. **의존성 관계**: import/export 관계 저장
2. **메타데이터**: 라인/컬럼, 접근 제한자 등
3. **성능 최적화**: 배치 처리, 캐싱

### Low Priority
1. **고급 관계**: 상속, 구현 관계
2. **통계 정보**: 복잡도, 중심성 등
3. **UI 개선**: 진행률 표시, 상세 로깅
