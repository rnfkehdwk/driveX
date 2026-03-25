import { useState, useEffect } from 'react';
import { fetchInquiries, replyInquiry, updateInquiryStatus } from '../api/client';

const TYPE_LABEL = { RENEWAL: '갱신', UPGRADE: '업그레이드', DOWNGRADE: '다운그레이드', GENERAL: '일반', BUG: '버그' };
const TYPE_COLOR = { RENEWAL: '#dc2626', UPGRADE: '#2563eb', DOWNGRADE: '#d97706', GENERAL: '#64748b', BUG: '#7c3aed' };
const STATUS_LABEL = { PENDING: '대기', IN_PROGRESS: '처리중', RESOLVED: '완료', CLOSED: '종료' };
const STATUS_COLOR = { PENDING: '#d97706', IN_PROGRESS: '#2563eb', RESOLVED: '#16a34a', CLOSED: '#94a3b8' };

export default function Inquiries() {
  const [data, setData] = useState({ data: [], summary: {} });
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => fetchInquiries({ status: filter || undefined }).then(setData).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  const handleReply = async () => {
    if (!replyText.trim()) { alert('답변 내용을 입력해주세요.'); return; }
    setSaving(true);
    try { await replyInquiry(detail.id, { reply: replyText, status: 'RESOLVED' }); alert('답변이 등록되었습니다.'); setDetail(null); setReplyText(''); load(); }
    catch (err) { alert(err.response?.data?.error || '실패'); }
    finally { setSaving(false); }
  };

  const handleStatus = async (id, status) => {
    try { await updateInquiryStatus(id, { status }); load(); }
    catch { alert('실패'); }
  };

  const s = data.summary || {};

  return (
    <div className="fade-in">
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: '전체', value: s.total || 0, color: '#1e293b', f: '' }, { label: '대기', value: s.pending || 0, color: '#d97706', f: 'PENDING' }, { label: '처리중', value: s.in_progress || 0, color: '#2563eb', f: 'IN_PROGRESS' }, { label: '완료', value: s.resolved || 0, color: '#16a34a', f: 'RESOLVED' }].map((c, i) => (
          <div key={i} onClick={() => setFilter(c.f)} style={{ background: filter === c.f ? `${c.color}11` : 'white', borderRadius: 12, padding: 16, border: `1.5px solid ${filter === c.f ? c.color : '#f1f5f9'}`, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        {(data.data || []).map(q => (
          <div key={q.id} onClick={() => { setDetail(q); setReplyText(q.reply || ''); }} style={{ padding: '16px 20px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${TYPE_COLOR[q.inquiry_type]}15`, color: TYPE_COLOR[q.inquiry_type] }}>{TYPE_LABEL[q.inquiry_type] || q.inquiry_type}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${STATUS_COLOR[q.status]}15`, color: STATUS_COLOR[q.status] }}>{STATUS_LABEL[q.status]}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{q.created_at?.slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{q.title}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{q.company_name} ({q.company_code}) · {q.user_name}</div>
            </div>
            {q.status === 'PENDING' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0, marginTop: 6 }} />}
          </div>
        ))}
        {(data.data || []).length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>문의사항이 없습니다.</div>}
      </div>

      {/* 상세 모달 */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: `${TYPE_COLOR[detail.inquiry_type]}15`, color: TYPE_COLOR[detail.inquiry_type] }}>{TYPE_LABEL[detail.inquiry_type]}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${STATUS_COLOR[detail.status]}15`, color: STATUS_COLOR[detail.status] }}>{STATUS_LABEL[detail.status]}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{detail.title}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* 문의 정보 */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
              <div>업체: <strong style={{ color: '#1e293b' }}>{detail.company_name}</strong> ({detail.company_code})</div>
              <div>작성자: <strong>{detail.user_name}</strong> ({detail.user_role})</div>
              <div>접수일: {detail.created_at?.slice(0, 16).replace('T', ' ')}</div>
            </div>

            {/* 문의 내용 */}
            {detail.content && (
              <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{detail.content}</div>
            )}

            {/* 답변 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>답변</div>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} placeholder="답변 내용을 입력하세요..."
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              {detail.status === 'PENDING' && <button onClick={() => { handleStatus(detail.id, 'IN_PROGRESS'); setDetail(d => ({ ...d, status: 'IN_PROGRESS' })); }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>처리중으로 변경</button>}
              <button onClick={handleReply} disabled={saving} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : '답변 등록 (처리완료)'}</button>
              {detail.status === 'RESOLVED' && <button onClick={() => { handleStatus(detail.id, 'CLOSED'); setDetail(null); load(); }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #94a3b8', background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>종료</button>}
            </div>

            {/* 기존 답변 표시 */}
            {detail.reply && detail.replied_by_name && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginBottom: 6 }}>✅ 답변 ({detail.replied_by_name} · {detail.replied_at?.slice(0, 16).replace('T', ' ')})</div>
                <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{detail.reply}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
