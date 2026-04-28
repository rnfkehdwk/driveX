-- ========================================
-- DriveLog: calls 테이블에 위경도(lat/lng) 컬럼 추가
-- 작성: 2026-04-28
-- 목적: 콜 생성 시 카카오 주소 검색으로 얻은 좌표를 저장 → 콜 → 운행기록 변환 시 자동으로 출발/도착 위치 입력
-- ========================================

ALTER TABLE calls
  ADD COLUMN start_lat DECIMAL(10, 7) NULL AFTER start_detail,
  ADD COLUMN start_lng DECIMAL(10, 7) NULL AFTER start_lat,
  ADD COLUMN end_lat DECIMAL(10, 7) NULL AFTER end_detail,
  ADD COLUMN end_lng DECIMAL(10, 7) NULL AFTER end_lat;

-- 검증
SELECT
  COUNT(*) AS total_calls,
  SUM(CASE WHEN start_lat IS NOT NULL THEN 1 ELSE 0 END) AS with_start_coord,
  SUM(CASE WHEN end_lat IS NOT NULL THEN 1 ELSE 0 END) AS with_end_coord
FROM calls;
