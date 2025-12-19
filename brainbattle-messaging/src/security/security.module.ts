import { Module } from '@nestjs/common';
import { JwtVerifier } from './jwt-verify';
import { HttpJwtGuard } from './http-jwt.guard';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  providers: [JwtVerifier, HttpJwtGuard, WsJwtGuard],
  exports: [JwtVerifier, HttpJwtGuard, WsJwtGuard],
})
export class SecurityModule {}
