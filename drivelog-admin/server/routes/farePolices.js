const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/fare-policies - 요금 정책 목록
router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? (req.query.company_id || 0) : req.user.company_id;
    const [rows] = await pool.execute(
      `SELECT * FROM fare_policies WHERE company_id = ? ORDER BY is_active DESC, effective_from DESC`,
      [companyId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: '요금 정책 조회에 실패했습니다.' });
  }
});

// POST /api/fare-policies - 요금 정책 생성
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const {
      policy_name, base_fare = 0, per_km_rate = 0, per_minute_rate = 0,
      night_surcharge_pct = 0, night_start_time = '22:00', night_end_time = '06:00',
      company_commission_pct = 0, platform_fee_pct = 0, mileage_earn_pct = 0,
      effective_from, effective_to,
    } = req.body;

    if (!policy_name || !effective_from) {
      return res.status(400).json({ error: '정책 이름과 적용 시작일은 필수입니다.' });
    }

    const companyId = req.user.company_id;

    const [result] = await pool.execute(
      `INSERT INTO fare_policies (company_id, policy_name, base_fare, per_km_rate, per_minute_rate,
        night_surcharge_pct, night_start_time, night_end_time,
        company_commission_pct, platform_fee_pct, mileage_earn_pct,
        is_active, effective_from, effective_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [companyId, policy_name, base_fare, per_km_rate, per_minute_rate,
       night_surcharge_pct, night_start_time, night_end_time,
       company_commission_pct, platform_fee_pct, mileage_earn_pct,
       effective_from, effective_to || null]
    );

    writeAuditLog({ company_id: companyId, user_id: req.user.user_id, action: 'POLICY_CREATE', target_table: 'fare_policies', target_id: result.insertId, ip_address: req.ip });
    res.status(201).json({ policy_id: result.insertId, message: '요금 정책이 생성되었습니다.' });
  } catch (err) {
    console.error('POST /fare-policies error:', err);
    res.status(500).json({ error: '요금 정책 생성에 실패했습니다.' });
  }
});

// PUT /api/fare-policies/:id - 요금 정책 수정
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const allowed = ['policy_name', 'base_fare', 'per_km_rate', 'per_minute_rate', 'night_surcharge_pct',
      'night_start_time', 'night_end_time', 'company_commission_pct', 'platform_fee_pct',
      'mileage_earn_pct', 'is_active', 'effective_from', 'effective_to'];
    const updates = [], values = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id, req.user.company_id);
    await pool.execute(`UPDATE fare_policies SET ${updates.join(', ')} WHERE policy_id = ? AND company_id = ?`, values);

    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'POLICY_UPDATE', target_table: 'fare_policies', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '요금 정책이 수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '요금 정책 수정에 실패했습니다.' });
  }
});

module.exports = router;
