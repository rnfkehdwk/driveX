# 양양대리(1012) 비밀번호 일괄 초기화 가이드

> **목적**: 회사 코드 1012(양양대리)에 등록된 모든 사용자(MASTER 제외 — 어차피 1012에는 없음, SUPER_ADMIN, RIDER)의 비밀번호를 `11223344`로 일괄 변경
> **작성일**: 2026-04-29
> **위험도**: 🔴 HIGH — 모든 사용자 비밀번호가 동일해지므로 작업 후 즉시 사용자에게 안내 필수

---

## ⚠️ 작업 전 반드시 확인

1. **이 작업을 정말 해야 하는지 재검토** — 보안상 위험할 수 있음
2. 1012 회사의 사용자는 약 30명+ (기사) + 1명(관리자 cblim) 정도
3. 작업 후 모든 사용자에게 "비밀번호가 11223344로 초기화되었습니다. 로그인 후 즉시 변경하세요" 안내 필요
4. **MASTER 계정은 영향 없음** (MASTER는 company_id가 NULL이라 1012 소속이 아님)

---

## 📋 왜 순수 SQL로는 안 되나?

bcrypt 해시는 **매번 다른 salt**가 들어가서 같은 비밀번호도 매번 다른 해시 값이 나옵니다:

```js
bcrypt.hash('11223344', 12)  // 호출마다 다른 결과
// → $2a$12$xK8vQ...   (1번째 호출)
// → $2a$12$Lp9wR...   (2번째 호출)
```

따라서:
- ❌ `UPDATE users SET password_hash = '고정된해시값' WHERE company_id = 3` → 모두 같은 해시 = 보안 취약
- ✅ Node.js로 사용자별로 다른 해시 생성 후 UPDATE → bcrypt 본래 의도대로 동작

---

## 🚀 실행 방법

### 1단계: 사전 확인 (DB 직접)

NAS SSH 접속 후:

```bash
# 변경 대상 사용자 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < \
  /volume1/docker/drivelog/server/db/bulk_password_reset/check_before.sql
```

→ 출력된 사용자 목록을 확인하고, 변경 대상이 맞는지 검토.

### 2단계: 1차 실행 (Dry-run, 사용자 목록만 표시)

```bash
sudo docker exec -i drivelog-api node /app/server/db/bulk_password_reset/run_yangyang_pw_reset.js
```

→ 회사 정보 + 사용자 목록을 출력한 후 다음 메시지로 멈춤:
```
⚠️ 위 N명의 비밀번호를 모두 "11223344"로 변경합니다.
   계속 진행하려면 환경변수 AUTO_CONFIRM=YES 를 붙여 다시 실행하세요.
```

### 3단계: 실제 실행 (확인 완료)

```bash
sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/server/db/bulk_password_reset/run_yangyang_pw_reset.js
```

→ 사용자별로 bcrypt 해시 생성 → UPDATE → password_history 기록 → audit_logs 기록 → 트랜잭션 커밋

### 4단계: 사후 검증

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < \
  /volume1/docker/drivelog/server/db/bulk_password_reset/check_after.sql
```

확인 포인트:
- `password_must_change = 0`
- `temp_password_expires_at = NULL`
- `login_fail_count = 0`
- `locked_until = NULL`
- `hash_prefix = '$2a$12$'` (또는 `$2b$12$`)
- `total_users == recent_history_count == audit_count` 일치

### 5단계: 동작 검증 (로그인 테스트)

테스트 계정 (cblim, rider_son 등)으로 로그인 시도:
- ID: 기존 그대로
- PW: `11223344`
→ 로그인 성공해야 함

---

## 🛠️ 스크립트 동작 상세

`run_yangyang_pw_reset.js`가 사용자별로 수행하는 작업:

```
1. bcrypt.hash('11223344', BCRYPT_ROUNDS) → 사용자별 고유 해시 생성
2. UPDATE users SET 
     password_hash = ?,
     password_must_change = FALSE,    -- 임시비번 플래그 해제
     temp_password_expires_at = NULL,  -- 임시비번 만료 해제
     login_fail_count = 0,             -- 실패 카운트 초기화
     locked_until = NULL               -- 잠금 해제
   WHERE user_id = ?
3. INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)
4. INSERT INTO audit_logs (action='BULK_PASSWORD_RESET', target_id=user_id, detail=...)
```

**전체가 트랜잭션으로 묶여 있음** (`beginTransaction` → `commit`). 한 건이라도 실패해도 성공한 건은 커밋됨 (부분 성공 허용 — 이 동작이 싫으면 스크립트 안의 주석 처리된 if 블록 활성화).

---

## 🚨 롤백 (되돌리기) 방법

비밀번호는 단방향 해시라 **이전 비밀번호로 자동 복구는 불가능**. 다만 다음과 같이 대응 가능:

### 옵션 1: password_history에서 직전 해시로 복구 (사용자별)

```sql
-- 특정 user_id의 직전 비밀번호로 복구
UPDATE users SET password_hash = (
  SELECT password_hash FROM password_history 
  WHERE user_id = 8 AND created_at < (
    SELECT MAX(created_at) FROM password_history WHERE user_id = 8
  )
  ORDER BY created_at DESC LIMIT 1
)
WHERE user_id = 8;
```

⚠️ 주의: 사용자가 그 직전 비번을 기억해야만 의미 있음. 개별 사용자 대응용.

### 옵션 2: 새 비밀번호로 다시 일괄 변경

스크립트의 `NEW_PASSWORD` 상수를 변경하고 다시 실행. 단순.

---

## 📂 파일 구성

```
C:\Drivelog\drivelog-admin\server\db\bulk_password_reset\
├── README.md                       ← 이 문서
├── run_yangyang_pw_reset.js        ← 메인 실행 스크립트 (Node.js)
├── check_before.sql                ← 사전 확인 쿼리
└── check_after.sql                 ← 사후 검증 쿼리
```

배포 후 NAS 경로:
```
/volume1/docker/drivelog/server/db/bulk_password_reset/
```

(이 폴더는 `deploy:server` 시 함께 배포됨 — server 디렉토리 아래에 있음)

---

## 🔄 배포 (스크립트를 NAS에 올리기)

```bash
cd /c/drivelog
npm run deploy:server
```

→ `drivelog-admin/server/` 전체가 NAS로 복사되며 새로 추가한 `db/bulk_password_reset/` 폴더도 포함됨.

배포 후 컨테이너 재시작이 필요한지? **불필요**. 이 스크립트는 별도로 `node ...`로 실행되므로 API 컨테이너 재시작과 무관. 단, `node_modules`(bcryptjs, mariadb 등)는 컨테이너 내부에 이미 있어야 함 — 일반적으로 이미 있음.

---

## ✅ 작업 후 즉시 해야 할 것

1. 모든 사용자에게 SMS/단톡방 등으로 안내:
   > 비밀번호가 임시로 11223344 로 초기화되었습니다.
   > 로그인 후 즉시 새 비밀번호로 변경해주세요.
2. 운영 모니터링: 다음 24시간 동안 로그인 실패 건수, 잠금 발생 등 audit_logs 모니터링
3. 일정 기간(예: 1주일) 후 변경 안 한 사용자에게 다시 안내 (또는 강제 임시비번 발급)

---

**작성**: 2026-04-29
**작업자**: Claude (스크립트 작성) + Tomcat (실행/검증)
