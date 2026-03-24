const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

const MAX_MASTER_ACCOUNTS = 3;

// GET /api/users - 사용자 목록
router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { role, status, q } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role !== 'MASTER') {
      where += ' AND u.company_id = ?';
      params.push(req.user.company_id);
    }
    if (role) { where += ' AND u.role = ?'; params.push(role); }
    if (status) { where += ' AND u.status = ?'; params.push(status); }
    if (q) { where += ' AND (u.name LIKE ? OR u.login_id LIKE ? OR u.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.company_id, u.login_id, u.role, u.name, u.phone, u.email,
              u.vehicle_number, u.vehicle_type, u.status, u.last_login_at,
              u.created_at, c.company_name
       FROM users u LEFT JOIN companies c ON u.company_id = c.company_id
       ${where} ORDER BY u.created_at DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: '사용자 목록 조회에 실패했습니다.' });
  }
});

// GET /api/users/riders - 같은 업체 기사 목록
router.get('/riders', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, name, phone, vehicle_number
       FROM users WHERE company_id = ? AND role = 'RIDER' AND status = 'ACTIVE'
       ORDER BY name`,
      [req.user.company_id]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: '기사 목록 조회에 실패했습니다.' });
  }
});

// GET /api/users/master-count - MASTER 계정 수 조회
router.get('/master-count', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'MASTER'");
    res.json({ count: rows[0].cnt, max: MAX_MASTER_ACCOUNTS });
  } catch (err) {
    res.status(500).json({ error: 'MASTER 계정 수 조회 실패' });
  }
});

// POST /api/users - 사용자 등록
router.post('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { login_id, password, role, name, phone, email, vehicle_number, vehicle_type } = req.body;

    if (!login_id || !password || !name || !phone) {
      return res.status(400).json({ error: '필수 항목을 입력하세요. (login_id, password, name, phone)' });
    }

    // MASTER 계정 생성은 MASTER만 가능
    if (role === 'MASTER' && req.user.role !== 'MASTER') {
      return res.status(403).json({ error: 'MASTER 계정은 MASTER만 생성할 수 있습니다.' });
    }

    // MASTER 계정 최대 3개 제한
    if (role === 'MASTER') {
      const [masterCount] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'MASTER'");
      if (masterCount[0].cnt >= MAX_MASTER_ACCOUNTS) {
        return res.status(400).json({ error: `MASTER 계정은 최대 ${MAX_MASTER_ACCOUNTS}개까지만 생성할 수 있습니다. (현재 ${masterCount[0].cnt}개)` });
      }
    }

    // SUPER_ADMIN은 RIDER, SUPER_ADMIN만 생성 가능
    if (req.user.role === 'SUPER_ADMIN' && role && !['RIDER', 'SUPER_ADMIN'].includes(role)) {
      return res.status(403).json({ error: '허용되지 않는 권한입니다.' });
    }

    // 중복 확인
    const [existing] = await pool.execute('SELECT user_id FROM users WHERE login_id = ?', [login_id]);
    if (existing.length > 0) return res.status(409).json({ error: '이미 사용 중인 로그인 ID입니다.' });

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(password, rounds);

    // MASTER 계정은 company_id가 null
    let companyId;
    if (role === 'MASTER') {
      companyId = null;
    } else if (req.user.role === 'MASTER') {
      companyId = req.body.company_id || null;
    } else {
      companyId = req.user.company_id;
    }

    const [result] = await pool.execute(
      `INSERT INTO users (company_id, login_id, password_hash, role, name, phone, email, vehicle_number, vehicle_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [companyId, login_id, hash, role || 'RIDER', name, phone, email || null, vehicle_number || null, vehicle_type || null]
    );

    await pool.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [result.insertId, hash]);

    writeAuditLog({
      company_id: companyId, user_id: req.user.user_id,
      action: 'USER_CREATE', target_table: 'users', target_id: result.insertId,
      detail: { role: role || 'RIDER' },
      ip_address: req.ip,
    });

    res.status(201).json({ user_id: result.insertId, message: '사용자가 등록되었습니다.' });
  } catch (err) {
    console.error('POST /users error:', err);
    res.status(500).json({ error: '사용자 등록에 실패했습니다.' });
  }
});

// PUT /api/users/:id - 사용자 수정
router.put('/:id', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const baseAllowed = ['name', 'phone', 'email', 'vehicle_number', 'vehicle_type', 'status', 'role'];
    const allowed = req.user.role === 'MASTER' ? [...baseAllowed, 'company_id'] : baseAllowed;

    // SUPER_ADMIN은 RIDER, SUPER_ADMIN만 설정 가능
    if (req.user.role === 'SUPER_ADMIN' && req.body.role && !['RIDER', 'SUPER_ADMIN'].includes(req.body.role)) {
      return res.status(403).json({ error: '허용되지 않는 권한입니다.' });
    }

    // MASTER로 역할 변경 시 3개 제한 체크
    if (req.body.role === 'MASTER') {
      if (req.user.role !== 'MASTER') return res.status(403).json({ error: 'MASTER 권한 부여는 MASTER만 가능합니다.' });
      const [masterCount] = await pool.execute("SELECT COUNT(*) AS cnt FROM users WHERE role = 'MASTER' AND user_id != ?", [req.params.id]);
      if (masterCount[0].cnt >= MAX_MASTER_ACCOUNTS) {
        return res.status(400).json({ error: `MASTER 계정은 최대 ${MAX_MASTER_ACCOUNTS}개까지만 가능합니다.` });
      }
    }

    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { updates.push(`${key} = ?`); values.push(req.body[key]); }
    }

    // MASTER로 변경 시 company_id를 null로
    if (req.body.role === 'MASTER' && !updates.includes('company_id = ?')) {
      updates.push('company_id = ?');
      values.push(null);
    }

    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    values.push(req.params.id);

    if (req.user.role === 'SUPER_ADMIN') {
      values.push(req.user.company_id);
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ? AND company_id = ?`, values);
    } else {
      await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values);
    }

    writeAuditLog({
      company_id: req.user.company_id, user_id: req.user.user_id,
      action: 'USER_UPDATE', target_table: 'users', target_id: parseInt(req.params.id),
      ip_address: req.ip,
    });

    res.json({ message: '사용자 정보가 수정되었습니다.' });
  } catch (err) {
    console.error('PUT /users/:id error:', err);
    res.status(500).json({ error: '사용자 수정에 실패했습니다.' });
  }
});

module.exports = router;
