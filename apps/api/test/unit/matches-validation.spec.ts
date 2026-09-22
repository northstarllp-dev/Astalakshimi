import { matchesQuerySchema } from '@astalakshimi/validation';

describe('Matches - matchesQuerySchema (Zod)', () => {
  it('applies page/limit defaults when absent', () => {
    const result = matchesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ page: 1, limit: 10 });
  });

  it('coerces string query values to numbers', () => {
    const result = matchesQuerySchema.safeParse({ page: '3', limit: '20' });
    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ page: 3, limit: 20 });
  });

  it('rejects page below 1', () => {
    const result = matchesQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects page above 1000', () => {
    const result = matchesQuerySchema.safeParse({ page: '1001' });
    expect(result.success).toBe(false);
  });

  it('rejects limit below 1', () => {
    const result = matchesQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 50', () => {
    const result = matchesQuerySchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric page values', () => {
    const result = matchesQuerySchema.safeParse({ page: 'abc' });
    expect(result.success).toBe(false);
  });
});
