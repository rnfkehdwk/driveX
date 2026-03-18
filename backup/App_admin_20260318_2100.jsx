import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
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
import { logout as apiLogout } from './api/client';

const navItems = [
  { path: '/', label: '대시보드' },
  { path: '/rides', label: '운행일지' },
  { path: '/partners', label: '제휴업체 콜' },
  { path: '/mileage', label: '마일리지' },
  { path: '/settlements', label: '정산관리' },
  { path: '/users', label: '기사관리' },
  { path: '/customers', label: '고객관리' },
  { path: '/partner-manage', label: '제휴업체관리' },
  { path: '/fare-policies', label: '요금설정' },
  { path: '/billing', label: '사용료' },
  { path: '/companies', label: '업체관리' },
];

function Guard({ user, children }) {
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await apiLogout(); } catch {}
    localStorage.clear(); setUser(null); navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {user && (
        <header style={{
          background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: -1, marginRight: 32 }}>
            Drive<span style={{ color: '#2563eb' }}>Log</span>
          </div>
          <nav style={{ display: 'flex', gap: 2, overflow: 'auto', flex: 1 }}>
            {navItems.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'}
                style={({ isActive }) => ({
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  background: isActive ? '#2563eb' : 'transparent',
                  color: isActive ? 'white' : '#64748b',
                })}>{item.label}</NavLink>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{user.company_name}</div>
              <div>{user.name} ({user.role})</div>
            </div>
            <button onClick={handleLogout} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
              background: 'white', fontSize: 12, color: '#64748b', cursor: 'pointer',
            }}>로그아웃</button>
          </div>
        </header>
      )}

      <main style={{ padding: user ? '20px 24px' : 0, maxWidth: user ? 1400 : 'none', margin: '0 auto' }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
          <Route path="/" element={<Guard user={user}><Dashboard /></Guard>} />
          <Route path="/rides" element={<Guard user={user}><Rides /></Guard>} />
          <Route path="/partners" element={<Guard user={user}><Partners /></Guard>} />
          <Route path="/mileage" element={<Guard user={user}><Mileage /></Guard>} />
          <Route path="/users" element={<Guard user={user}><Users /></Guard>} />
          <Route path="/customers" element={<Guard user={user}><Customers /></Guard>} />
          <Route path="/partner-manage" element={<Guard user={user}><PartnerManage /></Guard>} />
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
