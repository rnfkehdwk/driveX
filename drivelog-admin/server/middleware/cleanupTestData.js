// server/middleware/cleanupTestData.js
// 검증용 테스트 데이터 자동 정리 작업
//
// (middleware 폴더에 두지만 middleware는 아니고 background job임 — 별도 jobs 폴더 대신 여기 둠)
//
// 실행 주기: 24시간마다 1회
// 정리 대상:
//   - calls 중 memo/start_address에 "[자동검증]" 또는 "검증" 포함 + 14일 경과
//   - 위 calls와 연결된 rides 중 rider_memo에 동일 키워드 포함 + 14일 경과
//
// 안전장치:
//   - 14일 이내 데이터는 절대 건드리지 않음 (실수로 만든 운영 콜 보호)
//   - 트랜잭션 처리
//   - 한 번에 최대 100건만 처리

const { pool } = require('../config/database');

const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24시간
const RETENTION_DAYS = 14;
const MAX_PER_RUN = 100;

async function cleanupTestData() {
  const startedAt = new Date().toISOString();
  console.log(`[cleanupTestData] start at ${startedAt} (retention: ${RETENTION_DAYS}d, max: ${MAX_PER_RUN})`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 정리 대상 콜 조회
    const [targetCalls] = await conn.execute(
      `SELECT call_id, memo, start_address, created_at, ride_id
       FROM calls
       WHERE (
         memo LIKE '%[자동검증]%' OR memo LIKE '%검증%'
         OR start_address LIKE '%검증%' OR start_address LIKE '%[자동검증]%'
       )
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY created_at ASC
       LIMIT ?`,
      [RETENTION_DAYS, MAX_PER_RUN]
    );

    if (targetCalls.length === 0) {
      console.log('[cleanupTestData] no test calls to delete');
      await conn.commit();
      return { deleted_calls: 0, deleted_rides: 0 };
    }

    const callIds = targetCalls.map(c => c.call_id);
    const linkedRideIds = targetCalls.map(c => c.ride_id).filter(Boolean);

    // 2. 콜에 연결된 ride 중 검증용으로 보이는 것만 삭제 (보수적)
    let deletedRides = 0;
    if (linkedRideIds.length > 0) {
      const placeholders = linkedRideIds.map(() => '?').join(',');
      const [rideResult] = await conn.execute(
        `DELETE FROM rides
         WHERE ride_id IN (${placeholders})
         AND (rider_memo LIKE '%[자동검증]%' OR rider_memo LIKE '%검증%')
         AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [...linkedRideIds, RETENTION_DAYS]
      );
      deletedRides = rideResult.affectedRows || 0;
    }

    // 3. 콜 삭제
    const placeholders = callIds.map(() => '?').join(',');
    const [callResult] = await conn.execute(
      `DELETE FROM calls WHERE call_id IN (${placeholders})`,
      callIds
    );
    const deletedCalls = callResult.affectedRows || 0;

    await conn.commit();

    console.log(`[cleanupTestData] deleted ${deletedCalls} calls, ${deletedRides} rides`);
    console.log(`[cleanupTestData] target call_ids: ${callIds.join(', ')}`);

    // audit_logs에 기록 (스키마 호환되면)
    try {
      await pool.execute(
        `INSERT INTO audit_logs (user_id, action, target_table, detail, created_at)
         VALUES (NULL, 'AUTO_CLEANUP_TEST_DATA', 'calls', ?, NOW())`,
        [JSON.stringify({ deleted_calls: deletedCalls, deleted_rides: deletedRides, call_ids: callIds })]
      );
    } catch (e) {
      console.warn('[cleanupTestData] audit log insert skipped:', e.message);
    }

    return { deleted_calls: deletedCalls, deleted_rides: deletedRides };
  } catch (err) {
    await conn.rollback();
    console.error('[cleanupTestData] error:', err.message);
    return { error: err.message };
  } finally {
    conn.release();
  }
}

// 스케줄러 시작 — index.js에서 한 번만 호출
let intervalHandle = null;
function startCleanupScheduler() {
  if (intervalHandle) return;

  // 서버 시작 30초 후 첫 실행 (DB 연결 안정화 대기)
  setTimeout(() => {
    cleanupTestData().catch(err => console.error('[cleanupTestData] initial run failed:', err));
  }, 30 * 1000);

  // 이후 24시간마다 실행
  intervalHandle = setInterval(() => {
    cleanupTestData().catch(err => console.error('[cleanupTestData] scheduled run failed:', err));
  }, RUN_INTERVAL_MS);

  console.log(`[cleanupTestData] scheduler started (every ${RUN_INTERVAL_MS / 1000 / 60 / 60}h, retention ${RETENTION_DAYS}d)`);
}

function stopCleanupScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { cleanupTestData, startCleanupScheduler, stopCleanupScheduler };
