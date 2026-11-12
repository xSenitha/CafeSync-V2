import apiClient from './client';

export const getInventoryApi = () => apiClient.get('/inventory');
export const getInventoryItemApi = (id) => apiClient.get(`/inventory/${id}`);

// Admin only
export const addInventoryItemApi = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'image' && data[key]) {
      formData.append('image', {
        uri: data[key].uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
    } else {
      formData.append(key, data[key]);
    }
  });

  return apiClient.post('/inventory', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateInventoryItemApi = (id, data) => apiClient.put(`/inventory/${id}`, data);
export const deleteInventoryItemApi = (id) => apiClient.delete(`/inventory/${id}`);
