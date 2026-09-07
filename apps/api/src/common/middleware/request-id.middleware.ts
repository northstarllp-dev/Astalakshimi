import { Injectable, NestMiddleware } from '@nestjs/common';
import * as crypto from 'crypto';
import type { NextFunction } from 'express';

type ReqWithId = {
  id?: string;
  headers: Record<string, string | string[] | undefined>;
};
type ResWithHeader = {
  setHeader(name: string, value: string): unknown;
};

/**
 * Stamps each request with a UUID, exposed via `req.id` and `x-request-id`
 * response header. The exception filter echoes it back in the response body
 * so a client error can be correlated to a server log line.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: ReqWithId, res: ResWithHeader, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const incomingStr = Array.isArray(incoming) ? incoming[0] : incoming;
    const id =
      incomingStr && /^[0-9a-fA-F-]{36}$/.test(incomingStr) ? incomingStr : crypto.randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
