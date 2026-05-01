# DriveLog 전체 워크플로우 E2E 검증 (양양대리 1012)

> **목적**: 운영 시작 전 마지막 점검 — 콜 생성 → 수락 → 운행 → 마일리지까지 전체 흐름이 정상 동작하는지 검증
> **작성일**: 2026-04-29
> **검증 대상**: company_code=1012 (양양대리)

---

## 📁 파일 구성

| 파일 | 용도 |
|---|---|
| `run_e2e_verification.js` | **Phase 1** — 자동 DB/로직 검증 (메인 스크립트) |
| `cleanup_e2e_verification.js` | **Phase 3** — 검증 후 데이터 정리 (마일리지 잔액 원복 포함) |
| `MANUAL_TEST_GUIDE.md` | **Phase 2** — 실제 PC/폰 푸시 알림 수동 검증 가이드 |
| `quick_check.sql` | 검증 데이터 현황 빠른 조회 SQL |
| `README.md` | 이 문서 |

---

## 🎯 식별 마킹

모든 검증 데이터는 다음 태그로 식별됩니다:
```
[E2E_VERIFY_20260429]
```

- `calls.memo` 와 `rides.rider_memo` 에 포함
- `customer_mileage.description` 에 포함
- `audit_logs.detail` 에 `e2e_verify=true` 포함

→ cleanup 스크립트가 이 태그로 정확히 식별해 정리.

---

## 🚀 실행 절차

### 0단계: 배포 (스크립트를 NAS에 올리기)

Windows에서:
```bash
cd /c/drivelog
npm run deploy:server
```

### 1단계: Phase 1 자동 검증

#### 1-1. Dry-run (확인 메시지만 출력)
```bash
sudo docker exec -i drivelog-api node /app/db/workflow_verification/run_e2e_verification.js
```

→ 회사/SA/RIDER/고객/결제구분 정보 표시 후 확인 요청 메시지로 멈춤.

#### 1-2. 실제 실행
```bash
sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/run_e2e_verification.js
```

→ 4단계 검증 자동 실행:
  - **STEP 1**: 콜 생성 + RIDER 푸시 발송
  - **STEP 2**: 콜 수락 + SA 푸시 발송
  - **STEP 3**: 운행 작성 + 마일리지 USE/EARN
  - **STEP 4**: 잔액 정합성 검증

→ 통과 시 `✅ 모든 검증 통과` 출력. 실패 시 어느 항목이 실패했는지 표시.

#### 1-3. 결과 확인
```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < \
  /volume1/docker/drivelog/server/db/workflow_verification/quick_check.sql
```

### 2단계: Phase 2 수동 푸시 검증

`MANUAL_TEST_GUIDE.md` 참조해서 PC/폰으로 직접 알림 수신 확인.

핵심 시나리오:
1. SA(PC) → 콜 생성 → RIDER(폰)에 알림
2. RIDER(폰) → 콜 수락 → SA(PC)에 알림
3. RIDER(폰) → 운행 작성 → 정상 저장
4. SA/RIDER → 마일리지 거래 이력 확인

### 3단계: 데이터 정리 (Phase 3)

#### 3-1. Dry-run (정리 대상 + 잔액 원복 계획 표시)
```bash
sudo docker exec -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
```

→ 다음과 같은 출력:
```
━━━ 정리 대상 ━━━
  rides:           N건
  calls:           N건
  customer_mileage: 2N건
  audit_logs:      M건

━━━ 마일리지 잔액 원복 계획 ━━━
  홍길동 (id=271): 12,000 +3,000 = 15,000
    (USE 5,000 복원, EARN 2,000 무효화)
```

#### 3-2. 실제 정리
```bash
sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
```

→ 트랜잭션으로 묶여서 원자적 삭제:
1. 고객 잔액 원복 (`UPDATE customers SET mileage_balance = mileage_balance + delta`)
2. customer_mileage 거래 삭제
3. calls.ride_id 연결 해제
4. manual_gps_points 삭제 (있으면)
5. rides 삭제
6. calls 삭제
7. audit_logs 삭제 (`detail LIKE '%e2e_verify%'`)

---

## ⚠️ 안전장치

### 자동 검증 (`run_e2e_verification.js`)
- 마일리지 잔액이 충분한 고객만 자동 선택 (잔액 < 5000원이면 검증 스킵)
- AUTO_CONFIRM 없으면 dry-run으로만 동작
- 트랜잭션 내에서 STEP 3 처리 (실패 시 롤백)

### 정리 (`cleanup_e2e_verification.js`)
- AUTO_CONFIRM 없으면 삭제 대상 리포트만 출력
- **잔액 원복 → 거래 삭제 → 운행 삭제 → 콜 삭제** 순서로 트랜잭션
- 실패 시 전체 롤백 (잔액 변동 없음)

---

## 🧪 검증 항목 상세

### Phase 1 자동 검증이 검증하는 것

| 항목 | 검증 방법 |
|---|---|
| 콜 생성 (WAITING) | calls INSERT, status, created_by, customer_id 등 |
| 푸시 발송 (RIDER 대상) | sendToCompanyRiders 결과의 sent+failed+removed == 구독자 수 |
| 콜 수락 (WAITING → ASSIGNED) | UPDATE 후 status, assigned_rider_id, assigned_at 채워짐 |
| 푸시 발송 (SA 대상, RIDER 제외) | sendToCompanyAdmins + excludeUserId 동작 |
| 운행 작성 | rides INSERT, rider_id/customer_id/call_id 매핑 |
| started_at 자동 채움 | NULL 이 아닌지 (4-29 픽스 검증) |
| 마일리지 USE | customer_mileage INSERT (type=USE) + customers.mileage_balance 차감 |
| 마일리지 EARN | (운임 - 사용분) × 적립률, customer_mileage INSERT (type=EARN) |
| 콜 → COMPLETED | calls.status, calls.ride_id 연결 |
| 잔액 정합성 | 시작잔액 - USE + EARN == 최종잔액 |
| 거래 기록 정합성 | EARN.balance_after == customers.mileage_balance |

### Phase 2 수동 검증이 검증하는 것

| 항목 | 자동으로 검증 불가능한 이유 |
|---|---|
| 실제 푸시가 폰/PC에 시각적으로 뜨는지 | 브라우저 알림 표시는 클라이언트 측 동작 |
| 알림 클릭 시 정확한 페이지로 이동하는지 | URL 라우팅은 SW + 브라우저 동작 |
| 알림 본문 텍스트가 사용자에게 잘 보이는지 | 가독성/UI 검증 |
| 폰 락 화면/방해금지 모드에서도 뜨는지 | OS 레벨 동작 |

---

## 🔄 재실행 가능

검증을 여러 번 반복해도 안전합니다:
- 매 실행마다 새 call_id/ride_id 생성
- 같은 태그를 가진 데이터는 cleanup으로 한꺼번에 정리됨
- 단, 매 검증마다 고객 잔액이 5,000원씩 차감되므로 cleanup 안 하면 잔액 부족할 수 있음

---

## 🆘 문제 발생 시

### Phase 1 검증이 중간에 실패한 경우
- 어느 STEP에서 실패했는지 출력 확인
- DB에 부분 데이터가 남았을 수 있음 → cleanup으로 정리 후 재시도
- 만약 cleanup도 잘 안 되면 `quick_check.sql` 로 데이터 확인 후 수동 정리

### cleanup이 실패한 경우
- 트랜잭션이라 자동 롤백됨 → 잔액 변동 없음
- 외래키 제약 등 문제일 수 있음 → 에러 메시지 보고 대응

### 푸시가 안 가는 경우 (Phase 2)
- `MANUAL_TEST_GUIDE.md` 의 트러블슈팅 섹션 참조
- 가장 흔한 원인: 알림 권한 미허용, push_subscriptions 0건

---

**작성**: 2026-04-29
**작성자**: Claude (스크립트) + Tomcat (실행/검증)
