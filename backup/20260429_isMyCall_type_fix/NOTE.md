# SA 본인 지명 콜 — 운행기록 작성 버튼 안 보이는 버그 (2026-04-29 23:50)

## 버그 시나리오
1. SA(임창빈)가 모바일 PWA → 콜 생성 → 기사 지명에 본인 선택 → 콜 생성
2. 백엔드: 지명 콜은 즉시 status=ASSIGNED로 INSERT (대기 큐 통과, 본인 user_id가 assigned_rider_id에 박힘)
3. SA가 모바일 콜 현황 진입
4. "🚗 진행 중 콜" 영역에 콜이 리스트업됨 (allActiveCalls 통과)
5. **그런데 카드에 "🚗 운행기록 작성" / "수락 취소" 버튼이 안 보임**
6. 결과: 운행 작성 진입 불가 → 완료 처리 불가 → 매출/운행수 집계 안 됨

## 코드 위치 (CallList.jsx)
```javascript
// L685
const myCalls = calls.filter(c => c.assigned_rider_id === user?.user_id && ['ASSIGNED', 'IN_PROGRESS'].includes(c.status));
// L686 (allActiveCalls는 isSuperAdmin이면 모든 ASSIGNED/IN_PROGRESS 표시 — 여기까지는 카드 노출 OK)

// L723 — 진행 중 콜 카드 내부
const isMyCall = call.assigned_rider_id === user?.user_id;
// ...
{isMyCall && (
  <div>
    <button>🚗 운행기록 작성</button>
    <button>수락 취소</button>
  </div>
)}
```

## 근본 원인
strict equality (`===`) — 한쪽이 number고 한쪽이 string이면 false.

가능 시나리오 두 가지:
1. **백엔드 mariadb 드라이버가 BIGINT/INT 컬럼을 string으로 반환하는 케이스** (특히 mariadb 패키지 최신 버전, BigInt 안전 처리 모드에서 발생)
2. **localStorage user 객체에 user_id가 string으로 저장된 경우** (JSON 직렬화 과정에서 보존되지만, 어딘가에서 String() 변환됐을 가능성)

## 수정 방식
양쪽을 명시적으로 `Number(...)`로 변환해서 비교하는 헬퍼 함수 추가.
또는 가장 단순하게 `==` (loose equality) 사용. 다만 `==`는 lint warning이 뜨므로 헬퍼 함수가 깔끔.

```javascript
// utility — 두 ID가 같은지 type-safe 비교 (string ↔ number 둘 다 OK)
const sameId = (a, b) => a != null && b != null && Number(a) === Number(b);

// 사용
const myCalls = calls.filter(c => sameId(c.assigned_rider_id, user?.user_id) && ['ASSIGNED', 'IN_PROGRESS'].includes(c.status));
const isMyCall = sameId(call.assigned_rider_id, user?.user_id);
```

## 부수적으로 admin 측에도 같은 진입점 필요?
admin CallManage.jsx에는 운행기록 작성 진입 버튼이 없음 → 별개 이슈, 일단 모바일 픽스 우선.
모바일에서 정상 작동하면 SA는 모바일로 운행 작성하면 됨.
