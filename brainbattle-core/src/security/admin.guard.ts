import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if 'admin' role exists in JWT roles array
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');

    if (!isAdmin) {
      throw new ForbiddenException('Only admin users can access this resource');
    }

    return true;
  }
}
