# Phase 2 — 수동 검증 가이드

> Phase 1 자동 검증이 통과한 후 진행. **실제 PC/폰에서 푸시 알림이 정말 뜨는지** 확인합니다.

---

## 🎯 준비물

- **PC (브라우저)**: SA 계정용 — 크롬/엣지 권장 (사장님 시점)
- **폰 (브라우저)** 또는 **PC 시크릿창**: RIDER 계정용 (기사 시점)
- 두 기기 모두 **알림 권한 허용** 필수

테스트 계정 (양양대리 1012):
| 역할 | 회사코드 | ID | PW |
|---|---|---|---|
| SA | 1012 | cblim | 11223344 |
| RIDER | 1012 | rider_손영만 (또는 다른 RIDER) | 11223344 |

---

## 📱 사전 셋업 (각 기기 별로 1번만)

### 1. 양 기기에서 로그인

**PC (SA)**: `https://rnfkehdwk.synology.me:38443/admin/`
**폰 (RIDER)**: `https://rnfkehdwk.synology.me:38443/m/`

### 2. 알림 권한 허용

각 페이지에서 처음 로그인 시 브라우저가 "알림 허용" 다이얼로그를 띄움. **허용** 선택.

이후 브라우저 주소창 좌측 자물쇠 → 사이트 권한 → 알림이 "허용"인지 확인.

### 3. 푸시 구독 확인 (선택)

각 사용자가 알림을 허용했는지 DB로 확인:
```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT u.login_id, u.name, u.role, COUNT(ps.id) AS sub_count
FROM users u
LEFT JOIN push_subscriptions ps ON ps.user_id = u.user_id
WHERE u.company_id = 3 AND u.status = 'ACTIVE'
GROUP BY u.user_id
ORDER BY u.role, u.login_id;
SQL
```

`sub_count`가 0이면 알림 허용 안 한 것 — 해당 기기에서 페이지 새로고침 후 알림 허용.

### 4. 본인 기기에 테스트 푸시

각 기기에서 브라우저 콘솔 열고 (F12 → Console):
```js
fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }})
  .then(r => r.json()).then(console.log)
```
→ "🔔 DriveLog 테스트 알림" 알림이 뜨면 OK.

---

## ✅ 시나리오 1: SA 콜 생성 → RIDER 알림 수신

| # | 작업 (PC, SA) | 작업 (폰, RIDER) | 기대 결과 |
|---|---|---|---|
| 1 | 콜 관리 페이지 진입 | 콜 목록 페이지 열어둠 | - |
| 2 | "+ 콜 추가" → 출발지/도착지/요금 입력 → 저장 | (대기) | RIDER 폰에 푸시 알림 도착: "🚗 새 콜 도착" |
| 3 | (대기) | 폰 알림 클릭 또는 콜 목록 새로고침 | 새 콜이 목록에 보임 (WAITING) |

**검증 포인트:**
- [ ] RIDER 폰에 알림이 시각적으로 뜸 (소리/진동도)
- [ ] 알림 본문에 출발지/도착지/요금 표시
- [ ] 알림 클릭 시 `/m/calls`로 이동
- [ ] PC에서는 본인 콜이라 알림 안 뜸 (정상)

---

## ✅ 시나리오 2: RIDER 콜 수락 → SA 알림 수신

| # | 작업 (폰, RIDER) | 작업 (PC, SA) | 기대 결과 |
|---|---|---|---|
| 1 | 시나리오 1에서 만든 콜의 "수락" 버튼 누름 | (대기) | 콜이 ASSIGNED 상태로 변경 |
| 2 | (대기) | 콜 목록 페이지 열어둠 | PC에 푸시 알림 도착: "✅ {RIDER이름} 기사가 콜 수락" |
| 3 | (대기) | 알림 확인 후 목록 새로고침 | 해당 콜의 상태가 ASSIGNED + 기사명 표시 |

**검증 포인트:**
- [ ] PC(SA)에 알림이 시각적으로 뜸
- [ ] 알림 본문에 기사 이름 + 주소 표시
- [ ] RIDER 본인 폰에는 자기 알림이 안 뜸 (`excludeUserId` 정상)
- [ ] 다른 RIDER가 있다면 다른 RIDER에게도 안 뜸 (RIDER 제외)

---

## ✅ 시나리오 3: 운행일지 작성 (콜 → 운행)

| # | 작업 (폰, RIDER) | 기대 결과 |
|---|---|---|
| 1 | ASSIGNED 콜 카드 → "운행 작성" 진입 | 운행기록 작성 페이지, 출발지/도착지/요금/고객 자동 입력 |
| 2 | (출발/도착 버튼 안 눌러도 됨) | started_at 자동 채워짐 (4-29 픽스) |
| 3 | "마일리지 사용" — 5,000원 칩 선택 | 마일리지 차감 표시 |
| 4 | "저장하기" 클릭 | 운행 저장 + 콜 자동 완료 처리 |

**검증 포인트:**
- [ ] 콜에서 진입 시 모든 필드 자동 입력됨
- [ ] 출발/도착 버튼 안 눌러도 저장 가능 (started_at 자동)
- [ ] 마일리지 잔액이 즉시 줄어든 게 보임
- [ ] 저장 후 콜이 COMPLETED 상태로 바뀜
- [ ] 운행일지에서 해당 운행 조회 가능

---

## ✅ 시나리오 4: 마일리지 적립 정상 동작

위 운행이 저장된 직후 SA(PC)에서:

1. 마일리지 페이지 → "고객별" 탭 → 해당 고객 검색
2. 거래 이력 펼치기

**검증 포인트:**
- [ ] USE 거래 1건 (운행 결제 시 사용, 5,000원)
- [ ] EARN 거래 1건 (운행 마일리지 적립, 2,000원 — `(25000-5000)×10%`)
- [ ] 잔액 변동: `시작잔액 - 5000 + 2000 = 시작잔액 - 3000`
- [ ] 두 거래 모두 동일 ride_id에 묶임

---

## 🚨 트러블슈팅

### 푸시 알림이 안 뜨는 경우

1. **알림 권한 확인**: 브라우저 자물쇠 → 알림 "허용"
2. **OS 알림 설정 확인**: 윈도우/안드로이드/iOS의 브라우저 앱 알림 허용
3. **HTTPS 확인**: Web Push는 HTTPS 필수 (현재 38443 포트는 HTTPS)
4. **포커스 모드/방해금지 모드 끄기**
5. **DB 구독 확인**:
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = (SELECT user_id FROM users WHERE login_id = 'cblim');
   ```
   → 0건이면 알림 권한 허용 안 됨. 페이지 새로고침 후 다시 허용.

### "이미 다른 기사가 수락한 콜입니다" 에러

→ 정상 동작. 동시성 제어가 잘 되고 있음.

### 운행 저장 시 "출발 시간은 필수" 에러

→ 콜에서 진입한 게 아니라 직접 운행 작성 진입한 경우. 콜 페이지에서 "운행 작성" 버튼으로 진입해야 함.

---

## ✅ 체크리스트 완료 후

모든 시나리오 통과하면 → **Phase 3 데이터 정리**로 진행:

```bash
# 1. 정리 대상 미리 확인 (dry-run)
sudo docker exec -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js

# 2. 실제 정리
sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
```

---

**작성**: 2026-04-29
