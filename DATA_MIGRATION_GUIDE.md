# DriveLog 데이터 마이그레이션 가이드 (2026-04-15 세션 기반)

> **목적**: 기존 엑셀 운행 데이터를 DriveLog DB에 마이그레이션
> **최초 작성**: 2026-04-15
> **다음 마이그레이션 예정**: 2026-04-28 (전체 재마이그레이션)

---

## 📋 전체 흐름 요약

### 1. 원본 데이터
- **파일명**: `데이터_마이그레이션.xlsx`
- **시트1**: 제휴업체 콜 횟수 → INSERT 불필요 (운행에서 자동 집계)
- **시트2**: 고객 마일리지 데이터 → 검증용 (운행에서 자동 계산)
- **시트3**: 전체 운행 데이터 → **이것만 INSERT** (1,224건)
- **시트4**: 총 매출액 집계 → INSERT 불필요 (검증용)

### 2. 엑셀 시트3 컬럼 구조 (18컬럼)
```
No, 연월, 연월일, 시간, 고객코드, 고객명, 전화번호A, 
요금, 현금, 마일리지사용, 마일리지적립, 출발지, 도착지, 
기사, 픽업기사, 제휴업체, 전화번호B, 메모
```

### 3. DB 매핑 규칙

#### 고객 매칭
- ⚠️ **엑셀 "고객코드"는 DB의 `customers.name` 필드와 매칭해야 함**
- DB의 `customers.customer_code`는 자동 생성 코드 (1012-C0001 형식)이므로 사용 불가
- 매칭 쿼리: `SELECT customer_id FROM customers WHERE name='엑셀고객코드' AND company_id=3 LIMIT 1`
- 일부 엑셀 고객코드에 전화번호가 붙어있음 (예: "상광정9702") → DB name과 불일치 가능

#### 기사 약어 → 풀네임 매핑 (전체)
```
범 → 권경범     빈 → 임창빈     원 → 이대원
환 → 한창환     흠 → 유기흠     옥 → 조경옥
균 → 박정균     화 → 맹선화     만 → 손영만
용 → 이건용     훈 → 김지훈     록 → 손영록
순 → 고현순     
선화 → 맹선화   기흠 → 유기흠   창환 → 한창환
윤기흠 → 유기흠
균돈 → 박정균   조경옥돈 → 조경옥   손영만돈 → 손영만
이기사님 → 이기사님   현석 → 현석   삼 → 삼
임서현 → 임서현   신지훈 → 신지훈
```
- "OO돈" = 현금 수령 표시 → 기사명만 추출 (뒤의 "돈" 제거)
- 기사 미지정 행 → cblim (SA 사장님) user_id로 대체
- "도보" → 픽업기사 NULL

#### 제휴업체 매칭
- DB `partner_companies.name` LIKE '%엑셀업체명%' 으로 매칭

#### 날짜/시간 파싱
- 날짜: `'26년 3월 24일 화'` → `2026-03-24`
- 시간: `'오후 9:00:00'` → `21:00:00`
- 세미콜론 형식: `'오후10;00;00'` → `22:00:00`
- 이상값 `'D'` → 기본값 `21:00:00`
- 시간 없음 → 기본값 `21:00:00` (대리운전 특성)

#### 결제구분
- 모든 운행 `payment_type_id = 6` (현금) 고정

#### 마일리지 처리
- 운행별 USE(사용) → EARN(적립) 순서로 `customer_mileage` INSERT
- `balance_after`는 마지막에 전체 재계산 (시간순 누적)
- 음수 잔액은 `GREATEST(calc, 0)` → 0으로 처리
- `customers.mileage_balance`는 마지막 거래의 `balance_after`로 업데이트

---

## 🔧 SQL 생성 방법 (Python 스크립트)

### 핵심 로직
```python
# 1. 엑셀 읽기
wb = openpyxl.load_workbook('데이터_마이그레이션.xlsx', data_only=True)
ws = wb['3. 운행데이터 집계']

# 2. 각 행마다:
#    - 빈 행 스킵 (fare 없고 고객 없으면)
#    - 날짜/시간 파싱
#    - 고객: customers WHERE name='엑셀고객코드'  ← 핵심!
#    - 기사: users WHERE name='풀네임' (약어 매핑 적용)
#    - 제휴: partner_companies WHERE name LIKE '%업체명%'
#    - INSERT INTO rides (...) VALUES (...)
#    - SET @rid = LAST_INSERT_ID();
#    - 마일리지 USE가 있으면 INSERT INTO customer_mileage (type='USE')
#    - 마일리지 EARN이 있으면 INSERT INTO customer_mileage (type='EARN')

# 3. 마지막에 balance_after 재계산 (MariaDB 변수 활용)
# 4. customers.mileage_balance 업데이트
```

### rides INSERT 구조
```sql
INSERT INTO rides(
  company_id, rider_id, pickup_rider_id, customer_id, partner_id,
  status, start_address, end_address, started_at, ended_at,
  total_fare, cash_amount, mileage_used, mileage_earned, final_amount,
  payment_type_id, rider_memo
) VALUES(
  @company_id,
  (SELECT user_id FROM users WHERE name='기사명' AND company_id=@company_id AND role IN('RIDER','SUPER_ADMIN') LIMIT 1),
  (SELECT user_id FROM users WHERE name='픽업기사명' ...),
  (SELECT customer_id FROM customers WHERE name='고객코드' AND company_id=@company_id LIMIT 1),
  (SELECT partner_id FROM partner_companies WHERE name LIKE '%업체명%' ...),
  'COMPLETED', '출발지', '도착지', '시작시간', '시작시간',
  요금, 현금, 마일리지사용, 마일리지적립, 최종금액,
  6, '메모'
);
```

### balance_after 재계산 SQL
```sql
-- 시간순 누적 계산 (MariaDB 사용자 변수 활용)
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

-- customers.mileage_balance 업데이트
UPDATE customers c
INNER JOIN (
  SELECT customer_id, balance_after
  FROM customer_mileage cm1
  WHERE mileage_id = (
    SELECT MAX(cm2.mileage_id) FROM customer_mileage cm2
    WHERE cm2.customer_id = cm1.customer_id
  )
) l ON c.customer_id = l.customer_id
SET c.mileage_balance = l.balance_after
WHERE c.company_id = @company_id;

-- 마일리지 기록 없는 고객은 0
UPDATE customers SET mileage_balance = 0
WHERE company_id = @company_id
AND customer_id NOT IN (
  SELECT DISTINCT customer_id FROM customer_mileage WHERE company_id = @company_id
);
```

---

## 📊 2026-04-15 마이그레이션 결과

| 항목 | 건수 |
|---|---|
| rides INSERT | 1,224건 |
| 빈 행 스킵 | 165건 |
| 마일리지 EARN | 1,173건 → 실제 INSERT 1,128건 |
| 마일리지 USE | 20건 |
| 마일리지 거래 합계 | 1,148건 |
| 마일리지 보유 고객 | 231명 |
| 총 마일리지 잔액 | 2,609,200원 |
| 고객 매칭 실패 (customer_id NULL) | 59건 |
| 시트2 기준 총 마일리지 | 2,722,200원 |
| 차이 | 113,000원 (고객코드 불일치분) |

### 매칭 실패 원인
- 엑셀 고객코드에 전화번호가 붙어있는 경우 (예: "상광정9702")
- DB `customers.name`에는 "상광정"만 저장되어 불일치
- 59건은 rides에 customer_id=NULL로 들어감 (운행 자체는 존재, 마일리지만 스킵)

---

## ⚠️ 다음 마이그레이션 시 주의사항

### 실행 전 필수: 기존 데이터 정리
```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db << 'SQL'
DELETE FROM customer_mileage WHERE company_id = 3;
DELETE FROM manual_gps_points WHERE ride_id IN (SELECT ride_id FROM rides WHERE company_id = 3);
DELETE FROM settlement_rides WHERE ride_id IN (SELECT ride_id FROM rides WHERE company_id = 3);
DELETE FROM rides WHERE company_id = 3;
DELETE FROM calls WHERE company_id = 3;
UPDATE customers SET mileage_balance = 0 WHERE company_id = 3;
SQL
```

### 중복 실행 금지
- SQL은 한 번만 실행. 중복 실행 시 데이터 2배가 됨.

### customer_mileage PK
- `customer_mileage` 테이블의 PK 컬럼명은 `mileage_id` (id가 아님!)

### 고객 매칭 개선 방안 (28일 마이그레이션 때)
1. 엑셀 고객코드에서 전화번호 부분 제거 후 매칭 시도
2. 또는 LIKE 매칭 사용: `WHERE name LIKE '상광정%'`
3. 매칭 실패 목록 사전 확인 후 수동 보정

### 마이그레이션 실행 명령
```bash
# 파일을 NAS에 올린 후
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db \
  < /volume1/docker/drivelog/server/db/migration_full_data_v3.sql
```

### 검증 쿼리
```bash
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db << 'SQL'
-- 전체 현황
SELECT 'rides' AS item, COUNT(*) AS cnt FROM rides WHERE company_id = 3
UNION ALL SELECT 'customer_mileage', COUNT(*) FROM customer_mileage WHERE company_id = 3
UNION ALL SELECT '마일리지 보유 고객', COUNT(*) FROM customers WHERE company_id = 3 AND mileage_balance > 0
UNION ALL SELECT CONCAT('총 마일리지: ', FORMAT(SUM(mileage_balance),0),'원'), COUNT(*) FROM customers WHERE company_id = 3;

-- 매칭 안 된 운행
SELECT 'customer_id NULL' AS chk, COUNT(*) FROM rides WHERE company_id = 3 AND customer_id IS NULL AND total_fare > 0;
SQL
```

---

## 🏢 환경 정보

| 항목 | 값 |
|---|---|
| company_id | 3 |
| 회사코드 | 1012 |
| SA 계정 | cblim |
| DB 접속 | `sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db` |
| NAS SQL 경로 | `/volume1/docker/drivelog/server/db/` |

---

**작성**: 2026-04-15
