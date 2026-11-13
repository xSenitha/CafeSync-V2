import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { authAPI } from '../api';
import { toUserApiError } from '../api/errors';

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
      throw toUserApiError(error, 'Unable to sign in. Please try again.');
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
      throw toUserApiError(error, 'Unable to create your account. Please try again.');
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
      throw toUserApiError(error, 'Unable to update your profile. Please try again.');
    }
  };

  const deleteAccount = async () => {
    try {
      await authAPI.deleteProfile();
      await logout();
    } catch (error) {
      throw toUserApiError(error, 'Unable to delete your account. Please try again.');
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
