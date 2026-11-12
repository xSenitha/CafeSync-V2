import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { authAPI } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkLoggedIn(); }, []);

  const checkLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.data);
      }
    } catch {
      await AsyncStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Throws on failure so screens can catch and display errors
  const login = async (email, password) => {
    try {
      const res = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token, user: userData } = res.data;
      await AsyncStorage.setItem('token', token);
      setUser(userData);
    } catch (error) {
      const backendError = error.response?.data?.error;
      const msg = Array.isArray(backendError)
        ? backendError[0]
        : backendError || 'Login failed. Check your email and password.';
      throw new Error(msg);
    }
  };

  // Throws on failure so screens can catch and display errors
  const register = async (name, email, password, address, mobile) => {
    try {
      const res = await apiClient.post('/auth/register', {
        name: (name || '').trim(),
        email: (email || '').trim().toLowerCase(),
        password,
        address: (address || '').trim(),
        mobile: (mobile || '').trim(),
      });
      const { token, user: userData } = res.data;
      await AsyncStorage.setItem('token', token);
      setUser(userData);
    } catch (error) {
      const backendError = error.response?.data?.error;
      const msg = Array.isArray(backendError)
        ? backendError[0]
        : backendError || 'Registration failed. Please try again.';
      throw new Error(msg);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      setUser(res.data.data);
      return res.data.data;
    } catch (error) {
      const backendError = error.response?.data?.error;
      let msg = 'Failed to update profile';
      
      if (typeof backendError === 'string') {
        msg = backendError;
      } else if (Array.isArray(backendError)) {
        msg = backendError[0]; // Show the first validation error
      } else if (backendError?.message) {
        msg = backendError.message;
      }
      
      throw new Error(msg);
    }
  };

  const deleteAccount = async () => {
    try {
      await authAPI.deleteProfile();
      await logout();
    } catch (error) {
      console.error('Delete Account Error:', error.response?.data || error.message);
      const backendError = error.response?.data?.error || error.response?.data?.message;
      let msg = 'Failed to delete account';
      
      if (typeof backendError === 'string') {
        msg = backendError;
      } else if (Array.isArray(backendError)) {
        msg = backendError[0];
      } else if (backendError?.message) {
        msg = backendError.message;
      } else if (error.message) {
        msg = error.message;
      }
      
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, register, logout, updateProfile, deleteAccount,
      isAdmin: user?.role === 'admin' 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
