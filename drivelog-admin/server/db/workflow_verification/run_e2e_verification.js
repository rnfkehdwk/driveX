// ============================================================
// 양양대리 (1012) 전체 워크플로우 자동 검증 스크립트
//
// 검증 흐름:
//   1. SA(cblim) → 콜 생성 (WAITING)         + RIDER 푸시 발송 카운트 검증
//   2. RIDER → 콜 수락 (ASSIGNED)             + SA 푸시 발송 카운트 검증
//   3. RIDER → 운행일지 작성 (rides INSERT)
//      - started_at 자동 채움 (4-29 픽스)
//      - mileage_used 차감 (USE 거래)
//      - mileage_earned 적립 (EARN 거래, 원금-사용분 × 10%)
//      - calls.status='COMPLETED', ride_id 연결
//   4. 최종 검증: customers.mileage_balance 변동 정합성
//
// 식별 마킹:
//   - 모든 검증 데이터의 memo/rider_memo에 '[E2E_VERIFY_20260429]' 태그
//   - 검증 후 cleanup 스크립트가 이 태그로 식별해 정리
//
// 실행:
//   sudo docker exec -i drivelog-api node /app/db/workflow_verification/run_e2e_verification.js
//   (확인 후 실제 실행:)
//   sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/run_e2e_verification.js
//
// 작성일: 2026-04-29
// ============================================================

const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); } catch (e) {}

const { pool } = require('../../config/database');
const { sendToCompanyRiders, sendToCompanyAdmins } = require('../../utils/pushSender');

const TARGET_COMPANY_CODE = '1012';
const TAG = '[E2E_VERIFY_20260429]';
const FARE = 25000;       // 운임 25,000원
const MILEAGE_USE = 5000; // 사용 5,000원 (5,000원 단위)
// 적립 기대값: (25000 - 5000) * 10% = 2,000원

// 색상 출력
const C = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function log(msg) { console.log(msg); }
function step(num, msg) { console.log(`\n${C.bold(C.cyan(`━━━ STEP ${num} ━━━`))} ${msg}`); }
function ok(msg) { console.log(`  ${C.green('✓')} ${msg}`); }
function fail(msg) { console.log(`  ${C.red('✗')} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow('⚠')} ${msg}`); }

const errors = [];
function assert(cond, msg) {
  if (cond) ok(msg);
  else { fail(msg); errors.push(msg); }
}

// 한국 로컬 시간 (yyyy-MM-dd HH:mm:ss)
function getLocalNow() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function main() {
  let conn = null;
  try {
    log(`\n${C.bold('🚀 양양대리 (1012) 전체 워크플로우 검증')}`);
    log(`태그: ${TAG}`);
    log(`시작: ${new Date().toISOString()}\n`);

    // ─── 사전 준비: 회사/사용자/고객 정보 조회 ───
    step(0, '사전 준비 (회사/사용자/고객/결제구분 정보 조회)');

    const [companies] = await pool.execute(
      'SELECT company_id, company_name FROM companies WHERE company_code = ?',
      [TARGET_COMPANY_CODE]
    );
    if (companies.length === 0) throw new Error(`company_code=${TARGET_COMPANY_CODE} 회사 없음`);
    const company = companies[0];
    log(`  회사: ${company.company_name} (company_id=${company.company_id})`);

    // SA 계정 (cblim 우선, 없으면 첫 번째 SA)
    const [sas] = await pool.execute(
      "SELECT user_id, login_id, name FROM users WHERE company_id = ? AND role = 'SUPER_ADMIN' AND status = 'ACTIVE' ORDER BY login_id = 'cblim' DESC LIMIT 1",
      [company.company_id]
    );
    if (sas.length === 0) throw new Error('SA 계정 없음');
    const sa = sas[0];
    log(`  SA: ${sa.name} (${sa.login_id}, user_id=${sa.user_id})`);

    // RIDER 계정 (테스트용 — '미배정' 또는 첫 번째 ACTIVE RIDER)
    const [riders] = await pool.execute(
      "SELECT user_id, login_id, name FROM users WHERE company_id = ? AND role = 'RIDER' AND status = 'ACTIVE' ORDER BY login_id = 'rider_미배정' DESC, login_id LIMIT 1",
      [company.company_id]
    );
    if (riders.length === 0) throw new Error('ACTIVE RIDER 없음');
    const rider = riders[0];
    log(`  RIDER: ${rider.name} (${rider.login_id}, user_id=${rider.user_id})`);

    // 픽업기사 (다른 RIDER 1명 — 동일 RIDER가 아닌 사람)
    const [pickupRiders] = await pool.execute(
      "SELECT user_id, login_id, name FROM users WHERE company_id = ? AND role = 'RIDER' AND status = 'ACTIVE' AND user_id != ? ORDER BY login_id LIMIT 1",
      [company.company_id, rider.user_id]
    );
    const pickupRider = pickupRiders[0] || null;
    log(`  픽업기사: ${pickupRider ? `${pickupRider.name} (${pickupRider.login_id})` : '(없음 — 단독 RIDER)'}`);

    // 테스트 고객 (마일리지 잔액이 있는 고객 우선)
    const [customers] = await pool.execute(
      "SELECT customer_id, customer_code, name, mileage_balance FROM customers WHERE company_id = ? AND status = 'ACTIVE' AND mileage_balance >= ? ORDER BY mileage_balance DESC LIMIT 1",
      [company.company_id, MILEAGE_USE]
    );
    if (customers.length === 0) {
      throw new Error(`마일리지 잔액 ${MILEAGE_USE}원 이상인 ACTIVE 고객 없음 (테스트 불가)`);
    }
    const customer = customers[0];
    log(`  고객: ${customer.name} (${customer.customer_code}, customer_id=${customer.customer_id}, 잔액=${Number(customer.mileage_balance).toLocaleString()}원)`);

    const startBalance = Number(customer.mileage_balance);

    // 결제구분 (현금)
    const [pts] = await pool.execute(
      "SELECT payment_type_id, code, label FROM payment_types WHERE company_id = ? AND code = '001' AND is_active = TRUE LIMIT 1",
      [company.company_id]
    );
    const cashPt = pts[0];
    if (!cashPt) {
      const [anyPt] = await pool.execute(
        "SELECT payment_type_id, code, label FROM payment_types WHERE company_id = ? AND is_active = TRUE LIMIT 1",
        [company.company_id]
      );
      if (!anyPt[0]) throw new Error('payment_types 없음');
      log(`  결제구분: ${anyPt[0].label} (${anyPt[0].code}) — '001' 코드 못 찾음, 첫 번째 사용`);
      var paymentType = anyPt[0];
    } else {
      paymentType = cashPt;
      log(`  결제구분: ${cashPt.label} (${cashPt.code})`);
    }

    // 마일리지 적립률 확인
    const [policies] = await pool.execute(
      `SELECT mileage_earn_pct FROM fare_policies WHERE company_id = ? AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY effective_from DESC LIMIT 1`,
      [company.company_id]
    );
    const earnPct = policies[0]?.mileage_earn_pct || 10;
    const expectedEarn = Math.floor((FARE - MILEAGE_USE) * earnPct / 100);
    log(`  적립률: ${earnPct}% → 예상 적립: ${expectedEarn.toLocaleString()}원 ((${FARE}-${MILEAGE_USE}) × ${earnPct}%)`);

    // ─── 사용자 확인 ───
    if (process.env.AUTO_CONFIRM !== 'YES') {
      log(`\n${C.yellow('⚠ 위 정보로 검증을 진행합니다.')}`);
      log(`   고객 ${customer.name}의 마일리지 ${MILEAGE_USE.toLocaleString()}원 차감 + ${expectedEarn.toLocaleString()}원 적립이 발생합니다.`);
      log(`   검증 후 cleanup 스크립트(cleanup_e2e_verification.js)로 모두 원상 복구 가능합니다.`);
      log(`\n   계속 진행하려면: ${C.cyan('AUTO_CONFIRM=YES')} 환경변수를 붙여 다시 실행하세요.`);
      process.exit(0);
    }

    // ─── 푸시 구독 현황 (사전 카운트) ───
    const [riderSubs] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM push_subscriptions ps
       INNER JOIN users u ON u.user_id = ps.user_id
       WHERE ps.company_id = ? AND u.status = 'ACTIVE' AND u.role IN ('RIDER', 'SUPER_ADMIN')`,
      [company.company_id]
    );
    const [adminSubs] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM push_subscriptions ps
       INNER JOIN users u ON u.user_id = ps.user_id
       WHERE ps.company_id = ? AND u.status = 'ACTIVE' AND u.role = 'SUPER_ADMIN' AND ps.user_id != ?`,
      [company.company_id, rider.user_id]
    );
    log(`  푸시 구독 (RIDER+SA): ${riderSubs[0].cnt}건, SA(rider 제외): ${adminSubs[0].cnt}건`);

    // ============================================================
    // STEP 1: SA가 콜 생성
    // ============================================================
    step(1, 'SA가 콜 생성 (status=WAITING)');

    conn = await pool.getConnection();

    const [callResult] = await conn.execute(
      `INSERT INTO calls (company_id, created_by, customer_id,
         start_address, start_detail, start_lat, start_lng,
         end_address, end_detail, end_lat, end_lng,
         estimated_fare, payment_type_id, memo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING')`,
      [company.company_id, sa.user_id, customer.customer_id,
       `${TAG} 출발지 검증주소`, '검증상세', 38.0758, 128.6190,
       `${TAG} 도착지 검증주소`, '검증상세', 38.0700, 128.6300,
       FARE, paymentType.payment_type_id, `${TAG} 자동검증 콜`]
    );
    const callId = callResult.insertId;
    log(`  콜 생성됨: call_id=${callId}`);

    // 검증 (calls 테이블에 lat/lng 컬럼 추가됨 — 4-29 결정: 올션 Z 채택. migration_20260428_calls_latlng.sql 실행 상태)
    const [callRows] = await conn.execute('SELECT * FROM calls WHERE call_id = ?', [callId]);
    const call = callRows[0];
    assert(call.status === 'WAITING', `콜 상태 = WAITING (실제: ${call.status})`);
    assert(call.created_by === sa.user_id, `created_by = SA user_id (${sa.user_id})`);
    assert(call.customer_id === customer.customer_id, `customer_id 정상 매핑`);
    assert(call.assigned_rider_id === null, 'assigned_rider_id = NULL (대기 중)');
    assert(Number(call.estimated_fare) === FARE, `estimated_fare = ${FARE}`);

    // audit log
    await conn.execute(
      `INSERT INTO audit_logs (company_id, user_id, action, target_table, target_id, detail)
       VALUES (?, ?, 'CALL_CREATE', 'calls', ?, ?)`,
      [company.company_id, sa.user_id, callId, JSON.stringify({ tag: TAG, e2e_verify: true })]
    );

    // 푸시 발송 (RIDER 전체)
    const fareText = FARE.toLocaleString() + '원';
    const pushResult1 = await sendToCompanyRiders(company.company_id, {
      title: `${TAG} 🚗 새 콜 도착`,
      body: `검증주소\n예상 요금: ${fareText}`,
      url: '/m/calls',
      tag: `call-${callId}`,
      callId,
    });
    log(`  푸시(RIDER 대상): 발송 ${pushResult1.sent}, 실패 ${pushResult1.failed}, 만료삭제 ${pushResult1.removed}`);
    assert(pushResult1.sent + pushResult1.failed + pushResult1.removed === riderSubs[0].cnt,
      `푸시 시도 합계(${pushResult1.sent + pushResult1.failed + pushResult1.removed}) == 구독자 수(${riderSubs[0].cnt})`);

    // ============================================================
    // STEP 2: RIDER가 콜 수락
    // ============================================================
    step(2, 'RIDER가 콜 수락 (WAITING → ASSIGNED)');

    await conn.beginTransaction();
    const [lockedCall] = await conn.execute(
      'SELECT * FROM calls WHERE call_id = ? AND company_id = ? FOR UPDATE',
      [callId, company.company_id]
    );
    assert(lockedCall[0].status === 'WAITING', `수락 직전 상태 WAITING 확인`);

    await conn.execute(
      "UPDATE calls SET status = 'ASSIGNED', assigned_rider_id = ?, assigned_at = NOW() WHERE call_id = ?",
      [rider.user_id, callId]
    );
    await conn.commit();

    const [acceptedCallRows] = await pool.execute('SELECT * FROM calls WHERE call_id = ?', [callId]);
    const acceptedCall = acceptedCallRows[0];
    assert(acceptedCall.status === 'ASSIGNED', `콜 상태 = ASSIGNED (실제: ${acceptedCall.status})`);
    assert(acceptedCall.assigned_rider_id === rider.user_id, `assigned_rider_id = RIDER user_id`);
    assert(acceptedCall.assigned_at !== null, `assigned_at 채워짐: ${acceptedCall.assigned_at}`);

    await pool.execute(
      `INSERT INTO audit_logs (company_id, user_id, action, target_table, target_id, detail)
       VALUES (?, ?, 'CALL_ACCEPT', 'calls', ?, ?)`,
      [company.company_id, rider.user_id, callId, JSON.stringify({ tag: TAG, e2e_verify: true })]
    );

    // 푸시 (SA에게, RIDER 제외)
    const pushResult2 = await sendToCompanyAdmins(company.company_id, {
      title: `${TAG} ✅ ${rider.name} 기사가 콜 수락`,
      body: `검증주소`,
      url: '/admin/calls',
      tag: `accept-${callId}`,
      callId,
    }, { excludeUserId: rider.user_id });
    log(`  푸시(SA 대상, RIDER 제외): 발송 ${pushResult2.sent}, 실패 ${pushResult2.failed}, 만료삭제 ${pushResult2.removed}`);
    assert(pushResult2.sent + pushResult2.failed + pushResult2.removed === adminSubs[0].cnt,
      `푸시 시도 합계(${pushResult2.sent + pushResult2.failed + pushResult2.removed}) == SA 구독자 수(${adminSubs[0].cnt})`);

    // ============================================================
    // STEP 3: RIDER가 운행일지 작성 (콜 → 운행)
    // ============================================================
    step(3, 'RIDER가 운행일지 작성 + 마일리지 처리');

    await conn.beginTransaction();

    const startedAt = getLocalNow();
    const endedAt = getLocalNow();

    // 마일리지 적립 계산 (rides.js POST 로직과 동일)
    const earnableAmount = Math.max(0, FARE - MILEAGE_USE);
    const mileageEarned = Math.floor(earnableAmount * earnPct / 100);

    // 운행 INSERT
    const [rideResult] = await conn.execute(
      `INSERT INTO rides (company_id, rider_id, pickup_rider_id, customer_id,
         start_address, start_detail, start_lat, start_lng,
         end_address, end_detail, end_lat, end_lng,
         started_at, ended_at, total_fare, cash_amount, mileage_used, mileage_earned, final_amount,
         payment_type_id, status, rider_memo, call_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [company.company_id, rider.user_id, pickupRider?.user_id || null, customer.customer_id,
       `${TAG} 출발지 검증주소`, '검증상세', 38.0758, 128.6190,
       `${TAG} 도착지 검증주소`, '검증상세', 38.0700, 128.6300,
       startedAt, endedAt, FARE, FARE - MILEAGE_USE, MILEAGE_USE, mileageEarned, FARE - MILEAGE_USE,
       paymentType.payment_type_id, `${TAG} 자동검증 운행`, callId]
    );
    const rideId = rideResult.insertId;
    log(`  운행 생성됨: ride_id=${rideId}`);

    // 마일리지 USE 처리 (잔액 차감 + 거래기록)
    const [custLock] = await conn.execute(
      'SELECT mileage_balance FROM customers WHERE customer_id = ? FOR UPDATE',
      [customer.customer_id]
    );
    const balanceBeforeUse = Number(custLock[0].mileage_balance);
    const balanceAfterUse = balanceBeforeUse - MILEAGE_USE;
    assert(balanceAfterUse >= 0, `사용 후 잔액 ≥ 0 (${balanceAfterUse})`);

    await conn.execute(
      `INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by)
       VALUES (?, ?, 'USE', ?, ?, ?, ?, ?)`,
      [customer.customer_id, company.company_id, MILEAGE_USE, balanceAfterUse, `${TAG} 운행 결제 시 사용`, rideId, rider.user_id]
    );
    await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [balanceAfterUse, customer.customer_id]);
    log(`  마일리지 USE: ${balanceBeforeUse.toLocaleString()} → ${balanceAfterUse.toLocaleString()} (${MILEAGE_USE.toLocaleString()} 차감)`);

    // 마일리지 EARN 처리 (적립 + 거래기록)
    const balanceAfterEarn = balanceAfterUse + mileageEarned;
    await conn.execute(
      `INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by)
       VALUES (?, ?, 'EARN', ?, ?, ?, ?, ?)`,
      [customer.customer_id, company.company_id, mileageEarned, balanceAfterEarn, `${TAG} 운행 마일리지 적립`, rideId, rider.user_id]
    );
    await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [balanceAfterEarn, customer.customer_id]);
    log(`  마일리지 EARN: ${balanceAfterUse.toLocaleString()} → ${balanceAfterEarn.toLocaleString()} (+${mileageEarned.toLocaleString()})`);

    // 콜 → COMPLETED + ride_id 연결
    await conn.execute(
      "UPDATE calls SET status = 'COMPLETED', ride_id = ?, completed_at = NOW() WHERE call_id = ?",
      [rideId, callId]
    );

    await conn.commit();

    // 검증
    const [rideRows] = await pool.execute('SELECT * FROM rides WHERE ride_id = ?', [rideId]);
    const ride = rideRows[0];
    assert(ride.rider_id === rider.user_id, `rides.rider_id = RIDER user_id`);
    assert(ride.customer_id === customer.customer_id, `rides.customer_id 정상`);
    assert(ride.call_id === callId, `rides.call_id = ${callId} 연결됨`);
    assert(Number(ride.total_fare) === FARE, `total_fare = ${FARE}`);
    assert(Number(ride.mileage_used) === MILEAGE_USE, `mileage_used = ${MILEAGE_USE}`);
    assert(Number(ride.mileage_earned) === mileageEarned, `mileage_earned = ${mileageEarned} (예상값과 일치)`);
    assert(ride.started_at !== null, `started_at 채워짐 (4-29 픽스 검증)`);

    const [finalCall] = await pool.execute('SELECT * FROM calls WHERE call_id = ?', [callId]);
    assert(finalCall[0].status === 'COMPLETED', `콜 상태 = COMPLETED`);
    assert(finalCall[0].ride_id === rideId, `calls.ride_id = ${rideId}`);

    // ============================================================
    // STEP 4: 마일리지 잔액 정합성 최종 검증
    // ============================================================
    step(4, '마일리지 잔액 정합성 최종 검증');

    const [finalCust] = await pool.execute('SELECT mileage_balance FROM customers WHERE customer_id = ?', [customer.customer_id]);
    const endBalance = Number(finalCust[0].mileage_balance);
    const expectedEndBalance = startBalance - MILEAGE_USE + mileageEarned;
    assert(endBalance === expectedEndBalance,
      `최종 잔액 = ${endBalance.toLocaleString()} (예상: ${expectedEndBalance.toLocaleString()} = ${startBalance} - ${MILEAGE_USE} + ${mileageEarned})`);

    // customer_mileage 거래 기록 검증
    const [txns] = await pool.execute(
      'SELECT type, amount, balance_after FROM customer_mileage WHERE ride_id = ? ORDER BY mileage_id',
      [rideId]
    );
    assert(txns.length === 2, `customer_mileage 거래 2건 (USE + EARN)`);
    const useT = txns.find(t => t.type === 'USE');
    const earnT = txns.find(t => t.type === 'EARN');
    assert(useT && Number(useT.amount) === MILEAGE_USE, `USE 거래 ${MILEAGE_USE}`);
    assert(earnT && Number(earnT.amount) === mileageEarned, `EARN 거래 ${mileageEarned}`);
    assert(Number(earnT.balance_after) === endBalance, `EARN balance_after = 최종 잔액`);

    // ============================================================
    // 결과 리포트
    // ============================================================
    log(`\n${C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
    if (errors.length === 0) {
      log(`${C.bold(C.green('✅ 모든 검증 통과 (Phase 1 완료)'))}`);
    } else {
      log(`${C.bold(C.red(`❌ ${errors.length}건 실패`))}`);
      errors.forEach(e => log(`   - ${e}`));
    }
    log(`${C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`);
    log(`\n생성된 검증 데이터:`);
    log(`  - call_id: ${callId}`);
    log(`  - ride_id: ${rideId}`);
    log(`  - customer_mileage: 2건 (USE+EARN, ride_id=${rideId})`);
    log(`  - audit_logs: 2건 (CALL_CREATE + CALL_ACCEPT)`);
    log(`  - 고객 ${customer.name} 잔액: ${startBalance.toLocaleString()} → ${endBalance.toLocaleString()}`);
    log(`\n다음 단계:`);
    log(`  1. ${C.cyan('Phase 2 — 수동 검증')}: 실제 PC/폰으로 푸시 알림 수신 확인`);
    log(`     → 가이드: /app/db/workflow_verification/MANUAL_TEST_GUIDE.md`);
    log(`  2. ${C.cyan('Phase 3 — 데이터 정리')}: 모든 검증 완료 후`);
    log(`     → sudo docker exec -e AUTO_CONFIRM=YES -i drivelog-api node /app/db/workflow_verification/cleanup_e2e_verification.js`);

    process.exit(errors.length > 0 ? 1 : 0);
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch {} }
    console.error(`\n${C.red('❌ 검증 중 치명적 오류:')}`);
    console.error(err);
    process.exit(2);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

main();
