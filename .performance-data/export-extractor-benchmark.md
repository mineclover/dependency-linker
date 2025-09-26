# EnhancedExportExtractor 성능 벤치마크 보고서

## 📊 테스트 결과

| 테스트 케이스 | 실행 시간 | 메모리 사용량 | Export 수 | 처리율 (exports/ms) |
|--------------|-----------|---------------|-----------|-------------------|
| Small File (5 exports) | 0.64ms | 62.32KB | 7 | 10.88 |
| Medium File (50 exports) | 5.52ms | 443.57KB | 80 | 14.49 |
| Large File (200 exports) | 24.52ms | 2205.65KB | 360 | 14.68 |
| Complex File (nested classes) | 1.67ms | 148.87KB | 15 | 8.96 |
| Real World Example | 3.59ms | 218.89KB | 18 | 5.02 |
| IDataExtractor.ts (822 lines) | 8.92ms | 800.36KB | 36 | 4.04 |
| EnhancedDependencyExtractor.ts (503 lines) | 14.66ms | 1148.77KB | 3 | 0.20 |

## 🎯 성능 분석
- **평균 실행 시간**: 8.50ms
- **평균 메모리 사용량**: 718.35KB
- **가장 빠른 케이스**: Small File (5 exports) (0.64ms)
- **가장 느린 케이스**: Large File (200 exports) (24.52ms)

## 📅 테스트 환경
- **Node.js 버전**: v22.17.1
- **플랫폼**: darwin arm64
- **메모리**: 301MB
- **테스트 시간**: 2025-09-26T14:59:44.816Z