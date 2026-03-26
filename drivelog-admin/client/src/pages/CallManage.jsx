import { useState, useEffect, useCallback } from 'react';
import { fetchCalls, createCall, cancelCall, updateCall, fetchCustomers, fetchPartners } from '../api/client';

const STATUS_MAP = {
  WAITING: { label: '대기', color: '#d97706', bg: '#fffbeb', icon: '🔔' },
  ASSIGNED: { label: '배정', color: '#2563eb', bg: '#eff6ff', icon: '🧑‍✈️' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff', icon: '🚗' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2', icon: '❌' },
};
const TABS = ['ALL', 'WAITING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const TAB_LABELS = { ALL: '전체', WAITING: '대기', ASSIGNED: '배정', IN_PROGRESS: '운행중', COMPLETED: '완료', CANCELLED: '취소' };

function CreateCallModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ start_address: '', start_detail: '', end_address: '', end_detail: '', customer_id: '', partner_id: '', estimated_fare: '', payment_method: 'CASH', memo: '' });
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers({ limit: 9999 }).then(r => setCustomers(r.data || [])).catch(() => {});
    fetchPartners({ limit: 9999 }).then(r => setPartners(r.data || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.start_address) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, customer_id: form.customer_id || null, partner_id: form.partner_id || null, estimated_fare: form.estimated_fare ? parseInt(form.estimated_fare) : null };
      await createCall(body);
      alert('콜이 생성되었습니다.');
      onCreated();
      onClose();
    } catch (err) { alert(err.response?.data?.error || '콜 생성 실패'); }
    finally { setSaving(false); }
  };

  const is = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const ls = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

  const filteredCust = custSearch ? customers.filter(c => c.name?.includes(custSearch) || c.phone?.includes(custSearch) || c.customer_code?.includes(custSearch)) : customers;
  const filteredPart = partSearch ? partners.filter(p => p.name?.includes(partSearch)) : partners;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>📞 새 콜 생성</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* 출발지 / 도착지 */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📍 위치 정보</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={ls}>출발지 *</label><input value={form.start_address} onChange={set('start_address')} placeholder="출발 주소" style={is} /></div>
            <div><label style={ls}>출발 상세</label><input value={form.start_detail} onChange={set('start_detail')} placeholder="동/호수 등" style={is} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={ls}>도착지 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(미정 가능)</span></label><input value={form.end_address} onChange={set('end_address')} placeholder="도착 주소 (비워두면 미정)" style={is} /></div>
            <div><label style={ls}>도착 상세</label><input value={form.end_detail} onChange={set('end_detail')} placeholder="동/호수 등" style={is} /></div>
          </div>
        </div>

        {/* 고객 / 제휴업체 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={ls}>고객</label>
            <select value={form.customer_id} onChange={set('customer_id')} style={{ ...is, background: 'white' }}>
              <option value="">선택 안 함</option>
              {filteredCust.slice(0, 100).map(c => (<option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_code})</option>))}
            </select>
            {customers.length > 10 && <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="고객 검색..." style={{ ...is, marginTop: 4, fontSize: 12, padding: '6px 10px' }} />}
          </div>
          <div>
            <label style={ls}>제휴업체</label>
            <select value={form.partner_id} onChange={set('partner_id')} style={{ ...is, background: 'white' }}>
              <option value="">선택 안 함</option>
              {filteredPart.slice(0, 100).map(p => (<option key={p.partner_id} value={p.partner_id}>{p.name}</option>))}
            </select>
            {partners.length > 10 && <input value={partSearch} onChange={e => setPartSearch(e.target.value)} placeholder="업체 검색..." style={{ ...is, marginTop: 4, fontSize: 12, padding: '6px 10px' }} />}
          </div>
        </div>

        {/* 요금 / 결제 / 메모 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={ls}>예상 요금</label><input type="number" value={form.estimated_fare} onChange={set('estimated_fare')} placeholder="0" style={is} /></div>
          <div><label style={ls}>결제방법</label><select value={form.payment_method} onChange={set('payment_method')} style={{ ...is, background: 'white' }}><option value="CASH">현금</option><option value="CARD">카드</option><option value="TRANSFER">계좌이체</option><option value="KAKAO_PAY">카카오페이</option></select></div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={ls}>메모</label>
          <textarea value={form.memo} onChange={set('memo')} rows={2} placeholder="기사에게 전달할 메모 (선택)" style={{ ...is, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '생성 중...' : '📞 콜 생성'}</button>
        </div>
      </div>
    </div>
  );
}

function CallCard({ call, onCancel, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_MAP[call.status] || STATUS_MAP.WAITING;
  const ago = (() => {
    const diff = Date.now() - new Date(call.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  })();

  return (
    <div onClick={() => setExpanded(!expanded)} style={{ background: 'white', borderRadius: 14, border: `1px solid ${expanded ? st.color + '40' : '#f1f5f9'}`, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>#{call.call_id}</span>
          {call.estimated_fare && <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{Number(call.estimated_fare).toLocaleString()}원</span>}
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{ago}</span>
      </div>

      <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>출발</span> {call.start_address || '-'}
        {call.start_detail && <span style={{ color: '#94a3b8' }}> ({call.start_detail})</span>}
      </div>
      <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 8 }}>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>도착</span> {call.end_address || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>미정</span>}
        {call.end_detail && <span style={{ color: '#94a3b8' }}> ({call.end_detail})</span>}
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
        {call.customer_name && <span>👤 {call.customer_name}</span>}
        {call.partner_name && <span>🏢 {call.partner_name}</span>}
        {call.assigned_rider_name && <span>🧑‍✈️ {call.assigned_rider_name}</span>}
        {call.payment_method && <span>💳 {call.payment_method === 'CASH' ? '현금' : call.payment_method === 'CARD' ? '카드' : call.payment_method === 'TRANSFER' ? '이체' : '카카오'}</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          {call.memo && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>📝 {call.memo}</div>}
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
            생성: {call.created_at?.slice(0, 16).replace('T', ' ')} ({call.created_by_name})
            {call.assigned_at && <span> | 배정: {call.assigned_at?.slice(0, 16).replace('T', ' ')}</span>}
            {call.completed_at && <span> | 완료: {call.completed_at?.slice(0, 16).replace('T', ' ')}</span>}
            {call.cancelled_at && <span> | 취소: {call.cancelled_at?.slice(0, 16).replace('T', ' ')}</span>}
            {call.cancel_reason && <span> ({call.cancel_reason})</span>}
            {call.ride_id && <span> | 운행 #{call.ride_id}</span>}
          </div>
          {['WAITING', 'ASSIGNED'].includes(call.status) && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('이 콜을 취소하시겠습니까?')) onCancel(call.call_id); }}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>콜 취소</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CallManage() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [tab, setTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 100 };
    if (tab !== 'ALL') params.status = tab;
    fetchCalls(params).then(r => {
      setCalls(r.data || []);
      setTotal(r.total || 0);
      setWaitingCount(r.waiting_count || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // 30초 polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalls({ limit: 100, status: tab !== 'ALL' ? tab : undefined }).then(r => {
        setCalls(r.data || []);
        setTotal(r.total || 0);
        setWaitingCount(r.waiting_count || 0);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleCancel = async (id) => {
    try { await cancelCall(id, { cancel_reason: '관리자 취소' }); load(); } catch (err) { alert(err.response?.data?.error || '취소 실패'); }
  };

  const statusCounts = {};
  TABS.forEach(t => { statusCounts[t] = t === 'ALL' ? total : calls.filter(c => c.status === t).length; });
  // ALL 탭에서는 전체 count, 나머지는 현재 필터 결과
  if (tab === 'ALL') {
    const allCalls = calls;
    TABS.forEach(t => { if (t !== 'ALL') statusCounts[t] = allCalls.filter(c => c.status === t).length; });
  }

  return (
    <div className="fade-in">
      {showCreate && <CreateCallModal onClose={() => setShowCreate(false)} onCreated={load} />}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: '대기 중', value: waitingCount, color: '#d97706', icon: '🔔' },
          { label: '배정됨', value: calls.filter(c => c.status === 'ASSIGNED').length, color: '#2563eb', icon: '🧑‍✈️' },
          { label: '운행중', value: calls.filter(c => c.status === 'IN_PROGRESS').length, color: '#7c3aed', icon: '🚗' },
          { label: '오늘 완료', value: calls.filter(c => c.status === 'COMPLETED' && c.completed_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length, color: '#16a34a', icon: '✅' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{kpi.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* 탭 + 생성 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => {
            const active = tab === t;
            const cnt = t === 'ALL' ? total : statusCounts[t];
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: active ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: active ? '#eff6ff' : 'white', color: active ? '#2563eb' : '#64748b',
              }}>{TAB_LABELS[t]} {cnt > 0 ? `(${cnt})` : ''}</button>
            );
          })}
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 콜 생성</button>
      </div>

      {/* 콜 목록 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
      ) : calls.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>콜이 없습니다</div>
          <div style={{ fontSize: 13 }}>새 콜을 생성하면 기사들이 수락할 수 있습니다.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {calls.map(call => (
            <CallCard key={call.call_id} call={call} onCancel={handleCancel} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
