import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

const wrapPEM = (b64: string) => {
  const raw = Buffer.from(b64, 'base64').toString('utf8');
  return raw.includes('BEGIN PUBLIC KEY') ? raw : `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private publicKey: string;
  private issuer: string;
  private audience: string;
  constructor(cfg: ConfigService) {
    this.publicKey = wrapPEM(cfg.get<string>('JWT_PUBLIC_KEY_BASE64')!);
    this.issuer = cfg.get<string>('JWT_ISSUER')!;
    this.audience = cfg.get<string>('JWT_AUDIENCE')!;
  }
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload: any = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'], issuer: this.issuer, audience: this.audience,
      });
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch { throw new UnauthorizedException('Invalid token'); }
  }
}
