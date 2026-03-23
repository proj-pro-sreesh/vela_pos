import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message?.toLowerCase() || '';
    
    // Only logout on critical auth errors that indicate token is truly invalid
    // Don't logout on: 'No token', 'Invalid credentials', 'User not found' during normal operations
    const criticalAuthErrors = [
      'token is not valid',
      'token invalid',
      'jwt malformed',
      'token expired'
    ];
    
    const isCriticalAuthError = status === 401 && 
      criticalAuthErrors.some(err => message.includes(err));
    
    // Don't logout for auth endpoints (login, etc.)
    const isAuthEndpoint = error.config?.url?.includes('/auth/');
    
    if (status === 401 && isCriticalAuthError && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Category APIs
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getAllAdmin: () => api.get('/categories/all'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Menu APIs
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  getGrouped: () => api.get('/menu/grouped'),
  getAllAdmin: () => api.get('/menu/all'),
  getById: (id) => api.get(`/menu/${id}`),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  toggleAvailability: (id) => api.put(`/menu/${id}/availability`),
  delete: (id) => api.delete(`/menu/${id}`)
};

// Table APIs
export const tableAPI = {
  getAll: () => api.get('/tables'),
  getWithOrders: () => api.get('/tables/with-orders'),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
  assignOrder: (id, orderId) => api.patch(`/tables/${id}/assign-order`, { orderId }),
  delete: (id) => api.delete(`/tables/${id}`)
};

// Order APIs
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getActive: () => api.get('/orders/active'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updateItemStatus: (orderId, itemId, status) => 
    api.put(`/orders/${orderId}/items/${itemId}/status`, { status }),
  processPayment: (id, data) => api.put(`/orders/${id}/payment`, data),
  complete: (id) => api.put(`/orders/${id}/complete`),
  cancel: (id) => api.put(`/orders/${id}/cancel`),
  delete: (id) => api.delete(`/orders/${id}`)
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  changePassword: (id, data) => api.put(`/users/${id}/password`, data),
  delete: (id) => api.delete(`/users/${id}`),
  reactivate: (id) => api.put(`/users/${id}/reactivate`)
};

// Report APIs
export const reportAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getPopularItems: (params) => api.get('/reports/popular-items', { params }),
  getDaily: (params) => api.get('/reports/daily', { params })
};

export default api;
