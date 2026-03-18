import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPartnerStats } from '../api/client';

export default function Partners() {
  const [data, setData] = useState({ data: [], totalCalls: 0 });
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchPartnerStats({ month }).then(setData).catch(() => {});
  }, [month]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div />
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>총 제휴 콜</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', marginTop: 6 }}>{data.totalCalls}건</div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>등록 업체 수</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginTop: 6 }}>{data.data.length}개</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>업체별 콜 횟수</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.data.filter(d => d.calls > 0)} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#1e293b', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="calls" fill="#d97706" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>전체 업체 목록</div>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            <table>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['순위', '업체명', '연락처', '콜수', '비율'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === '업체명' || h === '순위' || h === '연락처' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b' }}>{p.phone || '-'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#d97706' }}>{p.calls}건</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', color: '#64748b' }}>
                      {data.totalCalls ? ((p.calls / data.totalCalls) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
