import { useState, useEffect } from 'react';
import { fetchCompanies, createCompany, updateCompany, approveCompany, suspendCompany } from '../api/client';

export default function Companies() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ company_code: '', company_name: '', ceo_name: '', phone: '', email: '', address: '', business_number: '', license_type: 'MONTHLY' });
  const [saving, setSaving] = useState(false);

  const load = () => fetchCompanies({ q: search || undefined, status: filterStatus || undefined }).then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, [search, filterStatus]);

  const openNew = () => { setEditing(null); setForm({ company_code: '', company_name: '', ceo_name: '', phone: '', email: '', address: '', business_number: '', license_type: 'MONTHLY' }); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ company_code: c.company_code, company_name: c.company_name, ceo_name: c.ceo_name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', business_number: c.business_number || '', license_type: c.license_type || 'MONTHLY' }); setModal(true); };

  const handleSave = async () => {
    if (!form.company_name) { alert('업체명은 필수입니다.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { company_code, ...body } = form;
        await updateCompany(editing.company_id, body);
      } else {
        if (!form.company_code) { alert('업체코드는 필수입니다.'); setSaving(false); return; }
        await createCompany(form);
      }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => { if (!confirm('승인하시겠습니까?')) return; try { await approveCompany(id); load(); } catch { alert('실패'); } };
  const handleSuspend = async (id) => { if (!confirm('정지하시겠습니까?')) return; try { await suspendCompany(id); load(); } catch { alert('실패'); } };

  const statusColors = { ACTIVE: { bg: '#f0fdf4', color: '#16a34a' }, PENDING: { bg: '#fffbeb', color: '#d97706' }, SUSPENDED: { bg: '#fef2f2', color: '#dc2626' }, DELETED: { bg: '#f8fafc', color: '#94a3b8' } };
  const statusLabel = { ACTIVE: '활성', PENDING: '승인대기', SUSPENDED: '정지', DELETED: '삭제' };

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: '전체', value: list.length, color: '#1e293b' },
          { label: '활성', value: list.filter(c => c.status === 'ACTIVE').length, color: '#16a34a' },
          { label: '승인대기', value: list.filter(c => c.status === 'PENDING').length, color: '#d97706' },
          { label: '정지', value: list.filter(c => c.status === 'SUSPENDED').length, color: '#dc2626' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명, 코드, 대표 검색..."
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 240 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="">전체 상태</option>
            <option value="PENDING">승인대기</option>
            <option value="ACTIVE">활성</option>
            <option value="SUSPENDED">정지</option>
          </select>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', borderRadius: 8, background: '#0f172a', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ 업체 등록</button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['업체코드', '업체명', '대표', '연락처', '기사수', '월운행', '상태', '등록일', '관리'].map(h => (
                <th key={h} style={{ padding: '11px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.company_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '11px 10px', fontWeight: 600, color: '#2563eb' }}>{c.company_code}</td>
                <td style={{ padding: '11px 10px', fontWeight: 600 }}>{c.company_name}</td>
                <td style={{ padding: '11px 10px' }}>{c.ceo_name || '-'}</td>
                <td style={{ padding: '11px 10px', color: '#64748b' }}>{c.phone || '-'}</td>
                <td style={{ padding: '11px 10px', textAlign: 'center' }}>{c.rider_count || 0}</td>
                <td style={{ padding: '11px 10px', textAlign: 'center' }}>{c.monthly_rides || 0}</td>
                <td style={{ padding: '11px 10px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, ...(statusColors[c.status] || {}) }}>{statusLabel[c.status] || c.status}</span>
                </td>
                <td style={{ padding: '11px 10px', fontSize: 12, color: '#94a3b8' }}>{c.created_at?.slice(0, 10)}</td>
                <td style={{ padding: '11px 10px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(c)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>
                    {c.status === 'PENDING' && <button onClick={() => handleApprove(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>승인</button>}
                    {c.status === 'ACTIVE' && <button onClick={() => handleSuspend(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #dc2626', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>정지</button>}
                    {c.status === 'SUSPENDED' && <button onClick={() => handleApprove(c.company_id)} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>재활성</button>}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>업체가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '업체 정보 수정' : '업체 등록'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { k: 'company_code', label: editing ? '업체코드' : '업체코드 *', ph: 'YANGYANG01', disabled: !!editing },
                { k: 'company_name', label: '업체명 *', ph: '양양대리' },
                { k: 'ceo_name', label: '대표명', ph: '김사장' },
                { k: 'phone', label: '연락처', ph: '033-672-0000' },
                { k: 'email', label: '이메일', ph: 'yang@drivelog.co.kr' },
                { k: 'business_number', label: '사업자번호', ph: '123-45-67890' },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} disabled={f.disabled}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: f.disabled ? '#f1f5f9' : 'white' }} />
                </div>
              ))}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>주소</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="업체 주소"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#0f172a', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '저장 중...' : editing ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
