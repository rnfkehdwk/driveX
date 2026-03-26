import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCalls, acceptCall, cancelCall } from '../api/client';

const STATUS_MAP = {
  WAITING: { label: '대기 중', color: '#d97706', bg: '#fffbeb' },
  ASSIGNED: { label: '수락됨', color: '#2563eb', bg: '#eff6ff' },
  IN_PROGRESS: { label: '운행중', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: '완료', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED: { label: '취소', color: '#dc2626', bg: '#fef2f2' },
};

export default function CallList({ user }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const nav = useNavigate();

  const load = () => {
    setLoading(true);
    fetchCalls({ limit: 50 }).then(r => setCalls(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // 30초 polling
  useEffect(() => {
    const iv = setInterval(() => {
      fetchCalls({ limit: 50 }).then(r => setCalls(r.data || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleAccept = async (callId) => {
    if (!confirm('이 콜을 수락하시겠습니까?\n수락하면 운행기록 작성 화면으로 이동합니다.')) return;
    setAccepting(callId);
    try {
      const res = await acceptCall(callId);
      const call = res.call;
      // 콜 정보를 가지고 운행기록 작성으로 이동
      nav('/ride/new', { state: { fromCall: call } });
    } catch (err) {
      alert(err.response?.data?.error || '콜 수락 실패');
      load(); // 다른 기사가 먼저 수락했을 수 있음
    } finally { setAccepting(null); }
  };

  const handleCancelAccept = async (callId) => {
    if (!confirm('콜 수락을 취소하시겠습니까?\n다른 기사가 수락할 수 있게 됩니다.')) return;
    try {
      await cancelCall(callId, {});
      load();
    } catch (err) { alert(err.response?.data?.error || '취소 실패'); }
  };

  const handleGoRide = (call) => {
    nav('/ride/new', { state: { fromCall: call } });
  };

  const waitingCalls = calls.filter(c => c.status === 'WAITING');
  const myCalls = calls.filter(c => c.assigned_rider_id === user?.user_id && ['ASSIGNED', 'IN_PROGRESS'].includes(c.status));

  const ago = (dt) => {
    if (!dt) return '';
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금';
    if (m < 60) return `${m}분 전`;
    return `${Math.floor(m / 60)}시간 전`;
  };

  return (
    <div className="fade-in" style={{ minHeight: '100vh', background: '#f7f8fc' }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => nav('/')} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>📞 콜 현황</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24' }}>{waitingCalls.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>대기 중 콜</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa' }}>{myCalls.length}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>내 진행 콜</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
        ) : (
          <>
            {/* 내 진행 중 콜 */}
            {myCalls.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>🧑‍✈️ 내 진행 콜</div>
                {myCalls.map(call => {
                  const st = STATUS_MAP[call.status];
                  return (
                    <div key={call.call_id} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 10, border: '2px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>#{call.call_id} · {ago(call.assigned_at)}</span>
                      </div>
                      <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: '#2563eb', fontWeight: 600 }}>출발</span> {call.start_address}{call.start_detail ? ` (${call.start_detail})` : ''}</div>
                      <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: '#dc2626', fontWeight: 600 }}>도착</span> {call.end_address || <span style={{ color: '#94a3b8' }}>미정</span>}{call.end_detail ? ` (${call.end_detail})` : ''}</div>
                      <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 10, flexWrap: 'wrap' }}>
                        {call.customer_name && <span>👤 {call.customer_name}</span>}
                        {call.estimated_fare && <span>💰 {Number(call.estimated_fare).toLocaleString()}원</span>}
                        {call.memo && <span>📝 {call.memo}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleGoRide(call)} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🚗 운행기록 작성</button>
                        <button onClick={() => handleCancelAccept(call.call_id)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>수락 취소</button>
                      </div>
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
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>30초마다 자동으로 새 콜을 확인합니다</div>
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

                  <button onClick={() => handleAccept(call.call_id)} disabled={accepting === call.call_id}
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: accepting === call.call_id ? '#94a3b8' : '#d97706', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                    {accepting === call.call_id ? '수락 중...' : '📞 콜 수락'}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
