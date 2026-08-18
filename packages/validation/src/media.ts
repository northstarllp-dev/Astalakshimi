import { z } from 'zod';

export const uploadPurposeSchema = z.enum(['profile_photo', 'selfie', 'govt_id', 'horoscope']);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

export const presignedUploadSchema = z
  .object({
    purpose: uploadPurposeSchema,
    contentType: z.string().min(1, 'Content type is required'),
    fileSize: z.number().int().positive('File size must be positive'),
  })
  .superRefine((data, ctx) => {
    if (data.purpose === 'horoscope') {
      if (!ALLOWED_PDF_TYPES.includes(data.contentType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentType'],
          message: 'Horoscope must be a PDF file',
        });
      }
      if (data.fileSize > 10 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fileSize'],
          message: 'Horoscope PDF must be under 10 MB',
        });
      }
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(data.contentType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentType'],
          message: 'Images must be JPG, PNG, or WEBP format',
        });
      }
      if (data.fileSize > 5 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fileSize'],
          message: 'Photos must be under 5 MB',
        });
      }
    }
  });

export const confirmPhotoSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required'),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(5).default(0),
});

export const confirmVerificationSchema = z.object({
  method: z.enum(['selfie', 'govt_id']),
  selfieS3Key: z.string().optional(),
  govtIdType: z.enum(['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID']).optional(),
  govtIdS3Key: z.string().optional(),
});

export const confirmHoroscopeSchema = z.object({
  horoscopeS3Key: z.string().min(1, 'Horoscope S3 key is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSizeBytes: z.number().int().positive(),
});

export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>;
export type ConfirmVerificationInput = z.infer<typeof confirmVerificationSchema>;
export type ConfirmHoroscopeInput = z.infer<typeof confirmHoroscopeSchema>;
