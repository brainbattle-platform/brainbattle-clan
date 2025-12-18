import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { jwtVerify } from 'jose';
import { JWKS } from '../jwt/jwks';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('No auth header');

    const token = authHeader.replace('Bearer ', '');

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.JWT_ISSUER,   // https://auth.brainbattle.local
        audience: process.env.JWT_AUDIENCE, // brainbattle
      });

      req.user = payload; // gắn user decoded vào request
      return true;
    } catch (err) {
      console.error('JWT Verify Error:', err);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
