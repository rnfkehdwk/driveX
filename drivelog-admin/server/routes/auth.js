const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { company_code, login_id, password } = req.body;

  if (!login_id || !password) {
    return res.status(400).json({ error: '로그인 ID와 비밀번호를 입력하세요.' });
  }

  try {
    let sql = `SELECT u.*, c.company_code, c.company_name, c.status AS company_status, c.trial_expires_at
               FROM users u LEFT JOIN companies c ON u.company_id = c.company_id
               WHERE u.login_id = ?`;
    const params = [login_id];

    if (company_code) {
      sql += ` AND (c.company_code = ? OR u.role = 'MASTER')`;
      params.push(company_code);
    }

    const [rows] = await pool.execute(sql, params);
    if (rows.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = rows[0];

    // 계정 잠금 확인
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: '계정이 잠겨있습니다.', locked_until: user.locked_until });
    }

    // 계정 상태 확인
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: `계정 상태: ${user.status}. 관리자에게 문의하세요.` });
    }

    // 업체 상태 확인 (MASTER는 업체 없으므로 통과)
    if (user.role !== 'MASTER' && user.company_status) {
      if (user.company_status === 'PENDING') {
        return res.status(403).json({ error: '업체 승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.' });
      }
      if (user.company_status === 'SUSPENDED') {
        return res.status(403).json({ error: '업체가 정지 상태입니다. 관리자에게 문의하세요.' });
      }
      // TRIAL 상태: 만료 여부 확인
      if (user.company_status === 'TRIAL') {
        if (user.trial_expires_at && new Date(user.trial_expires_at) < new Date()) {
          return res.status(403).json({ error: '무료 체험 기간이 만료되었습니다. 유료 전환을 위해 관리자에게 문의하세요.' });
        }
      }
      // ACTIVE와 TRIAL(미만료)만 통과
      if (!['ACTIVE', 'TRIAL'].includes(user.company_status)) {
        return res.status(403).json({ error: `업체 상태: ${user.company_status}. 관리자에게 문의하세요.` });
      }
    }

    // 비밀번호 검증
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const failCount = user.login_fail_count + 1;
      const maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5');
      const lockMinutes = parseInt(process.env.LOGIN_LOCK_MINUTES || '30');
      let lockUntil = null;
      if (failCount >= maxAttempts) lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);

      await pool.execute('UPDATE users SET login_fail_count = ?, locked_until = ? WHERE user_id = ?', [failCount, lockUntil, user.user_id]);
      writeAuditLog({ company_id: user.company_id, user_id: user.user_id, action: 'LOGIN_FAIL', ip_address: req.ip, user_agent: req.get('user-agent') });

      if (lockUntil) return res.status(423).json({ error: `${maxAttempts}회 실패로 계정이 ${lockMinutes}분간 잠깁니다.` });
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 로그인 성공
    await pool.execute('UPDATE users SET login_fail_count = 0, locked_until = NULL, last_login_at = NOW() WHERE user_id = ?', [user.user_id]);

    const payload = { user_id: user.user_id, company_id: user.company_id, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });
    const refreshToken = jwt.sign({ user_id: user.user_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute('INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at) VALUES (?, ?, ?, ?)', [user.user_id, tokenHash, req.get('user-agent'), expiresAt]);

    writeAuditLog({ company_id: user.company_id, user_id: user.user_id, action: 'LOGIN_SUCCESS', ip_address: req.ip, user_agent: req.get('user-agent') });

    const responseUser = {
      user_id: user.user_id, company_id: user.company_id, company_code: user.company_code,
      company_name: user.company_name, role: user.role, name: user.name, phone: user.phone, vehicle_number: user.vehicle_number,
    };

    // TRIAL 업체면 체험 만료일 정보도 포함
    if (user.company_status === 'TRIAL' && user.trial_expires_at) {
      responseUser.trial_expires_at = user.trial_expires_at;
      responseUser.is_trial = true;
    }

    res.json({ accessToken, refreshToken, user: responseUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token이 필요합니다.' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [tokens] = await pool.execute('SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()', [decoded.user_id, tokenHash]);
    if (tokens.length === 0) return res.status(401).json({ error: '유효하지 않은 refresh token입니다.' });

    const [users] = await pool.execute(`SELECT u.*, c.company_code, c.company_name FROM users u LEFT JOIN companies c ON u.company_id = c.company_id WHERE u.user_id = ?`, [decoded.user_id]);
    if (users.length === 0 || users[0].status !== 'ACTIVE') return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });

    const user = users[0];
    const payload = { user_id: user.user_id, company_id: user.company_id, role: user.role, name: user.name };
    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });
    res.json({ accessToken: newAccessToken });
  } catch (err) { res.status(401).json({ error: '토큰 갱신에 실패했습니다.' }); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.company_id, u.role, u.name, u.phone, u.email,
              u.vehicle_number, u.vehicle_type, u.profile_image,
              c.company_code, c.company_name, c.status AS company_status, c.trial_expires_at
       FROM users u LEFT JOIN companies c ON u.company_id = c.company_id WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.user_id]);
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'LOGOUT', ip_address: req.ip });
    res.json({ message: '로그아웃 되었습니다.' });
  } catch (err) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
});

module.exports = router;
