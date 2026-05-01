# 신규고객 박스 픽스 v2 — relatedTarget 기반 blur 제어로 변경

## v1 (실패)
- 컨테이너 div에 `onMouseDown={e => e.preventDefault()}` 추가
- 내부 input 2개에 `onMouseDown={e => e.stopPropagation()}` 추가

**왜 실패했나**: `stopPropagation`이 mousedown의 버블링을 막아서, 부모 div의 `preventDefault`가 호출되지 않음. 결과적으로 blur가 그대로 발동되어 박스가 사라짐.

## v2 (이번 수정)
- 첫 번째 input의 `onBlur`에서 `e.relatedTarget`을 검사
- 새로 focus 받는 요소가 박스 컨테이너 내부면 닫지 않음
- React onBlur는 relatedTarget을 안정적으로 제공 (FocusEvent.relatedTarget)
- mousedown 이전에 ref로 박스 컨테이너 참조 보유

```jsx
const newCustBoxRef = useRef(null);

<input
  ...
  onBlur={(e) => {
    // 박스 내부로 focus 이동 시 닫지 않음
    if (newCustBoxRef.current && newCustBoxRef.current.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => setShowCustList(false), 200);
  }}
/>

<div ref={newCustBoxRef} ...>
  <input ... />  // 깔끔하게 onMouseDown 없음
  <input ... />
  <button ... />
</div>
```

이러면:
- 박스 외부 클릭 → relatedTarget이 박스 밖 → 닫힘 ✓
- 박스 내부 input 클릭 → relatedTarget이 박스 내부 → 닫지 않음 ✓
- 박스 내부 input은 정상 focus + 입력 가능 ✓
