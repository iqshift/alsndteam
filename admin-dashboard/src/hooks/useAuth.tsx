import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  permissions?: any;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const { data } = await authAPI.getProfile();
          const userData = {
            id: data.id,
            phone: data.phone,
            name: data.name,
            role: data.role,
            permissions: data.permissions || {},
          };
          localStorage.setItem('admin_user', JSON.stringify(userData));
          setUser(userData);
        } catch {
          localStorage.clear();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    const { data } = await authAPI.login(phone, password);
    localStorage.setItem('admin_token', data.accessToken);
    
    // Fetch profile details
    const profileRes = await authAPI.getProfile();
    const userData = {
      id: profileRes.data.id,
      phone: profileRes.data.phone,
      name: profileRes.data.name,
      role: profileRes.data.role,
      permissions: profileRes.data.permissions || {},
    };
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (user) {
      const nextUser = { ...user, ...updatedFields };
      localStorage.setItem('admin_user', JSON.stringify(nextUser));
      setUser(nextUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
