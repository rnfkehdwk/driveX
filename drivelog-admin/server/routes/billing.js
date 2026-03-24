const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/billing
router.get('/', authenticate, async (req, res) => {
  try {
    const { company_id, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (req.user.role === 'MASTER' && company_id) { where += ' AND b.company_id = ?'; params.push(company_id); }
    else if (req.user.role !== 'MASTER') { where += ' AND b.company_id = ?'; params.push(req.user.company_id); }
    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const [rows] = await pool.execute(
      `SELECT b.*, c.company_name, c.company_code
       FROM app_billing b JOIN companies c ON b.company_id = c.company_id
       ${where} ORDER BY b.billing_period DESC`, params
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '사용료 조회에 실패했습니다.' }); }
});

// POST /api/billing/generate - 청구 생성 (시즌 요금 우선 적용)
router.post('/generate', authenticate, authorize('MASTER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { billing_period } = req.body;
    if (!billing_period) return res.status(400).json({ error: '청구 월(billing_period)은 필수입니다.' });

    // 청구월의 1일 (시즌 판별 기준)
    const periodDate = `${billing_period}-01`;

    const [companies] = await conn.execute(
      `SELECT c.company_id, c.company_name, c.company_code, c.plan_id,
              COALESCE(p.plan_name, '스타터') AS plan_name,
              COALESCE(p.base_fee, 0) AS base_fee,
              COALESCE(p.per_rider_fee, 0) AS per_rider_fee,
              COALESCE(p.free_riders, 0) AS free_riders
       FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id
       WHERE c.status = 'ACTIVE'`
    );

    const created = [];
    for (const comp of companies) {
      const [existing] = await conn.execute(
        'SELECT billing_id FROM app_billing WHERE company_id = ? AND billing_period = ?',
        [comp.company_id, billing_period]
      );
      if (existing.length > 0) continue;

      // ★ 시즌 요금 체크: 해당 월에 적용되는 시즌 요금이 있으면 우선 적용
      let baseFee = comp.base_fee;
      let perRiderFee = comp.per_rider_fee;
      let appliedSeason = null;

      if (comp.plan_id) {
        const [seasonal] = await conn.execute(
          `SELECT * FROM plan_seasonal_rates
           WHERE plan_id = ? AND is_active = TRUE AND start_date <= ? AND end_date >= ?
           ORDER BY id DESC LIMIT 1`,
          [comp.plan_id, periodDate, periodDate]
        );
        if (seasonal.length > 0) {
          baseFee = seasonal[0].base_fee;
          perRiderFee = seasonal[0].per_rider_fee;
          appliedSeason = seasonal[0].season_name;
        }
      }

      const [riderCount] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM users WHERE company_id = ? AND status = 'ACTIVE' AND role IN ('RIDER', 'SUPER_ADMIN')`,
        [comp.company_id]
      );
      const activeRiders = riderCount[0].cnt;

      const [rideCount] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM rides WHERE company_id = ? AND DATE_FORMAT(started_at, '%Y-%m') = ? AND status != 'CANCELLED'`,
        [comp.company_id, billing_period]
      );
      const totalRides = rideCount[0].cnt;

      const chargeableRiders = Math.max(0, activeRiders - comp.free_riders);
      const riderFee = chargeableRiders * perRiderFee;
      const billingAmount = baseFee + riderFee;

      const planLabel = appliedSeason ? `${comp.plan_name} (${appliedSeason})` : comp.plan_name;

      const [result] = await conn.execute(
        `INSERT INTO app_billing (company_id, billing_period, total_rides, active_riders, base_fee, rider_fee, billing_amount, plan_name, memo, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INVOICED')`,
        [comp.company_id, billing_period, totalRides, activeRiders, baseFee, riderFee, billingAmount, planLabel, appliedSeason ? `시즌: ${appliedSeason}` : null]
      );

      created.push({ billing_id: result.insertId, company_name: comp.company_name, plan_name: planLabel, active_riders: activeRiders, total_rides: totalRides, base_fee: baseFee, rider_fee: riderFee, amount: billingAmount });
    }

    await conn.commit();
    writeAuditLog({ user_id: req.user.user_id, action: 'BILLING_GENERATE', detail: { billing_period, count: created.length }, ip_address: req.ip });
    res.status(201).json({ message: `${created.length}건의 청구가 생성되었습니다.`, data: created });
  } catch (err) {
    await conn.rollback();
    console.error('Billing generate error:', err);
    res.status(500).json({ error: '사용료 생성에 실패했습니다.' });
  } finally { conn.release(); }
});

router.put('/:id/pay', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute(`UPDATE app_billing SET status = 'PAID', paid_at = NOW() WHERE billing_id = ?`, [req.params.id]);
    res.json({ message: '결제 처리가 완료되었습니다.' });
  } catch (err) { res.status(500).json({ error: '결제 처리에 실패했습니다.' }); }
});

router.put('/:id/memo', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute('UPDATE app_billing SET memo = ? WHERE billing_id = ?', [req.body.memo || '', req.params.id]);
    res.json({ message: '비고가 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '비고 수정 실패' }); }
});

module.exports = router;
