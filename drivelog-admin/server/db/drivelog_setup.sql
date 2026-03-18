-- ============================================================
-- DriveLog Database Setup - One-Stop DDL
-- Version: 1.5
-- DB: MariaDB 10.6+ / MySQL 8.0+
-- Charset: utf8mb4 (한글 + 이모지 지원)
-- 
-- 실행방법:
--   mysql -u root -p < drivelog_setup.sql
-- ============================================================

-- 1) 데이터베이스 생성
-- ============================================================
CREATE DATABASE IF NOT EXISTS drivelog_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE drivelog_db;

-- 기존 테이블 존재 시 삭제 (개발 환경용, 운영에서는 제거)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS password_history;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS gps_settings;
DROP TABLE IF EXISTS app_billing;
DROP TABLE IF EXISTS settlement_rides;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS gps_comparisons;
DROP TABLE IF EXISTS manual_gps_points;
DROP TABLE IF EXISTS auto_gps_tracks;
DROP TABLE IF EXISTS customer_mileage;
DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS fare_policies;
DROP TABLE IF EXISTS partner_companies;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 2) 테이블 생성 (FK 의존 순서)
-- ============================================================

-- ------------------------------------------------------------
-- [1/17] companies (업체 - 멀티테넌트 최상위)
-- ------------------------------------------------------------
CREATE TABLE companies (
  company_id       BIGINT       NOT NULL AUTO_INCREMENT,
  company_code     VARCHAR(20)  NOT NULL COMMENT '업체 고유 코드 (기사 가입 시 사용)',
  company_name     VARCHAR(100) NOT NULL COMMENT '업체명',
  business_number  VARCHAR(20)  NULL     COMMENT '사업자등록번호',
  ceo_name         VARCHAR(50)  NULL     COMMENT '대표자명',
  phone            VARCHAR(20)  NULL     COMMENT '대표 연락처',
  email            VARCHAR(100) NULL     COMMENT '대표 이메일',
  address          VARCHAR(255) NULL     COMMENT '업체 주소',
  status           ENUM('PENDING','ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'PENDING' COMMENT '업체 상태',
  approved_at      DATETIME     NULL     COMMENT 'MASTER 승인 일시',
  approved_by      BIGINT       NULL     COMMENT '승인 처리한 MASTER user_id',
  license_type     ENUM('MONTHLY','ANNUAL') NOT NULL DEFAULT 'MONTHLY' COMMENT '라이선스 유형',
  license_expires  DATE         NULL     COMMENT '라이선스 만료일',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (company_id),
  UNIQUE KEY uk_company_code (company_code),
  INDEX idx_company_status (status)
) ENGINE=InnoDB COMMENT='업체 (멀티테넌트 단위)';


-- ------------------------------------------------------------
-- [2/17] users (사용자 - MASTER/SUPER_ADMIN/RIDER)
-- ------------------------------------------------------------
CREATE TABLE users (
  user_id          BIGINT       NOT NULL AUTO_INCREMENT,
  company_id       BIGINT       NULL     COMMENT '소속 업체 (MASTER는 NULL)',
  login_id         VARCHAR(50)  NOT NULL COMMENT '로그인 ID',
  password_hash    VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시',
  role             ENUM('MASTER','SUPER_ADMIN','RIDER') NOT NULL COMMENT '역할',
  name             VARCHAR(50)  NOT NULL COMMENT '실명',
  phone            VARCHAR(20)  NOT NULL COMMENT '휴대폰 번호',
  email            VARCHAR(100) NULL     COMMENT '이메일',
  profile_image    VARCHAR(500) NULL     COMMENT '프로필 이미지 URL',
  driver_license   VARCHAR(30)  NULL     COMMENT '운전면허 번호 (RIDER 전용)',
  vehicle_number   VARCHAR(20)  NULL     COMMENT '차량 번호 (RIDER 전용)',
  vehicle_type     VARCHAR(50)  NULL     COMMENT '차종 (RIDER 전용)',
  status           ENUM('PENDING','ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'PENDING' COMMENT '사용자 상태',
  login_fail_count INT          NOT NULL DEFAULT 0 COMMENT '연속 로그인 실패 횟수',
  locked_until     DATETIME     NULL     COMMENT '계정 잠금 해제 시각',
  last_login_at    DATETIME     NULL     COMMENT '최근 로그인 일시',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_login_id (login_id),
  INDEX idx_user_company (company_id),
  INDEX idx_user_role (role),
  INDEX idx_user_status (status),
  CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='사용자 (MASTER/SUPER_ADMIN/RIDER)';


-- ------------------------------------------------------------
-- [3/17] customers (탑승 고객)
-- ------------------------------------------------------------
CREATE TABLE customers (
  customer_id      BIGINT       NOT NULL AUTO_INCREMENT,
  company_id       BIGINT       NOT NULL COMMENT '소속 업체',
  customer_code    VARCHAR(50)  NULL     COMMENT '고객 고유 코드 (업체 내부 식별자)',
  name             VARCHAR(50)  NOT NULL COMMENT '고객명',
  phone            VARCHAR(20)  NULL     COMMENT '연락처',
  email            VARCHAR(100) NULL     COMMENT '이메일',
  address          VARCHAR(255) NULL     COMMENT '기본 주소',
  memo             TEXT         NULL     COMMENT '관리자 메모',
  mileage_balance  INT          NOT NULL DEFAULT 0 COMMENT '현재 마일리지 잔액',
  status           ENUM('ACTIVE','INACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '고객 상태',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (customer_id),
  INDEX idx_customer_company (company_id),
  INDEX idx_customer_code (company_id, customer_code),
  INDEX idx_customer_name (company_id, name),
  CONSTRAINT fk_customer_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='탑승 고객';


-- ------------------------------------------------------------
-- [4/17] partner_companies (제휴업체 - v1.5 신규, 엑셀 '연결업체')
-- ------------------------------------------------------------
CREATE TABLE partner_companies (
  partner_id       BIGINT       NOT NULL AUTO_INCREMENT,
  company_id       BIGINT       NOT NULL COMMENT '소속 업체 (멀티테넌트)',
  name             VARCHAR(100) NOT NULL COMMENT '제휴업체명',
  phone            VARCHAR(20)  NULL     COMMENT '연락처',
  address          VARCHAR(255) NULL     COMMENT '주소',
  contact_person   VARCHAR(50)  NULL     COMMENT '담당자명',
  memo             TEXT         NULL     COMMENT '메모',
  status           ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (partner_id),
  INDEX idx_partner_company (company_id),
  INDEX idx_partner_name (company_id, name),
  CONSTRAINT fk_partner_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='제휴업체 (콜 연결 업체)';


-- ------------------------------------------------------------
-- [5/17] fare_policies (요금 정책)
-- ------------------------------------------------------------
CREATE TABLE fare_policies (
  policy_id              BIGINT        NOT NULL AUTO_INCREMENT,
  company_id             BIGINT        NOT NULL COMMENT '소속 업체',
  policy_name            VARCHAR(100)  NOT NULL COMMENT '정책 이름',
  base_fare              DECIMAL(10,0) NOT NULL DEFAULT 0 COMMENT '기본 요금 (원)',
  per_km_rate            DECIMAL(10,0) NOT NULL DEFAULT 0 COMMENT 'km당 요금 (원)',
  per_minute_rate        DECIMAL(10,0) NOT NULL DEFAULT 0 COMMENT '분당 요금 (원)',
  night_surcharge_pct    DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT '심야 할증률 (%)',
  night_start_time       TIME          NOT NULL DEFAULT '22:00:00' COMMENT '심야 시작',
  night_end_time         TIME          NOT NULL DEFAULT '06:00:00' COMMENT '심야 종료',
  company_commission_pct DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT '업체 수수료율 (%)',
  platform_fee_pct       DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT '플랫폼 수수료율 (%)',
  mileage_earn_pct       DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT '마일리지 적립률 (%)',
  is_active              BOOLEAN       NOT NULL DEFAULT TRUE COMMENT '활성 여부',
  effective_from         DATE          NOT NULL COMMENT '적용 시작일',
  effective_to           DATE          NULL     COMMENT '적용 종료일',
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (policy_id),
  INDEX idx_policy_company (company_id),
  INDEX idx_policy_active (company_id, is_active, effective_from),
  CONSTRAINT fk_policy_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='요금 정책';


-- ------------------------------------------------------------
-- [6/17] rides (운행 기록 - 핵심 테이블, v1.5 확장 포함)
-- ------------------------------------------------------------
CREATE TABLE rides (
  ride_id            BIGINT        NOT NULL AUTO_INCREMENT,
  company_id         BIGINT        NOT NULL COMMENT '소속 업체',
  rider_id           BIGINT        NOT NULL COMMENT '운행 기사 (user_id)',
  pickup_rider_id    BIGINT        NULL     COMMENT '★v1.5 픽업기사 (user_id)',
  customer_id        BIGINT        NULL     COMMENT '탑승 고객',
  partner_id         BIGINT        NULL     COMMENT '★v1.5 연결 제휴업체',
  policy_id          BIGINT        NULL     COMMENT '적용 요금 정책',
  status             ENUM('STARTED','COMPLETED','CANCELLED','DISPUTED') NOT NULL DEFAULT 'STARTED' COMMENT '운행 상태',
  
  -- 출발지
  start_address      VARCHAR(255)  NULL     COMMENT '출발지 주소 (역지오코딩)',
  start_detail       VARCHAR(255)  NULL     COMMENT '★v1.5 출발 상세주소 (상호명/건물명)',
  start_lat          DECIMAL(10,7) NULL     COMMENT '출발지 위도',
  start_lng          DECIMAL(10,7) NULL     COMMENT '출발지 경도',
  
  -- 도착지
  end_address        VARCHAR(255)  NULL     COMMENT '도착지 주소 (역지오코딩)',
  end_detail         VARCHAR(255)  NULL     COMMENT '★v1.5 도착 상세주소 (상호명/건물명)',
  end_lat            DECIMAL(10,7) NULL     COMMENT '도착지 위도',
  end_lng            DECIMAL(10,7) NULL     COMMENT '도착지 경도',
  
  -- 시간
  started_at         DATETIME      NOT NULL COMMENT '운행 시작 시각',
  ended_at           DATETIME      NULL     COMMENT '운행 종료 시각',
  
  -- 거리
  auto_distance_km   DECIMAL(8,2)  NULL     COMMENT '자동 GPS 거리 (km)',
  manual_distance_km DECIMAL(8,2)  NULL     COMMENT '수동 입력 거리 (km)',
  final_distance_km  DECIMAL(8,2)  NULL     COMMENT '정산용 최종 거리 (km)',
  
  -- 요금
  base_fare          DECIMAL(10,0) NULL     COMMENT '기본 요금',
  distance_fare      DECIMAL(10,0) NULL     COMMENT '거리 요금',
  time_fare          DECIMAL(10,0) NULL     COMMENT '시간 요금',
  surcharge          DECIMAL(10,0) NOT NULL DEFAULT 0 COMMENT '할증 (심야 등)',
  total_fare         DECIMAL(10,0) NULL     COMMENT '총 운임',
  cash_amount        DECIMAL(10,0) NULL     COMMENT '★v1.5 현금 결제 금액',
  mileage_used       INT           NOT NULL DEFAULT 0 COMMENT '사용 마일리지',
  mileage_earned     INT           NOT NULL DEFAULT 0 COMMENT '★v1.5 적립 마일리지',
  final_amount       DECIMAL(10,0) NULL     COMMENT '최종 결제 금액',
  payment_method     ENUM('CARD','CASH','TRANSFER','KAKAO_PAY') NOT NULL DEFAULT 'CASH' COMMENT '★v1.5 결제 방법',
  
  -- 정산
  commission_amount  DECIMAL(10,0) NULL     COMMENT '업체 수수료',
  rider_earning      DECIMAL(10,0) NULL     COMMENT '기사 실수령액',
  platform_fee       DECIMAL(10,0) NULL     COMMENT '플랫폼 수수료',
  
  -- GPS 검증
  gps_verification   ENUM('MATCH','SIMILAR','MISMATCH','PENDING','N/A') NOT NULL DEFAULT 'PENDING' COMMENT 'GPS 검증 결과',
  
  -- 메모
  rider_memo         TEXT          NULL     COMMENT '기사 메모',
  admin_memo         TEXT          NULL     COMMENT '관리자 메모',
  
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (ride_id),
  INDEX idx_ride_company (company_id),
  INDEX idx_ride_rider (rider_id),
  INDEX idx_ride_pickup (pickup_rider_id),
  INDEX idx_ride_customer (customer_id),
  INDEX idx_ride_partner (partner_id),
  INDEX idx_ride_date (company_id, started_at),
  INDEX idx_ride_status (company_id, status),
  CONSTRAINT fk_ride_company  FOREIGN KEY (company_id)      REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_ride_rider    FOREIGN KEY (rider_id)         REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ride_pickup   FOREIGN KEY (pickup_rider_id)  REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_ride_customer FOREIGN KEY (customer_id)      REFERENCES customers(customer_id) ON DELETE SET NULL,
  CONSTRAINT fk_ride_partner  FOREIGN KEY (partner_id)       REFERENCES partner_companies(partner_id) ON DELETE SET NULL,
  CONSTRAINT fk_ride_policy   FOREIGN KEY (policy_id)        REFERENCES fare_policies(policy_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='운행 기록 (핵심 테이블)';


-- ------------------------------------------------------------
-- [7/17] customer_mileage (마일리지 이력)
-- ------------------------------------------------------------
CREATE TABLE customer_mileage (
  mileage_id     BIGINT       NOT NULL AUTO_INCREMENT,
  customer_id    BIGINT       NOT NULL COMMENT '고객 참조',
  company_id     BIGINT       NOT NULL COMMENT '소속 업체',
  type           ENUM('EARN','USE','EXPIRE','ADJUST') NOT NULL COMMENT '변동 유형',
  amount         INT          NOT NULL COMMENT '변동 포인트 (+/-)',
  balance_after  INT          NOT NULL COMMENT '변동 후 잔액',
  description    VARCHAR(200) NULL     COMMENT '사유',
  ride_id        BIGINT       NULL     COMMENT '관련 운행',
  processed_by   BIGINT       NULL     COMMENT '처리 관리자',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (mileage_id),
  INDEX idx_mileage_customer (customer_id),
  INDEX idx_mileage_company (company_id),
  INDEX idx_mileage_ride (ride_id),
  CONSTRAINT fk_mileage_customer  FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_mileage_company   FOREIGN KEY (company_id)  REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_mileage_ride      FOREIGN KEY (ride_id)     REFERENCES rides(ride_id) ON DELETE SET NULL,
  CONSTRAINT fk_mileage_processor FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='마일리지 이력';


-- ------------------------------------------------------------
-- [8/17] auto_gps_tracks (자동 GPS 추적)
-- ------------------------------------------------------------
CREATE TABLE auto_gps_tracks (
  auto_track_id  BIGINT        NOT NULL AUTO_INCREMENT,
  ride_id        BIGINT        NOT NULL COMMENT '운행 기록 참조',
  latitude       DECIMAL(10,7) NOT NULL COMMENT '위도',
  longitude      DECIMAL(10,7) NOT NULL COMMENT '경도',
  accuracy       DECIMAL(6,1)  NULL     COMMENT 'GPS 정확도 (미터)',
  speed          DECIMAL(6,1)  NULL     COMMENT '순간 속도 (km/h)',
  recorded_at    DATETIME(3)   NOT NULL COMMENT '기록 시각 (밀리초)',
  
  PRIMARY KEY (auto_track_id),
  INDEX idx_gps_ride (ride_id, recorded_at),
  CONSTRAINT fk_gps_track_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='자동 GPS 추적';


-- ------------------------------------------------------------
-- [9/17] manual_gps_points (수동 GPS 입력)
-- ------------------------------------------------------------
CREATE TABLE manual_gps_points (
  manual_point_id BIGINT        NOT NULL AUTO_INCREMENT,
  ride_id         BIGINT        NOT NULL COMMENT '운행 기록 참조',
  point_type      ENUM('START','END','WAYPOINT') NOT NULL COMMENT '지점 유형',
  latitude        DECIMAL(10,7) NOT NULL COMMENT '위도',
  longitude       DECIMAL(10,7) NOT NULL COMMENT '경도',
  address         VARCHAR(255)  NULL     COMMENT '주소 (역지오코딩 결과)',
  input_method    ENUM('SEARCH','MAP_TAP','CURRENT_LOCATION') NOT NULL COMMENT '입력 방식',
  recorded_at     DATETIME      NOT NULL COMMENT '입력 시각',
  
  PRIMARY KEY (manual_point_id),
  INDEX idx_manual_ride (ride_id),
  CONSTRAINT fk_manual_point_ride FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='수동 GPS 입력';


-- ------------------------------------------------------------
-- [10/17] gps_comparisons (GPS 비교 검증, rides와 1:1)
-- ------------------------------------------------------------
CREATE TABLE gps_comparisons (
  comparison_id         BIGINT       NOT NULL AUTO_INCREMENT,
  ride_id               BIGINT       NOT NULL COMMENT '운행 기록 (1:1)',
  start_distance_m      DECIMAL(10,1) NULL   COMMENT '출발지 좌표 간 거리 (m)',
  start_result          ENUM('MATCH','SIMILAR','MISMATCH') NULL,
  end_distance_m        DECIMAL(10,1) NULL   COMMENT '도착지 좌표 간 거리 (m)',
  end_result            ENUM('MATCH','SIMILAR','MISMATCH') NULL,
  auto_total_km         DECIMAL(8,2)  NULL   COMMENT '자동 GPS 경로 총 거리',
  manual_total_km       DECIMAL(8,2)  NULL   COMMENT '수동 입력 지점 간 직선 거리',
  distance_diff_pct     DECIMAL(5,1)  NULL   COMMENT '거리 차이 (%)',
  distance_result       ENUM('NORMAL','CAUTION','ABNORMAL') NULL,
  actual_duration_min   DECIMAL(8,1)  NULL   COMMENT '실제 소요시간 (분)',
  expected_duration_min DECIMAL(8,1)  NULL   COMMENT '예상 소요시간 (분)',
  time_result           ENUM('NORMAL','CAUTION','ABNORMAL') NULL,
  overall_result        ENUM('MATCH','SIMILAR','MISMATCH') NOT NULL DEFAULT 'MATCH' COMMENT '종합 검증',
  verified_by           BIGINT       NULL    COMMENT '검증 확인 관리자',
  verified_at           DATETIME     NULL    COMMENT '관리자 확인 일시',
  admin_note            TEXT         NULL    COMMENT '관리자 코멘트',
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (comparison_id),
  UNIQUE KEY uk_comparison_ride (ride_id),
  CONSTRAINT fk_comparison_ride     FOREIGN KEY (ride_id)     REFERENCES rides(ride_id) ON DELETE CASCADE,
  CONSTRAINT fk_comparison_verifier FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='GPS 비교 검증';


-- ------------------------------------------------------------
-- [11/17] settlements (기사 정산)
-- ------------------------------------------------------------
CREATE TABLE settlements (
  settlement_id      BIGINT        NOT NULL AUTO_INCREMENT,
  company_id         BIGINT        NOT NULL COMMENT '업체',
  rider_id           BIGINT        NOT NULL COMMENT '정산 대상 기사',
  period_start       DATE          NOT NULL COMMENT '정산 시작일',
  period_end         DATE          NOT NULL COMMENT '정산 종료일',
  period_type        ENUM('DAILY','WEEKLY','BIWEEKLY','MONTHLY') NOT NULL DEFAULT 'WEEKLY',
  total_rides        INT           NOT NULL DEFAULT 0 COMMENT '운행 건수',
  total_fare         DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT '총 운임 합계',
  total_commission   DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT '업체 수수료 합계',
  total_platform_fee DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT '플랫폼 수수료 합계',
  rider_payout       DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT '기사 실지급액',
  status             ENUM('DRAFT','PENDING','APPROVED','PAID','DISPUTED') NOT NULL DEFAULT 'DRAFT',
  approved_by        BIGINT       NULL     COMMENT '승인 관리자',
  approved_at        DATETIME     NULL     COMMENT '승인 일시',
  paid_at            DATETIME     NULL     COMMENT '지급 완료 일시',
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (settlement_id),
  INDEX idx_settlement_company (company_id),
  INDEX idx_settlement_rider (rider_id),
  INDEX idx_settlement_period (company_id, period_start, period_end),
  CONSTRAINT fk_settlement_company  FOREIGN KEY (company_id)  REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement_rider    FOREIGN KEY (rider_id)    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement_approver FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='기사 정산';


-- ------------------------------------------------------------
-- [12/17] settlement_rides (정산-운행 N:M 매핑)
-- ------------------------------------------------------------
CREATE TABLE settlement_rides (
  settlement_id  BIGINT NOT NULL,
  ride_id        BIGINT NOT NULL,
  
  PRIMARY KEY (settlement_id, ride_id),
  CONSTRAINT fk_sr_settlement FOREIGN KEY (settlement_id) REFERENCES settlements(settlement_id) ON DELETE CASCADE,
  CONSTRAINT fk_sr_ride       FOREIGN KEY (ride_id)       REFERENCES rides(ride_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='정산-운행 매핑';


-- ------------------------------------------------------------
-- [13/17] app_billing (앱 사용료)
-- ------------------------------------------------------------
CREATE TABLE app_billing (
  billing_id     BIGINT        NOT NULL AUTO_INCREMENT,
  company_id     BIGINT        NOT NULL COMMENT '청구 대상 업체',
  billing_period VARCHAR(7)    NOT NULL COMMENT '청구 월 (YYYY-MM)',
  total_rides    INT           NOT NULL DEFAULT 0 COMMENT '해당 월 운행 건수',
  billing_amount DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT '청구 금액',
  status         ENUM('DRAFT','INVOICED','PAID','OVERDUE') NOT NULL DEFAULT 'DRAFT',
  invoiced_at    DATETIME      NULL     COMMENT '청구서 발행일',
  paid_at        DATETIME      NULL     COMMENT '결제 완료일',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (billing_id),
  UNIQUE KEY uk_billing_period (company_id, billing_period),
  CONSTRAINT fk_billing_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='앱 사용료';


-- ------------------------------------------------------------
-- [14/17] gps_settings (업체별 GPS 설정, companies와 1:1)
-- ------------------------------------------------------------
CREATE TABLE gps_settings (
  setting_id            BIGINT       NOT NULL AUTO_INCREMENT,
  company_id            BIGINT       NOT NULL COMMENT '업체 (1:1)',
  tracking_interval_sec INT          NOT NULL DEFAULT 15 COMMENT '추적 간격 (초)',
  min_accuracy_m        INT          NOT NULL DEFAULT 50 COMMENT '최소 GPS 정확도 (미터)',
  start_match_m         INT          NOT NULL DEFAULT 500 COMMENT '출발지 일치 기준 (미터)',
  start_mismatch_m      INT          NOT NULL DEFAULT 2000 COMMENT '출발지 불일치 기준 (미터)',
  end_match_m           INT          NOT NULL DEFAULT 500 COMMENT '도착지 일치 기준',
  end_mismatch_m        INT          NOT NULL DEFAULT 2000 COMMENT '도착지 불일치 기준',
  distance_normal_pct   DECIMAL(5,1) NOT NULL DEFAULT 20.0 COMMENT '거리 정상 기준 (%)',
  distance_abnormal_pct DECIMAL(5,1) NOT NULL DEFAULT 50.0 COMMENT '거리 이상 기준 (%)',
  distance_priority     ENUM('AUTO','MANUAL','HIGHER','LOWER') NOT NULL DEFAULT 'AUTO' COMMENT '정산 거리 우선순위',
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (setting_id),
  UNIQUE KEY uk_gps_company (company_id),
  CONSTRAINT fk_gps_setting_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='GPS 설정';


-- ------------------------------------------------------------
-- [15/17] audit_logs (감사 로그)
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  log_id       BIGINT       NOT NULL AUTO_INCREMENT,
  company_id   BIGINT       NULL     COMMENT '관련 업체',
  user_id      BIGINT       NULL     COMMENT '수행 사용자',
  action       VARCHAR(50)  NOT NULL COMMENT '작업 유형',
  target_table VARCHAR(50)  NULL     COMMENT '대상 테이블',
  target_id    BIGINT       NULL     COMMENT '대상 레코드 ID',
  detail       JSON         NULL     COMMENT '변경 상세 (before/after)',
  ip_address   VARCHAR(45)  NULL     COMMENT 'IP 주소',
  user_agent   VARCHAR(500) NULL     COMMENT 'User Agent',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (log_id),
  INDEX idx_audit_company (company_id),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_date (created_at)
) ENGINE=InnoDB COMMENT='감사 로그';


-- ------------------------------------------------------------
-- [16/17] password_history (비밀번호 이력)
-- ------------------------------------------------------------
CREATE TABLE password_history (
  history_id    BIGINT       NOT NULL AUTO_INCREMENT,
  user_id       BIGINT       NOT NULL COMMENT '사용자 참조',
  password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (history_id),
  INDEX idx_pw_user (user_id),
  CONSTRAINT fk_pw_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='비밀번호 이력';


-- ------------------------------------------------------------
-- [17/17] refresh_tokens (리프레시 토큰)
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
  token_id    BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL COMMENT '사용자 참조',
  token_hash  VARCHAR(255) NOT NULL COMMENT '리프레시 토큰 해시',
  device_info VARCHAR(255) NULL     COMMENT '디바이스 정보',
  expires_at  DATETIME     NOT NULL COMMENT '만료 시각',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (token_id),
  INDEX idx_token_user (user_id),
  INDEX idx_token_expires (expires_at),
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='리프레시 토큰';


-- ============================================================
-- 3) 초기 시드 데이터 (개발/테스트용)
-- ============================================================

-- MASTER 계정 (비밀번호: Admin123! → bcrypt hash)
INSERT INTO users (login_id, password_hash, role, name, phone, email, status)
VALUES ('admin', '$2b$12$LJ3m4ys3Gkl0TdXHmKdq3eKxqM7bARSrOhv8aYGDBmYV9Rk1FCXi2', 'MASTER', '시스템관리자', '010-0000-0000', 'admin@drivelog.co.kr', 'ACTIVE');

-- 데모 업체
INSERT INTO companies (company_code, company_name, ceo_name, phone, status, approved_at, approved_by)
VALUES ('YANGYANG01', '양양대리', '김사장', '033-672-0000', 'ACTIVE', NOW(), 1);

-- 데모 기사 (비밀번호: Driver123!)
INSERT INTO users (company_id, login_id, password_hash, role, name, phone, vehicle_number, status) VALUES
(1, 'rider_son', '$2b$12$LJ3m4ys3Gkl0TdXHmKdq3eKxqM7bARSrOhv8aYGDBmYV9Rk1FCXi2', 'RIDER', '손영만', '010-1111-1111', '강원 11가 1111', 'ACTIVE'),
(1, 'rider_lim', '$2b$12$LJ3m4ys3Gkl0TdXHmKdq3eKxqM7bARSrOhv8aYGDBmYV9Rk1FCXi2', 'RIDER', '임창빈', '010-2222-2222', '강원 22나 2222', 'ACTIVE'),
(1, 'rider_lee', '$2b$12$LJ3m4ys3Gkl0TdXHmKdq3eKxqM7bARSrOhv8aYGDBmYV9Rk1FCXi2', 'RIDER', '이성일', '010-3333-3333', '강원 33다 3333', 'ACTIVE');

-- SuperAdmin (비밀번호: Admin123!)
INSERT INTO users (company_id, login_id, password_hash, role, name, phone, status)
VALUES (1, 'sa_yang', '$2b$12$LJ3m4ys3Gkl0TdXHmKdq3eKxqM7bARSrOhv8aYGDBmYV9Rk1FCXi2', 'SUPER_ADMIN', '김사장', '033-672-0000', 'ACTIVE');

-- GPS 설정 (양양대리 기본)
INSERT INTO gps_settings (company_id) VALUES (1);

-- 요금 정책
INSERT INTO fare_policies (company_id, policy_name, mileage_earn_pct, is_active, effective_from)
VALUES (1, '기본 요금 (마일리지 10%)', 10.00, TRUE, '2025-01-01');

-- 데모 제휴업체 (엑셀 데이터 기반)
INSERT INTO partner_companies (company_id, name, phone) VALUES
(1, '카오스', '010-3459-2360'),
(1, '정균', NULL),
(1, '다래횟집', NULL),
(1, '녹원갈비', NULL),
(1, '크리스탈', NULL),
(1, '박정균', NULL),
(1, '발리', NULL),
(1, '한우랑송이랑', NULL),
(1, '시골마당', NULL),
(1, '38횟집', NULL);

-- 데모 고객 (엑셀 데이터 기반)
INSERT INTO customers (company_id, customer_code, name, phone) VALUES
(1, '나라시', '나라시', NULL),
(1, '상광정9702', '상광정', '010-9220-9702'),
(1, '카카오', '카카오', NULL),
(1, '고현순', '고현순', NULL),
(1, '그린막국수', '그린막국수', NULL),
(1, '김영삼', '김영삼', NULL);


-- ============================================================
-- 4) 확인
-- ============================================================
SELECT 
  TABLE_NAME AS '테이블',
  TABLE_ROWS AS '예상행수',
  TABLE_COMMENT AS '설명'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'drivelog_db'
ORDER BY CREATE_TIME;
