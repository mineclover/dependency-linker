#!/bin/bash

# TypeScript File Analyzer Demo Script
# 다양한 예제 파일을 분석하고 결과를 저장합니다

echo "🎯 TypeScript File Analyzer Demo"
echo "=================================="
echo ""

# 결과 디렉토리 생성
mkdir -p demo/results

echo "📁 Demo Examples:"
ls -la demo/examples/
echo ""

# 1. 간단한 컴포넌트 분석
echo "1️⃣ 간단한 React 컴포넌트 분석"
echo "--------------------------------"
./analyze-file demo/examples/simple-component.tsx --format text
echo ""
./analyze-file demo/examples/simple-component.tsx --format json > demo/results/simple-component.json
echo "✅ 결과 저장: demo/results/simple-component.json"
echo ""

# 2. 복잡한 앱 분석
echo "2️⃣ 복잡한 React 앱 분석 (다양한 의존성)"
echo "----------------------------------------"
./analyze-file demo/examples/complex-app.tsx --format text
echo ""
./analyze-file demo/examples/complex-app.tsx --format json > demo/results/complex-app.json
echo "✅ 결과 저장: demo/results/complex-app.json"
echo ""

# 3. Node.js 백엔드 분석
echo "3️⃣ Node.js Express 백엔드 분석"
echo "------------------------------"
./analyze-file demo/examples/node-backend.ts --format text
echo ""
./analyze-file demo/examples/node-backend.ts --format json > demo/results/node-backend.json
echo "✅ 결과 저장: demo/results/node-backend.json"
echo ""

# 4. 에러 복구 능력 테스트
echo "4️⃣ 구문 오류 파일 분석 (에러 복구 테스트)"
echo "--------------------------------------"
./analyze-file demo/examples/broken-syntax.tsx --format text
echo ""
./analyze-file demo/examples/broken-syntax.tsx --format json > demo/results/broken-syntax.json
echo "✅ 결과 저장: demo/results/broken-syntax.json"
echo ""

# 5. 성능 테스트
echo "5️⃣ 성능 측정"
echo "------------"
echo "⏱️ 간단한 파일:"
time ./analyze-file demo/examples/simple-component.tsx > /dev/null

echo "⏱️ 복잡한 파일:"
time ./analyze-file demo/examples/complex-app.tsx > /dev/null

echo "⏱️ 백엔드 파일:"
time ./analyze-file demo/examples/node-backend.ts > /dev/null
echo ""

# 6. 의존성 추출 예제
echo "6️⃣ 의존성 추출 및 분류 예제"
echo "----------------------------"
echo "📦 복잡한 앱의 외부 패키지 목록:"
./analyze-file demo/examples/complex-app.tsx --format json | jq -r '.dependencies[] | select(.type == "external") | .packageName' | sort | uniq
echo ""

echo "📁 복잡한 앱의 상대경로 의존성:"
./analyze-file demo/examples/complex-app.tsx --format json | jq -r '.dependencies[] | select(.type == "relative") | .source'
echo ""

echo "🔢 백엔드 파일의 의존성 통계:"
./analyze-file demo/examples/node-backend.ts --format json | jq '.dependencies | length' | xargs echo "총 의존성 수:"
./analyze-file demo/examples/node-backend.ts --format json | jq '[.dependencies[] | select(.type == "external")] | length' | xargs echo "외부 패키지:"
./analyze-file demo/examples/node-backend.ts --format json | jq '[.dependencies[] | select(.type == "relative")] | length' | xargs echo "상대경로:"
echo ""

# 7. JSON 결과 요약
echo "7️⃣ 분석 결과 요약"
echo "------------------"
echo "📊 저장된 결과 파일들:"
ls -lh demo/results/
echo ""

echo "📈 각 파일별 분석 통계:"
for file in demo/results/*.json; do
    filename=$(basename "$file" .json)
    echo "  $filename:"
    echo "    Dependencies: $(jq '.dependencies | length' "$file")"
    echo "    Imports: $(jq '.imports | length' "$file")"
    echo "    Exports: $(jq '.exports | length' "$file")"
    echo "    Parse Time: $(jq '.parseTime' "$file")ms"
    echo ""
done

echo "🎉 Demo 완료!"
echo ""
echo "📖 결과 파일들을 확인해보세요:"
echo "   - demo/results/ 디렉토리의 JSON 파일들"
echo "   - 각 파일의 의존성, import, export 정보 포함"
echo ""
echo "🔧 추가 테스트:"
echo "   ./analyze-file <your-file.tsx> --format text"
echo "   ./analyze-file <your-file.ts> --format json | jq '.dependencies'"