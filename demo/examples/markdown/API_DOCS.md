# API Documentation

> **@semantic-tags: doc-api, api-documentation, public-api**
> **@description: RESTful API 문서**

## 📋 목차

- [개요](#개요)
- [인증](#인증)
- [사용자 API](#사용자-api)
- [주문 API](#주문-api)
- [상품 API](#상품-api)
- [에러 처리](#에러-처리)
- [예시](#예시)

## 개요

이 API는 전자상거래 플랫폼을 위한 RESTful API입니다.

**Base URL**: `https://api.example.com/v1`

**Content-Type**: `application/json`

## 인증

API는 JWT(JSON Web Token) 기반 인증을 사용합니다.

### 인증 헤더

```http
Authorization: Bearer <your-jwt-token>
```

### 토큰 획득

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**응답:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## 사용자 API

### 사용자 생성

**@semantic-tags: create-endpoint, user-api, public-api**

```http
POST /users
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "password123"
}
```

**응답:**

```json
{
  "id": 123,
  "email": "newuser@example.com",
  "name": "New User",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 사용자 조회

**@semantic-tags: read-endpoint, user-api, public-api**

```http
GET /users/{id}
Authorization: Bearer <token>
```

**응답:**

```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 사용자 목록 조회

**@semantic-tags: list-endpoint, user-api, public-api**

```http
GET /users?page=1&limit=10&search=john
Authorization: Bearer <token>
```

**응답:**

```json
{
  "users": [
    {
      "id": 123,
      "email": "john@example.com",
      "name": "John Doe",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### 사용자 정보 업데이트

**@semantic-tags: update-endpoint, user-api, public-api**

```http
PUT /users/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

### 사용자 삭제

**@semantic-tags: delete-endpoint, user-api, public-api**

```http
DELETE /users/{id}
Authorization: Bearer <token>
```

## 주문 API

### 주문 생성

**@semantic-tags: create-endpoint, order-api, public-api**

```http
POST /orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "user_id": 123,
  "items": [
    {
      "product_id": 456,
      "quantity": 2,
      "price": 29.99
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  }
}
```

### 주문 조회

**@semantic-tags: read-endpoint, order-api, public-api**

```http
GET /orders/{id}
Authorization: Bearer <token>
```

### 주문 목록 조회

**@semantic-tags: list-endpoint, order-api, public-api**

```http
GET /orders?user_id=123&status=pending
Authorization: Bearer <token>
```

## 상품 API

### 상품 목록 조회

**@semantic-tags: list-endpoint, product-api, public-api**

```http
GET /products?category=electronics&price_min=10&price_max=100
```

### 상품 조회

**@semantic-tags: read-endpoint, product-api, public-api**

```http
GET /products/{id}
```

### 상품 검색

**@semantic-tags: search-endpoint, product-api, public-api**

```http
GET /products/search?q=smartphone&category=electronics
```

## 에러 처리

API는 표준 HTTP 상태 코드를 사용합니다.

### 에러 응답 형식

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### 상태 코드

- `200 OK` - 성공
- `201 Created` - 생성 성공
- `400 Bad Request` - 잘못된 요청
- `401 Unauthorized` - 인증 실패
- `403 Forbidden` - 권한 없음
- `404 Not Found` - 리소스 없음
- `500 Internal Server Error` - 서버 오류

## 예시

### JavaScript (Fetch API)

```javascript
// 사용자 생성
const createUser = async (userData) => {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create user');
  }
  
  return response.json();
};
```

### Python (Requests)

```python
import requests

# 사용자 생성
def create_user(user_data, token):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.post(
        'https://api.example.com/v1/users',
        json=user_data,
        headers=headers
    )
    
    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f'Failed to create user: {response.text}')
```

### cURL

```bash
# 사용자 생성
curl -X POST https://api.example.com/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "password123"
  }'
```

## 관련 링크

- [인증 가이드](./AUTHENTICATION.md)
- [에러 코드 참조](./ERROR_CODES.md)
- [SDK 다운로드](./SDK.md)
- [Postman 컬렉션](./postman-collection.json)

## 지원

문의사항이 있으시면 다음으로 연락해주세요:

- **이메일**: support@example.com
- **문서**: https://docs.example.com
- **GitHub**: https://github.com/example/api
