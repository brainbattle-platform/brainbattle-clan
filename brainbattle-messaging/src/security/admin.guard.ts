import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { wrapError } from '../shared/response.helper';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const adminKeyHeader = req.headers['x-admin-key'] as string | undefined;
    const expectedKey = process.env.ADMIN_KEY;

    if (!expectedKey || !adminKeyHeader || adminKeyHeader !== expectedKey) {
      throw new ForbiddenException(
        wrapError('FORBIDDEN', 'Invalid admin key'),
      );
    }

    return true;
  }
}
