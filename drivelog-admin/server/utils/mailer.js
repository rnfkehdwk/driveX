// server/utils/mailer.js
// Gmail SMTP를 통한 이메일 발송 헬퍼
// 의존성: nodemailer (NAS에서 npm install nodemailer 필요)
//
// 환경변수 (.env):
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=drivelogTC@gmail.com
//   SMTP_PASS=<Gmail 앱 비밀번호 16자리>
//   SMTP_FROM_NAME=DriveLog 알림

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('[mailer] nodemailer 패키지가 설치되지 않았습니다. 이메일 발송이 비활성화됩니다.');
  console.warn('[mailer] NAS에서 다음 명령으로 설치하세요: docker exec drivelog-api npm install nodemailer');
}

let transporter = null;

function getTransporter() {
  if (!nodemailer) return null;
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP 환경변수가 설정되지 않았습니다. (.env 확인 필요)');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false, // 587은 STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // 시작 시 1회 검증
  transporter.verify((err) => {
    if (err) console.error('[mailer] SMTP 연결 검증 실패:', err.message);
    else console.log('[mailer] SMTP 연결 OK (' + SMTP_USER + ')');
  });

  return transporter;
}

/**
 * 이메일 발송
 */
async function sendMail(to, subject, html, text) {
  const t = getTransporter();
  if (!t) return { ok: false, error: 'SMTP_NOT_CONFIGURED' };

  const fromName = process.env.SMTP_FROM_NAME || 'DriveLog';
  const fromAddr = process.env.SMTP_USER;

  try {
    const info = await t.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to,
      subject,
      text: text || subject,
      html,
    });
    console.log('[mailer] 발송 완료:', info.messageId, '→', to);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] 발송 실패:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 임시 비밀번호 발송 메일 템플릿
 */
async function sendTempPasswordMail(to, userName, loginId, tempPassword, expiresMinutes = 10) {
  const subject = '[DriveLog] 임시 비밀번호 안내';

  const html = `
  <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc;">
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
        <div style="font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px;">
          Drive<span style="color: #2563eb;">Log</span>
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">임시 비밀번호 안내</div>
      </div>
      <div style="padding: 24px 0;">
        <p style="font-size: 15px; color: #334155; margin: 0 0 16px;"><strong>${userName}</strong>님, 안녕하세요.</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px;">
          요청하신 임시 비밀번호를 안내드립니다. 아래 비밀번호로 로그인 후 <strong>반드시 새 비밀번호로 변경</strong>해주세요.
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">로그인 ID</div>
          <div style="font-size: 16px; font-weight: 700; color: #1e293b; font-family: monospace; margin-bottom: 16px;">${loginId}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">임시 비밀번호</div>
          <div style="font-size: 24px; font-weight: 900; color: #2563eb; font-family: monospace; letter-spacing: 2px; padding: 12px 16px; background: white; border-radius: 8px; border: 2px dashed #bfdbfe;">${tempPassword}</div>
        </div>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
          <div style="font-size: 13px; color: #991b1b; line-height: 1.7;">
            ⚠️ <strong>중요 안내</strong><br />
            • 이 임시 비밀번호는 <strong>${expiresMinutes}분 후 자동으로 만료</strong>됩니다.<br />
            • 로그인 후 즉시 새 비밀번호로 변경해주세요.<br />
            • 본인이 요청하지 않았다면 즉시 관리자에게 알려주세요.
          </div>
        </div>
      </div>
      <div style="padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <div style="font-size: 11px; color: #94a3b8;">
          본 메일은 발신 전용이며, 답장하실 수 없습니다.<br />
          DriveLog · 대리운전 통합 관리 시스템
        </div>
      </div>
    </div>
  </div>
  `;

  const text = `[DriveLog] 임시 비밀번호 안내

${userName}님, 안녕하세요.

요청하신 임시 비밀번호를 안내드립니다.

로그인 ID: ${loginId}
임시 비밀번호: ${tempPassword}

⚠️ 이 임시 비밀번호는 ${expiresMinutes}분 후 자동으로 만료됩니다.
로그인 후 반드시 새 비밀번호로 변경해주세요.

본인이 요청하지 않았다면 즉시 관리자에게 알려주세요.

— DriveLog
`;

  return sendMail(to, subject, html, text);
}

/**
 * 8자리 임시 비밀번호 생성 (영문 대소문자 + 숫자)
 * 헷갈리기 쉬운 문자 제외 (0, O, 1, l, I)
 */
function generateTempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(8);
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

module.exports = {
  sendMail,
  sendTempPasswordMail,
  generateTempPassword,
  getTransporter,
};
