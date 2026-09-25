import { BadRequestException } from '@nestjs/common';
import { presignedUploadSchema } from '@astalakshimi/validation';
import { S3Provider } from '../../src/media/providers/s3.provider';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: (command: unknown) => mockSend(command),
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://signed.example/upload'),
}));

function provider() {
  const config = {
    getOrThrow: (key: string) => {
      const values: Record<string, string> = {
        'storage.region': 'ap-south-1',
        'storage.accessKeyId': 'AKIATEST',
        'storage.secretAccessKey': 'secret',
        'storage.mediaBucket': 'media-bucket',
        'storage.vaultBucket': 'vault-bucket',
      };
      const value = values[key];
      if (!value) throw new Error(`missing ${key}`);
      return value;
    },
  };
  return new S3Provider(config as never);
}

const userId = '11111111-1111-4111-8111-111111111111';

describe('S3Provider verification uploads', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });

  it('mints a vault key and stores a selfie jpeg as image/jpeg', async () => {
    const s3 = provider();
    const planned = await s3.generateUploadUrl(userId, 'selfie', 'image/jpeg', 1200);

    expect(planned.bucket).toBe('vault-bucket');
    expect(planned.s3Key).toMatch(
      new RegExp(`^verifications/${userId}/selfie-[0-9a-f-]{36}\\.jpg$`),
    );

    const body = Buffer.from('selfie');
    await s3.putObject(planned.s3Key, body, 'image/jpeg', planned.bucket);

    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toEqual(
      expect.objectContaining({
        Bucket: 'vault-bucket',
        Key: planned.s3Key,
        Body: body,
        ContentType: 'image/jpeg',
      }),
    );
  });

  it.each([
    ['application/pdf', 'pdf'],
    ['image/png', 'png'],
    ['text/plain', 'plain'],
    ['application/msword', 'doc'],
  ])('accepts a government ID of type %s and stores that content type', async (contentType, ext) => {
    const parsed = presignedUploadSchema.safeParse({
      purpose: 'govt_id',
      contentType,
      fileSize: 2048,
    });
    expect(parsed.success).toBe(true);

    const s3 = provider();
    const planned = await s3.generateUploadUrl(userId, 'govt_id', contentType, 2048);
    expect(planned.bucket).toBe('vault-bucket');
    expect(planned.s3Key.endsWith(`.${ext}`)).toBe(true);

    const body = Buffer.from('id-bytes');
    await s3.putObject(planned.s3Key, body, contentType, planned.bucket);
    const command = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input.Bucket).toBe('vault-bucket');
    expect(command.input.ContentType).toBe(contentType);
    expect(command.input.ContentType).not.toBe('image/jpeg');
  });

  it('rejects a government ID larger than 15 MB', async () => {
    const parsed = presignedUploadSchema.safeParse({
      purpose: 'govt_id',
      contentType: 'application/pdf',
      fileSize: 16 * 1024 * 1024,
    });
    expect(parsed.success).toBe(false);

    await expect(
      provider().generateUploadUrl(userId, 'govt_id', 'application/pdf', 16 * 1024 * 1024),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('stores a horoscope PDF in the media bucket and signs a download', async () => {
    const s3 = provider();
    const planned = await s3.generateUploadUrl(userId, 'horoscope', 'application/pdf', 4096);
    expect(planned.bucket).toBe('media-bucket');
    expect(planned.s3Key).toMatch(
      new RegExp(`^profiles/${userId}/horoscopes/[0-9a-f-]{36}\\.pdf$`),
    );

    const body = Buffer.from('%PDF');
    await s3.putObject(planned.s3Key, body, 'application/pdf', planned.bucket);
    const put = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(put.input).toEqual(
      expect.objectContaining({
        Bucket: 'media-bucket',
        Key: planned.s3Key,
        ContentType: 'application/pdf',
      }),
    );

    mockSend.mockClear();
    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner') as {
      getSignedUrl: jest.Mock;
    };
    getSignedUrl.mockResolvedValueOnce('https://signed.example/horoscope.pdf');

    const url = await s3.getAdminSignedViewUrl(planned.s3Key, true);
    expect(url).toBe('https://signed.example/horoscope.pdf');
    const signed = getSignedUrl.mock.calls.at(-1)?.[1] as { input: Record<string, unknown> };
    expect(signed.input).toEqual(
      expect.objectContaining({
        Bucket: 'media-bucket',
        Key: planned.s3Key,
      }),
    );
  });

  it('stores a horoscope JPG in the media bucket', async () => {
    const s3 = provider();
    const planned = await s3.generateUploadUrl(userId, 'horoscope', 'image/jpeg', 4096);
    expect(planned.s3Key).toMatch(
      new RegExp(`^profiles/${userId}/horoscopes/[0-9a-f-]{36}\\.jpg$`),
    );
  });

  it('rejects a horoscope with an unsupported type', async () => {
    await expect(
      provider().generateUploadUrl(userId, 'horoscope', 'image/png', 1000),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
