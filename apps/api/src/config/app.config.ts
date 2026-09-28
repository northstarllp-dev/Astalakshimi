import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const port = parseInt(process.env.PORT || '4000', 10);
  const apiPrefix = process.env.API_PREFIX || 'api';
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
  const frontendUrl =
    process.env.FRONTEND_URL?.trim() || corsOrigins[0]?.trim() || 'http://localhost:3000';
  const apiPublicUrl =
    process.env.API_PUBLIC_URL?.trim() || `http://localhost:${port}/${apiPrefix}`;

  return {
    env: process.env.NODE_ENV || 'development',
    port,
    apiPrefix,
    corsOrigins,
    frontendUrl,
    apiPublicUrl,
  };
});
