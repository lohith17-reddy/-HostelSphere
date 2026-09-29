import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return setLoading(false);
    api.get('/auth/me').then((r) => setUser(r.data.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);
  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.data.token);
    setUser(r.data.data.user);
    return r.data.data.user;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <AuthCtx.Provider value={{ user, setUser, login, logout, loading }}>{children}</AuthCtx.Provider>;
}
