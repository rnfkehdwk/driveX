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

export default api;
