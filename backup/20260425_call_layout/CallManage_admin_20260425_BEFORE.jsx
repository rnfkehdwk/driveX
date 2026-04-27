import { useState, useEffect, useCallback } from 'react';
import { fetchCalls, createCall, cancelCall, updateCall, fetchCustomers, fetchPartners, fetchPaymentTypes, fetchFrequentAddresses, fetchRiders, createCustomer } from '../api/client';
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
  const [form, setForm] = useState({ start_address: '', start_detail: '', start_lat: null, start_lng: null, end_address: '', end_detail: '', end_lat: null, end_lng: null, customer_id: '', partner_id: '', estimated_fare: '', payment_type_id: '', payment_method: '', memo: '', assigned_rider_id: '' });
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [riders, setRiders] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showCustList, setShowCustList] = useState(false);
  const [showPartList, setShowPartList] = useState(false);
  const [saving, setSaving] = useState(false);
  // 신규 고객 등록 (검색 결과 없을 때 바로 등록)
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustSaving, setNewCustSaving] = useState(false);
  const [addrSearch, setAddrSearch] = useState(null); // 'start' | 'end' | null
  // 자주 가는 곳 (즐겨찾기 대체)
  const [frequentStart, setFrequentStart] = useState([]);
  const [frequentEnd, setFrequentEnd] = useState([]);
  const [showFreqStart, setShowFreqStart] = useState(false);
  const [showFreqEnd, setShowFreqEnd] = useState(false);

  useEffect(() => {
    fetchCustomers({ limit: 9999 }).then(r => setCustomers(r.data || [])).catch(() => {});
    fetchPartners({ limit: 9999 }).then(r => setPartners(r.data || [])).catch(() => {});
    fetchPaymentTypes({ active_only: 'true' }).then(r => {
      const list = r.data || [];
      setPaymentTypes(list);
      // 첫 번째 결제구분을 기본값으로
      if (list.length > 0) {
        setForm(f => ({ ...f, payment_type_id: list[0].payment_type_id, payment_method: list[0].code }));
      }
    }).catch(() => {});
    // 자주 가는 출발지/도착지 로드
    fetchFrequentAddresses({ type: 'start', limit: 15 }).then(r => setFrequentStart(r.data || [])).catch(() => {});
    fetchFrequentAddresses({ type: 'end', limit: 15 }).then(r => setFrequentEnd(r.data || [])).catch(() => {});
    // 기사 목록 로드 (수동 지명용)
    fetchRiders().then(r => setRiders(r.data || [])).catch(() => {});
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

  // 신규 고객 등록 — custSearch를 이름으로 사용하고 newCustPhone을 전화로 사용
  const handleCreateNewCustomer = async () => {
    const name = custSearch.trim();
    if (!name) { alert('고객명을 입력해주세요.'); return; }
    setNewCustSaving(true);
    try {
      const res = await createCustomer({ name, phone: newCustPhone.trim() || null });
      // 응답: { customer_id, customer_code, message }
      const newCust = {
        customer_id: res.customer_id,
        customer_code: res.customer_code,
        name,
        phone: newCustPhone.trim() || null,
      };
      // 고객 목록에 추가 + 선택 상태로 설정
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

  const handleSubmit = async () => {
    if (!form.start_address) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        customer_id: selectedCust?.customer_id || null,
        partner_id: selectedPart?.partner_id || null,
        estimated_fare: form.estimated_fare ? parseInt(form.estimated_fare) : null,
        payment_type_id: form.payment_type_id || null,
        payment_method: form.payment_method || 'CASH',
        start_lat: form.start_lat,
        start_lng: form.start_lng,
        end_lat: form.end_lat,
        end_lng: form.end_lng,
        assigned_rider_id: form.assigned_rider_id || null,
      };
      const res = await createCall(body);
      alert(res.message || '콜이 생성되었습니다.');
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 8, position: 'relative' }}>
            <div><label style={ls}>출발지 *</label><textarea value={form.start_address} onChange={set('start_address')} placeholder="출발 주소" rows={2} style={{ ...is, resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} /></div>
            <div style={{ alignSelf: 'end', position: 'relative' }}>
              <button
                onClick={() => setShowFreqStart(!showFreqStart)}
                disabled={frequentStart.length === 0}
                title={frequentStart.length === 0 ? '자주 가는 곳 없음' : '자주 가는 출발지'}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fde68a', background: frequentStart.length > 0 ? '#fffbeb' : '#f8fafc', color: frequentStart.length > 0 ? '#d97706' : '#cbd5e1', fontSize: 13, fontWeight: 700, cursor: frequentStart.length > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
              >⭐</button>
              {showFreqStart && frequentStart.length > 0 && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 280, maxHeight: 300, overflowY: 'auto', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>⭐ 자주 가는 출발지</div>
                  {frequentStart.map((f, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setForm(prev => ({ ...prev, start_address: f.address, start_detail: f.detail || prev.start_detail }));
                        setShowFreqStart(false);
                      }}
                      style={{ padding: '10px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.address}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{f.use_count}회 사용</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ alignSelf: 'end' }}><button onClick={() => setAddrSearch('start')} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔍</button></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={ls}>출발 상세</label><input value={form.start_detail} onChange={set('start_detail')} placeholder="동/호수 등" style={is} /></div>
          <KakaoMiniMap startLat={form.start_lat} startLng={form.start_lng} height={160} />
          <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 8, position: 'relative' }}>
            <div><label style={ls}>도착지 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(미정 가능)</span></label><textarea value={form.end_address} onChange={set('end_address')} placeholder="도착 주소 (비워두면 미정)" rows={2} style={{ ...is, resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} /></div>
            <div style={{ alignSelf: 'end', position: 'relative' }}>
              <button
                onClick={() => setShowFreqEnd(!showFreqEnd)}
                disabled={frequentEnd.length === 0}
                title={frequentEnd.length === 0 ? '자주 가는 곳 없음' : '자주 가는 도착지'}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fde68a', background: frequentEnd.length > 0 ? '#fffbeb' : '#f8fafc', color: frequentEnd.length > 0 ? '#d97706' : '#cbd5e1', fontSize: 13, fontWeight: 700, cursor: frequentEnd.length > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
              >⭐</button>
              {showFreqEnd && frequentEnd.length > 0 && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 280, maxHeight: 300, overflowY: 'auto', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>⭐ 자주 가는 도착지</div>
                  {frequentEnd.map((f, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setForm(prev => ({ ...prev, end_address: f.address, end_detail: f.detail || prev.end_detail }));
                        setShowFreqEnd(false);
                      }}
                      style={{ padding: '10px 14px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.address}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{f.use_count}회 사용</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ alignSelf: 'end' }}><button onClick={() => setAddrSearch('end')} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔍</button></div>
          </div>
          <div><label style={ls}>도착 상세</label><input value={form.end_detail} onChange={set('end_detail')} placeholder="동/호수 등" style={is} /></div>
          <KakaoMiniMap startLat={form.end_lat} startLng={form.end_lng} height={160} />
        </div>

        {/* 고객 / 제휴업체 — 검색 input + 자동 드롭다운 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* 고객 */}
          <div style={{ position: 'relative' }}>
            <label style={ls}>고객</label>
            {selectedCust ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedCust.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>{selectedCust.customer_code || ''}</span>
                </span>
                <button onClick={() => { setSelectedCust(null); setCustSearch(''); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            ) : (
              <>
                <input
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setShowCustList(true); }}
                  onFocus={() => setShowCustList(true)}
                  onBlur={() => setTimeout(() => setShowCustList(false), 200)}
                  placeholder="고객명, 코드, 전화번호 검색..."
                  style={is}
                />
                {showCustList && filteredCust.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 220, overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {filteredCust.slice(0, 50).map(c => (
                      <div key={c.customer_id} onMouseDown={() => { setSelectedCust(c); setCustSearch(''); setShowCustList(false); }}
                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.customer_code || ''}{c.phone ? ` · ${c.phone}` : ''}</div>
                      </div>
                    ))}
                    {filteredCust.length > 50 && <div style={{ padding: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>상위 50명만 표시 — 검색어를 좁혀주세요</div>}
                  </div>
                )}
                {showCustList && custSearch && filteredCust.length === 0 && (
                  <div
                    style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>검색 결과 없음</div>
                    <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 6 }}>+ 신규 고객 등록</div>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ ...ls, marginBottom: 2 }}>이름</label>
                      <input
                        value={custSearch}
                        onChange={e => setCustSearch(e.target.value)}
                        onFocus={() => setShowCustList(true)}
                        placeholder="고객명"
                        style={{ ...is, padding: '8px 10px', fontSize: 13 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ ...ls, marginBottom: 2 }}>전화번호 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(선택)</span></label>
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
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: (newCustSaving || !custSearch.trim()) ? '#cbd5e1' : '#2563eb', color: 'white', fontSize: 12, fontWeight: 700, cursor: (newCustSaving || !custSearch.trim()) ? 'not-allowed' : 'pointer' }}
                    >
                      {newCustSaving ? '등록 중...' : '+ 등록하고 선택'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 제휴업체 */}
          <div style={{ position: 'relative' }}>
            <label style={ls}>제휴업체</label>
            {selectedPart ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPart.name}</span>
                <button onClick={() => { setSelectedPart(null); setPartSearch(''); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
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
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 220, overflowY: 'auto', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    {filteredPart.slice(0, 50).map(p => (
                      <div key={p.partner_id} onMouseDown={() => { setSelectedPart(p); setPartSearch(''); setShowPartList(false); }}
                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.phone && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.phone}</div>}
                      </div>
                    ))}
                    {filteredPart.length > 50 && <div style={{ padding: 8, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>상위 50개만 표시 — 검색어를 좁혀주세요</div>}
                  </div>
                )}
                {showPartList && partSearch && filteredPart.length === 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    검색 결과 없음
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 요금 / 결제 / 메모 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={ls}>예상 요금</label><input type="number" value={form.estimated_fare} onChange={set('estimated_fare')} placeholder="0" style={is} /></div>
          <div>
            <label style={ls}>결제방법</label>
            <select
              value={form.payment_type_id}
              onChange={(e) => {
                const id = e.target.value;
                const pt = paymentTypes.find(p => String(p.payment_type_id) === String(id));
                setForm(f => ({ ...f, payment_type_id: id, payment_method: pt?.code || '' }));
              }}
              style={{ ...is, background: 'white' }}
            >
              {paymentTypes.length === 0 && <option value="">결제구분 없음</option>}
              {paymentTypes.map(pt => (
                <option key={pt.payment_type_id} value={pt.payment_type_id}>
                  {pt.label}{pt.settlement_group_name ? ` (${pt.settlement_group_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* 기사 수동 지명 (선택) */}
        <div style={{ marginBottom: 12 }}>
          <label style={ls}>🚗 기사 지명 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(선택 — 지명하면 대기 없이 바로 배정)</span></label>
          <select
            value={form.assigned_rider_id}
            onChange={set('assigned_rider_id')}
            style={{ ...is, background: form.assigned_rider_id ? '#eff6ff' : 'white', borderColor: form.assigned_rider_id ? '#bfdbfe' : '#e2e8f0', fontWeight: form.assigned_rider_id ? 600 : 400 }}
          >
            <option value="">— 지명 없음 (모든 기사가 경쟁) —</option>
            {riders.map(r => (
              <option key={r.user_id} value={r.user_id}>
                {r.name}{r.phone ? ` (${r.phone})` : ''}{r.role === 'SUPER_ADMIN' ? ' ☆' : ''}
              </option>
            ))}
          </select>
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
        {call.assigned_rider_name && <span>🚘 {call.assigned_rider_name}</span>}
        {(call.payment_label || call.payment_method) && <span>💳 {call.payment_label || call.payment_method}</span>}
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
          { label: '배정됨', value: calls.filter(c => c.status === 'ASSIGNED').length, color: '#2563eb', icon: '🚘' },
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
