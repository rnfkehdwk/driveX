import { useState, useEffect } from 'react';
import { fetchPermissions, bulkUpdatePermissions, fetchCompanies, fetchCompanyPermissions, saveCompanyPermissions } from '../api/client';

const CheckBox = ({ checked, onChange, disabled }) => (
  <div onClick={disabled ? undefined : onChange} style={{
    width: 24, height: 24, borderRadius: 6, border: `2px solid ${disabled ? '#e2e8f0' : checked ? '#2563eb' : '#cbd5e1'}`,
    background: disabled ? '#f1f5f9' : checked ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', margin: '0 auto',
  }}>
    {checked && <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  </div>
);

// ─── 기본 역할별 권한 ───
function DefaultPermissions() {
  const [list, setList] = useState([]);
  const [changed, setChanged] = useState({});
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState('ALL');

  const load = () => fetchPermissions().then(r => { setList(r.data || []); setChanged({}); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = (id, field) => {
    setChanged(prev => {
      const item = prev[id] || list.find(p => p.permission_id === id);
      return { ...prev, [id]: { ...item, permission_id: id, [field]: !item[field] } };
    });
  };
  const getValue = (p, field) => {
    if (changed[p.permission_id]?.[field] !== undefined) return changed[p.permission_id][field];
    return !!p[field];
  };

  const handleSave = async () => {
    const updates = Object.values(changed).map(c => ({
      permission_id: c.permission_id,
      role_master: c.role_master ?? list.find(p => p.permission_id === c.permission_id)?.role_master ?? false,
      role_superadmin: c.role_superadmin ?? list.find(p => p.permission_id === c.permission_id)?.role_superadmin ?? false,
      role_rider: c.role_rider ?? list.find(p => p.permission_id === c.permission_id)?.role_rider ?? false,
    }));
    if (!updates.length) return;
    setSaving(true);
    try { await bulkUpdatePermissions({ permissions: updates }); alert('저장 완료'); load(); }
    catch { alert('저장 실패'); } finally { setSaving(false); }
  };

  const filtered = list.filter(p => platform === 'ALL' || p.platform === platform || p.platform === 'BOTH');
  const groups = [...new Set(filtered.map(p => p.menu_group))];
  const hasChanges = Object.keys(changed).length > 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'WEB', 'MOBILE'].map(t => (
            <button key={t} onClick={() => setPlatform(t)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: platform === t ? '2px solid #2563eb' : '1px solid #e2e8f0', background: platform === t ? '#eff6ff' : 'white', color: platform === t ? '#2563eb' : '#64748b' }}>
              {t === 'ALL' ? '전체' : t === 'WEB' ? '관리자 웹' : '모바일 앱'}
            </button>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving || !hasChanges} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: hasChanges ? 'pointer' : 'default', background: hasChanges ? '#2563eb' : '#e2e8f0', color: hasChanges ? 'white' : '#94a3b8' }}>
          {saving ? '저장 중...' : `저장${hasChanges ? ` (${Object.keys(changed).length})` : ''}`}
        </button>
      </div>
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['그룹', '메뉴', '플랫폼'].map(h => <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0' }}>{h}</th>)}
              <th style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 700, color: '#dc2626', fontSize: 12, borderBottom: '2px solid #e2e8f0' }}>MASTER</th>
              <th style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 700, color: '#2563eb', fontSize: 12, borderBottom: '2px solid #e2e8f0' }}>업체관리자</th>
              <th style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: 12, borderBottom: '2px solid #e2e8f0' }}>운행기사</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => filtered.filter(p => p.menu_group === group).map((p, i, arr) => (
              <tr key={p.permission_id} style={{ borderBottom: '1px solid #f1f5f9', background: changed[p.permission_id] ? '#fffbeb' : 'transparent' }}>
                {i === 0 && <td rowSpan={arr.length} style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', borderRight: '1px solid #f1f5f9', background: '#fafafa' }}>{group}</td>}
                <td style={{ padding: '10px 12px' }}>{p.menu_label}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: p.platform === 'WEB' ? '#eff6ff' : '#f0fdf4', color: p.platform === 'WEB' ? '#2563eb' : '#16a34a' }}>{p.platform}</span></td>
                <td style={{ padding: '10px 12px' }}><CheckBox checked={getValue(p, 'role_master')} onChange={() => toggle(p.permission_id, 'role_master')} /></td>
                <td style={{ padding: '10px 12px' }}><CheckBox checked={getValue(p, 'role_superadmin')} onChange={() => toggle(p.permission_id, 'role_superadmin')} /></td>
                <td style={{ padding: '10px 12px' }}><CheckBox checked={getValue(p, 'role_rider')} onChange={() => toggle(p.permission_id, 'role_rider')} /></td>
              </tr>
            )))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>권한 데이터가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 업체별 권한 매트릭스 (PPT 스타일) ───
function CompanyMatrix() {
  const [companies, setCompanies] = useState([]);
  const [menus, setMenus] = useState([]);
  const [matrix, setMatrix] = useState({}); // { companyId: { menuKey: true/false } }
  const [changed, setChanged] = useState({}); // { 'companyId_menuKey': true/false }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('ALL');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [compRes, permRes] = await Promise.all([
          fetchCompanies({ status: 'ACTIVE' }),
          fetchPermissions(),
        ]);
        const comps = compRes.data || [];
        const perms = permRes.data || [];
        setCompanies(comps);
        setMenus(perms);

        // 각 업체별 권한 로드
        const mat = {};
        for (const comp of comps) {
          try {
            const cpRes = await fetchCompanyPermissions(comp.company_id);
            const cpData = cpRes.data || [];
            mat[comp.company_id] = {};
            cpData.forEach(p => { mat[comp.company_id][p.menu_key] = !!p.is_allowed; });
          } catch { mat[comp.company_id] = {}; }
        }
        setMatrix(mat);
      } catch {}
      setLoading(false);
    };
    init();
  }, []);

  const getKey = (compId, menuKey) => `${compId}_${menuKey}`;

  const getValue = (compId, menuKey) => {
    const key = getKey(compId, menuKey);
    if (changed[key] !== undefined) return changed[key];
    if (matrix[compId]?.[menuKey] !== undefined) return matrix[compId][menuKey];
    // 기본값: role_superadmin
    const menu = menus.find(m => m.menu_key === menuKey);
    return !!menu?.role_superadmin;
  };

  const toggle = (compId, menuKey) => {
    const key = getKey(compId, menuKey);
    const current = getValue(compId, menuKey);
    setChanged(prev => ({ ...prev, [key]: !current }));
  };

  const handleSave = async () => {
    // 변경된 항목을 업체별로 그룹핑
    const byCompany = {};
    for (const [key, val] of Object.entries(changed)) {
      const [compId, ...menuParts] = key.split('_');
      const menuKey = menuParts.join('_');
      if (!byCompany[compId]) byCompany[compId] = [];
      byCompany[compId].push({ menu_key: menuKey, is_allowed: val });
    }
    setSaving(true);
    try {
      for (const [compId, perms] of Object.entries(byCompany)) {
        await saveCompanyPermissions(compId, { permissions: perms });
      }
      alert(`${Object.keys(byCompany).length}개 업체의 권한이 저장되었습니다.`);
      setChanged({});
      // 매트릭스 업데이트
      setMatrix(prev => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(changed)) {
          const [compId, ...menuParts] = key.split('_');
          const menuKey = menuParts.join('_');
          if (!next[compId]) next[compId] = {};
          next[compId][menuKey] = val;
        }
        return next;
      });
    } catch { alert('저장 실패'); }
    finally { setSaving(false); }
  };

  const filteredMenus = menus.filter(m => platform === 'ALL' || m.platform === platform || m.platform === 'BOTH');
  const hasChanges = Object.keys(changed).length > 0;

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>업체별 권한 데이터를 불러오는 중...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'WEB', 'MOBILE'].map(t => (
            <button key={t} onClick={() => setPlatform(t)} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: platform === t ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: platform === t ? '#faf5ff' : 'white', color: platform === t ? '#7c3aed' : '#64748b' }}>
              {t === 'ALL' ? '전체' : t === 'WEB' ? '관리자 웹' : '모바일 앱'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasChanges && <span style={{ fontSize: 12, color: '#d97706' }}>{Object.keys(changed).length}개 변경</span>}
          <button onClick={handleSave} disabled={saving || !hasChanges} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: hasChanges ? 'pointer' : 'default', background: hasChanges ? '#7c3aed' : '#e2e8f0', color: hasChanges ? 'white' : '#94a3b8' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1e293b', fontSize: 13, borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 3, minWidth: 50, maxWidth: 50, boxShadow: '1px 0 0 #e2e8f0' }}>no</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#1e293b', fontSize: 13, borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', position: 'sticky', left: 50, background: '#f8fafc', zIndex: 3, minWidth: 130, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>업체명</th>
              {filteredMenus.map(m => (
                <th key={m.menu_key} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: 11, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', minWidth: 70 }}>
                  <div>{m.menu_label}</div>
                  <div style={{ fontSize: 9, color: m.platform === 'WEB' ? '#2563eb' : '#16a34a', marginTop: 2 }}>{m.platform}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((comp, idx) => (
              <tr key={comp.company_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', borderRight: '1px solid #e2e8f0', position: 'sticky', left: 0, background: 'white', zIndex: 1, minWidth: 50, maxWidth: 50, boxShadow: '1px 0 0 #e2e8f0' }}>{idx + 1}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b', borderRight: '1px solid #e2e8f0', position: 'sticky', left: 50, background: 'white', zIndex: 1, whiteSpace: 'nowrap', minWidth: 130, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>
                  <div>{comp.company_name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{comp.company_code}</div>
                </td>
                {filteredMenus.map(m => {
                  const key = getKey(comp.company_id, m.menu_key);
                  const isChanged = changed[key] !== undefined;
                  return (
                    <td key={m.menu_key} style={{ padding: '6px 4px', textAlign: 'center', background: isChanged ? '#fffbeb' : 'transparent' }}>
                      <CheckBox checked={getValue(comp.company_id, m.menu_key)} onChange={() => toggle(comp.company_id, m.menu_key)} />
                    </td>
                  );
                })}
              </tr>
            ))}
            {companies.length === 0 && <tr><td colSpan={2 + filteredMenus.length} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>등록된 업체가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 메인 ───
export default function Permissions() {
  const [mainTab, setMainTab] = useState('company');

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setMainTab('company')} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          border: mainTab === 'company' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
          background: mainTab === 'company' ? '#7c3aed' : 'white', color: mainTab === 'company' ? 'white' : '#64748b',
        }}>🏢 업체별 권한</button>
        <button onClick={() => setMainTab('default')} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          border: mainTab === 'default' ? '2px solid #1e293b' : '1px solid #e2e8f0',
          background: mainTab === 'default' ? '#1e293b' : 'white', color: mainTab === 'default' ? 'white' : '#64748b',
        }}>🔑 기본 역할 권한</button>
      </div>

      {mainTab === 'company' ? <CompanyMatrix /> : <DefaultPermissions />}
    </div>
  );
}
