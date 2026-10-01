import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gestienda_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('gestienda_token') || null);

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

  /**
   * HU-0203: Cambio Rápido de Cajero
   * Reemplaza token y usuario en el contexto global sin pasar por /login.
   * El backend ya validó las credenciales; aquí solo actualizamos el estado.
   */
  const cambiarUsuario = (nuevoToken, nuevoUsuario) => {
    setToken(nuevoToken);
    setUser(nuevoUsuario);
  };

  const value = {
    user,
    token,
    login,
    logout,
    cambiarUsuario,
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
