const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/customers - 고객 목록 + 검색
router.get('/', authenticate, async (req, res) => {
  try {
    const { q, status = 'ACTIVE' } = req.query;
    let where = 'WHERE c.company_id = ? AND c.status = ?';
    const params = [req.user.company_id, status];

    if (q) {
      where += ' AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.phone LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const [rows] = await pool.execute(
      `SELECT c.customer_id, c.customer_code, c.name, c.phone, c.email,
              c.address, c.memo, c.mileage_balance, c.status, c.created_at
       FROM customers c ${where} ORDER BY c.name`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /customers error:', err);
    res.status(500).json({ error: '고객 목록 조회에 실패했습니다.' });
  }
});

// POST /api/customers - 고객 등록
router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const { customer_code, name, phone, email, address, memo } = req.body;
    if (!name) return res.status(400).json({ error: '고객명은 필수입니다.' });

    const [result] = await pool.execute(
      `INSERT INTO customers (company_id, customer_code, name, phone, email, address, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.company_id, customer_code || null, name, phone || null, email || null, address || null, memo || null]
    );

    writeAuditLog({
      company_id: req.user.company_id, user_id: req.user.user_id,
      action: 'CUSTOMER_CREATE', target_table: 'customers', target_id: result.insertId,
      ip_address: req.ip,
    });

    res.status(201).json({ customer_id: result.insertId, message: '고객이 등록되었습니다.' });
  } catch (err) {
    console.error('POST /customers error:', err);
    res.status(500).json({ error: '고객 등록에 실패했습니다.' });
  }
});

// PUT /api/customers/:id - 고객 수정
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    const allowed = ['customer_code', 'name', 'phone', 'email', 'address', 'memo', 'status'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id, req.user.company_id);
    await pool.execute(`UPDATE customers SET ${updates.join(', ')} WHERE customer_id = ? AND company_id = ?`, values);
    res.json({ message: '고객 정보가 수정되었습니다.' });
  } catch (err) {
    console.error('PUT /customers/:id error:', err);
    res.status(500).json({ error: '고객 수정에 실패했습니다.' });
  }
});

// DELETE /api/customers/:id - 고객 소프트 삭제
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), async (req, res) => {
  try {
    await pool.execute(
      `UPDATE customers SET status = 'DELETED' WHERE customer_id = ? AND company_id = ?`,
      [req.params.id, req.user.company_id]
    );
    res.json({ message: '고객이 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: '고객 삭제에 실패했습니다.' });
  }
});

module.exports = router;
