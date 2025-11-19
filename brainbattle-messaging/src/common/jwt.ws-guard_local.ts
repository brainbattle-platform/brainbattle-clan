import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

const wrapPEM = (b64: string) => {
  const raw = Buffer.from(b64, 'base64').toString('utf8');
  return raw.includes('BEGIN PUBLIC KEY') ? raw : `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
};

@Injectable()
export class JwtWsGuard implements CanActivate {
  private key: string; private iss: string; private aud: string;
  constructor(cfg: ConfigService) {
    this.key = wrapPEM(cfg.get<string>('JWT_PUBLIC_KEY_BASE64')!);
    this.iss = cfg.get<string>('JWT_ISSUER')!;
    this.aud = cfg.get<string>('JWT_AUDIENCE')!;
  }
  canActivate(ctx: ExecutionContext): boolean {
    const client: any = ctx.switchToWs().getClient();
    const tok = client.handshake?.auth?.token ||
                client.handshake?.headers?.authorization?.replace(/^Bearer\s+/,'');
    if (!tok) throw new WsException('Missing token');
    try {
      const p: any = jwt.verify(tok, this.key, { algorithms: ['RS256'], issuer: this.iss, audience: this.aud });
      client.user = { id: p.sub, email: p.email };
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
