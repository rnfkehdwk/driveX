import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('accessToken');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(r => r, async (err) => {
  const orig = err.config;
  if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
    orig._retry = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken: rt });
      localStorage.setItem('accessToken', data.accessToken);
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); window.location.href = '/m/login'; }
  }
  return Promise.reject(err);
});

export const login = (b) => api.post('/auth/login', b).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);
export const apiLogout = () => api.post('/auth/logout').then(r => r.data);
export const changePassword = (b) => api.put('/auth/change-password', b).then(r => r.data);

export const fetchRides = (p) => api.get('/rides', { params: p }).then(r => r.data);
export const createRide = (b) => api.post('/rides', b).then(r => r.data);

export const fetchRiders = () => api.get('/users/riders').then(r => r.data);
export const fetchUsers = (p) => api.get('/users', { params: p }).then(r => r.data);
export const createUser = (b) => api.post('/users', b).then(r => r.data);

export const fetchCustomers = (p) => api.get('/customers', { params: p }).then(r => r.data);
export const createCustomer = (b) => api.post('/customers', b).then(r => r.data);

export const fetchPartners = (p) => api.get('/partners', { params: p }).then(r => r.data);
export const createPartner = (b) => api.post('/partners', b).then(r => r.data);
export const updatePartner = (id, b) => api.put(`/partners/${id}`, b).then(r => r.data);

export const fetchPaymentTypes = (p) => api.get('/payment-types', { params: p }).then(r => r.data);

export const createInquiry = (b) => api.post('/inquiries', b).then(r => r.data);

// 콜 관리
export const fetchCalls = (p) => api.get('/calls', { params: p }).then(r => r.data);
export const fetchCallWaitingCount = () => api.get('/calls/waiting-count').then(r => r.data);
export const fetchFrequentAddresses = (p) => api.get('/calls/frequent-addresses', { params: p }).then(r => r.data);
export const createCall = (b) => api.post('/calls', b).then(r => r.data);
export const updateCall = (id, b) => api.put(`/calls/${id}`, b).then(r => r.data);
export const acceptCall = (id) => api.put(`/calls/${id}/accept`).then(r => r.data);
export const completeCall = (id, b) => api.put(`/calls/${id}/complete`, b).then(r => r.data);
export const cancelCall = (id, b) => api.put(`/calls/${id}/cancel`, b).then(r => r.data);

// 마일리지
export const fetchCustomerMileage = (id) => api.get(`/mileage/customer/${id}`).then(r => r.data);

// Web Push 알림
export const fetchPushPublicKey = () => api.get('/push/public-key').then(r => r.data);
export const subscribePush = (b) => api.post('/push/subscribe', b).then(r => r.data);
export const unsubscribePush = (b) => api.post('/push/unsubscribe', b).then(r => r.data);
export const testPush = () => api.post('/push/test').then(r => r.data);

export default api;
