import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ company_code: '', login_id: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: 15, outline: 'none', fontFamily: "'Noto Sans KR', sans-serif",
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf7 100%)',
    }}>
      <div style={{
        width: 400, background: 'white', borderRadius: 20, padding: '48px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>
            Drive<span style={{ color: '#2563eb' }}>Log</span>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>관리자 로그인</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>업체코드</label>
            <input style={inputStyle} placeholder="YANGYANG01"
              value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>아이디</label>
            <input style={inputStyle} placeholder="로그인 ID" required
              value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>비밀번호</label>
            <input style={inputStyle} type="password" placeholder="비밀번호" required
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626',
              fontSize: 13, marginBottom: 16, border: '1px solid #fecaca',
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: '#2563eb', color: 'white', fontSize: 16, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', fontFamily: "'Noto Sans KR', sans-serif",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
