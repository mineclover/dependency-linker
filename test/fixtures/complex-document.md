---
title: "복합 테스트 문서"
tags: ["test", "notion", "markdown"]
description: "복잡한 구조를 가진 테스트 문서"
---

# 복합 테스트 문서

이 문서는 **다양한 마크다운 요소**를 포함하고 있어 노션 변환 테스트에 적합합니다.

## 🎯 텍스트 포맷팅

- **볼드 텍스트**
- *이탤릭 텍스트*  
- ***볼드 이탤릭***
- ~~취소선~~
- `인라인 코드`
- [외부 링크](https://github.com)

## 💻 코드 블록 테스트

### JavaScript 코드
```javascript
class NotionTest {
  constructor(config) {
    this.config = config;
  }
  
  async uploadTest() {
    return await this.notion.pages.create({
      parent: { page_id: this.config.parentId },
      properties: { title: [{ text: { content: "Test" } }] }
    });
  }
}
```

### Python 코드
```python
def test_notion_conversion():
    """노션 변환 테스트 함수"""
    converter = NotionConverter()
    result = converter.markdown_to_notion("# Test")
    assert result.success == True
    return result
```

### 언어 지정 없는 코드
```
이것은 언어가 지정되지 않은 코드 블록입니다.
plain text로 처리되어야 합니다.
```

## 📋 복합 리스트 구조

1. **첫 번째 메인 항목**
   - 하위 불릿 포인트 1
   - 하위 불릿 포인트 2
     - 더 깊은 중첩 항목
     - 또 다른 깊은 항목

2. **두 번째 메인 항목**
   1. 번호 있는 하위 항목 1
   2. 번호 있는 하위 항목 2

## 📊 테이블과 데이터

### 프로젝트 정보
| 항목 | 값 | 설명 |
|------|----|----- |
| 프로젝트명 | dependency-linker | CLI 도구 |
| 언어 | TypeScript | 타입 안전성 |
| 런타임 | Bun | 고성능 |
| 테스팅 | Vitest | 빠른 테스트 |

### 성능 메트릭
| 메트릭 | 원본 | 변환 후 | 보존율 |
|--------|------|---------|---------|
| 문자 수 | 1000 | 1005 | 99.5% |
| 단어 수 | 200 | 201 | 99.5% |
| 구조 요소 | 15 | 15 | 100% |

## 💬 인용문과 콜아웃

> **중요한 인용문**  
> 이것은 여러 줄에 걸친 인용문입니다.  
> 노션에서도 정확히 보존되어야 합니다.

> 단일 줄 인용문 테스트

## 🔗 참조와 링크

- [프로젝트 README](../README.md) - 상대 링크
- [GitHub 저장소](https://github.com) - 절대 링크
- [이메일 링크](mailto:test@example.com) - 이메일

## ✅ 체크리스트 테스트

- [x] 완료된 작업
- [x] 또 다른 완료 작업
- [ ] 미완료 작업
- [ ] 추후 처리 작업

---

**메타 정보**
- 작성일: 2025-09-08
- 테스트 목적: 노션 변환 품질 검증
- 예상 변환 시간: < 5초
- 예상 보존율: > 99%