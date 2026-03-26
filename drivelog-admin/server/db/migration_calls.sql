-- ========================================
-- DriveLog 콜 시스템 마이그레이션 (FK 없는 안전 버전)
-- FK 제약 없이 테이블 먼저 생성, 인덱스로 성능 확보
-- ========================================

-- 콜 테이블
CREATE TABLE IF NOT EXISTS calls (
  call_id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  created_by INT NOT NULL COMMENT '콜 생성자 (SUPER_ADMIN)',
  status ENUM('WAITING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'WAITING',

  -- 콜 정보
  customer_id INT NULL,
  partner_id INT NULL,
  start_address VARCHAR(500) NULL,
  start_detail VARCHAR(200) NULL,
  end_address VARCHAR(500) NULL COMMENT 'NULL이면 미정',
  end_detail VARCHAR(200) NULL,
  estimated_fare INT NULL COMMENT '예상 요금',
  payment_method VARCHAR(20) DEFAULT 'CASH',
  memo VARCHAR(500) NULL COMMENT '관리자 메모',

  -- 배정 정보
  assigned_rider_id INT NULL COMMENT '수락한 기사',
  assigned_at DATETIME NULL,

  -- 완료 정보
  ride_id INT NULL COMMENT '연결된 운행일지',
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancel_reason VARCHAR(200) NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_calls_company_status (company_id, status),
  INDEX idx_calls_rider (assigned_rider_id),
  INDEX idx_calls_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- rides 테이블에 call_id 컬럼 추가
ALTER TABLE rides ADD COLUMN call_id INT NULL AFTER ride_id;
ALTER TABLE rides ADD INDEX idx_rides_call (call_id);
