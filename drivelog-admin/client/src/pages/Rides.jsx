import { useState, useEffect } from 'react';
import { fetchRides } from '../api/client';
import { exportToExcel, RIDE_COLUMNS } from '../utils/excel';

function useSortable(initialKey = '', initialDir = 'asc') {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState(initialDir);
  const toggle = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const icon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const sort = (arr) => {
    if (!sortKey) return arr;
    return [...arr].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (va == null) va = ''; if (vb == null) vb = '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko');
    });
  };
  return { sortKey, sortDir, toggle, icon, sort };
}

export default function Rides() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toggle, icon, sort } = useSortable();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  useEffect(() => {
    setLoading(true);
    fetchRides({ page, limit, month, customer: search || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, month, search]);

  const sortableHeaders = [
    { key: null, label: 'No' },
    ...(isMaster ? [{ key: 'company_name', label: '소속업체' }] : []),
    { key: 'ride_date', label: '일자' },
    { key: 'ride_time', label: '시간' },
    { key: null, label: '고객코드' },
    { key: 'customer_name', label: '고객' },
    { key: null, label: '전화번호' },
    { key: null, label: '이용금액' },
    { key: null, label: '현금' },
    { key: null, label: 'M결제' },
    { key: null, label: 'M발생' },
    { key: null, label: '출발지' },
    { key: null, label: '도착지' },
    { key: 'rider_name', label: '운전기사' },
    { key: null, label: '픽업기사' },
    { key: null, label: '연결업체' },
    { key: null, label: '업체전화' },
    { key: null, label: '메모' },
    { key: null, label: '상태' },
  ];

  const sorted = sort(data.data || []);
  const totalPages = Math.ceil(data.total / limit);

  const thStyle = (h) => ({
    padding: '11px 8px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11,
    borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc', position: 'sticky', top: 0,
    cursor: h.key ? 'pointer' : 'default', userSelect: 'none',
  });

  return (
    <div className="fade-in">
      <div style={{
        background: 'white', borderRadius: '14px 14px 0 0', padding: '14px 20px',
        border: '1px solid #f1f5f9', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>운행 기록</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {data.total}건</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <input placeholder="고객 검색..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, width: 120 }} />
          {[30, 50, 100].map(n => (
            <button key={n} onClick={() => { setLimit(n); setPage(1); }} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: limit === n ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: limit === n ? '#eff6ff' : 'white', color: limit === n ? '#2563eb' : '#64748b',
            }}>{n}건</button>
          ))}
          <button onClick={() => fetchRides({ month, limit: 9999 }).then(res => exportToExcel(res.data || [], RIDE_COLUMNS, `운행일지_${month}`))}
            style={{ padding: '5px 12px', borderRadius: 6, background: '#16a34a', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>
            Excel 다운로드
          </button>
        </div>
      </div>

      <div style={{
        background: 'white', borderRadius: '0 0 14px 14px', overflow: 'auto',
        border: '1px solid #f1f5f9', borderTop: 'none', maxHeight: 'calc(100vh - 240px)',
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : (
          <table>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {sortableHeaders.map((h, i) => (
                  <th key={i} style={thStyle(h)} onClick={() => h.key && toggle(h.key)}>
                    {h.label}{h.key ? icon(h.key) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#94a3b8' }}>{r.ride_id}</td>
                  {isMaster && <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>{r.company_name || '-'}</td>}
                  <td style={{ padding: '10px 8px', fontSize: 12, whiteSpace: 'nowrap' }}>{(r.ride_date || '').slice(5)}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#2563eb' }}>{r.ride_time}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.customer_code || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600 }}>{r.customer_name || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#64748b' }}>{r.customer_phone || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, fontWeight: 700 }}>{r.total_fare ? Number(r.total_fare).toLocaleString() : '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.cash_amount ? Number(r.cash_amount).toLocaleString() : '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.mileage_used || 0}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#16a34a' }}>{r.mileage_earned ? `+${Number(r.mileage_earned).toLocaleString()}` : '0'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.start_address || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.end_address || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.rider_name || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.pickup_rider_name || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{r.partner_name ? <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600 }}>{r.partner_name}</span> : '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#64748b' }}>{r.partner_phone || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: '#94a3b8', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rider_memo || '-'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: r.status === 'COMPLETED' ? '#f0fdf4' : r.status === 'STARTED' ? '#eff6ff' : '#fef2f2',
                      color: r.status === 'COMPLETED' ? '#16a34a' : r.status === 'STARTED' ? '#2563eb' : '#dc2626',
                    }}>{r.status === 'COMPLETED' ? '완료' : r.status === 'STARTED' ? '진행' : r.status}</span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={sortableHeaders.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>운행 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 14 }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 32, height: 32, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: page === p ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: page === p ? '#2563eb' : 'white', color: page === p ? 'white' : '#64748b',
            }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
