export type UserRole = 'member' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'deactivated';

export interface User {
  id: string;
  phone: string;
  isPhoneVerified: boolean;
  consentAccepted: boolean;
  consentTimestamp: string | null;
  referredBy?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  userId: string;
  phone: string;
  role: UserRole;
}

export interface SendOtpRequest {
  phone: string;
  referredBy?: string;
  consentAccepted?: boolean;
  type?: 'login' | 'register';
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser: boolean;
  hasProfile: boolean;
}
