import type {
  SendOtpRequest,
  VerifyOtpRequest,
  AuthResponse,
  User,
  FullProfileView,
  CompleteRegistrationPayload,
  PresignedUploadRequest,
  PresignedUploadResponse,
} from '@astalakshimi/types';
import type { PartnerPreferencesInput } from '@astalakshimi/validation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'astalakshimi.auth_token';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const fieldErrors = errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
          errorMessage = `${errorMessage} (${fieldErrors})`;
        }
      } catch {
        errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // --- Auth APIs ---
  auth = {
    sendOtp: (data: SendOtpRequest) =>
      this.request<{ message: string; mockOtp?: string }>('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyOtp: async (data: VerifyOtpRequest): Promise<AuthResponse> => {
      const response = await this.request<AuthResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (response.accessToken) {
        this.setToken(response.accessToken);
      }
      return response;
    },

    getMe: () => this.request<{ user: User; hasProfile: boolean }>('/auth/me'),

    logout: () => {
      this.clearToken();
    },
  };

  // --- Media & S3 APIs ---
  media = {
    getUploadUrl: (data: PresignedUploadRequest) =>
      this.request<PresignedUploadResponse>('/media/upload-url', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    uploadFileToS3: async (uploadUrl: string, file: File | Blob, contentType: string): Promise<void> => {
      // In mock mode without live AWS, the URL has a mock signature query param
      if (uploadUrl.includes('mock-signature=')) {
        // Mock upload delay for local dev without active AWS S3
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file to S3: ${response.statusText}`);
      }
    },
  };

  // --- Profiles APIs ---
  profiles = {
    completeRegistration: (payload: CompleteRegistrationPayload) =>
      this.request<{ success: boolean; message: string; profileId: string }>(
        '/profiles/complete-registration',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ),

    getMyProfile: () => this.request<FullProfileView>('/profiles/me'),

    getProfileById: (id: string) => this.request<FullProfileView>(`/profiles/${id}`),
  };

  // --- Preferences APIs ---
  preferences = {
    getMyPreferences: () => this.request<any>('/preferences/me'),

    updateMyPreferences: (data: PartnerPreferencesInput) =>
      this.request<any>('/preferences/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  };
}

export const apiClient = new ApiClient(API_BASE_URL);
