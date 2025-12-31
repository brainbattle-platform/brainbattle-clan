import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AccessTokenPayload } from './security.types';

function fromBase64(b64?: string) {
  return b64 ? Buffer.from(b64, 'base64').toString('utf8') : '';
}

@Injectable()
export class JwtVerifier {
  private readonly issuer = process.env.JWT_ISSUER;
  private readonly audience = process.env.JWT_AUDIENCE;
  private readonly publicKey = fromBase64(process.env.JWT_PUBLIC_KEY_BASE64);

  verifyAccess(token: string): AccessTokenPayload {
    if (!this.issuer || !this.audience || !this.publicKey) {
      throw new UnauthorizedException('JWT verifier misconfigured');
    }

    try {
      const payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as AccessTokenPayload;

      if (!payload?.sub)
        throw new UnauthorizedException('Invalid token payload');

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
