const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');

function getCompanyId(user, query) {
  if (user.role === 'MASTER') return query.company_id ? parseInt(query.company_id) : null;
  return user.company_id;
}

router.get('/daily', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  try {
    const { month } = req.query;
    const companyId = getCompanyId(req.user, req.query);
    let where = "WHERE r.status != 'CANCELLED'";
    const params = [];
    if (companyId) { where += ' AND r.company_id = ?'; params.push(companyId); }
    if (month) { where += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?"; params.push(month); }
    if (req.licenseExpired && req.licenseExpires) { where += ' AND DATE(r.started_at) <= ?'; params.push(req.licenseExpires); }
    const [rows] = await pool.execute(`SELECT DATE(r.started_at) AS date, COUNT(*) AS ride_count, COALESCE(SUM(r.total_fare), 0) AS total_fare, COALESCE(SUM(r.cash_amount), 0) AS total_cash, COALESCE(SUM(r.mileage_used), 0) AS total_mileage_used, COALESCE(SUM(r.mileage_earned), 0) AS total_mileage_earned, CAST(SUM(CASE WHEN r.partner_id IS NOT NULL THEN 1 ELSE 0 END) AS UNSIGNED) AS partner_calls FROM rides r ${where} GROUP BY DATE(r.started_at) ORDER BY date`, params);
    const summary = rows.reduce((acc, r) => ({ total_fare: acc.total_fare + Number(r.total_fare), ride_count: acc.ride_count + Number(r.ride_count), partner_calls: acc.partner_calls + Number(r.partner_calls), mileage_earned: acc.mileage_earned + Number(r.total_mileage_earned), mileage_used: acc.mileage_used + Number(r.total_mileage_used) }), { total_fare: 0, ride_count: 0, partner_calls: 0, mileage_earned: 0, mileage_used: 0 });
    res.json({ data: rows, summary, license_expired: req.licenseExpired || false });
  } catch (err) { console.error('GET /stats/daily error:', err); res.status(500).json({ error: '일자별 통계 조회에 실패했습니다.' }); }
});

router.get('/partners', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  try {
    const { month } = req.query;
    const companyId = getCompanyId(req.user, req.query);
    if (!companyId) return res.json({ data: [], totalCalls: 0 });
    let rideJoinExtra = "AND r.status != 'CANCELLED'";
    const params = [];
    if (month) { rideJoinExtra += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?"; params.push(month); }
    if (req.licenseExpired && req.licenseExpires) { rideJoinExtra += ' AND DATE(r.started_at) <= ?'; params.push(req.licenseExpires); }
    params.push(companyId);
    const [rows] = await pool.execute(`SELECT p.partner_id, p.name, p.phone, COUNT(r.ride_id) AS calls FROM partner_companies p LEFT JOIN rides r ON r.partner_id = p.partner_id ${rideJoinExtra} WHERE p.company_id = ? AND p.status = 'ACTIVE' GROUP BY p.partner_id, p.name, p.phone ORDER BY calls DESC`, params);
    const totalCalls = rows.reduce((sum, r) => sum + Number(r.calls), 0);
    res.json({ data: rows, totalCalls });
  } catch (err) { console.error('GET /stats/partners error:', err); res.status(500).json({ error: '제휴업체 통계 조회에 실패했습니다.' }); }
});

router.get('/mileage', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  try {
    const { q, month } = req.query;
    const companyId = getCompanyId(req.user, req.query);
    if (!companyId) return res.json({ data: [], summary: { total_fare: 0, mileage_earned: 0, mileage_used: 0 } });
    let rideJoinExtra = "AND r.status != 'CANCELLED'";
    const params = [];
    if (month) { rideJoinExtra += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?"; params.push(month); }
    if (req.licenseExpired && req.licenseExpires) { rideJoinExtra += ' AND DATE(r.started_at) <= ?'; params.push(req.licenseExpires); }
    params.push(companyId);
    if (q) { params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.execute(`SELECT c.customer_id, c.customer_code, c.name, c.phone, c.mileage_balance, COALESCE(SUM(r.total_fare), 0) AS total_fare, COALESCE(SUM(r.cash_amount), 0) AS total_cash, COALESCE(SUM(r.mileage_earned), 0) AS mileage_earned, COALESCE(SUM(r.mileage_used), 0) AS mileage_used, COUNT(r.ride_id) AS ride_count FROM customers c LEFT JOIN rides r ON r.customer_id = c.customer_id ${rideJoinExtra} WHERE c.company_id = ? AND c.status = 'ACTIVE' ${q ? 'AND (c.name LIKE ? OR c.customer_code LIKE ?)' : ''} GROUP BY c.customer_id ORDER BY total_fare DESC`, params);
    const summary = rows.reduce((acc, r) => ({ total_fare: acc.total_fare + Number(r.total_fare), mileage_earned: acc.mileage_earned + Number(r.mileage_earned), mileage_used: acc.mileage_used + Number(r.mileage_used) }), { total_fare: 0, mileage_earned: 0, mileage_used: 0 });
    res.json({ data: rows, summary });
  } catch (err) { console.error('GET /stats/mileage error:', err); res.status(500).json({ error: '마일리지 통계 조회에 실패했습니다.' }); }
});

// GET /api/stats/monthly-report — 월간 종합 리포트
router.get('/monthly-report', authenticate, authorize('MASTER', 'SUPER_ADMIN'), checkLicense, async (req, res) => {
  try {
    const { month } = req.query;
    const companyId = getCompanyId(req.user, req.query);
    if (!companyId || !month) return res.status(400).json({ error: '업체와 월을 선택하세요.' });

    let licenseFilter = '';
    const licenseParams = [];
    if (req.licenseExpired && req.licenseExpires) { licenseFilter = ' AND DATE(r.started_at) <= ?'; licenseParams.push(req.licenseExpires); }

    // 1. 매출 요약
    const [salesSummary] = await pool.execute(
      `SELECT COUNT(*) AS total_rides, COALESCE(SUM(r.total_fare), 0) AS total_fare,
              COALESCE(SUM(r.cash_amount), 0) AS total_cash,
              COALESCE(SUM(r.mileage_used), 0) AS total_mileage_used,
              COALESCE(SUM(r.mileage_earned), 0) AS total_mileage_earned,
              CAST(SUM(CASE WHEN r.partner_id IS NOT NULL THEN 1 ELSE 0 END) AS UNSIGNED) AS partner_calls,
              COALESCE(AVG(r.total_fare), 0) AS avg_fare
       FROM rides r WHERE r.company_id = ? AND r.status != 'CANCELLED'
         AND DATE_FORMAT(r.started_at, '%Y-%m') = ? ${licenseFilter}`,
      [companyId, month, ...licenseParams]
    );

    // 2. 기사별 실적
    const [riderStats] = await pool.execute(
      `SELECT u.name AS rider_name, COUNT(*) AS rides, COALESCE(SUM(r.total_fare), 0) AS fare
       FROM rides r JOIN users u ON r.rider_id = u.user_id
       WHERE r.company_id = ? AND r.status != 'CANCELLED' AND DATE_FORMAT(r.started_at, '%Y-%m') = ? ${licenseFilter}
       GROUP BY r.rider_id, u.name ORDER BY fare DESC`,
      [companyId, month, ...licenseParams]
    );

    // 3. 고객 TOP 10
    const [topCustomers] = await pool.execute(
      `SELECT c.name, c.customer_code, COUNT(r.ride_id) AS rides, COALESCE(SUM(r.total_fare), 0) AS fare
       FROM rides r JOIN customers c ON r.customer_id = c.customer_id
       WHERE r.company_id = ? AND r.status != 'CANCELLED' AND DATE_FORMAT(r.started_at, '%Y-%m') = ? ${licenseFilter}
       GROUP BY r.customer_id, c.name, c.customer_code ORDER BY fare DESC LIMIT 10`,
      [companyId, month, ...licenseParams]
    );

    // 4. 제휴업체 TOP 10
    const [topPartners] = await pool.execute(
      `SELECT p.name, COUNT(r.ride_id) AS calls
       FROM rides r JOIN partner_companies p ON r.partner_id = p.partner_id
       WHERE r.company_id = ? AND r.status != 'CANCELLED' AND DATE_FORMAT(r.started_at, '%Y-%m') = ? ${licenseFilter}
       GROUP BY r.partner_id, p.name ORDER BY calls DESC LIMIT 10`,
      [companyId, month, ...licenseParams]
    );

    // 5. 일별 매출 추이
    const [dailyTrend] = await pool.execute(
      `SELECT DATE(r.started_at) AS date, COUNT(*) AS rides, COALESCE(SUM(r.total_fare), 0) AS fare
       FROM rides r WHERE r.company_id = ? AND r.status != 'CANCELLED' AND DATE_FORMAT(r.started_at, '%Y-%m') = ? ${licenseFilter}
       GROUP BY DATE(r.started_at) ORDER BY date`,
      [companyId, month, ...licenseParams]
    );

    // 6. 업체 정보
    const [companyInfo] = await pool.execute(
      `SELECT c.company_name, c.company_code, p.plan_name FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id WHERE c.company_id = ?`, [companyId]
    );

    res.json({
      company: companyInfo[0] || {},
      month,
      sales: salesSummary[0] || {},
      riders: riderStats,
      topCustomers,
      topPartners,
      dailyTrend,
    });
  } catch (err) { console.error('GET /stats/monthly-report error:', err); res.status(500).json({ error: '월간 리포트 조회 실패' }); }
});

module.exports = router;
