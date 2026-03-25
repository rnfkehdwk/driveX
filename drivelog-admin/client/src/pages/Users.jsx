import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, fetchCompanies, fetchMasterCount, fetchRiderLimit } from '../api/client';

function useSortable() {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const toggle = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const icon = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const sort = (arr) => { if (!sortKey) return arr; return [...arr].sort((a, b) => { let va = a[sortKey], vb = b[sortKey]; if (va == null) va = ''; if (vb == null) vb = ''; if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va; return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'ko') : String(vb).localeCompare(String(va), 'ko'); }); };
  return { toggle, icon, sort };
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' });
  const [saving, setSaving] = useState(false);
  const [masterCount, setMasterCount] = useState({ count: 0, max: 3 });
  const [riderLimit, setRiderLimit] = useState({ current: 0, max: 0, free_riders: 0, plan_name: '-' });
  const { toggle, icon, sort } = useSortable();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isMaster = currentUser?.role === 'MASTER';

  const load = () => {
    fetchUsers({ q: search || undefined }).then(r => setUsers(r.data || [])).catch(() => {});
    if (isMaster) fetchMasterCount().then(r => setMasterCount(r)).catch(() => {});
    if (!isMaster) fetchRiderLimit().then(r => setRiderLimit(r)).catch(() => {});
  };
  useEffect(() => { load(); if (isMaster) fetchCompanies({ status: 'ACTIVE' }).then(r => setCompanies(r.data || [])).catch(() => {}); }, [search]);

  const masterFull = masterCount.count >= masterCount.max;
  const riderFull = riderLimit.max > 0 && riderLimit.current >= riderLimit.max;

  const openNew = () => { setEditing(null); setForm({ login_id: '', password: '', name: '', phone: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' }); setModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ login_id: u.login_id, name: u.name, phone: u.phone, role: u.role, vehicle_number: u.vehicle_number || '', vehicle_type: u.vehicle_type || '', password: '', company_id: u.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
    if (form.role !== 'MASTER' && isMaster && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, phone: form.phone, vehicle_number: form.vehicle_number, vehicle_type: form.vehicle_type, role: form.role };
        if (isMaster && form.role !== 'MASTER') body.company_id = form.company_id;
        await updateUser(editing.user_id, body);
      } else {
        if (!form.login_id || !form.password) { alert('ID와 비밀번호는 필수입니다.'); setSaving(false); return; }
        const body = { ...form };
        if (form.role === 'MASTER') delete body.company_id;
        await createUser(body);
      }
      setModal(false); load();
    } catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (u) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`${u.name}님을 ${next === 'ACTIVE' ? '활성화' : '정지'} 하시겠습니까?`)) return;
    try { await updateUser(u.user_id, { status: next }); load(); } catch (err) { alert(err.response?.data?.error || '처리 실패'); }
  };

  const roleMap = { MASTER: '마스터', SUPER_ADMIN: '관리자', RIDER: '기사' };
  const statusStyle = (s) => ({ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s === 'ACTIVE' ? '#f0fdf4' : s === 'SUSPENDED' ? '#fef2f2' : '#f8fafc', color: s === 'ACTIVE' ? '#16a34a' : s === 'SUSPENDED' ? '#dc2626' : '#94a3b8' });
  const canEdit = (u) => isMaster ? u.user_id !== currentUser.user_id : u.role !== 'MASTER';
  const canToggle = (u) => isMaster ? u.user_id !== currentUser.user_id : u.role !== 'MASTER';

  const headers = isMaster
    ? [{ key: 'company_name', label: '업체명' }, { key: 'name', label: '이름' }, { key: null, label: '로그인ID' }, { key: null, label: '역할' }, { key: null, label: '연락처' }, { key: null, label: '차량번호' }, { key: null, label: '상태' }, { key: null, label: '최근로그인' }, { key: null, label: '관리' }]
    : [{ key: 'name', label: '이름' }, { key: null, label: '로그인ID' }, { key: null, label: '역할' }, { key: null, label: '연락처' }, { key: null, label: '차량번호' }, { key: null, label: '상태' }, { key: null, label: '최근로그인' }, { key: null, label: '관리' }];

  const sorted = sort(users);
  const roleOptions = [
    { value: 'RIDER', label: '일반 기사', color: '#2563eb', bg: '#eff6ff' },
    { value: 'SUPER_ADMIN', label: '업체 관리자', color: '#92400e', bg: '#fef3c7' },
  ];
  if (isMaster) roleOptions.push({ value: 'MASTER', label: `시스템 관리자 (${masterCount.count}/${masterCount.max})`, color: '#9d174d', bg: '#fce7f3', disabled: masterFull && form.role !== 'MASTER' });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, ID, 연락처 검색..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 240 }} />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {users.length}명</span>
          {isMaster && <span style={{ fontSize: 11, color: '#9d174d', background: '#fce7f3', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>MASTER {masterCount.count}/{masterCount.max}</span>}
          {/* SUPER_ADMIN: 기사수 제한 배지 */}
          {!isMaster && riderLimit.max > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: riderFull ? '#fef2f2' : '#eff6ff', color: riderFull ? '#dc2626' : '#2563eb', border: `1px solid ${riderFull ? '#fecaca' : '#bfdbfe'}` }}>
              👥 {riderLimit.current}/{riderLimit.max}명 ({riderLimit.plan_name})
            </span>
          )}
          {!isMaster && riderLimit.max === 0 && riderLimit.plan_name !== '-' && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              👥 {riderLimit.current}명 (무제한)
            </span>
          )}
        </div>
        <button onClick={openNew} disabled={!isMaster && riderFull} style={{ padding: '8px 18px', borderRadius: 8, background: (!isMaster && riderFull) ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: (!isMaster && riderFull) ? 'not-allowed' : 'pointer' }}>
          {(!isMaster && riderFull) ? '⚠️ 계정 한도 초과' : '+ 계정 등록'}
        </button>
      </div>

      {/* 기사수 제한 초과 배너 */}
      {!isMaster && riderFull && (
        <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 16px', marginBottom: 14, border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>⚠️ 요금제 계정 한도에 도달했습니다</div>
            <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>현재 {riderLimit.current}명 / 최대 {riderLimit.max}명 ({riderLimit.plan_name}). 추가 등록하려면 요금제를 업그레이드하거나 비활성 계정을 정리하세요.</div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f8fafc' }}>{headers.map((h, i) => (<th key={i} onClick={() => h.key && toggle(h.key)} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: h.key ? 'pointer' : 'default', userSelect: 'none' }}>{h.label}{h.key ? icon(h.key) : ''}</th>))}</tr></thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {isMaster && <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>{u.role === 'MASTER' ? '(시스템)' : u.company_name || '-'}</td>}
                <td style={{ padding: '11px 12px', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{u.login_id}</td>
                <td style={{ padding: '11px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: u.role === 'SUPER_ADMIN' ? '#fef3c7' : u.role === 'MASTER' ? '#fce7f3' : '#eff6ff', color: u.role === 'SUPER_ADMIN' ? '#92400e' : u.role === 'MASTER' ? '#9d174d' : '#2563eb' }}>{roleMap[u.role] || u.role}</span></td>
                <td style={{ padding: '11px 12px' }}>{u.phone}</td>
                <td style={{ padding: '11px 12px', color: '#64748b' }}>{u.vehicle_number || '-'}</td>
                <td style={{ padding: '11px 12px' }}><span style={statusStyle(u.status)}>{u.status}</span></td>
                <td style={{ padding: '11px 12px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{u.last_login_at ? u.last_login_at.slice(0, 16) : '-'}</td>
                <td style={{ padding: '11px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {canEdit(u) && <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>}
                    {canToggle(u) && <button onClick={() => toggleStatus(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: u.status === 'ACTIVE' ? '#dc2626' : '#16a34a' }}>{u.status === 'ACTIVE' ? '정지' : '활성'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 440, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{editing ? '계정 정보 수정' : '신규 계정 등록'}</div>

            {/* 기사수 제한 경고 (신규 등록 시, SUPER_ADMIN만) */}
            {!editing && !isMaster && riderLimit.max > 0 && (
              <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: riderFull ? '#fef2f2' : '#eff6ff', border: `1px solid ${riderFull ? '#fecaca' : '#bfdbfe'}`, fontSize: 12, color: riderFull ? '#dc2626' : '#1e40af' }}>
                👥 계정 {riderLimit.current}/{riderLimit.max}명 사용 중 ({riderLimit.plan_name})
                {riderFull && ' — 한도 초과로 등록이 불가합니다.'}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>권한 *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {roleOptions.map(r => (<button key={r.value} type="button" onClick={() => !r.disabled && setForm(p => ({ ...p, role: r.value }))} style={{ flex: 1, minWidth: r.value === 'MASTER' ? '100%' : 'auto', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: r.disabled ? 'not-allowed' : 'pointer', border: form.role === r.value ? `2px solid ${r.color}` : '1.5px solid #e5e7eb', background: r.disabled ? '#f1f5f9' : form.role === r.value ? r.bg : 'white', color: r.disabled ? '#9ca3af' : form.role === r.value ? r.color : '#6b7280', opacity: r.disabled ? 0.6 : 1 }}>{r.label}</button>))}
              </div>
            </div>

            {isMaster && form.role !== 'MASTER' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>소속 업체 *</label>
                <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
                  <option value="">업체를 선택하세요</option>
                  {companies.map(c => (<option key={c.company_id} value={c.company_id}>{c.company_name} ({c.company_code})</option>))}
                </select>
              </div>
            )}

            {[{ k: 'name', label: '이름 *', ph: '홍길동' }, { k: 'phone', label: '연락처 *', ph: '010-1234-5678' }, ...(!editing ? [{ k: 'login_id', label: '로그인 ID *', ph: 'rider_hong' }, { k: 'password', label: '비밀번호 *', ph: '비밀번호 (8자 이상)', type: 'password' }] : []), { k: 'vehicle_number', label: '차량번호', ph: '서울 12가 3456' }, { k: 'vehicle_type', label: '차종', ph: '소나타' }].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
