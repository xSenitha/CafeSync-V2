import apiClient from './client';

export const bookTableApi = (data) => apiClient.post('/reservations', data);
export const getReservationsApi = () => apiClient.get('/reservations');
export const updateReservationApi = (id, data) => apiClient.put(`/reservations/${id}`, data);
export const deleteReservationApi = (id) => apiClient.delete(`/reservations/${id}`);
