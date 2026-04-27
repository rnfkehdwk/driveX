# 2026-04-27 모바일 고객 수정 + Contact Picker 확장 작업

## 작업 목적
1. SA(사장님)가 모바일 고객 조회 화면에서 고객을 수정할 수 없는 문제 해결
2. 이전에 도입한 Contact Picker(연락처에서 가져오기) 버튼을 모바일 고객 등록/수정 폼에도 확장

## 변경 파일
- `drivelog-mobile/src/api/client.js` — `updateCustomer` 함수 추가
- `drivelog-mobile/src/pages/CustomerNew.jsx` — Contact Picker 버튼 추가
- `drivelog-mobile/src/pages/CustomerList.jsx` — SA 한정 카드 탭 → 수정 모달 추가, 모달에 Contact Picker

## 권한 정책
- 고객 수정은 SA/MASTER만 가능 (백엔드 PUT /customers/:id 정책 그대로)
- RIDER에게는 모바일에서도 수정 버튼/액션 비노출
- 백엔드 customers.js 변경 없음

## 백업 파일
- client_mobile_BEFORE.js — drivelog-mobile/src/api/client.js 원본
- CustomerList_BEFORE.jsx — 원본
- CustomerNew_BEFORE.jsx — 원본

## 배포
백엔드 변경 없음 → `npm run deploy:mobile`만 필요
