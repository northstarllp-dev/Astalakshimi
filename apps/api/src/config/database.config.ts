import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'Refusing to start: DATABASE_URL is required (RDS or local Postgres). No default connection string.',
    );
  }
  return { url };
});
