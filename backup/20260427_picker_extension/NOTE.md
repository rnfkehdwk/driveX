# 2026-04-27 Contact Picker 통일 작업

## 작업 목적
이전 세션 작업의 누락 보완. 사용자 요청은 "전화번호 입력하는 모든 곳에 픽커 적용"이었으나
실제로는 고객 관련 화면 3곳만 적용됐음. 모바일에서 전화번호를 입력하는 나머지 두 화면에도 추가:

- 기사 등록 (RiderNew.jsx) — 연락처 입력 칸
- 제휴업체 등록/수정 (PartnerList.jsx) — 모달 안 연락처 입력 칸 (등록 + 수정 공유)

## 변경 파일
- drivelog-mobile/src/pages/RiderNew.jsx
- drivelog-mobile/src/pages/PartnerList.jsx

## 백업 파일
- RiderNew_BEFORE.jsx — 전체 원본
- PartnerList_BEFORE_partial.jsx — 식별용 (전체 원본은 git에서 복원 가능)

## 배포
백엔드 변경 없음 → npm run deploy:mobile

## 적용 후 Contact Picker 위치 전체 정리
1. 콜 생성 모달 → 신규 고객 인라인 등록 폼 (CallList.jsx) — 어제 작업
2. 고객 등록 페이지 (CustomerNew.jsx) — 오늘 첫 작업
3. 고객 조회 → SA 한정 카드 탭 → 수정 모달 (CustomerList.jsx) — 오늘 첫 작업
4. 기사 등록 (RiderNew.jsx) — 이번 작업
5. 제휴업체 등록/수정 모달 (PartnerList.jsx) — 이번 작업
