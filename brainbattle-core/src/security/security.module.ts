import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtVerifier } from './jwt-verifier';
import { JwtGuard } from './jwt.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  providers: [Reflector, JwtVerifier, JwtGuard, PermissionsGuard],
  exports: [JwtGuard, PermissionsGuard, JwtVerifier],
})
export class SecurityModule {}
