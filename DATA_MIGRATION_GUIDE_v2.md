# DriveLog 데이터 마이그레이션 가이드 v2 (2026-04-28 기준)

> **이 문서의 목적**: 양양대리(또는 다른 회사) 데이터 마이그레이션 시 그대로 따라할 수 있는 실전 가이드.
> **이전 문서**: `DATA_MIGRATION_GUIDE.md` (2026-04-15 첫 마이그 기준 — 호환됨)
> **이번 마이그 결과**: 운행 1,258건, 고객 278명, 마일리지 잔액 2,821,200원, 미매칭 14건

---

## 📋 마이그레이션 입력 데이터 요구사항

엑셀 파일 1개에 **2개 시트** 필수:

### 시트 1: "운행일지 데이터" (18컬럼)

| 컬럼 | 필수 | 설명 |
|---|---|---|
| No | ✅ | 운행 번호 (정수, 중복 불가) |
| 년월일 | ✅ | `26년 3월 24일 화` 형식 |
| 인입시간 | ⚪ | `오후 9:00:00` 형식, 없으면 21:00:00 기본값 |
| 고객 | ⚪ | 고객명 (DB의 customers.name과 매칭) |
| 이용금액 | ⚪ | 총 운임 (NaN/0이면 가비지 운행) |
| 현금결제 | ⚪ | 현금 받은 금액 |
| mileage결제 | ⚪ | 마일리지로 사용한 금액 (USE) |
| mileage발생 | ⚪ | 적립할 마일리지 (EARN) |
| 시작위치 / 최종목적지 | ⚪ | 출발지/도착지 |
| 운전기사 / 픽업기사 | ⚪ | 약어 가능 (`범`→`권경범` 등) |
| 연결업체 | ⚪ | 제휴업체 LIKE 매칭 |
| 메모 | ⚪ | rider_memo |

### 시트 2: "고객 데이터" (5컬럼)

| 컬럼 | 설명 |
|---|---|
| 고객코드 | 고객명 (운행시트의 '고객'과 동일, **DB customers.name과 매칭**) |
| 이용금액의 SUM | 누적 매출 |
| 현금결제의 SUM | 누적 현금 |
| mileage발생의 SUM | **누적 적립 마일리지** |
| mileage결제의 SUM | **누적 사용 마일리지** |

> ⚠️ **고객코드 = DB의 customers.name** 필드와 매칭 (customer_code 아님!)
> 그리고 **마일리지 잔액 = 발생 - 사용** (음수면 0으로 보정)

---

## 🏗 마이그레이션 아키텍처 (3-Part 분할)

```
Part 1: cleanup + 고객 안전망 INSERT
  └─ 기존 운행/마일리지 DELETE
  └─ 고객시트 N명 NOT EXISTS INSERT (DB에 없는 고객만 자동 등록)
  
Part 2: 이전 운행 (NAS에서 sed로 추출)
  └─ 이전 마이그 SQL의 No 1~(중복 시작 직전) 부분
  └─ 이번 데이터와 겹치지 않는 옛날 운행만 보존

Part 3: 새 운행 INSERT + 잔액 처리
  └─ 새 엑셀의 운행 INSERT
  └─ customer_mileage.balance_after 재계산
  └─ customers.mileage_balance를 고객시트 누적값으로 SET (source of truth)
  └─ 검증 SELECT
```

### 왜 Part로 나누는가
- 토큰 비용 / 파일 크기 제약: 1.4MB SQL을 한 번에 보내기 어려움
- **Part 1 안전망**이 Part 2 실행 전에 들어가야 이전 운행도 customer_id 정상 매칭됨
- 단계별 검증 가능 (각 Part 후 카운트 확인)

---

## 🚀 실행 절차 (전체 워크플로우)

### Phase 1: 빌드 (Windows / Git Bash)

#### 1-1. 작업 폴더 준비

```bash
# 백업 폴더 생성
mkdir -p /c/Drivelog/backup/20YYMMDD_remigration
cd /c/Drivelog/backup/20YYMMDD_remigration

# 엑셀 파일 복사
cp /c/path/to/데이터_마이그레이션N.xlsx ./
```

#### 1-2. 빌드 스크립트 복사 + 실행

`build_part1.js`와 `build_part3.js`를 backup 폴더로 복사 (이전 작업의 것 재활용).

```bash
# xlsx 라이브러리 설치 (첫 1회만)
npm install xlsx

# Part 1: cleanup + 고객 안전망 INSERT
node build_part1.js
# 출력: C:\Drivelog\drivelog-admin\server\db\migration_YYYYMMDD_part1.sql

# Part 3: 새 운행 INSERT + 잔액 SET
node build_part3.js
# 출력: C:\Drivelog\drivelog-admin\server\db\migration_YYYYMMDD_part3.sql
```

⚠️ **주의**: 두 스크립트의 다음 부분을 마이그 일자에 맞춰 수정 필요:
- 엑셀 파일명 (`데이터_마이그레이션N.xlsx`)
- 출력 파일명 (`migration_YYYYMMDD_partX.sql`)

#### 1-3. 사전 백업

```bash
cd /c/Drivelog
cp drivelog-admin/server/db/migration_full_data_v3.sql \
   backup/20YYMMDD_remigration/migration_full_data_v3_BEFORE.sql
```

---

### Phase 2: 업로드 (Windows / Git Bash)

```bash
cd /c/Drivelog

# Part 1, 3만 NAS로 (Part 2는 NAS에서 sed로 만듦)
scp -O -P 30000 \
  drivelog-admin/server/db/migration_YYYYMMDD_part1.sql \
  drivelog-admin/server/db/migration_YYYYMMDD_part3.sql \
  rnfkehdwk@rnfkehdwk.synology.me:/volume1/docker/drivelog/server/db/
```

---

### Phase 3: NAS 실행

#### 3-1. NAS SSH 접속

```bash
ssh -p 30000 rnfkehdwk@rnfkehdwk.synology.me
```

#### 3-2. customer_code 형식 사전 검증 (⭐ 매우 중요)

**이전 마이그에서 발견된 함정**: `1012-001` 같은 비표준 형식이 섞여있으면 Part 1의 `SUBSTRING_INDEX(customer_code,'-C',-1)` 캐스팅이 실패함.

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT 
  CASE 
    WHEN customer_code LIKE '%-C%' THEN '1012-Cxxxx 형식 (정상)'
    ELSE '비정상 형식 (수정 필요!)'
  END AS pattern,
  COUNT(*) AS cnt,
  MIN(customer_code) AS sample_min,
  MAX(customer_code) AS sample_max
FROM customers WHERE company_id=3
GROUP BY pattern;
SQL
```

**비정상 형식이 있으면 사전 보정 SQL 실행**:

```bash
# 1) 비정상 customer_code 가진 고객 확인
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
SELECT customer_id, name, customer_code, created_at 
FROM customers 
WHERE company_id=3 AND customer_code NOT LIKE '%-C%'
ORDER BY customer_id;
SQL

# 2) 테스트 고객은 삭제 + 진짜 고객은 customer_code만 정상 형식으로 변경
# (수동 식별 후 진행 — UPDATE customers SET customer_code = '1012-CNNNN' WHERE customer_id = ...)
```

#### 3-3. Part 2 추출 (NAS sed)

```bash
cd /volume1/docker/drivelog/server/db

# 라인 번호 찾기 (이전 v3 SQL에서 새 데이터 시작 No 직전까지)
HEAD_END=$(grep -n "^-- No\.1:" migration_full_data_v3.sql | head -1 | cut -d: -f1)
TAIL_START=$(grep -n "^-- No\.NNNN:" migration_full_data_v3.sql | head -1 | cut -d: -f1)
TAIL_END=$((TAIL_START - 1))
echo "운행 시작 라인: $HEAD_END"
echo "NNNN 직전 라인: $TAIL_END"

# Part 2 작성
{
  echo "-- DriveLog YYYY-MM-DD 재 마이그레이션 — Part 2/3"
  echo "-- 이전 v3 SQL의 No 1~(NNNN-1) 부분"
  echo ""
  echo "SET @company_id = 3;"
  echo "SET @sa = (SELECT user_id FROM users WHERE login_id = 'cblim' LIMIT 1);"
  echo ""
  sed -n "${HEAD_END},${TAIL_END}p" migration_full_data_v3.sql
} > migration_YYYYMMDD_part2.sql

# 검증
echo "Part 2 운행 INSERT 건수: $(grep -c '^INSERT INTO rides' migration_YYYYMMDD_part2.sql)"
ls -la migration_YYYYMMDD_part*.sql
```

> 💡 `NNNN` = 새 엑셀의 No 시작값. 예) 새 엑셀이 No 1252부터 시작하면 → `^-- No\.1252:` 검색

#### 3-4. 실제 마이그 실행

```bash
# 백엔드 일시 정지
cd /volume1/docker/drivelog
sudo /usr/local/bin/docker-compose stop api

cd server/db

# Part 1 (5~10초)
echo "===== Part 1 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_YYYYMMDD_part1.sql

# Part 2 (가장 오래 걸림, 1,000건당 ~50초)
echo "===== Part 2 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_YYYYMMDD_part2.sql

# Part 3 (10~30초)
echo "===== Part 3 실행 ====="
time sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < migration_YYYYMMDD_part3.sql

# 백엔드 재기동
cd /volume1/docker/drivelog
sudo /usr/local/bin/docker-compose start api
```

#### 3-5. 가비지 운행 삭제 (선택, 권장)

새 엑셀에는 보통 "이용금액 NaN" 빈 row가 섞여있어 customer_id NULL + 모든 금액 0인 가비지 운행이 INSERT됨. 정리:

```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db <<'SQL'
-- 가비지 운행 삭제 (customer_id NULL + 주소 NULL + 모든 금액 0)
DELETE FROM rides 
WHERE company_id = 3 
  AND customer_id IS NULL 
  AND total_fare = 0
  AND (mileage_earned IS NULL OR mileage_earned = 0)
  AND (mileage_used IS NULL OR mileage_used = 0)
  AND start_address IS NULL
  AND end_address IS NULL;

SELECT ROW_COUNT() AS deleted_garbage;
SQL
```

---

## ✅ 성공 판정 기준

Part 3 마지막 SELECT 결과가 다음과 같으면 성공:

```
+------------------------------------------+------+
| item                                     | cnt  |
+------------------------------------------+------+
| 운행 건수                                | NNNN |  (이전 + 신규 합산)
| 마일리지 거래 건수                       | ~    |
| 마일리지 보유 고객(잔액>0)               | ~    |
| 총 마일리지 잔액: M,MMM,MMM원            | NN   |  ⭐ 핵심
| 미매칭 운행 (customer_id NULL ...)       | < 50 |  안전망 잘 작동했으면 작은 수
+------------------------------------------+------+
```

**핵심 체크포인트**:
- ✅ **총 마일리지 잔액 = 고객시트 발생SUM - 사용SUM** (음수 보정 후)
- ✅ **운행 건수 = 이전(Part 2) + 신규(Part 3) - 가비지**
- ✅ **미매칭 운행이 작아야 함** (안전망이 효과적)

---

## 🛡 롤백 (잘못됐을 때)

이전 v3 SQL로 4/15 시점 복구:

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

## 🐛 이번 작업(2026-04-28)에서 만난 함정 5가지

### 1. customer_code 형식 불일치 → SUBSTRING_INDEX 실패
**증상**: `ERROR 1292: Truncated incorrect INTEGER value: '1012-001'`
**원인**: 모바일 등록 코드 또는 옛날 시드 데이터로 `1012-001` 같은 비표준 형식이 섞여있음.
**해결**: 사전 검증 → 비정상 형식 보정 → Part 1 SQL의 INSERT 로직에 `WHERE customer_code LIKE '%-C%'` 필터 추가하고 `CAST(... AS UNSIGNED)`로 명시적 정수화.

### 2. CONCAT + LPAD 결과에 점(`.`) 붙음
**증상**: `1012-C238.` 같은 이상한 코드 생성
**원인**: MariaDB 변수 + 산술이 DECIMAL/FLOAT로 처리되면서 `238.0000`이 됨
**해결**: 명시적 `CAST(... AS UNSIGNED)` + 직접 SET으로 보정.

### 3. Python 미설치
**증상**: `python --version` → `Python` (Microsoft Store 스텁)
**해결**: Node.js 빌더로 변경 (DriveLog 프로젝트는 Node 기반이라 100% 깔려있음).

### 4. 큰 SQL 파일 직접 write 불가
**증상**: 1.4MB SQL을 filesystem MCP로 한 번에 못 보냄
**해결**: 빌드 스크립트(`build_partN.js`)를 사용자 PC에 두고 한 번 실행하면 SQL 파일 자동 생성.

### 5. 새 엑셀에 가비지 row 섞임
**증상**: 마이그 후 customer_id NULL + 모든 금액 0인 운행 28건 발견
**원인**: 엑셀에 "이용금액 NaN" 빈 row가 33개 있었고 일부가 그대로 INSERT됨
**해결**: 마이그 후 별도 DELETE 쿼리로 정리 (위 3-5 단계).

---

## 📊 2026-04-28 마이그레이션 결과

| 항목 | 이전 (4/15) | 현재 (4/28) | 변화 |
|---|---|---|---|
| 운행 건수 | 1,224건 | **1,258건** | +34 (+62 신규 - 28 가비지) |
| 마일리지 보유 고객 | 231명 | **271명** | +40명 |
| 총 마일리지 잔액 | 2,609,200원 | **2,821,200원** | +212,000원 |
| 미매칭 운행 | 59건 | **14건** | **-45건 (76% 해결)** |
| 고객 총 수 | 245명 | **278명** | +33명 |

**해결된 매칭 실패**:
- 안전망 INSERT가 274명 중 39명을 신규 등록 → 이전 매칭 실패 케이스 대다수가 자동 해결
- 사장님이 모바일로 등록한 심미투싼 등은 NOT EXISTS로 스킵 (중복 방지)

**잔여 14건**: 옛날(2025-10~2026-02) 운행 중 고객명 없이 입력된 케이스. 운영 영향 없음, 그대로 유지.

---

## 🔧 핵심 SQL 패턴 (재사용용)

### 안전망 고객 INSERT (NOT EXISTS)

```sql
INSERT INTO customers(company_id, name, customer_code, mileage_balance, created_at, updated_at) 
SELECT @company_id, '고객명', 
  CONCAT('1012-C', LPAD(
    CAST(
      (SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(customer_code,'-C',-1) AS UNSIGNED)), 0) 
       FROM customers cu 
       WHERE cu.company_id=@company_id AND cu.customer_code LIKE '%-C%')
    + 1 AS UNSIGNED),
    4, '0')),
  0, NOW(), NOW() 
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name='고객명' AND company_id=@company_id);
```

### balance_after 재계산 (시간순 누적)

```sql
UPDATE customer_mileage cm
INNER JOIN (
  SELECT mileage_id,
    @bal := IF(@pc = customer_id,
      @bal + IF(type IN('EARN','ADJUST'), amount, -amount),
      IF(type IN('EARN','ADJUST'), amount, -amount)
    ) AS cb,
    @pc := customer_id AS _p
  FROM customer_mileage, (SELECT @bal := 0, @pc := 0) v
  WHERE company_id = @company_id 
  ORDER BY customer_id, created_at, mileage_id
) c ON cm.mileage_id = c.mileage_id 
SET cm.balance_after = GREATEST(c.cb, 0);
```

### 잔액 직접 SET (고객시트 누적값 = source of truth)

```sql
UPDATE customers SET mileage_balance=N WHERE name='고객명' AND company_id=@company_id;
```

### 가비지 운행 삭제

```sql
DELETE FROM rides 
WHERE company_id = 3 
  AND customer_id IS NULL 
  AND total_fare = 0
  AND (mileage_earned IS NULL OR mileage_earned = 0)
  AND (mileage_used IS NULL OR mileage_used = 0)
  AND start_address IS NULL
  AND end_address IS NULL;
```

---

## 🏢 환경 정보 (양양대리, company_id=3)

| 항목 | 값 |
|---|---|
| company_id | 3 |
| 회사코드 | 1012 |
| customer_code 형식 | `1012-Cxxxx` (4자리 zero-padding) |
| SA 계정 | cblim |
| DB 접속 | `sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db` |
| NAS SQL 경로 | `/volume1/docker/drivelog/server/db/` |
| 마일리지 적립률 | 10% |
| 마일리지 사용 단위 | 5,000원 |

### 기사 약어 매핑 (`build_partN.js`의 RIDER_MAP)

```js
'범': '권경범', '빈': '임창빈', '원': '이대원', '환': '한창환',
'흠': '유기흠', '옥': '조경옥', '균': '박정균', '화': '맹선화',
'만': '손영만', '용': '이건용', '훈': '김지훈', '록': '손영록',
'순': '고현순',
// 풀네임도 그대로 매핑
'선화': '맹선화', '기흠': '유기흠', '창환': '한창환', '윤기흠': '유기흠',
// "OO돈" = 현금 수령 표시 → 뒤의 "돈" 제거
'균돈': '박정균', '조경옥돈': '조경옥', '손영만돈': '손영만',
```

---

## 📁 관련 파일

```
C:\Drivelog\
├── DATA_MIGRATION_GUIDE.md                  ← 4/15 첫 마이그 가이드
├── DATA_MIGRATION_GUIDE_v2.md               ← 이 문서 (4/28 기준, 최신)
├── drivelog-admin\server\db\
│   ├── migration_full_data_v3.sql           ← 4/15 마이그 SQL (이전 버전, 백업)
│   ├── migration_20260428_part1.sql         ← 이번 Part 1
│   └── migration_20260428_part3.sql         ← 이번 Part 3
└── backup\
    ├── 20260428_remigration\
    │   ├── EXECUTION_GUIDE.md               ← 이번 실행 가이드 (구체적)
    │   ├── NOTE.md                          ← 백업 노트
    │   ├── BUILD_PART3_README.md            ← 빌드 스크립트 안내
    │   ├── build_part1.js                   ← Part 1 빌더 (재사용 가능)
    │   ├── build_part3.js                   ← Part 3 빌더 (재사용 가능)
    │   ├── 데이터_마이그레이션2.xlsx         ← 원본 엑셀
    │   └── migration_full_data_v3_BEFORE.sql ← 이전 SQL 백업
    └── 20260428_remigration_session_2026_04_28_summary.md  ← 세션 요약
```

---

## 📝 다음 마이그 시 체크리스트

- [ ] 이전 마이그 SQL을 backup 폴더로 복사
- [ ] 새 엑셀을 backup 폴더로 복사
- [ ] `build_part1.js`, `build_part3.js`의 파일명/날짜를 새 마이그 일자로 수정
- [ ] `node build_part1.js && node build_part3.js` 실행
- [ ] 생성된 SQL을 `scp -O -P 30000`로 NAS 업로드
- [ ] NAS에서 customer_code 형식 사전 검증 (⭐ 매우 중요)
- [ ] NAS에서 sed로 Part 2 추출 (이전 SQL의 No 1~중복시작 직전)
- [ ] 백엔드 stop → Part 1, 2, 3 순서대로 실행 → 백엔드 start
- [ ] 가비지 운행 정리 SQL 실행
- [ ] 검증: 운행 건수, 잔액, 미매칭 카운트
- [ ] 세션 요약 문서 작성 (`session_YYYY_MM_DD_summary.md`)

---

**작성**: 2026-04-28
**기반**: 양양대리 4/15 + 4/28 두 차례 마이그 경험
