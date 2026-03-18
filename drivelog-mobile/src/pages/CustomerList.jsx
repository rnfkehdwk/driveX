import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers } from '../api/client';

export default function CustomerList() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCustomers({ q: search || undefined }).then(r => setList(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>←</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>고객 조회</span>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 코드, 전화번호 검색..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }} />
      </div>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>검색 결과 {list.length}명</div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : list.map(c => (
          <div key={c.customer_id} style={{
            background: 'white', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#92400e', flexShrink: 0 }}>
              {c.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {c.customer_code && <span>{c.customer_code} · </span>}
                {c.phone || '연락처 없음'}
              </div>
              {c.address && <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.address}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{(c.mileage_balance || 0).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>마일리지</div>
            </div>
          </div>
        ))}
        {!loading && list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객이 없습니다.</div>}
      </div>
    </div>
  );
}
