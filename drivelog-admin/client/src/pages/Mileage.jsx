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

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: '총 이용금액', value: `${(cs.total_fare || 0).toLocaleString()}원`, color: '#2563eb' },
          { label: '마일리지 발생', value: `${(cs.mileage_earned || 0).toLocaleString()}원`, color: '#16a34a' },
          { label: '마일리지 사용', value: `${(cs.mileage_used || 0).toLocaleString()}원`, color: '#ef4444' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {tab === 'daily' ? (
        <>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>일자별 매출 & 마일리지</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${Number(v).toLocaleString()}원`]} />
                <Bar dataKey="이용금액" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="마일리지" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            <table>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['일자', '운행건수', '이용금액', '현금결제', 'M결제', 'M발생', '제휴콜'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === '일자' ? 'left' : 'right', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(daily.data || []).map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{(d.date || '').slice(5)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{d.ride_count}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{Number(d.total_fare || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{Number(d.total_cash || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#94a3b8' }}>{Number(d.total_mileage_used || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(d.total_mileage_earned || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#d97706' }}>{d.partner_calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 검색..."
              style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, width: 280, outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>
          <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            <table>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', '고객코드', '고객명', '운행횟수', '이용금액', '현금결제', 'M발생', 'M사용', '잔액'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: ['#','고객코드','고객명'].includes(h) ? 'left' : 'right', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.customer_code || '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{c.ride_count || 0}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{Number(c.total_fare || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{Number(c.total_cash || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(c.mileage_earned || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#ef4444' }}>{Number(c.mileage_used || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(c.mileage_balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객 데이터가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
