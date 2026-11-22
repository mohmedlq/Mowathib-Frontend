import type { AuthUser } from '../../../shared/types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  adminId: number;
  username: string;
  adminName?: string;
  schoolCode?: string;
  schoolName?: string;
  access?: string;
  isAuthenticated: boolean;
  message?: string;
}

export interface ClerkLoginResponse {
  clerkId: number;
  studentId: number;
  studentName: string;
  username: string;
  schoolCode?: string;
  schoolName?: string;
  access?: string;
  isAuthenticated: boolean;
  message?: string;
}

export interface RepresentativeLoginResponse {
  representativeId: number;
  username: string;
  role: string;
  fullName?: string;
  classId?: number;
  classNumber?: number;
  className?: string;
  enrollmentId?: number;
  isAuthenticated?: boolean;
  mustChangePassword?: boolean;
  message?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loginAdmin: (credentials: LoginCredentials) => Promise<void>;
  loginRepresentative: (credentials: LoginCredentials) => Promise<void>;
  loginClerk: (credentials: LoginCredentials) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => void;
  activeAcademicYear: () => Promise<string>;
}
