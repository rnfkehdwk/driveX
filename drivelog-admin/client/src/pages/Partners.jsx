import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPartnerStats } from '../api/client';

export default function Partners() {
  const [data, setData] = useState({ data: [], totalCalls: 0 });
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => { fetchPartnerStats({ month }).then(setData).catch(() => {}); }, [month]);

  const thStyle = { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, whiteSpace: 'nowrap' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div />
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 20, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>총 제휴 콜</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#d97706', marginTop: 6 }}>{Number(data.totalCalls)}건</div>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 20, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>등록 업체 수</div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#2563eb', marginTop: 6 }}>{data.data.length}개</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* 업체별 콜 횟수 차트 */}
        <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>업체별 콜 횟수</div>
          <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
            <BarChart data={data.data.filter(d => d.calls > 0)} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#1e293b', fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} width={isMobile ? 60 : 80} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="calls" fill="#d97706" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 전체 업체 목록 — sticky 헤더 */}
        <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>전체 업체 목록</div>
          <div style={{ maxHeight: isMobile ? 400 : 320, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>순위</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>업체명</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>연락처</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>콜수</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>비율</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{p.phone || '-'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', color: '#d97706' }}>{Number(p.calls)}건</td>
                    <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'right', color: '#64748b' }}>
                      {data.totalCalls ? ((Number(p.calls) / Number(data.totalCalls)) * 100).toFixed(1) : 0}%
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
