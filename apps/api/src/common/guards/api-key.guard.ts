import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protects server-to-server endpoints (called by fleet.os / kamekaz-auth,
 * not by end users or the admin panel) with a shared secret header.
 *
 *   x-api-key: <INTERNAL_API_KEY>
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-api-key'];
    const expected = this.config.get<string>('INTERNAL_API_KEY');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }
    return true;
  }
}
