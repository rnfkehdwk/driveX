import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

export default function Login({ onLogin, onRegister }) {
  const [form, setForm] = useState({ company_code: '', login_id: '', password: '' });
  const [saveId, setSaveId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedLoginInfo_admin'));
      if (saved) { setForm(f => ({ ...f, company_code: saved.company_code || '', login_id: saved.login_id || '' })); setSaveId(true); }
      const isAutoLogin = localStorage.getItem('autoLogin_admin') === 'true';
      setAutoLogin(isAutoLogin);
      if (isAutoLogin && saved?.company_code && saved?.login_id) {
        const savedPw = localStorage.getItem('savedPw_admin');
        if (savedPw) doLogin({ company_code: saved.company_code, login_id: saved.login_id, password: savedPw });
      }
    } catch {}
  }, []);

  const doLogin = async (loginForm) => {
    setError(''); setLoading(true);
    try {
      const data = await login(loginForm);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (saveId || autoLogin) localStorage.setItem('savedLoginInfo_admin', JSON.stringify({ company_code: loginForm.company_code, login_id: loginForm.login_id }));
      else localStorage.removeItem('savedLoginInfo_admin');
      if (autoLogin) { localStorage.setItem('autoLogin_admin', 'true'); localStorage.setItem('savedPw_admin', loginForm.password); }
      else { localStorage.setItem('autoLogin_admin', 'false'); localStorage.removeItem('savedPw_admin'); }
      onLogin(data.user); navigate('/');
    } catch (err) { setError(err.response?.data?.error || '로그인에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => { e.preventDefault(); await doLogin(form); };
  const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', fontFamily: "'Noto Sans KR', sans-serif", transition: 'border-color 0.2s' };
  const checkboxStyle = (checked) => ({ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? '#2563eb' : '#cbd5e1'}`, background: checked ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf7 100%)' }}>
      <div style={{ width: 400, background: 'white', borderRadius: 20, padding: '48px 36px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>Drive<span style={{ color: '#2563eb' }}>Log</span></div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>관리자 로그인</div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>업체코드</label><input style={inputStyle} placeholder="YANGYANG01" value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>아이디</label><input style={inputStyle} placeholder="로그인 ID" required value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} /></div>
          <div style={{ marginBottom: 20 }}><label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>비밀번호</label><input style={inputStyle} type="password" placeholder="비밀번호" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} /></div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <div onClick={() => { setSaveId(!saveId); if (autoLogin && saveId) setAutoLogin(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><div style={checkboxStyle(saveId)}>{saveId && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>로그인 정보 저장</span></div>
            <div onClick={() => { setAutoLogin(!autoLogin); if (!autoLogin) setSaveId(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><div style={checkboxStyle(autoLogin)}>{autoLogin && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>자동 로그인</span></div>
          </div>
          {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 16, border: '1px solid #fecaca' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: "'Noto Sans KR', sans-serif", opacity: loading ? 0.7 : 1 }}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>

        {/* 업체 가입 신청 링크 */}
        <div style={{ textAlign: 'center', marginTop: 20, padding: '16px 0', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>아직 DriveLog를 사용하지 않고 계신가요?</div>
          <div onClick={onRegister} style={{ fontSize: 14, color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: '10px 24px', borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#f0f9ff', display: 'inline-block' }}>
            업체 가입 신청 (무료 체험)
          </div>
        </div>
      </div>
    </div>
  );
}
