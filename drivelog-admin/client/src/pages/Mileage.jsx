import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchDailyStats, fetchMileageStats } from '../api/client';

export default function Mileage() {
  const [tab, setTab] = useState('daily');
  const [daily, setDaily] = useState({ data: [], summary: {} });
  const [customers, setCustomers] = useState({ data: [], summary: {} });
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    fetchDailyStats({ month }).then(setDaily).catch(() => {});
    fetchMileageStats({ month }).then(setCustomers).catch(() => {});
  }, [month]);

  const filteredCustomers = search
    ? (customers.data || []).filter(c => (c.customer_code || '').includes(search) || (c.name || '').includes(search))
    : (customers.data || []);

  const cs = customers.summary || {};
  const chartData = (daily.data || []).map(d => ({
    date: (d.date || '').slice(5),
    이용금액: Number(d.total_fare || 0),
    마일리지: Number(d.total_mileage_earned || 0),
  }));

  const thStyle = { padding: isMobile ? '8px 6px' : '10px 12px', fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, whiteSpace: 'nowrap' };
  const tdStyle = { padding: isMobile ? '8px 6px' : '10px 12px', fontSize: isMobile ? 11 : 13 };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'daily', label: '일자별' }, { id: 'customer', label: '고객별' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: tab === t.id ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: tab === t.id ? '#2563eb' : 'white', color: tab === t.id ? 'white' : '#64748b',
            }}>{t.label}</button>
          ))}
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
      </div>

      {/* KPI: 모바일 세로 스택 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 8 : 14, marginBottom: 20 }}>
        {[
          { label: '총 이용금액', value: `${Number(cs.total_fare || 0).toLocaleString()}원`, color: '#2563eb' },
          { label: '마일리지 발생', value: `${Number(cs.mileage_earned || 0).toLocaleString()}원`, color: '#16a34a' },
          { label: '마일리지 사용', value: `${Number(cs.mileage_used || 0).toLocaleString()}원`, color: '#ef4444' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: isMobile ? 12 : 20, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: isMobile ? 10 : 12, color: '#94a3b8', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: isMobile ? 16 : 28, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {tab === 'daily' ? (
        <>
          {/* 차트 */}
          <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 24, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>일자별 매출 & 마일리지</div>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} interval={isMobile ? 2 : 0} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${Number(v).toLocaleString()}원`]} />
                <Bar dataKey="이용금액" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="마일리지" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 일자별 테이블 */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <div style={{ overflow: 'auto', maxHeight: isMobile ? 400 : 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 500 : 'auto' }}>
                <thead>
                  <tr>
                    {['일자', '건수', '이용금액', '현금결제', 'M결제', 'M발생'].map(h => (
                      <th key={h} style={{ ...thStyle, textAlign: h === '일자' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(daily.data || []).map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ ...tdStyle }}>{(d.date || '').slice(5)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{d.ride_count}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>{Number(d.total_fare || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(d.total_cash || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#94a3b8' }}>{Number(d.total_mileage_used || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(d.total_mileage_earned || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 검색..."
              style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, width: isMobile ? '100%' : 280, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>

          {/* 고객별 테이블 — 가로 스크롤 + 헤더 고정 */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            <div style={{ overflow: 'auto', maxHeight: isMobile ? 500 : 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
                <thead>
                  <tr>
                    {['#', '고객코드', '고객명', '건수', '이용금액', 'M발생', 'M사용', '잔액'].map(h => (
                      <th key={h} style={{ ...thStyle, textAlign: ['#','고객코드','고객명'].includes(h) ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ ...tdStyle, color: '#94a3b8' }}>{i + 1}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{c.customer_code || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{c.ride_count || 0}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>{Number(c.total_fare || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(c.mileage_earned || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ef4444' }}>{Number(c.mileage_used || 0).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(c.mileage_balance || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객 데이터가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
