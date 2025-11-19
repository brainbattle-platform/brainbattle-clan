import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const Requires = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
