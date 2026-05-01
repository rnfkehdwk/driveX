import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, fetchCompanies, fetchMasterCount, fetchRiderLimit, issueTempPassword } from '../api/client';

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
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ login_id: '', password: '', name: '', phone: '', email: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' });
  const [saving, setSaving] = useState(false);
  const [masterCount, setMasterCount] = useState({ count: 0, max: 3 });
  const [riderLimit, setRiderLimit] = useState({ current: 0, max: 0, free_riders: 0, plan_name: '-' });
  const [tempPwResult, setTempPwResult] = useState(null);
  const [issuingFor, setIssuingFor] = useState(null);
  const [loginIdEdit, setLoginIdEdit] = useState(null); // { user_id, login_id, name, role } | null
  const [newLoginId, setNewLoginId] = useState('');
  const [savingLoginId, setSavingLoginId] = useState(false);
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

  const openNew = () => { setEditing(null); setForm({ login_id: '', password: '', name: '', phone: '', email: '', role: 'RIDER', vehicle_number: '', vehicle_type: '', company_id: '' }); setModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ login_id: u.login_id, name: u.name, phone: u.phone, email: u.email || '', role: u.role, vehicle_number: u.vehicle_number || '', vehicle_type: u.vehicle_type || '', password: '', company_id: u.company_id || '' }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { alert('이름과 연락처는 필수입니다.'); return; }
    if (form.role !== 'MASTER' && isMaster && !form.company_id) { alert('소속 업체를 선택해주세요.'); return; }
    setSaving(true);
    try {
      if (editing) {
        // 이메일 형식 검증 (입력했을 때만)
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { alert('이메일 형식이 올바르지 않습니다.'); setSaving(false); return; }
        const body = { name: form.name, phone: form.phone, email: form.email || null, vehicle_number: form.vehicle_number, vehicle_type: form.vehicle_type, role: form.role };
        if (isMaster && form.role !== 'MASTER') body.company_id = form.company_id;
        await updateUser(editing.user_id, body);
      } else {
        if (!form.login_id || !form.password) { alert('ID와 비밀번호는 필수입니다.'); setSaving(false); return; }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { alert('이메일 형식이 올바르지 않습니다.'); setSaving(false); return; }
        const body = { ...form };
        if (!body.email) delete body.email;
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

  const handleIssueTempPw = async (u) => {
    if (!confirm(`${u.name}(${u.login_id})의 임시 비밀번호를 발급하시겠습니까?\n\n• 기존 비밀번호는 즉시 무효화됩니다\n• 임시비번은 10분 후 만료됩니다\n• 이메일이 등록되어 있으면 자동 발송됩니다`)) return;
    setIssuingFor(u.user_id);
    try {
      const res = await issueTempPassword(u.user_id);
      setTempPwResult(res);
    } catch (err) {
      alert(err.response?.data?.error || '임시 비밀번호 발급 실패');
    } finally { setIssuingFor(null); }
  };

  const roleMap = { MASTER: '마스터', SUPER_ADMIN: '관리자', RIDER: '기사' };
  const statusStyle = (s) => ({ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s === 'ACTIVE' ? '#f0fdf4' : s === 'SUSPENDED' ? '#fef2f2' : '#f8fafc', color: s === 'ACTIVE' ? '#16a34a' : s === 'SUSPENDED' ? '#dc2626' : '#94a3b8' });
  const canEdit = (u) => isMaster ? u.user_id !== currentUser.user_id : u.role !== 'MASTER';
  const canToggle = (u) => isMaster ? u.user_id !== currentUser.user_id : u.role !== 'MASTER';
  // 로그인 ID 변경 권한 (2026-04-29 추가):
  //   MASTER: 모든 유저(자기 자신 포함) ID 변경 가능
  //   SUPER_ADMIN: 자기 회사 소속 RIDER만 ID 변경 가능
  const canChangeLoginId = (u) => {
    if (isMaster) return true;
    if (currentUser?.role === 'SUPER_ADMIN') {
      return u.role === 'RIDER' && u.company_id === currentUser.company_id;
    }
    return false;
  };

  const openLoginIdEdit = (u) => { setLoginIdEdit(u); setNewLoginId(u.login_id); };
  const handleSaveLoginId = async () => {
    const trimmed = (newLoginId || '').trim();
    if (!trimmed) { alert('새 로그인 ID를 입력하세요.'); return; }
    if (trimmed === loginIdEdit.login_id) { alert('현재 ID와 동일합니다. 다른 ID를 입력하세요.'); return; }
    if (trimmed.length < 4 || trimmed.length > 50) { alert('로그인 ID는 4~50자여야 합니다.'); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) { alert('로그인 ID는 영문/숫자/_/-/. 만 사용 가능합니다.'); return; }
    const isSelf = loginIdEdit.user_id === currentUser?.user_id;
    const confirmMsg = isSelf
      ? `⚠️ 본인 계정의 로그인 ID를 변경합니다.\n\n"${loginIdEdit.login_id}" → "${trimmed}"\n\n• 현재 세션은 유지되지만, 다음 로그인부터 새 ID를 사용해야 합니다\n• 계속 진행하시겠습니까?`
      : `${loginIdEdit.name}님의 로그인 ID를 변경합니다.\n\n"${loginIdEdit.login_id}" → "${trimmed}"\n\n• 해당 사용자는 다음 로그인부터 새 ID를 사용해야 합니다\n• 계속 진행하시겠습니까?`;
    if (!confirm(confirmMsg)) return;
    setSavingLoginId(true);
    try {
      await updateUser(loginIdEdit.user_id, { login_id: trimmed });
      alert(`로그인 ID가 "${trimmed}"(으)로 변경되었습니다.`);
      setLoginIdEdit(null); setNewLoginId(''); load();
    } catch (err) {
      alert(err.response?.data?.error || 'ID 변경 실패');
    } finally { setSavingLoginId(false); }
  };

  const headers = isMaster
    ? [{ key: 'company_name', label: '업체명' }, { key: 'name', label: '이름' }, { key: 'login_id', label: '로그인ID' }, { key: 'role', label: '역할' }, { key: null, label: '연락처' }, { key: null, label: '차량번호' }, { key: 'status', label: '상태' }, { key: null, label: '최근로그인' }, { key: null, label: '관리' }]
    : [{ key: 'name', label: '이름' }, { key: 'login_id', label: '로그인ID' }, { key: 'role', label: '역할' }, { key: null, label: '연락처' }, { key: null, label: '차량번호' }, { key: 'status', label: '상태' }, { key: null, label: '최근로그인' }, { key: null, label: '관리' }];

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    return true;
  });
  const sorted = sort(filtered);
  const roleOptions = [
    { value: 'RIDER', label: '일반 기사', color: '#2563eb', bg: '#eff6ff' },
    { value: 'SUPER_ADMIN', label: '업체 관리자', color: '#92400e', bg: '#fef3c7' },
  ];
  if (isMaster) roleOptions.push({ value: 'MASTER', label: `시스템 관리자 (${masterCount.count}/${masterCount.max})`, color: '#9d174d', bg: '#fce7f3', disabled: masterFull && form.role !== 'MASTER' });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, ID, 연락처 검색..." style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 200 }} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white' }}>
            <option value="">역할 전체</option>
            <option value="MASTER">마스터</option>
            <option value="SUPER_ADMIN">관리자</option>
            <option value="RIDER">기사</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white' }}>
            <option value="">상태 전체</option>
            <option value="ACTIVE">활성</option>
            <option value="SUSPENDED">정지</option>
          </select>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>총 {sorted.length}명</span>
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {canEdit(u) && <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', fontSize: 11, cursor: 'pointer', color: '#2563eb' }}>수정</button>}
                    {canChangeLoginId(u) && <button onClick={() => openLoginIdEdit(u)} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #c7d2fe', background: '#eef2ff', fontSize: 11, cursor: 'pointer', color: '#4338ca', fontWeight: 600 }}>🆔 ID변경</button>}
                    {canEdit(u) && u.status === 'ACTIVE' && <button onClick={() => handleIssueTempPw(u)} disabled={issuingFor === u.user_id} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #fde68a', background: '#fffbeb', fontSize: 11, cursor: 'pointer', color: '#d97706', fontWeight: 600 }}>{issuingFor === u.user_id ? '...' : '🔑 임시비번'}</button>}
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

            {[{ k: 'name', label: '이름 *', ph: '홍길동' }, { k: 'phone', label: '연락처 *', ph: '010-1234-5678' }, { k: 'email', label: '이메일 (비밀번호 찾기용)', ph: 'example@gmail.com', type: 'email' }, ...(!editing ? [{ k: 'login_id', label: '로그인 ID *', ph: 'rider_hong' }, { k: 'password', label: '비밀번호 *', ph: '비밀번호 (8자 이상)', type: 'password' }] : []), { k: 'vehicle_number', label: '차량번호', ph: '서울 12가 3456' }, { k: 'vehicle_type', label: '차종', ph: '소나타' }].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label><input type={f.type || 'text'} value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} /></div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '저장 중...' : editing ? '수정' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
      {/* 임시 비밀번호 발급 결과 모달 */}
      {tempPwResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={() => setTempPwResult(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 460 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>임시 비밀번호 발급 완료</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{tempPwResult.target_name} ({tempPwResult.target_login_id})</div>
            </div>

            <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>임시 비밀번호</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', letterSpacing: 2, padding: '12px 16px', background: 'white', borderRadius: 8, border: '2px dashed #bfdbfe', userSelect: 'all' }}>
                {tempPwResult.temp_password}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(tempPwResult.temp_password); alert('복사되었습니다'); }} style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid #bfdbfe', background: 'white', fontSize: 12, fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}>📋 복사</button>
            </div>

            {tempPwResult.has_email && tempPwResult.email_sent && (
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                ✅ 등록된 이메일로 자동 발송되었습니다. 사용자가 메일을 확인하도록 안내해주세요.
              </div>
            )}
            {tempPwResult.has_email && !tempPwResult.email_sent && (
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#991b1b', lineHeight: 1.6 }}>
                ⚠️ 메일 발송에 실패했습니다. 위 임시 비밀번호를 직접 사용자에게 전달해주세요.
              </div>
            )}
            {!tempPwResult.has_email && (
              <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                📧 등록된 이메일이 없습니다. 위 임시 비밀번호를 직접 사용자에게 전달해주세요.
              </div>
            )}

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
              • 임시 비밀번호는 <strong>10분 후 만료</strong>됩니다<br />
              • 사용자가 로그인하면 자동으로 새 비밀번호 설정 화면이 뜨우고 변경 전에는 서비스 이용이 차단됩니다<br />
              • 현재 화면을 닫으면 비밀번호는 다시 표시할 수 없습니다
            </div>

            <button onClick={() => setTempPwResult(null)} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2563eb', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}

      {/* 로그인 ID 변경 모달 (2026-04-29 추가) */}
      {loginIdEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={() => !savingLoginId && setLoginIdEdit(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>🆔</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>로그인 ID 변경</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{loginIdEdit.name} <span style={{ color: '#94a3b8' }}>({roleMap[loginIdEdit.role] || loginIdEdit.role})</span></div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>현재 로그인 ID</label>
              <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#475569', fontFamily: 'monospace' }}>{loginIdEdit.login_id}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>새 로그인 ID *</label>
              <input
                autoFocus
                value={newLoginId}
                onChange={e => setNewLoginId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !savingLoginId) handleSaveLoginId(); }}
                placeholder="4~50자, 영문/숫자/_/-/."
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 15, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>영문 소/대문자, 숫자, 밑줄(_), 하이픈(-), 마침표(.) 만 사용 가능</div>
            </div>

            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
              <strong>⚠️ 안내</strong><br />
              • 로그인 ID는 로그인 시에만 사용되며, 운행일지 · 콜 · 마일리지 등의 기록에는 영향이 없습니다<br />
              • 해당 사용자는 <strong>다음 로그인부터 새 ID</strong>를 사용해야 합니다<br />
              • 비밀번호는 그대로 유지됩니다
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setLoginIdEdit(null); setNewLoginId(''); }}
                disabled={savingLoginId}
                style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: savingLoginId ? 'not-allowed' : 'pointer', opacity: savingLoginId ? 0.6 : 1 }}
              >취소</button>
              <button
                onClick={handleSaveLoginId}
                disabled={savingLoginId}
                style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: '#4f46e5', color: 'white', fontSize: 14, fontWeight: 700, cursor: savingLoginId ? 'not-allowed' : 'pointer', opacity: savingLoginId ? 0.7 : 1 }}
              >{savingLoginId ? '변경 중...' : 'ID 변경'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
