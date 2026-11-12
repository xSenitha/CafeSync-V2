import apiClient from './client';

export const loginApi = (email, password) => apiClient.post('/auth/login', { email, password });
export const registerApi = (data) => apiClient.post('/auth/register', data);
export const getMeApi = () => apiClient.get('/auth/me');
