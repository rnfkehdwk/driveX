import { useState, useEffect, useCallback } from 'react';
import { fetchCalls, createCall, cancelCall, updateCall, fetchCustomers, fetchPartners } from '../api/client';
import AddressSearchModal from '../components/AddressSearchModal';
import KakaoMiniMap from '../components/KakaoMiniMap';

const STATUS_MAP = {
  WAITING: { label: '대기', color: '#d97706', bg: '#fffbeb', icon: '🔔' },
  ASSIGNED: { label: '배정', color: '#2563eb', bg: '#eff6ff', icon: '🚘' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff', icon: '🚗' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2', icon: '❌' },
};
const TABS = ['ALL', 'WAITING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const TAB_LABELS = { ALL: '전체', WAITING: '대기', ASSIGNED: '배정', IN_PROGRESS: '운행중', COMPLETED: '완료', CANCELLED: '취소' };

function CreateCallModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ start_address: '', start_detail: '', start_lat: null, start_lng: null, end_address: '', end_detail: '', end_lat: null, end_lng: null, customer_id: '', partner_id: '', estimated_fare: '', payment_method: 'CASH', memo: '' });
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [addrSearch, setAddrSearch] = useState(null); // 'start' | 'end' | null

  useEffect(() => {
    fetchCustomers({ limit: 9999 }).then(r => setCustomers(r.data || [])).catch(() => {});
    fetchPartners({ limit: 9999 }).then(r => setPartners(r.data || [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAddrSelect = (result) => {
    if (addrSearch === 'start') {
      setForm(f => ({ ...f, start_address: result.address || result.name, start_lat: result.lat, start_lng: result.lng }));
    } else {
      setForm(f => ({ ...f, end_address: result.address || result.name, end_lat: result.lat, end_lng: result.lng }));
    }
    setAddrSearch(null);
  };

  const handleSubmit = async () => {
    if (!form.start_address) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, customer_id: form.customer_id || null, partner_id: form.partner_id || null, estimated_fare: form.estimated_fare ? parseInt(form.estimated_fare) : null, start_lat: form.start_lat, start_lng: form.start_lng, end_lat: form.end_lat, end_lng: form.end_lng };
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
      {addrSearch && <AddressSearchModal title={addrSearch === 'start' ? '출발지 검색' : '도착지 검색'} onSelect={handleAddrSelect} onClose={() => setAddrSearch(null)} />}
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>📞 새 콜 생성</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* 출발지 / 도착지 */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📍 위치 정보</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
            <div><label style={ls}>출발지 *</label><input value={form.start_address} onChange={set('start_address')} placeholder="출발 주소" style={is} /></div>
            <div style={{ alignSelf: 'end' }}><button onClick={() => setAddrSearch('start')} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔍</button></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={ls}>출발 상세</label><input value={form.start_detail} onChange={set('start_detail')} placeholder="동/호수 등" style={is} /></div>
          <KakaoMiniMap startLat={form.start_lat} startLng={form.start_lng} height={160} />
          <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
            <div><label style={ls}>도착지 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(미정 가능)</span></label><input value={form.end_address} onChange={set('end_address')} placeholder="도착 주소 (비워두면 미정)" style={is} /></div>
            <div style={{ alignSelf: 'end' }}><button onClick={() => setAddrSearch('end')} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔍</button></div>
          </div>
          <div><label style={ls}>도착 상세</label><input value={form.end_detail} onChange={set('end_detail')} placeholder="동/호수 등" style={is} /></div>
          <KakaoMiniMap startLat={form.end_lat} startLng={form.end_lng} height={160} />
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
