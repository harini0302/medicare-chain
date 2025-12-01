// contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const userData = localStorage.getItem('userData');
    const userRole = localStorage.getItem('userRole');
    
    if (userData && userRole) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Logout function for external use
export const Logout = () => {
  localStorage.removeItem('userData');
  localStorage.removeItem('userRole');
  localStorage.removeItem('token');
  sessionStorage.removeItem('userData');
  window.location.href = '/';
};