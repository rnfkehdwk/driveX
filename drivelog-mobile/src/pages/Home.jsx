import { useNavigate } from 'react-router-dom';

const ALL_MENUS = [
  { path: '/ride/new', label: '운행기록 작성', icon: '🚗', desc: 'GPS 출발/도착 + 요금 입력', color: '#2563eb', bg: '#eff6ff', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/ride/list', label: '운행기록 조회', icon: '📋', desc: '운행 기록 조회', color: '#16a34a', bg: '#f0fdf4', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/rider/new', label: '기사 등록', icon: '🧑‍✈️', desc: '신규 기사 등록', color: '#0891b2', bg: '#ecfeff', roles: ['MASTER', 'SUPER_ADMIN'] },
  { path: '/customer/new', label: '고객 등록', icon: '👤', desc: '신규 고객 등록', color: '#d97706', bg: '#fffbeb', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/customer/list', label: '고객 조회', icon: '🔍', desc: '기존 고객 검색', color: '#7c3aed', bg: '#f5f3ff', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
  { path: '/settings', label: '설정', icon: '⚙️', desc: '계정 정보 관리', color: '#64748b', bg: '#f8fafc', roles: ['MASTER', 'SUPER_ADMIN', 'RIDER'] },
];

export default function Home({ user }) {
  const nav = useNavigate();
  const role = user?.role || 'RIDER';
  const menus = ALL_MENUS.filter(m => m.roles.includes(role));

  const roleLabel = { MASTER: '시스템 관리자', SUPER_ADMIN: '업체 관리자', RIDER: '운행기사' };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', padding: '24px 20px 28px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -1 }}>DriveLog</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{user?.company_name || ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{roleLabel[role] || role}</div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div style={{ padding: '20px 16px' }}>
        {menus.map((m) => (
          <div key={m.path} onClick={() => nav(m.path)} style={{
            background: 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
            border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.1s',
          }}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 48, height: 48, borderRadius: 14, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              {m.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{m.label}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{m.desc}</div>
            </div>
            <div style={{ fontSize: 18, color: '#cbd5e1' }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
