import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly rf: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const needed = this.rf.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (!needed.length) return true;
    const got = new Set((req.user?.permissions ?? []) as string[]);
    const ok = needed.every(p => got.has(p));
    if (!ok) throw new ForbiddenException('Insufficient permission');
    return true;
  }
}
