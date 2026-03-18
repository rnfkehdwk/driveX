import { useState, useEffect } from 'react';
import { fetchFarePolicies, createFarePolicy, updateFarePolicy } from '../api/client';

export default function FarePolicies() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    policy_name: '', base_fare: 0, per_km_rate: 0, per_minute_rate: 0,
    night_surcharge_pct: 0, company_commission_pct: 20, platform_fee_pct: 0, mileage_earn_pct: 10,
    effective_from: '', effective_to: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () => fetchFarePolicies().then(r => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.policy_name || !form.effective_from) { alert('정책명과 시작일은 필수입니다.'); return; }
    setSaving(true);
    try { await createFarePolicy(form); setModal(false); load(); }
    catch (err) { alert(err.response?.data?.error || '저장 실패'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    await updateFarePolicy(p.policy_id, { is_active: !p.is_active }); load();
  };

  const fields = [
    { k: 'policy_name', label: '정책명 *', ph: '기본 요금 정책', type: 'text' },
    { k: 'base_fare', label: '기본 요금 (원)', ph: '5000', type: 'number' },
    { k: 'per_km_rate', label: 'km당 요금 (원)', ph: '1000', type: 'number' },
    { k: 'per_minute_rate', label: '분당 요금 (원)', ph: '200', type: 'number' },
    { k: 'night_surcharge_pct', label: '심야 할증률 (%)', ph: '20', type: 'number' },
    { k: 'company_commission_pct', label: '업체 수수료율 (%)', ph: '20', type: 'number' },
    { k: 'platform_fee_pct', label: '플랫폼 수수료율 (%)', ph: '0', type: 'number' },
    { k: 'mileage_earn_pct', label: '마일리지 적립률 (%)', ph: '10', type: 'number' },
    { k: 'effective_from', label: '적용 시작일 *', type: 'date' },
    { k: 'effective_to', label: '적용 종료일', type: 'date' },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>등록된 정책 {list.length}개</span>
        <button onClick={() => { setForm({ policy_name: '', base_fare: 0, per_km_rate: 0, per_minute_rate: 0, night_surcharge_pct: 0, company_commission_pct: 20, platform_fee_pct: 0, mileage_earn_pct: 10, effective_from: '', effective_to: '' }); setModal(true); }}
          style={{ padding: '8px 18px', borderRadius: 8, background: '#7c3aed', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + 요금 정책 추가
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {list.map(p => (
          <div key={p.policy_id} style={{ background: 'white', borderRadius: 14, padding: 20, border: `1.5px solid ${p.is_active ? '#c7d2fe' : '#f1f5f9'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{p.policy_name}</span>
                <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: p.is_active ? '#f0fdf4' : '#fef2f2', color: p.is_active ? '#16a34a' : '#dc2626' }}>
                  {p.is_active ? '활성' : '비활성'}
                </span>
              </div>
              <button onClick={() => toggleActive(p)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', fontSize: 12, cursor: 'pointer', color: p.is_active ? '#dc2626' : '#16a34a' }}>
                {p.is_active ? '비활성화' : '활성화'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: '기본요금', value: `${Number(p.base_fare).toLocaleString()}원` },
                { label: 'km당', value: `${Number(p.per_km_rate).toLocaleString()}원` },
                { label: '업체수수료', value: `${p.company_commission_pct}%` },
                { label: '마일리지적립', value: `${p.mileage_earn_pct}%` },
                { label: '심야할증', value: `${p.night_surcharge_pct}%` },
                { label: '플랫폼수수료', value: `${p.platform_fee_pct}%` },
                { label: '시작일', value: p.effective_from },
                { label: '종료일', value: p.effective_to || '미설정' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14 }}>요금 정책이 없습니다.</div>}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 28, width: 480, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>요금 정책 추가</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {fields.map(f => (
                <div key={f.k} style={{ gridColumn: f.type === 'text' ? 'span 2' : undefined }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} placeholder={f.ph}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#7c3aed', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '저장 중...' : '정책 추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
