import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  fetchDailyStats,
  fetchMileageStats,
  fetchMileageList,
  fetchMileageSummary,
  fetchCustomerMileage,
  adjustMileage,
  fetchMileageTransactions,
} from '../api/client';
import { exportToExcel, MILEAGE_COLUMNS } from '../utils/excel';

const KRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const fmtDateTime = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('ko-KR');
};
const pickArray = (res) => {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  return res.items || res.data || res.customers || res.transactions || res.list || [];
};
const pickBalance = (res) => {
  if (!res) return 0;
  if (typeof res.balance === 'number') return res.balance;
  if (typeof res.mileage_balance === 'number') return res.mileage_balance;
  if (res.customer && typeof res.customer.mileage_balance === 'number') return res.customer.mileage_balance;
  if (res.data) {
    if (typeof res.data.balance === 'number') return res.data.balance;
    if (typeof res.data.mileage_balance === 'number') return res.data.mileage_balance;
    if (res.data.customer && typeof res.data.customer.mileage_balance === 'number') return res.data.customer.mileage_balance;
  }
  return 0;
};

export default function Mileage() {
  // 'daily' | 'customer' | 'balance' (신규)
  const [tab, setTab] = useState('daily');
  const [daily, setDaily] = useState({ data: [], summary: {} });
  const [customers, setCustomers] = useState({ data: [], summary: {} });
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ===== 잔액 관리 탭 state =====
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [balanceList, setBalanceList] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [hasBalanceOnly, setHasBalanceOnly] = useState(true);
  const [balanceSortKey, setBalanceSortKey] = useState('balance_desc');
  // 거래 이력 서브 탭
  const [showTxView, setShowTxView] = useState(false);
  const [txMonth, setTxMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [txType, setTxType] = useState('');
  const [txList, setTxList] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // 수동 조정 폼
  const [adjType, setAdjType] = useState('EARN');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDesc, setAdjDesc] = useState('');
  const [adjBusy, setAdjBusy] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
  }, []);

  // 통계 (기존)
  useEffect(() => {
    if (tab === 'daily' || tab === 'customer') {
      fetchDailyStats({ month }).then(setDaily).catch(() => {});
      fetchMileageStats({ month }).then(setCustomers).catch(() => {});
    }
  }, [month, tab]);

  // 잔액 관리 (신규)
  const loadBalanceSummary = () => {
    fetchMileageSummary().then((r) => setBalanceSummary(r?.data || r || {})).catch(() => setBalanceSummary({}));
  };
  const loadBalanceList = () => {
    setBalanceLoading(true);
    fetchMileageList({ q: balanceSearch.trim() || undefined, has_balance: hasBalanceOnly || undefined })
      .then((r) => setBalanceList(pickArray(r)))
      .catch(() => setBalanceList([]))
      .finally(() => setBalanceLoading(false));
  };
  const loadTransactions = () => {
    setTxLoading(true);
    fetchMileageTransactions({ month: txMonth || undefined, type: txType || undefined })
      .then((r) => setTxList(pickArray(r)))
      .catch(() => setTxList([]))
      .finally(() => setTxLoading(false));
  };

  useEffect(() => {
    if (tab === 'balance') {
      loadBalanceSummary();
      loadBalanceList();
    }
    // eslint-disable-next-line
  }, [tab]);

  useEffect(() => {
    if (tab !== 'balance') return;
    const t = setTimeout(() => loadBalanceList(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [balanceSearch, hasBalanceOnly]);

  useEffect(() => {
    if (tab === 'balance' && showTxView) loadTransactions();
    // eslint-disable-next-line
  }, [tab, showTxView, txMonth, txType]);

  // 정렬
  const sortedBalanceList = useMemo(() => {
    const arr = [...balanceList];
    arr.sort((a, b) => {
      const ba = Number(a.mileage_balance || 0);
      const bb = Number(b.mileage_balance || 0);
      if (balanceSortKey === 'balance_desc') return bb - ba;
      if (balanceSortKey === 'balance_asc') return ba - bb;
      if (balanceSortKey === 'name_asc') return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
      return 0;
    });
    return arr;
  }, [balanceList, balanceSortKey]);

  // 상세 모달
  const openDetail = async (customer) => {
    const cid = customer.customer_id || customer.id;
    setDetailCustomer({ ...customer, customer_id: cid });
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setAdjType('EARN');
    setAdjAmount('');
    setAdjDesc('');
    try {
      const res = await fetchCustomerMileage(cid);
      setDetailData(res || {});
    } catch (e) {
      console.error(e);
      setDetailData({});
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    setDetailOpen(false);
    setDetailCustomer(null);
    setDetailData(null);
  };
  const refreshDetail = async () => {
    if (!detailCustomer) return;
    try {
      const res = await fetchCustomerMileage(detailCustomer.customer_id);
      setDetailData(res || {});
    } catch (e) { console.error(e); }
  };
  const submitAdjust = async () => {
    const amt = Number(adjAmount);
    if (!detailCustomer) return;
    if (!amt || amt <= 0) { alert('금액을 입력하세요.'); return; }
    if (amt % 5000 !== 0) {
      const ok = confirm('5,000원 단위가 아닙니다. 그래도 진행하시겠습니까?\n(USE는 백엔드에서 5,000원 단위 검증)');
      if (!ok) return;
    }
    if (adjType === 'USE') {
      const curBal = pickBalance(detailData) || Number(detailCustomer.mileage_balance || 0);
      if (amt > curBal) { alert(`잔액 부족: 현재 ${KRW(curBal)}`); return; }
    }
    setAdjBusy(true);
    try {
      await adjustMileage({
        customer_id: detailCustomer.customer_id,
        type: adjType,
        amount: amt,
        memo: adjDesc.trim() || (adjType === 'EARN' ? '관리자 수동 적립' : '관리자 수동 차감'),
      });
      setAdjAmount('');
      setAdjDesc('');
      await refreshDetail();
      loadBalanceList();
      loadBalanceSummary();
      alert('처리 완료');
    } catch (e) {
      console.error(e);
      alert(`실패: ${e?.response?.data?.message || e?.response?.data?.error || e?.message || '오류'}`);
    } finally {
      setAdjBusy(false);
    }
  };

  // ====== 통계 데이터 (기존) ======
  const filteredCustomers = search
    ? (customers.data || []).filter(c => (c.customer_code || '').includes(search) || (c.name || '').includes(search))
    : (customers.data || []);

  const cs = customers.summary || {};
  const chartData = (daily.data || []).map(d => ({
    date: (d.date || '').slice(5),
    이용금액: Number(d.total_fare || 0),
    마일리지: Number(d.total_mileage_earned || 0),
  }));

  const thStyle = { padding: isMobile ? '8px 6px' : '10px 12px', fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, whiteSpace: 'nowrap' };
  const tdStyle = { padding: isMobile ? '8px 6px' : '10px 12px', fontSize: isMobile ? 11 : 13 };

  return (
    <div className="fade-in">
      {/* 탭 + 월 선택 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'daily', label: '📊 일자별' },
            { id: 'customer', label: '👥 고객별' },
            { id: 'balance', label: '💰 잔액 관리' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: tab === t.id ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
              background: tab === t.id ? '#2563eb' : 'white', color: tab === t.id ? 'white' : '#64748b',
              whiteSpace: 'nowrap',
            }}>{t.label}</button>
          ))}
        </div>
        {tab !== 'balance' && (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        )}
      </div>

      {/* ============================== 일자별 / 고객별 (기존) ============================== */}
      {(tab === 'daily' || tab === 'customer') && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 8 : 14, marginBottom: 20 }}>
            {[
              { label: '총 이용금액', value: `${Number(cs.total_fare || 0).toLocaleString()}원`, color: '#2563eb' },
              { label: '마일리지 발생', value: `${Number(cs.mileage_earned || 0).toLocaleString()}원`, color: '#16a34a' },
              { label: '마일리지 사용', value: `${Number(cs.mileage_used || 0).toLocaleString()}원`, color: '#ef4444' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: isMobile ? 12 : 20, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: isMobile ? 10 : 12, color: '#94a3b8', fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: isMobile ? 16 : 28, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {tab === 'daily' ? (
            <>
              <div style={{ background: 'white', borderRadius: 14, padding: isMobile ? 16 : 24, border: '1px solid #f1f5f9', marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>일자별 매출 & 마일리지</div>
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} interval={isMobile ? 2 : 0} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} width={40} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={v => [`${Number(v).toLocaleString()}원`]} />
                    <Bar dataKey="이용금액" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="마일리지" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: isMobile ? 400 : 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 500 : 'auto' }}>
                    <thead>
                      <tr>
                        {['일자', '건수', '이용금액', '현금결제', 'M결제', 'M발생'].map(h => (
                          <th key={h} style={{ ...thStyle, textAlign: h === '일자' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(daily.data || []).map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ ...tdStyle }}>{(d.date || '').slice(5)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{d.ride_count}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>{Number(d.total_fare || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(d.total_cash || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#94a3b8' }}>{Number(d.total_mileage_used || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(d.total_mileage_earned || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 검색..."
                  style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, width: isMobile ? '100%' : 280, outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <button
                  onClick={() => exportToExcel(filteredCustomers, MILEAGE_COLUMNS, `고객마일리지_${month}`)}
                  disabled={filteredCustomers.length === 0}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: filteredCustomers.length === 0 ? '#cbd5e1' : '#16a34a',
                    color: 'white', fontSize: 13, fontWeight: 700,
                    cursor: filteredCustomers.length === 0 ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >⬇️ Excel</button>
              </div>

              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: isMobile ? 500 : 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
                    <thead>
                      <tr>
                        {['#', '고객코드', '고객명', '건수', '이용금액', 'M발생', 'M사용', '잔액'].map(h => (
                          <th key={h} style={{ ...thStyle, textAlign: ['#','고객코드','고객명'].includes(h) ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ ...tdStyle, color: '#94a3b8' }}>{i + 1}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{c.customer_code || '-'}</td>
                          <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.name}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{c.ride_count || 0}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>{Number(c.total_fare || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>+{Number(c.mileage_earned || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#ef4444' }}>{Number(c.mileage_used || 0).toLocaleString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(c.mileage_balance || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>고객 데이터가 없습니다.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ============================== 잔액 관리 (신규) ============================== */}
      {tab === 'balance' && (
        <>
          {/* 통계 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 14, marginBottom: 20 }}>
            {[
              { label: '총 누적 잔액', value: KRW(balanceSummary?.total_balance ?? balanceSummary?.totalBalance ?? 0), color: '#10b981' },
              { label: '보유 고객 수', value: `${(balanceSummary?.customers_with_balance ?? balanceSummary?.customerCount ?? 0).toLocaleString()}명`, color: '#2563eb' },
              { label: '누적 적립', value: KRW(balanceSummary?.total_earned ?? balanceSummary?.totalEarned ?? 0), color: '#f59e0b' },
              { label: '누적 사용', value: KRW(balanceSummary?.total_used ?? balanceSummary?.totalUsed ?? 0), color: '#a855f7' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: isMobile ? 12 : 20, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: isMobile ? 10 : 12, color: '#94a3b8', fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: isMobile ? 14 : 22, fontWeight: 900, color: c.color, marginTop: 4 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* 서브 탭: 고객 잔액 / 거래 이력 */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
            <button onClick={() => setShowTxView(false)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'transparent',
              color: !showTxView ? '#2563eb' : '#94a3b8',
              borderBottom: !showTxView ? '2px solid #2563eb' : '2px solid transparent',
            }}>고객 잔액</button>
            <button onClick={() => setShowTxView(true)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: 'transparent',
              color: showTxView ? '#2563eb' : '#94a3b8',
              borderBottom: showTxView ? '2px solid #2563eb' : '2px solid transparent',
            }}>거래 이력</button>
          </div>

          {!showTxView ? (
            <>
              {/* 필터 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="고객명/전화 검색"
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, flex: 1, minWidth: 180, outline: 'none' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b' }}>
                  <input type="checkbox" checked={hasBalanceOnly} onChange={(e) => setHasBalanceOnly(e.target.checked)} />
                  잔액 보유만
                </label>
                <select value={balanceSortKey} onChange={(e) => setBalanceSortKey(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                  <option value="balance_desc">잔액 많은 순</option>
                  <option value="balance_asc">잔액 적은 순</option>
                  <option value="name_asc">이름순</option>
                </select>
                <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>
                  {balanceLoading ? '로딩 중...' : `${sortedBalanceList.length}명`}
                </span>
              </div>

              {/* 잔액 목록 */}
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: isMobile ? 500 : 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>고객명</th>
                        {!isMobile && <th style={{ ...thStyle, textAlign: 'left' }}>고객코드</th>}
                        <th style={{ ...thStyle, textAlign: 'right' }}>잔액</th>
                        <th style={{ ...thStyle, width: 30 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceLoading && (
                        <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
                      )}
                      {!balanceLoading && sortedBalanceList.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>결과 없음</td></tr>
                      )}
                      {!balanceLoading && sortedBalanceList.map((c) => (
                        <tr key={c.customer_id || c.id}
                          onClick={() => openDetail(c)}
                          style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#ecfdf5'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name || '-'}</td>
                          {!isMobile && <td style={{ ...tdStyle, color: '#94a3b8' }}>{c.customer_code || '-'}</td>}
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                            {KRW(c.mileage_balance)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: '#cbd5e1' }}>›</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 거래 이력 필터 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="month" value={txMonth} onChange={(e) => setTxMonth(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <select value={txType} onChange={(e) => setTxType(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                  <option value="">전체</option>
                  <option value="EARN">적립만</option>
                  <option value="USE">사용만</option>
                </select>
                <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>
                  {txLoading ? '로딩 중...' : `${txList.length}건`}
                </span>
              </div>

              {/* 거래 이력 테이블 */}
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: isMobile ? 500 : 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>일시</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>고객</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>구분</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>금액</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>잔액</th>
                        {!isMobile && <th style={{ ...thStyle, textAlign: 'left' }}>설명</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {txLoading && (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
                      )}
                      {!txLoading && txList.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>거래 없음</td></tr>
                      )}
                      {!txLoading && txList.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ ...tdStyle, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDateTime(t.created_at)}</td>
                          <td style={{ ...tdStyle }}>{t.customer_name || `#${t.customer_id}`}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <TypeBadge type={t.type} />
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: t.type === 'EARN' ? '#10b981' : '#dc2626' }}>
                            {t.type === 'EARN' ? '+' : '-'}{KRW(t.amount)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>{KRW(t.balance_after)}</td>
                          {!isMobile && <td style={{ ...tdStyle, color: '#94a3b8' }}>{t.description || '-'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== 고객 상세 모달 ===== */}
      {detailOpen && detailCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={closeDetail}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 헤더 */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{detailCustomer.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {detailCustomer.customer_code || ''} {detailCustomer.phone ? `· ${detailCustomer.phone}` : ''}
                </div>
              </div>
              <button onClick={closeDetail} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {/* 잔액 카드 */}
              <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>현재 잔액</div>
                <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, fontFamily: 'monospace' }}>
                  {detailLoading ? '...' : KRW(pickBalance(detailData) || detailCustomer.mileage_balance)}
                </div>
              </div>

              {/* 수동 조정 */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>수동 조정</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select value={adjType} onChange={(e) => setAdjType(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                    <option value="EARN">+ 적립</option>
                    <option value="USE">- 차감</option>
                  </select>
                  <input type="number" placeholder="금액" value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)} step="1000"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace', outline: 'none' }} />
                </div>
                <input type="text" placeholder="사유 (선택)" value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 8, outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={submitAdjust} disabled={adjBusy}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: adjBusy ? '#cbd5e1' : '#10b981', color: 'white', fontSize: 13, fontWeight: 700, cursor: adjBusy ? 'not-allowed' : 'pointer' }}>
                  {adjBusy ? '처리 중...' : '적용'}
                </button>
              </div>

              {/* 거래 이력 */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>거래 이력 (최근 100건)</div>
              <div style={{ border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>일시</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>구분</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>금액</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailLoading && (
                      <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
                    )}
                    {!detailLoading && (() => {
                      const txs = detailData?.transactions || detailData?.history
                        || (detailData?.data?.transactions) || (detailData?.data?.history) || [];
                      if (txs.length === 0) {
                        return <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>거래 없음</td></tr>;
                      }
                      return txs.map((t) => (
                        <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(t.created_at)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}><TypeBadge type={t.type} /></td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: t.type === 'EARN' ? '#10b981' : '#dc2626' }}>
                            {t.type === 'EARN' ? '+' : '-'}{KRW(t.amount)}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>{KRW(t.balance_after)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  if (type === 'EARN') {
    return <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4, background: '#dcfce7', color: '#166534' }}>적립</span>;
  }
  if (type === 'USE') {
    return <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4, background: '#fee2e2', color: '#991b1b' }}>사용</span>;
  }
  return <span style={{ color: '#94a3b8' }}>{type}</span>;
}
