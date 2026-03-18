// CSV 기반 Excel 내보내기 (xlsx 라이브러리 없이 동작)
// 한글 BOM 포함으로 Excel에서 바로 열 수 있음

export function exportToExcel(data, columns, filename) {
  // BOM for UTF-8 Korean support in Excel
  const BOM = '\uFEFF';

  // Header row
  const header = columns.map(c => `"${c.label}"`).join(',');

  // Data rows
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : (row[c.key] ?? '');
      // Escape quotes
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
