import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtVerifier } from './jwt-verifier';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly verifier: JwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const header = String(req.headers?.authorization ?? '').trim();
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new UnauthorizedException('Missing bearer token');

    const token = m[1].trim();
    const payload = await this.verifier.verifyAccess(token);

    req.user = {
      id: payload.sub,
      roles: payload.roles ?? [],
    };

    return true;
  }
}
 