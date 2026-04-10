import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MasterDashboard from './pages/MasterDashboard';
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
import Inquiries from './pages/Inquiries';
import MyInquiries from './pages/MyInquiries';
import CallManage from './pages/CallManage';
import Reports from './pages/Reports';
import FareSettlement from './pages/FareSettlement';
import Attendance from './pages/Attendance';
import { logout as apiLogout, createInquiry, changePassword, getMe } from './api/client';

const ADMIN_VERSION = __BUILD_TIME__ || 'dev';

const masterNavGroups = [
  { title: '시스템 현황', items: [{ path: '/', label: '대시보드', icon: '📊' }, { path: '/reports', label: '월간리포트', icon: '📈' }, { path: '/inquiries', label: '문의사항', icon: '📩' }]},
  { title: '업체 관리', items: [{ path: '/companies', label: '업체관리', icon: '🏢' }, { path: '/billing', label: '사용료/과금', icon: '🧾' }]},
  { title: '업체 데이터 조회', items: [{ path: '/rides', label: '운행일지', icon: '🚗' }, { path: '/partners', label: '제휴업체 콜', icon: '📞' }, { path: '/settlements', label: '정산관리', icon: '💰' }, { path: '/mileage', label: '마일리지', icon: '⭐' }]},
  { title: '시스템 설정', items: [{ path: '/users', label: '계정관리', icon: '👥' }, { path: '/permissions', label: '통합권한관리', icon: '🔐' }, { path: '/payment-types', label: '결제구분', icon: '💳' }, { path: '/fare-policies', label: '요금정책', icon: '💵' }, { path: '/system-settings', label: '시스템 설정', icon: '⚙️' }]},
];
const superAdminNavGroups = [
  { title: '대시보드', items: [{ path: '/', label: '대시보드', icon: '📊' }, { path: '/reports', label: '월간리포트', icon: '📈' }]},
  { title: '운행', items: [{ path: '/calls', label: '콜 관리', icon: '📞' }, { path: '/rides', label: '운행일지', icon: '🚗' }, { path: '/partners', label: '제휴업체 콜', icon: '🏢' }, { path: '/mileage', label: '마일리지', icon: '⭐' }]},
  { title: '정산', items: [{ path: '/settlements', label: '정산관리', icon: '💰' }, { path: '/fare-settlement', label: '운임 정산', icon: '💵' }, { path: '/attendance', label: '근무시간', icon: '🕐' }, { path: '/fare-policies', label: '요금설정', icon: '💵' }, { path: '/billing', label: '사용료', icon: '🧾' }]},
  { title: '관리', items: [{ path: '/users', label: '기사관리', icon: '🚘' }, { path: '/customers', label: '고객관리', icon: '👤' }, { path: '/partner-manage', label: '제휴업체관리', icon: '🤝' }, { path: '/payment-types', label: '결제구분', icon: '💳' }, { path: '/my-inquiries', label: '문의하기', icon: '📩' }]},
];

// 기사수 초과 시 접근 가능한 경로
const RIDER_EXCEEDED_ALLOWED = ['/users', '/billing', '/my-inquiries'];

function RoleGuard({ user, roles, children }) { if (!user) return <Navigate to="/login" />; if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />; return children; }

function InquiryModal({ onClose }) {
  const [form, setForm] = useState({ inquiry_type: 'RENEWAL', title: '서비스 갱신 요청', content: '' });
  const [saving, setSaving] = useState(false);
  const handleSubmit = async () => { if (!form.title) { alert('제목을 입력해주세요.'); return; } setSaving(true); try { const res = await createInquiry(form); alert(res.message); onClose(); } catch (err) { alert(err.response?.data?.error || '문의 등록 실패'); } finally { setSaving(false); } };
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>📩 문의</div><div style={{ marginBottom: 14 }}><select value={form.inquiry_type} onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: 'white' }}><option value="RENEWAL">서비스 갱신</option><option value="UPGRADE">업그레이드</option><option value="DOWNGRADE">다운그레이드</option><option value="GENERAL">일반 문의</option><option value="BUG">버그 신고</option></select></div><div style={{ marginBottom: 14 }}><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="제목" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div><div style={{ marginBottom: 20 }}><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="내용" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} /></div><div style={{ display: 'flex', gap: 10 }}><button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '전송 중...' : '보내기'}</button></div></div></div>);
}

function PasswordModal({ onClose, forced }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const is = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const handleSubmit = async () => { setError(''); if (!form.current_password || !form.new_password) { setError('모든 항목 입력'); return; } if (form.new_password.length < 8) { setError('8자 이상'); return; } if (form.new_password !== form.confirm) { setError('불일치'); return; } setSaving(true); try { await changePassword({ current_password: form.current_password, new_password: form.new_password }); alert('변경 완료. 재로그인하세요.'); localStorage.clear(); window.location.href = '/admin/login'; } catch (err) { setError(err.response?.data?.error || '실패'); } finally { setSaving(false); } };
  const handleBackdropClick = (e) => { if (!forced) onClose(); };
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={handleBackdropClick}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%' }}>
    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: forced ? 8 : 20 }}>🔑 {forced ? '임시 비밀번호로 로그인하셨습니다' : '비밀번호 변경'}</div>
    {forced && (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#991b1b', lineHeight: 1.7 }}>
        보안을 위해 <strong>새 비밀번호로 변경 후에만</strong> 서비스를 이용하실 수 있습니다.<br />
        임시 비밀번호는 10분 후 만료됩니다.
      </div>
    )}
    {[{ k: 'current_password', l: forced ? '임시 비밀번호' : '현재 비밀번호' }, { k: 'new_password', l: '새 비밀번호 (8자 이상)' }, { k: 'confirm', l: '새 비밀번호 확인' }].map(f => (<div key={f.k} style={{ marginBottom: 14 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.l}</label><input type="password" value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} style={is} /></div>))}
    {error && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
    <div style={{ display: 'flex', gap: 10 }}>
      {!forced && <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>}
      <button onClick={handleSubmit} disabled={saving} style={{ flex: forced ? 1 : 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '변경 중...' : '변경'}</button>
    </div>
  </div></div>);
}

function ExpiredOverlay({ user, onContact, onClose }) {
  if (!user || user.role === 'MASTER' || !user.license_expired) return null;
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ background: 'white', borderRadius: 24, padding: '40px 32px', maxWidth: 440, width: '100%', textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div><div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>서비스 이용기간 만료</div><div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 24 }}><strong>{user.company_name}</strong>의 이용기간이 <strong style={{ color: '#dc2626' }}>{user.license_expires?.slice(0, 10)}</strong>에 만료되었습니다.</div><button onClick={onContact} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>갱신 문의하기</button><button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>닫기 (조회만 가능)</button></div></div>);
}

function RiderExceededOverlay({ user, onGoUsers, onClose }) {
  if (!user || user.role === 'MASTER' || !user.rider_exceeded) return null;
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ background: 'white', borderRadius: 24, padding: '40px 32px', maxWidth: 460, width: '100%', textAlign: 'center' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
    <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginBottom: 8 }}>활성 계정 수 초과</div>
    <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 20 }}><strong>{user.company_name}</strong>의 요금제(<strong>{user.plan_name}</strong>)에서<br />허용하는 최대 계정 수를 초과했습니다.</div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626' }}>{user.rider_current}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>현재 활성</div></div>
      <div style={{ fontSize: 28, fontWeight: 300, color: '#e2e8f0', alignSelf: 'center' }}>/</div>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#2563eb' }}>{user.rider_max}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>최대 허용</div></div>
    </div>
    <div style={{ background: '#fffbeb', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
      <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.8 }}>📌 기사관리에서 <strong>{user.rider_current - user.rider_max}명</strong>을 비활성 처리하면 정상 이용 가능합니다.<br />📌 또는 사용료 메뉴에서 요금제 업그레이드를 요청하세요.</div>
    </div>
    <button onClick={onGoUsers} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>🚘 기사관리로 이동</button>
    <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
  </div></div>);
}

function ExpiringBanner({ user }) {
  if (!user || user.role === 'MASTER' || !user.license_expires || user.license_expired) return null;
  const now = new Date(); now.setHours(0,0,0,0); const exp = new Date(user.license_expires); exp.setHours(0,0,0,0);
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24)); if (daysLeft > 7 || daysLeft < 0) return null;
  return (<div style={{ background: daysLeft <= 3 ? '#fef2f2' : '#fffbeb', border: `1px solid ${daysLeft <= 3 ? '#fecaca' : '#fde68a'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 13, color: daysLeft <= 3 ? '#dc2626' : '#d97706', fontWeight: 600 }}>⏰ 서비스 만료 <strong>{daysLeft}일 전</strong></div></div>);
}

function RiderExceededBanner({ user }) {
  if (!user || user.role === 'MASTER' || !user.rider_exceeded) return null;
  return (<div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>👥 활성 계정 초과 — {user.rider_current}/{user.rider_max}명 (기사관리에서 비활성 처리 필요)</div></div>);
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiVersion, setApiVersion] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showExpiredPopup, setShowExpiredPopup] = useState(false);
  const [showRiderExceededPopup, setShowRiderExceededPopup] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [forcePwChange, setForcePwChange] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUserState = async () => {
    if (!user) return;
    try {
      const me = await getMe();
      const updated = { ...user, rider_exceeded: me.rider_exceeded, rider_current: me.rider_current, rider_max: me.rider_max, license_expired: me.license_expired };
      setUser(updated); localStorage.setItem('user', JSON.stringify(updated));
      if (me.rider_exceeded && !me.license_expired) setShowRiderExceededPopup(true);
      else setShowRiderExceededPopup(false);
    } catch {}
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/health').then(r => r.json()).then(d => setApiVersion(d.version || '?')).catch(() => setApiVersion('?'));
      if (user.license_expired) setShowExpiredPopup(true);
      else if (user.rider_exceeded) setShowRiderExceededPopup(true);
      if (user.password_must_change) {
        setForcePwChange(true);
        setShowPwModal(true);
      }
    }
  }, [user]);

  useEffect(() => { if (user && !user.license_expired) refreshUserState(); }, [location.pathname]);

  const handleLogout = async () => { try { await apiLogout(); } catch {} localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); setUser(null); setShowExpiredPopup(false); setShowRiderExceededPopup(false); navigate('/login'); };

  const isMaster = user?.role === 'MASTER';
  const isRiderExceeded = !isMaster && user?.rider_exceeded && !user?.license_expired;
  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };
  const navGroups = isMaster ? masterNavGroups : superAdminNavGroups;
  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(i => { if (i.path === '/') return location.pathname === '/'; return location.pathname.startsWith(i.path); })?.label || 'DriveLog';
  const sidebarGrad = isMaster ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  const accentColor = isMaster ? '#7c3aed' : '#2563eb';

  if (location.pathname === '/register') return <Register onBack={() => navigate('/login')} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      {showExpiredPopup && <ExpiredOverlay user={user} onContact={() => { setShowExpiredPopup(false); setShowInquiryModal(true); }} onClose={() => setShowExpiredPopup(false)} />}
      {showRiderExceededPopup && !showExpiredPopup && <RiderExceededOverlay user={user} onGoUsers={() => { setShowRiderExceededPopup(false); navigate('/users'); }} onClose={() => setShowRiderExceededPopup(false)} />}
      {showInquiryModal && <InquiryModal onClose={() => setShowInquiryModal(false)} />}
      {showPwModal && <PasswordModal forced={forcePwChange} onClose={() => { if (!forcePwChange) setShowPwModal(false); }} />}
      {user && (<>
        <header style={{ background: 'white', borderBottom: `2px solid ${isMaster ? '#ede9fe' : user?.license_expired ? '#fecaca' : isRiderExceeded ? '#fde68a' : '#e2e8f0'}`, padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, marginRight: 12, flexShrink: 0 }}><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /><div style={{ width: 20, height: 2, background: '#1e293b', borderRadius: 1 }} /></button>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: -1 }}>Drive<span style={{ color: accentColor }}>Log</span></div>
          {isMaster && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fce7f3', color: '#9d174d' }}>MASTER</span>}
          {user.is_trial && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>체험</span>}
          {user.license_expired && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }} onClick={() => setShowExpiredPopup(true)}>만료</span>}
          {isRiderExceeded && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fffbeb', color: '#d97706', cursor: 'pointer' }} onClick={() => setShowRiderExceededPopup(true)}>👥 초과</span>}
          <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 13 : 15, fontWeight: 700, color: '#475569' }}>{currentLabel}</div>
          {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}><div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}><div style={{ fontWeight: 700, color: '#1e293b' }}>{isMaster ? 'DriveLog' : user.company_name || 'DriveLog'}</div><div>{user.name}</div><div style={{ fontSize: 9, color: '#b0b8c4', fontFamily: 'monospace', marginTop: 1 }}>A:{ADMIN_VERSION} API:{apiVersion}</div></div></div>}
          {isMobile && <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>{user.name}</div>}
        </header>
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} />}
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, background: 'white', zIndex: 101, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease-in-out', display: 'flex', flexDirection: 'column', boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.1)' : 'none' }}>
          <div style={{ padding: '24px 20px 20px', background: sidebarGrad }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><div><div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: -1 }}>DriveLog</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{isMaster ? '시스템 관리' : user.company_name || ''}</div></div><button onClick={() => setSidebarOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button></div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white' }}>{(user.name || '?').charAt(0)}</div><div><div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{user.name}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{roleLabel[user.role] || user.role}</div></div></div>
            {user.license_expires && !isMaster && (<div style={{ marginTop: 12, padding: '6px 10px', borderRadius: 8, background: user.license_expired ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.1)', fontSize: 11, color: user.license_expired ? '#fecaca' : 'rgba(255,255,255,0.7)' }}>{user.license_expired ? '⚠️ 서비스 만료' : `📋 ${user.plan_name || '스타터'}`} | 만료: {user.license_expires?.slice(0, 10)}</div>)}
            {isRiderExceeded && (<div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(217,119,6,0.3)', fontSize: 11, color: '#fde68a' }}>👥 계정 초과 {user.rider_current}/{user.rider_max}명</div>)}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {navGroups.map((group, gi) => (<div key={gi}><div style={{ padding: '12px 20px 6px', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>{group.title}</div>{group.items.map(item => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              const isBlocked = isRiderExceeded && !RIDER_EXCEEDED_ALLOWED.some(p => item.path.startsWith(p)) && item.path !== '/';
              return (<NavLink key={item.path} to={isBlocked ? '#' : item.path} end={item.path === '/'} onClick={(e) => {
                if (isBlocked) { e.preventDefault(); setShowRiderExceededPopup(true); setSidebarOpen(false); return; }
                setSidebarOpen(false);
                if (user.license_expired) setShowExpiredPopup(true);
              }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', textDecoration: 'none', background: isActive ? (isMaster ? '#faf5ff' : '#eff6ff') : 'transparent', borderRight: isActive ? `3px solid ${accentColor}` : '3px solid transparent', opacity: isBlocked ? 0.5 : 1 }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{isBlocked ? '🔒' : item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isBlocked ? '#94a3b8' : isActive ? accentColor : '#475569' }}>{item.label}</span>
              </NavLink>);
            })}</div>))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => { setSidebarOpen(false); setShowPwModal(true); }} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🔑 비밀번호 변경</button>
            <button onClick={() => { setSidebarOpen(false); handleLogout(); }} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #fee2e2', background: '#fef2f2', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>로그아웃</button>
          </div>
        </div>
      </>)}
      <main style={{ padding: user ? '16px' : 0, maxWidth: user ? 1400 : 'none', margin: '0 auto' }}>
        {user && <ExpiringBanner user={user} />}
        {user && <RiderExceededBanner user={user} />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} onRegister={() => navigate('/register')} />} />
          <Route path="/register" element={<Register onBack={() => navigate('/login')} />} />
          <Route path="/" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : (user?.role === 'MASTER' ? <MasterDashboard /> : <Dashboard />)}</RoleGuard>} />
          <Route path="/reports" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Reports />}</RoleGuard>} />
          <Route path="/calls" element={<RoleGuard user={user} roles={['SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <CallManage />}</RoleGuard>} />
          <Route path="/rides" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Rides />}</RoleGuard>} />
          <Route path="/partners" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Partners />}</RoleGuard>} />
          <Route path="/mileage" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Mileage />}</RoleGuard>} />
          <Route path="/users" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Users /></RoleGuard>} />
          <Route path="/customers" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Customers />}</RoleGuard>} />
          <Route path="/partner-manage" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <PartnerManage />}</RoleGuard>} />
          <Route path="/payment-types" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <PaymentTypes />}</RoleGuard>} />
          <Route path="/settlements" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Settlements />}</RoleGuard>} />
          <Route path="/fare-settlement" element={<RoleGuard user={user} roles={['SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <FareSettlement />}</RoleGuard>} />
          <Route path="/attendance" element={<RoleGuard user={user} roles={['SUPER_ADMIN', 'MASTER']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <Attendance />}</RoleGuard>} />
          <Route path="/fare-policies" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}>{isRiderExceeded ? <Navigate to="/users" replace /> : <FarePolicies />}</RoleGuard>} />
          <Route path="/billing" element={<RoleGuard user={user} roles={['MASTER', 'SUPER_ADMIN']}><Billing user={user} /></RoleGuard>} />
          <Route path="/my-inquiries" element={<RoleGuard user={user} roles={['SUPER_ADMIN']}><MyInquiries /></RoleGuard>} />
          <Route path="/companies" element={<RoleGuard user={user} roles={['MASTER']}><Companies /></RoleGuard>} />
          <Route path="/permissions" element={<RoleGuard user={user} roles={['MASTER']}><Permissions /></RoleGuard>} />
          <Route path="/system-settings" element={<RoleGuard user={user} roles={['MASTER']}><SystemSettings /></RoleGuard>} />
          <Route path="/inquiries" element={<RoleGuard user={user} roles={['MASTER']}><Inquiries /></RoleGuard>} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </main>
    </div>
  );
}
