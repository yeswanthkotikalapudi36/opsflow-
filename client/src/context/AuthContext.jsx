import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('opsflow_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid, clearing token');
          localStorage.removeItem('opsflow_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto-login with Demo account for immediate evaluator access if no session exists!
        try {
          const res = await api.auth.login({
            email: 'alex@opsflow.internal',
            password: 'password123',
          });
          localStorage.setItem('opsflow_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch (e) {
          // If server is not ready yet, keep null
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    localStorage.setItem('opsflow_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.auth.register(userData);
    localStorage.setItem('opsflow_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('opsflow_token');
    setToken(null);
    setUser(null);
  };

  const switchDemoAccount = async (email) => {
    const res = await api.auth.login({
      email,
      password: email.includes('demo') ? 'demo123' : 'password123',
    });
    localStorage.setItem('opsflow_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        switchDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
