const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { month, rider_id, status } = req.query;
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;
    let where = 'WHERE s.company_id = ?'; const params = [companyId];
    if (month) { where += ' AND DATE_FORMAT(s.period_start, "%Y-%m") <= ? AND DATE_FORMAT(s.period_end, "%Y-%m") >= ?'; params.push(month, month); }
    if (rider_id) { where += ' AND s.rider_id = ?'; params.push(rider_id); }
    if (status) { where += ' AND s.status = ?'; params.push(status); }
    const [rows] = await pool.execute(`SELECT s.*, u.name AS rider_name, u.phone AS rider_phone, approver.name AS approved_by_name FROM settlements s JOIN users u ON s.rider_id = u.user_id LEFT JOIN users approver ON s.approved_by = approver.user_id ${where} ORDER BY s.period_start DESC, u.name`, params);
    const summary = rows.reduce((acc, r) => ({ total_fare: acc.total_fare + Number(r.total_fare), total_commission: acc.total_commission + Number(r.total_commission), rider_payout: acc.rider_payout + Number(r.rider_payout), count: acc.count + 1 }), { total_fare: 0, total_commission: 0, rider_payout: 0, count: 0 });
    res.json({ data: rows, summary });
  } catch (err) { console.error('GET /settlements error:', err); res.status(500).json({ error: '정산 목록 조회에 실패했습니다.' }); }
});
