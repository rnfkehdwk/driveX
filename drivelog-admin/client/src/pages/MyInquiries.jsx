import { useState, useEffect } from 'react';
import { fetchInquiries, createInquiry } from '../api/client';

const TYPE_LABEL = { RENEWAL: '서비스 갱신', UPGRADE: '업그레이드', DOWNGRADE: '다운그레이드', GENERAL: '일반 문의', BUG: '버그 신고' };
const TYPE_COLOR = { RENEWAL: '#2563eb', UPGRADE: '#16a34a', DOWNGRADE: '#f59e0b', GENERAL: '#64748b', BUG: '#dc2626' };
const STATUS_LABEL = { PENDING: '접수', IN_PROGRESS: '처리중', RESOLVED: '완료', CLOSED: '종료' };
const STATUS_COLOR = { PENDING: '#d97706', IN_PROGRESS: '#2563eb', RESOLVED: '#16a34a', CLOSED: '#94a3b8' };

export default function MyInquiries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ inquiry_type: 'GENERAL', title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => { setLoading(true); fetchInquiries({}).then(r => setList(r.data || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.title) { alert('제목을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await createInquiry(form);
      alert('문의가 접수되었습니다. 관리자가 확인 후 답변드리겠습니다.');
      setShowForm(false);
      setForm({ inquiry_type: 'GENERAL', title: '', content: '' });
      load();
    } catch (err) { alert(err.response?.data?.error || '등록 실패'); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="fade-in">
      {/* 상단 요약 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
          <span>전체 <strong>{list.length}</strong></span>
          <span style={{ color: '#d97706' }}>접수 <strong>{list.filter(i => i.status === 'PENDING').length}</strong></span>
          <span style={{ color: '#2563eb' }}>처리중 <strong>{list.filter(i => i.status === 'IN_PROGRESS').length}</strong></span>
          <span style={{ color: '#16a34a' }}>완료 <strong>{list.filter(i => i.status === 'RESOLVED').length}</strong></span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 문의 등록</button>
      </div>

      {/* 문의 목록 */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📩</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>문의 내역이 없습니다</div>
          <div style={{ fontSize: 13 }}>서비스 갱신, 업그레이드, 버그 신고 등 문의를 등록해주세요.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {list.map(inq => (
            <div key={inq.id} onClick={() => setSelected(selected?.id === inq.id ? null : inq)} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: selected?.id === inq.id ? '2px solid #2563eb' : '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8, gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${TYPE_COLOR[inq.inquiry_type] || '#64748b'}15`, color: TYPE_COLOR[inq.inquiry_type] || '#64748b' }}>{TYPE_LABEL[inq.inquiry_type] || inq.inquiry_type}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${STATUS_COLOR[inq.status] || '#94a3b8'}15`, color: STATUS_COLOR[inq.status] || '#94a3b8' }}>{STATUS_LABEL[inq.status] || inq.status}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{inq.created_at?.slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{inq.title}</div>
              {inq.content && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: selected?.id === inq.id ? 'pre-wrap' : 'nowrap' }}>{inq.content}</div>}

              {/* 답변 표시 */}
              {selected?.id === inq.id && inq.reply && (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>관리자 답변 ({inq.replied_at?.slice(0, 10)})</div>
                  <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inq.reply}</div>
                </div>
              )}
              {selected?.id === inq.id && !inq.reply && inq.status === 'PENDING' && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#d97706' }}>⏳ 관리자 확인 대기 중입니다.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 문의 등록 모달 */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, maxWidth: 480, width: '100%' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>📩 문의 등록</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>문의 유형</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ k: 'GENERAL', l: '일반 문의' }, { k: 'RENEWAL', l: '서비스 갱신' }, { k: 'UPGRADE', l: '업그레이드' }, { k: 'DOWNGRADE', l: '다운그레이드' }, { k: 'BUG', l: '버그 신고' }].map(t => (
                  <button key={t.k} type="button" onClick={() => setForm(f => ({ ...f, inquiry_type: t.k }))} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: form.inquiry_type === t.k ? `2px solid ${TYPE_COLOR[t.k]}` : '1px solid #e2e8f0',
                    background: form.inquiry_type === t.k ? `${TYPE_COLOR[t.k]}10` : 'white',
                    color: form.inquiry_type === t.k ? TYPE_COLOR[t.k] : '#64748b'
                  }}>{t.l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>제목 *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="문의 제목을 입력하세요" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>상세 내용</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} placeholder="문의 내용을 상세히 입력해주세요" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '전송 중...' : '문의 등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
