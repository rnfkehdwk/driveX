const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// ─── 정산 그룹 CRUD ───

// GET /api/settlement-groups
router.get('/', authenticate, async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? req.query.company_id : req.user.company_id;
    if (!companyId) return res.json({ data: [] });
    const [rows] = await pool.execute(
      'SELECT * FROM settlement_groups WHERE company_id = ? ORDER BY sort_order, group_id', [companyId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 조회 실패' });
  }
});

// POST /api/settlement-groups
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { name, color, sort_order, company_id } = req.body;
    if (!name) return res.status(400).json({ error: '그룹명은 필수입니다.' });
    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '업체를 선택해주세요.' });
    const [result] = await pool.execute(
      'INSERT INTO settlement_groups (company_id, name, color, sort_order) VALUES (?, ?, ?, ?)',
      [targetCompanyId, name, color || '#888888', sort_order || 0]
    );
    res.status(201).json({ group_id: result.insertId, message: '정산 그룹이 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 존재하는 그룹명입니다.' });
    console.error('POST /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 등록 실패' });
  }
});

// PUT /api/settlement-groups/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;
    const allowed = [];
    const values = [];
    if (name !== undefined) { allowed.push('name = ?'); values.push(name); }
    if (color !== undefined) { allowed.push('color = ?'); values.push(color); }
    if (sort_order !== undefined) { allowed.push('sort_order = ?'); values.push(sort_order); }
    if (allowed.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    const companyId = req.user.role === 'MASTER' ? undefined : req.user.company_id;
    let sql = `UPDATE settlement_groups SET ${allowed.join(', ')} WHERE group_id = ?`;
    if (companyId) { sql += ' AND company_id = ?'; values.push(companyId); }
    await pool.execute(sql, values);
    res.json({ message: '정산 그룹이 수정되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 존재하는 그룹명입니다.' });
    console.error('PUT /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 수정 실패' });
  }
});

// DELETE /api/settlement-groups/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const companyId = req.user.role === 'MASTER' ? undefined : req.user.company_id;
    let sql = 'DELETE FROM settlement_groups WHERE group_id = ?';
    const values = [req.params.id];
    if (companyId) { sql += ' AND company_id = ?'; values.push(companyId); }
    // 해당 그룹을 쓰는 payment_types의 settlement_group_id를 NULL로 (FK ON DELETE SET NULL)
    await pool.execute(sql, values);
    res.json({ message: '정산 그룹이 삭제되었습니다.' });
  } catch (err) {
    console.error('DELETE /settlement-groups error:', err);
    res.status(500).json({ error: '정산 그룹 삭제 실패' });
  }
});

module.exports = router;
