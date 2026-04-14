const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, sameCompany, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/rides - 운행일지 목록 (만료 시 만료일 이전 데이터만)
router.get('/', authenticate, checkLicense, async (req, res) => {
  try {
    const { page = 1, limit = 30, month, driver, customer, status } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE r.company_id = ?';
    const params = [req.user.company_id];

    if (req.user.role === 'RIDER') { where += ' AND r.rider_id = ?'; params.push(req.user.user_id); }
    if (req.user.role === 'MASTER') { where = 'WHERE 1=1'; params.length = 0; }

    if (req.licenseExpired && req.licenseExpires) {
      where += ' AND DATE(r.started_at) <= ?';
      params.push(req.licenseExpires);
    }

    if (month) { where += ' AND DATE_FORMAT(r.started_at, "%Y-%m") = ?'; params.push(month); }
    if (driver) { where += ' AND (rider.name LIKE ? OR pickup.name LIKE ?)'; params.push(`%${driver}%`, `%${driver}%`); }
    if (customer) { where += ' AND (cust.name LIKE ? OR cust.customer_code LIKE ?)'; params.push(`%${customer}%`, `%${customer}%`); }
    if (status) { where += ' AND r.status = ?'; params.push(status); }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM rides r LEFT JOIN users rider ON r.rider_id = rider.user_id LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id LEFT JOIN customers cust ON r.customer_id = cust.customer_id ${where}`, params);

    const dataParams = [...params, parseInt(limit), offset];
    const [rows] = await pool.execute(
      `SELECT r.ride_id, r.company_id, r.customer_id, r.status, DATE_FORMAT(r.started_at, '%Y-%m-%d') AS ride_date, DATE_FORMAT(r.started_at, '%H:%i') AS ride_time, DATE_FORMAT(r.ended_at, '%H:%i') AS end_time,
              r.start_address, r.start_detail, r.start_lat, r.start_lng, r.end_address, r.end_detail, r.end_lat, r.end_lng,
              r.total_fare, r.cash_amount, r.mileage_used, r.mileage_earned, r.payment_type_id, r.rider_memo, r.admin_memo,
              pt.code AS payment_code, pt.label AS payment_label,
              cust.customer_code, cust.name AS customer_name, cust.phone AS customer_phone, cust.mileage_balance AS customer_mileage_balance,
              rider.name AS rider_name, rider.vehicle_number, pickup.name AS pickup_rider_name,
              partner.name AS partner_name, partner.phone AS partner_phone, comp.company_name
       FROM rides r LEFT JOIN users rider ON r.rider_id = rider.user_id LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id LEFT JOIN partner_companies partner ON r.partner_id = partner.partner_id
       LEFT JOIN companies comp ON r.company_id = comp.company_id
       LEFT JOIN payment_types pt ON pt.payment_type_id = r.payment_type_id
       ${where} ORDER BY r.started_at DESC LIMIT ? OFFSET ?`, dataParams);

    res.json({ data: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit), license_expired: req.licenseExpired || false, license_expires: req.licenseExpires || null });
  } catch (err) { console.error('GET /rides error:', err); res.status(500).json({ error: '운행 목록 조회에 실패했습니다.' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, cust.customer_code, cust.name AS customer_name, cust.phone AS customer_phone,
              rider.name AS rider_name, rider.vehicle_number, pickup.name AS pickup_rider_name,
              partner.name AS partner_name, partner.phone AS partner_phone, comp.company_name
       FROM rides r LEFT JOIN users rider ON r.rider_id = rider.user_id LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id LEFT JOIN partner_companies partner ON r.partner_id = partner.partner_id
       LEFT JOIN companies comp ON r.company_id = comp.company_id WHERE r.ride_id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: '운행 기록을 찾을 수 없습니다.' });
    const ride = rows[0];
    if (req.user.role !== 'MASTER' && ride.company_id !== req.user.company_id) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    if (req.user.role === 'RIDER' && ride.rider_id !== req.user.user_id) return res.status(403).json({ error: '본인의 운행 기록만 조회할 수 있습니다.' });
    res.json(ride);
  } catch (err) { console.error('GET /rides/:id error:', err); res.status(500).json({ error: '운행 상세 조회에 실패했습니다.' }); }
});

// POST: 운행 등록 (만료 시 차단)
router.post('/', authenticate, authorize('RIDER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 운행 등록이 불가합니다.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { pickup_rider_id, customer_id, partner_id, start_address, start_detail, start_lat, start_lng, end_address, end_detail, end_lat, end_lng, started_at, ended_at, total_fare, cash_amount, mileage_used, payment_method, payment_type_id, rider_memo } = req.body;

    // 필수 필드 검증
    if (!started_at) {
      conn.release();
      return res.status(400).json({ error: '출발 시간은 필수입니다.' });
    }

    let mileage_earned = 0;
    if (total_fare) {
      const [policies] = await conn.execute(`SELECT mileage_earn_pct FROM fare_policies WHERE company_id = ? AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY effective_from DESC LIMIT 1`, [req.user.company_id]);
      if (policies.length > 0) {
        // 적립 대상 = 원금 - 마일리지 사용액 (마일리지로 결제한 부분은 적립 제외)
        const earnableAmount = Math.max(0, Number(total_fare) - Number(mileage_used || 0));
        mileage_earned = Math.floor(earnableAmount * policies[0].mileage_earn_pct / 100);
      }
    }

    // payment_type_id 자동 lookup (프론트가 명시하지 않아도 payment_method 코드로 자동 매핑)
    const resolvedPaymentTypeId = await resolvePaymentTypeId(
      conn,
      req.user.company_id,
      payment_type_id,
      payment_method
    );

    const [result] = await conn.execute(
      `INSERT INTO rides (company_id, rider_id, pickup_rider_id, customer_id, partner_id, status, start_address, start_detail, start_lat, start_lng, end_address, end_detail, end_lat, end_lng, started_at, ended_at, total_fare, cash_amount, mileage_used, mileage_earned, final_amount, payment_type_id, rider_memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, req.user.user_id, pickup_rider_id || null, customer_id || null, partner_id || null, ended_at ? 'COMPLETED' : 'STARTED', start_address || null, start_detail || null, start_lat || null, start_lng || null, end_address || null, end_detail || null, end_lat || null, end_lng || null, started_at, ended_at || null, total_fare || null, cash_amount || null, mileage_used || 0, mileage_earned, total_fare ? (total_fare - (mileage_used || 0)) : null, resolvedPaymentTypeId, rider_memo || null]
    );
    const rideId = result.insertId;

    if (start_lat && start_lng) await conn.execute(`INSERT INTO manual_gps_points (ride_id, point_type, latitude, longitude, address, input_method, recorded_at) VALUES (?, 'START', ?, ?, ?, 'CURRENT_LOCATION', ?)`, [rideId, start_lat, start_lng, start_address || '', started_at]);
    if (end_lat && end_lng && ended_at) await conn.execute(`INSERT INTO manual_gps_points (ride_id, point_type, latitude, longitude, address, input_method, recorded_at) VALUES (?, 'END', ?, ?, ?, 'CURRENT_LOCATION', ?)`, [rideId, end_lat, end_lng, end_address || '', ended_at]);

    if (mileage_earned > 0 && customer_id) {
      const [custs] = await conn.execute('SELECT mileage_balance FROM customers WHERE customer_id = ?', [customer_id]);
      const balanceAfter = (custs[0]?.mileage_balance || 0) + mileage_earned;
      await conn.execute(`INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by) VALUES (?, ?, 'EARN', ?, ?, '운행 마일리지 적립', ?, ?)`, [customer_id, req.user.company_id, mileage_earned, balanceAfter, rideId, req.user.user_id]);
      await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [balanceAfter, customer_id]);
    }

    // 마일리지 사용 처리 (USE) — 운행 작성 시 mileage_used 값이 있으면 자동 차감
    // 한국 대리업체 관행: 5000원 단위로만 사용 가능
    if (mileage_used && Number(mileage_used) > 0 && customer_id) {
      const useAmt = Math.round(Number(mileage_used));
      // 5000원 단위 검증
      if (useAmt % 5000 !== 0) {
        await conn.rollback();
        return res.status(400).json({ error: '마일리지는 5,000원 단위로만 사용 가능합니다.' });
      }
      // 잠금 후 잔액 재조회 (적립 이후 상태)
      const [usedCusts] = await conn.execute('SELECT mileage_balance FROM customers WHERE customer_id = ? FOR UPDATE', [customer_id]);
      const currentBalance = Number(usedCusts[0]?.mileage_balance || 0);
      if (currentBalance < useAmt) {
        await conn.rollback();
        return res.status(400).json({ error: `마일리지 잔액이 부족합니다. 현재 잔액: ${currentBalance.toLocaleString()}원` });
      }
      const balanceAfterUse = currentBalance - useAmt;
      await conn.execute(`INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by) VALUES (?, ?, 'USE', ?, ?, '운행 결제 시 사용', ?, ?)`, [customer_id, req.user.company_id, useAmt, balanceAfterUse, rideId, req.user.user_id]);
      await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [balanceAfterUse, customer_id]);
    }

    await conn.commit();
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'RIDE_CREATE', target_table: 'rides', target_id: rideId, ip_address: req.ip });
    res.status(201).json({ ride_id: rideId, message: '운행일지가 저장되었습니다.' });
  } catch (err) { await conn.rollback(); console.error('POST /rides error:', err); res.status(500).json({ error: '운행일지 저장에 실패했습니다.' }); }
  finally { conn.release(); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;

    // payment_method가 변경되었거나 payment_type_id가 명시되었으면 자동 lookup
    if (fields.payment_method !== undefined || fields.payment_type_id !== undefined) {
      fields.payment_type_id = await resolvePaymentTypeId(
        pool,
        req.user.company_id,
        fields.payment_type_id,
        fields.payment_method
      );
    }

    const allowed = ['end_address', 'end_detail', 'end_lat', 'end_lng', 'ended_at', 'total_fare', 'cash_amount', 'mileage_used', 'payment_type_id', 'rider_memo', 'admin_memo', 'status', 'partner_id', 'customer_id'];
    const updates = [], values = [];
    for (const key of allowed) { if (fields[key] !== undefined) { updates.push(`${key} = ?`); values.push(fields[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE rides SET ${updates.join(', ')} WHERE ride_id = ?`, values);
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'RIDE_UPDATE', target_table: 'rides', target_id: parseInt(req.params.id), detail: { updated_fields: Object.keys(fields).filter(k => allowed.includes(k)) }, ip_address: req.ip });
    res.json({ message: '운행 기록이 수정되었습니다.' });
  } catch (err) { console.error('PUT /rides/:id error:', err); res.status(500).json({ error: '운행 수정에 실패했습니다.' }); }
});

// ====================================================
// 헬퍼: payment_type_id 자동 lookup
// pool 또는 conn 객체 아무거나 받으며 .execute() 메서드 사용
// 우선순위:
//   1. explicit payment_type_id (프론트에서 명시)
//   2. payment_method가 payment_types.code와 직접 매칭
//   3. payment_method 영문 alias (CASH, CARD 등) → 한글 코드 변환 후 매칭
//   4. lookup 실패 시 null 반환 (정산 시 '미분류'로 빠짐)
// ====================================================
async function resolvePaymentTypeId(executor, companyId, explicitId, paymentMethod) {
  // 1. explicit ID가 있고 유효하면 그대로 사용 (회사 소속 검증)
  if (explicitId) {
    const [rows] = await executor.execute(
      'SELECT payment_type_id FROM payment_types WHERE payment_type_id = ? AND company_id = ?',
      [explicitId, companyId]
    );
    if (rows.length > 0) return rows[0].payment_type_id;
  }

  if (!paymentMethod) return null;

  // 2. payment_method가 payment_types.code와 직접 매칭
  const [direct] = await executor.execute(
    'SELECT payment_type_id FROM payment_types WHERE company_id = ? AND code = ? AND is_active = TRUE LIMIT 1',
    [companyId, paymentMethod]
  );
  if (direct.length > 0) return direct[0].payment_type_id;

  // 3. 영문 alias → 한글 코드 변환 (양양대리 등 코드체계가 001~006인 업체 대응)
  const aliasMap = {
    'CASH': '001',
    'RIDER_ACCOUNT': '002',
    'DRIVER_ACCT': '002',
    'COMPANY_ACCOUNT': '003',
    'COMPANY_ACCT': '003',
    'NARASI': '004',
    'UNPAID': '005',
    'MISU': '005',
    'CARD': '006',
  };
  const mappedCode = aliasMap[paymentMethod];
  if (mappedCode) {
    const [aliased] = await executor.execute(
      'SELECT payment_type_id FROM payment_types WHERE company_id = ? AND code = ? AND is_active = TRUE LIMIT 1',
      [companyId, mappedCode]
    );
    if (aliased.length > 0) return aliased[0].payment_type_id;
  }

  return null;
}

module.exports = router;
