import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe (Unit Tests)', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('should return parsed value for valid input', () => {
    const validData = { name: 'Alice', age: 30 };
    expect(pipe.transform(validData, {} as any)).toEqual(validData);
  });

  it('should strip unknown fields', () => {
    const validDataWithExtra = { name: 'Alice', age: 30, extra: 'field' };
    expect(pipe.transform(validDataWithExtra, {} as any)).toEqual({ name: 'Alice', age: 30 });
  });

  it('should throw BadRequestException with formatted Zod errors for invalid input', () => {
    const invalidData = { name: 'A', age: 'thirty' };
    
    try {
      pipe.transform(invalidData, {} as any);
      fail('Should have thrown an exception');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const response = (e as BadRequestException).getResponse() as any;
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'age' }),
        ])
      );
    }
  });
});
