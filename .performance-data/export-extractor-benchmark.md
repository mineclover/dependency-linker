# EnhancedExportExtractor 성능 벤치마크 보고서

## 📊 테스트 결과

| 테스트 케이스 | 실행 시간 | 메모리 사용량 | Export 수 | 처리율 (exports/ms) |
|--------------|-----------|---------------|-----------|-------------------|
| Small File (5 exports) | 0.64ms | 62.82KB | 7 | 10.97 |
| Medium File (50 exports) | 4.30ms | 442.18KB | 80 | 18.59 |
| Large File (200 exports) | 23.02ms | 2201.93KB | 360 | 15.64 |
| Complex File (nested classes) | 1.58ms | 148.85KB | 15 | 9.52 |
| Real World Example | 2.21ms | 218.82KB | 18 | 8.13 |
| IDataExtractor.ts (822 lines) | 8.22ms | 800.45KB | 36 | 4.38 |
| EnhancedDependencyExtractor.ts (503 lines) | 13.44ms | 1149.02KB | 3 | 0.22 |

## 🎯 성능 분석
- **평균 실행 시간**: 7.63ms
- **평균 메모리 사용량**: 717.73KB
- **가장 빠른 케이스**: Small File (5 exports) (0.64ms)
- **가장 느린 케이스**: Large File (200 exports) (23.02ms)

## 📅 테스트 환경
- **Node.js 버전**: v22.17.1
- **플랫폼**: darwin arm64
- **메모리**: 382MB
- **테스트 시간**: 2025-09-26T12:55:37.235Z