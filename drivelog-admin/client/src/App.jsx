import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Rides from './pages/Rides';
import Partners from './pages/Partners';
import Mileage from './pages/Mileage';
import Users from './pages/Users';
import Customers from './pages/Customers';
import PartnerManage from './pages/PartnerManage';
import Settlements from './pages/Settlements';
import FarePolicies from './pages/FarePolicies';
import Billing from './pages/Billing';
import Companies from './pages/Companies';
import PaymentTypes from './pages/PaymentTypes';
import Permissions from './pages/Permissions';
import SystemSettings from './pages/SystemSettings';
import { logout as apiLogout } from './api/client';

const ADMIN_VERSION = __BUILD_TIME__ || 'dev';

const masterNavGroups = [
  { title: '시스템 현황', items: [{ path: '/', label: '대시보드', icon: '📊' }]},
  { title: '업체 관리', items: [{ path: '/companies', label: '업체관리', icon: '🏢' }, { path: '/billing', label: '사용료/과금', icon: '🧾' }]},
  { title: '업체 데이터 조회', items: [{ path: '/rides', label: '운행일지', icon: '🚗' }, { path: '/partners', label: '제휴업체 콜', icon: '📞' }, { path: '/settlements', label: '정산관리', icon: '💰' }, { path: '/mileage', label: '마일리지', icon: '⭐' }]},
  { title: '시스템 설정', items: [{ path: '/users', label: '계정관리', icon: '👥' }, { path: '/permissions', label: '통합권한관리', icon: '🔐' }, { path: '/payment-types', label: '결제구분', icon: '💳' }, { path: '/fare-policies', label: '요금정책', icon: '💵' }, { path: '/system-settings', label: '시스템 설정', icon: '⚙️' }]},
];

const superAdminNavGroups = [
  { title: '대시보드', items: [{ path: '/', label: '대시보드', icon: '📊' }]},
  { title: '운행', items: [{ path: '/rides', label: '운행일지', icon: '🚗' }, { path: '/partners', label: '제휴업체 콜', icon: '📞' }, { path: '/mileage', label: '마일리지', icon: '⭐' }]},
  { title: '정산', items: [{ path: '/settlements', label: '정산관리', icon: '💰' }, { path: '/fare-policies', label: '요금설정', icon: '💵' }, { path: '/billing', label: '사용료', icon: '🧾' }]},
  { title: '관리', items: [{ path: '/users', label: '기사관리', icon: '🧑‍✈️' }, { path: '/customers', label: '고객관리', icon: '👤' }, { path: '/partner-manage', label: '제휴업체관리', icon: '🤝' }, { path: '/payment-types', label: '결제구분', icon: '💳' }]},
];

function RoleGuard({ user, roles, children }) {
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// 사용료 만료 팝업
function ExpiredOverlay({ user, onContact }) {
  if (!user || user.role === 'MASTER' || !user.license_expired) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '40px 32px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>서비스 이용기간 만료</div>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 24 }}>
          <strong>{user.company_name}</strong>의 서비스 이용기간이<br />
          <strong style={{ color: '#dc2626' }}>{user.license_expires?.slice(0, 10)}</strong>에 만료되었습니다.<br />
          서비스를 계속 이용하시려면 갱신이 필요합니다.
        </div>
        <div style={{ background: '#fef2f2', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.8 }}>
            <div>• 현재 요금제: <strong>{user.plan_name || '미지정'}</strong></div>
            <div>• 만료일: <strong>{user.license_expires?.slice(0, 10)}</strong></div>
            <div>• 데이터는 만료일까지만 조회 가능합니다</div>
          </div>
        </div>
        <button onClick={onContact} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
          갱신 문의하기
        </button>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>DriveLog 관리자: 033-000-0000</div>
      </div>
    </div>
  );
}

// 만료 임박 배너 (7일 이내)
function ExpiringBanner({ user }) {
  if (!user || user.role === 'MASTER' || !user.license_expires || user.license_expired) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exp = new Date(user.license_expires); exp.setHours(0,0,0,0);
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (daysLeft > 7 || daysLeft < 0) return null;
  return (
    <div style={{ background: daysLeft <= 3 ? '#fef2f2' : '#fffbeb', border: `1px solid ${daysLeft <= 3 ? '#fecaca' : '#fde68a'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: daysLeft <= 3 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
        ⏰ 서비스 만료 <strong>{daysLeft}일 전</strong>입니다. ({user.license_expires?.slice(0, 10)} 만료)
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>갱신이 필요합니다</div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiVersion, setApiVersion] = useState('');
  const [showExpiredPopup, setShowExpiredPopup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      fetch('/api/health').then(r => r.json()).then(d => setApiVersion(d.version || '?')).catch(() => setApiVersion('?'));
      // 만료 체크
      if (user.license_expired) setShowExpiredPopup(true);
    }
  }, [user]);

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user');
    setUser(null); setShowExpiredPopup(false); navigate('/login');
  };

  const isMaster = user?.role === 'MASTER';
  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };
  const navGroups = isMaster ? masterNavGroups : superAdminNavGroups;
  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(i => { if (i.path === '/') return location.pathname === '/'; return location.pathname.startsWith(i.path); })?.label || 'DriveLog';
  const sidebarGrad = isMaster ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  const accentColor = isMaster ? '#7c3aed' : '#2563eb';

  if (location.pathname === '/register') return <Register onBack={() => navigate('/login')} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 만료 팝업 */}
      {showExpiredPopup && <ExpiredOverlay user={user} onContact={() => { setShowExpiredPopup(false); }} />}

      {user && (
        <>
          <header style={{ background: 'white', borderBottom: `2px solid ${isMaster ? '#ede9fe' : user?.license_expired ? '#fecaca' : '#e2e8f0'}`, padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, marginRight: 12, flexShrink: 0 }}>
              <div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} />
            </button>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: -1 }}>Drive<span style={{ color: accentColor }}>Log</span></div>
            {isMaster && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fce7f3', color: '#9d174d' }}>MASTER</span>}
            {user.is_trial && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>체험</span>}
            {user.license_expired && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }} onClick={() => setShowExpiredPopup(true)}>만료</span>}
            <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#475569' }}>{currentLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{isMaster ? 'DriveLog' : user.company_name || 'DriveLog'}</div>
                <div>{user.name}</div>
                <div style={{ fontSize: 9, color: '#b0b8c4', fontFamily: 'monospace', marginTop: 1 }}>A:{ADMIN_VERSION} API:{apiVersion}</div>
              </div>
            </div>
          </header>

          {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />}
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: 'white', zIndex: 101, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease-in-out', display: 'flex', flexDirection: 'column', boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none' }}>
            <div style={{ padding: '24px 20px 20px', background: sidebarGrad }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div><div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: -1 }}>DriveLog</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{isMaster ? '시스템 관리' : user.company_name || ''}</div></div>
                <button onClick={() => setSidebarOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white' }}>{(user.name || '?').charAt(0)}</div>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{user.name}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{roleLabel[user.role] || user.role}</div></div>
              </div>
              {/* 사이드바에 만료 정보 표시 */}
              {user.license_expires && !isMaster && (
                <div style={{ marginTop: 12, padding: '6px 10px', borderRadius: 8, background: user.license_expired ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.1)', fontSize: 11, color: user.license_expired ? '#fecaca' : 'rgba(255,255,255,0.7)' }}>
                  {user.license_expired ? '⚠️ 서비스 만료' : `📋 ${user.plan_name || '스타터'}`} | 만료: {user.license_expires?.slice(0, 10)}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {navGroups.map((group, gi) => (
                <div key={gi}>
                  <div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>{group.title}</div>
                  {group.items.map(item => {
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (<NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => { setSidebarOpen(false); if (user.license_expired) setShowExpiredPopup(true); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', textDecoration: 'none', background: isActive ? (isMaster ? '#faf5ff' : '#eff6ff') : 'transparent', borderRight: isActive ? `3px solid ${accentColor}` : '3px solid transparent' }}><span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span><span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? accentColor : '#475569' }}>{item.label}</span></NavLink>);
                  })}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={() => { setSidebarOpen(false); handleLogout(); }} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2', fontSize: 14, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>로그아웃</button>
            </div>
          </div>
        </>
      )}

      <main style={{ padding: user ? '16px' : 0, maxWidth: user ? 1400 : 'none', margin: '0 auto' }}>
        {/* 만료 임박 배너 */}
        {user && <ExpiringBanner user={user} />}

        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} onRegister={() => navigate('/register')} />} />
          <Route path="/register" element={<Register onBack={() => navigate('/login')} />} />
          <Route path="/" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Dashboard /></RoleGuard>} />
          <Route path="/rides" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Rides /></RoleGuard>} />
          <Route path="/partners" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Partners /></RoleGuard>} />
          <Route path="/mileage" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Mileage /></RoleGuard>} />
          <Route path="/users" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Users /></RoleGuard>} />
          <Route path="/customers" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Customers /></RoleGuard>} />
          <Route path="/partner-manage" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><PartnerManage /></RoleGuard>} />
          <Route path="/payment-types" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><PaymentTypes /></RoleGuard>} />
          <Route path="/settlements" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Settlements /></RoleGuard>} />
          <Route path="/fare-policies" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><FarePolicies /></RoleGuard>} />
          <Route path="/billing" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Billing user={user} /></RoleGuard>} />
          <Route path="/companies" element={<RoleGuard user={user} roles={['MASTER']}><Companies /></RoleGuard>} />
          <Route path="/permissions" element={<RoleGuard user={user} roles={['MASTER']}><Permissions /></RoleGuard>} />
          <Route path="/system-settings" element={<RoleGuard user={user} roles={['MASTER']}><SystemSettings /></RoleGuard>} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </main>
    </div>
  );
}
