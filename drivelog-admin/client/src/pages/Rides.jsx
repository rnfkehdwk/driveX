import { useState, useEffect } from 'react';
import { fetchRides, updateRide, fetchRiders, fetchCustomers, fetchPartners as fetchPartnerList } from '../api/client';
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

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: '완료', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'STARTED', label: '진행', color: '#2563eb', bg: '#eff6ff' },
  { value: 'CANCELLED', label: '취소', color: '#dc2626', bg: '#fef2f2' },
];

// 운행 수정 모달
function RideEditModal({ ride, onClose, onSave }) {
  const [form, setForm] = useState({
    total_fare: ride.total_fare || 0,
    cash_amount: ride.cash_amount || 0,
    mileage_used: ride.mileage_used || 0,
    start_address: ride.start_address || '',
    end_address: ride.end_address || '',
    payment_method: ride.payment_method || 'CASH',
    rider_memo: ride.rider_memo || '',
    admin_memo: ride.admin_memo || '',
    status: ride.status || 'COMPLETED',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(ride.ride_id, form);
      onClose();
    } catch (err) { alert(err.response?.data?.error || '수정 실패'); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!confirm('이 운행을 취소하시겠습니까? 취소된 운행은 통계에서 제외됩니다.')) return;
    setSaving(true);
    try {
      await onSave(ride.ride_id, { status: 'CANCELLED' });
      onClose();
    } catch (err) { alert(err.response?.data?.error || '취소 실패'); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>운행 수정</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>No.{ride.ride_id} | {ride.ride_date} {ride.ride_time}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* 기본 정보 (읽기 전용) */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
            <div>고객: <strong style={{ color: '#1e293b' }}>{ride.customer_name || '-'}</strong> ({ride.customer_code || '-'})</div>
            <div>운전기사: <strong style={{ color: '#1e293b' }}>{ride.rider_name || '-'}</strong></div>
            <div>픽업기사: <strong style={{ color: '#1e293b' }}>{ride.pickup_rider_name || '-'}</strong></div>
            <div>제휴업체: <strong style={{ color: '#1e293b' }}>{ride.partner_name || '-'}</strong></div>
          </div>
        </div>

        {/* 수정 가능 필드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>이용금액</label>
            <input type="number" value={form.total_fare} onChange={set('total_fare')} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>현금결제</label>
            <input type="number" value={form.cash_amount} onChange={set('cash_amount')} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>마일리지 결제</label>
            <input type="number" value={form.mileage_used} onChange={set('mileage_used')} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>결제방법</label>
            <select value={form.payment_method} onChange={set('payment_method')} style={{ ...inputStyle, background: 'white' }}>
              <option value="CASH">현금</option>
              <option value="CARD">카드</option>
              <option value="TRANSFER">계좌이체</option>
              <option value="KAKAO_PAY">카카오페이</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>출발지</label>
            <input value={form.start_address} onChange={set('start_address')} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>도착지</label>
            <input value={form.end_address} onChange={set('end_address')} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>기사 메모</label>
          <input value={form.rider_memo} onChange={set('rider_memo')} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>관리자 메모</label>
          <input value={form.admin_memo} onChange={set('admin_memo')} placeholder="관리자만 볼 수 있는 메모" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>상태</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setForm(f => ({ ...f, status: s.value }))} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: form.status === s.value ? `2px solid ${s.color}` : '1px solid #e2e8f0',
                background: form.status === s.value ? s.bg : 'white', color: form.status === s.value ? s.color : '#94a3b8',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10 }}>
          {ride.status !== 'CANCELLED' && (
            <button onClick={handleCancel} disabled={saving} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>운행 취소</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  );
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
  const [editRide, setEditRide] = useState(null);
  const { toggle, icon, sort } = useSortable();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';
  const canEdit = ['MASTER', 'SUPER_ADMIN'].includes(currentUser?.role);

  const load = () => {
    setLoading(true);
    fetchRides({ page, limit, month, customer: search || undefined }).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, limit, month, search]);

  const handleSave = async (id, form) => {
    await updateRide(id, form);
    load();
  };

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
      {/* 수정 모달 */}
      {editRide && <RideEditModal ride={editRide} onClose={() => setEditRide(null)} onSave={handleSave} />}

      <div style={{
        background: 'white', borderRadius: '14px 14px 0 0', padding: '14px 20px',
        border: '1px solid #f1f5f9', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>운행 기록</span>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {data.total}건</span>
          {data.license_expired && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>⚠️ 만료일 이전 데이터만 표시</span>}
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {sortableHeaders.map((h, i) => (
                  <th key={i} style={thStyle(h)} onClick={() => h.key && toggle(h.key)}>{h.label}{h.key ? icon(h.key) : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8fafc', cursor: canEdit ? 'pointer' : 'default', background: r.status === 'CANCELLED' ? '#fef2f2' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = r.status === 'CANCELLED' ? '#fef2f2' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = r.status === 'CANCELLED' ? '#fef2f2' : 'transparent'}
                  onClick={() => canEdit && setEditRide(r)}>
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
                    }}>{r.status === 'COMPLETED' ? '완료' : r.status === 'STARTED' ? '진행' : r.status === 'CANCELLED' ? '취소' : r.status}</span>
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
