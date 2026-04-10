const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { sendTempPasswordMail, generateTempPassword } = require('../utils/mailer');

// 로그인 ID 마스킹 (보안: 정보 유출 최소화)
// 4글자 이하: 첫 글자 + ***
// 5글자 이상: 앞 2글자 + *** + 뒤 1글자
function maskLoginId(id) {
  if (!id) return '';
  if (id.length <= 4) return id[0] + '***';
  return id.slice(0, 2) + '***' + id.slice(-1);
}

// 이메일 마스킹 (예: drivelogTC@gmail.com → dr******TC@gmail.com)
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email[0] + '***';
  if (local.length <= 3) return local[0] + '***@' + domain;
  return local.slice(0, 2) + '***' + local.slice(-1) + '@' + domain;
}

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
    if (!company_name || !ceo_name || !phone || !admin_name || !admin_login_id || !admin_password || !email) return res.status(400).json({ error: '필수 항목을 모두 입력해주세요. (이메일 포함)' });
    if (admin_password.length < 8) return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    // 이메일 형식 간단 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });

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
    // 자동 승인이면 ACTIVE (무료체험 여부는 trial_expires_at으로 판단), 아니면 관리자 승인 대기
    const status = autoApprove ? 'ACTIVE' : 'PENDING';

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

// ─── POST /api/public/find-id — 아이디 찾기 ───
// 입력: { name, phone }
// 동작: 이름+전화번호 일치하는 계정의 마스킹된 ID 반환 (여러 개면 배열)
// 보안: 매칭 실패해도 일관된 응답 (정보 유출 방지는 약하게 유지 — UX 우선)
router.post('/find-id', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: '이름과 연락처를 모두 입력해주세요.' });

    // 전화번호 정규화 (하이픈 제거 후 비교)
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    if (normalizedPhone.length < 9) return res.status(400).json({ error: '올바른 연락처를 입력해주세요.' });

    const [rows] = await pool.execute(
      `SELECT u.login_id, u.created_at, c.company_name, c.company_code
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       WHERE u.name = ?
         AND REPLACE(REPLACE(u.phone, '-', ''), ' ', '') = ?
         AND u.status = 'ACTIVE'
       ORDER BY u.created_at DESC`,
      [name, normalizedPhone]
    );

    if (rows.length === 0) {
      return res.json({ found: false, message: '일치하는 계정을 찾을 수 없습니다.' });
    }

    const accounts = rows.map(r => {
      // created_at은 mariadb 드라이버 설정에 따라 Date 객체이거나 string일 수 있음 → 안전 처리
      let createdAtStr = null;
      if (r.created_at) {
        if (typeof r.created_at === 'string') createdAtStr = r.created_at.slice(0, 10);
        else if (r.created_at instanceof Date) createdAtStr = r.created_at.toISOString().slice(0, 10);
      }
      return {
        masked_login_id: maskLoginId(r.login_id),
        company_name: r.company_name || '(시스템)',
        company_code: r.company_code || null,
        created_at: createdAtStr,
      };
    });

    res.json({ found: true, count: accounts.length, accounts });
  } catch (err) {
    console.error('POST /public/find-id error:', err);
    res.status(500).json({ error: '아이디 찾기에 실패했습니다.' });
  }
});

// ─── POST /api/public/request-password-reset — 비밀번호 재설정 요청 ───
// 입력: { login_id, name, phone }
// 동작:
//   1) 매칭 확인 (login_id + name + phone)
//   2) 매칭되고 이메일 있음 → 8자리 임시비번 생성 + 이메일 발송 + DB 저장 (10분 만료)
//   3) 매칭되고 이메일 없음 → inquiries 테이블에 PASSWORD_RESET 자동 등록 (관리자 직접 처리)
//   4) 매칭 실패 → 일관된 응답 (정보 유출 방지)
router.post('/request-password-reset', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { login_id, name, phone } = req.body;
    if (!login_id || !name || !phone) return res.status(400).json({ error: '아이디, 이름, 연락처를 모두 입력해주세요.' });

    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    // 사용자 매칭 (status=ACTIVE만)
    const [users] = await conn.execute(
      `SELECT user_id, login_id, name, email, company_id
       FROM users
       WHERE login_id = ?
         AND name = ?
         AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = ?
         AND status = 'ACTIVE'
       LIMIT 1`,
      [login_id, name, normalizedPhone]
    );

    // 매칭 실패: 일관된 응답 (계정 존재 여부 노출 방지)
    if (users.length === 0) {
      return res.json({
        ok: true,
        method: 'NONE',
        message: '입력하신 정보가 등록되어 있다면 임시 비밀번호가 발송되었습니다. 이메일을 확인해주세요.'
      });
    }

    const user = users[0];

    // 케이스 A: 이메일 있음 → 임시비번 생성 + 이메일 발송
    if (user.email) {
      const tempPassword = generateTempPassword();
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hash = await bcrypt.hash(tempPassword, rounds);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

      await conn.beginTransaction();
      await conn.execute(
        'UPDATE users SET password_hash = ?, password_must_change = TRUE, temp_password_expires_at = ?, login_fail_count = 0, locked_until = NULL WHERE user_id = ?',
        [hash, expiresAt, user.user_id]
      );
      await conn.execute('INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)', [user.user_id, hash]);
      await conn.commit();

      // 이메일 발송 (실패해도 DB는 commit 상태 — 사용자가 다시 요청 가능)
      const mailResult = await sendTempPasswordMail(user.email, user.name, user.login_id, tempPassword, 10);

      if (!mailResult.ok) {
        console.error('[request-password-reset] 메일 발송 실패:', mailResult.error, '→', user.email);
        // 메일 발송 실패해도 사용자에겐 일관된 응답 (보안 + UX)
      }

      return res.json({
        ok: true,
        method: 'EMAIL',
        masked_email: maskEmail(user.email),
        message: `등록된 이메일 ${maskEmail(user.email)}로 임시 비밀번호가 발송되었습니다. (10분 안에 로그인 후 변경)`
      });
    }

    // 케이스 B: 이메일 없음 → inquiries에 자동 등록 (관리자 직접 처리)
    // 단, 같은 사용자의 미처리 PASSWORD_RESET 문의가 24시간 내에 있으면 중복 생성 안 함
    const [recentInquiry] = await conn.execute(
      `SELECT id FROM inquiries
       WHERE user_id = ?
         AND inquiry_type = 'PASSWORD_RESET'
         AND status IN ('PENDING','IN_PROGRESS')
         AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       LIMIT 1`,
      [user.user_id]
    );

    if (recentInquiry.length === 0) {
      await conn.execute(
        `INSERT INTO inquiries (company_id, user_id, inquiry_type, title, content, status)
         VALUES (?, ?, 'PASSWORD_RESET', ?, ?, 'PENDING')`,
        [
          user.company_id,
          user.user_id,
          `[비밀번호 재설정] ${user.name}(${user.login_id})`,
          `사용자가 비밀번호 재설정을 요청했습니다.\n\n계정: ${user.login_id}\n이름: ${user.name}\n연락처: ${phone}\n\n등록된 이메일이 없어 직접 처리가 필요합니다.\n계정관리 페이지에서 임시 비밀번호를 발급해 사용자에게 직접 전달해주세요.`
        ]
      );
    }

    return res.json({
      ok: true,
      method: 'INQUIRY',
      message: '등록된 이메일이 없어 관리자에게 요청이 전달되었습니다. 곧 연락드리겠습니다.'
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error('POST /public/request-password-reset error:', err);
    res.status(500).json({ error: '비밀번호 재설정 요청에 실패했습니다.' });
  } finally {
    conn.release();
  }
});

router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('free_trial_days', 'registration_enabled')");
    const settings = {}; rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json(settings);
  } catch (err) { res.status(500).json({ error: '설정 조회 실패' }); }
});

module.exports = router;
