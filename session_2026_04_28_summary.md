# DriveLog 세션 요약 — 2026-04-28

> **이전 세션**: `session_2026_04_27_summary.md` — tenants/ 폴더 도입, PWA 캐시 자동 갱신, Contact Picker 통일, 콜 수락 취소 버그 수정
> **이번 세션 주제**: 4월 28일 기준 데이터 전체 재 마이그레이션 (이전 매칭 실패 + 누락 고객 + 4/21~4/28 신규 운행 통합 처리)
> **상태**: ✅ 완료

---

## 🎯 작업 배경 및 문제 상황

### 발단
사장님으로부터 두 가지 요청:
1. "DB 마이그레이션에 누락 데이터 있어서 재 마이그레이션. 기존 4월 20일까지 마이그레이션 → 오늘자(4/28)까지 다시"
2. "고객이 누락되어 있는 데이터들이 있어서 신규등록을 하면 마일리지가 안 가져와짐"

### 근본 원인 분석
- 4/15 마이그(`migration_full_data_v3.sql`, 1,224건) 실행 시 **고객 매칭 실패 59건** 발생
- 원인: 엑셀 고객명에 전화번호가 붙은 경우(예: `상광정9702`)나 옛날 운행에 고객명만 있고 등록 안 된 경우
- 결과: 운행은 들어갔지만 `customer_id = NULL`로 저장 → 마일리지가 해당 고객에게 잡히지 않음
- 사장님이 운영 중 누락 고객(예: 심미투싼)을 모바일로 신규 등록했지만, **이미 NULL로 저장된 운행은 매칭 안 됨**

---

## 📦 입력 데이터

### 사장님 제공 엑셀: `데이터_마이그레이션2.xlsx`
- **시트 1: 운행일지 데이터** — 177건 (No 1252~1429, 2026-03-24 ~ 2026-04-28)
- **시트 2: 고객 데이터** — 274명 + 합계 행, 누적 마일리지 발생/사용 SUM

### 기존 데이터
- 이전 마이그 SQL: `migration_full_data_v3.sql` (1,224건, 2025-10-02 ~ 2026-04-20)
- DB 고객: 245명 (사장님이 운영 중 모바일로 추가 등록한 고객 포함)

### 데이터 분석 결과 (사용자 의사결정 후 채택)
- **이전 v3의 No 1~1250** (1,109건, 2025-10-02 ~ 2026-03-23) + **새 엑셀 No 1252~1429** (177건) 합쳐서 재 import
- 잔액은 새 엑셀 고객시트의 누적값을 source of truth로 직접 SET (재계산 안 함)
- 음수 잔액(하이팰콜로라도 -500원)은 0으로 자동 보정

---

## 🏗 솔루션 아키텍처

### 3-Part 분할 + 안전망 패턴

```
[Part 1] cleanup + 고객 안전망 INSERT
  ↓ DELETE rides/customer_mileage/settlement_rides/manual_gps_points
  ↓ UPDATE customers SET mileage_balance=0
  ↓ 고객시트 274명 NOT EXISTS INSERT
    └─ 이미 DB에 있는 고객은 자동 스킵
    └─ DB에 없는 고객(매칭 실패였던 고객)만 자동 INSERT
    
[Part 2] 이전 운행 1~1250 (NAS에서 sed로 추출)
  ↓ Part 1 안전망 덕분에 모든 customer_id 정상 매칭됨
  ↓ 이전 매칭 실패 59건이 자동 해결

[Part 3] 새 운행 1252~1429 + 잔액 처리
  ↓ 새 엑셀 177건 INSERT
  ↓ customer_mileage.balance_after 시간순 누적 재계산
  ↓ customers.mileage_balance를 고객시트 누적값으로 덮어쓰기 (최종값)
  ↓ 검증 SELECT
```

### 왜 이 구조?

**안전망 NOT EXISTS INSERT의 효과**:
- 사장님이 모바일로 등록 안 한 고객도 자동 등록 ✅
- 사장님이 이미 등록한 고객은 중복 INSERT 안 됨 ✅
- Part 2의 이전 운행이 customer_id 정상 매칭 ✅

**잔액 직접 SET의 정확성**:
- 운행 INSERT가 자동 계산한 balance_after는 무시
- 고객시트 누적값(엑셀에서 직접 검증된 값) = 진실의 원천
- 이전 매칭 실패로 EARN/USE 거래 누락된 분도 잔액 반영됨

---

## 🛠 구현 결과물

### 신규 파일

| 위치 | 용도 |
|---|---|
| `C:\Drivelog\DATA_MIGRATION_GUIDE_v2.md` | 마이그 가이드 (재사용용) |
| `C:\Drivelog\backup\20260428_remigration\EXECUTION_GUIDE.md` | 이번 실행 단계별 가이드 |
| `C:\Drivelog\backup\20260428_remigration\BUILD_PART3_README.md` | Node 빌더 사용법 |
| `C:\Drivelog\backup\20260428_remigration\NOTE.md` | 백업 노트 |
| `C:\Drivelog\backup\20260428_remigration\build_part1.js` | Part 1 SQL 빌더 (Node) |
| `C:\Drivelog\backup\20260428_remigration\build_part3.js` | Part 3 SQL 빌더 (Node) |
| `C:\Drivelog\drivelog-admin\server\db\migration_20260428_part1.sql` | cleanup + 안전망 (113KB) |
| `C:\Drivelog\drivelog-admin\server\db\migration_20260428_part3.sql` | 새 운행 + 잔액 SET (187KB) |
| `/volume1/docker/drivelog/server/db/migration_20260428_part2.sql` | NAS sed 추출 (1.2MB, 이전 1~1250) |

### 빌드 스크립트 핵심 로직

**`build_part1.js`**:
```js
// 274명 NOT EXISTS INSERT
// customer_code 자동 생성: 1012-CNNNN (LPAD 4자리)
INSERT INTO customers(...) 
SELECT @company_id, '고객명',
  CONCAT('1012-C', LPAD(
    CAST(
      (SELECT IFNULL(MAX(...), 0) 
       FROM customers WHERE company_id=3 AND customer_code LIKE '%-C%')
    + 1 AS UNSIGNED), 4, '0')),
  0, NOW(), NOW() FROM dual
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE name='고객명' ...);
```

**`build_part3.js`**:
- 운행 INSERT 177건 (가이드의 기사 약어 매핑 RIDER_MAP 적용)
- balance_after 재계산 (시간순 누적, GREATEST(0))
- 274명 잔액 SET (고객시트 누적값 = 발생SUM - 사용SUM, 음수→0)

---

## 🐛 디버깅 기록 (이번 세션의 함정 5가지)

### 1. customer_code 형식 불일치 → SUBSTRING_INDEX 실패
**증상**: Part 1 첫 INSERT에서 `ERROR 1292: Truncated incorrect INTEGER value: '1012-001'`
**원인**: 8명의 고객이 `1012-001` 형식 (`-C` 구분자 없음). SA 자동 등록이나 모바일 등록의 버그 흔적.
**진단**:
```sql
SELECT customer_code, COUNT(*) FROM customers WHERE company_id=3 GROUP BY 
  CASE WHEN customer_code LIKE '%-C%' THEN 'OK' ELSE 'BAD' END;
-- 결과: 1012-Cxxxx 237명, 1012-001 8명
```
**8명의 정체**: 테스트 고객 6명 (482~487) + 김세엽 (488) + **심미투싼 (489, 사장님이 어제 모바일로 등록!)**
**해결**:
1. 테스트 6명 DELETE
2. 김세엽, 심미투싼은 customer_code만 `1012-C0238`, `1012-C0239`로 UPDATE
3. Part 1 INSERT 로직에 `WHERE customer_code LIKE '%-C%'` 필터 추가 + `CAST(... AS UNSIGNED)` 명시

**교훈**: **마이그 전 customer_code 형식 사전 검증 필수**. 비정상 형식이 1건이라도 있으면 SUBSTRING_INDEX 캐스팅 폭발.

### 2. CONCAT + LPAD 결과에 점(`.`) 붙음
**증상**: UPDATE 결과가 `1012-C238.` (점 + zero padding 없음)
**원인**: MariaDB 변수 산술이 DECIMAL/FLOAT로 처리되어 `238.0000`이 됨. LPAD가 점 포함해서 처리.
**해결**: 직접 `customer_code = '1012-C0238'` 문자열 SET으로 보정.

### 3. Python 미설치 → Node로 전환
**증상**: `python --version` → "Python" (Microsoft Store 스텁)
**해결**: 빌더를 Python에서 Node.js로 재작성. DriveLog 프로젝트는 Node 기반이라 100% 깔려있음. `npm install xlsx`로 SheetJS 1회만 설치하면 끝.

### 4. 큰 SQL 직접 write 불가
**증상**: 1.4MB 통합 SQL을 filesystem MCP로 한 번에 못 보냄 (토큰 비용)
**해결**: 빌드 스크립트(`build_partN.js`)를 사용자 PC에 두고 `node` 한 번 실행 → 사용자 PC에서 SQL 자동 생성.

### 5. 가비지 운행 28건
**증상**: 마이그 후 customer_id NULL + 모든 금액 0인 운행 28건 발견
**원인**: 새 엑셀에 "이용금액 NaN" 빈 row가 33개 있었고 일부가 그대로 INSERT됨 (취소된 콜 자리만 차지하던 row)
**해결**: 별도 DELETE 쿼리로 정리:
```sql
DELETE FROM rides WHERE company_id=3 
  AND customer_id IS NULL AND total_fare=0 
  AND start_address IS NULL AND end_address IS NULL
  AND (mileage_earned IS NULL OR mileage_earned=0)
  AND (mileage_used IS NULL OR mileage_used=0);
```

---

## 📊 최종 결과 (2026-04-28 마이그 후)

### 핵심 지표

| 항목 | 이전 (4/15) | 현재 (4/28) | 변화 |
|---|---|---|---|
| 운행 건수 | 1,224건 | **1,258건** | +34건 (+62 신규 - 28 가비지) |
| 마일리지 거래 건수 | 1,148건 | **1,226건** | +78건 |
| 마일리지 보유 고객 | 231명 | **271명** | +40명 |
| **총 마일리지 잔액** | 2,609,200원 | **2,821,200원** | **+212,000원** |
| 미매칭 운행 (customer_id NULL & 요금>0) | 59건 | **14건** | **-45건 (76% 해결!)** ⭐ |
| 고객 총 수 | 245명 | **278명** | +33명 |

### 안전망 효과 검증

Part 1의 안전망 NOT EXISTS INSERT가 274명 중 **39명을 신규 등록**:
- 사장님이 모바일로 등록한 고객 (예: 심미투싼) → 이미 DB에 있어 자동 스킵 ✅
- 사장님이 등록 안 한 고객 (예: 상광정9702, 태산3801, 인구목장 등 39명) → 자동 INSERT ✅

→ Part 2 (이전 운행 1,109건) 실행 시 모든 customer_id가 정상 매칭됨
→ 이전 매칭 실패 59건 중 45건 자동 해결

### 잔여 14건 분석

옛날(2025-10 ~ 2026-02) 운행 중 고객명 없이 입력된 케이스:
- 4건: 출발/도착에 고객명이 들어간 케이스 (`38횟집`, `깜장고무신`, `녹원`, `다래`)
- 10건: 모든 필드 NULL, 금액만 있음

**처리 방향**: 그대로 유지 (운행 이력 보존, 마일리지 잔액은 고객시트로 SET됐으니 운영 영향 없음).

---

## 🛠 NAS 실행 타임라인

| 시각 | 작업 | 소요 시간 |
|---|---|---|
| 23:30 | Part 1 첫 시도 → ERROR 1292 (customer_code 형식 문제) | 3.2초 (실패) |
| 23:35 | customer_code 형식 진단 → 비정상 8명 발견 | - |
| 23:40 | 테스트 6명 DELETE + 김세엽/심미투싼 customer_code 보정 | - |
| 23:43 | Part 1 SQL 안전 로직으로 재빌드 | - |
| 23:45 | Part 1 재실행 (성공) | 1.06초 |
| 23:46 | Part 2 실행 (이전 1,109건) | 52.6초 |
| 23:47 | Part 3 실행 (새 177건 + 잔액 SET) | 13.9초 |
| 23:48 | 백엔드 재기동 | 1초 |
| 23:50 | 가비지 28건 DELETE | < 1초 |

총 소요 시간: 약 20분 (디버깅 포함)

---

## 🔮 향후 재 마이그 시 체크리스트

다음 마이그(예: 5월 말 또는 새 회사 가입) 때 그대로 따라할 수 있도록 정리:

1. **사전 준비**
   - [ ] 새 엑셀 파일 받기
   - [ ] backup 폴더 생성: `backup/YYYYMMDD_remigration/`
   - [ ] 이전 v3 SQL 백업 복사

2. **로컬 빌드** (Windows / Git Bash)
   - [ ] `build_part1.js`, `build_part3.js`를 backup 폴더로 복사
   - [ ] 두 스크립트의 EXCEL_PATH, OUTPUT_PATH 수정
   - [ ] `npm install xlsx` (첫 1회만)
   - [ ] `node build_part1.js && node build_part3.js`

3. **NAS 사전 점검** (매우 중요!)
   - [ ] customer_code 형식 검증 (`%-C%` LIKE 비정상 형식 확인)
   - [ ] 비정상 있으면 사전 보정 (DELETE 또는 UPDATE)

4. **NAS 실행**
   - [ ] SQL 파일 scp로 NAS 업로드
   - [ ] NAS에서 sed로 Part 2 추출
   - [ ] 백엔드 stop
   - [ ] Part 1 → 2 → 3 순서로 실행
   - [ ] 백엔드 start

5. **사후 정리**
   - [ ] 가비지 운행 DELETE
   - [ ] 검증 (운행 건수, 잔액, 미매칭)
   - [ ] 세션 요약 문서 작성

---

## 📝 다음 세션 메모

- **PII Phase 2 (암호화)**: 보류 중. 사장님 결정 대기.
- **PHASE1 (볼륨 암호화 + DB 포트 차단)**: 개발 주기 끝날 때.
- **마이그 자동화**: 이번 경험으로 빌드 스크립트 + 가이드 정착됨. 다음엔 30분 이내 처리 가능 예상.
- **잔여 미매칭 14건**: 운영 영향 없으나 추후 admin 화면에서 일괄 수정 기능 추가 검토 가능.

---

**작성**: 2026-04-28
**관련 문서**:
- `C:\Drivelog\DATA_MIGRATION_GUIDE_v2.md` (재사용 가이드)
- `C:\Drivelog\backup\20260428_remigration\EXECUTION_GUIDE.md` (이번 실행 가이드)
- `C:\Drivelog\session_2026_04_27_summary.md` (이전 세션)
