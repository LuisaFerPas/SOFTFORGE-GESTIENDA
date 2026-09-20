import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gestienda_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      id: 1,
      username: 'Administrador',
      role: 'ADMINISTRADOR',
      status: 'ACTIVO'
    };
  });

  const [token, setToken] = useState(() => localStorage.getItem('gestienda_token') || 'demo-token-gestienda');

  useEffect(() => {
    if (user) {
      localStorage.setItem('gestienda_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gestienda_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('gestienda_token', token);
    } else {
      localStorage.removeItem('gestienda_token');
    }
  }, [token]);

  const login = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('gestienda_token');
    localStorage.removeItem('gestienda_user');
  };

  const toggleDemoRole = () => {
    if (user?.role === 'ADMINISTRADOR') {
      setUser({
        id: 2,
        username: 'María López',
        role: 'VENDEDOR',
        status: 'ACTIVO'
      });
    } else {
      setUser({
        id: 1,
        username: 'Administrador',
        role: 'ADMINISTRADOR',
        status: 'ACTIVO'
      });
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    toggleDemoRole,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'ADMINISTRADOR',
    isVendedor: user?.role === 'VENDEDOR'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
