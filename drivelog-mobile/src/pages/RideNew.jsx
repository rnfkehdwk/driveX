import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createRide, fetchRiders, fetchCustomers, fetchPartners, fetchPaymentTypes, completeCall } from '../api/client';
import AddressSearchModal from '../components/AddressSearchModal';
import KakaoMiniMap from '../components/KakaoMiniMap';

const KAKAO_REST_KEY = '5bfc2766bfe2836aab70ff613c8c05be';
const DRAFT_KEY = 'rideDraft';

function formatFare(val) {
  const num = val.replace(/[^0-9]/g, '');
  return num ? Number(num).toLocaleString() : '';
}
function parseFare(formatted) { return formatted.replace(/,/g, ''); }

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    });
    const data = await res.json();
    const doc = data.documents?.[0];
    return doc?.road_address?.address_name || doc?.address?.address_name || '';
  } catch {
    // 카카오 실패 시 Nominatim 폴백
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko&addressdetails=1`);
      const d = await r.json(); const a = d.address || {};
      return [a.province || a.state, a.city || a.county, a.borough || a.suburb || a.town, a.road, a.house_number].filter(Boolean).join(' ') || '';
    } catch { return ''; }
  }
}

function Field({ label, value, onChange, placeholder, type = 'text', icon, suffix, disabled, inputMode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', background: disabled ? '#f1f5f9' : '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px', minWidth: 0 }}>
        {icon && <span style={{ marginRight: 8, fontSize: 16, opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
        <input type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ flex: 1, minWidth: 0, padding: '13px 0', border: 'none', background: 'transparent', fontSize: 15, color: disabled ? '#9ca3af' : '#1f2937', outline: 'none' }} />
        {suffix && <span style={{ marginLeft: 6, fontSize: 13, color: '#9ca3af', fontWeight: 500, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// 주소 입력 필드 + 검색 버튼
function AddressField({ label, value, onChange, onSearch, placeholder, icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px', minWidth: 0 }}>
          {icon && <span style={{ marginRight: 8, fontSize: 16, opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, padding: '13px 0', border: 'none', background: 'transparent', fontSize: 15, color: '#1f2937', outline: 'none' }} />
        </div>
        <button onClick={onSearch} style={{
          padding: '0 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', background: '#eff6ff',
          color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
        }}>🔍</button>
      </div>
    </div>
  );
}

// 한국 로컬 시간 포맷 (yyyy-MM-dd HH:mm:ss)
function getLocalNow() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function loadDraft() { try { const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return null; const draft = JSON.parse(raw); if (draft._savedAt && Date.now() - draft._savedAt > 24*60*60*1000) { localStorage.removeItem(DRAFT_KEY); return null; } return draft; } catch { return null; } }
function saveDraft(form) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, _savedAt: Date.now() })); } catch {} }
function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

const defaultForm = {
  started_at: '', ended_at: '',
  start_address: '', start_detail: '', start_lat: null, start_lng: null,
  end_address: '', end_detail: '', end_lat: null, end_lng: null,
  pickup_rider_id: null, pickup_rider_name: '',
  customer_id: null, customer_name: '', customer_phone: '',
  partner_id: null, partner_name: '',
  user_type: '',
  total_fare: '', payment_method: 'CASH', payment_type_id: null, rider_memo: '',
  _call_id: null,
};

export default function RideNew({ user }) {
  const nav = useNavigate();
  const location = useLocation();
  const fromCall = location.state?.fromCall || null;

  const [riders, setRiders] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [userTab, setUserTab] = useState('customer');
  const [userSearch, setUserSearch] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [partnerList, setPartnerList] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [depLoading, setDepLoading] = useState(false);
  const [arrLoading, setArrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupSearch, setPickupSearch] = useState('');
  const [manualCustomer, setManualCustomer] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', phone: '' });
  const [restored, setRestored] = useState(false);
  const [addrSearch, setAddrSearch] = useState(null); // 'start' | 'end' | null

  const [form, setForm] = useState(() => {
    if (fromCall) {
      return { ...defaultForm, start_address: fromCall.start_address || '', start_detail: fromCall.start_detail || '', end_address: fromCall.end_address || '', end_detail: fromCall.end_detail || '', customer_id: fromCall.customer_id || null, customer_name: fromCall.customer_name || '', customer_phone: fromCall.customer_phone || '', partner_id: fromCall.partner_id || null, partner_name: fromCall.partner_name || '', user_type: fromCall.partner_id ? 'partner' : fromCall.customer_id ? 'customer' : '', total_fare: fromCall.estimated_fare ? String(fromCall.estimated_fare) : '', payment_method: fromCall.payment_method || 'CASH', rider_memo: fromCall.memo ? `[콜 #${fromCall.call_id}] ${fromCall.memo}` : `[콜 #${fromCall.call_id}]`, _call_id: fromCall.call_id };
    }
    const draft = loadDraft();
    if (draft && draft.started_at) { const { _savedAt, ...rest } = draft; return { ...defaultForm, ...rest }; }
    return { ...defaultForm };
  });

  const didMount = useRef(false);
  useEffect(() => { if (!didMount.current) { didMount.current = true; if (!fromCall) { const draft = loadDraft(); if (draft && draft.started_at) setRestored(true); } } }, []);
  useEffect(() => { if (form.started_at && !fromCall) saveDraft(form); }, [form]);
  const up = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetchRiders().then(r => setRiders(r.data || [])).catch(() => {});
    fetchPartners({ active_only: 'true' }).then(r => setPartnerList(r.data || [])).catch(() => {});
    fetchPaymentTypes({ active_only: 'true' }).then(r => {
      const list = r.data || [];
      setPaymentTypes(list);
      // 결제구분 로드 후 현재 form.payment_method에 맞는 payment_type_id 자동 설정
      setForm(f => {
        if (f.payment_type_id) return f; // 이미 설정되어 있으면 유지
        const matched = list.find(pt => pt.code === f.payment_method);
        return matched ? { ...f, payment_type_id: matched.payment_type_id } : f;
      });
    }).catch(() => {});
  }, []);
  useEffect(() => { if (userModal && userTab === 'customer') { fetchCustomers({ q: userSearch || undefined }).then(r => setCustomerList(r.data || [])).catch(() => {}); } }, [userModal, userSearch, userTab]);

  const filteredPartners = partnerList.filter(p => !userSearch || p.name.includes(userSearch));

  const handleGPS = async (type) => {
    if (!navigator.geolocation) { alert('GPS를 지원하지 않는 기기입니다.'); return; }
    type === 'dep' ? setDepLoading(true) : setArrLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const now = getLocalNow();
        const addr = await reverseGeocode(latitude, longitude);
        if (type === 'dep') { setForm(f => ({ ...f, start_lat: latitude, start_lng: longitude, start_address: addr, started_at: now })); setDepLoading(false); }
        else { setForm(f => ({ ...f, end_lat: latitude, end_lng: longitude, end_address: addr, ended_at: now })); setArrLoading(false); }
      },
      () => { alert('위치를 가져올 수 없습니다.'); type === 'dep' ? setDepLoading(false) : setArrLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 주소 검색 결과 적용
  const handleAddrSelect = (result) => {
    if (addrSearch === 'start') {
      const now = form.started_at || getLocalNow();
      setForm(f => ({ ...f, start_address: result.address || result.name, start_lat: result.lat, start_lng: result.lng, started_at: now }));
    } else {
      const now = form.ended_at || getLocalNow();
      setForm(f => ({ ...f, end_address: result.address || result.name, end_lat: result.lat, end_lng: result.lng, ended_at: now }));
    }
    setAddrSearch(null);
  };

  const handleSave = async () => {
    if (!form.started_at) { alert('출발 버튼을 먼저 눌러주세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, total_fare: form.total_fare ? parseInt(form.total_fare) : null, cash_amount: form.payment_method === 'CASH' && form.total_fare ? parseInt(form.total_fare) : null };
      delete body._call_id;
      const result = await createRide(body);
      if (form._call_id && result.ride_id) { try { await completeCall(form._call_id, { ride_id: result.ride_id }); } catch (e) { console.error('콜 완료 처리 실패:', e); } }
      clearDraft(); alert('운행일지가 저장되었습니다.'); nav('/');
    } catch (err) { alert(err.response?.data?.error || '저장에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const handleBack = () => { if (form.started_at && !fromCall) { if (confirm('임시저장 후 나가시겠습니까?')) { saveDraft(form); nav('/'); } } else { nav(fromCall ? '/calls' : '/'); } };
  const handleClearDraft = () => { if (confirm('임시저장된 데이터를 삭제하고 새로 작성하시겠습니까?')) { clearDraft(); setForm({ ...defaultForm }); setRestored(false); } };
  const clearUser = () => setForm(f => ({ ...f, customer_id: null, customer_name: '', customer_phone: '', partner_id: null, partner_name: '', user_type: '' }));
  const filteredRiders = riders.filter(r => r.name.includes(pickupSearch));
  const paymentButtons = paymentTypes.length > 0 ? paymentTypes.map(pt => ({ value: pt.code, label: pt.label })) : [{ value: 'CASH', label: '현금' }, { value: 'RIDER_ACCOUNT', label: '기사 계좌' }, { value: 'COMPANY_ACCOUNT', label: '회사 계좌' }, { value: 'NARASI', label: '나라시' }, { value: 'UNPAID', label: '미수' }];
  const selectedUserLabel = form.user_type === 'partner' ? `🏢 ${form.partner_name}` : form.customer_name ? `👤 ${form.customer_name}${form.customer_phone ? ` ${form.customer_phone}` : ''}` : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc', paddingBottom: 100, overflowX: 'hidden' }}>
      {/* 주소 검색 모달 */}
      {addrSearch && (
        <AddressSearchModal
          title={addrSearch === 'start' ? '출발지 검색' : '도착지 검색'}
          onSelect={handleAddrSelect}
          onClose={() => setAddrSearch(null)}
          currentLat={form.start_lat}
          currentLng={form.start_lng}
        />
      )}

      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(247,248,252,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={handleBack} style={{ fontSize: 18, cursor: 'pointer' }}>← <span style={{ fontWeight: 800 }}>운행기록 작성</span></div>
        </div>
        <div style={{ padding: '6px 20px 12px', display: 'flex', gap: 10 }}>
          <button onClick={() => handleGPS('dep')} disabled={depLoading} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', background: form.start_lat ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: form.start_lat ? 'white' : '#1d4ed8' }}>{depLoading ? '위치 확인 중...' : form.start_lat ? '✓ 출발' : '📍 출발'}</button>
          <button onClick={() => handleGPS('arr')} disabled={arrLoading} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', background: form.end_lat ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #fee2e2, #fecaca)', color: form.end_lat ? 'white' : '#b91c1c' }}>{arrLoading ? '위치 확인 중...' : form.end_lat ? '✓ 도착' : '📍 도착'}</button>
        </div>
      </div>

      <div style={{ padding: '14px 20px' }}>
        {fromCall && (
          <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: '#eff6ff', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📞</span>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>콜 #{fromCall.call_id}에서 진입</div><div style={{ fontSize: 11, color: '#3b82f6' }}>출발지/도착지/고객/요금이 자동 입력되었습니다</div></div>
          </div>
        )}
        {restored && !fromCall && (
          <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: '#fffbeb', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: '#92400e' }}>📋 이전 작성 데이터가 복원되었습니다<div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>출발: {form.started_at?.slice(0, 16)}</div></div>
            <button onClick={handleClearDraft} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>새로 작성</button>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 22, padding: 22, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Field label="운행기사" value={user?.name || ''} onChange={() => {}} icon="👤" disabled />

          {/* 픽업기사 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>픽업기사</label>
            {form.pickup_rider_name ? (<div style={{ display: 'flex', alignItems: 'center', background: '#f0fdf4', borderRadius: 12, border: '1.5px solid #86efac', padding: '0 14px' }}><span style={{ flex: 1, padding: '13px 0', fontSize: 15, fontWeight: 600, color: '#166534' }}>🙋 {form.pickup_rider_name}</span><span onClick={() => setForm(f => ({ ...f, pickup_rider_id: null, pickup_rider_name: '' }))} style={{ cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</span></div>)
            : (<div onClick={() => setPickupOpen(true)} style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '13px 14px', cursor: 'pointer' }}><span style={{ flex: 1, fontSize: 15, color: '#9ca3af' }}>픽업기사 선택</span><span style={{ color: '#9ca3af' }}>▼</span></div>)}
            {pickupOpen && (<div style={{ position: 'absolute', left: 0, right: 0, zIndex: 20, background: 'white', borderRadius: 14, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', overflow: 'hidden' }}><div style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}><input autoFocus value={pickupSearch} onChange={e => setPickupSearch(e.target.value)} placeholder="기사명 검색..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} /></div><div style={{ maxHeight: 200, overflowY: 'auto' }}>{filteredRiders.map(d => (<div key={d.user_id} onClick={() => { setForm(f => ({ ...f, pickup_rider_id: d.user_id, pickup_rider_name: d.name })); setPickupOpen(false); setPickupSearch(''); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8f9fb', fontSize: 14 }}>{d.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.vehicle_number}</span></div>))}{filteredRiders.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>검색 결과 없음</div>}</div><div onClick={() => { setPickupOpen(false); setPickupSearch(''); }} style={{ padding: 10, textAlign: 'center', fontSize: 13, color: '#9ca3af', cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}>닫기</div></div>)}
          </div>

          {/* ── 출발지 ── */}
          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔵</div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>출발지 정보</div></div>
          {form.start_lat ? <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>📡 위치가 입력되었습니다 ({form.started_at?.slice(11, 16)})</div>
          : <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#f8f9fb', border: '1px dashed #d1d5db', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}><strong style={{ color: '#2563eb' }}>출발</strong> 버튼 또는 🔍 검색으로 입력</div>}
          <AddressField label="출발지 주소" value={form.start_address} onChange={up('start_address')} onSearch={() => setAddrSearch('start')} placeholder="GPS 자동 입력 또는 검색" icon="📍" />
          <Field label="상세주소 (상호명, 건물명)" value={form.start_detail} onChange={up('start_detail')} placeholder="예) OO아파트" icon="🏢" />
          {/* 출발지 개별 지도 */}
          <KakaoMiniMap startLat={form.start_lat} startLng={form.start_lng} height={180} />

          {/* ── 도착지 ── */}
          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔴</div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>도착지 정보</div></div>
          {form.end_lat ? <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>📡 위치가 입력되었습니다 ({form.ended_at?.slice(11, 16)})</div>
          : <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#f8f9fb', border: '1px dashed #d1d5db', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}><strong style={{ color: '#dc2626' }}>도착</strong> 버튼 또는 🔍 검색으로 입력</div>}
          <AddressField label="도착지 주소" value={form.end_address} onChange={up('end_address')} onSearch={() => setAddrSearch('end')} placeholder="GPS 자동 입력 또는 검색" icon="📍" />
          <Field label="상세주소 (상호명, 건물명)" value={form.end_detail} onChange={up('end_detail')} placeholder="예) OO호텔" icon="🏢" />
          {/* 도착지 개별 지도 */}
          <KakaoMiniMap startLat={form.end_lat} startLng={form.end_lng} height={180} />

          {/* ── 요금 ── */}
          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💰</div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>요금 정보</div></div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>이용객</label>
            {selectedUserLabel ? (<div style={{ display: 'flex', alignItems: 'center', background: form.user_type === 'partner' ? '#f5f3ff' : '#fffbeb', borderRadius: 12, border: `1.5px solid ${form.user_type === 'partner' ? '#c4b5fd' : '#fde68a'}`, padding: '0 14px' }}><span style={{ flex: 1, padding: '13px 0', fontSize: 15, fontWeight: 600, color: form.user_type === 'partner' ? '#6d28d9' : '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUserLabel}</span>{form.user_type === 'customer' && form.customer_phone && (<a href={`tel:${form.customer_phone.replace(/[^0-9+]/g, '')}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: '#16a34a', color: 'white', textDecoration: 'none', fontSize: 16, marginRight: 8, flexShrink: 0 }} title={`${form.customer_phone}으로 전화`}>📞</a>)}<span onClick={clearUser} style={{ cursor: 'pointer', fontSize: 18, color: '#9ca3af', flexShrink: 0, marginLeft: 8 }}>✕</span></div>)
            : (<div onClick={() => { setUserModal(true); setUserTab('customer'); setUserSearch(''); }} style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '13px 14px', cursor: 'pointer' }}><span style={{ flex: 1, fontSize: 15, color: '#9ca3af' }}>이용객을 선택하세요</span><span style={{ fontSize: 14, color: '#9ca3af', flexShrink: 0 }}>검색</span></div>)}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>운행 요금</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px' }}>
              <span style={{ marginRight: 8, fontSize: 16, opacity: 0.5, flexShrink: 0 }}>💵</span>
              <input inputMode="numeric" value={formatFare(form.total_fare)} onChange={e => up('total_fare')(parseFare(e.target.value))} placeholder="15,000" style={{ flex: 1, minWidth: 0, padding: '13px 0', border: 'none', background: 'transparent', fontSize: 18, fontWeight: 700, color: '#1f2937', outline: 'none', letterSpacing: 0.5 }} />
              <span style={{ marginLeft: 6, fontSize: 14, color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>원</span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>결제 방법</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {paymentButtons.map(p => (<button key={p.value} onClick={() => {
                const matched = paymentTypes.find(pt => pt.code === p.value);
                setForm(f => ({ ...f, payment_method: p.value, payment_type_id: matched?.payment_type_id || null }));
              }} style={{ padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: form.payment_method === p.value ? '2px solid #1a1a2e' : '1.5px solid #e5e7eb', background: form.payment_method === p.value ? 'linear-gradient(135deg, #1a1a2e, #16213e)' : '#f8f9fb', color: form.payment_method === p.value ? 'white' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</button>))}
            </div>
          </div>

          <Field label="메모 (선택)" value={form.rider_memo} onChange={up('rider_memo')} placeholder="특이사항" icon="📝" />
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, padding: '14px 20px 28px', background: 'linear-gradient(0deg, rgba(247,248,252,1) 50%, transparent)', zIndex: 10, boxSizing: 'border-box' }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px 0', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 16, fontWeight: 800, color: 'white', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? '저장 중...' : '저장하기 ✓'}</button>
      </div>

      {/* 이용객 모달 */}
      {userModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setUserModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '80vh', background: 'white', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><div style={{ fontSize: 18, fontWeight: 800 }}>이용객 선택</div><span onClick={() => { setUserModal(false); setManualCustomer(false); }} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span></div>
              {!manualCustomer && (<div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}><button onClick={() => { setUserTab('customer'); setUserSearch(''); }} style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: userTab === 'customer' ? '#2563eb' : 'white', color: userTab === 'customer' ? 'white' : '#64748b' }}>👤 고객</button><button onClick={() => { setUserTab('partner'); setUserSearch(''); }} style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: userTab === 'partner' ? '#7c3aed' : 'white', color: userTab === 'partner' ? 'white' : '#64748b' }}>🏢 제휴업체</button></div>)}
              {!manualCustomer && (<input autoFocus value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder={userTab === 'customer' ? '이름, 코드, 전화번호 검색...' : '업체명 검색...'} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', marginBottom: 10 }} />)}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {manualCustomer ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>이용객 정보 직접 입력</div>
                  <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>이름 *</label><input value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} placeholder="이름" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }} /></div>
                  <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>연락처</label><input inputMode="tel" value={manualForm.phone} onChange={e => { const n = e.target.value.replace(/[^0-9]/g,'').slice(0,11); setManualForm(f => ({ ...f, phone: n.length<=3?n:n.length<=7?n.slice(0,3)+'-'+n.slice(3):n.slice(0,3)+'-'+n.slice(3,7)+'-'+n.slice(7) })); }} placeholder="010-1234-5678" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none' }} /></div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button onClick={() => setManualCustomer(false)} style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>뒤로</button><button onClick={() => { if (!manualForm.name) { alert('이름을 입력하세요.'); return; } setForm(f => ({ ...f, customer_id: null, customer_name: manualForm.name, customer_phone: manualForm.phone, partner_id: null, partner_name: '', user_type: 'customer' })); setUserModal(false); setManualCustomer(false); setManualForm({ name: '', phone: '' }); setUserSearch(''); }} style={{ flex: 2, padding: '14px 0', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>적용</button></div>
                </div>
              ) : userTab === 'customer' ? (
                <>{customerList.map(c => (<div key={c.customer_id} onClick={() => { setForm(f => ({ ...f, customer_id: c.customer_id, customer_name: c.name, customer_phone: c.phone || '', partner_id: null, partner_name: '', user_type: 'customer' })); setUserModal(false); setUserSearch(''); }} style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 6, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#92400e', flexShrink: 0 }}>{c.name.charAt(0)}</div><div><div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{c.customer_code} {c.phone && `· ${c.phone}`}</div></div></div>))}{customerList.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ color: '#9ca3af', marginBottom: 14 }}>{userSearch ? `"${userSearch}" 검색 결과 없음` : '등록된 고객 없음'}</div><button onClick={() => { setManualCustomer(true); setManualForm({ name: userSearch, phone: '' }); }} style={{ padding: '14px 28px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>직접 입력하기</button></div>}</>
              ) : (
                <>{filteredPartners.map(p => (<div key={p.partner_id} onClick={() => { setForm(f => ({ ...f, partner_id: p.partner_id, partner_name: p.name, customer_id: null, customer_name: '', customer_phone: '', user_type: 'partner' })); setUserModal(false); setUserSearch(''); }} style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 6, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#7c3aed', flexShrink: 0 }}>🏢</div><div><div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{p.partner_code}</div></div></div>))}{filteredPartners.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>제휴업체 없음</div>}</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
