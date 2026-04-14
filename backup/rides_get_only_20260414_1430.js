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
      `SELECT r.ride_id, r.company_id, r.status, DATE_FORMAT(r.started_at, '%Y-%m-%d') AS ride_date, DATE_FORMAT(r.started_at, '%H:%i') AS ride_time, DATE_FORMAT(r.ended_at, '%H:%i') AS end_time,
              r.start_address, r.start_detail, r.start_lat, r.start_lng, r.end_address, r.end_detail, r.end_lat, r.end_lng,
              r.total_fare, r.cash_amount, r.mileage_used, r.mileage_earned, r.payment_type_id, r.rider_memo, r.admin_memo,
              pt.code AS payment_code, pt.label AS payment_label,
              cust.customer_code, cust.name AS customer_name, cust.phone AS customer_phone,
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
