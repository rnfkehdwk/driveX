const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// 5자리 숫자 업체코드 자동 생성
async function generateCompanyCode() {
  const [rows] = await pool.execute(
    "SELECT company_code FROM companies WHERE company_code REGEXP '^[0-9]{5}$' ORDER BY company_code DESC LIMIT 1"
  );
  if (rows.length === 0) return '10001';
  const lastNum = parseInt(rows[0].company_code, 10);
  return String(lastNum + 1).padStart(5, '0');
}

router.post('/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [regSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'registration_enabled'");
    if (regSetting.length > 0 && regSetting[0].setting_value === 'false') return res.status(403).json({ error: '현재 업체 가입이 중지되어 있습니다.' });

    const { company_name, ceo_name, phone, email, address, business_number, admin_name, admin_login_id, admin_password } = req.body;
    if (!company_name || !ceo_name || !phone || !admin_name || !admin_login_id || !admin_password) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
    if (admin_password.length < 8) return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });

    await conn.beginTransaction();

    // 업체코드 자동 생성
    const company_code = await generateCompanyCode();

    const [existingUser] = await conn.execute('SELECT user_id FROM users WHERE login_id = ?', [admin_login_id]);
    if (existingUser.length > 0) { await conn.rollback(); return res.status(409).json({ error: '이미 사용 중인 로그인 ID입니다.' }); }

    const [trialSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'free_trial_days'");
    const trialDays = trialSetting.length > 0 ? parseInt(trialSetting[0].setting_value) || 14 : 14;
    const [autoApproveSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'auto_approve_trial'");
    const autoApprove = autoApproveSetting.length > 0 && autoApproveSetting[0].setting_value === 'true';
    const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    const status = autoApprove ? 'TRIAL' : 'PENDING';

    const [companyResult] = await conn.execute(
      `INSERT INTO companies (company_code, company_name, business_number, ceo_name, phone, email, address, license_type, plan_id, status, trial_expires_at, registration_source) VALUES (?, ?, ?, ?, ?, ?, ?, 'MONTHLY', 1, ?, ?, 'SELF')`,
      [company_code, company_name, business_number || null, ceo_name, phone, email || null, address || null, status, trialExpiresAt]);
    const companyId = companyResult.insertId;
    try { await conn.execute('INSERT INTO gps_settings (company_id) VALUES (?)', [companyId]); } catch (e) {}

    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(admin_password, rounds);
    const [userResult] = await conn.execute(`INSERT INTO users (company_id, login_id, password_hash, role, name, phone, email, status) VALUES (?, ?, ?, 'SUPER_ADMIN', ?, ?, ?, 'ACTIVE')`, [companyId, admin_login_id, hash, admin_name, phone, email || null]);
    await conn.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [userResult.insertId, hash]);
    await conn.commit();

    const message = autoApprove ? `가입이 완료되었습니다! ${trialDays}일간 무료로 이용하실 수 있습니다. 업체코드: ${company_code}` : `가입 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다. 업체코드: ${company_code}`;
    res.status(201).json({ message, company_id: companyId, company_code, status, trial_days: trialDays, trial_expires_at: trialExpiresAt.toISOString().slice(0, 10), auto_approved: autoApprove });
  } catch (err) { await conn.rollback(); console.error('POST /public/register error:', err); res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' }); }
  finally { conn.release(); }
});

router.get('/check-login-id/:id', async (req, res) => {
  try { const [rows] = await pool.execute('SELECT user_id FROM users WHERE login_id = ?', [req.params.id]); res.json({ available: rows.length === 0 }); }
  catch (err) { res.status(500).json({ error: '확인 실패' }); }
});

router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('free_trial_days', 'registration_enabled')");
    const settings = {}; rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json(settings);
  } catch (err) { res.status(500).json({ error: '설정 조회 실패' }); }
});

module.exports = router;
