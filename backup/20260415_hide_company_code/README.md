# 업체코드 입력란 숨김 작업 - 2026-04-15

## 변경 파일 2개
- C:\Drivelog\drivelog-admin\client\src\pages\Login.jsx
- C:\Drivelog\drivelog-mobile\src\pages\Login.jsx

## 변경 내용
1. 업체코드 input 라벨/필드를 화면에서 제거 (label + input 통째로 hide)
2. form state의 company_code는 그대로 유지 (백엔드는 빈 문자열 받으면 무시함)
3. localStorage에 저장된 기존 company_code 값도 그대로 두어 호환성 유지
4. 로그인 정보 저장 시 company_code 키도 그대로 저장 (나중에 멀티 회사 지원 시 호환)

## 백엔드 동작 (auth.js)
이미 company_code는 선택사항으로 처리되고 있음:
```js
if (company_code) { sql += ` AND (c.company_code = ? OR u.role = 'MASTER')`; params.push(company_code); }
```
빈 문자열이면 그냥 login_id로만 검색. login_id 글로벌 unique이므로 충돌 없음.

## 복구 방법
백엔드는 이미 호환되므로 프론트만 다시 input 추가하면 됨.
