#!/bin/bash

# Custom Output Formats Demo Script
# Demonstrates all available output formats for the TypeScript File Analyzer

echo "🎨 TypeScript File Analyzer - Custom Output Formats Demo"
echo "======================================================="
echo ""

# Create demo results directory
mkdir -p demo/format-results

echo "📁 Available Output Formats:"
echo "  json        - Full JSON output with all details (default)"
echo "  text        - Human-readable detailed format"
echo "  compact     - Minified JSON without formatting"
echo "  summary     - Single line summary with key metrics"
echo "  csv         - CSV format for spreadsheet analysis"
echo "  deps-only   - Dependencies only (external packages)"
echo "  table       - Formatted table view of dependencies"
echo ""

# Test file for demo
TEST_FILE="demo/examples/complex-app.tsx"

echo "🔍 Analyzing file: $TEST_FILE"
echo ""

# 1. Summary format
echo "1️⃣ Summary Format (Quick Overview)"
echo "-----------------------------------"
./analyze-file "$TEST_FILE" --format summary
echo ""

# 2. Dependencies only format  
echo "2️⃣ Dependencies Only Format (External Packages)"
echo "-----------------------------------------------"
./analyze-file "$TEST_FILE" --format deps-only
echo ""

# 3. CSV format
echo "3️⃣ CSV Format (Spreadsheet Ready)"
echo "---------------------------------"
./analyze-file "$TEST_FILE" --format csv
echo ""

# 4. Table format
echo "4️⃣ Table Format (Visual Layout)"
echo "-------------------------------"
./analyze-file "$TEST_FILE" --format table
echo ""

# 5. Compact JSON format
echo "5️⃣ Compact JSON Format (Single Line)"
echo "------------------------------------"
./analyze-file "$TEST_FILE" --format compact | head -c 150
echo "... (truncated)"
echo ""
echo ""

# 6. Traditional formats for comparison
echo "6️⃣ Traditional JSON Format (Pretty Printed)"
echo "-------------------------------------------"
./analyze-file "$TEST_FILE" --format json | head -20
echo "... (truncated)"
echo ""
echo ""

echo "7️⃣ Traditional Text Format (Detailed Human-Readable)"
echo "---------------------------------------------------"
./analyze-file "$TEST_FILE" --format text | head -20
echo "... (truncated)"
echo ""
echo ""

# Save examples to files
echo "💾 Saving format examples to demo/format-results/"
echo ""

echo "Saving summary format..."
./analyze-file "$TEST_FILE" --format summary > demo/format-results/summary.txt

echo "Saving dependencies-only format..."
./analyze-file "$TEST_FILE" --format deps-only > demo/format-results/deps-only.txt

echo "Saving CSV format..."
./analyze-file "$TEST_FILE" --format csv > demo/format-results/output.csv

echo "Saving table format..."
./analyze-file "$TEST_FILE" --format table > demo/format-results/table.txt

echo "Saving compact JSON format..."
./analyze-file "$TEST_FILE" --format compact > demo/format-results/compact.json

echo "Saving pretty JSON format..."
./analyze-file "$TEST_FILE" --format json > demo/format-results/pretty.json

echo "Saving detailed text format..."
./analyze-file "$TEST_FILE" --format text > demo/format-results/detailed.txt

echo ""
echo "📊 Format Comparison Statistics:"
for file in demo/format-results/*; do
    filename=$(basename "$file")
    size=$(wc -c < "$file")
    lines=$(wc -l < "$file")
    echo "  $filename: $size bytes, $lines lines"
done

echo ""
echo "🔧 Usage Examples:"
echo "  ./analyze-file src/component.tsx --format summary    # Quick overview"
echo "  ./analyze-file src/utils.ts --format deps-only       # List external packages"
echo "  ./analyze-file src/*.ts --format csv >> analysis.csv # Batch CSV export"
echo "  ./analyze-file src/app.tsx --format table            # Visual table view"
echo ""

echo "📖 Saved Results:"
echo "   - Check demo/format-results/ directory for saved examples"
echo "   - Each format optimized for different use cases"
echo "   - CSV format perfect for spreadsheet analysis"
echo "   - Summary format ideal for CI/CD pipelines"
echo "   - Table format great for terminal viewing"
echo ""

echo "🎉 Format Demo Complete!"