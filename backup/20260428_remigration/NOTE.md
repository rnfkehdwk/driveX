# 2026-04-28 재 마이그레이션 백업 노트

## 백업 대상
- `drivelog-admin/server/db/migration_full_data_v3.sql` (4/15 작성, 1,224건)
  → 직접 복사 명령:
  ```bash
  cp C:\Drivelog\drivelog-admin\server\db\migration_full_data_v3.sql \
     C:\Drivelog\backup\20260428_remigration\migration_full_data_v3_BEFORE.sql
  ```

## 새 작성 파일
- `drivelog-admin/server/db/migration_full_data_20260428.sql` — 4/28 기준 전체 재 마이그
- `drivelog-admin/server/db/cleanup_before_migration_20260428.sql` — 기존 데이터 삭제

## 원본 데이터
- `데이터_마이그레이션2.xlsx` (사장님이 4/28에 제공)
  - 운행일지: 177건 (No 1252~1429, 3/24~4/28)
  - 고객: 274명 + 누적 마일리지 잔액
