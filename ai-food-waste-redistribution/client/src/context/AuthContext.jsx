import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setProfile(data.profile);
    return data.user;
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        // No access token yet (e.g. fresh page load) — try the refresh cookie
        // silently before concluding there's no session.
        if (!localStorage.getItem('accessToken')) {
          const { data } = await api.post('/auth/refresh');
          localStorage.setItem('accessToken', data.accessToken);
        }
        await loadCurrentUser();
      } catch {
        localStorage.removeItem('accessToken');
        setUser(null);
        setProfile(null);
      } finally {
        setIsInitializing(false);
      }
    }
    bootstrap();
  }, [loadCurrentUser]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    isInitializing,
    login,
    register,
    logout,
    refreshUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
