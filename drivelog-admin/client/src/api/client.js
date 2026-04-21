import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((res) => res, async (error) => {
  const orig = error.config;
  if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
    orig._retry = true;
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); window.location.href = '/login'; }
  }
  return Promise.reject(error);
});

export const login = (body) => api.post('/auth/login', body).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const logout = () => api.post('/auth/logout').then(r => r.data);
export const changePassword = (body) => api.put('/auth/change-password', body).then(r => r.data);

// 아이디 찾기 / 비밀번호 찾기 (공개 엔드포인트 — 인증 불필요)
export const findUserId = (body) => axios.post('/api/public/find-id', body).then(r => r.data);
export const requestPasswordReset = (body) => axios.post('/api/public/request-password-reset', body).then(r => r.data);
// MASTER/SUPER_ADMIN 임시비번 발급
export const issueTempPassword = (userId) => api.post(`/users/${userId}/issue-temp-password`).then(r => r.data);

export const fetchRides = (params) => api.get('/rides', { params }).then(r => r.data);
export const createRide = (body) => api.post('/rides', body).then(r => r.data);
export const updateRide = (id, body) => api.put(`/rides/${id}`, body).then(r => r.data);

export const fetchDailyStats = (params) => api.get('/stats/daily', { params }).then(r => r.data);
export const fetchPartnerStats = (params) => api.get('/stats/partners', { params }).then(r => r.data);
export const fetchMileageStats = (params) => api.get('/stats/mileage', { params }).then(r => r.data);

export const fetchUsers = (params) => api.get('/users', { params }).then(r => r.data);
export const fetchRiders = () => api.get('/users/riders').then(r => r.data);
export const fetchRiderLimit = (params) => api.get('/users/rider-limit', { params }).then(r => r.data);
export const fetchMasterCount = () => api.get('/users/master-count').then(r => r.data);
export const createUser = (body) => api.post('/users', body).then(r => r.data);
export const updateUser = (id, body) => api.put(`/users/${id}`, body).then(r => r.data);
export const unlockUser = (id) => api.put(`/users/${id}/unlock`).then(r => r.data);
export const resetUserPassword = (id, body) => api.put(`/users/${id}/reset-password`, body).then(r => r.data);

export const fetchCustomers = (params) => api.get('/customers', { params }).then(r => r.data);
export const createCustomer = (body) => api.post('/customers', body).then(r => r.data);

export const fetchPartners = (params) => api.get('/partners', { params }).then(r => r.data);
export const createPartner = (body) => api.post('/partners', body).then(r => r.data);
export const updatePartner = (id, body) => api.put(`/partners/${id}`, body).then(r => r.data);

export const fetchSettlements = (params) => api.get('/settlements', { params }).then(r => r.data);
export const previewSettlements = (params) => api.get('/settlements/preview', { params }).then(r => r.data);
export const generateSettlements = (body) => api.post('/settlements/generate', body).then(r => r.data);
export const approveSettlement = (id) => api.put(`/settlements/${id}/approve`).then(r => r.data);
export const paySettlement = (id) => api.put(`/settlements/${id}/pay`).then(r => r.data);

export const fetchFarePolicies = () => api.get('/fare-policies').then(r => r.data);
export const createFarePolicy = (body) => api.post('/fare-policies', body).then(r => r.data);
export const updateFarePolicy = (id, body) => api.put(`/fare-policies/${id}`, body).then(r => r.data);

export const fetchBilling = (params) => api.get('/billing', { params }).then(r => r.data);
export const generateBilling = (body) => api.post('/billing/generate', body).then(r => r.data);
export const payBilling = (id) => api.put(`/billing/${id}/pay`).then(r => r.data);
export const updateBillingMemo = (id, body) => api.put(`/billing/${id}/memo`, body).then(r => r.data);

export const fetchBillingPlans = (params) => api.get('/billing-plans', { params }).then(r => r.data);
export const createBillingPlan = (body) => api.post('/billing-plans', body).then(r => r.data);
export const updateBillingPlan = (id, body) => api.put(`/billing-plans/${id}`, body).then(r => r.data);
export const changePlanPrice = (id, body) => api.put(`/billing-plans/${id}/price`, body).then(r => r.data);
export const fetchPlanPriceHistory = (id) => api.get(`/billing-plans/${id}/price-history`).then(r => r.data);
export const fetchSeasonalRates = (id) => api.get(`/billing-plans/${id}/seasonal`).then(r => r.data);
export const createSeasonalRate = (id, body) => api.post(`/billing-plans/${id}/seasonal`, body).then(r => r.data);
export const updateSeasonalRate = (id, body) => api.put(`/billing-plans/seasonal/${id}`, body).then(r => r.data);
export const deleteSeasonalRate = (id) => api.delete(`/billing-plans/seasonal/${id}`).then(r => r.data);
export const fetchAllPlanHistory = () => api.get('/billing-plans/history/all').then(r => r.data);

export const fetchCompanies = (params) => api.get('/companies', { params }).then(r => r.data);
export const createCompany = (body) => api.post('/companies', body).then(r => r.data);
export const updateCompany = (id, body) => api.put(`/companies/${id}`, body).then(r => r.data);
export const changeCompanyPlan = (id, body) => api.put(`/companies/${id}/plan`, body).then(r => r.data);
export const fetchCompanyPlanHistory = (id) => api.get(`/companies/${id}/plan-history`).then(r => r.data);
export const approveCompany = (id) => api.put(`/companies/${id}/approve`).then(r => r.data);
export const suspendCompany = (id) => api.put(`/companies/${id}/suspend`).then(r => r.data);

export const fetchPaymentTypes = (params) => api.get('/payment-types', { params }).then(r => r.data);
export const createPaymentType = (body) => api.post('/payment-types', body).then(r => r.data);
export const updatePaymentType = (id, body) => api.put(`/payment-types/${id}`, body).then(r => r.data);
export const deletePaymentType = (id) => api.delete(`/payment-types/${id}`).then(r => r.data);

// 정산 그룹
export const fetchSettlementGroups = (params) => api.get('/settlement-groups', { params }).then(r => r.data);
export const createSettlementGroup = (body) => api.post('/settlement-groups', body).then(r => r.data);
export const updateSettlementGroup = (id, body) => api.put(`/settlement-groups/${id}`, body).then(r => r.data);
export const deleteSettlementGroup = (id) => api.delete(`/settlement-groups/${id}`).then(r => r.data);

// 일일 운임 정산
export const fetchDailySettlement = (params) => api.get('/settlements/daily', { params }).then(r => r.data);
// 월별 기사 정산 내역서
export const fetchMonthlyPayout = (params) => api.get('/settlements/monthly-payout', { params }).then(r => r.data);

// 근무시간 (rider_attendance) — 양양대리 같은 시급제 업체용
export const fetchAttendance = (params) => api.get('/pay-settings/attendance', { params }).then(r => r.data);
export const createAttendance = (body) => api.post('/pay-settings/attendance', body).then(r => r.data);
export const updateAttendance = (id, body) => api.put(`/pay-settings/attendance/${id}`, body).then(r => r.data);
export const deleteAttendance = (id) => api.delete(`/pay-settings/attendance/${id}`).then(r => r.data);

// 마일리지 시스템 (customer_mileage 기반)
export const fetchMileageList = (params) => api.get('/mileage', { params }).then(r => r.data);
export const fetchMileageSummary = (params) => api.get('/mileage/summary', { params }).then(r => r.data);
export const fetchCustomerMileage = (id) => api.get(`/mileage/customer/${id}`).then(r => r.data);
export const adjustMileage = (body) => api.post('/mileage/adjust', body).then(r => r.data);
export const fetchMileageTransactions = (params) => api.get('/mileage/transactions', { params }).then(r => r.data);

export const fetchPermissions = () => api.get('/permissions').then(r => r.data);
export const bulkUpdatePermissions = (body) => api.put('/permissions/bulk/update', body).then(r => r.data);
export const fetchCompanyPermissions = (companyId) => api.get(`/permissions/company/${companyId}`).then(r => r.data);
export const saveCompanyPermissions = (companyId, body) => api.put(`/permissions/company/${companyId}`, body).then(r => r.data);
export const resetCompanyPermissions = (companyId) => api.delete(`/permissions/company/${companyId}`).then(r => r.data);

export const fetchSystemSettings = () => api.get('/system-settings').then(r => r.data);
export const updateSystemSetting = (key, body) => api.put(`/system-settings/${key}`, body).then(r => r.data);
export const fetchPaymentInfo = () => api.get('/system-settings/payment-info').then(r => r.data);

export const fetchPaySettings = (params) => api.get('/pay-settings', { params }).then(r => r.data);
export const savePaySettings = (body) => api.put('/pay-settings', body).then(r => r.data);
export const fetchRiderPayRates = (params) => api.get('/pay-settings/riders', { params }).then(r => r.data);
export const saveRiderPayRate = (riderId, body) => api.put(`/pay-settings/riders/${riderId}`, body).then(r => r.data);

export const fetchInquiries = (params) => api.get('/inquiries', { params }).then(r => r.data);
export const createInquiry = (body) => api.post('/inquiries', body).then(r => r.data);
export const replyInquiry = (id, body) => api.put(`/inquiries/${id}/reply`, body).then(r => r.data);
export const updateInquiryStatus = (id, body) => api.put(`/inquiries/${id}/status`, body).then(r => r.data);

export const fetchMonthlyReport = (params) => api.get('/stats/monthly-report', { params }).then(r => r.data);
export const fetchMasterDashboard = (params) => api.get('/stats/master-dashboard', { params }).then(r => r.data);

// 콜 관리
export const fetchCalls = (params) => api.get('/calls', { params }).then(r => r.data);
export const fetchCallWaitingCount = () => api.get('/calls/waiting-count').then(r => r.data);
export const fetchFrequentAddresses = (params) => api.get('/calls/frequent-addresses', { params }).then(r => r.data);
export const createCall = (body) => api.post('/calls', body).then(r => r.data);
export const updateCall = (id, body) => api.put(`/calls/${id}`, body).then(r => r.data);
export const acceptCall = (id) => api.put(`/calls/${id}/accept`).then(r => r.data);
export const completeCall = (id, body) => api.put(`/calls/${id}/complete`, body).then(r => r.data);
export const cancelCall = (id, body) => api.put(`/calls/${id}/cancel`, body).then(r => r.data);

// 푸시 알림 (Web Push) — 2026-04-22 추가
export const fetchPushPublicKey = () => api.get('/push/public-key').then(r => r.data);
export const subscribePush = (body) => api.post('/push/subscribe', body).then(r => r.data);
export const unsubscribePush = (body) => api.post('/push/unsubscribe', body).then(r => r.data);
export const testPush = () => api.post('/push/test').then(r => r.data);

// 감사 로그
export const fetchAuditLogs = (params) => api.get('/audit-logs', { params }).then(r => r.data);
export const fetchAuditLogActions = () => api.get('/audit-logs/actions').then(r => r.data);
export const fetchAuditLogStats = (params) => api.get('/audit-logs/stats', { params }).then(r => r.data);

export default api;
