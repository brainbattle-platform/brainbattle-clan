import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtVerifier } from './jwt-verify';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly verifier: JwtVerifier) {}

  canActivate(ctx: ExecutionContext): boolean {
    const client: any = ctx.switchToWs().getClient();
    const token =
      client?.handshake?.auth?.token ||
      (typeof client?.handshake?.headers?.authorization === 'string' &&
        client.handshake.headers.authorization.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : null);

    if (!token) throw new UnauthorizedException('Missing socket token');

    const payload = this.verifier.verifyAccess(token);
    client.data.user = { id: payload.sub, roles: payload.roles ?? [] };
    return true;
  }
}
