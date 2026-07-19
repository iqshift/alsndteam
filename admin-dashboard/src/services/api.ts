import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const BACKEND_BASE_URL = isLocal
  ? `http://${window.location.hostname}:3000`
  : `${window.location.protocol}//${window.location.hostname}`;

export const API_BASE_URL = `${BACKEND_BASE_URL}/api`;

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Auth ───
export const authAPI = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password, userType: 'admin' }),
  updateProfile: (data: { name?: string; phone?: string; password?: string }) =>
    api.put('/auth/profile', data),
  getProfile: () =>
    api.get('/auth/profile'),
};

// ─── Staff / Dashboard Assistants ───
export const staffAPI = {
  getAll: () => api.get('/auth/staff'),
  create: (data: any) => api.post('/auth/staff', data),
  update: (id: string, data: any) => api.put(`/auth/staff/${id}`, data),
  delete: (id: string) => api.delete(`/auth/staff/${id}`),
};

// ─── Orders ───
export const ordersAPI = {
  getAll: () => api.get('/orders/admin'),
  manuallyAssign: (orderId: string, driverId: string) =>
    api.post('/orders/admin/assign', { orderId, driverId }),
};

// ─── Zones ───
export const zonesAPI = {
  getAll: () => api.get('/zones'),
  getActive: () => api.get('/zones/active'),
  create: (data: any) => api.post('/zones', data),
  update: (id: string, data: any) => api.put(`/zones/${id}`, data),
  delete: (id: string) => api.delete(`/zones/${id}`),
};

// ─── Restaurant Zones (مناطق المطاعم - مجرد اسم فقط) ───
export const restaurantZonesAPI = {
  getAll: () => api.get('/zones/restaurant-zones/all'),
  create: (name: string) => api.post('/zones/restaurant-zones', { name }),
  update: (id: string, name: string) => api.put(`/zones/restaurant-zones/${id}`, { name }),
  delete: (id: string) => api.delete(`/zones/restaurant-zones/${id}`),
};

// ─── Drivers ───
export const driversAPI = {
  getAll: () => api.get('/drivers/admin'),
  getAvailable: () => api.get('/drivers/admin/available'),
  updateStatus: (id: string, status: string) =>
    api.patch(`/drivers/admin/${id}/status`, { status }),
  getDetails: (id: string) => api.get(`/drivers/admin/${id}/details`),
};

// ─── Restaurants ───
export const restaurantsAPI = {
  getAll: () => api.get('/restaurants/admin'),
  getById: (id: string) => api.get(`/restaurants/admin/${id}`),
  getOrders: (id: string, params?: { from?: string; to?: string }) =>
    api.get(`/restaurants/admin/${id}/orders`, { params }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/restaurants/admin/${id}/status`, { status }),
  create: (data: any) => api.post('/restaurants/admin', data),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/restaurants/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: string, data: any) => api.put(`/restaurants/admin/${id}`, data),
  delete: (id: string) => api.delete(`/restaurants/admin/${id}`),
};

// ─── Restaurant Zone Pricing (أسعار التوصيل الديناميكية) ───
export const restaurantZonePricingAPI = {
  /** جلب أسعار التوصيل لمنطقة انطلاق معينة */
  getByOriginZone: (restaurantZoneId: string) =>
    api.get(`/restaurants/admin/zone-pricing/${restaurantZoneId}`),
  /** إنشاء أو تحديث سعر توصيل */
  upsert: (data: {
    restaurantZoneId: string;
    deliveryZoneId: string;
    deliveryPrice: number;
    driverDeduction: number;
  }) => api.post('/restaurants/admin/zone-pricing', data),
  /** حذف سعر توصيل معين */
  delete: (restaurantZoneId: string, deliveryZoneId: string) =>
    api.delete(`/restaurants/admin/zone-pricing/${restaurantZoneId}/${deliveryZoneId}`),
};

// ─── Wallet ───
export const walletAPI = {
  getDriverWallets: () => api.get('/wallet/admin/drivers'),
  generateCodes: (value: number, count: number) =>
    api.post('/wallet/admin/codes', { value, count }),
  getAllCodes: () => api.get('/wallet/admin/codes'),
  rewardDriver: (driverId: string, amount: number, message: string) =>
    api.post('/wallet/admin/reward', { driverId, amount, message }),
};

// ─── Reports ───
export const reportsAPI = {
  getSummary: (params: { from: string; to: string; groupBy?: string }) =>
    api.get('/reports/summary', { params }),
  getDrivers: (params: { from: string; to: string }) =>
    api.get('/reports/drivers', { params }),
  getZones: (params: { from: string; to: string }) =>
    api.get('/reports/zones', { params }),
};

// ─── Audit ───
export const auditAPI = {
  getAll: (params?: { action?: string; from?: string; to?: string }) =>
    api.get('/audit', { params }),
};

// ─── Settings ───
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
  getPublic: () => api.get('/settings/public'),
};

// ─── Employees ───
export const employeesAPI = {
  getAll: () => api.get('/employees/admin'),
  create: (data: { name: string; phone: string; password: string }) =>
    api.post('/employees/admin', data),
  getById: (id: string) => api.get(`/employees/admin/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/employees/admin/${id}/status`, { status }),
  getReport: (id: string, period: string) =>
    api.get(`/employees/admin/${id}/report`, { params: { period } }),
  getSummaryReport: (period: string) =>
    api.get('/employees/admin/reports/summary', { params: { period } }),
};

// ─── Support Chat ───
export const supportAPI = {
  getChats: () => api.get('/support/admin/chats'),
  getChatMessages: (driverId: string) => api.get(`/support/admin/chats/${driverId}/messages`),
  sendAdminMessage: (driverId: string, content: string) =>
    api.post(`/support/admin/chats/${driverId}/messages`, { content }),
  clearChat: (driverId: string) => api.delete(`/support/admin/chats/${driverId}`),
  uploadImage: (formData: FormData) => api.post('/support/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};
