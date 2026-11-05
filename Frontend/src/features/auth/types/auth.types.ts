import type { UserRole } from '../../../shared/types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  adminId: number;
  username: string;
  isAuthenticated: boolean;
  message?: string;
}

export interface RepresentativeLoginResponse {
  representativeId: number;
  username: string;
  role: string;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  message?: string;
}

export interface AuthContextType {
  user: {
    id: number;
    username: string;
    role: UserRole;
    fullName?: string;
    classId?: number;
    className?: string;
    enrollmentId?: number;
    mustChangePassword?: boolean;
    token?: string;
  } | null;
  isLoading: boolean;
  loginAdmin: (credentials: LoginCredentials) => Promise<void>;
  loginRepresentative: (credentials: LoginCredentials) => Promise<void>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  logout: () => void;
}

