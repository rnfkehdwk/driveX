const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/settlement-groups - 정산 그룹 목록
router.get('/', authenticate, async (req, res) => {
  try {
    let where, params;
    if (req.user.role === 'MASTER') {
      const companyId = req.query.company_id;
      if (companyId) { where = 'WHERE sg.company_id = ?'; params = [companyId]; }
      else { where = 'WHERE 1=1'; params = []; }
    } else {
      where = 'WHERE sg.company_id = ?';
      params = [req.user.company_id];
    }

    const [rows] = await pool.execute(
      `SELECT sg.group_id, sg.company_id, sg.name, sg.color, sg.sort_order, sg.created_at,
              c.company_name,
              (SELECT COUNT(*) FROM payment_types pt WHERE pt.settlement_group_id = sg.group_id) AS payment_type_count
       FROM settlement_groups sg
       LEFT JOIN companies c ON sg.company_id = c.company_id
       ${where} ORDER BY sg.company_id, sg.sort_order, sg.group_id`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 조회에 실패했습니다.' });
  }
});

// POST /api/settlement-groups - 정산 그룹 등록
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { name, color, sort_order, company_id } = req.body;
    if (!name) return res.status(400).json({ error: '그룹명은 필수입니다.' });

    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '소속 업체를 선택해주세요.' });

    const [result] = await pool.execute(
      `INSERT INTO settlement_groups (company_id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
      [targetCompanyId, name, color || '#64748b', sort_order || 0]
    );
    res.status(201).json({ group_id: result.insertId, message: '정산 그룹이 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 존재하는 그룹명입니다.' });
    console.error('POST /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 등록에 실패했습니다.' });
  }
});

// PUT /api/settlement-groups/:id - 정산 그룹 수정
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const allowed = ['name', 'color', 'sort_order'];
    const updates = [], values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    if (req.user.role === 'MASTER') {
      await pool.execute(`UPDATE settlement_groups SET ${updates.join(', ')} WHERE group_id = ?`, values);
    } else {
      values.push(req.user.company_id);
      await pool.execute(`UPDATE settlement_groups SET ${updates.join(', ')} WHERE group_id = ? AND company_id = ?`, values);
    }
    res.json({ message: '정산 그룹이 수정되었습니다.' });
  } catch (err) {
    console.error('PUT /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 수정에 실패했습니다.' });
  }
});

// DELETE /api/settlement-groups/:id - 정산 그룹 삭제
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    if (req.user.role === 'MASTER') {
      await pool.execute('DELETE FROM settlement_groups WHERE group_id = ?', [req.params.id]);
    } else {
      await pool.execute('DELETE FROM settlement_groups WHERE group_id = ? AND company_id = ?', [req.params.id, req.user.company_id]);
    }
    res.json({ message: '정산 그룹이 삭제되었습니다.' });
  } catch (err) {
    console.error('DELETE /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 삭제에 실패했습니다.' });
  }
});

module.exports = router;
