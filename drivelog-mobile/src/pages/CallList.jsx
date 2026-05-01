import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalls, acceptCall, cancelCall, createCall, fetchCustomers, fetchPartners, fetchPaymentTypes, fetchFrequentAddresses, fetchRiders, createCustomer } from '../api/client';
import AddressSearchModal from '../components/AddressSearchModal';
import KakaoMiniMap from '../components/KakaoMiniMap';

// ID type-safe 비교 — number string 섞여 있어도 안전하게 비교 (2026-05-01 추가)
//   원인: SA 본인 지명 콜 생성 시 콜 #36~#39 ASSIGNED 상태로 멈춤
//   버그 재현: assigned_rider_id와 user.user_id가 number/string 타입 불일치로
//   === 비교가 false 되어 "운행기록 작성" 버튼 미시 → 매출 집계 누락
const sameId = (a, b) => a != null && b != null && Number(a) === Number(b);

const STATUS_MAP = {
  WAITING: { label: '대기 중', color: '#d97706', bg: '#fffbeb' },
  ASSIGNED: { label: '수락됨', color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2' },
};

// 콜 생성 모달 (SUPER_ADMIN 전용) — 카카오 주소 검색 + 지도 추가
function CreateCallModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ start_address: '', start_detail: '', end_address: '', end_detail: '', customer_id: '', partner_id: '', estimated_fare: '', payment_method: 'CASH', memo: '', assigned_rider_id: '' });
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [payTypes, setPayTypes] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const [showPartList, setShowPartList] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [addrSearch, setAddrSearch] = useState(null); // 'start' | 'end' | null
  const [startCoord, setStartCoord] = useState({ lat: null, lng: null });
  const [endCoord, setEndCoord] = useState({ lat: null, lng: null });
  // 자주 가는 곳 (즐겨찾기 대체)
  const [frequentStart, setFrequentStart] = useState([]);
  const [frequentEnd, setFrequentEnd] = useState([]);
  const [showFreqStart, setShowFreqStart] = useState(false);
  const [showFreqEnd, setShowFreqEnd] = useState(false);
  // 기사 목록 (수동 지명용)
  const [riders, setRiders] = useState([]);
  // 신규 고객 등록 (검색 결과 없을 때 바로 등록) — 2026-04-25 추가
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustSaving, setNewCustSaving] = useState(false);
  // 신규고객 박스 ref — onBlur에서 relatedTarget 검사용 (2026-04-29 v2 픽스)
  const newCustBoxRef = useRef(null);

  // 결제구분 + 고객/제휴업체 전체 목록을 모달 열 때 한 번만 로드 (focus만 해도 드롭다운 펼침 가능)
  useEffect(() => {
    fetchPaymentTypes().then(r => setPayTypes(r.data || [])).catch(() => {});
    fetchCustomers({ limit: 200 }).then(r => setCustomers(r.data || [])).catch(() => {});
    fetchPartners({ active_only: 'true', limit: 200 }).then(r => setPartners(r.data || [])).catch(() => {});
    // 기사 목록 (수동 지명)
    fetchRiders().then(r => setRiders(r.data || [])).catch(() => {});
  }, []);

  // 고객별 자주 가는 곳 로드 — selectedCust 변경 시 재호출 (top 3)
  // 고객 미선택 시에는 비움 (고객별 특화 기능이므로)
  useEffect(() => {
    if (!selectedCust?.customer_id) {
      setFrequentStart([]);
      setFrequentEnd([]);
      return;
    }
    const cid = selectedCust.customer_id;
    fetchFrequentAddresses({ type: 'start', limit: 3, customer_id: cid })
      .then(r => setFrequentStart(r.data || []))
      .catch(() => setFrequentStart([]));
    fetchFrequentAddresses({ type: 'end', limit: 3, customer_id: cid })
      .then(r => setFrequentEnd(r.data || []))
      .catch(() => setFrequentEnd([]));
  }, [selectedCust?.customer_id]);

  // 클라이언트 측 필터
  const filteredCust = custSearch
    ? customers.filter(c => c.name?.includes(custSearch) || c.phone?.includes(custSearch) || c.customer_code?.includes(custSearch))
    : customers;
  const filteredPart = partSearch
    ? partners.filter(p => p.name?.includes(partSearch))
    : partners;

  const handleAddrSelect = (result) => {
    if (addrSearch === 'start') {
      setForm(f => ({ ...f, start_address: result.address || result.name }));
      setStartCoord({ lat: result.lat, lng: result.lng });
    } else {
      setForm(f => ({ ...f, end_address: result.address || result.name }));
      setEndCoord({ lat: result.lat, lng: result.lng });
    }
    setAddrSearch(null);
  };

  // 신규 고객 등록 — custSearch를 이름으로 사용 (admin과 동일 패턴, 2026-04-25)
  const handleCreateNewCustomer = async () => {
    const name = custSearch.trim();
    if (!name) { alert('고객명을 입력해주세요.'); return; }
    setNewCustSaving(true);
    try {
      const res = await createCustomer({ name, phone: newCustPhone.trim() || null });
      const newCust = {
        customer_id: res.customer_id,
        customer_code: res.customer_code,
        name,
        phone: newCustPhone.trim() || null,
      };
      setCustomers(prev => [newCust, ...prev]);
      setSelectedCust(newCust);
      setCustSearch('');
      setNewCustPhone('');
      setShowCustList(false);
    } catch (err) {
      alert(err.response?.data?.error || '고객 등록 실패');
    } finally {
      setNewCustSaving(false);
    }
  };

  // Contact Picker API 지원 여부 (Android Chrome HTTPS에서만 동작) — 2026-04-25 추가
  const supportsContactPicker = typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  // 연락처에서 선택해서 이름/번호 가져오기
  const handlePickContact = async () => {
    if (!supportsContactPicker) {
      alert('이 기능은 Android Chrome에서만 지원됩니다.');
      return;
    }
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);
      if (!contacts || contacts.length === 0) return; // 사용자 취소
      const contact = contacts[0];
      const pickedName = (contact.name && contact.name[0]) || '';
      let pickedTel = (contact.tel && contact.tel[0]) || '';
      // 국가코드 제거 및 한국 단말 포맷으로 정규화
      if (pickedTel) {
        // +82 10-1234-5678 → 010-1234-5678
        let digits = pickedTel.replace(/[^0-9+]/g, '');
        if (digits.startsWith('+82')) digits = '0' + digits.slice(3);
        digits = digits.replace(/[^0-9]/g, '');
        if (digits.length === 11) {
          pickedTel = `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
        } else if (digits.length === 10) {
          pickedTel = `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
        } else {
          pickedTel = digits;
        }
      }
      // 이름은 custSearch에, 번호는 newCustPhone에 채움
      if (pickedName) setCustSearch(pickedName);
      if (pickedTel) setNewCustPhone(pickedTel);
      setShowCustList(true);
    } catch (err) {
      // 사용자 거부하거나 실패 — 조용히 무시
      console.warn('Contact picker failed:', err);
    }
  };

  const handleSubmit = async () => {
    if (!form.start_address.trim()) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        customer_id: selectedCust?.customer_id || null,
        partner_id: selectedPart?.partner_id || null,
        estimated_fare: form.estimated_fare ? Number(form.estimated_fare) : null,
        assigned_rider_id: form.assigned_rider_id || null,
        // 좌표 전송 — 콜→운행 변환 시 자동 입력에 활용 (2026-04-28)
        start_lat: startCoord.lat || null,
        start_lng: startCoord.lng || null,
        end_lat: endCoord.lat || null,
        end_lng: endCoord.lng || null,
      };
      if (!body.end_address) delete body.end_address;
      const res = await createCall(body);
      alert(res.message || '콜이 생성되었습니다.');
      onCreated();
    } catch (err) { alert(err.response?.data?.error || '콜 생성 실패'); }
    finally { setSaving(false); }
  };

  const is = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <>
      {/* 주소 검색 모달 */}
      {addrSearch && (
        <AddressSearchModal
          title={addrSearch === 'start' ? '출발지 검색' : '도착지 검색'}
          onSelect={handleAddrSelect}
          onClose={() => setAddrSearch(null)}
          currentLat={startCoord.lat}
          currentLng={startCoord.lng}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>📞 새 콜 생성</div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>

          {/* 고객 검색 — 위로 이동 (2026-04-25) */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>👤 고객</label>
            {selectedCust ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{selectedCust.name} {selectedCust.phone ? `(${selectedCust.phone})` : ''}</span>
                <button onClick={() => { setSelectedCust(null); setCustSearch(''); setForm(f => ({ ...f, customer_id: '' })); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            ) : (
              <>
                <input
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustList(true); }}
                  onFocus={() => setShowCustList(true)}
                  onBlur={(e) => {
                    // 신규고객 박스 내부로 focus 이동 시에는 닫지 않음 (2026-04-29 v2 픽스)
                    if (newCustBoxRef.current && newCustBoxRef.current.contains(e.relatedTarget)) {
                      return;
                    }
                    setTimeout(() => setShowCustList(false), 200);
                  }}
                  placeholder="고객명, 코드, 전화번호 검색..."
                  style={is}
                />
                {showCustList && filteredCust.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 220, overflowY: 'auto', zIndex: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {filteredCust.slice(0, 50).map(c => (
                      <div key={c.customer_id} onMouseDown={() => { setSelectedCust(c); setCustSearch(''); setShowCustList(false); }} style={{ padding: '12px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.customer_code || ''}{c.phone ? ` · ${c.phone}` : ''}</div>
                      </div>
                    ))}
                    {filteredCust.length > 50 && <div style={{ padding: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>상위 50명만 표시 — 검색어를 좁혀주세요</div>}
                  </div>
                )}
                {showCustList && custSearch && filteredCust.length === 0 && (
                  <div
                    ref={newCustBoxRef} /* onBlur relatedTarget 검사용 (2026-04-29 v2 픽스) */
                    style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, zIndex: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>검색 결과 없음</div>
                    <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>+ 신규 고객 등록</div>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 2 }}>이름</label>
                      <input
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        onFocus={() => setShowCustList(true)}
                        placeholder="고객명"
                        style={{ ...is, padding: '8px 10px', fontSize: 13 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>전화번호 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(선택)</span></label>
                        {supportsContactPicker && (
                          <button
                            onMouseDown={e => e.preventDefault()}
                            onClick={handlePickContact}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                          >📞 연락처에서 가져오기</button>
                        )}
                      </div>
                      <input
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                        onFocus={() => setShowCustList(true)}
                        placeholder="010-0000-0000"
                        style={{ ...is, padding: '8px 10px', fontSize: 13 }}
                      />
                    </div>
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={handleCreateNewCustomer}
                      disabled={newCustSaving || !custSearch.trim()}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: (newCustSaving || !custSearch.trim()) ? '#cbd5e1' : '#2563eb', color: 'white', fontSize: 13, fontWeight: 700, cursor: (newCustSaving || !custSearch.trim()) ? 'not-allowed' : 'pointer' }}
                    >
                      {newCustSaving ? '등록 중...' : '+ 등록하고 선택'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 제휴업체 검색 — 위로 이동 (2026-04-25) */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>🏢 제휴업체</label>
            {selectedPart ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{selectedPart.name}</span>
                <button onClick={() => { setSelectedPart(null); setPartSearch(''); setForm(f => ({ ...f, partner_id: '' })); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            ) : (
              <>
                <input
                  value={partSearch}
                  onChange={e => { setPartSearch(e.target.value); setShowPartList(true); }}
                  onFocus={() => setShowPartList(true)}
                  onBlur={() => setTimeout(() => setShowPartList(false), 200)}
                  placeholder="업체명 검색..."
                  style={is}
                />
                {showPartList && filteredPart.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 220, overflowY: 'auto', zIndex: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {filteredPart.slice(0, 50).map(p => (
                      <div key={p.partner_id} onMouseDown={() => { setSelectedPart(p); setPartSearch(''); setShowPartList(false); }} style={{ padding: '12px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.phone && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.phone}</div>}
                      </div>
                    ))}
                    {filteredPart.length > 50 && <div style={{ padding: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>상위 50개만 표시 — 검색어를 좁혀주세요</div>}
                  </div>
                )}
                {showPartList && partSearch && filteredPart.length === 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center', zIndex: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    검색 결과 없음
                  </div>
                )}
              </>
            )}
          </div>

          {/* 출발지 — 검색 버튼 + ⭐ 자주 가는 곳 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', display: 'block', marginBottom: 4 }}>📍 출발지 *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.start_address} onChange={e => setForm(f => ({ ...f, start_address: e.target.value }))} placeholder="출발지 주소" style={{ ...is, flex: 1 }} />
              <button onClick={() => setShowFreqStart(!showFreqStart)} title="자주 가는 출발지" style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #fde68a', background: '#fffbeb', color: '#d97706', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>⭐</button>
              <button onClick={() => setAddrSearch('start')} style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
            {showFreqStart && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, minWidth: 260, maxHeight: 280, overflowY: 'auto', zIndex: 30, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>⭐ 자주 가는 출발지 {selectedCust && `· ${selectedCust.name}`}</div>
                {!selectedCust ? (
                  <div style={{ padding: '20px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                    고객을 먼저 선택해주세요.<br />
                    <span style={{ color: '#cbd5e1' }}>고객별로 자주 가는 곳이 표시됩니다.</span>
                  </div>
                ) : frequentStart.length === 0 ? (
                  <div style={{ padding: '20px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                    최근 90일 간 {selectedCust.name}님의 콜 데이터가 없습니다.
                  </div>
                ) : frequentStart.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setForm(prev => ({ ...prev, start_address: f.address, start_detail: f.detail || prev.start_detail }));
                      // 좌표도 같이 복원 (2026-04-28)
                      if (f.lat && f.lng) setStartCoord({ lat: parseFloat(f.lat), lng: parseFloat(f.lng) });
                      setShowFreqStart(false);
                    }}
                    style={{ padding: '10px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.address}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{f.use_count}회 사용</div>
                  </div>
                ))}
              </div>
            )}
            <input value={form.start_detail} onChange={e => setForm(f => ({ ...f, start_detail: e.target.value }))} placeholder="상세 주소 (선택)" style={{ ...is, marginTop: 6, fontSize: 13 }} />
          </div>

          {/* 도착지 — 검색 버튼 + ⭐ 자주 가는 곳 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>📍 도착지</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.end_address} onChange={e => setForm(f => ({ ...f, end_address: e.target.value }))} placeholder="도착지 주소 (미정 가능)" style={{ ...is, flex: 1 }} />
              <button onClick={() => setShowFreqEnd(!showFreqEnd)} title="자주 가는 도착지" style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #fde68a', background: '#fffbeb', color: '#d97706', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>⭐</button>
              <button onClick={() => setAddrSearch('end')} style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
            {showFreqEnd && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, minWidth: 260, maxHeight: 280, overflowY: 'auto', zIndex: 30, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>⭐ 자주 가는 도착지 {selectedCust && `· ${selectedCust.name}`}</div>
                {!selectedCust ? (
                  <div style={{ padding: '20px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                    고객을 먼저 선택해주세요.<br />
                    <span style={{ color: '#cbd5e1' }}>고객별로 자주 가는 곳이 표시됩니다.</span>
                  </div>
                ) : frequentEnd.length === 0 ? (
                  <div style={{ padding: '20px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                    최근 90일 간 {selectedCust.name}님의 콜 데이터가 없습니다.
                  </div>
                ) : frequentEnd.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setForm(prev => ({ ...prev, end_address: f.address, end_detail: f.detail || prev.end_detail }));
                      // 좌표도 같이 복원 (2026-04-28)
                      if (f.lat && f.lng) setEndCoord({ lat: parseFloat(f.lat), lng: parseFloat(f.lng) });
                      setShowFreqEnd(false);
                    }}
                    style={{ padding: '10px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.address}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{f.use_count}회 사용</div>
                  </div>
                ))}
              </div>
            )}
            <input value={form.end_detail} onChange={e => setForm(f => ({ ...f, end_detail: e.target.value }))} placeholder="상세 주소 (선택)" style={{ ...is, marginTop: 6, fontSize: 13 }} />
          </div>

          {/* 카카오 지도 (출발/도착 좌표가 있을 때) */}
          <KakaoMiniMap startLat={startCoord.lat} startLng={startCoord.lng} endLat={endCoord.lat} endLng={endCoord.lng} height={180} />

          {/* 예상 요금 + 결제 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>💰 예상 요금</label>
              <input type="number" value={form.estimated_fare} onChange={e => setForm(f => ({ ...f, estimated_fare: e.target.value }))} placeholder="0" style={is} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>💳 결제</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={{ ...is, background: 'white' }}>
                {payTypes.length > 0 ? payTypes.map(pt => (
                  <option key={pt.code} value={pt.code}>{pt.label}</option>
                )) : <>
                  <option value="CASH">현금</option>
                  <option value="CARD">카드</option>
                  <option value="TRANSFER">계좌이체</option>
                  <option value="KAKAO_PAY">카카오페이</option>
                </>}
              </select>
            </div>
          </div>

          {/* 메모 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>📝 메모</label>
            <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} rows={2} placeholder="특이사항, 고객 요청 등..." style={{ ...is, resize: 'vertical' }} />
          </div>

          {/* 기사 수동 지명 (선택) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>🚗 기사 지명 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(선택)</span></label>
            <select
              value={form.assigned_rider_id}
              onChange={e => setForm(f => ({ ...f, assigned_rider_id: e.target.value }))}
              style={{ ...is, background: form.assigned_rider_id ? '#eff6ff' : 'white', borderColor: form.assigned_rider_id ? '#bfdbfe' : '#e2e8f0', fontWeight: form.assigned_rider_id ? 600 : 400 }}
            >
              <option value="">— 지명 없음 (모든 기사가 경쟁) —</option>
              {riders.map(r => (
                <option key={r.user_id} value={r.user_id}>
                  {r.name}{r.role === 'SUPER_ADMIN' ? ' ☆' : ''}
                </option>
              ))}
            </select>
            {form.assigned_rider_id && (
              <div style={{ fontSize: 11, color: '#2563eb', marginTop: 4, paddingLeft: 4 }}>→ 대기 없이 바로 배정됩니다</div>
            )}
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: saving ? '#94a3b8' : '#d97706', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              {saving ? '생성 중...' : '📞 콜 생성'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CallList({ user }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const nav = useNavigate();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MASTER';

  const load = () => {
    setLoading(true);
    fetchCalls({ limit: 50 }).then(r => setCalls(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { const iv = setInterval(() => { fetchCalls({ limit: 50 }).then(r => setCalls(r.data || [])).catch(() => {}); }, 30000); return () => clearInterval(iv); }, []);

  const handleAccept = async (callId) => {
    if (!confirm('이 콜을 수락하시겠습니까?\n수락하면 운행기록 작성 화면으로 이동합니다.')) return;
    setAccepting(callId);
    try { const res = await acceptCall(callId); nav('/ride/new', { state: { fromCall: res.call } }); }
    catch (err) { alert(err.response?.data?.error || '콜 수락 실패'); load(); }
    finally { setAccepting(null); }
  };

  const handleCancelAccept = async (callId) => {
    if (!confirm('콜 수락을 취소하시겠습니까?')) return;
    try { await cancelCall(callId, {}); load(); } catch (err) { alert(err.response?.data?.error || '취소 실패'); }
  };

  const handleCancelCall = async (callId) => {
    if (!confirm('이 콜을 취소하시겠습니까?')) return;
    try { await cancelCall(callId, { cancel_reason: '관리자 취소' }); load(); } catch (err) { alert(err.response?.data?.error || '취소 실패'); }
  };

  const handleGoRide = (call) => { nav('/ride/new', { state: { fromCall: call } }); };

  const waitingCalls = calls.filter(c => c.status === 'WAITING');
  const myCalls = calls.filter(c => sameId(c.assigned_rider_id, user?.user_id) && ['ASSIGNED', 'IN_PROGRESS'].includes(c.status));
  const allActiveCalls = isSuperAdmin ? calls.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)) : [];

  const ago = (dt) => { if (!dt) return ''; const m = Math.floor((Date.now() - new Date(dt).getTime()) / 60000); if (m < 1) return '방금'; if (m < 60) return `${m}분 전`; return `${Math.floor(m / 60)}시간 전`; };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {showCreate && <CreateCallModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}

      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => nav('/')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ flex: 1, fontSize: 20, fontWeight: 900, color: 'white' }}>📞 콜 현황</div>
          {isSuperAdmin && (
            <button onClick={() => setShowCreate(true)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#d97706', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 콜 생성</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24' }}>{waitingCalls.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>대기 중 콜</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa' }}>{isSuperAdmin ? allActiveCalls.length : myCalls.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{isSuperAdmin ? '진행 중 콜' : '내 진행 콜'}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : (
          <>
            {/* 진행 중 콜 */}
            {(isSuperAdmin ? allActiveCalls : myCalls).length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>{isSuperAdmin ? '🚗 진행 중 콜' : '🧑‍✈️ 내 진행 콜'}</div>
                {(isSuperAdmin ? allActiveCalls : myCalls).map(call => {
                  const st = STATUS_MAP[call.status];
                  const isMyCall = sameId(call.assigned_rider_id, user?.user_id);
                  return (
                    <div key={call.call_id} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '2px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                          {call.rider_name && <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>🧑‍✈️ {call.rider_name}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>#{call.call_id} · {ago(call.assigned_at)}</span>
                      </div>
                      <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: '#2563eb', fontWeight: 600 }}>출발</span> {call.start_address}{call.start_detail ? ` (${call.start_detail})` : ''}</div>
                      <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: '#dc2626', fontWeight: 600 }}>도착</span> {call.end_address || <span style={{ color: '#94a3b8' }}>미정</span>}{call.end_detail ? ` (${call.end_detail})` : ''}</div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 10, flexWrap: 'wrap' }}>
                        {call.customer_name && <span>👤 {call.customer_name}</span>}
                        {call.estimated_fare && <span>💰 {Number(call.estimated_fare).toLocaleString()}원</span>}
                        {call.memo && <span>📝 {call.memo}</span>}
                      </div>
                      {isMyCall && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleGoRide(call)} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🚗 운행기록 작성</button>
                          <button onClick={() => handleCancelAccept(call.call_id)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>수락 취소</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ height: 16 }} />
              </>
            )}

            {/* 대기 중 콜 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>🔔 대기 중 콜 ({waitingCalls.length}건)</div>
            {waitingCalls.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: '40px 20px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📞</div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>현재 대기 중인 콜이 없습니다</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>{isSuperAdmin ? '위 "콜 생성" 버튼으로 새 콜을 만드세요' : '30초마다 자동으로 새 콜을 확인합니다'}</div>
              </div>
            ) : (
              waitingCalls.map(call => (
                <div key={call.call_id} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#fffbeb', color: '#d97706' }}>🔔 대기</span>
                      {call.estimated_fare && <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{Number(call.estimated_fare).toLocaleString()}원</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{ago(call.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: '#2563eb', fontWeight: 600 }}>출발</span> {call.start_address}{call.start_detail ? ` (${call.start_detail})` : ''}</div>
                  <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: '#dc2626', fontWeight: 600 }}>도착</span> {call.end_address || <span style={{ color: '#94a3b8' }}>미정</span>}{call.end_detail ? ` (${call.end_detail})` : ''}</div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 10, flexWrap: 'wrap' }}>
                    {call.customer_name && <span>👤 {call.customer_name}</span>}
                    {call.partner_name && <span>🏢 {call.partner_name}</span>}
                    {call.memo && <span>📝 {call.memo}</span>}
                  </div>
                  {isSuperAdmin ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleAccept(call.call_id)} disabled={accepting === call.call_id} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: accepting === call.call_id ? '#94a3b8' : '#d97706', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{accepting === call.call_id ? '수락 중...' : '📞 직접 수락'}</button>
                      <button onClick={() => handleCancelCall(call.call_id)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
                    </div>
                  ) : (
                    <button onClick={() => handleAccept(call.call_id)} disabled={accepting === call.call_id} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: accepting === call.call_id ? '#94a3b8' : '#d97706', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{accepting === call.call_id ? '수락 중...' : '📞 콜 수락'}</button>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
