# DriveLog DB 복원 가이드

> 작성: 2026-04-10
> 목적: 백업 파일로부터 DB를 복원하는 절차
> ⚠️ **이 문서는 비상 상황용입니다. 실수로 실행하면 운영 데이터가 덮어씌워집니다.**

---

## 🚨 복원이 필요한 상황

1. 마이그레이션 실패로 데이터 손상
2. 사용자 실수로 데이터 삭제 (예: 잘못된 DELETE)
3. 디스크 손상 또는 NAS 사고
4. 컨테이너 손상으로 DB 접근 불가
5. 암호화 작업 실패로 롤백 필요

---

## 📋 복원 전 체크리스트 (반드시!)

- [ ] **현재 상태를 한 번 더 백업** (잘못 복원할 수도 있으므로)
- [ ] **사장님(임창빈)에게 알림** — 복원 중에는 서비스 중단됨
- [ ] **복원할 백업 파일 무결성 확인** (gzip 검증)
- [ ] **복원 시점 결정** — "어느 백업으로 돌아갈 것인가"
- [ ] **복원 후 검증 계획** — 어떤 데이터로 정상 여부 확인할지

---

## 1. 복원할 백업 파일 선택

```bash
# NAS SSH 접속
ssh rnfkehdwk@rnfkehdwk.synology.me -p 30000

# 사용 가능한 백업 목록
ls -lhS /volume1/backup/drivelog/*.sql.gz

# 가장 최근 것
ls -lht /volume1/backup/drivelog/*.sql.gz | head -10
```

복원할 파일을 변수에 저장:
```bash
RESTORE_FILE="/volume1/backup/drivelog/drivelog_db_20260410_030000.sql.gz"
ls -lh "$RESTORE_FILE"
```

---

## 2. 복원 전 현재 상태 백업

복원이 잘못될 수 있으므로 **지금 상태를 먼저 백업**:

```bash
NOW=$(date +%Y%m%d_%H%M%S)
sudo docker exec drivelog-db mariadb-dump \
  -uroot -p'Drivelog12!@' \
  --single-transaction \
  --routines \
  --triggers \
  drivelog_db | gzip > /volume1/backup/drivelog/drivelog_db_BEFORE_RESTORE_${NOW}.sql.gz

ls -lh /volume1/backup/drivelog/drivelog_db_BEFORE_RESTORE_${NOW}.sql.gz
```

이 파일이 있으면 복원이 잘못돼도 다시 돌아갈 수 있습니다.

---

## 3. 백업 파일 무결성 검증

압축 파일이 깨졌는지 확인:

```bash
# gzip 무결성 체크
gzip -t "$RESTORE_FILE"
echo "exit code: $?"  # 0이면 OK

# 압축 풀었을 때 마지막 줄에 "Dump completed" 있는지
zcat "$RESTORE_FILE" | tail -3
```

`-- Dump completed on YYYY-MM-DD HH:MM:SS` 같은 줄이 보이면 정상.

---

## 4. 백엔드 컨테이너 정지 (필수)

복원 중에 백엔드가 DB에 쓰면 충돌. 반드시 정지:

```bash
cd /volume1/docker/drivelog
sudo docker-compose stop api

# 확인
sudo docker ps | grep drivelog
# drivelog-db만 보이고 drivelog-api는 보이지 않아야 함
```

---

## 5. 기존 DB 백업 (안전망 1단계)

복원 전에 DB 자체 파일을 OS 레벨에서 백업:

```bash
NOW=$(date +%Y%m%d_%H%M%S)
sudo cp -a /volume1/docker/drivelog/db /volume1/docker/drivelog/db.before_restore_${NOW}
ls -ld /volume1/docker/drivelog/db*
```

이건 sql 백업과 별개로, 컨테이너 안의 DB 파일 자체를 통째로 보존하는 것입니다. 모든 게 잘못됐을 때 마지막 안전망.

---

## 6. 복원 실행

### 6.1 방법 A: drop + recreate (완전 깨끗한 복원, 권장)

```bash
# DB 완전 삭제 후 재생성
sudo docker exec drivelog-db mariadb -uroot -p'Drivelog12!@' -e "
DROP DATABASE IF EXISTS drivelog_db;
CREATE DATABASE drivelog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

# 복원 파일을 컨테이너에 import
zcat "$RESTORE_FILE" | sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db

echo "복원 종료: exit code $?"
```

### 6.2 방법 B: 기존 DB 그대로 두고 덮어쓰기 (테이블 단위 보존)

```bash
# 위와 동일하지만 DROP DATABASE 안 함
zcat "$RESTORE_FILE" | sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db
```

⚠️ 주의: 백업 파일에 `DROP TABLE IF EXISTS` 가 포함되어 있어 어차피 테이블은 다 새로 만들어집니다. 단지 다른 DB나 다른 테이블이 있다면 그건 보존됩니다.

→ **방법 A를 권장**합니다. 더 깨끗하고 부작용 적음.

---

## 7. 복원 검증

### 7.1 기본 데이터 확인

```bash
sudo docker exec drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
-- 테이블 개수
SELECT COUNT(*) AS table_count FROM information_schema.tables 
WHERE table_schema = 'drivelog_db';

-- 핵심 테이블 건수
SELECT 'companies' AS tbl, COUNT(*) FROM companies
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'rides', COUNT(*) FROM rides
UNION ALL SELECT 'customer_mileage', COUNT(*) FROM customer_mileage
UNION ALL SELECT 'partner_companies', COUNT(*) FROM partner_companies;

-- 양양대리 (company_id=3) 핵심 데이터
SELECT 
  (SELECT COUNT(*) FROM users WHERE company_id=3 AND status='ACTIVE') AS active_users,
  (SELECT COUNT(*) FROM customers WHERE company_id=3 AND status='ACTIVE') AS active_customers,
  (SELECT SUM(mileage_balance) FROM customers WHERE company_id=3) AS total_mileage,
  (SELECT COUNT(*) FROM rides WHERE company_id=3) AS total_rides;
SQL
```

복원 전 알고 있던 숫자와 일치하는지 확인:
- 활성 고객: 약 239명
- 마일리지 보유 고객: 약 232명
- 마일리지 총액: 약 1,509,000원

### 7.2 백엔드 재시작

```bash
cd /volume1/docker/drivelog
sudo docker-compose up -d api

# 5초 기다리고 health check
sleep 5
curl -k https://192.168.0.2:8443/api/health
```

`{"status":"ok","version":"v2.6"}` 같은 응답이 오면 OK.

### 7.3 브라우저 검증

1. https://rnfkehdwk.synology.me:38443/admin/ 접속
2. 사장님 계정(`cblim/11223344`)으로 로그인
3. 대시보드의 "활성 고객", "이번 달 운행" 등 숫자 확인
4. 고객 목록 → 검색 1~2건
5. 운행 일지 → 최근 운행 확인

---

## 8. 복원 후 정리

### 8.1 임시 백업 파일 삭제 (또는 보관)

```bash
# 복원 직전에 만든 백업
ls -lh /volume1/backup/drivelog/drivelog_db_BEFORE_RESTORE_*.sql.gz

# 며칠 동안 보관 후 안전 확인되면 삭제
# rm /volume1/backup/drivelog/drivelog_db_BEFORE_RESTORE_*.sql.gz
```

### 8.2 DB 디렉토리 백업도 정리

```bash
ls -ld /volume1/docker/drivelog/db.before_restore_*

# 1주일 안전 운영 확인 후
# sudo rm -rf /volume1/docker/drivelog/db.before_restore_*
```

### 8.3 사장님에게 복원 완료 알림

```
"복원 완료. 활성 고객 239명, 마일리지 잔액 약 150만원 정상 확인. 
서비스 다시 사용 가능합니다. 
[복원 시점] 백업으로 돌아갔으므로 [복원 시점] 이후의 데이터는 사라졌습니다."
```

---

## ⚠️ 복원 실패 시 롤백 절차

복원이 잘못되면 **3단계로 후퇴 가능**:

### 후퇴 1단계: 복원 직전 백업 파일로 다시 복원
```bash
# 5번에서 만든 BEFORE_RESTORE 파일로 복원
zcat /volume1/backup/drivelog/drivelog_db_BEFORE_RESTORE_*.sql.gz \
  | sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db
```

### 후퇴 2단계: DB 디렉토리 통째 복원
```bash
sudo docker-compose stop
sudo rm -rf /volume1/docker/drivelog/db
sudo cp -a /volume1/docker/drivelog/db.before_restore_* /volume1/docker/drivelog/db
sudo docker-compose up -d
```

### 후퇴 3단계: 다른 백업 파일로 복원
다른 날짜의 백업 파일로 5번부터 다시.

---

## 📋 복원 체크리스트 (인쇄해서 옆에 두세요)

```
[ ] 사장님께 서비스 중단 알림
[ ] 복원할 백업 파일 결정 + 무결성 검증
[ ] 현재 상태 백업 (BEFORE_RESTORE)
[ ] DB 디렉토리 백업 (db.before_restore_*)
[ ] 백엔드 정지 (docker-compose stop api)
[ ] DROP + CREATE DATABASE
[ ] 복원 파일 import (zcat | mariadb)
[ ] 데이터 건수 검증
[ ] 백엔드 재시작 (docker-compose up -d api)
[ ] /api/health 응답 확인
[ ] 브라우저에서 로그인 + 핵심 데이터 확인
[ ] 사장님께 복원 완료 알림
[ ] 임시 파일 정리 (1주일 후)
```

---

## 💡 평소 연습 권장

복원은 **실제로 한 번도 안 해본 사람이 비상 시에 잘 못 합니다**. 
한가한 시간에 한 번 모의 복원을 해보세요:

1. **별도 테스트 컨테이너**에 백업 파일 import
2. 데이터 건수만 확인하고 컨테이너 삭제
3. "복원이 가능하구나" 체감

이걸 한 번이라도 해보면 실제 비상 시 마음이 한결 편합니다.

---

## 🔗 관련 문서

- `PHASE0_FIRST_BACKUP.md` — 첫 풀백업
- `PHASE0_AUTO_BACKUP_SETUP.md` — 자동 백업 설치
- `drivelog_backup.sh` — 자동 백업 스크립트
