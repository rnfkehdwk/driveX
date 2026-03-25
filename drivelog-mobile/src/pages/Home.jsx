import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MOBILE_VERSION = __BUILD_TIME__ || 'dev';

const ALL_MENUS = [
  { path: '/ride/new', label: '운행기록 작성', icon: '🚗', desc: 'GPS 출발/도착 + 요금 입력', color: '#2563eb', bg: '#eff6ff', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/ride/list', label: '운행기록 조회', icon: '📋', desc: '운행 기록 조회', color: '#16a34a', bg: '#f0fdf4', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/rider/new', label: '기사 등록', icon: '🧑‍✈️', desc: '신규 기사 등록', color: '#0891b2', bg: '#ecfeff', roles: ['MASTER', 'SUPER_ADMIN'] },
  { path: '/customer/new', label: '고객 등록', icon: '👤', desc: '신규 고객 등록', color: '#d97706', bg: '#fffbeb', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/customer/list', label: '고객 조회', icon: '🔍', desc: '기존 고객 검색', color: '#7c3aed', bg: '#f5f3ff', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/partner/list', label: '제휴업체 관리', icon: '🤝', desc: '제휴업체 등록/조회', color: '#be185d', bg: '#fdf2f8', roles: ['MASTER', 'SUPER_ADMIN'] },
  { path: '/settings', label: '설정', icon: '⚙️', desc: '계정 정보 관리', color: '#64748b', bg: '#f8fafc', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'], allowWhenExpired: true },
];

export default function Home({ user, onMenuClick }) {
  const nav = useNavigate();
  const role = user?.role || 'RIDER';
  const menus = ALL_MENUS.filter(m => m.roles.includes(role));
  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };
  const [apiVersion, setApiVersion] = useState('');

  // 만료 여부
  const isExpired = (() => {
    if (!user || !user.license_expires) return false;
    if (user.license_expired) return true;
    const now = new Date(); now.setHours(0,0,0,0);
    const exp = new Date(user.license_expires); exp.setHours(23,59,59,999);
    return now > exp;
  })();

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setApiVersion(d.version || '?')).catch(() => setApiVersion('?'));
  }, []);

  const handleMenuClick = (m) => {
    // 만료 상태에서 설정 외 메뉴 차단
    if (isExpired && !m.allowWhenExpired) {
      if (onMenuClick) onMenuClick(m.path);
      return;
    }
    nav(m.path);
  };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', padding: '24px 20px 28px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -1 }}>DriveLog</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{user?.company_name || ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{roleLabel[role] || role}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontFamily: 'monospace' }}>
              M:{MOBILE_VERSION} API:{apiVersion}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '20px 16px' }}>
        {menus.map((m) => {
          const disabled = isExpired && !m.allowWhenExpired;
          return (
            <div key={m.path} onClick={() => handleMenuClick(m)} style={{
              background: disabled ? '#f8f8f8' : 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
              border: `1px solid ${disabled ? '#e5e5e5' : '#f1f5f9'}`, boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
              opacity: disabled ? 0.6 : 1, transition: 'transform 0.1s',
            }}
            onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: disabled ? '#f1f1f1' : m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {disabled ? '🔒' : m.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: disabled ? '#94a3b8' : '#1e293b' }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{disabled ? '서비스 만료 — 이용 불가' : m.desc}</div>
              </div>
              <div style={{ fontSize: 18, color: '#cbd5e1' }}>{disabled ? '🔒' : '›'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
