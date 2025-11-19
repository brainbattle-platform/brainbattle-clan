import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));
const ISS = process.env.AUTH_ISSUER!;
const AUD = process.env.AUTH_AUDIENCE!;

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISS, audience: AUD });
  return payload as { sub: string; email?: string; roles?: string[]; permissions?: string[] };
}
