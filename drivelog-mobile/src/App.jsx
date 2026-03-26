import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import RideNew from './pages/RideNew';
import RideList from './pages/RideList';
import RiderNew from './pages/RiderNew';
import CustomerNew from './pages/CustomerNew';
import CustomerList from './pages/CustomerList';
import PartnerList from './pages/PartnerList';
import CallList from './pages/CallList';
import Settings from './pages/Settings';
import { createInquiry } from './api/client';

function InquiryModal({ user, onClose }) {
  const [form, setForm] = useState({ inquiry_type: 'RENEWAL', title: '서비스 갱신 요청', content: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const handleSubmit = async () => { if (!form.title) { alert('제목을 입력해주세요.'); return; } setSaving(true); try { await createInquiry(form); setDone(true); } catch (err) { alert(err.response?.data?.error || '문의 등록 실패'); } finally { setSaving(false); } };
  if (done) return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ background: 'white', borderRadius: 20, padding: '32px 24px', maxWidth: 360, width: '100%', textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>✅</div><div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>문의가 접수되었습니다</div><div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>관리자가 확인 후 연락드리겠습니다.</div><button onClick={onClose} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>확인</button></div></div>);
  return (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}><div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: '28px 22px', maxWidth: 380, width: '100%' }}><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📩 갱신 문의</div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>문의 유형</label><select value={form.inquiry_type} onChange={e => setForm(f => ({ ...f, inquiry_type: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: 'white' }}><option value="RENEWAL">서비스 갱신</option><option value="UPGRADE">요금제 업그레이드</option><option value="DOWNGRADE">요금제 다운그레이드</option><option value="GENERAL">일반 문의</option><option value="BUG">버그 신고</option></select></div><div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>제목</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div><div style={{ marginBottom: 20 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>상세 내용</label><textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="문의 내용을 입력해주세요..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} /></div><div style={{ display: 'flex', gap: 8 }}><button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button><button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '전송 중...' : '문의 보내기'}</button></div></div></div>);
}

function BlockedPage({ user, onContact }) {
  const nav = useNavigate();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  return (<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><div style={{ textAlign: 'center', maxWidth: 340 }}><div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div><div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>사용 만료</div><div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>서비스 이용기간이 만료되어<br />기능을 사용할 수 없습니다.</div><div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 20, textAlign: 'left' }}><div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.8 }}><div>• 요금제: <strong>{user?.plan_name || '미지정'}</strong></div><div>• 만료일: <strong>{user?.license_expires?.slice(0, 10)}</strong></div></div></div>{isSuperAdmin ? <button onClick={onContact} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>갱신 문의하기</button> : <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>업체 관리자에게 갱신을 요청해주세요.</div>}<button onClick={() => nav('/')} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>홈으로 돌아가기</button></div></div>);
}

function ExpiringBanner({ user }) {
  if (!user || !user.license_expires || user.license_expired) return null;
  const now = new Date(); now.setHours(0,0,0,0); const exp = new Date(user.license_expires); exp.setHours(0,0,0,0);
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (daysLeft > 7 || daysLeft < 0) return null;
  return (<div style={{ background: daysLeft <= 3 ? '#fef2f2' : '#fffbeb', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: daysLeft <= 3 ? '#dc2626' : '#d97706', textAlign: 'center' }}>⏰ 서비스 만료 {daysLeft}일 전 ({user.license_expires?.slice(0, 10)})</div>);
}

function Guard({ user, children }) { return user ? children : <Navigate to="/login" />; }

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [showInquiry, setShowInquiry] = useState(false);
  const [showInitPopup, setShowInitPopup] = useState(true);

  const handleLogout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); setUser(null); };

  const isExpired = (() => { if (!user || !user.license_expires) return false; if (user.license_expired) return true; const now = new Date(); now.setHours(0,0,0,0); const exp = new Date(user.license_expires); exp.setHours(23,59,59,999); return now > exp; })();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', background: '#f7f8fc', position: 'relative' }}>
      {user && isExpired && showInitPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: '36px 24px', maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>서비스 이용기간 만료</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 20 }}><strong>{user?.company_name}</strong>의 서비스 이용기간이<br /><strong style={{ color: '#dc2626' }}>{user?.license_expires?.slice(0, 10)}</strong>에 만료되었습니다.</div>
            <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 20, textAlign: 'left' }}><div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.8 }}><div>• 요금제: <strong>{user?.plan_name || '미지정'}</strong></div><div>• 만료일: <strong>{user?.license_expires?.slice(0, 10)}</strong></div>{!isSuperAdmin && <div>• 업체 관리자에게 갱신을 요청해주세요</div>}</div></div>
            {isSuperAdmin && <button onClick={() => { setShowInitPopup(false); setShowInquiry(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>갱신 문의하기</button>}
            <button onClick={() => setShowInitPopup(false)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}

      {showInquiry && <InquiryModal user={user} onClose={() => setShowInquiry(false)} />}
      {user && !isExpired && <ExpiringBanner user={user} />}
      {user && isExpired && !showInitPopup && (
        <div onClick={() => isSuperAdmin ? setShowInquiry(true) : null} style={{ background: '#fef2f2', padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#dc2626', textAlign: 'center', cursor: isSuperAdmin ? 'pointer' : 'default', borderBottom: '1px solid #fecaca' }}>
          ⚠️ 서비스 만료{isSuperAdmin ? ' — 탭하여 갱신 문의' : ' — 업체 관리자에게 문의하세요'}
        </div>
      )}

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={(u) => { setUser(u); setShowInitPopup(true); }} />} />
        <Route path="/" element={<Guard user={user}><Home user={user} onMenuClick={() => setShowInquiry(true)} /></Guard>} />
        <Route path="/settings" element={<Guard user={user}><Settings user={user} onLogout={handleLogout} /></Guard>} />
        <Route path="/calls" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <CallList user={user} />}</Guard>} />
        <Route path="/ride/new" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <RideNew user={user} />}</Guard>} />
        <Route path="/ride/list" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <RideList />}</Guard>} />
        <Route path="/rider/new" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <RiderNew />}</Guard>} />
        <Route path="/customer/new" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <CustomerNew />}</Guard>} />
        <Route path="/customer/list" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <CustomerList />}</Guard>} />
        <Route path="/partner/list" element={<Guard user={user}>{isExpired ? <BlockedPage user={user} onContact={() => setShowInquiry(true)} /> : <PartnerList />}</Guard>} />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
      </Routes>
    </div>
  );
}
