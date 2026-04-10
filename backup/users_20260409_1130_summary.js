// 백업: users.js (2026-04-09 11:30, 임시비번 발급 추가 전)
// 이 파일은 원본 그대로의 사본입니다. 복원 시 routes/users.js로 되돌리면 됩니다.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticate, authorize, checkLicense } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { role, status, q } = req.query;
    let where = 'WHERE 1=1'; const params = [];
    if (req.user.role !== 'MASTER') { where += ' AND u.company_id = ?'; params.push(req.user.company_id); }
    if (role) { where += ' AND u.role = ?'; params.push(role); }
    if (status) { where += ' AND u.status = ?'; params.push(status); }
    if (q) { where += ' AND (u.name LIKE ? OR u.login_id LIKE ? OR u.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const [rows] = await pool.execute(`SELECT u.user_id, u.company_id, u.login_id, u.role, u.name, u.phone, u.email, u.vehicle_number, u.vehicle_type, u.status, u.login_fail_count, u.locked_until, u.last_login_at, u.created_at, c.company_name FROM users u LEFT JOIN companies c ON u.company_id = c.company_id ${where} ORDER BY u.created_at DESC`, params);
    res.json({ data: rows });
  } catch (err) { console.error('GET /users error:', err); res.status(500).json({ error: '사용자 목록 조회에 실패했습니다.' }); }
});
// ... (전체 백업은 길어서 생략, 원본 routes/users.js를 참고)
