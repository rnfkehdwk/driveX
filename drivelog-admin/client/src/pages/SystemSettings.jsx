import { useState, useEffect } from 'react';
import { fetchSystemSettings, updateSystemSetting } from '../api/client';

const SETTING_META = {
  free_trial_days: { label: '무료 체험 기간', unit: '일', type: 'number', icon: '🎁', desc: '업체 셀프 가입 시 제공되는 무료 체험 기간입니다. 0이면 체험 없이 즉시 유료.' },
  auto_approve_trial: { label: '무료 체험 자동 승인', unit: '', type: 'toggle', icon: '✅', desc: 'true: 가입 즉시 체험 시작. false: MASTER 수동 승인 필요.' },
  registration_enabled: { label: '업체 가입 신청 활성화', unit: '', type: 'toggle', icon: '📝', desc: 'false로 설정하면 신규 업체 가입 신청을 받지 않습니다.' },
  payment_bank: { label: '입금 은행', unit: '', type: 'text', icon: '🏦', desc: 'SUPER_ADMIN 결제 안내에 표시되는 입금 은행명입니다.' },
  payment_account: { label: '입금 계좌번호', unit: '', type: 'text', icon: '💳', desc: 'SUPER_ADMIN 결제 안내에 표시되는 입금 계좌번호입니다.' },
  payment_holder: { label: '예금주', unit: '', type: 'text', icon: '👤', desc: 'SUPER_ADMIN 결제 안내에 표시되는 예금주명입니다.' },
  payment_note: { label: '결제 안내 메시지', unit: '', type: 'text', icon: '📋', desc: 'SUPER_ADMIN 결제 안내 팝업에 표시되는 안내 문구입니다.' },
};

export default function SystemSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); fetchSystemSettings().then(r => { setSettings(r.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openEdit = (s) => { setEditKey(s.setting_key); setEditValue(s.setting_value); };
  const cancelEdit = () => { setEditKey(null); setEditValue(''); };
  const handleSave = async (key) => { setSaving(true); try { const res = await updateSystemSetting(key, { value: editValue }); alert(res.message); setEditKey(null); setEditValue(''); load(); } catch (err) { alert(err.response?.data?.error || '변경 실패'); } finally { setSaving(false); } };
  const handleToggle = async (s) => { const newVal = s.setting_value === 'true' ? 'false' : 'true'; setSaving(true); try { await updateSystemSetting(s.setting_key, { value: newVal }); load(); } catch (err) { alert(err.response?.data?.error || '변경 실패'); } finally { setSaving(false); } };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>;

  // 설정을 그룹으로 분류
  const generalKeys = ['free_trial_days', 'auto_approve_trial', 'registration_enabled'];
  const paymentKeys = ['payment_bank', 'payment_account', 'payment_holder', 'payment_note'];
  const generalSettings = settings.filter(s => generalKeys.includes(s.setting_key));
  const paymentSettings = settings.filter(s => paymentKeys.includes(s.setting_key));
  const otherSettings = settings.filter(s => !generalKeys.includes(s.setting_key) && !paymentKeys.includes(s.setting_key));

  const renderSetting = (s) => {
    const meta = SETTING_META[s.setting_key] || { label: s.setting_key, type: 'text', icon: '⚙️', desc: s.description || '' };
    const isEditing = editKey === s.setting_key;
    const isToggle = meta.type === 'toggle';
    const isOn = s.setting_value === 'true';

    return (
      <div key={s.setting_key} style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{meta.label}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{s.setting_key}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>{meta.desc}</div>

        {isToggle ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => !saving && handleToggle(s)} style={{ width: 52, height: 28, borderRadius: 14, background: isOn ? '#2563eb' : '#d1d5db', position: 'relative', cursor: saving ? 'wait' : 'pointer', transition: 'background 0.2s' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: isOn ? 27 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: isOn ? '#2563eb' : '#94a3b8' }}>{isOn ? '활성' : '비활성'}</span>
          </div>
        ) : isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type={meta.type === 'number' ? 'number' : 'text'} value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
              style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #2563eb', fontSize: 15, fontWeight: 700, flex: 1, outline: 'none', minWidth: 0 }} />
            {meta.unit && <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>{meta.unit}</span>}
            <button onClick={() => handleSave(s.setting_key)} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{saving ? '...' : '저장'}</button>
            <button onClick={cancelEdit} style={{ padding: '8px 14px', borderRadius: 8, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: meta.type === 'number' ? 28 : 16, fontWeight: meta.type === 'number' ? 900 : 700, color: '#2563eb' }}>
              {s.setting_value || '(미설정)'}{meta.unit && <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>{meta.unit}</span>}
            </div>
            <button onClick={() => openEdit(s)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #ddd6fe', background: '#faf5ff', color: '#7c3aed', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>변경</button>
          </div>
        )}

        {s.updated_at && <div style={{ marginTop: 8, fontSize: 11, color: '#b0b8c4' }}>변경: {s.updated_at?.slice(0, 16).replace('T', ' ')}</div>}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24, fontSize: 13, color: '#94a3b8' }}>서비스 재시작 없이 즉시 적용됩니다.</div>

      {/* 일반 설정 */}
      {generalSettings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingLeft: 4 }}>⚙️ 일반 설정</div>
          <div style={{ display: 'grid', gap: 12 }}>{generalSettings.map(renderSetting)}</div>
        </div>
      )}

      {/* 결제 계좌 설정 */}
      {paymentSettings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingLeft: 4 }}>💳 결제 계좌 설정</div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af', marginBottom: 12 }}>
            SUPER_ADMIN이 사용료 결제 시 아래 계좌 정보가 표시됩니다.
          </div>
          <div style={{ display: 'grid', gap: 12 }}>{paymentSettings.map(renderSetting)}</div>
        </div>
      )}

      {/* 기타 설정 */}
      {otherSettings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingLeft: 4 }}>🔧 기타 설정</div>
          <div style={{ display: 'grid', gap: 12 }}>{otherSettings.map(renderSetting)}</div>
        </div>
      )}

      {settings.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14 }}>시스템 설정이 없습니다.</div>}
    </div>
  );
}
