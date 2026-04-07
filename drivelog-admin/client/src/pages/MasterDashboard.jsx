import { useState, useEffect } from 'react';
import { fetchMasterDashboard } from '../api/client';

const INQUIRY_TYPE = { RENEWAL: '갱신', UPGRADE: '업그레이드', DOWNGRADE: '다운그레이드', GENERAL: '일반', BUG: '버그' };
const INQUIRY_STATUS = { PENDING: { label: '대기', color: '#d97706', bg: '#fffbeb' }, IN_PROGRESS: { label: '처리중', color: '#2563eb', bg: '#eff6ff' }, RESOLVED: { label: '완료', color: '#16a34a', bg: '#f0fdf4' }, CLOSED: { label: '종료', color: '#64748b', bg: '#f8fafc' } };

export default function MasterDashboard() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMasterDashboard({ month }).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [month]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>대시보드 로딩 중...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>데이터를 불러올 수 없습니다.</div>;

  const s = data.summary;
  const card = { background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' };

  const daysLeft = (dateStr) => {
    if (!dateStr) return '-';
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>📊 시스템 대시보드</div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: "'Noto Sans KR'" }} />
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        {[
          { label: '전체 업체', value: s.totalCompanies, icon: '🏢', color: '#2563eb' },
          { label: '활성 업체', value: s.activeCompanies, icon: '✅', color: '#16a34a' },
          { label: '만료 업체', value: s.expiredCompanies, icon: '⚠️', color: '#dc2626' },
          { label: '총 매출', value: `${Number(s.totalFare).toLocaleString()}원`, icon: '💰', color: '#d97706' },
          { label: '총 운행', value: `${s.totalRides}건`, icon: '🚗', color: '#7c3aed' },
          { label: '활성 기사', value: `${s.totalRiders}명`, icon: '🚘', color: '#0891b2' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 12px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* 업체별 매출 TOP 10 + 운행건수 TOP 10 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>💰 업체별 매출 TOP 10 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({data.month})</span></div>
          {data.topFare.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', fontWeight: 600, color: '#64748b', width: 36 }}>순위</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'left', fontWeight: 600, color: '#64748b' }}>업체명</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>기사</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>매출</th>
                </tr>
              </thead>
              <tbody>
                {data.topFare.map((c, i) => (
                  <tr key={c.company_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 800, textAlign: 'center', color: i < 3 ? '#2563eb' : '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{c.company_name}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', color: '#64748b' }}>{c.rider_count}명</td>
                    <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(c.monthly_fare).toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🚗 업체별 운행건수 TOP 10 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({data.month})</span></div>
          {data.topRides.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>데이터 없음</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', fontWeight: 600, color: '#64748b', width: 36 }}>순위</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'left', fontWeight: 600, color: '#64748b' }}>업체명</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>기사</th>
                  <th style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', fontWeight: 600, color: '#64748b' }}>운행수</th>
                </tr>
              </thead>
              <tbody>
                {data.topRides.map((c, i) => (
                  <tr key={c.company_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 800, textAlign: 'center', color: i < 3 ? '#7c3aed' : '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}>{c.company_name}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', color: '#64748b' }}>{c.rider_count}명</td>
                    <td style={{ padding: '8px 10px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#7c3aed' }}>{Number(c.monthly_rides)}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 만료 임박 업체 + 최근 문의사항 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>⚠️ 라이선스 만료 임박 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>30일 이내</span></div>
          {data.expiringCompanies.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>✅ 만료 임박 업체가 없습니다</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.expiringCompanies.map(c => {
                const days = daysLeft(c.license_expires);
                const urgent = days <= 7;
                return (
                  <div key={c.company_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: urgent ? '#fef2f2' : '#fffbeb', border: `1px solid ${urgent ? '#fecaca' : '#fde68a'}` }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.company_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.plan_name || '-'} · {c.ceo_name || '-'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: urgent ? '#dc2626' : '#d97706' }}>D-{days}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.license_expires?.slice(0, 10)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📩 최근 문의사항</div>
          {data.recentInquiries.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>문의 없음</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {data.recentInquiries.map(inq => {
                const st = INQUIRY_STATUS[inq.status] || INQUIRY_STATUS.PENDING;
                return (
                  <div key={inq.inquiry_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{INQUIRY_TYPE[inq.inquiry_type] || inq.inquiry_type}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inq.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{inq.company_name || '-'} · {inq.created_at?.slice(0, 10)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
