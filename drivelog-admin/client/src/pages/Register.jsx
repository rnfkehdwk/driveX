import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Register({ onBack }) {
  const [form, setForm] = useState({ company_name: '', company_code: '', ceo_name: '', phone: '', email: '', address: '', business_number: '', admin_name: '', admin_login_id: '', admin_password: '', admin_password_confirm: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [codeAvail, setCodeAvail] = useState(null);
  const [idAvail, setIdAvail] = useState(null);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    axios.get('/api/public/settings').then(r => {
      if (r.data.free_trial_days) setTrialDays(parseInt(r.data.free_trial_days));
    }).catch(() => {});
  }, []);

  // 업체코드 실시간 중복 체크
  useEffect(() => {
    if (form.company_code.length >= 4) {
      const t = setTimeout(() => {
        axios.get(`/api/public/check-code/${form.company_code.toUpperCase()}`).then(r => setCodeAvail(r.data.available)).catch(() => setCodeAvail(null));
      }, 500);
      return () => clearTimeout(t);
    } else { setCodeAvail(null); }
  }, [form.company_code]);

  // 로그인 ID 실시간 중복 체크
  useEffect(() => {
    if (form.admin_login_id.length >= 4) {
      const t = setTimeout(() => {
        axios.get(`/api/public/check-login-id/${form.admin_login_id}`).then(r => setIdAvail(r.data.available)).catch(() => setIdAvail(null));
      }, 500);
      return () => clearTimeout(t);
    } else { setIdAvail(null); }
  }, [form.admin_login_id]);

  const handleSubmit = async () => {
    if (!form.company_name || !form.company_code || !form.ceo_name || !form.phone || !form.admin_name || !form.admin_login_id || !form.admin_password) {
      alert('필수 항목을 모두 입력해주세요.'); return;
    }
    if (form.admin_password !== form.admin_password_confirm) { alert('비밀번호가 일치하지 않습니다.'); return; }
    if (form.admin_password.length < 8) { alert('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (codeAvail === false) { alert('이미 사용 중인 업체코드입니다.'); return; }
    if (idAvail === false) { alert('이미 사용 중인 로그인 ID입니다.'); return; }

    setSaving(true);
    try {
      const body = { ...form, company_code: form.company_code.toUpperCase() };
      delete body.admin_password_confirm;
      const res = await axios.post('/api/public/register', body);
      setResult(res.data);
    } catch (err) { alert(err.response?.data?.error || '가입 처리 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  const F = ({ k, label, ph, type, required, half, disabled }) => (
    <div style={{ gridColumn: half ? 'auto' : 'span 2' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>
      <input type={type || 'text'} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={ph} disabled={disabled}
        style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: disabled ? '#f3f4f6' : 'white', boxSizing: 'border-box' }} />
    </div>
  );

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 40, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{result.auto_approved ? '🎉' : '📝'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 12 }}>{result.auto_approved ? '가입 완료!' : '신청 접수 완료!'}</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8, marginBottom: 24 }}>{result.message}</div>
          {result.auto_approved && (
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#166534', lineHeight: 2 }}>
                <div>업체코드: <strong>{result.company_code}</strong></div>
                <div>무료 체험: <strong>{result.trial_days}일</strong> ({result.trial_expires_at}까지)</div>
              </div>
            </div>
          )}
          <button onClick={onBack} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>로그인 페이지로 이동</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>Drive<span style={{ color: '#2563eb' }}>Log</span></div>
          <div style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>업체 가입 신청</div>
          <div style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, background: '#eff6ff', display: 'inline-block', fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
            {trialDays}일 무료 체험
          </div>
        </div>

        {/* 업체 정보 */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, padding: '8px 0', borderBottom: '2px solid #e5e7eb' }}>업체 정보</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <F k="company_name" label="업체명" ph="양양대리운전" required half />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>업체코드 *</label>
            <input value={form.company_code} onChange={e => setForm(p => ({ ...p, company_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="YANGYANG01" maxLength={20}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${codeAvail === true ? '#16a34a' : codeAvail === false ? '#dc2626' : '#d1d5db'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {codeAvail === true && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>사용 가능</div>}
            {codeAvail === false && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>이미 사용 중</div>}
          </div>
          <F k="ceo_name" label="대표자명" ph="김대표" required half />
          <F k="phone" label="연락처" ph="010-1234-5678" required half />
          <F k="email" label="이메일" ph="yang@example.com" half />
          <F k="business_number" label="사업자번호" ph="123-45-67890" half />
          <F k="address" label="주소" ph="강원특별자치도 양양군..." />
        </div>

        {/* 관리자 계정 */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, padding: '8px 0', borderBottom: '2px solid #e5e7eb' }}>관리자 계정</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <F k="admin_name" label="관리자 이름" ph="김관리" required half />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>로그인 ID *</label>
            <input value={form.admin_login_id} onChange={e => setForm(p => ({ ...p, admin_login_id: e.target.value }))} placeholder="sa_yang"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${idAvail === true ? '#16a34a' : idAvail === false ? '#dc2626' : '#d1d5db'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {idAvail === true && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>사용 가능</div>}
            {idAvail === false && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>이미 사용 중</div>}
          </div>
          <F k="admin_password" label="비밀번호" ph="8자 이상" type="password" required half />
          <F k="admin_password_confirm" label="비밀번호 확인" ph="비밀번호 재입력" type="password" required half />
        </div>

        <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '처리 중...' : '가입 신청'}
        </button>

        <div onClick={onBack} style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
          이미 계정이 있으신가요? <span style={{ color: '#2563eb', fontWeight: 600 }}>로그인</span>
        </div>
      </div>
    </div>
  );
}
