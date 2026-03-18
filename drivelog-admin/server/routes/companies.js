const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/companies - 업체 목록 (MASTER 전용)
router.get('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { status, q } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status) { where += ' AND c.status = ?'; params.push(status); }
    if (q) { where += ' AND (c.company_name LIKE ? OR c.company_code LIKE ? OR c.ceo_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const [rows] = await pool.execute(
      `SELECT c.*,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.role = 'RIDER' AND u.status = 'ACTIVE') AS rider_count,
              (SELECT COUNT(*) FROM rides r WHERE r.company_id = c.company_id AND MONTH(r.started_at) = MONTH(NOW()) AND YEAR(r.started_at) = YEAR(NOW())) AS monthly_rides
       FROM companies c ${where}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /companies error:', err);
    res.status(500).json({ error: '업체 목록 조회에 실패했습니다.' });
  }
});

// GET /api/companies/:id - 업체 상세
router.get('/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM companies WHERE company_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: '업체 조회에 실패했습니다.' }); }
});

// POST /api/companies - 업체 등록 (MASTER가 직접 등록)
router.post('/', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { company_code, company_name, business_number, ceo_name, phone, email, address, license_type } = req.body;
    if (!company_code || !company_name) return res.status(400).json({ error: '업체코드와 업체명은 필수입니다.' });

    // 중복 코드 확인
    const [existing] = await pool.execute('SELECT company_id FROM companies WHERE company_code = ?', [company_code]);
    if (existing.length > 0) return res.status(409).json({ error: '이미 사용 중인 업체코드입니다.' });

    const [result] = await pool.execute(
      `INSERT INTO companies (company_code, company_name, business_number, ceo_name, phone, email, address, license_type, status, approved_at, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?)`,
      [company_code, company_name, business_number || null, ceo_name || null, phone || null, email || null, address || null, license_type || 'MONTHLY', req.user.user_id]
    );

    // GPS 기본 설정 자동 생성
    await pool.execute('INSERT INTO gps_settings (company_id) VALUES (?)', [result.insertId]);

    writeAuditLog({ user_id: req.user.user_id, action: 'COMPANY_CREATE', target_table: 'companies', target_id: result.insertId, ip_address: req.ip });
    res.status(201).json({ company_id: result.insertId, message: '업체가 등록되었습니다.' });
  } catch (err) {
    console.error('POST /companies error:', err);
    res.status(500).json({ error: '업체 등록에 실패했습니다.' });
  }
});

// PUT /api/companies/:id - 업체 정보 수정
router.put('/:id', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const allowed = ['company_name', 'business_number', 'ceo_name', 'phone', 'email', 'address', 'license_type', 'license_expires'];
    const updates = [], values = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); values.push(req.body[k]); }
    }
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE companies SET ${updates.join(', ')} WHERE company_id = ?`, values);

    writeAuditLog({ user_id: req.user.user_id, action: 'COMPANY_UPDATE', target_table: 'companies', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '업체 정보가 수정되었습니다.' });
  } catch (err) { res.status(500).json({ error: '업체 수정에 실패했습니다.' }); }
});

// PUT /api/companies/:id/approve - 업체 승인
router.put('/:id/approve', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute(
      `UPDATE companies SET status = 'ACTIVE', approved_at = NOW(), approved_by = ? WHERE company_id = ?`,
      [req.user.user_id, req.params.id]
    );
    writeAuditLog({ user_id: req.user.user_id, action: 'COMPANY_APPROVE', target_table: 'companies', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '업체가 승인되었습니다.' });
  } catch (err) { res.status(500).json({ error: '업체 승인에 실패했습니다.' }); }
});

// PUT /api/companies/:id/suspend - 업체 정지
router.put('/:id/suspend', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute(`UPDATE companies SET status = 'SUSPENDED' WHERE company_id = ?`, [req.params.id]);
    writeAuditLog({ user_id: req.user.user_id, action: 'COMPANY_SUSPEND', target_table: 'companies', target_id: parseInt(req.params.id), ip_address: req.ip });
    res.json({ message: '업체가 정지되었습니다.' });
  } catch (err) { res.status(500).json({ error: '업체 정지에 실패했습니다.' }); }
});

module.exports = router;
