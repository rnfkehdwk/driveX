import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRide, fetchRiders, fetchCustomers, fetchPartners } from '../api/client';

// 요금 콤마 포맷팅 (입력: "15000" → 표시: "15,000", 저장: 15000)
function formatFare(val) {
  const num = val.replace(/[^0-9]/g, '');
  return num ? Number(num).toLocaleString() : '';
}
function parseFare(formatted) {
  return formatted.replace(/,/g, '');
}

// 간이 지도 (OpenStreetMap iframe)
function MiniMap({ lat, lng, label }) {
  if (!lat || !lng) return null;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 8, marginBottom: 14 }}>
      <iframe
        title={label}
        width="100%" height="160" style={{ border: 'none', display: 'block' }}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.003},${lng+0.005},${lat+0.003}&layer=mapnik&marker=${lat},${lng}`}
      />
      <div style={{ padding: '6px 10px', background: '#f8f9fb', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
        {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
      </div>
    </div>
  );
}

// Nominatim reverse geocode
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko&addressdetails=1`);
    const d = await r.json();
    const a = d.address || {};
    const parts = [a.province || a.state, a.city || a.county, a.borough || a.suburb || a.town, a.quarter || a.neighbourhood, a.road, a.house_number].filter(Boolean);
    return parts.join(' ') || d.display_name || '';
  } catch { return ''; }
}

function Field({ label, value, onChange, placeholder, type = 'text', icon, suffix, disabled, inputMode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', background: disabled ? '#f1f5f9' : '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px' }}>
        {icon && <span style={{ marginRight: 8, fontSize: 16, opacity: 0.5 }}>{icon}</span>}
        <input type={type} inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontSize: 15, color: disabled ? '#9ca3af' : '#1f2937', outline: 'none' }} />
        {suffix && <span style={{ marginLeft: 6, fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function RideNew({ user }) {
  const nav = useNavigate();
  const [riders, setRiders] = useState([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [partnerList, setPartnerList] = useState([]);
  const [depLoading, setDepLoading] = useState(false);
  const [arrLoading, setArrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupSearch, setPickupSearch] = useState('');

  const [form, setForm] = useState({
    started_at: '', ended_at: '',
    start_address: '', start_detail: '', start_lat: null, start_lng: null,
    end_address: '', end_detail: '', end_lat: null, end_lng: null,
    pickup_rider_id: null, pickup_rider_name: '',
    customer_id: null, customer_name: '', customer_phone: '',
    partner_id: null, partner_name: '',
    total_fare: '', payment_method: 'CASH', rider_memo: '',
  });

  const up = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetchRiders().then(r => setRiders(r.data || [])).catch(() => {});
    fetchPartners().then(r => setPartnerList(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (customerModal) {
      fetchCustomers({ q: customerSearch || undefined }).then(r => setCustomerList(r.data || [])).catch(() => {});
    }
  }, [customerModal, customerSearch]);

  const handleGPS = async (type) => {
    if (!navigator.geolocation) { alert('GPS를 지원하지 않는 기기입니다.'); return; }
    type === 'dep' ? setDepLoading(true) : setArrLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const addr = await reverseGeocode(latitude, longitude);
        if (type === 'dep') {
          setForm(f => ({ ...f, start_lat: latitude, start_lng: longitude, start_address: addr, started_at: now }));
          setDepLoading(false);
        } else {
          setForm(f => ({ ...f, end_lat: latitude, end_lng: longitude, end_address: addr, ended_at: now }));
          setArrLoading(false);
        }
      },
      () => { alert('위치를 가져올 수 없습니다.'); type === 'dep' ? setDepLoading(false) : setArrLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!form.started_at) { alert('출발 버튼을 먼저 눌러주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        total_fare: form.total_fare ? parseInt(form.total_fare) : null,
        cash_amount: form.payment_method === 'CASH' && form.total_fare ? parseInt(form.total_fare) : null,
      };
      await createRide(body);
      alert('운행일지가 저장되었습니다.');
      nav('/');
    } catch (err) {
      alert(err.response?.data?.error || '저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const filteredRiders = riders.filter(r => r.name.includes(pickupSearch));
  const payments = [
    { value: 'CASH', label: '현금', icon: '💵' },
    { value: 'CARD', label: '카드', icon: '💳' },
    { value: 'TRANSFER', label: '계좌이체', icon: '🏦' },
    { value: 'KAKAO_PAY', label: '카카오페이', icon: '📱' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fc', paddingBottom: 100 }}>
      {/* Header with GPS buttons */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(247,248,252,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div onClick={() => nav('/')} style={{ fontSize: 18, cursor: 'pointer' }}>← <span style={{ fontWeight: 800 }}>운행기록 작성</span></div>
        </div>
        <div style={{ padding: '6px 20px 12px', display: 'flex', gap: 10 }}>
          <button onClick={() => handleGPS('dep')} disabled={depLoading} style={{
            flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            background: form.start_lat ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            color: form.start_lat ? 'white' : '#1d4ed8',
          }}>{depLoading ? '위치 확인 중...' : form.start_lat ? '✓ 출발' : '출발'}</button>
          <button onClick={() => handleGPS('arr')} disabled={arrLoading} style={{
            flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            background: form.end_lat ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #fee2e2, #fecaca)',
            color: form.end_lat ? 'white' : '#b91c1c',
          }}>{arrLoading ? '위치 확인 중...' : form.end_lat ? '✓ 도착' : '도착'}</button>
        </div>
      </div>

      <div style={{ padding: '14px 20px' }}>
        <div style={{ background: 'white', borderRadius: 22, padding: 22, boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>

          {/* 기본정보 */}
          <Field label="운행기사" value={user?.name || ''} onChange={() => {}} icon="👤" disabled />

          {/* 픽업기사 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>픽업기사</label>
            {form.pickup_rider_name ? (
              <div style={{ display: 'flex', alignItems: 'center', background: '#f0fdf4', borderRadius: 12, border: '1.5px solid #86efac', padding: '0 14px' }}>
                <span style={{ flex: 1, padding: '13px 0', fontSize: 15, fontWeight: 600, color: '#166534' }}>🙋 {form.pickup_rider_name}</span>
                <span onClick={() => setForm(f => ({ ...f, pickup_rider_id: null, pickup_rider_name: '' }))} style={{ cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</span>
              </div>
            ) : (
              <div onClick={() => setPickupOpen(true)} style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '13px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: 15, color: '#9ca3af' }}>픽업기사 선택</span>
                <span style={{ color: '#9ca3af' }}>▼</span>
              </div>
            )}
            {pickupOpen && (
              <div style={{ position: 'absolute', left: 20, right: 20, zIndex: 20, background: 'white', borderRadius: 14, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                  <input autoFocus value={pickupSearch} onChange={e => setPickupSearch(e.target.value)} placeholder="기사명 검색..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none' }} />
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {filteredRiders.map(d => (
                    <div key={d.user_id} onClick={() => { setForm(f => ({ ...f, pickup_rider_id: d.user_id, pickup_rider_name: d.name })); setPickupOpen(false); setPickupSearch(''); }}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8f9fb', fontSize: 14 }}>
                      {d.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.vehicle_number}</span>
                    </div>
                  ))}
                  {filteredRiders.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>검색 결과 없음</div>}
                </div>
                <div onClick={() => { setPickupOpen(false); setPickupSearch(''); }} style={{ padding: 10, textAlign: 'center', fontSize: 13, color: '#9ca3af', cursor: 'pointer', borderTop: '1px solid #f1f5f9' }}>닫기</div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />

          {/* 출발지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔵</div>
            <div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>출발지 정보</div></div>
          </div>
          {form.start_lat ? (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 13, color: '#1e40af' }}>
              📡 GPS 위치가 자동 입력되었습니다 ({form.started_at?.slice(11, 16)})
            </div>
          ) : (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#f8f9fb', border: '1px dashed #d1d5db', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              상단의 <strong style={{ color: '#2563eb' }}>출발</strong> 버튼을 눌러주세요
            </div>
          )}
          <Field label="출발지 주소" value={form.start_address} onChange={up('start_address')} placeholder="GPS 자동 입력" icon="📍" />
          <Field label="상세주소 (상호명, 건물명)" value={form.start_detail} onChange={up('start_detail')} placeholder="예) OO아파트, △△빌딩" icon="🏢" />
          <MiniMap lat={form.start_lat} lng={form.start_lng} label="출발지" />

          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />

          {/* 도착지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔴</div>
            <div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>도착지 정보</div></div>
          </div>
          {form.end_lat ? (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>
              📡 GPS 위치가 자동 입력되었습니다 ({form.ended_at?.slice(11, 16)})
            </div>
          ) : (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: '#f8f9fb', border: '1px dashed #d1d5db', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
              상단의 <strong style={{ color: '#dc2626' }}>도착</strong> 버튼을 눌러주세요
            </div>
          )}
          <Field label="도착지 주소" value={form.end_address} onChange={up('end_address')} placeholder="GPS 자동 입력" icon="📍" />
          <Field label="상세주소 (상호명, 건물명)" value={form.end_detail} onChange={up('end_detail')} placeholder="예) OO호텔, △△역 2번출구" icon="🏢" />
          <MiniMap lat={form.end_lat} lng={form.end_lng} label="도착지" />

          <div style={{ height: 1, background: '#e5e7eb', margin: '20px 0' }} />

          {/* 요금정보 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</div>
            <div><div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>요금 정보</div></div>
          </div>

          {/* 고객 선택 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>고객명</label>
            {form.customer_name ? (
              <div style={{ display: 'flex', alignItems: 'center', background: '#fffbeb', borderRadius: 12, border: '1.5px solid #fde68a', padding: '0 14px' }}>
                <span style={{ flex: 1, padding: '13px 0', fontSize: 15, fontWeight: 600, color: '#92400e' }}>👤 {form.customer_name} {form.customer_phone && <span style={{ fontSize: 12, color: '#b45309' }}>{form.customer_phone}</span>}</span>
                <span onClick={() => setForm(f => ({ ...f, customer_id: null, customer_name: '', customer_phone: '' }))} style={{ cursor: 'pointer', fontSize: 18, color: '#9ca3af' }}>✕</span>
              </div>
            ) : (
              <div onClick={() => setCustomerModal(true)} style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '13px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: 15, color: '#9ca3af' }}>고객을 선택하세요</span>
                <span style={{ fontSize: 14, color: '#9ca3af' }}>검색</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>운행 요금</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '0 14px' }}>
              <span style={{ marginRight: 8, fontSize: 16, opacity: 0.5 }}>💵</span>
              <input inputMode="numeric" value={formatFare(form.total_fare)} onChange={e => up('total_fare')(parseFare(e.target.value))} placeholder="15,000"
                style={{ flex: 1, padding: '13px 0', border: 'none', background: 'transparent', fontSize: 18, fontWeight: 700, color: '#1f2937', outline: 'none', letterSpacing: 0.5 }} />
              <span style={{ marginLeft: 6, fontSize: 14, color: '#9ca3af', fontWeight: 600 }}>원</span>
            </div>
          </div>

          {/* 결제 방법 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>결제 방법</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {payments.map(p => (
                <button key={p.value} onClick={() => up('payment_method')(p.value)} style={{
                  padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  border: form.payment_method === p.value ? '2px solid #1a1a2e' : '1.5px solid #e5e7eb',
                  background: form.payment_method === p.value ? 'linear-gradient(135deg, #1a1a2e, #16213e)' : '#f8f9fb',
                  color: form.payment_method === p.value ? 'white' : '#6b7280',
                }}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>

          <Field label="메모 (선택)" value={form.rider_memo} onChange={up('rider_memo')} placeholder="특이사항" icon="📝" />
        </div>
      </div>

      {/* Save Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(0deg, rgba(247,248,252,1) 50%, transparent)', zIndex: 10 }}>
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: 16, fontWeight: 800, color: 'white', cursor: 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>{saving ? '저장 중...' : '저장하기 ✓'}</button>
      </div>

      {/* Customer Modal */}
      {customerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setCustomerModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '75vh', background: 'white', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>고객 선택</div>
                <span onClick={() => setCustomerModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span>
              </div>
              <input autoFocus value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="이름, 코드, 전화번호 검색..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none', marginBottom: 10 }} />
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>검색 결과 {customerList.length}명</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {customerList.map(c => (
                <div key={c.customer_id} onClick={() => { setForm(f => ({ ...f, customer_id: c.customer_id, customer_name: c.name, customer_phone: c.phone || '' })); setCustomerModal(false); setCustomerSearch(''); }}
                  style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 6, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onTouchStart={e => e.currentTarget.style.background = '#fefce8'} onTouchEnd={e => e.currentTarget.style.background = 'white'}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#92400e', flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.customer_code} {c.phone && `· ${c.phone}`}</div>
                  </div>
                </div>
              ))}
              {customerList.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>검색 결과가 없습니다</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
