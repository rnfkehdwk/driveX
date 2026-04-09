// ============================================================
// drivelog-mobile/src/components/MileageUseSelect.jsx
// 모바일 운행 작성 화면용 마일리지 사용 선택
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { fetchCustomerMileage } from '../api/client';

const UNIT = 5000;
const KRW = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;

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

const computeMax = (totalFare, balance) => {
  const cap = Math.min(Number(totalFare || 0), Number(balance || 0));
  return Math.floor(cap / UNIT) * UNIT;
};

export default function MileageUseSelect({
  customerId,
  totalFare = 0,
  value = 0,
  onChange,
  earnPct = 10,
}) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // 고객 변경 시 잔액 조회
  useEffect(() => {
    if (!customerId) {
      setBalance(0);
      onChange?.(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCustomerMileage(customerId)
      .then((res) => {
        if (cancelled) return;
        setBalance(pickBalance(res));
      })
      .catch((e) => {
        console.error('[MileageUseSelect] balance load error', e);
        if (!cancelled) setBalance(0);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [customerId]);

  // 운임/잔액 변경 시 현재 선택값 자동 보정
  useEffect(() => {
    const maxAllowed = computeMax(totalFare, balance);
    if (Number(value || 0) > maxAllowed) {
      onChange?.(maxAllowed);
    }
    // eslint-disable-next-line
  }, [totalFare, balance]);

  // 5,000원 단위 옵션
  const options = useMemo(() => {
    const max = computeMax(totalFare, balance);
    const arr = [0];
    for (let v = UNIT; v <= max; v += UNIT) arr.push(v);
    return arr;
  }, [totalFare, balance]);

  const used = Number(value || 0);
  const netFare = Math.max(0, Number(totalFare || 0) - used);
  const earnPreview = Math.floor((netFare * Number(earnPct || 0)) / 100);

  // 고객 미선택 시 안내만
  if (!customerId) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
          마일리지 사용
        </label>
        <div style={{
          background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0',
          padding: '13px 14px', fontSize: 13, color: '#9ca3af',
        }}>
          고객을 먼저 선택하세요
        </div>
      </div>
    );
  }

  // 잔액 0 이면 아예 표시 안 함 (마일리지 없는 고객)
  if (!loading && balance <= 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>마일리지 사용</label>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>잔액 0원</span>
        </div>
        <div style={{
          background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0',
          padding: '13px 14px', fontSize: 12, color: '#9ca3af', textAlign: 'center',
        }}>
          이 고객은 사용 가능한 마일리지가 없습니다
        </div>
      </div>
    );
  }

  // 운임 미입력 상태 (잔액은 있음)
  if (Number(totalFare || 0) < UNIT) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>마일리지 사용</label>
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            잔액 <span style={{ fontWeight: 800, color: '#10b981' }}>
              {loading ? '...' : KRW(balance)}
            </span>
          </span>
        </div>
        <div style={{
          background: '#fffbeb', borderRadius: 12, border: '1.5px solid #fde68a',
          padding: '12px 14px', fontSize: 12, color: '#92400e', textAlign: 'center',
        }}>
          💰 운행 요금을 먼저 입력하면 마일리지 사용 옵션이 나타납니다
        </div>
      </div>
    );
  }

  const disabled = loading || balance < UNIT;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
          마일리지 사용
        </label>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          잔액 <span style={{ fontWeight: 800, color: '#10b981' }}>
            {loading ? '...' : KRW(balance)}
          </span>
        </span>
      </div>

      {/* 5,000원 단위 칩 셀렉터 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        background: '#f8f9fb', borderRadius: 12, border: '1.5px solid #e2e8f0',
        padding: 10, opacity: disabled ? 0.5 : 1,
      }}>
        {options.length === 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', padding: '4px 0' }}>
            {balance < UNIT ? '잔액이 5,000원 미만' : '운임이 5,000원 미만'}
          </div>
        )}
        {options.map((v) => {
          const active = used === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(v)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: active ? '2px solid #10b981' : '1.5px solid #e5e7eb',
                background: active ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
                color: active ? 'white' : '#6b7280',
                whiteSpace: 'nowrap',
              }}
            >
              {v === 0 ? '사용 안 함' : KRW(v)}
            </button>
          );
        })}
      </div>

      {/* 미리보기 */}
      {used > 0 && (
        <div style={{
          marginTop: 8, padding: '10px 12px',
          background: '#ecfdf5', borderRadius: 10, border: '1px solid #a7f3d0',
          fontSize: 12, lineHeight: 1.7,
        }}>
          <Row label="운임 원금" value={KRW(totalFare)} />
          <Row label="마일리지 사용" value={`- ${KRW(used)}`} color="#dc2626" />
          <Row label="실 결제액" value={KRW(netFare)} bold />
          {earnPct > 0 && (
            <Row label={`예상 적립 (${earnPct}%)`} value={`+ ${KRW(earnPreview)}`} color="#059669" />
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{
        fontFamily: 'monospace',
        color: color || '#1f2937',
        fontWeight: bold ? 800 : 600,
      }}>
        {value}
      </span>
    </div>
  );
}
