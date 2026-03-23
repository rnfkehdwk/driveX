const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/billing-plans - 요금제 목록
router.get('/', authenticate, async (req, res) => {
  try {
    const activeOnly = req.query.active_only === 'true';
    const where = activeOnly ? 'WHERE is_active = TRUE' : '';
    const [rows] = await pool.execute(`SELECT * FROM billing_plans ${where} ORDER BY plan_id`);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: '요금제 조회 실패' });
  }
});

// POST /api/billing-plans - 요금제 등록 (MASTER)
router.post('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { plan_name, base_fee, per_rider_fee, free_riders, max_riders, description } = req.body;
    if (!plan_name) return res.status(400).json({ error: '요금제명은 필수입니다.' });
    const [result] = await pool.execute(
      'INSERT INTO billing_plans (plan_name, base_fee, per_rider_fee, free_riders, max_riders, description) VALUES (?, ?, ?, ?, ?, ?)',
      [plan_name, base_fee || 0, per_rider_fee || 0, free_riders || 0, max_riders || 0, description || null]
    );
    res.status(201).json({ plan_id: result.insertId, message: '요금제가 등록되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '요금제 등록 실패' });
  }
});

// PUT /api/billing-plans/:id - 요금제 수정 (MASTER)
router.put('/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const allowed = ['plan_name', 'base_fee', 'per_rider_fee', 'free_riders', 'max_riders', 'description', 'is_active'];
    const updates = [], values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE billing_plans SET ${updates.join(', ')} WHERE plan_id = ?`, values);
    res.json({ message: '요금제가 수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '요금제 수정 실패' });
  }
});

module.exports = router;
