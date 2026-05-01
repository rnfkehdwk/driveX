# 신규 고객 등록 — 전화번호 입력 시 모달 닫힘 버그 수정

**작업일**: 2026-04-29 22:10
**대상 파일**:
- `drivelog-mobile/src/pages/CallList.jsx`
- `drivelog-admin/client/src/pages/CallManage.jsx`

## 버그 증상
콜 생성 시 → 고객 검색 → "검색 결과 없음" → 신규 고객 등록 박스 표시 →
- 고객명은 잘 입력됨 (custSearch 그대로 사용하므로)
- 전화번호 입력란 클릭 시 **신규 고객 등록 박스 자체가 사라져버림**

## 근본 원인
첫 번째 input(고객 검색)의 onBlur가 200ms 후 `setShowCustList(false)` 호출.
신규 고객 등록 박스는 `{showCustList && filteredCust.length === 0 && custSearch}` 조건부 렌더링되므로
`showCustList=false`가 되면 박스 전체가 DOM에서 제거됨 → 안에 있던 전화번호 input도 같이 사라짐.

전화번호 input에 `onFocus={() => setShowCustList(true)}`가 있어서 다시 true로 만들지만,
focus 이벤트보다 부모의 blur 타이머가 먼저 실행 + 부모는 `value=""`로 unmount된 후 focus가 시도되는 패턴 발생.

특히 모바일에서는 가상 키보드와 focus 전이 타이밍 때문에 더 잘 발생.

## 수정 방식
신규 고객 등록 박스 컨테이너 `<div>`에
```jsx
onMouseDown={e => e.preventDefault()}
```
추가 — 박스 내부 클릭이 부모 input의 blur를 방지함.

또한 박스 내부 input들에 `onMouseDown` 핸들러를 추가해서 컨테이너 onMouseDown이 이벤트 전파 시 input 자체의 focus는 정상 동작하도록 함 (input은 `e.stopPropagation()` 수준은 불필요, 기본 focus 동작은 유지).

추가로 `partSearch`의 onBlur도 일관성을 위해 같은 박스 패턴을 안 쓰지만 영향 없음 — 제휴업체는 신규 등록 박스가 없음.

## 백업 원본
- `CallList_jsx_20260429_2210.jsx` — 모바일 원본 전체
- `CallManage_jsx_20260429_2210.jsx` — 관리자 원본 전체
