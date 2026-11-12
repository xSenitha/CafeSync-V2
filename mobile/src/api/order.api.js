import apiClient from './client';

export const createOrderApi = (data) => apiClient.post('/orders', data);
export const getOrdersApi = () => apiClient.get('/orders');
export const getOrderApi = (id) => apiClient.get(`/orders/${id}`);
export const updateOrderStatusApi = (id, status) => apiClient.put(`/orders/${id}/status`, { status });
