# CallManage.jsx 백업 노트 - 2026-04-15

원본 파일: C:\Drivelog\drivelog-admin\client\src\pages\CallManage.jsx
변경 전 크기: 30823 bytes
변경 전 수정일: 2026-04-08

## 변경 내용
- CreateCallModal 레이아웃 재조립:
  1. 고객/제휴업체 (맨 위)
  2. 요금/결제
  3. 출발지 (고객 선택 시 그 고객 자주 가는 곳 ⭐)
  4. 도착지 (고객 선택 시 그 고객 자주 가는 곳 ⭐)
  5. 메모
  6. 기사 지명
- fetchFrequentAddresses 호출 시 selectedCust.customer_id 전달
- selectedCust 변경 시 frequent 재로드

백엔드(calls.js frequent-addresses)도 customer_id 필터 추가됨.

원본 복구 필요 시:
- git checkout C:\Drivelog\drivelog-admin\client\src\pages\CallManage.jsx
  (git 관리 중인 경우)
- 또는 세션 히스토리에서 전체 내용 복사 가능
