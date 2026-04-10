#!/bin/bash
# ============================================================
# DriveLog 자동 백업 스크립트 (날짜별 폴더 구조)
# ------------------------------------------------------------
# 스크립트 위치: /volume1/docker/drivelog/drivelog_backup.sh
# 백업 루트:    /volume1/docker/drivelog/backup/
# 백업 구조:    backup/backup_YYYYMMDD/drivelog_db_YYYYMMDD_HHMMSS.sql.gz
# 로그 파일:    backup/backup.log
# 권한:         chmod +x /volume1/docker/drivelog/drivelog_backup.sh
# 실행:         DSM 작업 스케줄러 (매일 03:00, root)
# 작성:         2026-04-10
# ============================================================

set -e  # 에러 발생 시 즉시 종료
set -u  # 정의 안 된 변수 사용 시 종료

# DSM 작업 스케줄러는 PATH가 비어 있어서 명시적 설정 필요
export PATH="/usr/local/bin:/usr/bin:/bin:/sbin:/usr/sbin:$PATH"

# ─── 설정 ───
BACKUP_ROOT="/volume1/docker/drivelog/backup"
DB_CONTAINER="drivelog-db"
DB_NAME="drivelog_db"
DB_USER="root"
DB_PASS="Drivelog12!@"
RETENTION_DAYS=14         # 14일 이상 된 백업 폴더 자동 삭제
LOG_FILE="${BACKUP_ROOT}/backup.log"

# ─── 함수: 로그 기록 ───
log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  echo "$msg" | tee -a "$LOG_FILE"
}

log_error() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
  echo "$msg" | tee -a "$LOG_FILE" >&2
}

# ─── 시작 ───
log "=========================================="
log "DriveLog 백업 시작"

# 1. 백업 루트 존재 확인 (없으면 생성)
if [ ! -d "$BACKUP_ROOT" ]; then
  mkdir -p "$BACKUP_ROOT" || {
    log_error "백업 루트 생성 실패: $BACKUP_ROOT"
    exit 1
  }
  log "백업 루트 생성: $BACKUP_ROOT"
fi

# 2. 컨테이너 실행 중인지 확인
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  log_error "DB 컨테이너 실행 중 아님: $DB_CONTAINER"
  exit 1
fi

# 3. 오늘 날짜 폴더 생성 (이미 있으면 그대로 사용)
DATE=$(date +%Y%m%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAILY_DIR="${BACKUP_ROOT}/backup_${DATE}"

if [ ! -d "$DAILY_DIR" ]; then
  mkdir -p "$DAILY_DIR" || {
    log_error "일자별 폴더 생성 실패: $DAILY_DIR"
    exit 1
  }
  log "일자별 폴더 생성: backup_${DATE}"
else
  log "기존 일자별 폴더 사용: backup_${DATE}"
fi

BACKUP_FILE="${DAILY_DIR}/drivelog_db_${TIMESTAMP}.sql.gz"
TEMP_FILE="${DAILY_DIR}/drivelog_db_${TIMESTAMP}.sql.tmp"

# 4. 디스크 여유 공간 체크 (최소 500MB 필요)
AVAILABLE_KB=$(df "$BACKUP_ROOT" | tail -1 | awk '{print $4}')
AVAILABLE_MB=$((AVAILABLE_KB / 1024))
if [ "$AVAILABLE_MB" -lt 500 ]; then
  log_error "디스크 여유 공간 부족: ${AVAILABLE_MB}MB (최소 500MB 필요)"
  log "오래된 백업 폴더 강제 삭제 시도..."
  find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;
  AVAILABLE_KB=$(df "$BACKUP_ROOT" | tail -1 | awk '{print $4}')
  AVAILABLE_MB=$((AVAILABLE_KB / 1024))
  if [ "$AVAILABLE_MB" -lt 500 ]; then
    log_error "정리 후에도 공간 부족. 백업 중단."
    exit 1
  fi
fi
log "디스크 여유: ${AVAILABLE_MB}MB"

# 5. mariadb-dump 실행
log "DB 덤프 실행 중..."
if docker exec "$DB_CONTAINER" mariadb-dump \
  -u"$DB_USER" -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --quick \
  "$DB_NAME" > "$TEMP_FILE" 2>> "$LOG_FILE"; then

  # 6. 덤프 파일 검증 (마지막 줄에 "Dump completed" 있어야 정상)
  if tail -1 "$TEMP_FILE" | grep -q "Dump completed"; then
    log "덤프 파일 검증 OK"
  else
    log_error "덤프 파일 무결성 검증 실패 (Dump completed 마커 없음)"
    rm -f "$TEMP_FILE"
    exit 1
  fi

  # 7. 압축
  log "gzip 압축 중..."
  if gzip -9 "$TEMP_FILE"; then
    mv "${TEMP_FILE}.gz" "$BACKUP_FILE"
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    log "백업 완료: backup_${DATE}/$(basename "$BACKUP_FILE") (${BACKUP_SIZE})"
  else
    log_error "gzip 압축 실패"
    rm -f "$TEMP_FILE" "${TEMP_FILE}.gz"
    exit 1
  fi
else
  log_error "mariadb-dump 실행 실패"
  rm -f "$TEMP_FILE"
  exit 1
fi

# 8. 오래된 백업 폴더 삭제 (보관 기간 초과)
log "오래된 백업 폴더 정리 중 (${RETENTION_DAYS}일 초과)..."
DELETED_COUNT=0
while IFS= read -r OLD_DIR; do
  if [ -n "$OLD_DIR" ]; then
    log "  삭제: $(basename "$OLD_DIR")"
    rm -rf "$OLD_DIR"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  fi
done < <(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" -mtime +${RETENTION_DAYS})

if [ "$DELETED_COUNT" -gt 0 ]; then
  log "삭제된 백업 폴더: ${DELETED_COUNT}개"
else
  log "삭제할 오래된 백업 없음"
fi

# 9. 현재 백업 통계
TOTAL_DIRS=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" | wc -l)
TOTAL_FILES=$(find "$BACKUP_ROOT" -name "drivelog_db_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" | awk '{print $1}')
log "현재 보유: ${TOTAL_DIRS}개 폴더 / ${TOTAL_FILES}개 파일 / 총 ${TOTAL_SIZE}"

log "DriveLog 백업 종료"
log "=========================================="
exit 0
