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

// Use Next.js BFF Proxy for all client API requests
const API_BASE_URL = '/api/proxy';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('is_authenticated') === 'true' ? 'dummy_token' : null;
  }

  setToken(token?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('is_authenticated', 'true');
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('is_authenticated');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // The Next.js proxy will attach the HTTP-only cookie automatically
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // If endpoint starts with /api/auth, we bypass the proxy base URL
    // since we hit the Next.js auth routes directly.
    const url = endpoint.startsWith('/api/auth') 
      ? endpoint 
      : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
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
      // Hit the Next.js auth API route which sets the HTTP-only cookie
      const res = await this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      this.setToken();
      return res;
    },

    getMe: () => this.request<{ user: User; hasProfile: boolean }>('/auth/me'),

    logout: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
  };

  // --- Media & S3 APIs ---
  media = {
    getUploadUrl: (data: PresignedUploadRequest) =>
      this.request<PresignedUploadResponse>('/media/upload-url', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    uploadMediaFile: async (file: File, purpose: PresignedUploadRequest['purpose']) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      return this.request<PresignedUploadResponse>('/media/upload', {
        method: 'POST',
        body: formData,
      });
    },

    uploadFileToS3: async (
      uploadUrl: string,
      file: File | Blob,
      contentType: string,
      purpose?: PresignedUploadRequest['purpose'],
    ): Promise<void> => {
      if (uploadUrl.includes('mock-signature=')) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }

      if (purpose && file instanceof File) {
        await this.media.uploadMediaFile(file, purpose);
        return;
      }

      let finalUrl = uploadUrl;
      if (finalUrl.startsWith('/api/media/demo-upload')) {
        finalUrl = `/api/proxy${finalUrl.replace('/api/media', '/media')}`;
      }

      const response = await fetch(finalUrl, {
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

    confirmVerification: (data: { method: 'selfie' | 'govt_id'; selfieS3Key?: string; govtIdType?: string; govtIdS3Key?: string }) =>
      this.request<{ success: boolean; verification: any }>('/media/confirm-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
      // Remove empty values from query and handle nested advanced objects
      const cleanQuery: Record<string, string> = {};
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== '') {
          if (typeof v === 'object') {
            cleanQuery[k] = JSON.stringify(v);
          } else {
            cleanQuery[k] = String(v);
          }
        }
      }
      const params = new URLSearchParams(cleanQuery).toString();
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


  // --- Interests APIs ---
  interests = {
    sendInterest: (targetProfileId: string, message?: string) =>
      this.request<any>('/interests', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId, profileId: targetProfileId, message }),
      }),

    getSummary: () => this.request<any>('/interests/summary'),

    getUsage: () =>
      this.request<{
        planSlug: string
        limit: number | null
        used: number
        remaining: number | null
      }>('/interests/usage'),

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
    getAll: () => this.request<any[]>('/shortlists'),
    getIds: () => this.request<string[]>('/shortlists/ids'),
    add: (targetProfileId: string) =>
      this.request<any>('/shortlists', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId }),
      }),
    remove: (targetProfileId: string) =>
      this.request<any>(`/shortlists/${targetProfileId}`, {
        method: 'DELETE',
      }),
  };

  // --- Blocks APIs ---
  blocks = {
    getAll: () => this.request<any[]>('/blocks'),
    block: (targetProfileId: string) =>
      this.request<any>(`/blocks/${targetProfileId}`, {
        method: 'POST',
      }),
    unblock: (targetProfileId: string) =>
      this.request<any>(`/blocks/${targetProfileId}`, {
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

  // --- Plans APIs ---
  plans = {
    getActive: () => this.request<any[]>('/plans'),
  };

  // --- Payments APIs ---
  payments = {
    createOrder: (planId: string) =>
      this.request<{
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        planId?: string;
        planSlug?: string;
        planName?: string;
        freeActivated?: boolean;
      }>('/payments/orders', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),

    verifyPayment: (data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) =>
      this.request<{ success: boolean; planName?: string; planSlug?: string }>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getSubscription: () => this.request<any>('/payments/subscription'),

    getInvoices: () => this.request<any[]>('/payments/invoices'),

    activateDemoPlan: (planId: string) =>
      this.request<{ success: boolean; demoActivated?: boolean; planName?: string; planSlug?: string }>(
        '/payments/demo-activate',
        {
          method: 'POST',
          body: JSON.stringify({ planId }),
        }
      ),
  };

  contacts = {
    getUsage: () =>
      this.request<{
        planSlug: string
        limit: number | null
        usedThisMonth: number
        remaining: number | null
        extraContactFeePaise: number
        canPayExtra: boolean
      }>('/contacts/usage'),

    unlock: (targetProfileId: string) =>
      this.request<{
        success: boolean
        alreadyUnlocked?: boolean
        contactPhone: string | null
        remaining: number | null
      }>('/contacts/unlock', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId }),
      }),

    createPaidOrder: (targetProfileId: string) =>
      this.request<{
        orderId: string
        amount: number
        currency: string
        keyId: string
        targetProfileId: string
      }>('/contacts/unlock/order', {
        method: 'POST',
        body: JSON.stringify({ targetProfileId }),
      }),

    verifyPaidUnlock: (data: {
      targetProfileId: string
      razorpayOrderId: string
      razorpayPaymentId: string
      razorpaySignature: string
    }) =>
      this.request<{ success: boolean; contactPhone?: string | null }>('/contacts/unlock/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listUnlocked: () =>
      this.request<
        {
          profileId: string
          fullName: string
          age: number | null
          city?: string
          state?: string
          caste?: string
          educationLevel?: string
          profession?: string
          photo?: string | null
          phone: string
          unlockedAt: string
        }[]
      >('/contacts/unlocked'),
  };

  // --- Admin APIs ---
  admin = {
    getStats: () => this.request<any>('/admin/stats'),

    getPendingVerifications: () => this.request<any[]>('/admin/verifications/pending'),

    getAllProfiles: () => this.request<any[]>('/admin/profiles'),

    getProfile: (profileId: string) => this.request<any>(`/admin/profiles/${profileId}`),

    deleteProfile: (profileId: string) => this.request<any>(`/admin/profiles/${profileId}`, { method: 'DELETE' }),

    createProfile: (data: {
      profileFor: string
      phone: string
      fullName: string
      gender: "Male" | "Female" | "Other"
      dobDay: string
      dobMonth: string
      dobYear: string
      maritalStatus: "Never Married" | "Divorced" | "Widowed" | "Awaiting Divorce"
      city: string
      state?: string
      religion: string
      caste: string
      motherTongue: string
      brothersCount: number
      sistersCount: number
      aboutMe?: string
    }) =>
      this.request<any>('/admin/profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    uploadPhoto: (profileId: string, data: FormData) =>
      this.request<{ s3Key: string; id: string }>(`/admin/profiles/${profileId}/upload`, {
        method: 'POST',
        body: data,
      }),

    attachPhotos: (profileId: string, s3Keys: string[]) =>
      this.request<any>(`/admin/profiles/${profileId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ s3Keys }),
      }),

    updateVerificationStatus: (profileId: string, status: 'verified' | 'rejected', rejectionReason?: string) =>
      this.request<any>(`/admin/verifications/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason }),
      }),
  };
}

export const apiClient = new ApiClient(API_BASE_URL);


