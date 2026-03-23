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

export const fetchRides = (params) => api.get('/rides', { params }).then(r => r.data);
export const createRide = (body) => api.post('/rides', body).then(r => r.data);
export const updateRide = (id, body) => api.put(`/rides/${id}`, body).then(r => r.data);

export const fetchDailyStats = (params) => api.get('/stats/daily', { params }).then(r => r.data);
export const fetchPartnerStats = (params) => api.get('/stats/partners', { params }).then(r => r.data);
export const fetchMileageStats = (params) => api.get('/stats/mileage', { params }).then(r => r.data);

export const fetchUsers = (params) => api.get('/users', { params }).then(r => r.data);
export const fetchRiders = () => api.get('/users/riders').then(r => r.data);
export const createUser = (body) => api.post('/users', body).then(r => r.data);
export const updateUser = (id, body) => api.put(`/users/${id}`, body).then(r => r.data);

export const fetchCustomers = (params) => api.get('/customers', { params }).then(r => r.data);
export const createCustomer = (body) => api.post('/customers', body).then(r => r.data);

export const fetchPartners = (params) => api.get('/partners', { params }).then(r => r.data);
export const createPartner = (body) => api.post('/partners', body).then(r => r.data);
export const updatePartner = (id, body) => api.put(`/partners/${id}`, body).then(r => r.data);

export const fetchSettlements = (params) => api.get('/settlements', { params }).then(r => r.data);
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

export const fetchCompanies = (params) => api.get('/companies', { params }).then(r => r.data);
export const createCompany = (body) => api.post('/companies', body).then(r => r.data);
export const updateCompany = (id, body) => api.put(`/companies/${id}`, body).then(r => r.data);
export const approveCompany = (id) => api.put(`/companies/${id}/approve`).then(r => r.data);
export const suspendCompany = (id) => api.put(`/companies/${id}/suspend`).then(r => r.data);

export const fetchPaymentTypes = (params) => api.get('/payment-types', { params }).then(r => r.data);
export const createPaymentType = (body) => api.post('/payment-types', body).then(r => r.data);
export const updatePaymentType = (id, body) => api.put(`/payment-types/${id}`, body).then(r => r.data);
export const deletePaymentType = (id) => api.delete(`/payment-types/${id}`).then(r => r.data);

// Permissions (통합권한관리)
export const fetchPermissions = () => api.get('/permissions').then(r => r.data);
export const bulkUpdatePermissions = (body) => api.put('/permissions/bulk/update', body).then(r => r.data);
export const fetchCompanyPermissions = (companyId) => api.get(`/permissions/company/${companyId}`).then(r => r.data);
export const saveCompanyPermissions = (companyId, body) => api.put(`/permissions/company/${companyId}`, body).then(r => r.data);
export const resetCompanyPermissions = (companyId) => api.delete(`/permissions/company/${companyId}`).then(r => r.data);

export default api;
