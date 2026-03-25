const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

async function generateCustomerCode(companyId) {
  const [companies] = await pool.execute('SELECT company_code FROM companies WHERE company_id = ?', [companyId]);
  if (companies.length === 0) return null;
  const prefix = companies[0].company_code.substring(0, 4).toUpperCase();
  const [rows] = await pool.execute(`SELECT customer_code FROM customers WHERE company_id = ? AND customer_code LIKE ? ORDER BY customer_code DESC LIMIT 1`, [companyId, `${prefix}-%`]);
  let nextNum = 1;
  if (rows.length > 0) { const lastNum = parseInt(rows[0].customer_code.split('-')[1], 10); if (!isNaN(lastNum)) nextNum = lastNum + 1; }
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { q, status = 'ACTIVE' } = req.query;
    let where, params;
    if (req.user.role === 'MASTER') {
      const companyId = req.query.company_id;
      if (companyId) { where = 'WHERE c.company_id = ? AND c.status = ?'; params = [companyId, status]; }
      else { where = 'WHERE c.status = ?'; params = [status]; }
    } else { where = 'WHERE c.company_id = ? AND c.status = ?'; params = [req.user.company_id, status]; }
    if (q) { where += ' AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const [rows] = await pool.execute(`SELECT c.customer_id, c.company_id, c.customer_code, c.name, c.phone, c.email, c.address, c.memo, c.mileage_balance, c.status, c.created_at, co.company_name, co.company_code AS co_code FROM customers c LEFT JOIN companies co ON c.company_id = co.company_id ${where} ORDER BY c.customer_code`, params);
    res.json({ data: rows });
  } catch (err) { console.error('GET /customers error:', err); res.status(500).json({ error: '고객 목록 조회에 실패했습니다.' }); }
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER', 'RIDER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 고객 등록이 불가합니다.' });
  try {
    const { name, phone, email, address, memo, company_id } = req.body;
    if (!name) return res.status(400).json({ error: '고객명은 필수입니다.' });
    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '소속 업체를 선택해주세요.' });
    const customerCode = await generateCustomerCode(targetCompanyId);
    const [result] = await pool.execute(`INSERT INTO customers (company_id, customer_code, name, phone, email, address, memo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [targetCompanyId, customerCode, name, phone || null, email || null, address || null, memo || null]);
    writeAuditLog({ company_id: targetCompanyId, user_id: req.user.user_id, action: 'CUSTOMER_CREATE', target_table: 'customers', target_id: result.insertId, ip_address: req.ip });
    res.status(201).json({ customer_id: result.insertId, customer_code: customerCode, message: '고객이 등록되었습니다.' });
  } catch (err) { console.error('POST /customers error:', err); res.status(500).json({ error: '고객 등록에 실패했습니다.' }); }
});

router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 고객 수정이 불가합니다.' });
  try {
    const baseAllowed = ['name', 'phone', 'email', 'address', 'memo', 'status'];
    const allowed = req.user.role === 'MASTER' ? [...baseAllowed, 'company_id'] : baseAllowed;
    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    if (req.user.role === 'MASTER') await pool.execute(`UPDATE customers SET ${updates.join(', ')} WHERE customer_id = ?`, values);
    else { values.push(req.user.company_id); await pool.execute(`UPDATE customers SET ${updates.join(', ')} WHERE customer_id = ? AND company_id = ?`, values); }
    res.json({ message: '고객 정보가 수정되었습니다.' });
  } catch (err) { console.error('PUT /customers/:id error:', err); res.status(500).json({ error: '고객 수정에 실패했습니다.' }); }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 고객 삭제가 불가합니다.' });
  try {
    if (req.user.role === 'MASTER') await pool.execute(`UPDATE customers SET status = 'DELETED' WHERE customer_id = ?`, [req.params.id]);
    else await pool.execute(`UPDATE customers SET status = 'DELETED' WHERE customer_id = ? AND company_id = ?`, [req.params.id, req.user.company_id]);
    res.json({ message: '고객이 삭제되었습니다.' });
  } catch (err) { res.status(500).json({ error: '고객 삭제에 실패했습니다.' }); }
});

module.exports = router;
