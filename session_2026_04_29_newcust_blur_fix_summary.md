# DriveLog 세션 요약 — 2026-04-29 (밤: 신규고객 박스 픽스 + E2E 재검증)

> **이전 세션**: `session_2026_04_29_e2e_verification_summary.md` (저녁: E2E 검증 + 운영 시작 준비)
> **이번 세션 주제**:
> 1. 콜 생성 시 신규 고객 등록 박스 — 전화번호 입력 클릭하면 박스가 닫히는 버그 픽스
> 2. Chrome 2탭 (Admin SA + Mobile RIDER) E2E 검증
> **상태**: ✅ 코드 픽스 완료 + ⚠️ 사용자 배포 대기 + ✅ 픽스 무관 워크플로우 E2E 통과

---

## 🐛 픽스한 버그

### 버그: 신규 고객 등록 시 전화번호 input 클릭하면 박스 자체가 사라짐

**증상 (모바일 + 관리자 동일)**:
콜 생성 모달 → 고객 검색 → "검색 결과 없음" → 신규 고객 등록 박스 노출 → 이름은 자동으로 채워져 있음 →
전화번호 input을 클릭/탭하면 **박스가 통째로 사라져버려 입력 불가**.

**근본 원인**:
첫 번째 input (`custSearch`)의 `onBlur={() => setTimeout(() => setShowCustList(false), 200)}` 때문.

신규 고객 등록 박스는 `{showCustList && custSearch && filteredCust.length === 0 && (...)}` 조건부 렌더링이므로,
박스 안의 전화번호 input을 클릭 → 첫 input이 blur됨 → 200ms 후 `showCustList=false` → **박스 컨테이너 통째 DOM에서 제거** → 안의 전화번호 input도 함께 사라짐.

`onMouseDown={e => e.preventDefault()}`가 "+ 등록하고 선택" 버튼에는 있었지만 input들에는 없어서 발생.

**수정 (2 파일 모두 동일 패턴)**:
1. **신규 고객 등록 박스 컨테이너 `<div>`** → `onMouseDown={e => e.preventDefault()}` 추가
2. **이름/전화번호 input 두 개** → `onMouseDown={e => e.stopPropagation()}` 추가
   (부모 div의 preventDefault를 차단해서 input 자체의 focus는 정상 작동하도록)

---

## 📂 변경 파일

| 파일 | 변경 |
|---|---|
| `drivelog-mobile/src/pages/CallList.jsx` | 신규고객 박스 div + input 2개에 onMouseDown 추가 |
| `drivelog-admin/client/src/pages/CallManage.jsx` | 동일 패턴 적용 |
| `drivelog-admin/server/db/workflow_verification/cleanup_e2e_verification.js` | 검증용 신규 고객 삭제 로직 추가 (TAG 포함 customer 자동 정리) |

### 백업 위치
`C:\Drivelog\backup\20260429_newcust_phone_blur_fix\`:
- `CallList_jsx_20260429_2210.jsx` (모바일 원본)
- `CallManage_jsx_20260429_2210.jsx` (관리자 원본)
- `NOTE.md` (작업 메모)

`C:\Drivelog\backup\20260429_e2e_cleanup_v2\`:
- `cleanup_e2e_verification_20260429_2300_NOTE.md` (cleanup 스크립트 보강 메모)

---

## 🚀 배포 상태

### ⚠️ 아직 배포 안 됨 — 사용자가 다음 명령 실행 필요

```bash
cd /c/drivelog
npm run deploy:all
# 또는 부분만:
# npm run deploy:admin
# npm run deploy:mobile
```

배포해야 할 변경:
- 신규고객 박스 onMouseDown 픽스 (admin + mobile 둘 다)
- cleanup 스크립트는 NAS에서 직접 실행하므로 deploy:server 필요 (또는 deploy:all)

---

## ✅ E2E 검증 결과 (Chrome 2탭으로 진행)

> 검증 전 시점에 코드는 **로컬에만** 있고 NAS에는 미배포.
> 픽스 무관한 부분만 정공법으로 검증 (전화번호 미입력으로 신규 고객 등록).

### 시나리오: SA 콜 생성 → RIDER 콜 수락 → 운행기록 저장 → 마일리지 적립

| 단계 | 검증 결과 |
|---|---|
| 1. SA(cblim) Admin → 콜 생성 모달 → 검색 결과 없음 → 신규 고객 등록 (이름만) | ✅ customer_id=530, customer_code=1012-001 자동 부여, 자동 선택됨 |
| 2. 신규 고객 박스 — 전화번호 input 클릭 시 박스 사라짐 (버그 재현) | ❌ **버그 재현됨 → 픽스 미배포 확인** |
| 3. 출발/도착 텍스트 입력, 요금 20,000원, 메모 [E2E_VERIFY_20260429] → 콜 생성 | ✅ call_id=32, status=WAITING, 대기중 카운터 0→1 |
| 4. Mobile에서 RIDER (rider_미배정, user_id=48) 로그인 → 콜 현황 진입 | ✅ 대기 콜 1건 정상 표시 (모든 정보 정확) |
| 5. RIDER 콜 수락 → 운행기록 작성 화면 자동 진입 | ✅ assigned_at=12:04:16, started_at 자동 채움 (4-29 옵션 A 픽스 정상) |
| 6. 출발지/도착지/고객/요금 자동 입력 → 결제(현금) 선택 → 저장 | ✅ ride_id=7249, status=COMPLETED, completed_at=12:07:21 |
| 7. Admin 측 콜 #32 상태 확인 | ✅ 🟢 완료, ride_id=7249와 매핑됨 |
| 8. 마일리지 자동 적립 (10%) | ✅ mileage_earned=2,000원 (= 20,000 × 10%), customer.mileage_balance=2,000원 |

### DB에 남은 검증 데이터 (cleanup 필요)

| 테이블 | 데이터 |
|---|---|
| customers | id=530, name=`[E2E_VERIFY_20260429]검증고객`, balance=2,000원 |
| calls | id=32, status=COMPLETED, ride_id=7249 |
| rides | id=7249, total_fare=20,000, mileage_earned=2,000 |
| customer_mileage | EARN 거래 1건 (ride_id=7249) |
| audit_logs | 콜 생성/수락/완료 관련 기록 |

---

## 🧹 Cleanup 명령

cleanup 스크립트 보강 완료 (TAG 포함 신규 고객 자동 정리 로직 추가됨).

### Dry-run (확인용, 실제 삭제 안 함)
```bash
sudo docker exec -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
```

### 실제 정리
```bash
sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
```

⚠️ 실제 정리 전에 dry-run으로 한 번 확인 권장 — 다음 데이터가 표시되어야 정상:
- rides: 1건
- calls: 1건
- customer_mileage: 1건 이상 (EARN 거래)
- verify_customers: 1건 (`[E2E_VERIFY_20260429]검증고객`)

---

## 📝 발견된 부수 이슈 (이번 세션 범위 밖)

### 모바일 로그인 폼 — 회사코드 필드 누락
- 4-29 작업으로 `hide_company_code`가 적용된 후 모바일 PWA 로그인 폼에서 회사코드 입력란이 안 보임
- 폼에서 `test/11223344` 시도 시 처음에 인증 실패 (실제 비번이 다른가? 또는 폼이 company_code를 자동으로 매핑 못 함?) → 두 번 시도 후 "계정이 잠겨있습니다"
- API 직접 호출(fetch)은 `company_code: '1012'` 명시 시 정상 — 폼이 어떻게 백엔드와 통신하는지 점검 필요
- 우회로 `rider_미배정` 계정으로 토큰 직접 주입해 검증 진행

→ 별도 세션에서 점검 권장

### admin 모바일 비번 일괄 초기화 후 `test` 계정 비번 미일치 가능성
- 4-29 저녁 일괄 초기화는 23명 — `test_auto_xxx` 같은 자동 테스트 계정이 포함됐는지 별도 확인 필요
- `test` (user_id=51) 계정은 잠긴 상태 → 잠금 해제 또는 비번 재설정 필요할 수 있음

---

## 🔮 다음 세션 메모

### 즉시 처리 필요
1. **`npm run deploy:all`** 실행 → 신규 고객 박스 픽스 적용
2. **cleanup 스크립트 dry-run + 실제 실행** → 검증 데이터 정리 (customer 530, ride 7249, call 32, mileage)
3. **배포 후 동일 시나리오 재검증** → 이번에는 전화번호도 정상 입력되어야 함
4. **`test` 계정 잠금 해제** → `UPDATE users SET locked_until = NULL, login_fail_count = 0 WHERE login_id = 'test'`

### 장기
- **PII Phase 2 (암호화)**: 보류 중
- **PHASE1 (볼륨 암호화 + DB 포트 차단)**: 개발 주기 끝날 때
- **모바일 로그인 폼 회사코드 처리 로직 점검** (별도 세션)

---

## 🛠 학습 노트

### React onBlur 타이머 + 조건부 렌더링 함정
- `onBlur` + `setTimeout`으로 드롭다운 닫는 패턴은 흔하지만, **드롭다운 안에 또 다른 input/interactive 요소를 배치할 때 위험**
- 부모 input의 blur는 자식 input 클릭으로도 트리거되므로 → 자식 입장에서 focus 유지 못 함
- 표준 해법: 컨테이너 `<div>`에 `onMouseDown={e => e.preventDefault()}` 부착 + 내부 input들은 `onMouseDown={e => e.stopPropagation()}` 부착
  - preventDefault: blur 자체를 막음 (이게 핵심)
  - stopPropagation: 부모의 preventDefault가 input의 정상 focus까지 막는 걸 방지

### Chrome MCP를 활용한 멀티탭 E2E 검증 패턴
- 탭1(admin SA) + 탭2(mobile RIDER) 병렬 운영 시 토큰 충돌 없음 (도메인 같아도 localStorage는 탭별 독립이 아님 — 단, MCP가 탭별 세션 처리)
- 폼 로그인이 막힐 때 `fetch('/api/auth/login')` → localStorage 직접 주입 → `navigate('/')` 패턴이 빠르고 안전
- alert/confirm은 `window.confirm = () => true` / `window.alert = (m) => { window.__lastAlert = m }` 으로 미리 override
- 검증 데이터 식별 태그 (`[E2E_VERIFY_YYYYMMDD]`)를 메모/이름에 박아두면 cleanup이 쉬워짐

### cleanup 스크립트 설계 원칙
- TAG 기반 매칭으로 운영 데이터 영향 ZERO 보장
- dry-run 먼저, AUTO_CONFIRM=YES로 실제 실행
- 트랜잭션 묶기 (롤백 가능)
- 마일리지 잔액 원복 SQL 미리 계산 (USE - EARN 역방향)
- FK 의존성 순서: customer_mileage → rides → calls → audit_logs → customers

---

**작성**: 2026-04-29 23:30 (밤 추가 검증 후)
**작업자**: Claude (코드 + 검증 자동화) + Tomcat (배포 + cleanup 실행 예정)
**관련 문서**: `CLAUDE_SESSION_GUIDE.md`, `session_2026_04_29_e2e_verification_summary.md`, `session_2026_04_29_login_id_edit_summary.md`
