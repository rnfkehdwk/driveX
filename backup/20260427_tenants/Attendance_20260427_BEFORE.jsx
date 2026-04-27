import { useState, useEffect } from 'react';
import { fetchAttendance, createAttendance, deleteAttendance, fetchRiders } from '../api/client';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// 0.5시간 단위 옵션 (0 ~ 24)
const HOUR_OPTIONS = (() => {
  const out = [];
  for (let i = 0; i <= 48; i++) {
    out.push(i / 2);
  }
  return out;
})();

export default function Attendance() {
  const [riders, setRiders] = useState([]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 입력 폼
  const [form, setForm] = useState({
    rider_id: '',
    work_date: today(),
    calculated_hours: 8,
    memo: '',
  });

  // 월 필터 (하단 목록)
  const [filterMonth, setFilterMonth] = useState(currentMonth());

  const loadRiders = () => {
    fetchRiders()
      .then(r => setRiders(r.data || []))
      .catch(() => setRiders([]));
  };

  const loadList = () => {
    setLoading(true);
    fetchAttendance({ month: filterMonth })
      .then(r => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRiders(); }, []);
  useEffect(() => { loadList(); }, [filterMonth]);

  const handleSubmit = async () => {
    if (!form.rider_id) { alert('기사를 선택해주세요.'); return; }
    if (!form.work_date) { alert('근무일을 선택해주세요.'); return; }
    if (form.calculated_hours == null || form.calculated_hours < 0) { alert('근무시간을 선택해주세요.'); return; }
    setSaving(true);
    try {
      const res = await createAttendance({
        rider_id: form.rider_id,
        work_date: form.work_date,
        calculated_hours: form.calculated_hours,
        memo: form.memo || null,
      });
      alert(res.message || '저장되었습니다.');
      // 입력 폼은 그대로 두되 (기사/날짜 유지) — 다음 기사로 빠르게 입력 가능
      // 단 메모는 초기화
      setForm(f => ({ ...f, memo: '' }));
      loadList();
    } catch (err) {
      alert(err.response?.data?.error || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 근무시간 기록을 삭제할까요?')) return;
    try {
      await deleteAttendance(id);
      loadList();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  // 같은 기사+같은 날짜 기존 입력 찾기 (있으면 폼에 미리 채워줌)
  const existingForToday = list.find(a =>
    String(a.rider_id) === String(form.rider_id) &&
    a.work_date?.slice(0, 10) === form.work_date
  );

  // 월 필터 합계
  const totalHours = list.reduce((sum, a) => sum + Number(a.calculated_hours || 0), 0);
  const ridersInMonth = new Set(list.map(a => a.rider_id)).size;

  // 기사별 합계 (월 필터 기준)
  const byRider = {};
  list.forEach(a => {
    const key = a.rider_id;
    if (!byRider[key]) byRider[key] = { name: a.rider_name, total: 0, days: 0 };
    byRider[key].total += Number(a.calculated_hours || 0);
    byRider[key].days += 1;
  });
  const riderSummary = Object.values(byRider).sort((a, b) => b.total - a.total);

  const ls = { fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 6 };
  const is = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

  return (
    <div className="fade-in">
      {/* 안내 */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#1e40af' }}>
        💡 시급제 업체용 — 기사별 근무시간을 0.5시간 단위로 입력하세요. 입력한 시간은 <strong>운임 정산 → 월별 정산</strong>에 자동 반영됩니다.
      </div>

      {/* 입력 카드 */}
      <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', border: '1px solid #f1f5f9', marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>🕐 근무시간 입력</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* 기사 선택 */}
          <div>
            <label style={ls}>기사</label>
            <select
              value={form.rider_id}
              onChange={e => setForm(f => ({ ...f, rider_id: e.target.value }))}
              style={{ ...is, background: 'white', fontWeight: form.rider_id ? 700 : 400 }}
            >
              <option value="">— 기사 선택 —</option>
              {riders.map(r => (
                <option key={r.user_id} value={r.user_id}>
                  {r.name}{r.role === 'SUPER_ADMIN' ? ' ☆' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 근무일 */}
          <div>
            <label style={ls}>근무일</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="date"
                value={form.work_date}
                onChange={e => setForm(f => ({ ...f, work_date: e.target.value }))}
                style={{ ...is, flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={() => setForm(f => ({ ...f, work_date: today() }))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: form.work_date === today() ? '#eff6ff' : '#f8fafc', color: form.work_date === today() ? '#2563eb' : '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>오늘</button>
              <button onClick={() => setForm(f => ({ ...f, work_date: yesterday() }))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: form.work_date === yesterday() ? '#eff6ff' : '#f8fafc', color: form.work_date === yesterday() ? '#2563eb' : '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>어제</button>
            </div>
          </div>

          {/* 근무시간 셀렉트 */}
          <div>
            <label style={ls}>근무시간 (0.5h 단위)</label>
            <select
              value={form.calculated_hours}
              onChange={e => setForm(f => ({ ...f, calculated_hours: Number(e.target.value) }))}
              style={{ ...is, background: 'white', fontWeight: 700, fontSize: 16, color: '#2563eb' }}
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>{h}시간</option>
              ))}
            </select>
          </div>
        </div>

        {/* 메모 */}
        <div style={{ marginBottom: 16 }}>
          <label style={ls}>메모 (선택)</label>
          <input
            value={form.memo}
            onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
            placeholder="특이사항 (예: 야근, 휴무 후 첫출근 등)"
            style={is}
          />
        </div>

        {/* 중복 안내 */}
        {existingForToday && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
            ⚠️ 이 기사는 {form.work_date}에 이미 <strong>{existingForToday.calculated_hours}시간</strong>이 입력되어 있습니다. 저장하면 덮어씁니다.
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={saving || !form.rider_id}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            border: 'none',
            background: saving || !form.rider_id ? '#cbd5e1' : '#2563eb',
            color: 'white',
            fontSize: 15,
            fontWeight: 800,
            cursor: saving || !form.rider_id ? 'default' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : existingForToday ? '✏️ 수정 저장' : '💾 근무시간 저장'}
        </button>
      </div>

      {/* 월 필터 + 합계 */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid #f1f5f9', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>📅 조회 월</span>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600 }}
          />
          <button onClick={() => setFilterMonth(currentMonth())} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>이번달</button>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
          <div><span style={{ color: '#94a3b8' }}>총 근무시간 </span><strong style={{ color: '#1e293b' }}>{totalHours}h</strong></div>
          <div><span style={{ color: '#94a3b8' }}>입력 기사 </span><strong style={{ color: '#1e293b' }}>{ridersInMonth}명</strong></div>
          <div><span style={{ color: '#94a3b8' }}>총 기록 </span><strong style={{ color: '#1e293b' }}>{list.length}건</strong></div>
        </div>
      </div>

      {/* 기사별 합계 카드 */}
      {riderSummary.length > 0 && (
        <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{filterMonth} 기사별 합계</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {riderSummary.map(r => (
              <div key={r.name} style={{ padding: 10, borderRadius: 8, background: '#f8fafc', borderLeft: '3px solid #2563eb' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>{r.total}h</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.days}일 근무</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입력 내역 테이블 */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: 14, fontWeight: 700 }}>
          {filterMonth} 입력 내역 ({list.length}건)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['근무일', '기사', '근무시간', '메모', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === '근무시간' ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: 11, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{filterMonth} 입력된 근무시간이 없습니다.</td></tr>
              ) : list.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#64748b' }}>{a.work_date?.slice(0, 10)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{a.rider_name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 14 }}>{Number(a.calculated_hours || 0)}h</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{a.memo || '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(a.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >🗑️ 삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
