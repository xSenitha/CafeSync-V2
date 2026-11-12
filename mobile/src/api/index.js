import apiClient from './client';
export { assistantAPI } from './assistant.api';

// Auth
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (data) => apiClient.post('/auth/register', data),
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  deleteProfile: () => apiClient.post('/auth/delete-account'),
};

// Menu / Inventory (public)
export const menuAPI = {
  getAll: (category) => apiClient.get('/inventory', { params: category ? { category } : {} }),
  getOne: (id) => apiClient.get(`/inventory/${id}`),
};

// Orders
export const ordersAPI = {
  getMyOrders: () => apiClient.get('/orders'),
  getOrder: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
};

// Reservations
export const reservationsAPI = {
  getMyReservations: () => apiClient.get('/reservations'),
  getAvailability: () => apiClient.get('/reservations/availability'),
  createReservation: (data) => apiClient.post('/reservations', data),
  cancelReservation: (id) => apiClient.put(`/reservations/${id}`, { status: 'Cancelled' }),
};

// Payments
export const paymentsAPI = {
  getMyPayments: () => apiClient.get('/payments'),
  createPayment: (data) => apiClient.post('/payments', data),
};

// Admin
export const adminOrdersAPI = {
  getAll: () => apiClient.get('/orders'),
  updateStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),
  updatePaymentStatus: (id, paymentStatus) => apiClient.put(`/orders/${id}/payment`, { paymentStatus }),
  deleteOrder: (id) => apiClient.delete(`/orders/${id}`),
};

export const adminInventoryAPI = {
  getAll: () => apiClient.get('/inventory'),
  create: (data) => apiClient.post('/inventory', data),
  update: (id, data) => apiClient.put(`/inventory/${id}`, data),
  delete: (id) => apiClient.delete(`/inventory/${id}`),
};

export const adminReservationsAPI = {
  getAll: () => apiClient.get('/reservations'),
  update: (id, data) => apiClient.put(`/reservations/${id}`, data),
  delete: (id) => apiClient.delete(`/reservations/${id}`),
};

export const adminPaymentsAPI = {
  getAll: () => apiClient.get('/payments'),
  updateStatus: (id, data) => apiClient.put(`/payments/${id}`, data),
  delete: (id) => apiClient.delete(`/payments/${id}`),
};

// Saved Cards
export const cardsAPI = {
  getAll: () => apiClient.get('/cards'),
  add: (data) => apiClient.post('/cards', data),
  update: (id, data) => apiClient.put(`/cards/${id}`, data),
  delete: (id) => apiClient.delete(`/cards/${id}`),
};

