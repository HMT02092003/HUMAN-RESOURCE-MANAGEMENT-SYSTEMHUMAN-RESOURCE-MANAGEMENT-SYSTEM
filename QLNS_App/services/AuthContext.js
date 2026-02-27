import React, { createContext, useState, useEffect, useContext } from 'react';
import AuthTokenManager from './AuthTokenManager';
import { setOnUnauthorizedCallback } from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthStatus();

    // Đăng ký callback xử lý 401 từ API
    setOnUnauthorizedCallback(() => {
      console.log('🚪 [AuthContext] Unauthorized access detected, logging out...');
      setIsAuthenticated(false);
      setUser(null);
    });

    return () => setOnUnauthorizedCallback(null);
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔍 [AuthContext] Checking authentication status...');
    try {
      const token = await AuthTokenManager.getAccessToken();
      const refreshToken = await AuthTokenManager.getRefreshToken();
      const userData = await AuthTokenManager.getUser();

      console.log('🔑 [AuthContext] Token:', token ? 'EXISTS' : 'NULL');
      console.log('🔄 [AuthContext] Refresh token:', refreshToken ? 'EXISTS' : 'NULL');
      console.log('👤 [AuthContext] User:', userData ? userData.username : 'NULL');

      if (token || refreshToken) {
        console.log('✅ [AuthContext] User is authenticated');
        setIsAuthenticated(true);
        setUser(userData);
      } else {
        console.log('❌ [AuthContext] No tokens - User needs to login');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error checking auth:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    console.log('🔐 [AuthContext] Login attempt for:', username);
    try {
      const response = await AuthTokenManager.loginAndSave(username, password);
      setIsAuthenticated(true);
      setUser(response.user);
      console.log('✅ [AuthContext] Login successful');
      return response;
    } catch (error) {
      console.error('❌ [AuthContext] Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🔴 [AuthContext] Logging out...');
    try {
      await AuthTokenManager.clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      console.log('✅ [AuthContext] Logout successful');
    } catch (error) {
      console.error('❌ [AuthContext] Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        checkAuthStatus // Expose để có thể refresh auth state
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
