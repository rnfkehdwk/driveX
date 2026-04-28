# 4월 28일 재 마이그레이션 실행 가이드 (최종)

## 📋 개요

이전 4월 15일 마이그(2025-10-02 ~ 2026-04-20, 1,224건)을 전체 삭제하고 재 import.

| 소스 | 범위 | 건수 |
|---|---|---|
| 이전 v3 SQL의 No 1~1250 | 2025-10-02 ~ 2026-03-23 | 1,109건 |
| 새 엑셀의 No 1252~1429 | 2026-03-24 ~ 2026-04-28 | 177건 |
| **합계 운행** | 약 7개월치 | **1,286건** |

추가 처리:
- **고객 안전망 INSERT 274명** (DB에 없는 고객만 자동 INSERT — 사장님 미등록 고객 자동 보충)
- **274명 마일리지 잔액 SET** (고객시트 누적값 = source of truth)
- **이전 매칭 실패 59건 자동 해결** (안전망 덕에 이전 운행도 customer_id 정상 매칭)
- 예상 최종 잔액: **2,817,200원**

---

## 📂 파일 구성

| 파일 | 위치 | 크기 | 용도 |
|---|---|---|---|
| `migration_20260428_part1.sql` | `C:\Drivelog\drivelog-admin\server\db\` | ~108KB | cleanup + 고객 274명 안전망 INSERT |
| `migration_20260428_part2.sql` | NAS에서 sed로 만듦 | ~1MB | 이전 v3의 No 1~1250 부분 |
| `migration_20260428_part3.sql` | `C:\Drivelog\drivelog-admin\server\db\` | ~176KB | 새 운행 177건 + 잔액 재계산 + 잔액 SET + 검증 |

---

## 🚀 실행 절차

### Step 0. 사전 백업 (Windows에서)

이전 v3 SQL을 백업 폴더로 복사:

```bash
cd /c/Drivelog
cp drivelog-admin/server/db/migration_full_data_v3.sql \
   backup/20260428_remigration/migration_full_data_v3_BEFORE.sql

# 확인
ls -la backup/20260428_remigration/migration_full_data_v3_BEFORE.sql
# 약 1.3MB
```

### Step 1. SQL 파일 NAS에 업로드 (수동 scp)

`npm run deploy:server`는 컨테이너를 재시작해서 마이그 중 충돌 가능성이 있으므로 **수동 scp**가 더 안전:

```bash
cd /c/Drivelog

scp -O -P 30000 \
  drivelog-admin/server/db/migration_20260428_part1.sql \
  drivelog-admin/server/db/migration_20260428_part3.sql \
  rnfkehdwk@rnfkehdwk.synology.me:/volume1/docker/drivelog/server/db/
```

### Step 2. NAS SSH 접속 + Part 2 추출 + 실행

```bash
ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me
```

NAS에 들어간 후 — **아래 블록을 한 번에 붙여넣기**:

```bash
cd /volume1/docker/drivelog/server/db

# ===== Part 2 추출 (이전 v3 SQL의 No 1~1250 부분) =====
HEAD_END=$(grep -n "^-- No\.1:" migration_full_data_v3.sql | head -1 | cut -d: -f1)
TAIL_START=$(grep -n "^-- No\.1252:" migration_full_data_v3.sql | head -1 | cut -d: -f1)
TAIL_END=$((TAIL_START - 1))
echo "운행 시작 라인: $HEAD_END, 1252 직전 라인: $TAIL_END"

{
  echo "-- ============================================================"
  echo "-- DriveLog 4월 28일 재 마이그레이션 — Part 2/3"
  echo "-- 이전 v3 SQL의 No 1~1250 부분 (2025-10-02 ~ 2026-03-23)"
  echo "-- ============================================================"
  echo ""
  echo "SET @company_id = 3;"
  echo "SET @sa = (SELECT user_id FROM users WHERE login_id = 'cblim' LIMIT 1);"
  echo ""
  sed -n "${HEAD_END},${TAIL_END}p" migration_full_data_v3.sql
} > migration_20260428_part2.sql

# 검증: Part 2 운행 건수가 1,109건이어야 함
echo "Part 2 운행 INSERT 건수: $(grep -c '^INSERT INTO rides' migration_20260428_part2.sql)"

# Part 1, 3 존재 확인
ls -la migration_20260428_part*.sql
```

**예상 출력**:
```
운행 시작 라인: 14, 1252 직전 라인: 4458 (대략)
Part 2 운행 INSERT 건수: 1109
-rw-...  migration_20260428_part1.sql  (약 108KB)
-rw-...  migration_20260428_part2.sql  (약 1MB)
-rw-...  migration_20260428_part3.sql  (약 176KB)
```

### Step 3. 백엔드 일시 정지 + 마이그 실행

```bash
# 백엔드 잠시 멈춤 (락 충돌 방지)
cd /volume1/docker/drivelog
sudo /usr/local/bin/docker-compose stop api

cd server/db

# Part 1: cleanup + 고객 안전망 INSERT 274명 (5~10초)
echo "===== Part 1 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_20260428_part1.sql

# Part 2: 이전 운행 1~1250 (1~3분 소요)
echo "===== Part 2 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_20260428_part2.sql

# Part 3: 새 운행 177건 + 잔액 재계산 + 잔액 SET + 검증 (10~30초)
echo "===== Part 3 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_20260428_part3.sql

# 백엔드 재기동
cd /volume1/docker/drivelog
sudo /usr/local/bin/docker-compose start api
```

Part 3 마지막에 검증 SELECT가 자동 실행되어 결과가 출력됩니다.

---

## ✅ 성공 판정

Part 3 마지막 SELECT 출력이 다음과 같으면 성공:

```
+------------------------------------------+------+
| item                                     | cnt  |
+------------------------------------------+------+
| 운행 건수                                | 1286 |
| 마일리지 거래 건수                       | ~1226|
| 마일리지 보유 고객(잔액>0)               | ~273 |
| 총 마일리지 잔액: 2,817,200원            | ~280 |
| 미매칭 운행 (customer_id NULL ...)       | 0~10 |
+------------------------------------------+------+
```

**핵심 체크포인트**:
- ✅ **운행 건수 1286** (1,109 + 177)
- ✅ **총 마일리지 잔액 2,817,200원** (가장 중요!)
- ✅ **미매칭 운행 0건에 가까움** (안전망 덕에 이전 매칭 실패 59건이 0~10건 수준으로 줄어야 함)

---

## 🧪 추가 검증 (선택)

### 1. 사장님이 예시로 든 고객 잔액 확인

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT name, customer_code, mileage_balance 
FROM customers 
WHERE company_id=3 AND name IN ('심미투싼','상광정9702','태산3801','박근종','병훈')
ORDER BY name;
SQL
```

### 2. 안전망이 새로 INSERT한 고객 확인 (created_at이 오늘인 것)

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT name, customer_code, mileage_balance, created_at
FROM customers 
WHERE company_id=3 AND DATE(created_at) = CURDATE()
ORDER BY created_at;
SQL
```

### 3. 운행 건수 일/월별 검증

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT 
  DATE_FORMAT(started_at, '%Y-%m') AS month, 
  COUNT(*) AS rides,
  SUM(total_fare) AS total_fare,
  SUM(mileage_used) AS mileage_used,
  SUM(mileage_earned) AS mileage_earned
FROM rides 
WHERE company_id=3 
GROUP BY month 
ORDER BY month;
SQL
```

---

## 🛡 롤백 (만약 잘못되면)

이전 v3 SQL을 다시 실행해서 4/15 시점으로 복구:

```bash
cd /volume1/docker/drivelog/server/db

sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
DELETE FROM customer_mileage WHERE company_id = 3;
DELETE FROM settlement_rides WHERE ride_id IN (SELECT ride_id FROM rides WHERE company_id = 3);
DELETE FROM rides WHERE company_id = 3;
UPDATE customers SET mileage_balance = 0 WHERE company_id = 3;
SQL

sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_full_data_v3.sql
```

---

## ⚠️ 주의사항

- **Part 1 → 2 → 3 순서 엄수**. Part 1 안전망이 먼저 들어가야 Part 2의 이전 운행이 정상 매칭됨.
- **중복 실행 금지**. Part 1의 cleanup 덕분에 재실행해도 데이터 중복은 안 나지만 시간만 소요됨.
- **하이팰콜로라도 잔액 -500원**은 GREATEST(0) + 잔액 SET 단계에서 자동으로 0으로 보정됨.
- **마일리지 잔액은 고객시트가 진실의 원천**. 운행 INSERT 시 자동 계산된 잔액은 무시되고, Part 3 마지막의 잔액 SET이 최종값.

---

**작성**: 2026-04-28
