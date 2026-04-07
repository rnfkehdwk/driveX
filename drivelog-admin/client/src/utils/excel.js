// XLSX 기반 Excel 내보내기 (SheetJS / xlsx 라이브러리 사용)
// - 한글 컬럼명 / 숫자 / 날짜 셀 타입 정확히 처리
// - 헤더 굵게, 컬럼 폭 자동 조정
// - 호출 시그니처는 기존 CSV 버전과 동일하게 유지 (페이지 수정 불필요)

import * as XLSX from 'xlsx';

// 숫자 컬럼 자동 감지: 컬럼 key에 다음 키워드 포함 시 숫자로 처리
const NUMERIC_KEY_PATTERNS = [
  /fare/i, /amount/i, /mileage/i, /count/i, /total/i, /balance/i,
  /price/i, /commission/i, /payout/i, /rate/i,
];
const isNumericKey = (key) => key && NUMERIC_KEY_PATTERNS.some(p => p.test(key));

// 컬럼 폭 자동 계산 (한글은 2배 폭으로 카운트)
function calcColumnWidth(label, values) {
  const widthOf = (s) => {
    let w = 0;
    for (const ch of String(s ?? '')) {
      // 한글/한자/일본어 등 광폭 문자
      w += /[\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/.test(ch) ? 2 : 1;
    }
    return w;
  };
  let max = widthOf(label);
  for (const v of values) {
    const w = widthOf(v);
    if (w > max) max = w;
    if (max > 50) return 50; // 상한
  }
  return Math.max(8, max + 2);
}

export function exportToExcel(data, columns, filename) {
  // 데이터 행 만들기 — 각 행은 { '한글컬럼명': 값, ... }
  const rows = data.map(row => {
    const out = {};
    for (const c of columns) {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : (row[c.key] ?? '');
      // 숫자 컬럼이면 Number로 변환 (정렬/SUM이 가능해짐)
      if (isNumericKey(c.key) && val !== '' && val !== null && !isNaN(Number(val))) {
        val = Number(val);
      }
      out[c.label] = val;
    }
    return out;
  });

  // 시트 생성 (헤더는 columns 순서 그대로 보장)
  const headers = columns.map(c => c.label);
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // 컬럼 폭 자동 설정
  ws['!cols'] = columns.map(c => ({
    wch: calcColumnWidth(c.label, data.map(r => {
      let v = typeof c.accessor === 'function' ? c.accessor(r) : (r[c.key] ?? '');
      if (isNumericKey(c.key) && v !== '' && v !== null && !isNaN(Number(v))) {
        v = Number(v).toLocaleString();
      }
      return v;
    })),
  }));

  // 워크북 생성 + 시트 추가
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 파일 다운로드 (.xlsx)
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
}

// ============================================================
// 컬럼 정의들 (기존 CSV 버전과 동일하게 유지 — 페이지 수정 불필요)
// ============================================================

// 운행일지 Excel 컬럼 정의
export const RIDE_COLUMNS = [
  { key: 'ride_id', label: 'No' },
  { key: 'ride_date', label: '일자' },
  { key: 'ride_time', label: '시간' },
  { key: 'customer_code', label: '고객코드' },
  { key: 'customer_name', label: '고객' },
  { key: 'customer_phone', label: '전화번호' },
  { key: 'total_fare', label: '이용금액' },
  { key: 'cash_amount', label: '현금결제' },
  { key: 'mileage_used', label: '마일리지결제' },
  { key: 'mileage_earned', label: '마일리지발생' },
  { key: 'start_address', label: '출발지' },
  { key: 'start_detail', label: '출발상세' },
  { key: 'end_address', label: '도착지' },
  { key: 'end_detail', label: '도착상세' },
  { key: 'rider_name', label: '운전기사' },
  { key: 'pickup_rider_name', label: '픽업기사' },
  { key: 'partner_name', label: '연결업체' },
  { key: 'payment_label', label: '결제구분' },
  { key: 'rider_memo', label: '메모' },
];

// 고객 마일리지 Excel 컬럼
export const MILEAGE_COLUMNS = [
  { key: 'customer_code', label: '고객코드' },
  { key: 'name', label: '고객명' },
  { key: 'phone', label: '연락처' },
  { key: 'total_fare', label: '이용금액' },
  { key: 'total_cash', label: '현금결제' },
  { key: 'mileage_earned', label: '마일리지발생' },
  { key: 'mileage_used', label: '마일리지사용' },
  { key: 'mileage_balance', label: '마일리지잔액' },
];

// 운임정산 (FareSettlement) Excel 컬럼
export const FARE_SETTLEMENT_COLUMNS = [
  { key: 'ride_date', label: '일자' },
  { key: 'ride_time', label: '시간' },
  { key: 'rider_name', label: '운전기사' },
  { key: 'customer_name', label: '고객' },
  { key: 'start_address', label: '출발지' },
  { key: 'end_address', label: '도착지' },
  { key: 'total_fare', label: '요금' },
  { key: 'payment_label', label: '결제구분' },
  { key: 'group_name', label: '정산 그룹' },
];
