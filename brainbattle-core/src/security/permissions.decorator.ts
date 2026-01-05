import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'roles';
export const Permissions = (...roles: string[]) =>
  SetMetadata(PERMISSIONS_KEY, roles);
