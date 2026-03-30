const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/billing-plans
// MASTER: 전체 요금제 반환 (is_active, is_visible 포함)
// SUPER_ADMIN/RIDER: is_active=TRUE && is_visible=TRUE 인 것만 반환
router.get('/', authenticate, async (req, res) => {
  try {
    const isMaster = req.user.role === 'MASTER';
    let where = '';
    if (!isMaster) {
      where = 'WHERE is_active = TRUE AND is_visible = TRUE';
    } else if (req.query.active_only === 'true') {
      where = 'WHERE is_active = TRUE';
    }
    const [rows] = await pool.execute(`SELECT * FROM billing_plans ${where} ORDER BY base_fee ASC, plan_id`);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '요금제 조회 실패' }); }
});

// POST /api/billing-plans
router.post('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { plan_name, base_fee, per_rider_fee, free_riders, max_riders, description, is_visible } = req.body;
    if (!plan_name) return res.status(400).json({ error: '요금제명은 필수입니다.' });
    const [result] = await pool.execute(
      'INSERT INTO billing_plans (plan_name, base_fee, per_rider_fee, free_riders, max_riders, description, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [plan_name, base_fee || 0, per_rider_fee || 0, free_riders || 0, max_riders || 0, description || null, is_visible !== undefined ? is_visible : 1]
    );
    await pool.execute(
      'INSERT INTO plan_price_history (plan_id, base_fee, per_rider_fee, free_riders, max_riders, effective_from, changed_by) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
      [result.insertId, base_fee || 0, per_rider_fee || 0, free_riders || 0, max_riders || 0, req.user.user_id]
    );
    res.status(201).json({ plan_id: result.insertId, message: '요금제가 등록되었습니다.' });
  } catch (err) { res.status(500).json({ error: '요금제 등록 실패' }); }
});

// PUT /api/billing-plans/:id
router.put('/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const allowed = ['plan_name', 'description', 'is_active', 'is_visible'];
    const updates = [], values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE billing_plans SET ${updates.join(', ')} WHERE plan_id = ?`, values);
    res.json({ message: '요금제가 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '요금제 수정 실패' }); }
});

// PUT /api/billing-plans/:id/price
router.put('/:id/price', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { base_fee, per_rider_fee, free_riders, max_riders, effective_from } = req.body;
    if (!effective_from) return res.status(400).json({ error: '시행일은 필수입니다.' });
    const planId = req.params.id;
    await pool.execute('UPDATE plan_price_history SET effective_to = DATE_SUB(?, INTERVAL 1 DAY) WHERE plan_id = ? AND effective_to IS NULL', [effective_from, planId]);
    await pool.execute('INSERT INTO plan_price_history (plan_id, base_fee, per_rider_fee, free_riders, max_riders, effective_from, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [planId, base_fee, per_rider_fee, free_riders || 0, max_riders || 0, effective_from, req.user.user_id]);
    await pool.execute('UPDATE billing_plans SET base_fee = ?, per_rider_fee = ?, free_riders = ?, max_riders = ? WHERE plan_id = ?', [base_fee, per_rider_fee, free_riders || 0, max_riders || 0, planId]);
    res.json({ message: `${effective_from}부터 새 요금이 적용됩니다.` });
  } catch (err) { console.error('PUT price error:', err); res.status(500).json({ error: '요금 변경 실패' }); }
});

// GET /api/billing-plans/:id/price-history
router.get('/:id/price-history', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT h.*, u.name AS changed_by_name FROM plan_price_history h LEFT JOIN users u ON h.changed_by = u.user_id WHERE h.plan_id = ? ORDER BY h.effective_from DESC`, [req.params.id]);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '이력 조회 실패' }); }
});

// GET /api/billing-plans/:id/seasonal
router.get('/:id/seasonal', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, u.name AS created_by_name FROM plan_seasonal_rates s LEFT JOIN users u ON s.created_by = u.user_id WHERE s.plan_id = ? ORDER BY s.start_date DESC`, [req.params.id]);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ error: '시즌 요금 조회 실패' }); }
});

// POST /api/billing-plans/:id/seasonal
router.post('/:id/seasonal', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { season_name, start_date, end_date, base_fee, per_rider_fee } = req.body;
    if (!season_name || !start_date || !end_date) return res.status(400).json({ error: '시즌명, 시작일, 종료일은 필수입니다.' });
    if (start_date >= end_date) return res.status(400).json({ error: '시작일은 종료일보다 이전이어야 합니다.' });
    const [overlap] = await pool.execute('SELECT id FROM plan_seasonal_rates WHERE plan_id = ? AND is_active = TRUE AND start_date <= ? AND end_date >= ?', [req.params.id, end_date, start_date]);
    if (overlap.length > 0) return res.status(400).json({ error: '해당 기간에 이미 등록된 시즌 요금이 있습니다.' });
    const [result] = await pool.execute('INSERT INTO plan_seasonal_rates (plan_id, season_name, start_date, end_date, base_fee, per_rider_fee, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.params.id, season_name, start_date, end_date, base_fee || 0, per_rider_fee || 0, req.user.user_id]);
    res.status(201).json({ id: result.insertId, message: `시즌 요금이 등록되었습니다.` });
  } catch (err) { console.error('POST seasonal error:', err); res.status(500).json({ error: '시즌 요금 등록 실패' }); }
});

// PUT /api/billing-plans/seasonal/:id
router.put('/seasonal/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const allowed = ['season_name', 'start_date', 'end_date', 'base_fee', 'per_rider_fee', 'is_active'];
    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE plan_seasonal_rates SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: '시즌 요금이 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '시즌 요금 수정 실패' }); }
});

// DELETE /api/billing-plans/seasonal/:id
router.delete('/seasonal/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try { await pool.execute('DELETE FROM plan_seasonal_rates WHERE id = ?', [req.params.id]); res.json({ message: '시즌 요금이 삭제되었습니다.' }); }
  catch (err) { res.status(500).json({ error: '시즌 요금 삭제 실패' }); }
});

// GET /api/billing-plans/history/all
router.get('/history/all', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [priceHistory] = await pool.execute(
      `SELECT 'PRICE_CHANGE' AS type, h.id, p.plan_name, h.base_fee, h.per_rider_fee, h.free_riders, h.max_riders,
              h.effective_from AS start_date, h.effective_to AS end_date, u.name AS changed_by_name, h.created_at,
              NULL AS season_name
       FROM plan_price_history h
       JOIN billing_plans p ON h.plan_id = p.plan_id
       LEFT JOIN users u ON h.changed_by = u.user_id
       ORDER BY h.effective_from DESC`
    );
    const [seasonHistory] = await pool.execute(
      `SELECT 'SEASONAL' AS type, s.id, p.plan_name, s.base_fee, s.per_rider_fee, 0 AS free_riders, 0 AS max_riders,
              s.start_date, s.end_date, u.name AS changed_by_name, s.created_at,
              s.season_name, s.is_active
       FROM plan_seasonal_rates s
       JOIN billing_plans p ON s.plan_id = p.plan_id
       LEFT JOIN users u ON s.created_by = u.user_id
       ORDER BY s.start_date DESC`
    );
    const all = [...priceHistory, ...seasonHistory].sort((a, b) => {
      const da = a.start_date || a.created_at;
      const db = b.start_date || b.created_at;
      return da > db ? -1 : da < db ? 1 : 0;
    });
    res.json({ data: all });
  } catch (err) {
    console.error('GET history/all error:', err);
    res.status(500).json({ error: '통합 이력 조회 실패' });
  }
});

module.exports = router;
