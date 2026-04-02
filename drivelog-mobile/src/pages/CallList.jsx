import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalls, acceptCall, cancelCall, createCall, fetchCustomers, fetchPartners, fetchPaymentTypes } from '../api/client';
import AddressSearchModal from '../components/AddressSearchModal';
import KakaoMiniMap from '../components/KakaoMiniMap';

const STATUS_MAP = {
  WAITING: { label: '대기 중', color: '#d97706', bg: '#fffbeb' },
  ASSIGNED: { label: '수락됨', color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2' },
};

// 콜 생성 모달 (SUPER_ADMIN 전용) — 카카오 주소 검색 + 지도 추가
function CreateCallModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ start_address: '', start_detail: '', end_address: '', end_detail: '', customer_id: '', partner_id: '', estimated_fare: '', payment_method: 'CASH', memo: '' });
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

  useEffect(() => { fetchPaymentTypes().then(r => setPayTypes(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { if (custSearch.length >= 1) { fetchCustomers({ q: custSearch, limit: 10 }).then(r => { setCustomers(r.data || []); setShowCustList(true); }).catch(() => {}); } else { setCustomers([]); setShowCustList(false); } }, [custSearch]);
  useEffect(() => { if (partSearch.length >= 1) { fetchPartners({ q: partSearch, limit: 10 }).then(r => { setPartners(r.data || []); setShowPartList(true); }).catch(() => {}); } else { setPartners([]); setShowPartList(false); } }, [partSearch]);

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

  const handleSubmit = async () => {
    if (!form.start_address.trim()) { alert('출발지를 입력해주세요.'); return; }
    setSaving(true);
    try {
      const body = { ...form, customer_id: selectedCust?.customer_id || null, partner_id: selectedPart?.partner_id || null, estimated_fare: form.estimated_fare ? Number(form.estimated_fare) : null };
      if (!body.end_address) delete body.end_address;
      await createCall(body);
      alert('콜이 생성되었습니다.');
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

          {/* 출발지 — 검색 버튼 추가 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', display: 'block', marginBottom: 4 }}>📍 출발지 *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.start_address} onChange={e => setForm(f => ({ ...f, start_address: e.target.value }))} placeholder="출발지 주소" style={{ ...is, flex: 1 }} />
              <button onClick={() => setAddrSearch('start')} style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
            <input value={form.start_detail} onChange={e => setForm(f => ({ ...f, start_detail: e.target.value }))} placeholder="상세 주소 (선택)" style={{ ...is, marginTop: 6, fontSize: 13 }} />
          </div>

          {/* 도착지 — 검색 버튼 추가 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>📍 도착지</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.end_address} onChange={e => setForm(f => ({ ...f, end_address: e.target.value }))} placeholder="도착지 주소 (미정 가능)" style={{ ...is, flex: 1 }} />
              <button onClick={() => setAddrSearch('end')} style={{ padding: '0 12px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>🔍</button>
            </div>
            <input value={form.end_detail} onChange={e => setForm(f => ({ ...f, end_detail: e.target.value }))} placeholder="상세 주소 (선택)" style={{ ...is, marginTop: 6, fontSize: 13 }} />
          </div>

          {/* 카카오 지도 (출발/도착 좌표가 있을 때) */}
          <KakaoMiniMap startLat={startCoord.lat} startLng={startCoord.lng} endLat={endCoord.lat} endLng={endCoord.lng} height={180} />

          {/* 고객 검색 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>👤 고객</label>
            {selectedCust ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{selectedCust.name} {selectedCust.phone ? `(${selectedCust.phone})` : ''}</span>
                <button onClick={() => { setSelectedCust(null); setCustSearch(''); setForm(f => ({ ...f, customer_id: '' })); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            ) : (
              <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="고객명 검색..." style={is} />
            )}
            {showCustList && customers.length > 0 && !selectedCust && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 160, overflowY: 'auto', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {customers.map(c => (
                  <div key={c.customer_id} onClick={() => { setSelectedCust(c); setCustSearch(''); setShowCustList(false); }} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span> <span style={{ color: '#94a3b8' }}>{c.phone || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 제휴업체 검색 */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>🏢 제휴업체</label>
            {selectedPart ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{selectedPart.name}</span>
                <button onClick={() => { setSelectedPart(null); setPartSearch(''); setForm(f => ({ ...f, partner_id: '' })); }} style={{ border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
            ) : (
              <input value={partSearch} onChange={e => setPartSearch(e.target.value)} placeholder="업체명 검색..." style={is} />
            )}
            {showPartList && partners.length > 0 && !selectedPart && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 160, overflowY: 'auto', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {partners.map(p => (
                  <div key={p.partner_id} onClick={() => { setSelectedPart(p); setPartSearch(''); setShowPartList(false); }} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ color: '#94a3b8' }}>{p.phone || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>📝 메모</label>
            <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} rows={2} placeholder="특이사항, 고객 요청 등..." style={{ ...is, resize: 'vertical' }} />
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
  const myCalls = calls.filter(c => c.assigned_rider_id === user?.user_id && ['ASSIGNED', 'IN_PROGRESS'].includes(c.status));
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
                  const isMyCall = call.assigned_rider_id === user?.user_id;
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
