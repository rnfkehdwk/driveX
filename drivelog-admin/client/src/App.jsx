import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
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
import { logout as apiLogout } from './api/client';

const navGroups = [
  { title: '대시보드', items: [
    { path: '/', label: '대시보드', icon: '📊', roles: ['MASTER', 'SUPER_ADMIN'] },
  ]},
  { title: '운행', items: [
    { path: '/rides', label: '운행일지', icon: '🚗', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/partners', label: '제휴업체 콜', icon: '📞', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/mileage', label: '마일리지', icon: '⭐', roles: ['MASTER', 'SUPER_ADMIN'] },
  ]},
  { title: '정산', items: [
    { path: '/settlements', label: '정산관리', icon: '💰', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/fare-policies', label: '요금설정', icon: '💵', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/billing', label: '사용료', icon: '🧾', roles: ['MASTER', 'SUPER_ADMIN'] },
  ]},
  { title: '관리', items: [
    { path: '/users', label: '기사관리', icon: '🧑‍✈️', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/customers', label: '고객관리', icon: '👤', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/partner-manage', label: '제휴업체관리', icon: '🤝', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/payment-types', label: '결제구분', icon: '💳', roles: ['MASTER', 'SUPER_ADMIN'] },
    { path: '/companies', label: '업체관리', icon: '🏢', roles: ['MASTER'] },
  ]},
];

function Guard({ user, children }) {
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    // 토큰과 유저 정보만 삭제 (로그인 저장 정보는 유지)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };
  const userRole = user?.role || '';
  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(i => {
    if (i.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(i.path);
  })?.label || 'DriveLog';

  const filteredGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(i => !i.roles || i.roles.includes(userRole)),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      {user && (
        <>
          <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, marginRight: 12, flexShrink: 0 }}>
              <div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} />
              <div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} />
              <div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} />
            </button>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: -1 }}>Drive<span style={{ color: '#2563eb' }}>Log</span></div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#475569' }}>{currentLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{user.company_name || 'DriveLog'}</div>
                <div>{user.name}</div>
              </div>
            </div>
          </header>

          {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />}

          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: 'white', zIndex: 101, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease-in-out', display: 'flex', flexDirection: 'column', boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none' }}>
            <div style={{ padding: '24px 20px 20px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: -1 }}>DriveLog</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{user.company_name || ''}</div>
                </div>
                <button onClick={() => setSidebarOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white' }}>{(user.name || '?').charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{roleLabel[user.role] || user.role}</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {filteredGroups.map((group, gi) => (
                <div key={gi}>
                  <div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>{group.title}</div>
                  {group.items.map(item => {
                    const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                    return (
                      <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setSidebarOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', textDecoration: 'none', background: isActive ? '#eff6ff' : 'transparent', borderRight: isActive ? '3px solid #2563eb' : '3px solid transparent' }}>
                        <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? '#2563eb' : '#475569' }}>{item.label}</span>
                      </NavLink>
                    );
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
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
          <Route path="/" element={<Guard user={user}><Dashboard /></Guard>} />
          <Route path="/rides" element={<Guard user={user}><Rides /></Guard>} />
          <Route path="/partners" element={<Guard user={user}><Partners /></Guard>} />
          <Route path="/mileage" element={<Guard user={user}><Mileage /></Guard>} />
          <Route path="/users" element={<Guard user={user}><Users /></Guard>} />
          <Route path="/customers" element={<Guard user={user}><Customers /></Guard>} />
          <Route path="/partner-manage" element={<Guard user={user}><PartnerManage /></Guard>} />
          <Route path="/payment-types" element={<Guard user={user}><PaymentTypes /></Guard>} />
          <Route path="/settlements" element={<Guard user={user}><Settlements /></Guard>} />
          <Route path="/fare-policies" element={<Guard user={user}><FarePolicies /></Guard>} />
          <Route path="/billing" element={<Guard user={user}><Billing user={user} /></Guard>} />
          <Route path="/companies" element={<Guard user={user}><Companies /></Guard>} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </main>
    </div>
  );
}
