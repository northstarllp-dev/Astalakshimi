import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserSession } from '@astalakshimi/types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
