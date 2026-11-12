import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Get the host IP address (works for both emulator and physical devices)
const helperIp = Constants.expoConfig?.hostUri?.split(`:`)[0];

let BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  BASE_URL = 'http://10.0.2.2:5000/api'; // Default for Android Emulator
  if (Platform.OS === 'web') {
    BASE_URL = 'http://localhost:5000/api';
  } else if (helperIp) {
    BASE_URL = `http://${helperIp}:5000/api`;
  }
}
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add a request interceptor to attach auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error fetching token', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
