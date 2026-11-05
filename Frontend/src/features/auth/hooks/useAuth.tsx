import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '../../../shared/types';
import type { AuthContextType, LoginCredentials } from '../types/auth.types';
import { authApi } from '../api/authApi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mowathib_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('mowathib_token');
    }
  }, [user]);

  // Handle unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('mowathib_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('mowathib_unauthorized', handleUnauthorized);
  }, []);

  const loginAdmin = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await authApi.loginAdmin(credentials);
      if (res && res.isAuthenticated) {
        const authUser: AuthUser = {
          id: res.adminId,
          username: res.username,
          role: 'Admin',
          fullName: 'مدير النظام',
        };
        setUser(authUser);
      } else {
        throw new Error(res?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginRepresentative = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { representative, enrollment } = await authApi.loginRepresentative(credentials);
      if (!representative.isActive) {
        throw new Error('هذا الحساب معطل حالياً، يرجى مراجعة إدارة المدرسة.');
      }

      const role = representative.role === 'Deputy' ? 'Deputy' : 'Representative';
      const authUser: AuthUser = {
        id: representative.representativeId,
        username: representative.username,
        role,
        fullName: enrollment?.studentName || representative.studentName || representative.username,
        classId: enrollment?.classId,
        className: enrollment?.className,
        enrollmentId: representative.enrollmentId,
        mustChangePassword: representative.mustChangePassword,
      };

      setUser(authUser);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (newPassword: string, _currentPassword?: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.role === 'Representative' || user.role === 'Deputy') {
        await authApi.changeRepresentativePassword(user.id, newPassword);
      }
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('mowathib_token');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginAdmin,
        loginRepresentative,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

