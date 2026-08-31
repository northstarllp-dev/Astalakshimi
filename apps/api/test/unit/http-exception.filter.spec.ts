import { GlobalHttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalHttpExceptionFilter (Unit Tests)', () => {
  let filter: GlobalHttpExceptionFilter;

  beforeEach(() => {
    filter = new GlobalHttpExceptionFilter();
  });

  const createMockHost = (mockResponse: any, mockRequest: any = { url: '/test' }) => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  };

  it('should format standard Error properly (500)', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus };
    const mockHost = createMockHost(mockResponse);

    const error = new Error('Database connection failed');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Database connection failed',
        path: '/test',
        timestamp: expect.any(String),
      })
    );
  });

  it('should format HttpException with string response', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus };
    const mockHost = createMockHost(mockResponse);

    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not Found',
      })
    );
  });

  it('should format HttpException with object response and nested errors', () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus };
    const mockHost = createMockHost(mockResponse);

    const exceptionRes = { message: 'Validation failed', errors: [{ field: 'email', message: 'invalid' }] };
    const exception = new HttpException(exceptionRes, HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        errors: exceptionRes.errors,
      })
    );
  });
});
