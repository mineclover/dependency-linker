const { execSync } = require('child_process');

console.log('🔍 Testing Data Models...');

// Test TypeScript compilation of models
try {
  execSync('npx tsc src/models/optimization/TestSuite.ts --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit', { stdio: 'pipe' });
  console.log('✅ TestSuite model compiles successfully');
} catch (error) {
  console.log('❌ TestSuite compilation failed:', error.message);
}

try {
  execSync('npx tsc src/models/optimization/OptimizationOpportunity.ts --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit', { stdio: 'pipe' });
  console.log('✅ OptimizationOpportunity model compiles successfully');
} catch (error) {
  console.log('❌ OptimizationOpportunity compilation failed:', error.message);
}

try {
  execSync('npx tsc src/models/optimization/PerformanceBaseline.ts --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit', { stdio: 'pipe' });
  console.log('✅ PerformanceBaseline model compiles successfully');
} catch (error) {
  console.log('❌ PerformanceBaseline compilation failed:', error.message);
}

console.log('\n🔍 Testing Service Compilation...');

try {
  execSync('npx tsc src/services/optimization/TestAnalyzer.ts --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit', { stdio: 'pipe' });
  console.log('✅ TestAnalyzer service compiles successfully');
} catch (error) {
  console.log('❌ TestAnalyzer compilation failed:', error.message);
}

try {
  execSync('npx tsc src/services/optimization/PerformanceTracker.ts --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --noEmit', { stdio: 'pipe' });
  console.log('✅ PerformanceTracker service compiles successfully');
} catch (error) {
  console.log('❌ PerformanceTracker compilation failed:', error.message);
}

console.log('\n📁 Checking File Structure...');
const fs = require('fs');

const requiredFiles = [
  'src/models/optimization/TestSuite.ts',
  'src/models/optimization/TestCase.ts',
  'src/models/optimization/OptimizationOpportunity.ts',
  'src/models/optimization/PerformanceBaseline.ts',
  'src/services/optimization/TestAnalyzer.ts',
  'src/services/optimization/TestOptimizer.ts',
  'src/services/optimization/PerformanceTracker.ts',
  'src/cli/commands/optimize-tests.ts',
  'scripts/measure-test-performance.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log(`\n📊 File Structure: ${allFilesExist ? 'COMPLETE' : 'INCOMPLETE'}`);