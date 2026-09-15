import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
  });

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || ['http://localhost:3000'];

  // Secure HTTP headers
  app.use(helmet());

  // Global filters
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Request-id (must run before everything that needs it)
  const { RequestIdMiddleware } = await import('./common/middleware/request-id.middleware');
  const reqIdMw = new RequestIdMiddleware();
  app.use((req, res, next) => reqIdMw.use(req, res, next));

  // API prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Astalakshimi API server running on: http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();