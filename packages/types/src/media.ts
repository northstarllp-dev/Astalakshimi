export type UploadPurpose = 'profile_photo' | 'selfie' | 'govt_id' | 'horoscope';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';
export type VerificationMethod = 'selfie' | 'govt_id';
export type VerificationStatus = 'idle' | 'pending' | 'verified' | 'rejected';
export type GovtIdType = 'Aadhaar' | 'PAN card' | 'Passport' | 'Driving licence' | 'Voter ID';

export interface PresignedUploadRequest {
  purpose: UploadPurpose;
  contentType: string; // e.g. 'image/jpeg', 'image/webp', 'application/pdf'
  fileSize: number; // in bytes
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
  bucket: string;
  expiresInSeconds: number;
}

export interface ConfirmPhotoRequest {
  s3Key: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface ConfirmVerificationRequest {
  method: VerificationMethod;
  selfieS3Key?: string;
  govtIdType?: GovtIdType;
  govtIdS3Key?: string;
}

export interface ConfirmHoroscopeRequest {
  horoscopeS3Key: string;
  fileName: string;
  fileSizeBytes: number;
}
