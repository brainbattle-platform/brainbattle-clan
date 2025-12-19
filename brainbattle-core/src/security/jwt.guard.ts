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

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const header = req.headers?.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice(7);
    const payload = this.verifier.verifyAccess(token);

    req.user = {
      id: payload.sub,
      roles: payload.roles ?? [],
    };

    return true;
  }
}
