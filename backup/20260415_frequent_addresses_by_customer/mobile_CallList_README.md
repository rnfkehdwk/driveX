# CallList.jsx (모바일) 백업 노트 - 2026-04-15

원본 파일: C:\Drivelog\drivelog-mobile\src\pages\CallList.jsx

## 변경 내용 (CreateCallModal 부분만)
- useEffect 초기 로드에서 자주 가는 곳 호출 제거
- selectedCust 변경 시 자동 재로드 (customer_id 파라미터 전달)
- 레이아웃 순서 변경:
  1. 고객/제휴업체 (맨 위)
  2. 예상 요금/결제
  3. 출발지/도착지 (고객 선택 시 ⭐ 활성화)
  4. 메모
  5. 기사 지명
- ⭐ 버튼 disabled 조건: !selectedCust || frequentX.length === 0
- 위치 정보 헤더에 선택 고객명 표시

## CallList 메인 컴포넌트 (예약 목록 부분)는 변경 없음
