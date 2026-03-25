import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogout, changePassword } from '../api/client';

export default function Settings({ user, onLogout }) {
  const nav = useNavigate();
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    try { await apiLogout(); } catch {}
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user');
    if (onLogout) onLogout();
    window.location.href = '/m/login';
  };

  const handlePwChange = async () => {
    setPwError('');
    if (!pwForm.current_password || !pwForm.new_password) { setPwError('모든 항목을 입력하세요.'); return; }
    if (pwForm.new_password.length < 8) { setPwError('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (pwForm.new_password !== pwForm.confirm) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    setPwSaving(true);
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user');
      window.location.href = '/m/login';
    } catch (err) { setPwError(err.response?.data?.error || '비밀번호 변경 실패'); }
    finally { setPwSaving(false); }
  };

  const roleMap = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행 기사' };
  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>설정</span>
      </div>
      <div style={{ padding: 20 }}>
        {/* 계정 정보 */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white' }}>{(user?.name || '?').charAt(0)}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{roleMap[user?.role] || user?.role}</div>
            </div>
          </div>
          {[{ label: '업체', value: user?.company_name || '-' }, { label: '업체코드', value: user?.company_code || '-' }, { label: '연락처', value: user?.phone || '-' }, { label: '차량번호', value: user?.vehicle_number || '-' }].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}>
              <span style={{ fontSize: 14, color: '#64748b' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 서비스 정보 */}
        {user?.license_expires && (
          <div style={{ background: user?.license_expired ? '#fef2f2' : 'white', borderRadius: 20, padding: 24, marginBottom: 14, border: `1px solid ${user?.license_expired ? '#fecaca' : '#f1f5f9'}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: user?.license_expired ? '#dc2626' : '#1e293b' }}>
              {user?.license_expired ? '⚠️ 서비스 만료' : '📋 서비스 정보'}
            </div>
            {[{ label: '요금제', value: user?.plan_name || '스타터' }, { label: '만료일', value: user?.license_expires?.slice(0, 10) || '-' }, { label: '상태', value: user?.license_expired ? '만료' : '정상' }].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid #f8fafc' : 'none' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.label === '상태' && user?.license_expired ? '#dc2626' : '#1e293b' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 비밀번호 변경 */}
        <div onClick={() => setShowPwModal(true)} style={{ background: 'white', borderRadius: 20, padding: '18px 24px', marginBottom: 14, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>비밀번호 변경</span>
          </div>
          <span style={{ color: '#cbd5e1', fontSize: 18 }}>›</span>
        </div>

        {/* 앱 정보 */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>앱 정보</div>
          {[{ label: '버전', value: 'v2.1' }, { label: '빌드', value: 'PWA (React + Vite)' }].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 1 ? '1px solid #f8fafc' : 'none' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.label}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{item.value}</span>
            </div>
          ))}
        </div>

        <button onClick={handleLogout} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: 16, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>로그아웃</button>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowPwModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: '28px 22px', maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>🔑 비밀번호 변경</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>현재 비밀번호</label>
              <input type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} style={inputStyle} placeholder="현재 비밀번호 입력" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>새 비밀번호 (8자 이상)</label>
              <input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} style={inputStyle} placeholder="새 비밀번호 입력" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>새 비밀번호 확인</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} style={inputStyle} placeholder="새 비밀번호 다시 입력" />
            </div>
            {pwError && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{pwError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowPwModal(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); setPwError(''); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handlePwChange} disabled={pwSaving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{pwSaving ? '변경 중...' : '비밀번호 변경'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
