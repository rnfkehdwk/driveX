// ============================================================
// E2E 검증 데이터 정리 스크립트
//
// 식별 기준: TAG = '[E2E_VERIFY_20260429]' 가 들어간 데이터
//
// 정리 순서 (외래키 의존성 + 마일리지 잔액 원복 고려):
//   1. 검증 ride_id 목록 조회 (rides.rider_memo LIKE '%TAG%')
//   2. 각 ride_id에 묶인 customer_mileage 거래 조회 (USE + EARN)
//   3. 고객별 잔액 원복 계산: balance += USE - EARN  (역방향)
//      = 고객 잔액에서 EARN 만큼 빼고 USE 만큼 더함
//   4. customers.mileage_balance UPDATE (원복)
//   5. customer_mileage DELETE (검증 거래만)
//   6. calls 의 ride_id 연결 끊기 (FK가 ride 가리키므로)
//   7. rides DELETE
//   8. calls DELETE (memo LIKE '%TAG%')
//   9. audit_logs DELETE (detail LIKE '%TAG%' 또는 e2e_verify=true)
//
// 안전장치:
//   - dry-run 모드 (AUTO_CONFIRM 없으면): 삭제할 데이터 카운트만 표시
//   - 트랜잭션으로 묶어서 한 건이라도 실패하면 전체 롤백
//   - 실행 전 사용자에게 영향 받는 고객 목록 + 잔액 변동 표시
//
// 실행:
//   sudo docker exec -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
//   (확인 후:) sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js
//
// 작성일: 2026-04-29
// ============================================================

const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); } catch (e) {}
const { pool } = require('../../config/database');

const TAG = '[E2E_VERIFY_20260429]';

const C = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  const conn = await pool.getConnection();
  try {
    console.log(`\n${C.bold('🧹 E2E 검증 데이터 정리')}`);
    console.log(`태그: ${TAG}\n`);

    // ─── 1. 정리 대상 조회 ───
    const [rides] = await conn.execute(
      `SELECT r.ride_id, r.customer_id, r.mileage_used, r.mileage_earned,
              c.name AS customer_name, c.mileage_balance AS current_balance
       FROM rides r
       LEFT JOIN customers c ON r.customer_id = c.customer_id
       WHERE r.rider_memo LIKE ?`,
      [`%${TAG}%`]
    );

    const [calls] = await conn.execute(
      'SELECT call_id, status FROM calls WHERE memo LIKE ?',
      [`%${TAG}%`]
    );

    // 검증용으로 생성된 신규 고객 (이름에 TAG 포함) — 4-29 22:30 추가
    const [verifyCustomers] = await conn.execute(
      'SELECT customer_id, name, mileage_balance FROM customers WHERE name LIKE ?',
      [`%${TAG}%`]
    );

    // 검증 거래 (rides에 묶인 것 + 혹시 ride 없이 남은 것까지 description으로 잡음)
    let mileageWhere = `description LIKE ?`;
    let mileageParams = [`%${TAG}%`];
    if (rides.length > 0) {
      const placeholders = rides.map(() => '?').join(',');
      mileageWhere = `(description LIKE ? OR ride_id IN (${placeholders}))`;
      mileageParams = [`%${TAG}%`, ...rides.map(r => r.ride_id)];
    }
    const [mileageTxns] = await conn.execute(
      `SELECT mileage_id, customer_id, type, amount, ride_id, description FROM customer_mileage WHERE ${mileageWhere}`,
      mileageParams
    );

    const [auditLogs] = await conn.execute(
      `SELECT log_id, action, target_id FROM audit_logs WHERE detail LIKE ?`,
      [`%e2e_verify%`]
    );

    // ─── 2. 고객별 잔액 원복 계산 ───
    // 원복 로직: 검증 거래만 무효화 = 거래 발생 전 잔액으로 복구
    //   USE 거래 (잔액에서 amount 차감) → 원복: amount 더함
    //   EARN 거래 (잔액에 amount 가산) → 원복: amount 뺌
    //   따라서 원복량 = SUM(USE 금액) - SUM(EARN 금액)
    const customerAdjustments = {};
    for (const tx of mileageTxns) {
      if (!customerAdjustments[tx.customer_id]) {
        customerAdjustments[tx.customer_id] = { use: 0, earn: 0 };
      }
      if (tx.type === 'USE') customerAdjustments[tx.customer_id].use += Number(tx.amount);
      else if (tx.type === 'EARN') customerAdjustments[tx.customer_id].earn += Number(tx.amount);
    }

    // ─── 3. 사전 리포트 ───
    console.log(`${C.cyan('━━━ 정리 대상 ━━━')}`);
    console.log(`  rides:              ${rides.length}건`);
    console.log(`  calls:              ${calls.length}건`);
    console.log(`  customer_mileage:   ${mileageTxns.length}건`);
    console.log(`  audit_logs:         ${auditLogs.length}건`);
    console.log(`  verify_customers:   ${verifyCustomers.length}건 (TAG 포함 신규 고객)`);
    if (verifyCustomers.length > 0) {
      verifyCustomers.forEach(c => console.log(`    - ${c.name} (id=${c.customer_id}, 잔액 ${Number(c.mileage_balance).toLocaleString()}원)`));
    }

    if (Object.keys(customerAdjustments).length > 0) {
      console.log(`\n${C.cyan('━━━ 마일리지 잔액 원복 계획 ━━━')}`);
      for (const [custId, adj] of Object.entries(customerAdjustments)) {
        const [cust] = await conn.execute('SELECT name, mileage_balance FROM customers WHERE customer_id = ?', [custId]);
        const c = cust[0];
        if (!c) continue;
        const delta = adj.use - adj.earn;  // 잔액에 더할 양 (USE 복구는 +, EARN 무효화는 -)
        const after = Number(c.mileage_balance) + delta;
        console.log(`  ${c.name} (id=${custId}): ${Number(c.mileage_balance).toLocaleString()} ${delta >= 0 ? '+' : ''}${delta.toLocaleString()} = ${after.toLocaleString()}`);
        console.log(`    (USE ${adj.use.toLocaleString()} 복원, EARN ${adj.earn.toLocaleString()} 무효화)`);
      }
    }

    if (rides.length === 0 && calls.length === 0 && mileageTxns.length === 0 && auditLogs.length === 0 && verifyCustomers.length === 0) {
      console.log(`\n${C.green('✓ 정리할 데이터 없음. 종료.')}`);
      process.exit(0);
    }

    // ─── 4. 사용자 확인 ───
    if (process.env.AUTO_CONFIRM !== 'YES') {
      console.log(`\n${C.yellow('⚠ Dry-run 모드 — 실제 삭제는 안 함.')}`);
      console.log(`   실제 삭제하려면: ${C.cyan('AUTO_CONFIRM=YES')} 환경변수를 붙여 다시 실행`);
      process.exit(0);
    }

    // ─── 5. 트랜잭션 삭제 ───
    console.log(`\n${C.cyan('━━━ 삭제 실행 ━━━')}`);
    await conn.beginTransaction();

    // 5-1. 마일리지 잔액 원복 (먼저 — customer_mileage 삭제 전에)
    for (const [custId, adj] of Object.entries(customerAdjustments)) {
      const delta = adj.use - adj.earn;
      if (delta !== 0) {
        await conn.execute(
          'UPDATE customers SET mileage_balance = mileage_balance + ? WHERE customer_id = ?',
          [delta, custId]
        );
        console.log(`  ✓ 고객 ${custId} 잔액 ${delta >= 0 ? '+' : ''}${delta.toLocaleString()} 원복`);
      }
    }

    // 5-2. customer_mileage 삭제
    if (mileageTxns.length > 0) {
      const ids = mileageTxns.map(t => t.mileage_id);
      const ph = ids.map(() => '?').join(',');
      const [del] = await conn.execute(`DELETE FROM customer_mileage WHERE mileage_id IN (${ph})`, ids);
      console.log(`  ✓ customer_mileage ${del.affectedRows}건 삭제`);
    }

    // 5-3. calls의 ride_id 연결 끊기 (FK가 있으면 rides 삭제가 막힘)
    if (rides.length > 0) {
      const ids = rides.map(r => r.ride_id);
      const ph = ids.map(() => '?').join(',');
      await conn.execute(`UPDATE calls SET ride_id = NULL WHERE ride_id IN (${ph})`, ids);
      console.log(`  ✓ calls.ride_id 연결 해제`);
    }

    // 5-4. manual_gps_points (rides에 묶인 GPS 포인트) — 있으면 함께 삭제
    if (rides.length > 0) {
      const ids = rides.map(r => r.ride_id);
      const ph = ids.map(() => '?').join(',');
      const [delGps] = await conn.execute(`DELETE FROM manual_gps_points WHERE ride_id IN (${ph})`, ids);
      console.log(`  ✓ manual_gps_points ${delGps.affectedRows}건 삭제 (있으면)`);
    }

    // 5-5. rides 삭제
    if (rides.length > 0) {
      const [delRides] = await conn.execute(`DELETE FROM rides WHERE rider_memo LIKE ?`, [`%${TAG}%`]);
      console.log(`  ✓ rides ${delRides.affectedRows}건 삭제`);
    }

    // 5-6. calls 삭제
    if (calls.length > 0) {
      const [delCalls] = await conn.execute(`DELETE FROM calls WHERE memo LIKE ?`, [`%${TAG}%`]);
      console.log(`  ✓ calls ${delCalls.affectedRows}건 삭제`);
    }

    // 5-7. audit_logs 삭제
    if (auditLogs.length > 0) {
      const [delAudit] = await conn.execute(`DELETE FROM audit_logs WHERE detail LIKE ?`, [`%e2e_verify%`]);
      console.log(`  ✓ audit_logs ${delAudit.affectedRows}건 삭제`);
    }

    // 5-8. 검증용 신규 고객 삭제 (4-29 22:30 추가)
    //   - customer_mileage / rides / calls 다 정리한 후라 FK 무관
    //   - 운영 영향 방지를 위해 TAG가 이름에 박힌 고객만 정확히 매치
    if (verifyCustomers.length > 0) {
      const ids = verifyCustomers.map(c => c.customer_id);
      const ph = ids.map(() => '?').join(',');
      const [delCust] = await conn.execute(`DELETE FROM customers WHERE customer_id IN (${ph})`, ids);
      console.log(`  ✓ verify_customers ${delCust.affectedRows}건 삭제`);
    }

    await conn.commit();

    console.log(`\n${C.bold(C.green('✅ 정리 완료. 마일리지 잔액 정상 복구.'))}`);
    process.exit(0);
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error(`\n${C.red('❌ 정리 실패 — 롤백됨')}`);
    console.error(err);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

main();
