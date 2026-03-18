const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/settlements - 정산 목록
router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { month, rider_id, status } = req.query;
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;

    let where = 'WHERE s.company_id = ?';
    const params = [companyId];

    if (month) {
      where += ' AND DATE_FORMAT(s.period_start, "%Y-%m") <= ? AND DATE_FORMAT(s.period_end, "%Y-%m") >= ?';
      params.push(month, month);
    }
    if (rider_id) { where += ' AND s.rider_id = ?'; params.push(rider_id); }
    if (status) { where += ' AND s.status = ?'; params.push(status); }

    const [rows] = await pool.execute(
      `SELECT s.*, u.name AS rider_name, u.phone AS rider_phone,
              approver.name AS approved_by_name
       FROM settlements s
       JOIN users u ON s.rider_id = u.user_id
       LEFT JOIN users approver ON s.approved_by = approver.user_id
       ${where} ORDER BY s.period_start DESC, u.name`,
      params
    );

    const summary = rows.reduce((acc, r) => ({
      total_fare: acc.total_fare + Number(r.total_fare),
      total_commission: acc.total_commission + Number(r.total_commission),
      rider_payout: acc.rider_payout + Number(r.rider_payout),
      count: acc.count + 1,
    }), { total_fare: 0, total_commission: 0, rider_payout: 0, count: 0 });

    res.json({ data: rows, summary });
  } catch (err) {
    console.error('GET /settlements error:', err);
    res.status(500).json({ error: '정산 목록 조회에 실패했습니다.' });
  }
});

// POST /api/settlements/generate - 정산 자동 생성
router.post('/generate', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { period_start, period_end, period_type = 'MONTHLY' } = req.body;
    const companyId = req.user.company_id;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: '정산 기간(period_start, period_end)은 필수입니다.' });
    }

    // 해당 기간의 운행 기사별 집계
    const [riderStats] = await conn.execute(
      `SELECT r.rider_id, u.name AS rider_name,
              COUNT(*) AS total_rides,
              COALESCE(SUM(r.total_fare), 0) AS total_fare,
              COALESCE(SUM(r.commission_amount), 0) AS total_commission,
              COALESCE(SUM(r.platform_fee), 0) AS total_platform_fee,
              COALESCE(SUM(r.rider_earning), 0) AS rider_payout
       FROM rides r
       JOIN users u ON r.rider_id = u.user_id
       WHERE r.company_id = ? AND r.status = 'COMPLETED'
         AND DATE(r.started_at) BETWEEN ? AND ?
         AND r.ride_id NOT IN (SELECT ride_id FROM settlement_rides)
       GROUP BY r.rider_id, u.name`,
      [companyId, period_start, period_end]
    );

    if (riderStats.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: '해당 기간에 미정산 운행 기록이 없습니다.' });
    }

    const created = [];
    for (const stat of riderStats) {
      // 수수료 미설정 시 기본 계산: 총요금의 20%
      const commission = Number(stat.total_commission) || Math.floor(Number(stat.total_fare) * 0.2);
      const platformFee = Number(stat.total_platform_fee) || 0;
      const payout = Number(stat.total_fare) - commission - platformFee;

      const [result] = await conn.execute(
        `INSERT INTO settlements (company_id, rider_id, period_start, period_end, period_type,
          total_rides, total_fare, total_commission, total_platform_fee, rider_payout, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [companyId, stat.rider_id, period_start, period_end, period_type,
         stat.total_rides, stat.total_fare, commission, platformFee, payout]
      );

      const settlementId = result.insertId;

      // settlement_rides 매핑
      const [rides] = await conn.execute(
        `SELECT ride_id FROM rides
         WHERE company_id = ? AND rider_id = ? AND status = 'COMPLETED'
           AND DATE(started_at) BETWEEN ? AND ?
           AND ride_id NOT IN (SELECT ride_id FROM settlement_rides)`,
        [companyId, stat.rider_id, period_start, period_end]
      );

      for (const ride of rides) {
        await conn.execute('INSERT INTO settlement_rides (settlement_id, ride_id) VALUES (?, ?)', [settlementId, ride.ride_id]);
      }

      created.push({ settlement_id: settlementId, rider_name: stat.rider_name, total_fare: stat.total_fare, payout });
    }

    await conn.commit();

    writeAuditLog({
      company_id: companyId, user_id: req.user.user_id,
      action: 'SETTLEMENT_GENERATE', detail: { period_start, period_end, count: created.length },
      ip_address: req.ip,
    });

    res.status(201).json({ message: `${created.length}건의 정산이 생성되었습니다.`, data: created });
  } catch (err) {
    await conn.rollback();
    console.error('POST /settlements/generate error:', err);
    res.status(500).json({ error: '정산 생성에 실패했습니다.' });
  } finally { conn.release(); }
});

// PUT /api/settlements/:id/approve - 정산 승인
router.put('/:id/approve', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    await pool.execute(
      `UPDATE settlements SET status = 'APPROVED', approved_by = ?, approved_at = NOW() WHERE settlement_id = ? AND company_id = ?`,
      [req.user.user_id, req.params.id, req.user.company_id]
    );
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'SETTLEMENT_APPROVE', target_table: 'settlements', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '정산이 승인되었습니다.' });
  } catch (err) { res.status(500).json({ error: '정산 승인에 실패했습니다.' }); }
});

// PUT /api/settlements/:id/pay - 지급 완료 처리
router.put('/:id/pay', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    await pool.execute(
      `UPDATE settlements SET status = 'PAID', paid_at = NOW() WHERE settlement_id = ? AND status = 'APPROVED'`,
      [req.params.id]
    );
    res.json({ message: '지급 처리가 완료되었습니다.' });
  } catch (err) { res.status(500).json({ error: '지급 처리에 실패했습니다.' }); }
});

module.exports = router;
