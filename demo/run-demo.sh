#!/bin/bash

# Dependency Linker Demo Script
# 데모 환경 실행 스크립트

set -e

echo "🚀 Dependency Linker Demo 시작"
echo "================================"

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

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 프로젝트 루트로 이동
cd "$(dirname "$0")/.."

# 1. 환경 설정 확인
print_step "환경 설정 확인"
if [ ! -f "package.json" ]; then
    print_error "package.json을 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요."
    exit 1
fi

if [ ! -d "demo" ]; then
    print_error "demo 디렉토리를 찾을 수 없습니다."
    exit 1
fi

print_success "환경 설정 확인 완료"

# 2. 의존성 설치
print_step "의존성 설치"
if [ ! -d "node_modules" ]; then
    npm install
    print_success "의존성 설치 완료"
else
    print_success "의존성이 이미 설치되어 있습니다"
fi

# 3. 빌드
print_step "프로젝트 빌드"
npm run build
print_success "빌드 완료"

# 4. 데모 파일 분석
print_step "데모 파일 분석 시작"

# TypeScript 파일 분석
print_step "TypeScript 파일 분석"
npm run cli -- analyze --pattern "demo/examples/typescript/UserService.ts"
npm run cli -- analyze --pattern "demo/examples/typescript/Button.tsx"
print_success "TypeScript 파일 분석 완료"

# JavaScript 파일 분석
print_step "JavaScript 파일 분석"
npm run cli -- analyze --pattern "demo/examples/javascript/calculator.js"
print_success "JavaScript 파일 분석 완료"

# Java 파일 분석
print_step "Java 파일 분석"
npm run cli -- analyze --pattern "demo/examples/java/UserController.java"
print_success "Java 파일 분석 완료"

# Python 파일 분석
print_step "Python 파일 분석"
npm run cli -- analyze --pattern "demo/examples/python/data_processor.py"
print_success "Python 파일 분석 완료"

# Go 파일 분석
print_step "Go 파일 분석"
npm run cli -- analyze --pattern "demo/examples/go/user.go"
print_success "Go 파일 분석 완료"

# Markdown 파일 분석
print_step "Markdown 파일 분석"
npm run cli -- analyze --pattern "demo/examples/markdown/API_DOCS.md"
print_success "Markdown 파일 분석 완료"

# 5. RDF 주소 생성
print_step "RDF 주소 생성"
npm run cli -- rdf --create --project "demo-project" --file "demo/examples/typescript/UserService.ts" --type "class" --symbol "UserService"
npm run cli -- rdf --create --project "demo-project" --file "demo/examples/typescript/Button.tsx" --type "class" --symbol "Button"
print_success "RDF 주소 생성 완료"

# 5-1. RDF 파일 위치 반환 테스트
print_step "RDF 파일 위치 반환 테스트"
npm run cli -- rdf-file --location "demo-project/demo/examples/typescript/UserService.ts#class:UserService"
npm run cli -- rdf-file --path "demo-project/demo/examples/typescript/Button.tsx#class:Button"
npm run cli -- rdf-file --relative "demo-project/demo/examples/typescript/UserService.ts#class:UserService"
print_success "RDF 파일 위치 반환 테스트 완료"

# 6. Unknown Symbol 분석
print_step "Unknown Symbol 분석"
npm run cli -- unknown --register "authenticateUser" demo/examples/typescript/UserService.ts
npm run cli -- unknown --register "processUser" demo/examples/typescript/UserService.ts
npm run cli -- unknown --search "authenticateUser"
print_success "Unknown Symbol 분석 완료"

# 7. Query 실행
print_step "Query 실행"
npm run cli -- query --sql "SELECT * FROM nodes WHERE type = 'class'"
npm run cli -- query --natural "find all React components"
print_success "Query 실행 완료"

# 8. Cross-Namespace 분석
print_step "Cross-Namespace 분석"
npm run cli -- cross-namespace --analyze "auth" "user"
npm run cli -- cross-namespace --circular
print_success "Cross-Namespace 분석 완료"

# 9. Inference 실행
print_step "Inference 실행"
npm run cli -- inference --hierarchical 1 --edge-type imports
npm run cli -- inference --transitive 1 --edge-type depends_on
print_success "Inference 실행 완료"

# 10. Context Documents 생성
print_step "Context Documents 생성"
npm run cli -- context-documents --file demo/examples/typescript/UserService.ts
npm run cli -- context-documents --symbol demo/examples/typescript/UserService.ts --symbol-path UserService
print_success "Context Documents 생성 완료"

# 11. Performance Optimization
print_step "Performance Optimization"
npm run cli -- performance --analyze "demo-project"
npm run cli -- performance --cache clear
npm run cli -- performance --stats
print_success "Performance Optimization 완료"

# 12. 결과 확인
print_step "결과 확인"
if [ -d "demo/results" ]; then
    echo "📊 분석 결과:"
    ls -la demo/results/
    echo ""
    echo "📈 시각화 결과:"
    if [ -d "demo/results/visualizations" ]; then
        ls -la demo/results/visualizations/
    fi
    echo ""
    echo "📄 리포트:"
    if [ -d "demo/results/reports" ]; then
        ls -la demo/results/reports/
    fi
fi

# 13. 데이터베이스 확인
print_step "데이터베이스 확인"
if [ -f "demo/dependency-linker.db" ]; then
    echo "🗄️ 데이터베이스 정보:"
    sqlite3 demo/dependency-linker.db ".tables"
    echo ""
    echo "📊 노드 수:"
    sqlite3 demo/dependency-linker.db "SELECT COUNT(*) as node_count FROM nodes;"
    echo ""
    echo "🔗 엣지 수:"
    sqlite3 demo/dependency-linker.db "SELECT COUNT(*) as edge_count FROM edges;"
    echo ""
    echo "📋 노드 타입별 분포:"
    sqlite3 demo/dependency-linker.db "SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC;"
    echo ""
    echo "🔗 엣지 타입별 분포:"
    sqlite3 demo/dependency-linker.db "SELECT type, COUNT(*) as count FROM edges GROUP BY type ORDER BY count DESC;"
fi

print_success "데모 실행 완료!"
echo ""
echo "🎉 모든 데모 단계가 성공적으로 완료되었습니다!"
echo ""
echo "📚 추가 정보:"
echo "- 데모 가이드: docs/02-user-guides/DEMO-ENVIRONMENT-GUIDE.md"
echo "- 분석 결과: demo/results/"
echo "- 데이터베이스: demo/dependency-linker.db"
echo ""
echo "🔧 다음 단계:"
echo "1. 분석 결과 확인: ls -la demo/results/"
echo "2. 데이터베이스 탐색: sqlite3 demo/dependency-linker.db"
echo "3. 시각화 확인: open demo/results/visualizations/"
echo ""
echo "📖 문서:"
echo "- 빠른 시작: docs/02-user-guides/QUICK-START-GUIDE.md"
echo "- 모범 사례: docs/02-user-guides/BEST-PRACTICES-GUIDE.md"
echo "- 완전한 가이드: docs/02-user-guides/USER-GUIDE-COMPLETE.md"