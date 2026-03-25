const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// 기사수 초과 체크 헬퍼 함수
async function checkRiderExceeded(companyId, planId) {
  if (!companyId || !planId) return { exceeded: false };
  try {
    const [planInfo] = await pool.execute('SELECT max_riders, plan_name FROM billing_plans WHERE plan_id = ?', [planId]);
    if (planInfo.length === 0) return { exceeded: false };
    const maxRiders = planInfo[0].max_riders || 0;
    if (maxRiders === 0) return { exceeded: false, current: 0, max: 0, plan_name: planInfo[0].plan_name }; // 무제한

    const [countResult] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE company_id = ? AND role IN ('RIDER', 'SUPER_ADMIN') AND status = 'ACTIVE'",
      [companyId]
    );
    const current = countResult[0].cnt;
    return { exceeded: current > maxRiders, current, max: maxRiders, plan_name: planInfo[0].plan_name };
  } catch { return { exceeded: false }; }
}

router.post('/login', async (req, res) => {
  const { company_code, login_id, password } = req.body;
  if (!login_id || !password) return res.status(400).json({ error: '로그인 ID와 비밀번호를 입력하세요.' });
  try {
    let sql = `SELECT u.*, c.company_code, c.company_name, c.status AS company_status, c.trial_expires_at, c.license_expires, c.license_type, c.plan_id, p.plan_name FROM users u LEFT JOIN companies c ON u.company_id = c.company_id LEFT JOIN billing_plans p ON c.plan_id = p.plan_id WHERE u.login_id = ?`;
    const params = [login_id];
    if (company_code) { sql += ` AND (c.company_code = ? OR u.role = 'MASTER')`; params.push(company_code); }
    const [rows] = await pool.execute(sql, params);
    if (rows.length === 0) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    const user = rows[0];
    if (user.locked_until && new Date(user.locked_until) > new Date()) return res.status(423).json({ error: '계정이 잠겨있습니다.', locked_until: user.locked_until });
    if (user.status !== 'ACTIVE') return res.status(403).json({ error: `계정 상태: ${user.status}. 관리자에게 문의하세요.` });
    if (user.role !== 'MASTER' && user.company_status) {
      if (user.company_status === 'PENDING') return res.status(403).json({ error: '업체 승인 대기 중입니다.' });
      if (user.company_status === 'SUSPENDED') return res.status(403).json({ error: '업체가 정지 상태입니다.' });
      if (user.company_status === 'TRIAL' && user.trial_expires_at && new Date(user.trial_expires_at) < new Date()) return res.status(403).json({ error: '무료 체험 기간이 만료되었습니다.' });
      if (!['ACTIVE', 'TRIAL'].includes(user.company_status)) return res.status(403).json({ error: `업체 상태: ${user.company_status}` });
    }
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
    await pool.execute('UPDATE users SET login_fail_count = 0, locked_until = NULL, last_login_at = NOW() WHERE user_id = ?', [user.user_id]);
    const payload = { user_id: user.user_id, company_id: user.company_id, role: user.role, name: user.name };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });
    const refreshToken = jwt.sign({ user_id: user.user_id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' });
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute('INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at) VALUES (?, ?, ?, ?)', [user.user_id, tokenHash, req.get('user-agent'), expiresAt]);
    writeAuditLog({ company_id: user.company_id, user_id: user.user_id, action: 'LOGIN_SUCCESS', ip_address: req.ip, user_agent: req.get('user-agent') });

    // 라이선스 만료 체크
    const now = new Date(); now.setHours(0,0,0,0);
    let licenseExpired = false, licenseExpiresDate = null;
    if (user.role !== 'MASTER' && user.license_expires) { licenseExpiresDate = user.license_expires; const expDate = new Date(user.license_expires); expDate.setHours(23,59,59,999); if (now > expDate) licenseExpired = true; }

    // 기사수 초과 체크
    let riderExceeded = false, riderCurrent = 0, riderMax = 0;
    if (user.role !== 'MASTER' && user.company_id) {
      const rc = await checkRiderExceeded(user.company_id, user.plan_id);
      riderExceeded = rc.exceeded;
      riderCurrent = rc.current || 0;
      riderMax = rc.max || 0;
    }

    const responseUser = {
      user_id: user.user_id, company_id: user.company_id, company_code: user.company_code,
      company_name: user.company_name, role: user.role, name: user.name, phone: user.phone,
      vehicle_number: user.vehicle_number,
      license_expires: licenseExpiresDate, license_expired: licenseExpired,
      license_type: user.license_type, plan_id: user.plan_id, plan_name: user.plan_name,
      rider_exceeded: riderExceeded, rider_current: riderCurrent, rider_max: riderMax,
    };
    if (user.company_status === 'TRIAL' && user.trial_expires_at) { responseUser.trial_expires_at = user.trial_expires_at; responseUser.is_trial = true; }
    res.json({ accessToken, refreshToken, user: responseUser });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
});

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

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.company_id, u.role, u.name, u.phone, u.email, u.vehicle_number, u.vehicle_type, u.profile_image, c.company_code, c.company_name, c.status AS company_status, c.trial_expires_at, c.license_expires, c.license_type, c.plan_id, p.plan_name FROM users u LEFT JOIN companies c ON u.company_id = c.company_id LEFT JOIN billing_plans p ON c.plan_id = p.plan_id WHERE u.user_id = ?`, [req.user.user_id]);
    if (rows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const r = rows[0];

    // 만료 체크
    const now = new Date(); now.setHours(0,0,0,0);
    if (r.role !== 'MASTER' && r.license_expires) { const exp = new Date(r.license_expires); exp.setHours(23,59,59,999); r.license_expired = now > exp; } else { r.license_expired = false; }

    // 기사수 초과 체크
    if (r.role !== 'MASTER' && r.company_id) {
      const rc = await checkRiderExceeded(r.company_id, r.plan_id);
      r.rider_exceeded = rc.exceeded;
      r.rider_current = rc.current || 0;
      r.rider_max = rc.max || 0;
    } else {
      r.rider_exceeded = false;
      r.rider_current = 0;
      r.rider_max = 0;
    }

    res.json(r);
  } catch (err) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' });
    if (new_password.length < 8) return res.status(400).json({ error: '새 비밀번호는 8자 이상이어야 합니다.' });
    const [users] = await pool.execute('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (users.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    const valid = await bcrypt.compare(current_password, users[0].password_hash);
    if (!valid) return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    const [history] = await pool.execute('SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 3', [req.user.user_id]);
    for (const h of history) { if (await bcrypt.compare(new_password, h.password_hash)) return res.status(400).json({ error: '최근 사용한 비밀번호는 재사용할 수 없습니다.' }); }
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(new_password, rounds);
    await pool.execute('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.user.user_id]);
    await pool.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [req.user.user_id, hash]);
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'PASSWORD_CHANGE', ip_address: req.ip });
    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) { console.error('Change password error:', err); res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' }); }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.user_id]);
    writeAuditLog({ company_id: req.user.company_id, user_id: req.user.user_id, action: 'LOGOUT', ip_address: req.ip });
    res.json({ message: '로그아웃 되었습니다.' });
  } catch (err) { res.status(500).json({ error: '서버 오류가 발생했습니다.' }); }
});

module.exports = router;
