#!/bin/bash

# CLI 테스트 실행 스크립트
# 모든 CLI 기능이 정상적으로 작동하는지 테스트

set -e

echo "🚀 CLI 테스트 시작"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 테스트용 데이터베이스 경로
TEST_DB_PATH="test-dependency-linker.db"
TEST_PROJECT_ROOT="tests/fixtures/test-project"

# 테스트 전 정리
print_step "테스트 환경 정리"
if [ -f "$TEST_DB_PATH" ]; then
    rm -f "$TEST_DB_PATH"
    print_success "기존 테스트 데이터베이스 삭제 완료"
fi

# 프로젝트 빌드 확인
print_step "프로젝트 빌드 확인"
if [ ! -d "dist" ]; then
    print_warning "dist 디렉토리가 없습니다. 빌드를 실행합니다."
    npm run build
fi

# Jest 테스트 실행
print_step "Jest 테스트 실행"
npm test -- tests/cli/cli-integration.test.ts --verbose

# 개별 CLI 명령어 테스트
print_step "개별 CLI 명령어 테스트"

# 1. analyze 명령어 테스트
print_step "analyze 명령어 테스트"
npm run cli -- analyze --pattern "tests/fixtures/test-project/**/*.ts" --database "$TEST_DB_PATH" --format json
print_success "analyze 명령어 테스트 완료"

# 2. rdf 명령어 테스트
print_step "rdf 명령어 테스트"
npm run cli -- rdf --create --project "test-project" --file "tests/fixtures/test-project/UserService.ts" --type "class" --symbol "UserService" --database "$TEST_DB_PATH"
npm run cli -- rdf --query "UserService" --database "$TEST_DB_PATH"
npm run cli -- rdf --validate --database "$TEST_DB_PATH"
npm run cli -- rdf --stats --database "$TEST_DB_PATH"
print_success "rdf 명령어 테스트 완료"

# 3. rdf-file 명령어 테스트
print_step "rdf-file 명령어 테스트"
npm run cli -- rdf-file --location "test-project/tests/fixtures/test-project/UserService.ts#class:UserService" --database "$TEST_DB_PATH"
npm run cli -- rdf-file --path "test-project/tests/fixtures/test-project/UserService.ts#class:UserService" --database "$TEST_DB_PATH"
npm run cli -- rdf-file --exists "test-project/tests/fixtures/test-project/UserService.ts#class:UserService" --database "$TEST_DB_PATH"
npm run cli -- rdf-file --validate "test-project/tests/fixtures/test-project/UserService.ts#class:UserService" --database "$TEST_DB_PATH"
print_success "rdf-file 명령어 테스트 완료"

# 4. unknown 명령어 테스트
print_step "unknown 명령어 테스트"
npm run cli -- unknown --register "processUser" "tests/fixtures/test-project/UserService.ts" --database "$TEST_DB_PATH"
npm run cli -- unknown --search "processUser" --database "$TEST_DB_PATH"
npm run cli -- unknown --infer --database "$TEST_DB_PATH"
print_success "unknown 명령어 테스트 완료"

# 5. query 명령어 테스트
print_step "query 명령어 테스트"
npm run cli -- query --sql "SELECT * FROM nodes LIMIT 1" --database "$TEST_DB_PATH"
npm run cli -- query --graphql "{ nodes { id name type } }" --database "$TEST_DB_PATH"
npm run cli -- query --natural "find all classes" --database "$TEST_DB_PATH"
print_success "query 명령어 테스트 완료"

# 6. cross-namespace 명령어 테스트
print_step "cross-namespace 명령어 테스트"
npm run cli -- cross-namespace --analyze "auth" "user" --database "$TEST_DB_PATH"
npm run cli -- cross-namespace --circular --database "$TEST_DB_PATH"
npm run cli -- cross-namespace --stats --database "$TEST_DB_PATH"
print_success "cross-namespace 명령어 테스트 완료"

# 7. inference 명령어 테스트
print_step "inference 명령어 테스트"
npm run cli -- inference --hierarchical 1 --edge-type imports --database "$TEST_DB_PATH"
npm run cli -- inference --transitive 1 --edge-type depends_on --database "$TEST_DB_PATH"
npm run cli -- inference --execute 1 --database "$TEST_DB_PATH"
print_success "inference 명령어 테스트 완료"

# 8. context-documents 명령어 테스트
print_step "context-documents 명령어 테스트"
npm run cli -- context-documents --file "tests/fixtures/test-project/UserService.ts" --database "$TEST_DB_PATH"
npm run cli -- context-documents --symbol "tests/fixtures/test-project/UserService.ts" --symbol-path "UserService" --database "$TEST_DB_PATH"
npm run cli -- context-documents --project --database "$TEST_DB_PATH"
print_success "context-documents 명령어 테스트 완료"

# 9. performance 명령어 테스트
print_step "performance 명령어 테스트"
npm run cli -- performance --analyze "test-project" --database "$TEST_DB_PATH"
npm run cli -- performance --cache stats --database "$TEST_DB_PATH"
npm run cli -- performance --batch stats --database "$TEST_DB_PATH"
npm run cli -- performance --monitor --database "$TEST_DB_PATH"
npm run cli -- performance --optimize-memory --database "$TEST_DB_PATH"
npm run cli -- performance --benchmark --database "$TEST_DB_PATH"
npm run cli -- performance --stats --database "$TEST_DB_PATH"
print_success "performance 명령어 테스트 완료"

# 10. markdown 명령어 테스트
print_step "markdown 명령어 테스트"
npm run cli -- markdown --analyze "tests/fixtures/test-project/README.md" --database "$TEST_DB_PATH"
npm run cli -- markdown --track-links "tests/fixtures/test-project/README.md" --database "$TEST_DB_PATH"
npm run cli -- markdown --extract-headings "tests/fixtures/test-project/README.md" --database "$TEST_DB_PATH"
print_success "markdown 명령어 테스트 완료"

# 11. typescript 명령어 테스트
print_step "typescript 명령어 테스트"
npm run cli -- typescript --analyze "tests/fixtures/test-project/UserService.ts" --database "$TEST_DB_PATH"
npm run cli -- typescript --project "tests/fixtures/test-project" --database "$TEST_DB_PATH"
npm run cli -- typescript --benchmark --database "$TEST_DB_PATH"
print_success "typescript 명령어 테스트 완료"

# 12. namespace 명령어 테스트
print_step "namespace 명령어 테스트"
npm run cli -- namespace --analyze --database "$TEST_DB_PATH"
npm run cli -- namespace --optimize --database "$TEST_DB_PATH"
npm run cli -- namespace --stats --database "$TEST_DB_PATH"
print_success "namespace 명령어 테스트 완료"

# 13. benchmark 명령어 테스트
print_step "benchmark 명령어 테스트"
npm run cli -- benchmark --file "tests/fixtures/test-project/UserService.ts" --iterations 3 --database "$TEST_DB_PATH"
print_success "benchmark 명령어 테스트 완료"

# 테스트 후 정리
print_step "테스트 후 정리"
if [ -f "$TEST_DB_PATH" ]; then
    rm -f "$TEST_DB_PATH"
    print_success "테스트 데이터베이스 삭제 완료"
fi

print_success "모든 CLI 테스트 완료! 🎉"
