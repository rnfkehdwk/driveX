// Mock data derived from 운행일지어플.xlsx
// In production, these would come from MariaDB via rides, customers, users, partner_companies tables

const rides = [
  { ride_id: 1, date: "2025-10-02", time: "00:00", customer_code: "나라시", customer_name: "나라시", phone: "", total_fare: 15000, cash_amount: 15000, mileage_used: 0, mileage_earned: 1500, start_address: "", end_address: "", rider_name: "", pickup_rider_name: "", partner_name: "", partner_phone: "", memo: "" },
  { ride_id: 2, date: "2025-10-03", time: "19:25", customer_code: "상광정9702", customer_name: "상광정", phone: "010-9220-9702", total_fare: 30000, cash_amount: 30000, mileage_used: 0, mileage_earned: 3000, start_address: "녹원갈비", end_address: "엘스테이1차", rider_name: "손영만", pickup_rider_name: "이성일", partner_name: "", partner_phone: "", memo: "" },
  { ride_id: 3, date: "2025-10-03", time: "19:35", customer_code: "무명", customer_name: "무명", phone: "", total_fare: 40000, cash_amount: 40000, mileage_used: 0, mileage_earned: 4000, start_address: "녹원갈비", end_address: "설악동C1지구주차장", rider_name: "임창빈", pickup_rider_name: "이성일", partner_name: "녹원갈비", partner_phone: "", memo: "" },
  { ride_id: 4, date: "2025-10-03", time: "20:00", customer_code: "무명", customer_name: "무명", phone: "", total_fare: 35000, cash_amount: 35000, mileage_used: 0, mileage_earned: 3500, start_address: "후진활어센터", end_address: "서울대명2차아파트", rider_name: "임창빈", pickup_rider_name: "이성일", partner_name: "정균", partner_phone: "", memo: "" },
  { ride_id: 5, date: "2025-10-03", time: "20:00", customer_code: "카카오", customer_name: "카카오", phone: "", total_fare: 19000, cash_amount: 19000, mileage_used: 0, mileage_earned: 1900, start_address: "읍내", end_address: "설해원", rider_name: "손영만", pickup_rider_name: "이성일", partner_name: "", partner_phone: "", memo: "" },
  { ride_id: 6, date: "2025-10-03", time: "21:35", customer_code: "카카오", customer_name: "카카오", phone: "", total_fare: 16000, cash_amount: 16000, mileage_used: 0, mileage_earned: 1600, start_address: "읍내", end_address: "양양이편한세상", rider_name: "손영만", pickup_rider_name: "이성일", partner_name: "", partner_phone: "", memo: "" },
  { ride_id: 7, date: "2025-10-03", time: "22:35", customer_code: "무명", customer_name: "무명", phone: "", total_fare: 40000, cash_amount: 40000, mileage_used: 0, mileage_earned: 4000, start_address: "후진활어센터", end_address: "Seo-myeon, 논화리", rider_name: "임창빈", pickup_rider_name: "이성일", partner_name: "정균", partner_phone: "", memo: "" },
  { ride_id: 8, date: "2025-10-03", time: "22:35", customer_code: "무명", customer_name: "무명", phone: "", total_fare: 20000, cash_amount: 20000, mileage_used: 0, mileage_earned: 2000, start_address: "카오스", end_address: "읍내", rider_name: "임창빈", pickup_rider_name: "이성일", partner_name: "카오스", partner_phone: "010-3459-2360", memo: "" },
  { ride_id: 9, date: "2025-10-03", time: "22:35", customer_code: "나라시", customer_name: "나라시", phone: "", total_fare: 15000, cash_amount: 15000, mileage_used: 0, mileage_earned: 1500, start_address: "읍내", end_address: "카오스", rider_name: "이성일", pickup_rider_name: "", partner_name: "카오스", partner_phone: "010-3459-2360", memo: "" },
];

const dailyStats = [
  { date: "2025-10-02", total_fare: 15000, ride_count: 1, partner_calls: 0, mileage_earned: 1500 },
  { date: "2025-10-03", total_fare: 215000, ride_count: 8, partner_calls: 5, mileage_earned: 21500 },
  { date: "2025-10-04", total_fare: 70000, ride_count: 3, partner_calls: 1, mileage_earned: 7000 },
  { date: "2025-10-05", total_fare: 238000, ride_count: 8, partner_calls: 5, mileage_earned: 23800 },
  { date: "2025-10-06", total_fare: 225000, ride_count: 7, partner_calls: 4, mileage_earned: 22500 },
  { date: "2025-10-07", total_fare: 120000, ride_count: 4, partner_calls: 2, mileage_earned: 12000 },
  { date: "2025-10-08", total_fare: 110000, ride_count: 4, partner_calls: 2, mileage_earned: 11000 },
  { date: "2025-10-09", total_fare: 125000, ride_count: 5, partner_calls: 5, mileage_earned: 12500 },
  { date: "2025-10-10", total_fare: 155000, ride_count: 5, partner_calls: 4, mileage_earned: 15500 },
  { date: "2025-10-11", total_fare: 185000, ride_count: 6, partner_calls: 5, mileage_earned: 18500 },
  { date: "2025-10-12", total_fare: 25000, ride_count: 1, partner_calls: 1, mileage_earned: 2500 },
  { date: "2025-10-14", total_fare: 65000, ride_count: 2, partner_calls: 1, mileage_earned: 6500 },
  { date: "2025-10-16", total_fare: 350000, ride_count: 10, partner_calls: 7, mileage_earned: 35000 },
  { date: "2025-10-17", total_fare: 115000, ride_count: 4, partner_calls: 3, mileage_earned: 11500 },
  { date: "2025-10-18", total_fare: 250000, ride_count: 7, partner_calls: 5, mileage_earned: 25000 },
  { date: "2025-10-19", total_fare: 110000, ride_count: 4, partner_calls: 0, mileage_earned: 11000 },
  { date: "2025-10-20", total_fare: 60000, ride_count: 2, partner_calls: 0, mileage_earned: 6000 },
  { date: "2025-10-21", total_fare: 100000, ride_count: 3, partner_calls: 0, mileage_earned: 10000 },
  { date: "2025-10-22", total_fare: 225000, ride_count: 7, partner_calls: 2, mileage_earned: 22500 },
  { date: "2025-10-23", total_fare: 305000, ride_count: 9, partner_calls: 4, mileage_earned: 30500 },
  { date: "2025-10-24", total_fare: 215000, ride_count: 6, partner_calls: 1, mileage_earned: 21500 },
  { date: "2025-10-25", total_fare: 225000, ride_count: 7, partner_calls: 1, mileage_earned: 22500 },
  { date: "2025-10-26", total_fare: 125000, ride_count: 4, partner_calls: 1, mileage_earned: 12500 },
  { date: "2025-10-27", total_fare: 165000, ride_count: 5, partner_calls: 4, mileage_earned: 16500 },
  { date: "2025-10-28", total_fare: 160000, ride_count: 5, partner_calls: 4, mileage_earned: 16000 },
  { date: "2025-10-29", total_fare: 70000, ride_count: 2, partner_calls: 1, mileage_earned: 7000 },
  { date: "2025-10-30", total_fare: 168000, ride_count: 5, partner_calls: 2, mileage_earned: 16800 },
  { date: "2025-10-31", total_fare: 195000, ride_count: 6, partner_calls: 2, mileage_earned: 19500 },
];

const partnerCalls = [
  { name: "카오스", calls: 32 }, { name: "정균", calls: 8 }, { name: "다래횟집", calls: 8 },
  { name: "박정균", calls: 3 }, { name: "녹원갈비", calls: 3 }, { name: "크리스탈", calls: 3 },
  { name: "발리", calls: 2 }, { name: "한우랑송이랑", calls: 2 }, { name: "시골마당", calls: 2 },
  { name: "38횟집", calls: 3 }, { name: "낙산장어", calls: 1 }, { name: "봄날", calls: 1 },
];

const customerMileage = [
  { customer_code: "고현순", total_fare: 385000, cash: 385000, mileage_earned: 38500, mileage_used: 0 },
  { customer_code: "그린막국수", total_fare: 325000, cash: 325000, mileage_earned: 32500, mileage_used: 0 },
  { customer_code: "김영삼", total_fare: 175000, cash: 175000, mileage_earned: 17500, mileage_used: 0 },
  { customer_code: "나라시", total_fare: 165000, cash: 165000, mileage_earned: 16500, mileage_used: 0 },
  { customer_code: "김봉열", total_fare: 100000, cash: 100000, mileage_earned: 10000, mileage_used: 0 },
  { customer_code: "기사문배사장님", total_fare: 80000, cash: 80000, mileage_earned: 8000, mileage_used: 0 },
  { customer_code: "김대희", total_fare: 55000, cash: 55000, mileage_earned: 5500, mileage_used: 0 },
  { customer_code: "군인", total_fare: 55000, cash: 55000, mileage_earned: 5500, mileage_used: 0 },
  { customer_code: "김삼호", total_fare: 50000, cash: 50000, mileage_earned: 5000, mileage_used: 0 },
  { customer_code: "강현지에스", total_fare: 45000, cash: 45000, mileage_earned: 4500, mileage_used: 0 },
];

module.exports = { rides, dailyStats, partnerCalls, customerMileage };
