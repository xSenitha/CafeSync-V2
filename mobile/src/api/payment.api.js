import apiClient from './client';

export const recordPaymentApi = (data) => apiClient.post('/payments', data);
export const getPaymentsApi = () => apiClient.get('/payments');
export const updatePaymentStatusApi = (id, status) => apiClient.put(`/payments/${id}`, { status });
