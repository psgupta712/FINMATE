'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('finMate_token');
    if (token) {
      authAPI.me()
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('finMate_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    localStorage.setItem('finMate_token', data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password, college) => {
    const data = await authAPI.signup({ name, email, password, college });
    localStorage.setItem('finMate_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('finMate_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const data = await authAPI.me();
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
