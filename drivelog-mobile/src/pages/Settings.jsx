import { useNavigate } from 'react-router-dom';
import { apiLogout } from '../api/client';

export default function Settings({ user, onLogout }) {
  const nav = useNavigate();

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    try { await apiLogout(); } catch {}
    // 토큰과 유저 정보만 삭제 (로그인 저장 정보는 유지)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    onLogout();
    nav('/login');
  };

  const roleMap = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행 기사' };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 18, fontWeight: 800 }}>설정</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white' }}>{(user?.name || '?').charAt(0)}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{roleMap[user?.role] || user?.role}</div>
            </div>
          </div>
          {[
            { label: '업체', value: user?.company_name || '-' },
            { label: '업체코드', value: user?.company_code || '-' },
            { label: '연락처', value: user?.phone || '-' },
            { label: '차량번호', value: user?.vehicle_number || '-' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}>
              <span style={{ fontSize: 14, color: '#64748b' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>앱 정보</div>
          {[
            { label: '버전', value: 'v1.6.0' },
            { label: '빌드', value: 'PWA (React + Vite)' },
            { label: '서버', value: 'Express + MariaDB' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid #f8fafc' : 'none' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{item.label}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{item.value}</span>
            </div>
          ))}
        </div>
        <button onClick={handleLogout} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: 16, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>로그아웃</button>
      </div>
    </div>
  );
}
