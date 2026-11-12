import { useState, useCallback } from 'react';

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (...args) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFunc(...args);
      setData(res.data.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      setError(msg);
      throw msg;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, error, loading, request };
};
