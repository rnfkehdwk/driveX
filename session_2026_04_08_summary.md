# DriveLog 개발 세션 정리 — 2026-04-08

> 한 세션에서 진행한 모든 작업의 종합 정리. 다음 세션에서 이 문서를 첫 메시지로 붙여넣으면 컨텍스트 그대로 이어서 작업 가능.

---

## 🎯 세션 개요

이번 세션에서 **운임정산 5단계 작업 + 근무시간 입력 + 마일리지 시스템 1단계 (백엔드)** 까지 완료. 모두 양양대리(company_id=3) 운영 환경에서 검증 통과.

**진행 작업 시퀀스**:
1. 운임정산 1~3단계 (인쇄/공유, 즐겨찾기, 기사 지명)
2. 운임정산 페이지 일별/월별 탭 분리
3. 5번 월별 정산 자동 계산
4. 근무시간 입력 페이지 (`/attendance`)
5. 마일리지 시스템 1단계 (백엔드 + DB)
6. 마일리지 적립 로직 보완 (마일리지 사용분 적립 제외)

---

## 📋 작업 1: 운임정산서 인쇄/공유 (1단계) ✅

### 변경 파일
- `client/src/index.css` — `@media print` CSS 블록 추가, `.print-area`/`.no-print`/`.print-only` 클래스
- `client/src/pages/FareSettlement.jsx`:
  - `buildShareText()` 헬퍼 (카카오톡 형식)
  - `shareSettlement()` (Web Share API → 클립보드 fallback)
  - print-only 헤더 (회사명, 인쇄시각, 정산기간, 작성자 자동 표시)
  - 💬 공유 / ⬇️ Excel / 🖨️ 정산서 인쇄 3개 버튼

### 핵심 동작
- 인쇄 시 사이드바/탭 헤더 등 자동 숨김 (`.no-print`)
- 정산서만 A4 1페이지로 출력
- 공유 시 모바일에서 OS 공유 시트 열림 (카카오톡 선택 가능), 데스크톱은 클립보드 복사

### 검증 결과
- ✅ `.print-area` DOM 적용, `.print-only` 헤더 텍스트 정상 ("양양대리 운임정산서 / 인쇄: 2026. 4. 8. ... / 정산기간: ... · 작성자: 임창빈")
- ✅ `@media print` CSS rule 활성
- ✅ 3월 데이터 (1,865,000원 / 97건) 정상 표시

---

## 📋 작업 2: 출발지/도착지 즐겨찾기 (2단계) ✅

### 백엔드
- `server/routes/calls.js`: `GET /api/calls/frequent-addresses?type=start|end&limit=20&days=90`
  - 최근 90일 내 자주 사용한 주소 top N 반환
  - GROUP BY address, ORDER BY use_count DESC
  - 자동검증/검증 키워드 제외

### 프론트
- `client/src/api/client.js`, `mobile/src/api/client.js`: `fetchFrequentAddresses(p)` 추가
- `client/src/pages/CallManage.jsx` `CreateCallModal`:
  - 출발지/도착지 input 옆에 ⭐ 버튼 추가
  - 클릭 시 자주 가는 주소 드롭다운 펼침
  - 항목 클릭 → input 자동 입력
- `mobile/src/pages/CallList.jsx` `CreateCallModal`: 동일 패턴

### 검증 결과
- ✅ GET endpoint 200, 양양대리 start 7건 / end 4건 반환
- ✅ ⭐ 버튼 클릭 시 드롭다운 정상 펼침
- ✅ 항목 클릭 → start_address input 자동 입력 ("강원특별자치도 양양군 양양읍 남문7길 15-7")

---

## 📋 작업 3: 콜 자동 배정 — 수동 지명 (3단계) ✅

### 백엔드
- `server/routes/calls.js` POST `/api/calls`에 `assigned_rider_id` 옵션 처리:
  - 기사 검증 (같은 회사, RIDER 또는 SUPER_ADMIN, ACTIVE)
  - 지명 시 `status='ASSIGNED'`로 INSERT (WAITING 단계 건너뜀)
  - `assigned_at = NOW()` 즉시 채움
  - audit log action `CALL_CREATE_ASSIGN`
  - 응답 메시지 분기: "콜이 생성되어 지명된 기사에게 배정되었습니다." vs "콜이 생성되었습니다."

### 프론트
- `CallManage.jsx`, `CallList.jsx` 모달:
  - `fetchRiders` import 추가
  - `riders` state + load
  - `form.assigned_rider_id` 필드
  - "🚗 기사 지명" select 드롭다운 ("— 지명 없음 (모든 기사가 경쟁) —" + 기사 목록)
  - 선택 시 파란 배경 + "→ 대기 없이 바로 배정됩니다" 힌트

### 검증 결과 (end-to-end)
- ✅ 콜 #20 생성, 응답 메시지 "콜이 생성되어 지명된 기사에게 배정되었습니다."
- ✅ DB: status=ASSIGNED, assigned_rider_id=30(고현순), assigned_at = created_at = 2026-04-08 11:43:40
- ✅ WAITING 단계 거치지 않고 바로 배정 확인

---

## 📋 작업 4: 운임정산 페이지 일별/월별 탭 분리 ✅

### 변경 파일
- `client/src/pages/FareSettlement.jsx` 컴포넌트 단위 리팩터링:
  - `FareSettlement` (default export) — 탭 컨트롤러
  - `DailyTab` — 기존 모든 코드 (기간 선택, KPI, 운행 내역, 기사별 정산 요약, 공유/Excel/인쇄)
  - `MonthlyTab` — 신규 (5번 작업으로 채워짐)

### 주요 동작
- 탭 헤더: 📅 일별 정산 / 📊 월별 정산 (활성 탭에 파란 밑줄)
- URL 쿼리 `?tab=monthly` 유지 (새로고침해도 그 탭 열림)
- 탭 헤더에 `.no-print` 클래스 — 인쇄 시 안 나옴

---

## 📋 작업 5: 5번 월별 정산 자동 계산 ✅

### 백엔드
- `server/routes/settlements.js`: `GET /api/settlements/monthly-payout?month=YYYY-MM` 신규
- 정산 룰:
  - **COMMISSION (수수료%)**: rider_share = round(매출 × (1 - %)), company_share = 매출 × %
  - **HOURLY (시급제)**: rider_share = round(시급 × 근무시간), company_share = 매출 - 시급비용
  - **PER_RIDE (건당)**: rider_share = round(건수 × 건당단가), company_share = 매출 - 건당비용
- 결제그룹 분류 (그룹명에 "기사"/"회사" 포함 여부로 자동 판단)
- 정산 방향:
  - balance = rider_holds - rider_share
  - 양수 → `rider_owes_company` (기사가 회사에 입금)
  - 음수 → `company_owes_rider` (회사가 기사에게 지급)
- `rider_pay_rates` 개별 설정 우선, 없으면 `company_pay_settings` 기본값
- `rider_attendance.calculated_hours` 합산해서 시급제용 work_hours 계산

### 프론트 — `MonthlyTab` 본격 구현
- 월 선택 바 (‹ › 화살표 + month input + 이번달 버튼)
- 💬 공유 / ⬇️ Excel / 🖨️ 정산서 인쇄 3개 버튼
- 4개 KPI 카드: 총매출 / 기사보유(주황) / 회사보유(녹색) / 회사수수료(파랑)
- 업체 기본 정산방식 안내 바
- 기사별 정산 테이블 (9컬럼: 기사명, 정산방식 배지, 운행, 총매출, 기사보유, 회사보유, 기사몫, 회사몫, 정산방향)
- 정산방식 컬러 배지 (COMMISSION 파랑, HOURLY 보라, PER_RIDE 청록)
- 정산 컬럼: 빨강 "기사→회사 N" / 파랑 "회사→기사 N" / 녹색 "✅ 정산완료"
- print-area + print-only 헤더
- 카카오톡 공유 텍스트 빌더 (회사명, 월, 기사별 화살표)

### API client
- `client/src/api/client.js`: `fetchMonthlyPayout(params)` 추가

### 디버깅
- **SQL 컬럼 버그**: `r.user_id AS rider_id`로 잘못 작성 → `r.rider_id`로 수정 (기존 daily endpoint와 일치)
- `status != 'CANCELLED'` 추가 (취소 운행 제외)

### 검증 결과
- ✅ API 200, 3월 데이터: 1,865,000원 / 97건 (일별과 정확히 일치)
- ✅ 양양대리 자동 인식: HOURLY, 12,000원/h
- ✅ 5명 기사 (고현순 4건, 미배정 76건, 이대원 4건 등)
- ✅ 시각 검증: KPI 카드 4개, 기사별 테이블, 정산방식 배지, 정산방향 칩 모두 정상
- ⚠️ 출퇴근 기록 0건이라 모든 기사 work_hours=0 → "기사→회사 1,865,000원" 표시 (출퇴근 입력 시 자동 정확화)

---

## 📋 작업 6: 근무시간 입력 페이지 `/attendance` ✅

### 사용자 요구사항
- 출퇴근 시각 입력 대신 **근무시간 직접 입력** (예: 8시간)
- **0.5h 단위 셀렉트** (콜 가다가 출근, 콜 끝나고 퇴근이라 정확한 시각 모름)
- **개별 입력** (기사마다 근무시간 다름)

### 백엔드
- `server/routes/paySettings.js` POST `/attendance` 두 모드 지원:
  - **모드 A (기존)**: `clock_in` + `clock_out` → 자동 계산
  - **모드 B (신규)**: `calculated_hours` 직접 입력 → 그대로 저장
- 같은 기사+날짜 자동 UPDATE (덮어쓰기, response에 `updated:true`)
- ⚠️ **NOT NULL 버그 수정**: rider_attendance.clock_in이 NOT NULL 컬럼 → dummy 값 (`work_date 00:00`, `work_date HH:MM`) 채움
- DB는 기존 `rider_attendance` 테이블 그대로 사용 (마이그레이션 없음)

### 프론트 — 새 페이지 `client/src/pages/Attendance.jsx`
- **상단 안내 박스**: "시급제 업체용 — 입력한 시간은 운임정산 → 월별 정산에 자동 반영됩니다"
- **🕐 근무시간 입력 카드** (3컬럼):
  - 기사 선택 드롭다운 (양양대리 21명+)
  - 근무일 input + "오늘"/"어제" 빠른 버튼
  - **근무시간 셀렉트 (0~24h, 0.5 단위 49개 옵션)** — 파란 굵은 글씨, 기본 8시간
- 메모 (선택)
- 중복 입력 안내 (이미 입력된 날짜 자동 감지 → "덮어씁니다" 노란 박스)
- 저장 버튼 — 신규면 "💾 근무시간 저장", 덮어쓰기면 "✏️ 수정 저장"
- 저장 후 메모만 초기화, 기사/날짜는 유지 → 다음 기사로 빠른 입력
- **월 필터 + 합계 바** (총 근무시간 / 입력 기사 / 총 기록)
- **기사별 합계 카드** (정렬: 시간 많은 순)
- **입력 내역 테이블** (근무일 / 기사 / 근무시간 / 메모 / 🗑️ 삭제)

### App.jsx
- import + 사이드바 정산 그룹에 "🕐 근무시간" 메뉴 추가
- `/attendance` 라우트 (SUPER_ADMIN, MASTER 권한)

### API client
- `fetchAttendance`, `createAttendance`, `updateAttendance`, `deleteAttendance` 추가

### 검증 결과 (end-to-end)
- ✅ POST 신규 (201): work_minutes=510 (8.5×60), calculated_hours=8.5
- ✅ POST 덮어쓰기 (200): work_minutes=570 (9.5×60), `updated:true`, 같은 id
- ✅ 0.5h 셀렉트 49개 옵션 정확
- ✅ 사이드바 메뉴 정상 등록 (정산 그룹 → 🕐 근무시간)
- ✅ **운임정산 → 월별 정산 자동 반영**: 고현순 9.5h × 12,000원 = 114,000원, "회사→기사 114,000원" 파란 칩 표시

---

## 📋 작업 7: 마일리지 시스템 1단계 (백엔드) ✅

### 사용자 정책
- **적립**: 운임의 10% 자동 적립 (15,000원 → 1,500원)
- **사용**: 5,000원 단위로만 가능
- **기존 운영**: 사장님이 마일리지 차감액을 수기로 빼서 운임 입력 → 시스템이 자동 차감으로 변경
- **회계**: 옵션 A — 운임은 원금으로 기록 + mileage_used 별도 (마일리지로 결제한 부분도 매출에 잡힘)
- **수수료 계산**: 원금 기준
- **적립 계산**: 마일리지 사용분 제외 (마일리지로 결제한 부분에는 적립 안 줌, 마일리지 복리 방지)

### 중요한 발견 — 양양대리는 이미 마일리지가 활발하게 운영 중
| 항목 | 값 |
|---|---|
| 활성 고객 | **239명** |
| 마일리지 보유 고객 | **232명** (97%) |
| 총 누적 잔액 | **1,509,000원** |
| 적립 자동 동작 | ✅ rides POST에서 이미 fare_policies.mileage_earn_pct 사용 |

→ **기존 시스템 갈아엎기 X, 보존 + 확장**

### 기존 인프라 활용
- `customer_mileage` 테이블: id, customer_id, company_id, type (EARN/USE), amount, balance_after, description, ride_id, processed_by, created_at
- `customers.mileage_balance`: 현재 잔액
- `fare_policies.mileage_earn_pct`: 적립률 (양양대리 10%)

### 백엔드 새로 만든 것
**`server/routes/mileage.js` (신규)**:
- `GET /` — 전체 고객 잔액 (검색, has_balance 필터)
- `GET /summary` — 회사 통계 (총 잔액, 보유 고객 수, 누적 적립/사용)
- `GET /customer/:id` — 특정 고객 잔액 + 거래 이력 (최근 100건)
- `POST /adjust` — 수동 적립/차감 (잔액 부족 검증, audit log)
- `GET /transactions` — 전체 거래 이력 (월/타입/customer 필터)
- 5,000원 단위 상수 export

**`server/routes/rides.js` POST 변경**:
- `mileage_used > 0`이면:
  1. **5,000원 단위 검증** (안 맞으면 400)
  2. **잔액 부족 검증** (FOR UPDATE 잠금 후 잔액 재조회)
  3. `customer_mileage`에 'USE' 거래 INSERT
  4. `customers.mileage_balance` 차감
  5. 모든 작업 같은 트랜잭션 (rollback 안전)
- **적립 로직 보완** (마지막 수정): `earnableAmount = total_fare - mileage_used` → 마일리지 사용분 제외하고 적립

**`server/index.js`**:
- `/api/mileage` 라우트 등록
- API 버전 v2.5 → **v2.6**

**`server/db/migration_2026_04_08_mileage_system.sql`** (1줄, 안전):
```sql
UPDATE customers SET mileage_balance = 0 WHERE mileage_balance IS NULL;
```

### API client
- `fetchMileageList`, `fetchMileageSummary`, `fetchCustomerMileage`, `adjustMileage`, `fetchMileageTransactions` 추가

### 검증 결과
- ✅ API health v2.6
- ✅ GET /mileage: 잔액 보유 232명, 1위 아이리스양승창 53,500원
- ✅ GET /mileage/summary: 총 1,509,000원 / 활성 239명 / 보유 232명
- ✅ GET /mileage/transactions: 정상 동작
- ✅ GET /mileage/customer/:id: 잔액 + 이력 조회
- ✅ **5,000원 단위 검증**: `mileage_used: 3000` → 400 + "마일리지는 5,000원 단위로만 사용 가능합니다."
- ✅ **잔액 부족 검증**: `mileage_used: 100000000` → 400 + "마일리지 잔액이 부족합니다. 현재 잔액: 3,000원"
- ✅ **정상 사용 시나리오** (운행 1261, 아이리스양승창):
  - 사용 전: 53,500원
  - 운행 30,000원 + 마일리지 5,000원 사용
  - USE 거래 기록 → balance_after=51,500
  - **(옛 적립 로직)** EARN 3,000원 추가 → balance_after=56,500 (잘못)
  - **(새 적립 로직)** EARN (30,000-5,000)×10% = 2,500원 → 옳음

### ⚠️ 적립 로직 수정 (마지막 작업)
처음에 검증된 운행 1261은 옛 로직(원금 30,000원의 10% = 3,000원 적립)으로 만들어짐. 사장님 실제 정책: **마일리지 사용분 제외하고 적립** = (30,000 - 5,000) × 10% = **2,500원**.

- `server/routes/rides.js` POST 한 줄 수정:
  ```js
  // 변경 전
  if (policies.length > 0) mileage_earned = Math.floor(total_fare * policies[0].mileage_earn_pct / 100);
  
  // 변경 후
  if (policies.length > 0) {
    const earnableAmount = Math.max(0, Number(total_fare) - Number(mileage_used || 0));
    mileage_earned = Math.floor(earnableAmount * policies[0].mileage_earn_pct / 100);
  }
  ```

---

## 📦 변경된 파일 종합 (이번 세션 누적)

### 백엔드
| 파일 | 변경 내용 |
|---|---|
| `server/routes/calls.js` | frequent-addresses endpoint + assigned_rider_id 처리 |
| `server/routes/settlements.js` | monthly-payout endpoint (~220줄) |
| `server/routes/paySettings.js` | attendance 직접 입력 모드 + dummy clock_in 처리 |
| `server/routes/mileage.js` | **신규 파일** (5개 endpoint, 5000원 단위 검증) |
| `server/routes/rides.js` | 마일리지 USE 처리 + 적립 로직 보완 (사용분 제외) |
| `server/index.js` | mileage 라우트 등록 + version v2.5→v2.6 |
| `server/db/migration_2026_04_08_mileage_system.sql` | **신규 파일** (1줄, NULL→0 초기화) |

### 관리자 프론트
| 파일 | 변경 내용 |
|---|---|
| `client/src/index.css` | @media print CSS, .print-area/.no-print/.print-only |
| `client/src/pages/FareSettlement.jsx` | 탭 분리 + DailyTab + MonthlyTab 본격 구현 + buildShareText/shareSettlement |
| `client/src/pages/CallManage.jsx` | ⭐ 즐겨찾기 + 🚗 기사 지명 |
| `client/src/pages/Attendance.jsx` | **신규 파일** (근무시간 입력 페이지) |
| `client/src/api/client.js` | fetchMonthlyPayout, attendance 4개, mileage 5개 |
| `client/src/App.jsx` | Attendance import + nav 메뉴 + route |

### 모바일 프론트
| 파일 | 변경 내용 |
|---|---|
| `mobile/src/pages/CallList.jsx` | ⭐ 즐겨찾기 + 🚗 기사 지명 |
| `mobile/src/api/client.js` | fetchFrequentAddresses, fetchRiders |

---

## 🏢 양양대리 운영 현황 데이터 (참고)

| 항목 | 값 |
|---|---|
| company_id | **3** |
| 회사 코드 | 1012 |
| SUPER_ADMIN | cblim (임창빈, user_id=8) |
| 정산 방식 | **HOURLY** (시급제 12,000원/h) |
| 1시간 미만 처리 | ROUND_DOWN |
| 마일리지 적립률 | **10%** (fare_policies, 사용분 제외) |
| 마일리지 사용 단위 | **5,000원** |
| 활성 기사 | **21명+** (고현순 30, 권경범 31, 맹선화 32, 박정균 33, 손영록 34, 손영만 35, 신지훈 36, 유기흠 37, 이건용 38, 이대원 39, 이성일 40, 익명삼 41, 미배정 48 등) |
| 활성 고객 | **239명** |
| 마일리지 보유 고객 | **232명** (총 1,509,000원) |
| 결제그룹 | 기사보유 (group_id=2, 주황 #d97706) / 회사보유 (group_id=5, 녹색 #0f6e56) |
| payment_types | 6=현금, 7=기사계좌, 8=회사계좌, 9=나라시, 11=미수, 12=카드 |
| 회사 좌표 | lat=38.0758, lng=128.6190 (양양읍) |
| 3월 운영 | 1,865,000원 / 97건 (76건 미배정 — 데이터 정리 필요) |
| 4월 운영 | 0건 (현재) |

### 카카오 API 키
- REST: `5bfc2766bfe2836aab70ff613c8c05be`
- JavaScript: `b1e43fe40464bf365f6122749187c09a`

---

## 🧹 검증용 데이터 — 다음 세션에서 정리 필요

| 항목 | 위치 | 정리 방법 |
|---|---|---|
| 콜 #20 | calls 테이블 | 메모 [자동검증] → 14일 후 cleanup 자동 정리 |
| attendance id=1 (고현순 2026-04-08 9.5h) | rider_attendance | DELETE (cleanup 대상 아님) |
| 운행 #1261 (아이리스양승창, 30,000원, 마일리지 5,000원 사용) | rides + customer_mileage | 운영 데이터에 영향 — 다음 세션 시작 시 정리 결정 |

운행 1261 정리 시 주의:
- customer_mileage에 EARN 3,000원 + USE 5,000원 두 거래 있음 (옛 적립 로직)
- 단순 ride DELETE만 하면 잔액 불일치 발생 → mileage 보정 필요
- 또는 운행 데이터 그대로 두고 다음 세션 시작 시 사장님과 상의

---

## 🚧 다음 세션에서 할 일 — 마일리지 2단계

### 우선순위 1: 검증용 데이터 정리
1. 운행 #1261 처리 결정 (DELETE + 마일리지 환불 / 그대로 두기)
2. attendance id=1 삭제 (DELETE /api/pay-settings/attendance/1)

### 우선순위 2: 마일리지 적립 로직 검증
- 위에서 수정한 "마일리지 사용분 제외" 로직 배포 후 검증
- 새 운행 작성 시: 30,000원 + 마일리지 5,000원 → 적립 2,500원 확인

### 우선순위 3: 백엔드 보완
1. **rides POST 적립/사용 순서 변경** — 현재 적립 → 사용. 자연스러운 건 사용 → 적립 (이력 보기 좋음)
2. **rides PUT (운행 수정) 시 마일리지 변경 처리** — delta 계산 + 보정 거래
3. **rides DELETE 시 마일리지 환불** — 해당 운행의 EARN/USE 모두 보정

### 우선순위 4: 프론트 마일리지 페이지 (이번 핵심)
1. **`client/src/pages/Mileage.jsx` 새로 작성** (현재 페이지는 mockData 사용 — 깨진 상태)
   - 회사 통계 카드 (총 잔액, 보유 고객 수, 누적 적립/사용)
   - 잔액 보유 고객 목록 (검색, 정렬)
   - 고객 클릭 → 잔액 + 거래 이력 모달
   - 수동 적립/차감 버튼 (POST /mileage/adjust 호출)
   - 거래 이력 탭 (월별 필터)
2. **`client/src/pages/Rides.jsx` 운행 작성 모달에 마일리지 input**
   - 고객 선택 시 잔액 표시
   - **5,000원 단위 셀렉트** (0, 5000, 10000, 15000, ... 잔액 한도까지)
   - 차감 미리보기 (실제 결제액 = 운임 - 마일리지)
   - 적립 미리보기 ((운임 - 마일리지) × 10%)
3. **`client/src/pages/CallManage.jsx` 콜 생성 모달에도 동일** (선택)
4. **모바일 운행 작성에도 동일 마일리지 input** (`mobile/src/pages/...`)

### 우선순위 5: 검증
- 마일리지 페이지 시각 검증 (232명 잔액 표시)
- 운행 작성 모달에서 마일리지 사용 → 잔액 자동 차감 → 적립 정확
- 수동 조정 기능 (사장님이 직접 +/- 가능)

---

## 📊 인프라 정보 (변경 없음, 참고용)

### 환경
- NAS: Synology, 192.168.0.2
- SSH: rnfkehdwk@rnfkehdwk.synology.me:30000
- Docker: drivelog-api, drivelog-db (MariaDB 10.11), drivelog-nginx
- DB root: `Drivelog12!@`, app user: sykim/`Rlatpduq12!@`
- 외부: https://rnfkehdwk.synology.me:38443/admin/ + /m/
- 내부: https://192.168.0.2:8443/

### 배포 자동화 (4월 7~8일 구축됨)
```bash
cd /c/drivelog
npm run deploy:all   # admin + mobile + server 모두, ~30초
npm run deploy:admin # admin만
npm run deploy:mobile # mobile만
npm run deploy:server # backend만 + API/Nginx restart
```

### 표준 NAS 명령
```bash
# 백엔드 변경 후
cd /volume1/docker/drivelog
sudo docker-compose restart api

# 프론트 변경 후
sudo docker-compose restart nginx

# DB 마이그레이션
sudo docker exec -i drivelog-db mariadb -uroot -p'Drivelog12!@' drivelog_db < /volume1/docker/drivelog/server/db/migration_FILENAME.sql

# 검증
curl -k https://192.168.0.2:8443/api/health  # v2.6
sudo docker logs drivelog-api --tail 30
```

### 테스트 계정
| 역할 | 회사코드 | ID | PW |
|---|---|---|---|
| MASTER | - | admin | Admin123! |
| SUPER_ADMIN | 1012 | cblim | 11223344 |
| RIDER | YANGYANG01 | rider_son | Admin123! |

---

## 💡 핵심 학습 / 패턴

### 메모리에 있는 패턴들 (이번 세션에서도 활용)
- React SPA 라우팅: `window.history.pushState` + `PopStateEvent` dispatch
- 로그인 토큰: localStorage에 직접 inject 후 reload
- Vite 빌드 hash 변경: Ctrl+Shift+R 강제 새로고침으로 새 번들 로드
- 빌드 산출물 검증: 한국어 문자열로 검색 (minified 함수명 무시)
- 마이그레이션 순서: DB 먼저 → 백엔드 코드 (Unknown column 에러 방지)

### 이번 세션에서 새로 배운 것
- **rider_attendance.clock_in이 NOT NULL** → dummy 값으로 채워야 NULL 입력 가능
- **양양대리 마일리지가 이미 활발하게 운영 중** → 갈아엎지 말고 보존
- **fare_policies에 mileage_earn_pct가 이미 있음** → 중복 정의 안 함
- **customer_mileage 테이블이 이미 있음** → 새 테이블 만들지 말 것
- **마일리지 사용분에는 적립 안 줌** (마일리지 복리 방지)

---

## 📝 새 세션 시작용 첫 메시지 (추천)

```
DriveLog 마일리지 시스템 2단계 진행. 

먼저 어제(2026-04-08) 검증용으로 만든 데이터 정리부터:
- 운행 #1261 (아이리스양승창, 30,000원, 마일리지 5,000원 사용)
- attendance id=1 (고현순 2026-04-08 9.5h)
- 콜 #20 (자동검증, cleanup 14일 후 자동 정리되니 skip 가능)

정리 후:
1. 마일리지 적립 로직 수정본 검증 (마일리지 사용분 제외 적립)
2. 마일리지 페이지 (Mileage.jsx) 새로 작성 — 현재 mockData 쓰는 깨진 상태
3. 운행 작성 모달에 마일리지 사용 input 추가

세션 정리 문서: C:\Drivelog\session_2026_04_08_summary.md
```

---

## 🎉 세션 종합

**완료된 작업**: 7개 (운임정산 1~3단계, 탭 분리, 5번 월별 정산, 근무시간 입력, 마일리지 백엔드)

**검증 통과**: 모든 작업 end-to-end 통과 (양양대리 실제 운영 환경)

**API 버전**: v2.5 → **v2.6**

**다음 세션 우선순위**: 마일리지 프론트 (Mileage.jsx 재작성 + 운행 작성 모달에 input 추가)

수고하셨습니다! 🎊
