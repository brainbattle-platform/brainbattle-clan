import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { verifyAccessToken } from './jwt-rs256';

@Injectable()
export class JwtWsGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const client: Socket = ctx.switchToWs().getClient();
    const authHeader = client.handshake.headers.authorization as string | undefined;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = tokenFromHeader ?? (client.handshake.auth as any)?.token ?? (client.handshake.query?.token as string | undefined);
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const user = await verifyAccessToken(token);
      (client as any).user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
