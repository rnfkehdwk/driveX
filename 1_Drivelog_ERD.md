# DriveLog ERD (Entity Relationship Diagram)

> **버전**: API v2.6 기준 (2026-04-08)
> **DB**: MariaDB 10.11 / utf8mb4_unicode_ci
> **Charset**: utf8mb4 (한글 + 이모지 지원)
> **Engine**: InnoDB

---

## 📐 전체 구조 개요

DriveLog는 **멀티테넌트 구조**로, 모든 핵심 데이터가 `companies` 테이블을 루트로 하여 분리됩니다. 핵심 데이터 흐름:

```
companies (업체 — 멀티테넌트 루트)
  ├─ users (MASTER/SUPER_ADMIN/RIDER)
  ├─ customers (탑승 고객)
  ├─ partner_companies (제휴업체)
  ├─ payment_types (결제구분)
  ├─ settlement_groups (결제그룹: 기사보유/회사보유)
  ├─ fare_policies (요금/마일리지 정책)
  ├─ company_pay_settings (정산방식: 시급제/건별제/수수료제)
  └─ calls → rides (콜 → 운행 → 정산/마일리지/GPS)
```

---

## 🗂 테이블 카테고리

| 카테고리 | 테이블 수 | 주요 테이블 |
|---|---|---|
| 멀티테넌트 코어 | 2 | companies, users |
| 마스터 데이터 | 4 | customers, partner_companies, payment_types, settlement_groups |
| 콜 & 운행 | 3 | calls, rides, fare_policies |
| 마일리지 | 1 | customer_mileage |
| 정산 (v1) | 2 | settlements, settlement_rides |
| 정산 (v2) | 3 | company_pay_settings, rider_pay_rates, rider_attendance |
| GPS 검증 | 4 | auto_gps_tracks, manual_gps_points, gps_comparisons, gps_settings |
| 사용료/과금 | 5 | billing_plans, plan_change_history, plan_price_history, plan_seasonal_rates, app_billing |
| 권한/시스템 | 4 | role_permissions, system_settings, inquiries, audit_logs |
| 인증 | 2 | password_history, refresh_tokens |
| **합계** | **30** | |

---

## 📋 테이블별 상세 명세

### 1. 멀티테넌트 코어

#### 1.1 `companies` — 업체 (멀티테넌트 루트)
모든 데이터의 최상위 분리 단위.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **company_id** | BIGINT PK | 업체 고유 ID |
| company_code | VARCHAR(20) UQ | 업체 가입 코드 (기사 가입 시 사용, 예: "1012") |
| company_name | VARCHAR(100) | 업체명 (예: "양양대리") |
| business_number | VARCHAR(20) | 사업자등록번호 |
| ceo_name | VARCHAR(50) | 대표자명 |
| phone, email, address | | 연락처 |
| **lat, lng** | DECIMAL(10,7) | 회사 좌표 (카카오 geocoding 결과, GPS 거부 시 fallback) |
| status | ENUM | PENDING / ACTIVE / SUSPENDED / DELETED |
| approved_at, approved_by | | MASTER 승인 정보 |
| **plan_id** | BIGINT FK | 적용 요금제 (billing_plans) |
| license_type, license_expires | | 라이선스 (MONTHLY/ANNUAL) |
| **trial_expires_at** | DATETIME | 무료 체험 만료일 |
| **registration_source** | VARCHAR(20) | ADMIN(관리자등록) / SELF(셀프가입) |
| created_at, updated_at | | |

#### 1.2 `users` — 사용자
3가지 역할: MASTER (시스템 관리자), SUPER_ADMIN (업체 관리자), RIDER (기사)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **user_id** | BIGINT PK | |
| company_id | BIGINT FK NULL | 소속 업체 (MASTER는 NULL) |
| login_id | VARCHAR(50) UQ | 로그인 ID |
| password_hash | VARCHAR(255) | bcrypt 12 rounds |
| **role** | ENUM | MASTER / SUPER_ADMIN / RIDER |
| name, phone, email | | 개인 정보 |
| profile_image | VARCHAR(500) | |
| driver_license, vehicle_number, vehicle_type | | RIDER 전용 |
| status | ENUM | PENDING / ACTIVE / SUSPENDED / DELETED |
| login_fail_count, locked_until | | 계정 잠금 |
| last_login_at | | |

---

### 2. 마스터 데이터

#### 2.1 `customers` — 탑승 고객
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **customer_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| customer_code | VARCHAR(50) | 업체 내부 식별자 |
| name, phone, email, address | | |
| memo | TEXT | 관리자 메모 |
| **mileage_balance** | INT | 현재 마일리지 잔액 |
| status | ENUM | ACTIVE / INACTIVE / DELETED |

#### 2.2 `partner_companies` — 제휴업체
콜 연결처 (식당/술집/모텔 등). UI에서는 "제휴업체"로 표시.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **partner_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| **partner_code** | VARCHAR(20) | 자동 생성 코드 (예: "YANG-P001") |
| name, phone, address, contact_person | | |
| memo | TEXT | |
| status | ENUM | ACTIVE / INACTIVE |

#### 2.3 `payment_types` — 결제구분 (업체별)
업체마다 자유로운 결제구분 정의. 양양대리: 현금, 기사계좌, 회사계좌, 나라시, 미수, 카드.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **payment_type_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| code | VARCHAR(30) | 결제구분 코드 (양양대리: "001"~"006") |
| label | VARCHAR(50) | 표시명 (한글) |
| **settlement_group_id** | BIGINT FK NULL | 결제그룹 (기사보유 / 회사보유) |
| sort_order | INT | |
| is_active | BOOLEAN | |
| UQ | (company_id, code) | |

#### 2.4 `settlement_groups` — 결제그룹
각 결제구분이 속하는 그룹. 양양대리는 "기사 보유"(주황 #d97706) / "회사 보유"(녹색 #0f6e56) 2개.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **group_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| name | VARCHAR(50) | 예: "기사 보유", "회사 보유" |
| color | VARCHAR(20) | 색상 코드 |
| sort_order | INT | |
| UQ | (company_id, name) | |

---

### 3. 콜 & 운행

#### 3.1 `fare_policies` — 요금/마일리지 정책
업체별 활성 정책 1개.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **policy_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| policy_name | VARCHAR(100) | |
| base_fare, per_km_rate, per_minute_rate | DECIMAL(10,0) | 기본/거리/시간 요금 |
| night_surcharge_pct | DECIMAL(5,2) | 심야 할증률 |
| night_start_time, night_end_time | TIME | 심야 시간대 |
| company_commission_pct | DECIMAL(5,2) | 업체 수수료율 |
| platform_fee_pct | DECIMAL(5,2) | 플랫폼 수수료율 |
| **mileage_earn_pct** | DECIMAL(5,2) | 마일리지 적립률 (양양대리: 10%) |
| is_active | BOOLEAN | |
| effective_from, effective_to | DATE | |

#### 3.2 `calls` — 콜 (배차 대기 → 배정 → 운행 → 완료)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **call_id** | INT PK | |
| company_id | INT | |
| created_by | INT | 콜 생성자 (SUPER_ADMIN) |
| **status** | ENUM | WAITING / ASSIGNED / IN_PROGRESS / COMPLETED / CANCELLED |
| customer_id | INT NULL | |
| partner_id | INT NULL | |
| start_address, start_detail | | 출발지 |
| end_address, end_detail | | 도착지 (NULL 가능) |
| estimated_fare | INT | 예상 요금 |
| **payment_type_id** | BIGINT FK | 결제구분 |
| memo | VARCHAR(500) | 관리자 메모 |
| **assigned_rider_id** | INT NULL | 수락한 (또는 지명된) 기사 |
| assigned_at | DATETIME | |
| **ride_id** | INT NULL | 완료 시 연결되는 운행 |
| completed_at, cancelled_at, cancel_reason | | |

#### 3.3 `rides` — 운행 기록 (핵심 테이블)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **ride_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| **call_id** | INT NULL | 어느 콜에서 시작된 운행인지 |
| rider_id | BIGINT FK | 운행 기사 |
| **pickup_rider_id** | BIGINT FK NULL | 픽업 기사 (1대2 운행) |
| customer_id | BIGINT FK NULL | |
| partner_id | BIGINT FK NULL | |
| policy_id | BIGINT FK NULL | 적용 요금정책 |
| status | ENUM | STARTED / COMPLETED / CANCELLED / DISPUTED |
| start_address, start_detail, start_lat, start_lng | | 출발지 |
| end_address, end_detail, end_lat, end_lng | | 도착지 |
| started_at, ended_at | DATETIME | |
| auto_distance_km, manual_distance_km, final_distance_km | DECIMAL(8,2) | GPS 거리 |
| base_fare, distance_fare, time_fare, surcharge | DECIMAL(10,0) | |
| **total_fare** | DECIMAL(10,0) | 총 운임 |
| cash_amount | DECIMAL(10,0) | 현금 금액 |
| **mileage_used** | INT | 사용 마일리지 |
| **mileage_earned** | INT | 적립 마일리지 |
| final_amount | DECIMAL(10,0) | 최종 결제 금액 |
| **payment_type_id** | BIGINT FK | 결제구분 (필수) |
| **payment_method_deprecated** | VARCHAR(30) NULL | DEPRECATED 2026-04-07 (보존용) |
| commission_amount, rider_earning, platform_fee | DECIMAL(10,0) | 정산 |
| gps_verification | ENUM | MATCH / SIMILAR / MISMATCH / PENDING / N/A |
| rider_memo, admin_memo | TEXT | |

---

### 4. 마일리지

#### 4.1 `customer_mileage` — 마일리지 거래 이력
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **mileage_id** | BIGINT PK | |
| customer_id | BIGINT FK | |
| company_id | BIGINT FK | |
| **type** | ENUM | EARN / USE / EXPIRE / ADJUST |
| amount | INT | 변동 양 (+/-) |
| balance_after | INT | 거래 직후 잔액 |
| description | VARCHAR(200) | 사유 |
| ride_id | BIGINT FK NULL | 관련 운행 |
| processed_by | BIGINT FK NULL | 처리 관리자 |
| created_at | DATETIME | |

> **양양대리 마일리지 정책**: 적립률 10% (마일리지 사용분 제외), 사용 단위 5,000원

---

### 5. 정산 v1 (요약 단위)

#### 5.1 `settlements` — 기사 정산 (요약)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **settlement_id** | BIGINT PK | |
| company_id, rider_id | BIGINT FK | |
| period_start, period_end | DATE | |
| period_type | ENUM | DAILY / WEEKLY / BIWEEKLY / MONTHLY |
| total_rides, total_fare, total_commission, total_platform_fee, rider_payout | | |
| status | ENUM | DRAFT / PENDING / APPROVED / PAID / DISPUTED |
| approved_by, approved_at, paid_at | | |
| **pay_type** | ENUM NULL | HOURLY / PER_RIDE / COMMISSION (v2 추가) |
| **work_hours** | DECIMAL(7,2) NULL | 시급제 근무시간 |
| **hourly_rate, per_ride_rate, commission_pct** | | 적용 단가 |

#### 5.2 `settlement_rides` — 정산 ↔ 운행 N:M 매핑
| 컬럼 | 타입 | 설명 |
|---|---|---|
| settlement_id | BIGINT PK | |
| ride_id | BIGINT PK | |

---

### 6. 정산 v2 (정산방식 시스템)

#### 6.1 `company_pay_settings` — 업체별 정산방식
양양대리: HOURLY (시급제) 12,000원/h, ROUND_DOWN.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **id** | BIGINT PK | |
| company_id | BIGINT FK UQ | |
| **pay_type** | ENUM | HOURLY (시급제) / PER_RIDE (건별제) / COMMISSION (수수료제) |
| default_hourly_rate | INT | 기본 시급 (양양대리: 12000) |
| **min_work_policy** | ENUM | ROUND_DOWN (절삭) / ROUND_UP (올림) / ROUND_HALF (30분 반올림) / MIN_1HOUR (최소 1시간) / ACTUAL (실제 분단위) |
| default_per_ride_rate | INT | 기본 건당 단가 |
| default_commission_pct | DECIMAL(5,2) | 기본 수수료율 |

#### 6.2 `rider_pay_rates` — 기사별 개별 단가
업체 기본값과 다른 기사만 등록 (NULL이면 업체 기본값 사용).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **id** | BIGINT PK | |
| company_id, rider_id | BIGINT FK | UQ (company_id, rider_id) |
| hourly_rate | INT NULL | |
| per_ride_rate | INT NULL | |
| commission_pct | DECIMAL(5,2) NULL | |
| memo | VARCHAR(200) | 비고 (예: 경력자, 수습) |

#### 6.3 `rider_attendance` — 기사 근무시간
시급제 업체용. 두 가지 입력 모드 지원 (시각 입력 / 시간 직접 입력).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **id** | BIGINT PK | |
| company_id, rider_id | BIGINT FK | |
| work_date | DATE | |
| **clock_in** | DATETIME | 출근 시간 (NOT NULL — 직접입력 모드에서는 dummy 값) |
| clock_out | DATETIME NULL | 퇴근 시간 |
| work_minutes | INT | 실 근무 분 |
| **calculated_hours** | DECIMAL(5,2) | **정산용 시간** (직접 입력 또는 계산) |
| memo | VARCHAR(200) | |

---

### 7. GPS 검증

#### 7.1 `auto_gps_tracks` — 자동 GPS 추적
운행 중 일정 간격으로 자동 수집되는 GPS 포인트.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **auto_track_id** | BIGINT PK | |
| ride_id | BIGINT FK | |
| latitude, longitude | DECIMAL(10,7) | |
| accuracy | DECIMAL(6,1) | GPS 정확도 (m) |
| speed | DECIMAL(6,1) | 순간 속도 (km/h) |
| recorded_at | DATETIME(3) | 밀리초 정밀도 |

#### 7.2 `manual_gps_points` — 수동 GPS 입력
출발/도착/경유지 수동 입력.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **manual_point_id** | BIGINT PK | |
| ride_id | BIGINT FK | |
| point_type | ENUM | START / END / WAYPOINT |
| latitude, longitude | DECIMAL(10,7) | |
| address | VARCHAR(255) | 역지오코딩 결과 |
| input_method | ENUM | SEARCH / MAP_TAP / CURRENT_LOCATION |
| recorded_at | DATETIME | |

#### 7.3 `gps_comparisons` — GPS 비교 검증 (rides와 1:1)
자동 GPS와 수동 입력의 일치 여부 검증.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **comparison_id** | BIGINT PK | |
| ride_id | BIGINT FK UQ | |
| start_distance_m, start_result | | 출발지 검증 |
| end_distance_m, end_result | | 도착지 검증 |
| auto_total_km, manual_total_km, distance_diff_pct, distance_result | | 거리 검증 |
| actual_duration_min, expected_duration_min, time_result | | 시간 검증 |
| overall_result | ENUM | MATCH / SIMILAR / MISMATCH |
| verified_by, verified_at, admin_note | | 관리자 검토 |

#### 7.4 `gps_settings` — 업체별 GPS 설정 (companies와 1:1)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **setting_id** | BIGINT PK | |
| company_id | BIGINT FK UQ | |
| tracking_interval_sec | INT | 추적 간격 (기본 15초) |
| min_accuracy_m | INT | 최소 GPS 정확도 (기본 50m) |
| start_match_m, start_mismatch_m | INT | 출발지 일치/불일치 기준 |
| end_match_m, end_mismatch_m | INT | 도착지 일치/불일치 기준 |
| distance_normal_pct, distance_abnormal_pct | DECIMAL(5,1) | 거리 차이 기준 |
| distance_priority | ENUM | AUTO / MANUAL / HIGHER / LOWER |

---

### 8. 사용료 / 과금

#### 8.1 `billing_plans` — 요금제
4단계: 스타터 / 베이직 / 프로 / 무제한.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **plan_id** | BIGINT PK | |
| plan_name | VARCHAR(50) | |
| base_fee | INT | 월 기본료 |
| per_rider_fee | INT | 기사 1인당 월 단가 |
| free_riders | INT | 무료 포함 기사 수 |
| max_riders | INT | 최대 기사 수 (0=무제한) |
| description | VARCHAR(200) | |
| is_active | BOOLEAN | |
| **is_visible** | TINYINT(1) | SUPER_ADMIN 화면 노출 여부 (테스트요금제는 비노출) |

기본 4개 요금제:
| 요금제 | 기본료 | 기사당 | 무료 포함 | 최대 |
|---|---|---|---|---|
| 스타터 | 0원 | 10,000원 | 1명 | 5명 |
| 베이직 | 30,000원 | 5,000원 | 3명 | 20명 |
| 프로 | 50,000원 | 3,000원 | 10명 | 50명 |
| 무제한 | 100,000원 | 0원 | 0 | 무제한 |

#### 8.2 `plan_change_history` — 업체 요금제 변경 이력
#### 8.3 `plan_price_history` — 요금제 금액 변경 이력 (적용일자 기반)
#### 8.4 `plan_seasonal_rates` — 요금제 시즌별 특별가 (피크/비시즌)
#### 8.5 `app_billing` — 월별 청구
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **billing_id** | BIGINT PK | |
| company_id | BIGINT FK | |
| billing_period | VARCHAR(7) | YYYY-MM |
| total_rides, **active_riders** | INT | |
| **base_fee, rider_fee, billing_amount** | INT | 청구 상세 |
| plan_name | VARCHAR(50) | |
| status | ENUM | DRAFT / INVOICED / PAID / OVERDUE |
| invoiced_at, paid_at | DATETIME | |
| memo | VARCHAR(200) | |
| UQ | (company_id, billing_period) | |

---

### 9. 권한 / 시스템

#### 9.1 `role_permissions` — 통합 권한 관리
메뉴별 역할 접근 권한 (MASTER가 설정).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **permission_id** | BIGINT PK | |
| menu_key | VARCHAR(50) UQ | 예: rides, customers |
| menu_label | VARCHAR(50) | 표시명 |
| menu_group | VARCHAR(30) | 대시보드/운행/정산/관리 |
| platform | ENUM | WEB / MOBILE / BOTH |
| role_master, role_superadmin, role_rider | BOOLEAN | 역할별 접근 권한 |

#### 9.2 `system_settings` — 시스템 설정
MASTER가 관리하는 전역 설정.

| Key | 예시값 | 설명 |
|---|---|---|
| free_trial_days | 14 | 무료 체험 기간 |
| auto_approve_trial | false | 무료 체험 자동 승인 여부 |
| registration_enabled | true | 가입 신청 활성화 |
| payment_bank | 농협은행 | 입금 은행명 |
| payment_account | 352-1234-5678-90 | 입금 계좌번호 |
| payment_holder | 드라이브로그 | 예금주 |

#### 9.3 `inquiries` — 문의사항
SUPER_ADMIN → MASTER 문의 채널.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **id** | BIGINT PK | |
| company_id | BIGINT NULL | (MASTER 본인 등록 시 NULL 허용) |
| user_id | BIGINT | 작성자 |
| inquiry_type | ENUM | RENEWAL / UPGRADE / DOWNGRADE / GENERAL / BUG |
| title, content | | |
| status | ENUM | PENDING / IN_PROGRESS / RESOLVED / CLOSED |
| reply, replied_by, replied_at | | |

#### 9.4 `audit_logs` — 감사 로그
모든 중요 작업 기록 (로그인, CRUD, 권한 변경 등).

| 컬럼 | 타입 | 설명 |
|---|---|---|
| **log_id** | BIGINT PK | |
| company_id, user_id | BIGINT NULL | |
| action | VARCHAR(50) | 예: RIDE_CREATE, MILEAGE_ADJUST, CALL_CREATE_ASSIGN |
| target_table, target_id | | |
| detail | JSON | before/after 변경 상세 |
| ip_address, user_agent | | |

---

### 10. 인증

#### 10.1 `password_history` — 비밀번호 이력
이전 비밀번호 재사용 방지.

#### 10.2 `refresh_tokens` — JWT 리프레시 토큰
| 컬럼 | 타입 | 설명 |
|---|---|---|
| **token_id** | BIGINT PK | |
| user_id | BIGINT FK | |
| token_hash | VARCHAR(255) | |
| device_info | VARCHAR(255) | |
| expires_at | DATETIME | |

---

## 🔗 핵심 관계도 (텍스트 ERD)

```
companies (1) ─┬─ users (N)              [멀티테넌트 분리]
               ├─ customers (N)
               ├─ partner_companies (N)
               ├─ payment_types (N) ─── settlement_groups (N)
               ├─ fare_policies (N)
               ├─ company_pay_settings (1)
               ├─ gps_settings (1)
               ├─ calls (N) ────────────┐
               ├─ rides (N) ◄───────────┘ (call_id)
               ├─ customer_mileage (N)
               ├─ settlements (N)
               ├─ app_billing (N)
               └─ plan_id ──► billing_plans (1)

users (1) ─┬─ rides (rider_id, pickup_rider_id) (N)
           ├─ rider_pay_rates (1)
           ├─ rider_attendance (N)
           ├─ password_history (N)
           └─ refresh_tokens (N)

customers (1) ─┬─ rides (N)
               └─ customer_mileage (N)

rides (1) ─┬─ auto_gps_tracks (N)
           ├─ manual_gps_points (N)
           ├─ gps_comparisons (1:1)
           ├─ customer_mileage (N)
           ├─ settlement_rides (N) ─► settlements (N)
           └─ payment_type_id ──► payment_types

calls (1) ─┬─ ride_id ──► rides (1:1, 완료 시)
           └─ payment_type_id ──► payment_types
```

---

## 📊 핵심 인덱스

성능을 위해 멀티테넌트 + 시간 범위 쿼리에 맞춘 복합 인덱스:

```sql
-- 운행 조회
INDEX idx_ride_date (company_id, started_at)
INDEX idx_ride_status (company_id, status)

-- 정산
INDEX idx_settlement_period (company_id, period_start, period_end)

-- 고객 검색
INDEX idx_customer_name (company_id, name)
INDEX idx_customer_code (company_id, customer_code)

-- 콜
INDEX idx_calls_company_status (company_id, status)
INDEX idx_calls_rider (assigned_rider_id)

-- GPS
INDEX idx_gps_ride (ride_id, recorded_at)

-- 근무시간
INDEX idx_ra_company_date (company_id, work_date)
INDEX idx_ra_rider_date (rider_id, work_date)
```

---

## 🌐 데이터 흐름 — 전형적인 운행 1건

```
1. SUPER_ADMIN이 콜 생성
   → calls (status='WAITING' or 'ASSIGNED')

2. RIDER가 콜 수락 (또는 SUPER_ADMIN이 지명)
   → calls.assigned_rider_id, assigned_at, status='ASSIGNED'

3. RIDER가 운행 시작
   → rides INSERT (status='STARTED', call_id=calls.call_id)
   → manual_gps_points (START)
   → calls.status='IN_PROGRESS'

4. 운행 중 GPS 자동 수집
   → auto_gps_tracks (15초 간격)

5. RIDER가 운행 종료
   → rides UPDATE (status='COMPLETED', ended_at, total_fare 등)
   → manual_gps_points (END)
   → gps_comparisons 자동 생성 (검증)
   → customer_mileage INSERT (EARN: 적립)
   → customer_mileage INSERT (USE: 마일리지 사용 시)
   → customers.mileage_balance UPDATE
   → calls.status='COMPLETED', ride_id 연결

6. SUPER_ADMIN이 정산 (월말)
   → settlements 생성
   → settlement_rides 매핑
   → app_billing 자동 계산 (사용료)
```

---

## 📝 변경 이력 (마이그레이션 순서)

| 순서 | 마이그레이션 | 주요 변경 |
|---|---|---|
| 1 | drivelog_setup.sql | 초기 17개 테이블 (v1.5) |
| 2 | migration_inquiries / fix_inquiries | 문의사항 |
| 3 | migration_self_register | 셀프가입 + system_settings |
| 4 | migration_billing_plans | 요금제 + companies.plan_id |
| 5 | migration_plan_history | 요금제 이력 + 시즌별 특별가 |
| 6 | migration_plan_visibility | billing_plans.is_visible |
| 7 | migration_payment_info | 입금 계좌 system_settings |
| 8 | migration_partner_code | partner_code 자동 생성 |
| 9 | migration_payment_types | payment_types 테이블 |
| 10 | migration_settlement_v2 | company_pay_settings + rider_pay_rates + rider_attendance |
| 11 | migration_settlement_groups | settlement_groups 테이블 |
| 12 | migration_calls | calls 테이블 + rides.call_id |
| 13 | migration_calls_charset / collation | calls utf8mb4 + unicode_ci |
| 14 | migration_companies_lat_lng | companies.lat, lng |
| 15 | migration_permissions | role_permissions 테이블 |
| 16 | migration_rides_payment_type | rides.payment_type_id FK |
| 17 | migration_calls_payment_type | calls.payment_type_id FK |
| 18 | migration_payment_method_soft_deprecated | payment_method → payment_method_deprecated |
| 19 | migration_2026_04_08_mileage_system | customers.mileage_balance NULL → 0 |

---

## 🏢 양양대리 (company_id=3) 예시 데이터

| 항목 | 값 |
|---|---|
| company_code | 1012 |
| 정산방식 | HOURLY 12,000원/h, ROUND_DOWN |
| 마일리지 적립률 | 10% (마일리지 사용분 제외) |
| 마일리지 사용 단위 | 5,000원 |
| 좌표 | lat=38.0758, lng=128.6190 |
| 활성 기사 | 21명+ |
| 활성 고객 | 239명 |
| 마일리지 보유 고객 | 232명 (총 1,509,000원) |
| settlement_groups | 기사 보유 (#d97706) / 회사 보유 (#0f6e56) |
| payment_types | 001 현금 / 002 기사계좌 / 003 회사계좌 / 004 나라시 / 005 미수 / 006 카드 |

---

**마지막 업데이트**: 2026-04-08 (API v2.6, 30개 테이블)
