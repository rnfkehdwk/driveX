const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// POST /api/public/register - 업체 셀프 가입 (인증 불필요)
router.post('/register', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // 가입 활성화 여부 확인
    const [regSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'registration_enabled'");
    if (regSetting.length > 0 && regSetting[0].setting_value === 'false') {
      return res.status(403).json({ error: '현재 업체 가입이 중지되어 있습니다. 관리자에게 문의하세요.' });
    }

    const { company_name, company_code, ceo_name, phone, email, address, business_number, admin_name, admin_login_id, admin_password } = req.body;

    // 필수 항목 검증
    if (!company_name || !company_code || !ceo_name || !phone || !admin_name || !admin_login_id || !admin_password) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
    }

    // 업체코드 형식 검증 (영문+숫자, 4~20자)
    if (!/^[A-Z0-9]{4,20}$/.test(company_code)) {
      return res.status(400).json({ error: '업체코드는 영문 대문자와 숫자 조합 4~20자로 입력해주세요.' });
    }

    // 비밀번호 복잡도 검증
    if (admin_password.length < 8) {
      return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    }

    await conn.beginTransaction();

    // 업체코드 중복 확인
    const [existingCode] = await conn.execute('SELECT company_id FROM companies WHERE company_code = ?', [company_code]);
    if (existingCode.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: '이미 사용 중인 업체코드입니다. 다른 코드를 입력해주세요.' });
    }

    // 로그인 ID 중복 확인
    const [existingUser] = await conn.execute('SELECT user_id FROM users WHERE login_id = ?', [admin_login_id]);
    if (existingUser.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: '이미 사용 중인 로그인 ID입니다.' });
    }

    // 무료 체험 기간 조회
    const [trialSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'free_trial_days'");
    const trialDays = trialSetting.length > 0 ? parseInt(trialSetting[0].setting_value) || 14 : 14;

    // 자동 승인 여부 조회
    const [autoApproveSetting] = await conn.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'auto_approve_trial'");
    const autoApprove = autoApproveSetting.length > 0 && autoApproveSetting[0].setting_value === 'true';

    // 체험 만료일 계산
    const trialExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // 업체 등록 (자동승인이면 TRIAL, 아니면 PENDING)
    const status = autoApprove ? 'TRIAL' : 'PENDING';
    const [companyResult] = await conn.execute(
      `INSERT INTO companies (company_code, company_name, business_number, ceo_name, phone, email, address,
        license_type, plan_id, status, trial_expires_at, registration_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'MONTHLY', 1, ?, ?, 'SELF')`,
      [company_code, company_name, business_number || null, ceo_name, phone, email || null, address || null, status, trialExpiresAt]
    );
    const companyId = companyResult.insertId;

    // GPS 기본 설정 생성
    try { await conn.execute('INSERT INTO gps_settings (company_id) VALUES (?)', [companyId]); } catch (e) { /* ignore if table doesn't exist */ }

    // 관리자 계정 생성
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hash = await bcrypt.hash(admin_password, rounds);

    const [userResult] = await conn.execute(
      `INSERT INTO users (company_id, login_id, password_hash, role, name, phone, email, status)
       VALUES (?, ?, ?, 'SUPER_ADMIN', ?, ?, ?, 'ACTIVE')`,
      [companyId, admin_login_id, hash, admin_name, phone, email || null]
    );

    // 비밀번호 이력
    await conn.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [userResult.insertId, hash]);

    await conn.commit();

    const message = autoApprove
      ? `가입이 완료되었습니다! ${trialDays}일간 무료로 이용하실 수 있습니다. 업체코드: ${company_code}, 로그인 ID: ${admin_login_id}로 바로 로그인하세요.`
      : `가입 신청이 접수되었습니다. 관리자 승인 후 이용 가능합니다. 업체코드: ${company_code}`;

    res.status(201).json({
      message,
      company_id: companyId,
      company_code,
      status,
      trial_days: trialDays,
      trial_expires_at: trialExpiresAt.toISOString().slice(0, 10),
      auto_approved: autoApprove,
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /public/register error:', err);
    res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' });
  } finally { conn.release(); }
});

// GET /api/public/check-code/:code - 업체코드 중복 확인 (공개)
router.get('/check-code/:code', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT company_id FROM companies WHERE company_code = ?', [req.params.code.toUpperCase()]);
    res.json({ available: rows.length === 0 });
  } catch (err) { res.status(500).json({ error: '확인 실패' }); }
});

// GET /api/public/check-login-id/:id - 로그인 ID 중복 확인 (공개)
router.get('/check-login-id/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT user_id FROM users WHERE login_id = ?', [req.params.id]);
    res.json({ available: rows.length === 0 });
  } catch (err) { res.status(500).json({ error: '확인 실패' }); }
});

// GET /api/public/settings - 공개 설정 (가입 페이지에서 체험 기간 표시용)
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('free_trial_days', 'registration_enabled')"
    );
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json(settings);
  } catch (err) { res.status(500).json({ error: '설정 조회 실패' }); }
});

module.exports = router;
