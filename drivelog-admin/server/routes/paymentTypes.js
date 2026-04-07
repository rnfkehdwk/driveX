const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/payment-types - 결제구분 목록 (업체별)
router.get('/', authenticate, async (req, res) => {
  try {
    let where, params;
    if (req.user.role === 'MASTER') {
      const companyId = req.query.company_id;
      if (companyId) { where = 'WHERE pt.company_id = ?'; params = [companyId]; }
      else { where = 'WHERE 1=1'; params = []; }
    } else {
      where = 'WHERE pt.company_id = ?';
      params = [req.user.company_id];
    }

    const activeOnly = req.query.active_only === 'true';
    if (activeOnly) where += ' AND pt.is_active = TRUE';

    const [rows] = await pool.execute(
      `SELECT pt.payment_type_id, pt.company_id, pt.code, pt.label, pt.sort_order, pt.is_active, pt.settlement_group_id, pt.created_at,
              c.company_name, sg.name AS settlement_group_name, sg.color AS settlement_group_color
       FROM payment_types pt
       LEFT JOIN companies c ON pt.company_id = c.company_id
       LEFT JOIN settlement_groups sg ON pt.settlement_group_id = sg.group_id
       ${where} ORDER BY pt.company_id, pt.sort_order`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /payment-types error:', err);
    res.status(500).json({ error: '결제구분 조회에 실패했습니다.' });
  }
});

// POST /api/payment-types - 결제구분 등록
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { code, label, sort_order, company_id, settlement_group_id } = req.body;
    if (!code || !label) return res.status(400).json({ error: '코드와 표시명은 필수입니다.' });

    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '소속 업체를 선택해주세요.' });

    const [result] = await pool.execute(
      `INSERT INTO payment_types (company_id, code, label, sort_order, settlement_group_id) VALUES (?, ?, ?, ?, ?)`,
      [targetCompanyId, code.toUpperCase(), label, sort_order || 0, settlement_group_id || null]
    );
    res.status(201).json({ payment_type_id: result.insertId, message: '결제구분이 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 존재하는 코드입니다.' });
    console.error('POST /payment-types error:', err);
    res.status(500).json({ error: '결제구분 등록에 실패했습니다.' });
  }
});

// PUT /api/payment-types/:id - 결제구분 수정
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const allowed = ['label', 'sort_order', 'is_active', 'settlement_group_id'];
    const updates = [], values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    if (req.user.role === 'MASTER') {
      await pool.execute(`UPDATE payment_types SET ${updates.join(', ')} WHERE payment_type_id = ?`, values);
    } else {
      values.push(req.user.company_id);
      await pool.execute(`UPDATE payment_types SET ${updates.join(', ')} WHERE payment_type_id = ? AND company_id = ?`, values);
    }
    res.json({ message: '결제구분이 수정되었습니다.' });
  } catch (err) {
    console.error('PUT /payment-types error:', err);
    res.status(500).json({ error: '결제구분 수정에 실패했습니다.' });
  }
});

// DELETE /api/payment-types/:id - 결제구분 삭제
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    if (req.user.role === 'MASTER') {
      await pool.execute('DELETE FROM payment_types WHERE payment_type_id = ?', [req.params.id]);
    } else {
      await pool.execute('DELETE FROM payment_types WHERE payment_type_id = ? AND company_id = ?', [req.params.id, req.user.company_id]);
    }
    res.json({ message: '결제구분이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '결제구분 삭제에 실패했습니다.' });
  }
});

module.exports = router;
