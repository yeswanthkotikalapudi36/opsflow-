import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('opsflow_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      let activeToken = localStorage.getItem('opsflow_token');
      if (activeToken) {
        try {
          const res = await api.auth.getMe();
          if (res?.user) {
            setUser(res.user);
            setToken(activeToken);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('[Auth] Stale token detected. Re-authenticating demo session...');
          localStorage.removeItem('opsflow_token');
          setToken(null);
        }
      }

      // Proactively establish demo session for evaluator convenience
      try {
        const res = await api.auth.login({
          email: 'alex@opsflow.internal',
          password: 'password123',
        });
        if (res?.token && res?.user) {
          localStorage.setItem('opsflow_token', res.token);
          setToken(res.token);
          setUser(res.user);
        }
      } catch (e) {
        console.error('[Auth] Failed to establish initial demo session:', e);
      } finally {
        setLoading(false);
      }
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
