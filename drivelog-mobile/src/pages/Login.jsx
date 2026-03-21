import { useState, useEffect } from 'react';
import { login } from '../api/client';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ company_code: '', login_id: '', password: '' });
  const [saveId, setSaveId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 저장된 로그인 정보 불러오기
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedLoginInfo'));
      if (saved) {
        setForm(f => ({ ...f, company_code: saved.company_code || '', login_id: saved.login_id || '' }));
        setSaveId(true);
      }
      const isAutoLogin = localStorage.getItem('autoLogin') === 'true';
      setAutoLogin(isAutoLogin);

      // 자동로그인 시도
      if (isAutoLogin && saved?.company_code && saved?.login_id) {
        const savedPw = localStorage.getItem('savedPw');
        if (savedPw) {
          doLogin({ company_code: saved.company_code, login_id: saved.login_id, password: savedPw });
        }
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

      // 로그인 정보 저장 처리
      if (saveId || autoLogin) {
        localStorage.setItem('savedLoginInfo', JSON.stringify({
          company_code: loginForm.company_code,
          login_id: loginForm.login_id,
        }));
      } else {
        localStorage.removeItem('savedLoginInfo');
      }

      // 자동로그인 처리
      if (autoLogin) {
        localStorage.setItem('autoLogin', 'true');
        localStorage.setItem('savedPw', loginForm.password);
      } else {
        localStorage.setItem('autoLogin', 'false');
        localStorage.removeItem('savedPw');
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || '로그인에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await doLogin(form);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const S = {
    input: { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, outline: 'none', background: '#f8f9fb' },
  };

  const checkboxStyle = (checked) => ({
    width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#2563eb' : '#cbd5e1'}`,
    background: checked ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px', background: 'linear-gradient(180deg, #f0f4ff, #e8ecf7)' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -2, color: '#1a1a2e' }}>DriveLog</div>
        <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 6 }}>운행일지 관리 시스템</div>
      </div>

      <div style={{ background: 'white', borderRadius: 20, padding: '32px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>업체코드</label>
            <input style={S.input} placeholder="YANGYANG01" value={form.company_code} onChange={set('company_code')} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>아이디</label>
            <input style={S.input} placeholder="로그인 ID" required value={form.login_id} onChange={set('login_id')} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>비밀번호</label>
            <input style={S.input} type="password" placeholder="비밀번호" required value={form.password} onChange={set('password')} />
          </div>

          {/* 로그인 정보 저장 + 자동 로그인 */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div onClick={() => { setSaveId(!saveId); if (autoLogin && saveId) setAutoLogin(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={checkboxStyle(saveId)}>
                {saveId && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>로그인 정보 저장</span>
            </div>
            <div onClick={() => { setAutoLogin(!autoLogin); if (!autoLogin) setSaveId(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={checkboxStyle(autoLogin)}>
                {autoLogin && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>자동 로그인</span>
            </div>
          </div>

          {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#2563eb', color: 'white',
            fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }}>{loading ? '로그인 중...' : '로그인'}</button>
        </form>
      </div>
    </div>
  );
}
