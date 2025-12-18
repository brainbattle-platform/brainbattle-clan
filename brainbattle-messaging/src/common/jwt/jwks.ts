// src/common/jwt/jwks.ts (trong messaging)
import { createRemoteJWKSet } from 'jose';

export const JWKS = createRemoteJWKSet(
  new URL(process.env.AUTH_JWKS_URL!)
);
