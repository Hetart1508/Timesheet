import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);
  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials);
      setUser(data.data.user);
      return data.data.user;
    },
    async logout() {
      try { await api.post('/auth/logout'); } finally { setUser(null); }
    },
    clearUser() { setUser(null); },
  }), [loading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
