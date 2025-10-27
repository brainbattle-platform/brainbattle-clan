import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

const wrapPEM = (b64: string) => {
  const raw = Buffer.from(b64, 'base64').toString('utf8');
  return raw.includes('BEGIN PUBLIC KEY') ? raw : `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
};

@Injectable()
export class JwtHttpGuard implements CanActivate {
  private key: string; private iss: string; private aud: string;
  constructor(cfg: ConfigService) {
    this.key = wrapPEM(cfg.get<string>('JWT_PUBLIC_KEY_BASE64')!);
    this.iss = cfg.get<string>('JWT_ISSUER')!;
    this.aud = cfg.get<string>('JWT_AUDIENCE')!;
  }
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const h = (req.headers['authorization'] || '') as string;
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const p: any = jwt.verify(token, this.key, { algorithms: ['RS256'], issuer: this.iss, audience: this.aud });
      req.user = { id: p.sub, email: p.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
