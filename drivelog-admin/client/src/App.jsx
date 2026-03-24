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

// 라우트별 접근 권한 정의
const ROUTE_PERMISSIONS = {
  '/': ['MASTER', 'SUPER_ADMIN'],
  '/rides': ['MASTER', 'SUPER_ADMIN'],
  '/partners': ['MASTER', 'SUPER_ADMIN'],
  '/mileage': ['MASTER', 'SUPER_ADMIN'],
  '/users': ['MASTER', 'SUPER_ADMIN'],
  '/customers': ['MASTER', 'SUPER_ADMIN'],
  '/partner-manage': ['MASTER', 'SUPER_ADMIN'],
  '/payment-types': ['MASTER', 'SUPER_ADMIN'],
  '/settlements': ['MASTER', 'SUPER_ADMIN'],
  '/fare-policies': ['MASTER', 'SUPER_ADMIN'],
  '/billing': ['MASTER', 'SUPER_ADMIN'],
  // MASTER 전용
  '/companies': ['MASTER'],
  '/permissions': ['MASTER'],
  '/system-settings': ['MASTER'],
};

// 로그인 가드 (미로그인 → 로그인 페이지)
function Guard({ user, children }) {
  return user ? children : <Navigate to="/login" />;
}

// 역할 가드 (권한 없는 URL → 대시보드로 리다이렉트)
function RoleGuard({ user, roles, children }) {
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiVersion, setApiVersion] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (user) fetch('/api/health').then(r => r.json()).then(d => setApiVersion(d.version || '?')).catch(() => setApiVersion('?')); }, [user]);

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user');
    setUser(null); navigate('/login');
  };

  const isMaster = user?.role === 'MASTER';
  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };
  const navGroups = isMaster ? masterNavGroups : superAdminNavGroups;
  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(i => { if (i.path === '/') return location.pathname === '/'; return location.pathname.startsWith(i.path); })?.label || 'DriveLog';
  const sidebarGrad = isMaster ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  const accentColor = isMaster ? '#7c3aed' : '#2563eb';

  if (location.pathname === '/register') {
    return <Register onBack={() => navigate('/login')} />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {user && (
        <>
          <header style={{ background: 'white', borderBottom: `2px solid ${isMaster ? '#ede9fe' : '#e2e8f0'}`, padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, marginRight: 12, flexShrink: 0 }}>
              <div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} />
            </button>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: -1 }}>Drive<span style={{ color: accentColor }}>Log</span></div>
            {isMaster && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fce7f3', color: '#9d174d' }}>MASTER</span>}
            {user.is_trial && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>체험</span>}
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
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {navGroups.map((group, gi) => (
                <div key={gi}>
                  <div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>{group.title}</div>
                  {group.items.map(item => {
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (<NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', textDecoration: 'none', background: isActive ? (isMaster ? '#faf5ff' : '#eff6ff') : 'transparent', borderRight: isActive ? `3px solid ${accentColor}` : '3px solid transparent' }}><span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span><span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? accentColor : '#475569' }}>{item.label}</span></NavLink>);
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
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} onRegister={() => navigate('/register')} />} />
          <Route path="/register" element={<Register onBack={() => navigate('/login')} />} />

          {/* 공통 페이지 (MASTER + SUPER_ADMIN) */}
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

          {/* MASTER 전용 페이지 */}
          <Route path="/companies" element={<RoleGuard user={user} roles={['MASTER']}><Companies /></RoleGuard>} />
          <Route path="/permissions" element={<RoleGuard user={user} roles={['MASTER']}><Permissions /></RoleGuard>} />
          <Route path="/system-settings" element={<RoleGuard user={user} roles={['MASTER']}><SystemSettings /></RoleGuard>} />

          {/* 미매칭 URL → 대시보드 또는 로그인 */}
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </main>
    </div>
  );
}
