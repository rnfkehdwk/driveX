import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRides } from '../api/client';

export default function RideList() {
  const nav = useNavigate();
  const [data, setData] = useState({ data: [], total: 0 });
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRides({ month, limit: 100 }).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [month]);

  const totalFare = (data.data || []).reduce((s, r) => s + Number(r.total_fare || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>운행기록 조회</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, padding: '14px 20px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>운행 건수</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb' }}>{data.total}건</div>
        </div>
        <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>총 매출</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>{totalFare.toLocaleString()}원</div>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px 20px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : (data.data || []).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>운행 기록이 없습니다.</div>
        ) : (data.data || []).map((r, i) => (
          <div key={i} style={{
            background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            border: '1px solid #f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>{(r.ride_date || '').slice(5)}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.ride_time}</span>
                {r.partner_name && <span style={{ padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 600 }}>{r.partner_name}</span>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{r.total_fare ? `${Number(r.total_fare).toLocaleString()}원` : '-'}</span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              {r.start_address && <div>📍 {r.start_address} {r.start_detail && <span style={{ color: '#94a3b8' }}>({r.start_detail})</span>}</div>}
              {r.end_address && <div>🏁 {r.end_address} {r.end_detail && <span style={{ color: '#94a3b8' }}>({r.end_detail})</span>}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
              {r.customer_name && <span>고객: {r.customer_name}</span>}
              {r.rider_name && <span>운전: {r.rider_name}</span>}
              {r.pickup_rider_name && <span>픽업: {r.pickup_rider_name}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
