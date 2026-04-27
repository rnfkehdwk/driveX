# 백업 정보 — 2026-04-25 콜 생성 페이지 레이아웃 변경

## 변경 대상
1. `drivelog-admin/client/src/pages/CallManage.jsx`
   - 고객/제휴업체 섹션을 출발지/도착지 위로 이동
   - 신규 고객 즉시 등록 폼 (코드에 이미 있음 — custSearch && filteredCust.length === 0 조건일 때 자동 표시) 유지
2. `drivelog-mobile/src/pages/CallList.jsx` (SA 전용 콜 생성 모달)
   - 고객/제휴업체 섹션을 출발지/도착지 위로 이동
   - admin과 동일한 신규 고객 즉시 등록 폼 추가
   - **Contact Picker API 버튼 추가 (Android Chrome HTTPS 전용, 2026-04-25 추가 작업)**
   - `createCustomer` API import 추가

## 작업 2 — Contact Picker API
- `navigator.contacts.select(['name', 'tel'])` 사용
- Android Chrome HTTPS만 지원, iOS/데스크톱 미지원
- 미지원 환경에서는 버튼이 자동으로 숨겨짐
- '최근 통화'에 직접 접근은 OS 보안상 불가능 — '연락처에서 1탭 선택'이 가장 가까운 구현

## 원본 백업
- `CallManage_admin_20260425_BEFORE.jsx` — admin 원본 (전체)
- `CallList_mobile_20260425_BEFORE_HEADER.jsx` — mobile (헤더만 placeholder, git에서 복원 가능)

## 작업 후 확인사항
- [ ] 고객/제휴업체가 위치 정보 위에 보이는지
- [ ] 검색 결과 없을 때 신규 등록 폼이 펼쳐지는지
- [ ] 등록 후 자동 선택되어 콜 생성 진행 가능한지
- [ ] mobile에서도 동일하게 동작하는지
- [ ] Android Chrome에서 "📞 연락처에서 선택" 버튼이 보이는지
- [ ] 버튼 탭 시 OS 연락처 픽커가 열리는지
- [ ] 선택한 연락처의 이름/번호가 폼에 자동 입력되는지
