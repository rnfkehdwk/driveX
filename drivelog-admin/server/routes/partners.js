const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/partners
router.get('/', authenticate, async (req, res) => {
  try {
    let where, params;
    if (req.user.role === 'MASTER') {
      // MASTER: 전체 업체 또는 특정 업체 필터
      const companyId = req.query.company_id;
      if (companyId) {
        where = 'WHERE p.company_id = ?';
        params = [companyId];
      } else {
        where = 'WHERE 1=1';
        params = [];
      }
    } else {
      where = 'WHERE p.company_id = ?';
      params = [req.user.company_id];
    }

    const [rows] = await pool.execute(
      `SELECT p.partner_id, p.company_id, p.name, p.phone, p.address, p.contact_person, p.memo, p.status, p.created_at,
              c.company_name, c.company_code
       FROM partner_companies p
       LEFT JOIN companies c ON p.company_id = c.company_id
       ${where} ORDER BY p.name`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /partners error:', err);
    res.status(500).json({ error: '제휴업체 목록 조회에 실패했습니다.' });
  }
});

// POST /api/partners
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { name, phone, address, contact_person, memo, company_id } = req.body;
    if (!name) return res.status(400).json({ error: '업체명은 필수입니다.' });

    // MASTER는 company_id를 body에서 받아야 함
    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '소속 업체를 선택해주세요.' });

    const [result] = await pool.execute(
      `INSERT INTO partner_companies (company_id, name, phone, address, contact_person, memo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetCompanyId, name, phone || null, address || null, contact_person || null, memo || null]
    );
    res.status(201).json({ partner_id: result.insertId, message: '제휴업체가 등록되었습니다.' });
  } catch (err) {
    console.error('POST /partners error:', err);
    res.status(500).json({ error: '제휴업체 등록에 실패했습니다.' });
  }
});

// PUT /api/partners/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'address', 'contact_person', 'memo', 'status'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);
    if (req.user.role === 'MASTER') {
      await pool.execute(`UPDATE partner_companies SET ${updates.join(', ')} WHERE partner_id = ?`, values);
    } else {
      values.push(req.user.company_id);
      await pool.execute(`UPDATE partner_companies SET ${updates.join(', ')} WHERE partner_id = ? AND company_id = ?`, values);
    }
    res.json({ message: '제휴업체 정보가 수정되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '제휴업체 수정에 실패했습니다.' });
  }
});

module.exports = router;
