import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends PassportAuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('JwtAuthGuard.handleRequest called for handler:', context.getHandler().name);
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required. Please log in.');
    }
    return user;
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends PassportAuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch (e) {
      console.log('OptionalJwtAuthGuard caught error', e.message);
    }
    return true;
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('OptionalJwtAuthGuard.handleRequest called', { err, user: !!user, info });
    return user || null;
  }
}
