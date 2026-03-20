const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, sameCompany } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/rides - 운행일지 목록 조회
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 30, month, driver, customer, status } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE r.company_id = ?';
    const params = [req.user.company_id];

    if (req.user.role === 'RIDER') {
      where += ' AND r.rider_id = ?';
      params.push(req.user.user_id);
    }
    if (req.user.role === 'MASTER') {
      where = 'WHERE 1=1';
      params.length = 0;
    }
    if (month) { where += ' AND DATE_FORMAT(r.started_at, "%Y-%m") = ?'; params.push(month); }
    if (driver) { where += ' AND (rider.name LIKE ? OR pickup.name LIKE ?)'; params.push(`%${driver}%`, `%${driver}%`); }
    if (customer) { where += ' AND (cust.name LIKE ? OR cust.customer_code LIKE ?)'; params.push(`%${customer}%`, `%${customer}%`); }
    if (status) { where += ' AND r.status = ?'; params.push(status); }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM rides r
       LEFT JOIN users rider ON r.rider_id = rider.user_id
       LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id
       ${where}`,
      params
    );

    const dataParams = [...params, parseInt(limit), offset];
    const [rows] = await pool.execute(
      `SELECT r.ride_id, r.company_id, r.status,
              DATE_FORMAT(r.started_at, '%Y-%m-%d') AS ride_date,
              DATE_FORMAT(r.started_at, '%H:%i') AS ride_time,
              DATE_FORMAT(r.ended_at, '%H:%i') AS end_time,
              r.start_address, r.start_detail, r.start_lat, r.start_lng,
              r.end_address, r.end_detail, r.end_lat, r.end_lng,
              r.total_fare, r.cash_amount, r.mileage_used, r.mileage_earned,
              r.payment_method, r.rider_memo, r.admin_memo,
              cust.customer_code, cust.name AS customer_name, cust.phone AS customer_phone,
              rider.name AS rider_name, rider.vehicle_number,
              pickup.name AS pickup_rider_name,
              partner.name AS partner_name, partner.phone AS partner_phone,
              comp.company_name
       FROM rides r
       LEFT JOIN users rider ON r.rider_id = rider.user_id
       LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON r.partner_id = partner.partner_id
       LEFT JOIN companies comp ON r.company_id = comp.company_id
       ${where}
       ORDER BY r.started_at DESC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    res.json({ data: rows, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('GET /rides error:', err);
    res.status(500).json({ error: '운행 목록 조회에 실패했습니다.' });
  }
});

// GET /api/rides/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, cust.customer_code, cust.name AS customer_name, cust.phone AS customer_phone,
              rider.name AS rider_name, rider.vehicle_number,
              pickup.name AS pickup_rider_name,
              partner.name AS partner_name, partner.phone AS partner_phone,
              comp.company_name
       FROM rides r
       LEFT JOIN users rider ON r.rider_id = rider.user_id
       LEFT JOIN users pickup ON r.pickup_rider_id = pickup.user_id
       LEFT JOIN customers cust ON r.customer_id = cust.customer_id
       LEFT JOIN partner_companies partner ON r.partner_id = partner.partner_id
       LEFT JOIN companies comp ON r.company_id = comp.company_id
       WHERE r.ride_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '운행 기록을 찾을 수 없습니다.' });
    const ride = rows[0];
    if (req.user.role !== 'MASTER' && ride.company_id !== req.user.company_id) return res.status(403).json({ error: '접근 권한이 없습니다.' });
    if (req.user.role === 'RIDER' && ride.rider_id !== req.user.user_id) return res.status(403).json({ error: '본인의 운행 기록만 조회할 수 있습니다.' });
    res.json(ride);
  } catch (err) {
    console.error('GET /rides/:id error:', err);
    res.status(500).json({ error: '운행 상세 조회에 실패했습니다.' });
  }
});

// POST /api/rides
router.post('/', authenticate, authorize('RIDER', 'SUPER_ADMIN'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { pickup_rider_id, customer_id, partner_id, start_address, start_detail, start_lat, start_lng, end_address, end_detail, end_lat, end_lng, started_at, ended_at, total_fare, cash_amount, mileage_used, payment_method, rider_memo } = req.body;

    let mileage_earned = 0;
    if (total_fare) {
      const [policies] = await conn.execute(`SELECT mileage_earn_pct FROM fare_policies WHERE company_id = ? AND is_active = TRUE AND effective_from <= CURDATE() ORDER BY effective_from DESC LIMIT 1`, [req.user.company_id]);
      if (policies.length > 0) mileage_earned = Math.floor(total_fare * policies[0].mileage_earn_pct / 100);
    }

    const [result] = await conn.execute(
      `INSERT INTO rides (company_id, rider_id, pickup_rider_id, customer_id, partner_id, status, start_address, start_detail, start_lat, start_lng, end_address, end_detail, end_lat, end_lng, started_at, ended_at, total_fare, cash_amount, mileage_used, mileage_earned, final_amount, payment_method, rider_memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, req.user.user_id, pickup_rider_id || null, customer_id || null, partner_id || null, ended_at ? 'COMPLETED' : 'STARTED', start_address, start_detail || null, start_lat || null, start_lng || null, end_address || null, end_detail || null, end_lat || null, end_lng || null, started_at, ended_at || null, total_fare || null, cash_amount || null, mileage_used || 0, mileage_earned, total_fare ? (total_fare - (mileage_used || 0)) : null, payment_method || 'CASH', rider_memo || null]
    );
    const rideId = result.insertId;

    if (start_lat && start_lng) await conn.execute(`INSERT INTO manual_gps_points (ride_id, point_type, latitude, longitude, address, input_method, recorded_at) VALUES (?, 'START', ?, ?, ?, 'CURRENT_LOCATION', ?)`, [rideId, start_lat, start_lng, start_address, started_at]);
    if (end_lat && end_lng && ended_at) await conn.execute(`INSERT INTO manual_gps_points (ride_id, point_type, latitude, longitude, address, input_method, recorded_at) VALUES (?, 'END', ?, ?, ?, 'CURRENT_LOCATION', ?)`, [rideId, end_lat, end_lng, end_address, ended_at]);

    if (mileage_earned > 0 && customer_id) {
      const [custs] = await conn.execute('SELECT mileage_balance FROM customers WHERE customer_id = ?', [customer_id]);
      const balanceAfter = (custs[0]?.mileage_balance || 0) + mileage_earned;
      await conn.execute(`INSERT INTO customer_mileage (customer_id, company_id, type, amount, balance_after, description, ride_id, processed_by) VALUES (?, ?, 'EARN', ?, ?, '운행 마일리지 적립', ?, ?)`, [customer_id, req.user.company_id, mileage_earned, balanceAfter, rideId, req.user.user_id]);
      await conn.execute('UPDATE customers SET mileage_balance = ? WHERE customer_id = ?', [balanceAfter, customer_id]);
    }

    await conn.commit();
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'RIDE_CREATE', target_table: 'rides', target_id: rideId, ip_address: req.ip });
    res.status(201).json({ ride_id: rideId, message: '운행일지가 저장되었습니다.' });
  } catch (err) { await conn.rollback(); console.error('POST /rides error:', err); res.status(500).json({ error: '운행일지 저장에 실패했습니다.' }); }
  finally { conn.release(); }
});

// PUT /api/rides/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const fields = req.body;
    const allowed = ['end_address', 'end_detail', 'end_lat', 'end_lng', 'ended_at', 'total_fare', 'cash_amount', 'mileage_used', 'payment_method', 'rider_memo', 'admin_memo', 'status', 'partner_id', 'customer_id'];
    const updates = [], values = [];
    for (const key of allowed) { if (fields[key] !== undefined) { updates.push(`${key} = ?`); values.push(fields[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE rides SET ${updates.join(', ')} WHERE ride_id = ?`, values);
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'RIDE_UPDATE', target_table: 'rides', target_id: parseInt(req.params.id), detail: { updated_fields: Object.keys(fields).filter(k => allowed.includes(k)) }, ip_address: req.ip });
    res.json({ message: '운행 기록이 수정되었습니다.' });
  } catch (err) { console.error('PUT /rides/:id error:', err); res.status(500).json({ error: '운행 수정에 실패했습니다.' }); }
});

module.exports = router;
