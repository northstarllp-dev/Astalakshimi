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

    updateMyProfile: (data: Partial<CompleteRegistrationPayload>) =>
      this.request<FullProfileView>('/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getProfileById: (id: string) => this.request<FullProfileView>(`/profiles/${id}`),

    recordVisit: (id: string) =>
      this.request<{ success: boolean }>(`/profiles/${id}/visit`, {
        method: 'POST',
      }),
  };

  // --- Search APIs ---
  search = {
    searchProfiles: (query: any) => {
      // Remove empty values from query
      const cleanQuery = Object.fromEntries(
        Object.entries(query).filter(([_, v]) => v != null && v !== '')
      );
      const params = new URLSearchParams(cleanQuery as Record<string, string>).toString();
      return this.request<any>(`/search?${params}`);
    },
  };
  
  // --- Photos APIs ---
  photos = {
    add: (s3Key: string) =>
      this.request<FullProfileView>('/profiles/me/photos', {
        method: 'POST',
        body: JSON.stringify({ s3Key }),
      }),

    remove: (photoId: string) =>
      this.request<{ success: boolean }>(`/profiles/me/photos/${photoId}`, {
        method: 'DELETE',
      }),

    reorder: (photoIds: string[]) =>
      this.request<FullProfileView>('/profiles/me/photos/order', {
        method: 'PUT',
        body: JSON.stringify({ photoIds }),
      }),
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

  // --- Settings APIs ---
  settings = {
    getSettings: () => this.request<any>('/users/me/settings'),

    updateSettings: (data: any) =>
      this.request<any>('/users/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  // --- Matches APIs ---
  matches = {
    getTop: () => this.request<any[]>('/matches/top'),
  };

  // --- Activity APIs ---
  // --- Activity APIs ---
  activity = {
    getSummary: () => this.request<any>('/activity/summary'),
  };

  // --- Interactions APIs ---
  interactions = {
    getReceived: (status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return this.request<any[]>(`/interactions/received${qs}`);
    },

    getSent: () => this.request<any[]>('/interactions/sent'),

    getMutual: () => this.request<any[]>('/interactions/mutual'),

    getSummary: () => this.request<any>('/interactions/summary'),

    sendInterest: (targetProfileId: string, message?: string) =>
      this.request<any>('/interactions/interest', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId, profileId: targetProfileId, message }),
      }),

    accept: (idOrProfileId: string) =>
      this.request<any>(`/interactions/${idOrProfileId}/accept`, {
        method: 'PATCH',
      }),

    decline: (idOrProfileId: string) =>
      this.request<any>(`/interactions/${idOrProfileId}/decline`, {
        method: 'PATCH',
      }),

    withdraw: (idOrProfileId: string) =>
      this.request<any>(`/interactions/${idOrProfileId}/withdraw`, {
        method: 'PATCH',
      }),

    updateStatus: (interestId: string, status: 'accepted' | 'declined' | 'withdrawn') =>
      this.request<any>(`/interactions/${interestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // --- Interests APIs ---
  interests = {
    sendInterest: (targetProfileId: string, message?: string) =>
      this.request<any>('/interests', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId, profileId: targetProfileId, message }),
      }),

    getSummary: () => this.request<any>('/interests/summary'),

    getReceived: (status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return this.request<any[]>(`/interests/received${qs}`);
    },

    getSent: () => this.request<any[]>('/interests/sent'),

    getMutual: () => this.request<any[]>('/interests/mutual'),

    updateStatus: (interestId: string, status: 'accepted' | 'declined' | 'withdrawn') =>
      this.request<any>(`/interests/${interestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    accept: (idOrProfileId: string) =>
      this.request<any>(`/interests/${idOrProfileId}/accept`, {
        method: 'PATCH',
      }),

    decline: (idOrProfileId: string) =>
      this.request<any>(`/interests/${idOrProfileId}/decline`, {
        method: 'PATCH',
      }),

    withdraw: (idOrProfileId: string) =>
      this.request<any>(`/interests/${idOrProfileId}/withdraw`, {
        method: 'PATCH',
      }),
  };

  // --- Notifications APIs ---
  notifications = {
    getAll: () => this.request<any[]>('/notifications'),

    markRead: (id: string) =>
      this.request<any>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    markAllRead: () =>
      this.request<any>('/notifications/read', {
        method: 'PATCH',
      }),

    clearAll: () =>
      this.request<any>('/notifications/clear-all', {
        method: 'DELETE',
      }),
  };

  // --- Shortlists APIs ---
  shortlists = {
    getAll: () => this.request<any[]>('/shortlist'),

    getIds: () => this.request<string[]>('/shortlist/ids'),

    add: (targetProfileId: string) =>
      this.request<any>('/shortlist', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId, profileId: targetProfileId }),
      }),

    remove: (targetProfileId: string) =>
      this.request<any>(`/shortlist/${targetProfileId}`, {
        method: 'DELETE',
      }),
  };

  // --- Chat / Messaging APIs ---
  chat = {
    getThreads: () => this.request<any[]>('/chat/threads'),

    getMessages: (threadId: string) =>
      this.request<any[]>(`/chat/${threadId}/messages`),

    sendMessage: (threadId: string, text: string, receiverProfileId?: string) =>
      this.request<any>(`/chat/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, receiverProfileId }),
      }),

    markRead: (threadId: string) =>
      this.request<any>(`/chat/${threadId}/read`, {
        method: 'PATCH',
      }),
  };
}

export const apiClient = new ApiClient(API_BASE_URL);


