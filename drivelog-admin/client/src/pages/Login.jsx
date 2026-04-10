import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, findUserId, requestPasswordReset } from '../api/client';

// ─────────────────────────────────────────
// 아이디 찾기 모달
// ─────────────────────────────────────────
function FindIdModal({ onClose }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setResult(null);
    if (!form.name || !form.phone) { setError('이름과 연락처를 모두 입력해주세요.'); return; }
    setLoading(true);
    try {
      const data = await findUserId(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || '조회에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🔍 아이디 찾기</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>가입 시 등록한 이름과 연락처로 찾을 수 있습니다.</div>

        {!result && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>이름</label>
              <input style={inputStyle} placeholder="홍길동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>연락처</label>
              <input style={inputStyle} placeholder="010-1234-5678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? '조회 중...' : '아이디 찾기'}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            {result.found ? (
              <div>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>✅ {result.count}개 계정을 찾았습니다</div>
                  {result.accounts.map((a, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'white', borderRadius: 8, marginTop: i > 0 ? 8 : 0, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{a.company_name}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>{a.masked_login_id}</div>
                      {a.created_at && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>가입일: {a.created_at}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                  보안을 위해 일부 글자만 표시됩니다. 정확한 아이디가 기억나지 않으면 비밀번호 찾기를 이용해주세요.
                </div>
              </div>
            ) : (
              <div style={{ background: '#fef2f2', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #fecaca', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>😕</div>
                <div style={{ fontSize: 13, color: '#991b1b' }}>일치하는 계정을 찾을 수 없습니다.</div>
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>이름과 연락처를 다시 확인해주세요.</div>
              </div>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>확인</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 비밀번호 찾기 모달
// ─────────────────────────────────────────
function FindPasswordModal({ onClose }) {
  const [form, setForm] = useState({ login_id: '', name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setResult(null);
    if (!form.login_id || !form.name || !form.phone) { setError('아이디, 이름, 연락처를 모두 입력해주세요.'); return; }
    setLoading(true);
    try {
      const data = await requestPasswordReset(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || '요청에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🔑 비밀번호 찾기</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>등록된 이메일로 임시 비밀번호를 발송해드립니다.</div>

        {!result && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>로그인 아이디</label>
              <input style={inputStyle} placeholder="rider_hong" value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>이름</label>
              <input style={inputStyle} placeholder="홍길동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>연락처</label>
              <input style={inputStyle} placeholder="010-1234-5678" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? '처리 중...' : '임시 비밀번호 받기'}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div style={{ background: result.method === 'INQUIRY' ? '#fffbeb' : '#f0fdf4', borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${result.method === 'INQUIRY' ? '#fde68a' : '#bbf7d0'}`, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{result.method === 'EMAIL' ? '📧' : result.method === 'INQUIRY' ? '📩' : '✉️'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: result.method === 'INQUIRY' ? '#92400e' : '#16a34a', marginBottom: 8 }}>
                {result.method === 'EMAIL' && '임시 비밀번호 발송 완료'}
                {result.method === 'INQUIRY' && '관리자에게 요청 전달됨'}
                {result.method === 'NONE' && '요청 처리됨'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{result.message}</div>
              {result.method === 'EMAIL' && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'white', borderRadius: 8, fontSize: 11, color: '#64748b' }}>
                  ⏰ 임시 비밀번호는 10분 후 자동 만료됩니다<br />
                  로그인 후 즉시 새 비밀번호로 변경해주세요
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>확인</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 메인 로그인 페이지
// ─────────────────────────────────────────
export default function Login({ onLogin, onRegister }) {
  const [form, setForm] = useState({ company_code: '', login_id: '', password: '' });
  const [saveId, setSaveId] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFindId, setShowFindId] = useState(false);
  const [showFindPw, setShowFindPw] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedLoginInfo_admin'));
      if (saved) { setForm(f => ({ ...f, company_code: saved.company_code || '', login_id: saved.login_id || '' })); setSaveId(true); }
      const isAutoLogin = localStorage.getItem('autoLogin_admin') === 'true';
      setAutoLogin(isAutoLogin);
      if (isAutoLogin && saved?.login_id) {
        const savedPw = localStorage.getItem('savedPw_admin');
        if (savedPw) doLogin({ company_code: saved.company_code || '', login_id: saved.login_id, password: savedPw });
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
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>업체코드 <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>(선택)</span></label>
            <input style={inputStyle} placeholder="평소엔 비워두셔도 됩니다" value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>아이디</label>
            <input style={inputStyle} placeholder="로그인 ID" required value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>비밀번호</label>
            <input style={inputStyle} type="password" placeholder="비밀번호" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div onClick={() => { setSaveId(!saveId); if (autoLogin && saveId) setAutoLogin(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={checkboxStyle(saveId)}>{saveId && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>로그인 정보 저장</span>
            </div>
            <div onClick={() => { setAutoLogin(!autoLogin); if (!autoLogin) setSaveId(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={checkboxStyle(autoLogin)}>{autoLogin && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>자동 로그인</span>
            </div>
          </div>

          {/* 아이디 찾기 / 비밀번호 찾기 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 16, fontSize: 12 }}>
            <span onClick={() => setShowFindId(true)} style={{ color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>아이디 찾기</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span onClick={() => setShowFindPw(true)} style={{ color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>비밀번호 찾기</span>
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

      {showFindId && <FindIdModal onClose={() => setShowFindId(false)} />}
      {showFindPw && <FindPasswordModal onClose={() => setShowFindPw(false)} />}
    </div>
  );
}
