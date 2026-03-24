const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

function getCompanyId(user, query) {
  if (user.role === 'MASTER') return query.company_id ? parseInt(query.company_id) : null;
  return user.company_id;
}

// GET /api/stats/daily
router.get('/daily', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { month } = req.query;
    const companyId = getCompanyId(req.user, req.query);

    let where = "WHERE r.status != 'CANCELLED'";
    const params = [];
    if (companyId) { where += ' AND r.company_id = ?'; params.push(companyId); }
    if (month) { where += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?"; params.push(month); }

    const [rows] = await pool.execute(
      `SELECT DATE(r.started_at) AS date, COUNT(*) AS ride_count,
        COALESCE(SUM(r.total_fare), 0) AS total_fare,
        COALESCE(SUM(r.cash_amount), 0) AS total_cash,
        COALESCE(SUM(r.mileage_used), 0) AS total_mileage_used,
        COALESCE(SUM(r.mileage_earned), 0) AS total_mileage_earned,
        SUM(CASE WHEN r.partner_id IS NOT NULL THEN 1 ELSE 0 END) AS partner_calls
       FROM rides r ${where} GROUP BY DATE(r.started_at) ORDER BY date`, params
    );

    const summary = rows.reduce((acc, r) => ({
      total_fare: acc.total_fare + Number(r.total_fare),
      ride_count: acc.ride_count + r.ride_count,
      partner_calls: acc.partner_calls + r.partner_calls,
      mileage_earned: acc.mileage_earned + Number(r.total_mileage_earned),
      mileage_used: acc.mileage_used + Number(r.total_mileage_used),
    }), { total_fare: 0, ride_count: 0, partner_calls: 0, mileage_earned: 0, mileage_used: 0 });

    res.json({ data: rows, summary });
  } catch (err) {
    console.error('GET /stats/daily error:', err);
    res.status(500).json({ error: '일자별 통계 조회에 실패했습니다.' });
  }
});

// GET /api/stats/partners - 제휴업체별 콜횟수
router.get('/partners', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { month } = req.query;
    const companyId = getCompanyId(req.user, req.query);

    if (!companyId) return res.json({ data: [], totalCalls: 0 });

    // SQL: LEFT JOIN 조건에 month 파라미터, WHERE 에 companyId 파라미터
    // 파라미터 순서: [month (있으면)] → [companyId]
    let rideJoinExtra = "AND r.status != 'CANCELLED'";
    const params = [];

    if (month) {
      rideJoinExtra += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?";
      params.push(month);
    }

    params.push(companyId); // WHERE p.company_id = ?

    const [rows] = await pool.execute(
      `SELECT p.partner_id, p.name, p.phone, COUNT(r.ride_id) AS calls
       FROM partner_companies p
       LEFT JOIN rides r ON r.partner_id = p.partner_id ${rideJoinExtra}
       WHERE p.company_id = ? AND p.status = 'ACTIVE'
       GROUP BY p.partner_id, p.name, p.phone
       ORDER BY calls DESC`,
      params
    );

    const totalCalls = rows.reduce((sum, r) => sum + r.calls, 0);
    res.json({ data: rows, totalCalls });
  } catch (err) {
    console.error('GET /stats/partners error:', err);
    res.status(500).json({ error: '제휴업체 통계 조회에 실패했습니다.' });
  }
});

// GET /api/stats/mileage - 고객별 마일리지 통계
router.get('/mileage', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { q, month } = req.query;
    const companyId = getCompanyId(req.user, req.query);

    if (!companyId) return res.json({ data: [], summary: { total_fare: 0, mileage_earned: 0, mileage_used: 0 } });

    // LEFT JOIN 조건 파라미터 → WHERE 파라미터 순서로
    let rideJoinExtra = "AND r.status != 'CANCELLED'";
    const params = [];

    if (month) { rideJoinExtra += " AND DATE_FORMAT(r.started_at, '%Y-%m') = ?"; params.push(month); }

    params.push(companyId); // WHERE c.company_id = ?

    if (q) { params.push(`%${q}%`, `%${q}%`); }

    const [rows] = await pool.execute(
      `SELECT c.customer_id, c.customer_code, c.name, c.phone, c.mileage_balance,
              COALESCE(SUM(r.total_fare), 0) AS total_fare,
              COALESCE(SUM(r.cash_amount), 0) AS total_cash,
              COALESCE(SUM(r.mileage_earned), 0) AS mileage_earned,
              COALESCE(SUM(r.mileage_used), 0) AS mileage_used,
              COUNT(r.ride_id) AS ride_count
       FROM customers c
       LEFT JOIN rides r ON r.customer_id = c.customer_id ${rideJoinExtra}
       WHERE c.company_id = ? AND c.status = 'ACTIVE'
       ${q ? 'AND (c.name LIKE ? OR c.customer_code LIKE ?)' : ''}
       GROUP BY c.customer_id
       ORDER BY total_fare DESC`,
      params
    );

    const summary = rows.reduce((acc, r) => ({
      total_fare: acc.total_fare + Number(r.total_fare),
      mileage_earned: acc.mileage_earned + Number(r.mileage_earned),
      mileage_used: acc.mileage_used + Number(r.mileage_used),
    }), { total_fare: 0, mileage_earned: 0, mileage_used: 0 });

    res.json({ data: rows, summary });
  } catch (err) {
    console.error('GET /stats/mileage error:', err);
    res.status(500).json({ error: '마일리지 통계 조회에 실패했습니다.' });
  }
});

module.exports = router;
