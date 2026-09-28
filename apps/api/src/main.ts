import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression = require('compression');
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

  // Nest's built-in JSON parser with rawBody keeps the exact webhook bytes for HMAC.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || ['http://localhost:3000'];

  // Secure HTTP headers, then gzip JSON responses before they hit the wire.
  app.use(helmet());
  app.use(compression());

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-metrics-token'],
    exposedHeaders: ['x-request-id', 'x-response-time', 'Server-Timing'],
  });

  // Drain in-flight requests and close the Postgres pool on SIGTERM (ECS/Fargate).
  app.enableShutdownHooks();

  // ALB idle timeout is 60s. Node's default keepAliveTimeout is 5s, which
  // races the load balancer and surfaces as intermittent 502s under load.
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Astalakshimi API server running on: http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();