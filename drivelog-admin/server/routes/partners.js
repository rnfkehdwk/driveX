const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');

async function generatePartnerCode(companyId) {
  const [companies] = await pool.execute('SELECT company_code FROM companies WHERE company_id = ?', [companyId]);
  if (companies.length === 0) return null;
  const prefix = companies[0].company_code.substring(0, 4).toUpperCase();
  const [rows] = await pool.execute(`SELECT partner_code FROM partner_companies WHERE company_id = ? AND partner_code LIKE ? ORDER BY partner_code DESC LIMIT 1`, [companyId, `${prefix}-P%`]);
  let nextNum = 1;
  if (rows.length > 0) { const lastNum = parseInt(rows[0].partner_code.split('-P')[1], 10); if (!isNaN(lastNum)) nextNum = lastNum + 1; }
  return `${prefix}-P${String(nextNum).padStart(3, '0')}`;
}

router.get('/', authenticate, async (req, res) => {
  try {
    let where, params;
    if (req.user.role === 'MASTER') {
      const companyId = req.query.company_id;
      if (companyId) { where = 'WHERE p.company_id = ?'; params = [companyId]; }
      else { where = 'WHERE 1=1'; params = []; }
    } else { where = 'WHERE p.company_id = ?'; params = [req.user.company_id]; }
    const [rows] = await pool.execute(`SELECT p.partner_id, p.company_id, p.partner_code, p.name, p.phone, p.address, p.contact_person, p.memo, p.status, p.created_at, c.company_name, c.company_code FROM partner_companies p LEFT JOIN companies c ON p.company_id = c.company_id ${where} ORDER BY p.partner_code`, params);
    res.json({ data: rows });
  } catch (err) { console.error('GET /partners error:', err); res.status(500).json({ error: '제휴업체 목록 조회에 실패했습니다.' }); }
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 제휴업체 등록이 불가합니다.' });
  try {
    const { name, phone, address, contact_person, memo, company_id } = req.body;
    if (!name) return res.status(400).json({ error: '업체명은 필수입니다.' });
    const targetCompanyId = req.user.role === 'MASTER' ? company_id : req.user.company_id;
    if (!targetCompanyId) return res.status(400).json({ error: '소속 업체를 선택해주세요.' });
    const partnerCode = await generatePartnerCode(targetCompanyId);
    const [result] = await pool.execute(`INSERT INTO partner_companies (company_id, partner_code, name, phone, address, contact_person, memo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [targetCompanyId, partnerCode, name, phone || null, address || null, contact_person || null, memo || null]);
    res.status(201).json({ partner_id: result.insertId, partner_code: partnerCode, message: '제휴업체가 등록되었습니다.' });
  } catch (err) { console.error('POST /partners error:', err); res.status(500).json({ error: '제휴업체 등록에 실패했습니다.' }); }
});

router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'MASTER'), checkLicense, async (req, res) => {
  if (req.licenseExpired) return res.status(403).json({ error: '서비스 이용기간이 만료되어 제휴업체 수정이 불가합니다.' });
  try {
    const allowed = ['name', 'phone', 'address', 'contact_person', 'memo', 'status'];
    const updates = [], values = [];
    for (const key of allowed) { if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); } }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    if (req.user.role === 'MASTER') await pool.execute(`UPDATE partner_companies SET ${updates.join(', ')} WHERE partner_id = ?`, values);
    else { values.push(req.user.company_id); await pool.execute(`UPDATE partner_companies SET ${updates.join(', ')} WHERE partner_id = ? AND company_id = ?`, values); }
    res.json({ message: '제휴업체 정보가 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '제휴업체 수정에 실패했습니다.' }); }
});

module.exports = router;
