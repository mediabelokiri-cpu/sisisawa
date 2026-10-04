import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User, StoreProfile } from '../types';

interface AuthContextType {
  user: User | null;
  storeProfile: StoreProfile | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; role?: string; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('kasirku_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        setStoreProfile(res.data.data.storeProfile);
        localStorage.setItem('kasirku_user', JSON.stringify(res.data.data.user));
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        const { token, user: loggedInUser } = res.data.data;
        localStorage.setItem('kasirku_token', token);
        localStorage.setItem('kasirku_user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        
        // Fetch full profile & store profile
        await fetchCurrentUser();

        return { success: true, role: loggedInUser.role };
      }
      return { success: false, message: res.data.message || 'Login gagal.' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal terhubung ke server.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('kasirku_token');
    localStorage.removeItem('kasirku_user');
    setUser(null);
    setStoreProfile(null);
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, storeProfile, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
